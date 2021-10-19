#!/usr/bin/python3

import sys
import os
import time
import json
import pathlib
from pathlib import Path
from glob import glob
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError
import subprocess
import OpenSpaceSession as OSS

#Standalone script usage:
#  $1 - the name of the OpenSpace install directory to use to run OpenSpace. This is
#       expected to be further down in the same file path as this dir (see comments below)
#  $2 - the name of the log file to write information messages to. Error messages will be
#       printed directly to the terminal as well as the log file. The purpose of a log
#       file is to avoid too much output in the terminal (OpenSpace produces a lot)
#  $3 - [optional] is a name prefix used to restrict the testing to a subset of
#       test files. Any tests in any directory that start with the provided string
#       will run. To restrict to one test file only, the exact filename would need
#       to be provided.

def logMessage(filename, message):
    print(message)
    lFile = open(filename, "a+")
    lFile.write(" " + message + "\n")
    lFile.close()

def checkForInstalledComponents():
    p = Popen("wmctrl --version", shell=True, stdin=PIPE, stdout=PIPE, close_fds=True)
    vCheck = p.stdout.read()
    if len(vCheck) == 0:
        print("Error: wmctrl does not appear to be installed (apt install wmctrl)")
        quit(-1)
    p = Popen("xdotool --version", shell=True, stdin=PIPE, stdout=PIPE, close_fds=True)
    vCheck = p.stdout.read()
    if len(vCheck) == 0:
        print("Error: xdotool does not appear to be installed (apt install xdotool)")
        quit(-1)

def checkForProperDirectories(logFile):
    intendedDir = os.getcwd() + "/ResultImages/linux/"
    Path(intendedDir).mkdir(parents=True, exist_ok=True)
    if not Path(intendedDir).is_dir():
        msg = "Result dir for screenshots '" + intendedDir + \
              "' was not successfully created."
        logMessage(logFile, msg)
        quit(-1)
    intendedDir = os.getcwd() + "/DifferenceImages/linux/"
    Path(intendedDir).mkdir(parents=True, exist_ok=True)
    if not Path(intendedDir).is_dir():
        msg = "Difference dir for diff result images '" + intendedDir + \
              "' was not successfully created."
        logMessage(logFile, msg)
        quit(-1)

def runAssetTests(baseDirOpenSpace, logFilename, testSubsetString):
    baseDirOpenSpaceVisualTesting = "OpenSpaceVisualTesting/OpenSpaceVisualTesting"
    testDirName = "tests/visual"
    baseTestDir = baseDirOpenSpace + "/" + testDirName
    dirs = os.listdir(baseTestDir)
    numTestCases = len(dirs)
    testCaseNum = 1
    for dir in dirs:
        logMessage(logFilename, "Test case " + str(testCaseNum) + "/" \
            + str(numTestCases) + ": " + dir)
        if testSubsetString == "" or dir == testSubsetString:
            whereIsTest = baseTestDir + "/" + dir
            processTestDirectory(whereIsTest, testDirName, baseDirOpenSpace, \
                testSubsetString, logFilename)
        else:
            logMessage(logFilename, "SKIPPED")
        testCaseNum += 1

#Process all files in the directory passed in, recurse on any directories 
#that are found, and process the files they contain.
def processTestDirectory(targetDirectory, testDirName, baseOsDir, testSubsetString, log):
    idx = targetDirectory.rfind(testDirName) + len(testDirName) + 1
    testGroup = targetDirectory[idx:999]
    logMessage(log, "processTestDirectory: " + targetDirectory)
    fileEntries = pathlib.Path(targetDirectory).glob("*.ostest")
    fileListing = list(fileEntries)
    numFileEntries = len(fileListing)
    feNum = 1
    for fe in fileListing:
        logMessage(log, "File " + fe.name)
        processTestFile(targetDirectory, fe, testGroup, baseOsDir, log)
        feNum += 1

