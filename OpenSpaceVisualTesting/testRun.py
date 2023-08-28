#!/usr/bin/python3

import argparse
import datetime
import os
import pathlib
from pathlib import Path
import sys
import time
import AssetTester as AST

#BuildFlag is the full path to the file that Jenkins will modify when its build
#is complete. The single-line content of this file is the full path to the directory
#where Jenkins built the latest version of OpenSpace
BuildFlag = "C:/Users/OpenSpace/Desktop/latestBuild.txt"
#OsSyncDir is the full path to the sync directory that all Jenkins builds should use.
#This saves test time, preventing the new build from downloading all of the sync data.
OsSyncDir= "C:/Users/OpenSpace/Desktop/SYNC"
#OpenSpaceExeInOs is the relative path (from ${BASE}) to the OpenSpace executable.
OpenSpaceExeInOs = "bin/Debug/OpenSpace.exe"
LogFile = "log/testLog.txt"
#Platform must be either "windows" or "linux"
Platform = "windows"
#ImageTestingSubdirInOs is relative path to the visual tests (.ostest files) from ${BASE}
ImageTestingSubdirInOs = "tests/visual"
#UsrRecordSubdirInOs is relative path to the session recording files from ${BASE}
UsrRecordSubdirInOs = "user/recordings"
#RetriesPerTest is the number of times to retry a test if OpenSpace crashes/unresponsive
RetriesPerTest = 3
import targetcompare


def parserInitialization():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument("-d", "--dir", dest="customDir",
                            help="Specify base OpenSpace directory in which to run "\
                            "tests (uses jenkins-supplied build dir by default)",
                            required=False, default="")
        parser.add_argument("-t", "--test", dest="customTest",
                            help="Specify a custom test to run, instead of all by "\
                            "default. Provide in 'group/testFile.ostest' format.",
                            required=False, default="")
        parser.add_argument("-s", "--start-at", dest="startAtTest",
                            help="Does a full test run but only starting at the "\
                            "test specified here, instead of at the beginning. "\
                            "Provide in 'group/testFile.ostest' format.",
                            required=False, default="")
    except ImportError:
        parser = None
    return parser


def handleArgumentParsing(parser):
    args = parser.parse_args()
    return args


def logMsg(message):
    today = datetime.datetime.today().strftime("%Y-%m-%d %H:%M:%S")
    f = open(LogFile, 'a')
    f.write(today + " " + message)
    if Platform == "windows":
        f.write("\r")
    f.write("\n")
    f.close()


def logHeaderLine(message):
    f = open(LogFile, 'a')
    f.write(message)
    if Platform == "windows":
        f.write("\r")
    f.write("\n")
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
    OpenSpaceFullPath = os.path.abspath(os.path.join(builtPath, OpenSpaceExeInOs))
    if not os.path.isfile(OpenSpaceFullPath):
        errorMsg(f"OpenSpace executable not found at {OpenSpaceFullPath}")
        quit(-1)
    return #Skip the deletion of session recording dir for now
    #Clear recordings because OpenSpace tests use same recording filenames
    userRecDir = os.path.abspath(os.path.join(builtPath, UsrRecordSubdirInOs))
    if os.path.isdir(userRecDir):
        for root, dirs, files in os.walk(userRecDir):
            for rec in files:
                os.remove(rec)


#Given the base directory of an OpenSpace build ($1), this function finds all .ostest
#files in the tests/visual/ directory and returns them in a string of names with newlines
def listAllTestFiles(baseOsDir):
    testingDir = os.path.abspath(os.path.join(baseOsDir, ImageTestingSubdirInOs))
    listing = []
    for root, dirs, files in os.walk(testingDir):
        for testFile in files:
            if testFile.endswith(".ostest"):
                fullName = os.path.abspath(os.path.join(root, testFile))
                listing.append(fullName[len(testingDir)+1:])
    return sorted(listing)


#Runs one or more tests which are listed in string list arg $2, at the base OpenSpace
# build directory specified at arg $1.
def runAllTests(baseOsDir, fileList):
    nTestsTotal = len(fileList)
    testIndex = 1
    for test in fileList:
        baseTestPath = os.path.abspath(os.path.join(baseOsDir, ImageTestingSubdirInOs))
        fullTestPath = os.path.abspath(os.path.join(baseTestPath, test))
        logAndDisplayMsg(f"Run '{fullTestPath}'.")
        if os.path.isfile(fullTestPath):
            logHeaderLine("")
            logAndDisplayMsg(f"Start OpenSpace test '{test}' ({testIndex}/{nTestsTotal})")
            testGroup = os.path.split(test)[0]
            thisTest = os.path.split(test)[1]
            for testAttempt in range(0, RetriesPerTest):
                logAndDisplayMsg(f"Run test '{thisTest}' of group '{testGroup}' "\
                                 f"({testAttempt+1}/{RetriesPerTest} tries)")
                successful = AST.assetRun(baseOsDir, ImageTestingSubdirInOs, testGroup,
                                          thisTest, OpenSpaceExeInOs, LogFile, OsSyncDir,
                                          UsrRecordSubdirInOs, Platform)
                if successful:
                    logAndDisplayMsg(f"Finished OpenSpace test '{test}'.")
                    break
        else:
            logAndDisplayMsg(f"ERROR: test file '{fullTestPath}' not found.")
        testIndex += 1
    logAndDisplayMsg("Finished all OpenSpace tests.")


