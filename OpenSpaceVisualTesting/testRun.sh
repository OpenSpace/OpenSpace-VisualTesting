#!/bin/bash

#This is the main polling script for the image comparison tests. This script needs to stay
#running continuously. It does the work of running the image comparison python scripts,
#rather than having jenkins do this. The main reason for this is that jenkins is so far
#unable to start OpenSpace with X window support (graphics). This method only requires
#jenkins to set its current build directory at the location specified by ${buildFlag}.
#
#Notes on configuration:
#  1. Set ${buildFlag} to the full path to the file that will contain the latest jenkins
#     build, the location of which is unknown until jenkins finishes. This file is blank
#     until a new build is done, which this script's loop uses as a trigger to run a new
#     comparison test.
#     Add an environment variable with this same name to the node configuration for the
#     image test server node at the Jenkins host, so that the build will access it.
#  2. Set ${OPENSPACE_SYNC} to the sync/ directory that is used for all tests. This dir
#     is the same for all tests.
#     Also add this same environment variable to the node configuration for the image
#     test server node at the Jenkins host.
#
# USAGE:
#   testRun.sh [-d OpenSpaceInstallDir] [-t SpecificTestName]
#
#   The normal mode runs without any options, finding the latest Jenkins build
#     and running all test cases that it contains. After completion, it will bo
#     back to looping and waiting for the next build which will re-trigger the
#     full process of running the tests and image comparisons
#   If -d option is used followed by a path, then the instance of OpenSpace
#     at that location (runs bin/OpenSpace from there) will run instead of
#     using the latest jenkins build of OpenSpace. After this the script will
#     finish.
#   If -t option is used followed by a valid relative path from ${imageTestingSubdirInOs}
#     to an .ostest file (e.g. juno/junomodel.ostest), then only that test will run and
#     the script will finish afterward. If this is not provided then all tests will run,
#     and the script will continue to loop indefinitely for the next jenkins build.
buildFlag=/home/openspace/Desktop/latestBuild.txt
export OPENSPACE_SYNC=/home/openspace/Desktop/sync
logFile="./testLog.txt"
imageTestingSubdirInOs="tests/visual"


########## FUNCTIONS
function logMsg
{
  datetime="$(date +%Y-%m-%d\ %H:%M:%S)"
  echo "${datetime}  $1" >> ${logFile}
}

function logAndDisplayMsg
{
  echo "${1}"
  logMsg "${1}"
}

function errorMsg
{
  echo "$1" > /dev/stderr
  logMsg "$1"
}

#Given the base directory of an OpenSpace build ($1), this function prepares that
#directory for running the image comparison tests.
function setUpBuildDirectoryForRun
{
  builtPath="$1"
  if [ ! -f ${builtPath}/bin/OpenSpace ]; then
    errorMsg "OpenSpace executable not found at ${builtPath}/bin"
    exit
  fi
  #Clear recordings because OpenSpace tests use same recording filenames
  rm ${builtPath}/user/recordings/* 2>/dev/null
}

#Given the base directory of an OpenSpace build ($1), this function finds all .ostest
#files in the tests/visual/ directory and returns them in a string of names with newlines
function listAllTestFiles
{
  baseOsDir="$1"
  testingDir="${baseOsDir}/${imageTestingSubdirInOs}"
  allTestsList="$(find "${testingDir}" -name \*\.ostest)"
  pathLen=${#testingDir}
  echo "${allTestsList}" | while read line; do
    echo "${line:pathLen+1:999}"
  done
}

#Runs one or more tests which are listed in string list arg $2, at the base OpenSpace
# build directory specified at arg $1.
function runAllTests
{
  baseOsDir="$1"
  IFS=$'\r\n' fullTestList=($(echo "$2"))
  numTests=${#fullTestList[@]}
  for ((i=0; i<numTests; i++)); do
    logAndDisplayMsg "Starting OpenSpace test '${fullTestList[i]}'."
    testGroup="${fullTestList[i]%/*}"
    thisTest="${fullTestList[i]##*/}"
    python3 AssetTester.py -d "${baseOsDir}" -t "${imageTestingSubdirInOs}" \
      -g "${testGroup}" -f "${thisTest}" -l "${logFile}" -s "${OPENSPACE_SYNC}"
    logAndDisplayMsg "Finished OpenSpace test '${thisTest}'."
  done
  logAndDisplayMsg "Finished all OpenSpace tests."
}

