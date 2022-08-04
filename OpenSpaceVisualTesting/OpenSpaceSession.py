#!/usr/bin/python3

import asyncio
from glob import glob
import json
import os
import pathlib
from pathlib import Path
import shlex
import signal
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError
import subprocess
import sys
import time
import websockets


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

configFile = """
ScreenshotUseDate=false;
ModuleConfigurations.GlobeBrowsing.WMSCacheEnabled=true;
BypassLauncher=true;
Paths={
    DATA='${BASE}/data',
    ASSETS='${DATA}/assets',
    PROFILES='${DATA}/profiles',
    USER='${BASE}/user',
    USER_ASSETS='${USER}/data/assets',
    USER_PROFILES='${USER}/data/profiles',
    USER_CONFIG='${USER}/config',
    FONTS='${DATA}/fonts',
    TASKS='${DATA}/tasks',
    SYNC='${BASE}/sync',
    SCREENSHOTS='${USER}/screenshots',
    WEB='${DATA}/web',
    RECORDINGS='${USER}/recordings',
    CACHE='${BASE}/cache',
    CONFIG='${BASE}/config',
    DOCUMENTATION='${BASE}/documentation',
    LOGS='${BASE}/logs',
    MODULES='${BASE}/modules',
    SCRIPTS='${BASE}/scripts',
    SHADERS='${BASE}/shaders',
    TEMPORARY='${BASE}/temp',
    GLOBEBROWSING='${BASE}/../OpenSpaceData'
}
ModuleConfigurations = {
    GlobeBrowsing = {
        WMSCacheEnabled = false,
        WMSCacheLocation = '${BASE}/cache_gdal',
        WMSCacheSize = 1024, -- in megabytes PER DATASET
        TileCacheSize = 2048 -- for all globes (CPU and GPU memory)
    },
    Sync = {
        SynchronizationRoot = '${SYNC}',
        HttpSynchronizationRepositories = {
            'http://data.openspaceproject.com/request'
        }
    },
    Server = {
        AllowAddresses = { '127.0.0.1', 'localhost' },
        SkyBrowserUpdateTime = 50,
        Interfaces = {
            {
                Type = 'TcpSocket',
                Identifier = 'DefaultTcpSocketInterface',
                Port = 4681,
                Enabled = true,
                DefaultAccess = 'Deny',
                RequirePasswordAddresses = {},
                Password = ''
            },
            {
                Type = 'WebSocket',
                Identifier = 'DefaultWebSocketInterface',
                Port = 4682,
                Enabled = true,
                DefaultAccess = 'Deny',
                RequirePasswordAddresses = {},
                Password = ''
            }
        }
    },
    WebBrowser = {
        Enabled = true
    },
    WebGui = {
        Address = 'localhost',
        HttpPort = 4680,
        WebSocketInterface = 'DefaultWebSocketInterface'
    },
    CefWebGui = {
        Enabled = true,
        Visible = true
    },
    Space = {
        ShowExceptions = false
    }
}
Logging = {
    LogDir = '${LOGS}',
    LogLevel = 'Debug',
    ImmediateFlush = true,
    Logs = {
        { Type = 'html', File = '${LOGS}/log.html', Append = false }
    },
    CapabilitiesVerbosity = 'Full'
}
ScriptLog = '${LOGS}/ScriptLog.txt'
Documentation = {
    Path = '${DOCUMENTATION}/'
}
VersionCheckUrl = 'http://data.openspaceproject.com/latest-version'
UseMultithreadedInitialization = true
LoadingScreen = {
    ShowMessage = true,
    ShowNodeNames = true,
    ShowProgressbar = false
}
CheckOpenGLState = false
LogEachOpenGLCall = false
PrintEvents = false
ShutdownCountdown = 1
ScreenshotUseDate = true
BypassLauncher = true
"""

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
        self.configValues += configFile
        self.configValues += "Profile='" + self.profile + "'" + "\""

        self.runCommand = self.basePath + "/" + self.OpenSpaceAppId + " " + self.configValues
        self.osProcId = 0

    def logMessage(self, message):
        print(message)
        lFile = open(self.log, "a+")
        lFile.write("  " + message + "\n")
        lFile.close()

    async def connectRetries(self, url: str, nRetries: int):
        for t in range(0, nRetries):
            try:
                async with websockets.connect(url) as websocket:
                    await self.testTransmit(websocket)
                    await websocket.close()
                    self.logMessage(f"connectRetries finished with {t} retries.")
                    return True
            # This exception happens if a valid OpenSpace connection is established,
            # but times-out because of a long startup period (e.g. long sync)
            except asyncio.exceptions.TimeoutError:
                self.logMessage("Asyncio TimeoutError")
                time.sleep(120)
            # Handle exceptions that occur when no connection to OpenSpace exists
            # (OpenSpace is not running)
            except ConnectionRefusedError:
                self.logMessage("ConnectionRefusedError")
                time.sleep(1)
            except Exception:
                time.sleep(1)
        return False
  
    async def startupSocketTest(self, hostname: str, port: int, nRetries: int):
        websocket_resource_url = f"ws://{hostname}:{port}"
        success = False
        try:
            success = await self.connectRetries(websocket_resource_url, nRetries)
        except asyncio.TimeoutError:
            self.logMessage("Timed-out from asyncio.wait_for()")
        return success
    
    async def testTransmit(self, websocket: websockets.WebSocketClientProtocol) -> None:
        message = json.dumps({"topic": 4,
                      "type": "luascript",
                      "payload": {"function": "openspace.time.setPause",
                                  "arguments": [False],
                                  "return": False}})
        try:
            await websocket.send(message)
        except Exception as e:
            template = "In testTransmit exception {0} occurred. Arguments:\n{1!r}"
            message = template.format(type(e).__name__, e.args)
            self.logMessage(message)

    def startOpenSpace(self):
        self.osProcId = subprocess.Popen(shlex.split(self.runCommand))
        self.logMessage(f"Started OpenSpace instance with ID '{str(self.osProcId.pid)}'")
        #self.logMessage(f"OpenSpace run command: ({self.runCommand})")
        time.sleep(1)
        return asyncio.run(self.startupSocketTest("localhost", 4682, 30))

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

