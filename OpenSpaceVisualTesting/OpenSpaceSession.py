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
    def __init__(self, profileCL, baseOsDir):
        self.basePath = baseOsDir
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

    def startOpenSpace(self):
        self.osProcId = subprocess.Popen(shlex.split(self.runCommand))
        print("OSS: Started OpenSpace instance with ID '" + str(self.osProcId.pid) + "'")

    def killOpenSpace(self):
        print("OSS: kill OpenSpace instance")
        os.killpg(os.getpgid(int(self.osProcId.pid)), signal.SIGTERM)
        time.sleep(4)

    def quitOpenSpace(self):
        print("OSS: quit OpenSpace instance")
        self.focusOpenSpaceWindow()
        self.keyboardKeystroke("Escape")
        time.sleep(4)

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

    def keyboardType(self, string):
        cmdString = "xdotool type \"" + string + "\""
        os.system(cmdString)

    #Function that executes a single keypress (specified by 'keyPress' while holding
    # down the key specified by 'keyHold'
    def keyboardTypeWithHold(self, keyHold, keyPress):
        cmdString = "xdotool keydown " + keyHold + " key " + keyPress + " keyup " + keyHold
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
        time.sleep(1)
        #self.keyboardType("openspace.takeScreenshot();")
        self.keyboardKeystroke("F12")
        time.sleep(10)
        solutionDir = os.getcwd()
        tmpPath = self.basePath + "/../" + "screenshots/OpenSpace_000000.png"
        if not Path(tmpPath).is_file():
            print("OSS: Screenshot was not successful. Expected to find '" + tmpPath + "'")
            return
        targetDir = solutionDir + "/TargetImages/linux/"
        Path(targetDir).mkdir(parents=True, exist_ok=True)
        if not Path(targetDir).is_dir():
            print("Target dir for screenshots '" + targetDir + "' was not successfully created.")
            return
        targetFilename = "Result" + scenarioGroup + scenarioName + ".png"
        moveToPath = targetDir + targetFilename
        if os.path.isfile(moveToPath):
            os.remove(moveToPath)
        os.rename(tmpPath, moveToPath)

if __name__ == "__main__":
    ospace = OSSession("default", "~/Desktop/OpenSpace")
    ospace.startOpenSpace()
    time.sleep(30)
    ospace.focusOpenSpaceWindow()
    ospace.toggleHudVisibility()