#Insert logic for processing foundTestCases files here
def processTestFile(baseOsDir, testOffsetDir, testGroup, testFilename, log):
    fullTestDir = baseOsDir + "/" + testOffsetDir + "/" + testGroup
    logMessage(log, "Located in: " + fullTestDir)
    logString = "Starting Test file '" + testFilename + "'"
    if len(testGroup) > 0:
        logString += " in group '" + testGroup + "'"
    logMessage(log, logString)

    ospace = OSS.OSSession(testGroup, baseOsDir + "/bin", log)
    logMessage(log, "AssetTester: OpenSpace initialized")
    ospace.startOpenSpace()
    time.sleep(30)
    logMessage(log, "AssetTester: Ready to start sending commands to OpenSpace.")
    ospace.focusOpenSpaceWindow()
    time.sleep(1.0)
    ospace.toggleHudVisibility()
    time.sleep(1.0)

    with open(fullTestDir + "/" + testFilename) as f:
        data = json.load(f)
        for d in data:
            time.sleep(0.25)
            logMessage(log, "AssetTester: ostest parser found type '" + d["type"] + \
                "' with value '" + d["value"] + "'.")
            if d["type"] == "script":
                ospace.sendScript(d["value"])
            elif d["type"] == "wait":
                time.sleep(int(d["value"]))
            elif d["type"] == "screenshot":
                if len(d["value"]) < 1:
                    shotName = testFilename[0:len(testFilename) - 7]
                else:
                    shotName = d["value"]
                ospace.moveScreenShot(testGroup, shotName)
            elif d["type"] == "time":
                timeScript = "openspace.time.setTime(\"" + d["value"] + "\");"
                ospace.sendScript(timeScript)
            elif d["type"] == "keys":
                ospace.keyboardKeystroke(d["value"])
            elif d["type"] == "pause":
                pauseScript = "openspace.time.setPause(" + d["value"] + ");";
                ospace.sendScript(pauseScript);
            elif d["type"] == "navigationstate":
                navScript = "openspace.navigation.setNavigationState(" + d["value"] + ");"
                ospace.sendScript(navScript)
            elif d["type"] == "recording":
                #Create a temporary link to the recording in ${RECORDINGS} dir
                recordingFilename = d["value"] + ".osrecording"
                os.symlink(fullTestDir + "/" + recordingFilename, \
                    baseOsDir + "/user/recordings/" + recordingFilename)
                recordingScript = "openspace.sessionRecording.startPlayback('" + \
                    recordingFilename + "')"
                ospace.sendScript(recordingScript)
            else:
                logMessage(log, "AssetTester: unhandled ostest entry of type '" + \
                    d["type"] + "' with value '" + d["value"] + "'.")
    logMessage(log, "Done parsing .ostest entries.")
    #ospace.killOpenSpace()
    ospace.quitOpenSpace()
    time.sleep(5)
    #Kill in case the quit command wasn't processed
    #ospace.killOpenSpace()
    logMessage(log, "Processed test '" + path.name + "'.")
    time.sleep(10)

if __name__ == "__main__":
    checkForInstalledComponents()
    if len(sys.argv) == 1:
        print("Error: Need a valid OpenSpace base directory as arg 1")
        quit(-1)
    elif len(sys.argv) == 2:
        print("Error: Need a valid test directory within base dir as arg 2")
        quit(-1)
    elif len(sys.argv) == 3:
        print("Error: Need a valid test group name/dir as arg 3")
        quit(-1)
    elif len(sys.argv) == 4:
        print("Error: Need a valid .ostest file to run as arg 4")
        quit(-1)
    elif len(sys.argv) == 5:
        print("Error: Need a path to a log file as arg 5")
        quit(-1)

    baseOsDir = sys.argv[1]
    testOffsetDir = sys.argv[2]
    testGroup = sys.argv[3]
    testFilename = sys.argv[4]
    if testFilename[-7::] != ".ostest":
        print("Error: Need a valid .ostest file to run as arg 2")
        quit(-1)
    logFilename = sys.argv[5]
    checkForProperDirectories(logFilename)
    #testSubsetString = ""
    #if len(sys.argv) > 3:
    #    testSubsetString = sys.argv[3]
    #runAssetTests(openspaceTestName, logFilename, testSubsetString)
    processTestFile(baseOsDir, testOffsetDir, testGroup, testFilename, logFilename)
    quit(0)
