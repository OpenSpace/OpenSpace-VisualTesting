#!/bin/bash

#This is the main polling script for the image comparison tests. This script
#needs to run as su ('sudo testRun.sh'), and stay running continuously. It
#does the work of running the image comparison python scripts, rather than
#having jenkins do this. The main reason for this is that jenkins is so far
#unable to start OpenSpace with X window support (graphics). This current
#method only requires jenkins to set its current build directory at the
#location specified by IMAGE_TESTING_BASE_PATH. This variable needs to match
#the "exported" environment variable of the same name that is configured in
#this node's settings on the Jenkins master.
#Set NonRootUser to normal username, to prevent problems running OpenSpace as
#root.
#Set environment variable OPENSPACE_SYNC to a local dir that already has the
#necessary data
#
# USAGE:
#   sudo testRun.sh [-d OpenSpaceInstallDir] [-t SpecificTestName]
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

IMAGE_TESTING_BASE_PATH=/home/openspace/Desktop
NonRootUser=openspace
export OPENSPACE_SYNC=${IMAGE_TESTING_BASE_PATH}/sync

#buildFlag is a file that is empty when idle. When a jenkins build is triggered,
# jenkins will put the path of the directory of its current build (which is
# different every time) in this flag file
buildFlag=${IMAGE_TESTING_BASE_PATH}/latestBuild.txt
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
  sudo chown -R ${NonRootUser}:${NonRootUser} ${builtPath}
  if [ ! -f ${builtPath}/bin/OpenSpace ]; then
    errorMsg "OpenSpace executable not found at ${builtPath}/bin"
    exit
  fi
  if [ -d ${IMAGE_TESTING_BASE_PATH}/OpenSpace/sync ]; then
    rm -r ${IMAGE_TESTING_BASE_PATH}/OpenSpace/sync
  fi
  ln -s ${IMAGE_TESTING_BASE_PATH}/sync ${builtPath}/sync
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
  python3 targetcompareIncrementalLinux.py "$1"
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

function executeTests
{
  openspaceDir="$1"
  setUpBuildDirectoryForRun "${openspaceDir}"
  if [ "$2" = "" ]; then
    allTestsListed="$(listAllTestFiles ${openspaceDir})"
    runAllTests "${openspaceDir}" "${allTestsListed}" "${logFile}"
    runComparisons
  else
    runAllTests "${openspaceDir}" "$2" "${logFile}"
    runComparisons "$2"
  fi
  createFilesystemLinksAtWebServerDirectory
}

##########################################################################################
if [ -f ${logFile} ]; then
  rm ${logFile}
fi
verifyUser

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
  jenkinsBuildPath="$(sudo cat ${buildFlag})"
  if [ "${jenkinsBuildPath}" != "" ]; then
    installationDir="${jenkinsBuildPath}"
  fi
else
  logAndDisplayMsg "Running test(s) on OpenSpace installation at ${installationDir}."
fi

#Verify custom test directory to run (if specified)
if [ "${testName}" != "" ]; then
  testName=${installationDir}/${imageTestingSubdirInOs}/${testName}
  if [ -f ${testName} ]; then
    logAndDisplayMsg "Running manual test on OpenSpace installation (test ${testName})."
  else
    logAndDisplayMsg "Error: cannot find specified test file ${testName}."
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
    jenkinsBuildPath="$(sudo cat ${buildFlag})"
    if [ "${jenkinsBuildPath}" != "" ]; then
      executeTests "${jenkinsBuildPath}"
      clearBuildFlagToSignalTestCompletionToJenkins ${buildFlag}
      echo "Continuing to wait for next Jenkins build-completion trigger..."
    fi
    sleep 10
  done
fi

