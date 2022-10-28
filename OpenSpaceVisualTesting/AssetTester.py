#!/usr/bin/python3

from concurrent.futures import TimeoutError
from glob import glob
import argparse
import json
import os
import sys
import time
import pathlib
from pathlib import Path
import subprocess
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError
import OpenSpaceSession as OSS

#Standalone script usage:
#  Read the configuration for the python 'argparse' package below for usage, or
#  run this script with '-h' argument to print the help. All arguments are listed
#  with their functionality description, and whether or not they are required.


def parserInitialization():
    try:
        import argparse
        parser = argparse.ArgumentParser()
        parser.add_argument("-d", "--osdir", dest="baseOsDir",
                            help="specify base OpenSpace directory in which to run "\
                            "tests (uses jenkins-supplied build dir by default)",
                            required=True)
        parser.add_argument("-t", "--testdir", dest="testOffsetDir",
                            help="specify a directory path where .ostest files reside, "\
                            "relative to the base OpenSpace directory (if different "\
                            "from the default (tests/visual/)",
                            required=True)
        parser.add_argument("-g", "--testgroup", dest="testGroup",
                            help="the test group (directory) containing the .ostest "\
                            "file to be run (file is a separate arg)",
                            required=True)
        parser.add_argument("-f", "--testfile", dest="testFilename",
                            help="the .ostest file for the test to be run, which "\
                            "resides within the testGroup directory",
                            required=True)
        parser.add_argument("-l", "--logfile", dest="logFilename",
                            help="the filename of the log file for this test run",
                            required=True)
        parser.add_argument("-s", "--sync", dest="syncDir",
                            help="the absolute path of the sync dir to use",
                            required=False)
    except ImportError:
        parser = None
    return parser


def handleArgumentParsing(parser):
    args = parser.parse_args()
    return args


def verifyBaseOsDirectoryExists(directory):
    if not os.path.exists(directory):
        print(f"Error: cannot find base OpenSpace directory '{directory}'.")
        quit(-1)


def verifyTestFileExists(filepath):
    if not os.path.exists(filepath):
        print(f"Error: cannot find specified test file at '{filepath}'.")
        quit(-1)


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
        msg = f"Result dir for screenshots '{intendedDir}' was not successfully created."
        logMessage(logFile, msg)
        quit(-1)
    intendedDir = os.getcwd() + "/DifferenceImages/linux/"
    Path(intendedDir).mkdir(parents=True, exist_ok=True)
    if not Path(intendedDir).is_dir():
        msg = f"Difference dir for diff result images '{intendedDir}' " \
              "was not successfully created."
        logMessage(logFile, msg)
        quit(-1)


#Insert logic for processing foundTestCases files here
def processTestFile(baseOsDir, testOffsetDir, testGroup, testFilename, log, sync):
    fullTestDir = baseOsDir + "/" + testOffsetDir + "/" + testGroup
    logMessage(log, f"AssetTester: Located in: {fullTestDir}")
    logString = f"AssetTester: Starting Test file '{testFilename}'"
    if len(testGroup) > 0:
        logString += f" in group '{testGroup}'"
    logMessage(log, logString)
    ospace = OSS.OSSession(testGroup, f"{baseOsDir}/bin", log)
    ospace.setSyncDirectory(sync)
    logMessage(log, "AssetTester: OpenSpace initialized")
    result = ospace.startOpenSpace()
    if not result:
        logMessage(log, "Failed to connect to a running instance of OpenSpace")
        ospace.quitOpenSpace()
        time.sleep(3)
        quit(-3)
    logMessage(log, "AssetTester: Ready to start sending commands to OpenSpace.")
    ospace.disableHudVisibility()
    time.sleep(1.0)

    with open(f"{fullTestDir}/{testFilename}") as f:
        data = json.load(f)
        for d in data:
            time.sleep(0.25)
            ostestType = d["type"]
            ostestValue = d["value"]
            msg = f"AssetTester: ostest parser found type '{ostestType}' "
            msg += f"with value '{ostestValue}'."
            logMessage(log, msg)
            if ostestType == "script":
                ospace.sendScript(ostestValue)
            elif ostestType == "wait":
                time.sleep(int(ostestValue))
            elif ostestType == "screenshot":
                if len(ostestValue) < 1:
                    shotName = testFilename[0:len(testFilename) - 7]
                else:
                    shotName = ostestValue
                ospace.moveScreenShot(testGroup, shotName)
            elif ostestType == "time":
                timeScript = f"openspace.time.setTime({ostestValue});"
                ospace.sendScript(timeScript)
            elif ostestType == "action":
                ospace.action(ostestValue)
            elif ostestType == "pause":
                pauseScript = f"openspace.time.setPause({ostestValue});"
                ospace.sendScript(pauseScript)
            elif ostestType == "navigationstate":
                navScript = f"openspace.navigation.setNavigationState({ostestValue});"
                ospace.sendScript(navScript)
            elif ostestType == "recording":
                #Create a temporary link to the recording in ${RECORDINGS} dir
                recordingFilename = f"{ostestValue}"
                src = f"{fullTestDir}/{recordingFilename}"
                dest = f"{baseOsDir}/user/recordings/{recordingFilename}"
                if not os.path.exists(dest):
                    os.symlink(src, dest)
                recordingScript = "openspace.sessionRecording.startPlayback"
                ospace.sendScript(f"{recordingScript}('{recordingFilename}')")
                ospace.waitForPlaybackToFinish()
            else:
                logMessage(log, f"AssetTester: unhandled ostest entry of type " \
                           "'{ostestType}' with value '{ostestValue}'.")
    logMessage(log, "Done parsing .ostest entries.")
    ospace.quitOpenSpace()
    time.sleep(5)
    #Kill in case the quit command wasn't processed
    #ospace.killOpenSpace()
    logMessage(log, f"Processed test '{testGroup}/{testFilename}'.")
    time.sleep(5)


if __name__ == "__main__":
    assert sys.version_info >= (3, 5), "Script requires Python 3.5+."
    checkForInstalledComponents()
    parser = parserInitialization()
    args = handleArgumentParsing(parser)

    verifyBaseOsDirectoryExists(args.baseOsDir)
    verifyTestFileExists(args.baseOsDir + "/" +
                         args.testOffsetDir + "/" +
                         args.testGroup + "/" +
                         args.testFilename)
    checkForProperDirectories(args.logFilename)
    processTestFile(args.baseOsDir, args.testOffsetDir, args.testGroup,
                    args.testFilename, args.logFilename, args.syncDir)
    quit(0)
