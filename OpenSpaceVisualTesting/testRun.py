#!/usr/bin/python3

import argparse
import datetime
import os
import pathlib
from pathlib import Path
import sys
import time

import AssetTester as AST
import targetcompareIncremental_Linux as compareIncLinux
#import targetcompareIncremental_Windows as compareIncWin
import targetcompareWin64vsLinux as compareWinVsLinux

buildFlag = "/home/openspace/Desktop/latestBuild.txt"
OsSyncDir= "/home/openspace/Desktop/sync"
logFile = "./testLog.txt"
imageTestingSubdirInOs = "tests/visual"


def parserInitialization():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument("-d", "--dir", dest="customDir",
                            help="Specify base OpenSpace directory in which to run "\
                            "tests (uses jenkins-supplied build dir by default)",
                            required=False, default="")
        parser.add_argument("-t", "--test", dest="customTest",
                            help="Specify a custom test to run, instead of all by "\
                            "default. Provide only the test name without the .ostest "\
                            "extension", required=False, default="")
    except ImportError:
        parser = None
    return parser


def handleArgumentParsing(parser):
    args = parser.parse_args()
    return args


def logMsg(message):
    today = datetime.datetime.today().strftime("%Y-%m-%d %H:%M:%S")
    f = open(logFile, 'a')
    f.write(today + " " + message)
    f.close()


def logAndDisplayMsg(message):
    print(message)
    logMsg(message)


def errorMsg(message):
    print(message, file=sys.stderr)
    logMsg(message)


#Given the base directory of an OpenSpace build ($1), this function prepares that
#directory for running the image comparison tests.
def setUpBuildDirectoryForRun(builtPath):
    if not os.path.isfile(f"{builtPath}/bin/OpenSpace"):
        errorMsg(f"OpenSpace executable not found at {builtPath}/bin")
        quit(-1)
    #Clear recordings because OpenSpace tests use same recording filenames
    userRecDir = f"{builtPath}/user/recordings"
    if os.path.isdir(userRecDir):
        for root, dirs, files in os.walk(userRecDir):
            for rec in files:
                os.remove(rec)


#Given the base directory of an OpenSpace build ($1), this function finds all .ostest
#files in the tests/visual/ directory and returns them in a string of names with newlines
def listAllTestFiles(baseOsDir):
    testingDir = f"{baseOsDir}/{imageTestingSubdirInOs}"
    listing = []
    for root, dirs, files in os.walk(testingDir):
        for testFile in files:
            if testFile.endswith(".ostest"):
                fullName = f"{root}/{testFile}"
                listing.append(fullName[len(testingDir)+1:])
    return listing


#Runs one or more tests which are listed in string list arg $2, at the base OpenSpace
# build directory specified at arg $1.
def runAllTests(baseOsDir, fileList):
    for test in fileList:
        baseTestPath = f"{baseOsDir}/{imageTestingSubdirInOs}"
        fullTestPath = f"{baseTestPath}/{test}"
        if os.path.isfile(fullTestPath):
            logAndDisplayMsg(f"Starting OpenSpace test '{test}'")
            basePathLen = len(baseTestPath)
            lastSlash = fullTestPath.rfind("/")
            testGroup = fullTestPath[basePathLen+1:lastSlash]
            thisTest = fullTestPath[lastSlash+1:]
            print(f"Run test '{thisTest}' of group '{testGroup}'")
            assetTest = AST.assetRun(baseOsDir, imageTestingSubdirInOs, testGroup,
                                     thisTest, logFile, OsSyncDir)
            logAndDisplayMsg(f"Finished OpenSpace test '{testGroup}/{thisTest}'.")
    logAndDisplayMsg("Finished all OpenSpace tests.")


#Function to run image comparisons after test(s) run. If a specific test name is
#provided ($1), then comparisons will only run on that test. If no $1 arg is provided,
#then all tests will run. Note that the web page .json report file will only be
#generated if all tests are run.
def runComparisons(test):
    if not test.strip():
        logMsg("Run targetcompareWin64vsLinux.py script on all tests")
    else:
        logMsg(f"Run targetcompareWin64vsLinux.py script on test '{test}'")
    compareWinVsLinux.runComparison(test)
    compareIncLinux.runComparison(test)


def createFilesystemLinksAtWebServerDirectory():
    logMsg("Update links for web server directory.")
    linkScriptCmd = os.getcwd() + "/linkResultsFromWorkingDir.sh"
    subprocess.Popen(linkScriptCmd)


def clearBuildFlagToSignalTestCompletionToJenkins():
    logMsg(f"Clear flag in file '{buildFlag}' to signal jenkins that test finished.")
    f = open(buildFlag, 'w')
    f.write("")
    f.close()


#Run the test(s) using the specified OpenSpace installation directory
# $1 - Full path to the OpenSpace directory to be used for the test
#      (the executable is located at bin/OpenSpace relative to this path)
# [$2] - Optional relative path to the specific test file to run. OpenSpace
#        will only run once with this test. The path that this is relative to is
#        tests/visual/ in the base OpenSpace directory (not this OpenSpaceVisualTesting
#        repository directory). The path format is:  testFolder/testName.ostest
def executeTests(openspaceDir, testRelPath):
    setUpBuildDirectoryForRun(openspaceDir)
    if testRelPath == "":
        allTestsListed = listAllTestFiles(openspaceDir)
        runAllTests(openspaceDir, allTestsListed)
        runComparisons("")
    else:
        runAllTests(openspaceDir, testRelPath)
        runComparisons(testRelPath)
    createFilesystemLinksAtWebServerDirectory


def getPathFromJenkinsTriggerFile():
    f = open(buildFlag, 'r')
    readLine = f.read()
    f.close()
    if readLine.strip():
        return readLine.strip()
    return ""


if __name__ == "__main__":
    assert sys.version_info >= (3, 5), "Script requires Python 3.5+."
    if os.path.isfile(logFile):
        os.remove(logFile)
    parser = parserInitialization()
    args = handleArgumentParsing(parser)
    #Determine which installation directory for OpenSpace to run
    if not args.customDir.strip():
        args.customDir = getPathFromJenkinsTriggerFile()
    else:
        logAndDisplayMsg(f"Running test(s) on OpenSpace installation at {customDir}.")
    #Verify custom test directory to run (if specified)
    if args.customTest != "":
        testPath = f"{args.customTest}/{imageTestingSubdirInOs}/{args.customTest}"
        if os.path.isdir(testPath):
            logAndDisplayMsg(f"Running manual test on OpenSpace installation "\
                              "(test {args.customTest}).")
        else:
            errorMsg(f"Error: cannot find specified test file at {testPath}.")
            quit(-1)
    if args.customDir.strip() and args.customTest.strip():
        #Run a single test if a custom directory or specific test was named
        executeTests(args.customDir, args.customTest)
    else:
        #Loop to wait for Jenkins trigger to run tests
        print("Waiting for Jenkins build-completion trigger...")
        while True:
            args.customDir = getPathFromJenkinsTriggerFile()
            if args.customDir.strip():
                executeTests(args.customDir, "")
                clearBuildFlagToSignalTestCompletionToJenkins()
                print("Continuing to wait for next Jenkins build-completion trigger...")
            time.sleep(10)

