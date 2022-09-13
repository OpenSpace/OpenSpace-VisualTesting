#!/bin/bash

#This is the main polling script for the image comparison tests. This script
#needs to stay running continuously. It does the work of running the image
#comparison python scripts, rather than having jenkins do this.
#The main reason for this is that jenkins is so far unable to start
#OpenSpace with X window support (graphics). This current
#method only requires jenkins to set its current build directory at the
#location specified by ImageTestingBasePath. This variable needs to match
#the "exported" environment variable of the same name that is configured in
#this node's settings on the Jenkins master.
#Set NonRootUser to normal username, to prevent problems running OpenSpace as
#root.
#Set environment variable OPENSPACE_SYNC to a local dir that already has the
#necessary data
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
#   If -t option is used followed by a valid relative path to an .ostest file,
#     then only that test will run. After this the script will finish.

ImageTestingBasePath=/home/openspace/Desktop
NonRootUser=openspace

#buildFlag is a file that is empty when idle. When a jenkins build is triggered,
# jenkins will put the path of the directory of its current build (which is
# different every time) in this flag file
buildFlag=${ImageTestingBasePath}/latestBuild.txt
logFile="./testLog.txt"
imageTestingSubdirInOs="tests/visual"

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

function setUpBuildDirectoryForRun
{
  builtPath="$1"
  #chown -R ${NonRootUser}:${NonRootUser} ${builtPath}
  if [ ! -f ${builtPath}/bin/OpenSpace ]; then
    errorMsg "OpenSpace executable not found at ${builtPath}/bin"
    exit
  fi
  if [ ${CustomSync} = "false" ]; then
    export OPENSPACE_SYNC=${ImageTestingBasePath}/sync
    if [ -d ${ImageTestingBasePath}/OpenSpace/sync ]; then
      rm -r ${ImageTestingBasePath}/OpenSpace/sync
    fi
    ln -s ${ImageTestingBasePath}/sync ${builtPath}/sync
  fi
  #Clear recordings because OpenSpace tests use same recording filenames
  rm ${builtPath}/user/recordings/* 2>/dev/null
}

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

function runAllTests
{
  baseOsDir="$1"
  IFS=$'\r\n' fullTestList=($(echo "$2"))
  numTests=${#fullTestList[@]}
  for ((i=0; i<numTests; i++)); do
    logAndDisplayMsg "Starting OpenSpace test '${fullTestList[i]}'."
    testGroup="${fullTestList[i]%/*}"
    thisTest="${fullTestList[i]##*/}"
    python3 AssetTester.py "${baseOsDir}" "${imageTestingSubdirInOs}" "${testGroup}" \
      "${thisTest}" "$3"
    logAndDisplayMsg "Finished OpenSpace test '${thisTest}'."
  done
  logAndDisplayMsg "Finished all OpenSpace tests."
}

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
  logMsg "Clear flag in file '$1' to signal jenkins that test finished."
  sudo echo "" > $1
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
# USAGE:
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
    runAllTests "${openspaceDir}" "${allTestsListed}" "${logFile}"
    runComparisons
  else
    runAllTests "${openspaceDir}" "${testRelPath}" "${logFile}"
    runComparisons "${testRelPath}"
  fi
  createFilesystemLinksAtWebServerDirectory
}

##########################################################################################
if [ -f ${logFile} ]; then
  rm ${logFile}
fi
#verifyUser

installationDir=""
testName=""
CustomDir="false"
CustomSync="false"
CustomTest="false"
CustomUser="false"
LoopTesting="false"
for i in "$@"; do
  case $i in
    -d)
      CustomDir="true"
      ;;
    -s)
      CustomSync="true"
      ;;
    -t)
      CustomTest="true"
      ;;
    -u)
      CustomUser="true"
      ;;
    *)
      if [ $CustomDir = "true" ]; then
        installationDir=${i}
        CustomDir="false"
      elif [ $CustomTest = "true" ]; then
        testName=${i}
        CustomTest="false"
      elif [ $CustomUser = "true" ]; then
        NonRootUser=${i}
        CustomUser="false"
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

if [ ${installationDir}!="" ] || [ ${testName}!="" ]; then
  #Run a single test if a custom directory or specific test was named
  executeTests "${installationDir}" "${testName}"
else
  #Loop to wait for Jenkins trigger to run tests
  echo "Waiting for Jenkins build-completion trigger..."
  while [ 1 ]; do
    jenkinsBuildPath="$(cat ${buildFlag})"
    if [ "${jenkinsBuildPath}" != "" ]; then
      executeTests "${jenkinsBuildPath}"
      clearBuildFlagToSignalTestCompletionToJenkins ${buildFlag}
      echo "Continuing to wait for next Jenkins build-completion trigger..."
    fi
    sleep 10
  done
fi

