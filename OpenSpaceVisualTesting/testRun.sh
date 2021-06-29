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

function setUpBuildDirectoryForRun
{
  builtPath="$1"
  sudo chown -R ${NonRootUser}:${NonRootUser} ${builtPath}
  if [ ! -f ${builtPath}/bin/OpenSpace ]; then
    echo "OpenSpace executable not found at ${builtPath}/bin" > /dev/stderr
    exit
  fi
  ln -s ${IMAGE_TESTING_BASE_PATH}/OpenSpace/sync ${builtPath}/sync
  #Clear recordings because OpenSpace tests use same recording filenames
  rm ${builtPath}/user/recordings
}

function runAllTests
{
  python3 AssetTester.py "$1"
  echo; echo "Finished OpenSpace run tests."; echo
}

function runComparisons
{
  echo "Run targetcompareWin64vsLinux.py script"
  python3 targetcompareWin64vsLinux.py
}

function createFilesystemLinksAtWebServerDirectory
{
  echo "Update links for web server directory."
  ./linkResultsFromWorkingDir.sh
}

function clearBuildFlagToSignalTestCompletionToJenkins
{
  echo "Clear flag in file '$1' to signal jenkins that test finished."
  sudo echo "" > $1
}

function verifyUser
{
  usr="$(whoami)"
  if [ "${usr}" != "root" ]; then
    errMsg="Unfortunately this script needs to run as root in order to access "
    errMsg+="the build directory created by the remote jenkins controller. "
    errMsg+="Run with sudo."
    echo "${errMsg}" > /dev/stderr
    exit
  fi
}

###############################################################################
verifyUser
echo "Waiting for Jenkins build-completion trigger..."
while [ 1 ]; do
  jenkinsBuildPath="$(sudo cat ${buildFlag})"
  if [ "${jenkinsBuildPath}" != "" ]; then
    setUpBuildDirectoryForRun "${jenkinsBuildPath}"
    runAllTests "${jenkinsBuildPath}"
    runComparisons
    createFilesystemLinksAtWebServerDirectory
    clearBuildFlagToSignalTestCompletionToJenkins ${buildFlag}
    echo "Continuing to wait for next Jenkins build-completion trigger..."
  fi
  sleep 30
done
