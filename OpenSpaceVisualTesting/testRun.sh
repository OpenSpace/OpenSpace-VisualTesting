#!/bin/bash

#This is the main polling script for the image comparison tests. This script
#needs to run as su ('sudo testRun.sh'), and stay running continuously. It
#does the work of running the image comparison python scripts, rather than
#having jenkins do this. The main reason for this is that jenkins is so far
#unable to start OpenSpace with X window support (graphics). This current
#method only requires jenkins to set its current build directory at the
#location specified by IMAGE_TESTING_BASE_PATH.
#Set NonRootUser to normal username, to prevent problems running OpenSpace as
#root.
#Set environment variable OPENSPACE_SYNC to a local dir that already has the
#necessary data
IMAGE_TESTING_BASE_PATH=/home/openspace/Desktop
NonRootUser=openspace
export OPENSPACE_SYNC=${IMAGE_TESTING_BASE_PATH}/OpenSpace/sync


buildFlag=${IMAGE_TESTING_BASE_PATH}/latestBuild.txt
while [ 1 ]; do
  flagPath="$(sudo cat ${buildFlag})"
  if [ "${flagPath}" != "" ]; then
    sudo chown -R ${NonRootUser}:${NonRootUser} ${flagPath}
    python3 AssetTester.py ${flagPath}
    #Clearing the file here will signal the jenkins process to stop waiting
    sudo echo "" > ${buildFlag}
  fi
  sleep 10
done
