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
    python3 targetcompareWin64vsLinux.py
  else
    logMsg "Run targetcompareWin64vsLinux.py script on test '$1'"
    python3 targetcompareWin64vsLinux.py "$1"
  fi
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

#Optional arg $1 makes it do a manual run on the provided OpenSpace installation dir,
#instead of waiting for the Jenkins build trigger
if [ "$1" != "" ] && [ -d $1 ]; then
  if [ "$2" != "" ]; then
    manualTestFile=$1/${imageTestingSubdirInOs}/$2
    if [ -f ${manualTestFile} ]; then
      logAndDisplayMsg "Running manual test on OpenSpace installation $1 (test $2)."
      executeTests "$1" "$2"
    else
      logAndDisplayMsg "Error: cannot find specified test file ${manualTestFile}."
      exit
    fi
  else
    logAndDisplayMsg "Running manual test on OpenSpace installation $1 (all tests)."
    executeTests "$1"
  fi
else
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