#Function to run image comparisons after test(s) run. If a specific test name is
#provided ($1), then comparisons will only run on that test. If no $1 arg is provided,
#then all tests will run. Note that the web page .json report file will only be
#generated if all tests are run.
def runComparisons(test):
    if not test.strip():
        logMsg("Run targetcompare.py script on all tests")
    else:
        logMsg(f"Run targetcompare.py script on test '{test}'")
    if Platform == "linux":
        targetcompare.runComparison(test, "linux", "windows")
    targetcompare.runComparison(test, Platform, Platform)


def createFilesystemLinksAtWebServerDirectory():
    logMsg("Update links for web server directory.")
    linkScriptCmd = os.getcwd() + "/linkResultsFromWorkingDir.sh"
    subprocess.Popen(linkScriptCmd)


def clearBuildFlagToSignalTestCompletionToJenkins():
    logMsg(f"Clear flag in file '{BuildFlag}' to signal jenkins that test finished.")
    f = open(BuildFlag, 'w')
    f.write("")
    f.close()


#Run the test(s) using the specified OpenSpace installation directory
# $1 - Full path to the OpenSpace directory to be used for the test
#      (the executable is located at bin/OpenSpace relative to this path)
# $2 - Relative path to the test file to start at. Tests will run in sorted alphabetical
#      order for a full run. If this is a non-empty string, then the test run will start
#      at the beginning but skip all tests until this test is encountered, then will run
#      it, and continue running the remainder of the tests (use this if a run crashed).
#      The path that this is relative to is tests/visual/ in the base OpenSpace directory
#      (not this OpenSpaceVisualTesting repository directory).
#      The path format is:  testFolder/testName.ostest
# $3 - Relative path to the only test file in the series that will be run. See above
#      notes for details about the path
def executeTests(openspaceDir, startAtTest, soleTest):
    setUpBuildDirectoryForRun(openspaceDir)
    allTestsListed = listAllTestFiles(openspaceDir)
    if startAtTest == "" and soleTest == "":
        logAndDisplayMsg(f"Start looping through all found .ostest files:")
        for i in range(0, len(allTestsListed)):
            logAndDisplayMsg(f"    {i+1} {allTestsListed[i]}")
        runAllTests(openspaceDir, allTestsListed)
        runComparisons("")
    elif startAtTest != "":
        while len(allTestsListed):
            if allTestsListed[0] != startAtTest:
                allTestsListed.pop(0)
            else:
                break
        runAllTests(openspaceDir, allTestsListed)
        runComparisons("")
    elif soleTest != "":
        runAllTests(openspaceDir, {soleTest})
        runComparisons(soleTest)
    createFilesystemLinksAtWebServerDirectory


def getPathFromJenkinsTriggerFile():
    if os.path.isfile(BuildFlag):
        f = open(BuildFlag, 'r')
        readLine = f.read()
        f.close()
        if readLine.strip():
            return readLine.strip()
        return ""
    else:
        print(f"Cannot find jenkins trigger file at {BuildFlag}")
        quit(-1)

def verifyCustomFile(osDir, testFile, messagePrefix):
    testPath = os.path.abspath(os.path.join(osDir, ImageTestingSubdirInOs, testFile))
    if os.path.isfile(testPath):
        logAndDisplayMsg(f"{messagePrefix} {testFile}.")
    else:
        errorMsg(f"Error: cannot find specified test file at {testPath}.")
        quit(-1)


if __name__ == "__main__":
    assert sys.version_info >= (3, 5), "Script requires Python 3.5+."
    if os.path.isfile(LogFile):
        os.remove(LogFile)
    parser = parserInitialization()
    args = handleArgumentParsing(parser)
    customizedTest = False
    #Determine which installation directory for OpenSpace to run
    if not args.customDir.strip():
        args.customDir = getPathFromJenkinsTriggerFile()
    else:
        customizedTest = True
        logAndDisplayMsg(f"Running test(s) on OpenSpace installation at " \
                         f"{args.customDir}.")

    if args.startAtTest != "":
        verifyCustomFile(args.customDir, args.startAtTest, "Starting test file run at ")
        customizedTest = True
    elif args.customTest != "":
        verifyCustomFile(args.customDir, args.customTest, "Running manual test file ")
        customizedTest = True
    if customizedTest:
        #Run a single test if a custom directory or specific test was named
        logAndDisplayMsg(f"Run tests from {args.customDir}.")
        executeTests(args.customDir, args.startAtTest, args.customTest)
        logAndDisplayMsg("Finished with customzed test run")
    else:
        #Loop to wait for Jenkins trigger to run tests
        logAndDisplayMsg("Waiting for Jenkins build-completion trigger...")
        while True:
            args.customDir = getPathFromJenkinsTriggerFile()
            if args.customDir.strip():
                executeTests(args.customDir, "", "")
                clearBuildFlagToSignalTestCompletionToJenkins()
                logAndDisplayMsg("Continuing to wait for next Jenkins trigger...")
            time.sleep(10)

