#!/usr/bin/python3

import sys
import os
import time
import json
import pathlib
from glob import glob
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError
import subprocess
import OpenSpaceSession as OSS

#Standalone script usage:
#  $1 - the name of the OpenSpace install directory to use to run OpenSpace. This is
#       expected to be further down in the same file path as this dir (see comments below)
#  [$2] - (optional) is a name prefix used to restrict the testing to a subset of
#         test files. Any tests in any directory that start with the provided string
#         will run. To restrict to one test file only, the exact filename would need
#         to be provided.
#
#This script expects to run within the OpenSpaceVisualTesting repo cloned directory
# structure, and also expects that this repo exists in the same directory as the
# OpenSpace application repo cloned directory. Example:
#
# ["OpenSpace" | optional custom OS directory name provided]/
#   apps/
#   bin/
#     RelWithDebInfo/ | Release/ | Debug/ (only in Windows?)
#   cache/
#   ...
#   src/
#   support/
#   temp/
#   tests/
#     AssetLoaderTest/
#     ...
#     visual/ (visual tests exist here)
# OpenSpaceVisualTesting/
#   OpenSpaceVisualTesting/

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

def runAssetTests(baseDirOpenSpace, testSubsetString):
    baseDirOpenSpaceVisualTesting = "OpenSpaceVisualTesting/OpenSpaceVisualTesting"
    testDirName = "tests/visual"
    baseTestDir, baseOsDir = figureOutDirs(testDirName, baseDirOpenSpaceVisualTesting, \
        baseDirOpenSpace)
    dirs = os.listdir(baseTestDir)
    numTestCases = len(dirs)
    testCaseNum = 1
    for dir in dirs:
        print("Test case " + str(testCaseNum) + "/" + str(numTestCases) + ": ", end="")
        whereIsTest = baseTestDir + "/" + dir
        processTestDirectory(whereIsTest, testDirName, baseOsDir, testSubsetString)
        testCaseNum += 1

def figureOutDirs(testDirName, baseDirVis, baseDirOs):
    solutionDir = os.getcwd()
    sDirIdx = solutionDir.rfind(baseDirVis)
    commonBaseDir = solutionDir[0:sDirIdx]
    #openspaceDir = commonBaseDir + "/" + baseDirOs
    openspaceDir = baseDirOs
    #fullOsPathTesting = commonBaseDir + "/" + baseDirOs + "/" + testDirName
    fullOsPathTesting = "../../OpenSpace/" + testDirName
    return fullOsPathTesting, openspaceDir

#Process all files in the directory passed in, recurse on any directories 
#that are found, and process the files they contain.
def processTestDirectory(targetDirectory, testDirName, baseOsDir, testSubsetString):
    idx = targetDirectory.rfind(testDirName) + len(testDirName) + 1
    testGroup = targetDirectory[idx:999]
    print("processTestDirectory: ", end="")
    print(targetDirectory)
    fileEntries = pathlib.Path(targetDirectory).glob("*.ostest")
    fileListing = list(fileEntries)
    numFileEntries = len(fileListing)
    feNum = 1
    for fe in fileListing:
        #print("File entry " + str(feNum) + "/" + str(numFileEntries) + ":")
        if testSubsetString == "" or fe.name[0:len(testSubsetString)] == testSubsetString:
            processTestFile(targetDirectory, fe, testGroup, baseOsDir)
        feNum += 1

#Insert logic for processing foundTestCases files here
def processTestFile(targetDirectory, path, testGroup, baseOsDir):
    print("Located in " + targetDirectory)
    print("Starting Test file '" + path.name + "'")
    numSlashes = path.name.count("/")
    if numSlashes > 0:
        path.name = path.name[path.name.rfind("/")]
    scenarioName = path.name[0:path.name.find(".ostest")]
    print("testName '" + testGroup + "." + scenarioName + "'")
    print("Starting asset '" + testGroup + "'.")

    ospace = OSS.OSSession(testGroup, baseOsDir + "/bin")
    print("AssetTester: OpenSpace initialized")
    ospace.startOpenSpace()
    time.sleep(30)
    print("AssetTester: Ready to start sending commands to OpenSpace.")
    ospace.focusOpenSpaceWindow()
    time.sleep(1.0)
    ospace.toggleHudVisibility()
    time.sleep(1.0)

    with open(targetDirectory + "/" + scenarioName + ".ostest") as f:
        data = json.load(f)
        for d in data:
            time.sleep(0.25)
            if d["type"] == "script":
                ospace.sendScript(d["value"])
            elif d["type"] == "wait":
                time.sleep(int(d["value"]))
            elif d["type"] == "screenshot":
                if len(d["value"]) < 1:
                    d["value"] = scenarioName
                ospace.moveScreenShot(testGroup, d["value"])
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
                os.symlink(targetDirectory + "/" + recordingFilename, \
                    baseOsDir + "/recordings/" + recordingFilename)
                recordingScript = "openspace.sessionRecording.startPlayback('"
                recordingScript += recordingFilename + "')"
                ospace.sendScript(recordingScript)
    #ospace.killOpenSpace()
    ospace.quitOpenSpace()
    print("Processed test '" + path.name + "'.")
    time.sleep(10)

if __name__ == "__main__":
    checkForInstalledComponents()
    if len(sys.argv) == 1:
        print("Error: Need an absolute path for OpenSpace instance installed directory")
        quit(-1)
    openspaceDirName = "OpenSpace"
    openspaceDirName = sys.argv[1]
    testSubsetString = ""
    if len(sys.argv) > 2:
        testSubsetString = sys.argv[2]
    runAssetTests(openspaceDirName, testSubsetString)
    quit(0)
