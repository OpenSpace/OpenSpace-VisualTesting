#!/usr/bin/python3

import sys
import os
import time
import signal
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError
import subprocess
import json
import pathlib
from glob import glob
from pathlib import Path
import shlex

#This script expects to run within the OpenSpaceVisualTesting repo cloned directory
# structure, and also expects that this repo exists in the same directory as the
# OpenSpace application repo cloned directory. Example:
#
# OpenSpace/
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

class OSSession:
    def __init__(self, profileCL, baseOsDir, logFilename):
        self.basePath = baseOsDir
        self.log = logFilename
        if len(profileCL) == 0:
            self.profile = "default"
        else:
            self.profile = profileCL
        self.OpenSpaceAppId = "OpenSpace"
        self.configValues = "--config \""
        self.configValues += "ScreenshotUseDate=false;ModuleConfigurations.Server={};"
        self.configValues += "ModuleConfigurations.WebBrowser.Enabled=false;"
        self.configValues += "ModuleConfigurations.WebGui={};"
        self.configValues += "ModuleConfigurations.GlobeBrowsing.WMSCacheEnabled=true;"
        self.configValues += "BypassLauncher=true;"
        self.configValues += "Profile='" + self.profile + "'" + "\""
        self.runCommand = self.basePath + "/" + self.OpenSpaceAppId + " " + self.configValues
        self.osProcId = 0

    def logMessage(self, message):
        print(message)
        lFile = open(self.log, "a+")
        lFile.write("  " + message + "\n")
        lFile.close()

    def startOpenSpace(self):
        self.osProcId = subprocess.Popen(shlex.split(self.runCommand))
        msg = "Started OpenSpace instance with ID '" + str(self.osProcId.pid) + "' (" \
            + self.runCommand + ")"
        self.logMessage(msg)

    def killOpenSpace(self):
        self.logMessage("Kill OpenSpace instance")
        os.killpg(os.getpgid(int(self.osProcId.pid)), signal.SIGTERM)
        time.sleep(4)

    def isOpenSpaceRunning(self):
        pgid = os.getpgid(int(self.osProcId.pid))
        if pgid == self.osProcId.pid:
            return True
        else:
            self.logMessage("OpenSpace instance is not running")
            return False

    def quitOpenSpace(self):
        quitRetries = 0
        self.logMessage("Quit OpenSpace instance")
        self.focusOpenSpaceWindow()
        self.keyboardKeystroke("Escape")
        time.sleep(8)
        while isOpenSpaceRunning():
            killOpenSpace()
            quitRetries += 1
            if quitRetries > 3:
                self.logMessage("Failing to force-quit OpenSpace instance")
                quit(-2)
        self.logMessage("Confirmed that OpenSpace instance successfully quit")

    def toggleHudVisibility(self):
        self.keyboardTypeWithHold("shift", "Tab")

    def focusOpenSpaceWindow(self):
        foundWinId = ""
        p = Popen("wmctrl -lG", shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, \
            close_fds=True)
        wmOutput = p.stdout.read()
        lineArray = wmOutput.splitlines()
        for line in lineArray:
            elems = line.split()
            if (len(elems) == 8) and (elems[7].decode("ASCII") == self.OpenSpaceAppId):
                foundWinId = elems[0]
                break
        if foundWinId != "":
            focusWindowCmd = "wmctrl -iR " + foundWinId.decode("ASCII")
            os.system(focusWindowCmd)

    def sendScript(self, script):
        script = script.replace("\"", "\\\"")
        time.sleep(1)
        self.keyboardKeystroke("quoteleft")
        self.keyboardType(script)
        #Adjust delay according to length of string to type
        time.sleep(len(script) / 10 + 0.25)
        self.keyboardKeystroke("Return")
        time.sleep(0.25)
        self.keyboardKeystroke("quoteleft")
        time.sleep(0.25)
        
    def keyboardHoldDownKey(self, key):
        os.system("xdotool keydown " + key)

    def keyboardReleaseKey(self, key):
        os.system("xdotool keyup " + key)

    def keyboardKeystroke(self, key):
        os.system("xdotool key " + key)
        self.logMessage("Keystroke: " + key)

    def keyboardType(self, string):
        cmdString = "xdotool type \"" + string + "\""
        os.system(cmdString)
        self.logMessage("Keystroke: " + string)

    #Function that executes a single keypress (specified by 'kPress' while holding
    # down the key specified by 'kHold'
    def keyboardTypeWithHold(self, kHold, kPress):
        cmdString = "xdotool keydown " + kHold + " key " + kPress + " keyup " + kHold
        os.system(cmdString)

    def addAssetFile(self, scenarioGroup, scenarioName):
        time.sleep(1)
        filePath = "../../OpenSpaceVisualTesting/OpenSpaceVisualTesting/TestGroups/"
        filePath += scenarioGroup + "/TestingAsset" + scenarioGroup + scenarioName
        self.sendScript("openspace.asset.add('" + filePath + "');")
        self.keyboardKeystroke("Return")
        time.sleep(0.25)
        self.keyboardKeystroke("quoteleft")
        time.sleep(2)

    def setTime(self, time):
        self.sendScript("openspace.time.setTime('" + time + "');")
        time.sleep(1)

    def moveScreenShot(self, scenarioGroup, scenarioName):
        self.logMessage("move screenshot group/name :" + scenarioGroup + "/" \
            + scenarioName)
        time.sleep(1)
        #self.keyboardType("openspace.takeScreenshot();")
        self.keyboardKeystroke("F12")
        time.sleep(10)
        solutionDir = os.getcwd()
        tmpPath = self.basePath + "/../user/screenshots/OpenSpace_000000.png"
        if not Path(tmpPath).is_file():
            self.logMessage("Screenshot wasn't successful. Expected to find '" \
                + tmpPath + "'")
            return
        targetDir = solutionDir + "/ResultImages/linux/"
        targetFilename = scenarioGroup + scenarioName + ".png"
        moveToPath = targetDir + targetFilename
        if os.path.isfile(moveToPath):
            os.remove(moveToPath)
        os.rename(tmpPath, moveToPath)
        self.logMessage("Moved screenshot: '" + targetFilename + "' to '" \
            + moveToPath + "'")

if __name__ == "__main__":
    ospace = OSSession("default", "~/Desktop/OpenSpace", "testLog.txt")
    ospace.startOpenSpace()
    time.sleep(30)
    ospace.focusOpenSpaceWindow()
    ospace.toggleHudVisibility()