#Function to run image comparisons after test(s) run. If a specific test name is
#provided ($1), then comparisons will only run on that test. If no $1 arg is provided,
#then all tests will run. Note that the web page .json report file will only be
#generated if all tests are run.
function runComparisons
{
  if [ "$1" = "" ]; then
    logMsg "Run targetcompareWin64vsLinux.py script on all tests"
  else
    logMsg "Run targetcompareWin64vsLinux.py script on test '$1'"
  fi
  python3 targetcompareWin64vsLinux.py "$1"
  python3 targetcompareIncremental_Linux.py "$1"
}

function createFilesystemLinksAtWebServerDirectory
{
  logMsg "Update links for web server directory."
  ./linkResultsFromWorkingDir.sh
}

function clearBuildFlagToSignalTestCompletionToJenkins
{
  logMsg "Clear flag in file '${buildFlag}' to signal jenkins that test finished."
  sudo echo "" > ${buildFlag}
}

function verifyUser
{
  usr="$(whoami)"
  if [ "${usr}" != "root" ]; then
    errMsg="Unfortunately this script needs to run as root in order to access "
    errMsg+="the build directory created by the remote jenkins controller. "
    errMsg+="Run with sudo."
    errorMsg "${errMsg}"
    exit
  fi
}

#Run the test(s) using the specified OpenSpace installation directory
# $1 - Full path to the OpenSpace directory to be used for the test
#      (the executable is located at bin/OpenSpace relative to this path)
# [$2] - Optional relative path to the specific test file to run. OpenSpace
#        will only run once with this test. The path that this is relative to is
#        tests/visual/ in the base OpenSpace directory (not this OpenSpaceVisualTesting
#        repository directory). The path format is:  testFolder/testName.ostest
function executeTests
{
  openspaceDir="$1"
  testRelPath="$2"
  setUpBuildDirectoryForRun "${openspaceDir}"
  if [ "${testRelPath}" = "" ]; then
    allTestsListed="$(listAllTestFiles ${openspaceDir})"
    runAllTests "${openspaceDir}" "${allTestsListed}"
    runComparisons
  else
    runAllTests "${openspaceDir}" "${testRelPath}"
    runComparisons "${testRelPath}"
  fi
  createFilesystemLinksAtWebServerDirectory
}

########## MAIN
if [ -f ${logFile} ]; then
  rm ${logFile}
fi
#verifyUser

installationDir=""
testName=""
CustomDir="false"
CustomTest="false"
LoopTesting="false"
for i in "$@"; do
  case $i in
    -d)
      CustomDir="true"
      ;;
    -t)
      CustomTest="true"
      ;;
    *)
      if [ $CustomDir = "true" ]; then
        installationDir=${i}
        CustomDir="false"
      elif [ $CustomTest = "true" ]; then
        testName=${i}
        CustomTest="false"
      fi
      ;;
    -*|--*)
      echo "Unknown option $i"
      exit 1
      ;;
  esac
done
#Determine which installation directory for OpenSpace to run
if [ "${installationDir}" = "" ]; then
  jenkinsBuildPath="$(cat ${buildFlag})"
  if [ "${jenkinsBuildPath}" != "" ]; then
    installationDir="${jenkinsBuildPath}"
  fi
else
  logAndDisplayMsg "Running test(s) on OpenSpace installation at ${installationDir}."
fi
#Verify custom test directory to run (if specified)
if [ "${testName}" != "" ]; then
  testPath=${installationDir}/${imageTestingSubdirInOs}/${testName}
  if [ -f ${testPath} ]; then
    logAndDisplayMsg "Running manual test on OpenSpace installation (test ${testName})."
  else
    logAndDisplayMsg "Error: cannot find specified test file at ${testPath}."
    exit
  fi
fi
if [ "${installationDir}" != "" ] || [ "${testName}" != "" ]; then
  #Run a single test if a custom directory or specific test was named
  executeTests "${installationDir}" "${testName}"
else
  #Loop to wait for Jenkins trigger to run tests
  echo "Waiting for Jenkins build-completion trigger..."
  while [ 1 ]; do
    jenkinsBuildPath="$(cat ${buildFlag})"
    if [ "${jenkinsBuildPath}" != "" ]; then
      executeTests "${jenkinsBuildPath}"
      clearBuildFlagToSignalTestCompletionToJenkins
      echo "Continuing to wait for next Jenkins build-completion trigger..."
    fi
    sleep 10
  done
fi

