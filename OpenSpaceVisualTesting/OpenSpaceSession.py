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
from websocket import create_connection
import websockets


#This script handles the OpenSpace-specific parts of running an .ostest file

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
websocket_resource_url = f"ws://localhost:4682/websocket"


class OSSession:
    def __init__(self, profileCL, baseOsDir, logFilename):
        self.basePath = baseOsDir
        self.log = logFilename
        if len(profileCL) == 0:
            self.profile = "default"
        else:
            self.profile = profileCL
        self.OpenSpaceAppId = "OpenSpace"
        self.setConfigString()
        self.runCommand = self.basePath + "/" + self.OpenSpaceAppId + " "
        self.runCommand += self.configValues
        self.osProcId = 0

    def setConfigString(self):
        self.configValues = "--config \""
        self.configValues += configFile
        self.configValues += "Profile='" + self.profile + "'" + "\""

    def logMessage(self, message):
        print(message)
        lFile = open(self.log, "a+")
        lFile.write("  " + message + "\n")
        lFile.close()

    def setSyncDirectory(self, syncPath):
        syncPos1 = configFile.find("SYNC=\'")
        if syncPos1 != -1:
            syncPos2 = configFile.find("\'", syncPos1 + 7)
            syncPathExisting = configFile[syncPos1:syncPos2+1]
            syncPath = "SYNC=\'" + syncPath + "\'"
            configFile.replace(syncPathExisting, syncPath)
            self.setConfigString()

    async def connectRetries(self, url: str, message, nRetries: int):
        for t in range(0, nRetries+1):
            try:
                async with websockets.connect(url) as websocket:
                    await self.transmit(websocket, message)
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
                self.logMessage("Unknown exception")
                time.sleep(1)
        return False
  
    async def startSocketConnectionWithRetries(self, message, nRetries: int):
        success = False
        try:
            success = await self.connectRetries(websocket_resource_url, message, nRetries)
        except asyncio.TimeoutError:
            self.logMessage("startSocketConnectionWithRetries timed-out "
                            "from asyncio.wait_for()")
        return success

    def startSocketConnection(self, message):
        try:
            ws = create_connection(websocket_resource_url)
            ws.send(message)
        except Exception:
            self.logMessage("Unable to create socket connection in startSocketConnection")
            quit(-3)

    async def transmit(self, websocket: websockets.WebSocketClientProtocol, message):
        try:
            await websocket.send(message)
        except Exception as e:
            template = "In transmit exception {0} occurred. Arguments:\n{1!r}"
            message = template.format(type(e).__name__, e.args)
            self.logMessage(message)

    def startOpenSpace(self):
        self.osProcId = subprocess.Popen(shlex.split(self.runCommand))
        self.logMessage(f"Started OpenSpace instance with ID '{str(self.osProcId.pid)}'")
        time.sleep(1)
        startTryMsg = self.generateJsonForPause()
        return asyncio.run(self.startSocketConnectionWithRetries(startTryMsg, 2))

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
        self.executeSocketSend(self.generateJsonForQuit(), "quit message", 0)
        time.sleep(5)
        while self.isOpenSpaceRunning():
            self.killOpenSpace()
            quitRetries += 1
            if quitRetries > 3:
                self.logMessage("Failing to force-quit OpenSpace instance")
                quit(-2)
        self.logMessage("Confirmed that OpenSpace instance successfully quit")

    def disableHudVisibility(self):
        hideHudMsgs = self.generateJsonForHideHud()
        for m in hideHudMsgs:
            self.executeSocketSend(m, f"hideHudVis message ({m})", 0)

    def generateJsonForQuit(self):
        return self.generateJson("openspace.toggleShutdown", [])

    def generateJsonForSetTime(self, time: str):
        return self.generateJson("openspace.time.setTime", [time])

    def generateJsonForScreenshotFolder(self, folder):
        return self.generateJson("openspace.setScreenshotFolder", [folder])

    def generateJsonForScreenshot(self):
        return self.generateJson("openspace.takeScreenshot", [])

    def generateJsonForHideHud(self):
        propsToDisable = ["Dashboard.IsEnabled",
                          "RenderEngine.ShowLog",
                          "RenderEngine.ShowVersion",
                          "RenderEngine.ShowCamera",
                          "Modules.CefWebGui.Visible"]
        jsonsForHideHud = []
        for p in propsToDisable:
            jsonsForHideHud.append(self.generateJson("openspace.setPropertyValueSingle",
                                                     [p, False]))
        return jsonsForHideHud

    def generateJsonForPause(self):
        return self.generateJson("openspace.time.setPause", [False])

    def generateJsonForAction(self, actionName):
        return self.generateJson("openspace.action.triggerAction", [actionName])

    def generateJsonForScript(self, script: str):
        parensLeft = script.find("(")
        parensRight = script.find(")")
        if parensLeft == -1 or parensRight == -1:
            self.logMessage(f"Error in generating json for script '{script}'. "
                            "Unmatched or missing parentheses.")
        func = script[0:parensLeft]
        remainder = script[parensLeft+1:parensRight]
        if func == "openspace.navigation.setNavigationState":
            params = self.generateParamForNavigationState(script)
            return self.generateJson(func, [params])
        else:
            params = remainder.split(",")
            for i in range(0, len(params)):
                params[i] = params[i].lstrip(" '\"[").rstrip(" '\"]")
                if isParamInt(params[i]):
                    # An int, float, or string representation of an int will end up here
                    if isParamFloat(params[i]):
                        params[i] = float(params[i])
                    else:
                        params[i] = int(params[i])
                elif isParamFloat(params[i]):
                    # A string representation of a float will end up here
                    params[i] = float(params[i])
                elif isParamBool(params[i]):
                    if params[i].lower() == "true":
                        params[i] = True
                    else:
                        params[i] = False
            return self.generateJson(func, params)

    def generateParamForNavigationState(self, navString: str):
        anchorIdx = navString.find("Anchor")
        pitchIdx = navString.find("Pitch")
        positionIdx = navString.find("Position")
        upIdx = navString.find("Up")
        yawIdx = navString.find("Yaw")
        result = {}
        if anchorIdx != -1:
            result["Anchor"] = extractValueFromNavString(navString, anchorIdx)
        if pitchIdx != -1:
            result["Pitch"] = float(extractValueFromNavString(navString, pitchIdx))
        if positionIdx != -1:
            result["Position"] = extractArrayFromNavString(navString, positionIdx)
        if upIdx != -1:
            result["Up"] = extractArrayFromNavString(navString, upIdx)
        if yawIdx != -1:
            result["Yaw"] = float(extractValueFromNavString(navString, yawIdx))
        return result

    def generateJson(self, func: str, args: []):
        return json.dumps({"topic": 4,
                           "type": "luascript",
                           "payload": {"function": func, "arguments": args}})

    def sendScript(self, script):
        scriptMsg = self.generateJsonForScript(script)
        self.executeSocketSend(scriptMsg, f"sendScript message ({script})", 0)
        time.sleep(1)

    def action(self, actionName):
        actionMsg = self.generateJsonForAction(actionName)
        self.executeSocketSend(actionMsg, f"action message ({actionName})", 0)
        time.sleep(1)
 
    def setTime(self, time):
        setTimeMsg = self.generateJsonForSetTime(time)
        self.executeSocketSend(setTimeMsg, f"setTime message ({time})", 0)
        time.sleep(1)

    def moveScreenShot(self, scenarioGroup, scenarioName):
        folderName = "${BASE}/user/screenshots/imagetestingfolder"
        self.logMessage(f"move screenshot group/name : {scenarioGroup}/{scenarioName}")
        screenshotFolderMsg = self.generateJsonForScreenshotFolder(folderName)
        self.executeSocketSend(screenshotFolderMsg, "screenshot folder message", 0)
        time.sleep(1)
        screenshotMsg = self.generateJsonForScreenshot()
        self.executeSocketSend(screenshotMsg, "screenshot message", 0)
        time.sleep(2)
        solutionDir = os.getcwd()
        tmpPath = f"{self.basePath}/../user/screenshots/imagetestingfolder/OpenSpace_000000.png"
        if not Path(tmpPath).is_file():
            self.logMessage(f"Screenshot wasn't successful. Expected to find '{tmpPath}'")
            return
        targetDir = f"{solutionDir}/ResultImages/linux/"
        targetFilename = f"{scenarioGroup}{scenarioName}.png"
        moveToPath = targetDir + targetFilename
        if os.path.isfile(moveToPath):
            os.remove(moveToPath)
        os.rename(tmpPath, moveToPath)
        self.logMessage(f"Moved screenshot: '{targetFilename}' to '{moveToPath}'")

    def executeSocketSend(self, message, description, nRetries):
        self.logMessage(f"Sending message: '{message}' ({description})")
        time.sleep(0.5)
        sendResult = self.startSocketConnection(message)
        time.sleep(1)

    def waitForPlaybackToFinish(self):
        ws = create_connection(websocket_resource_url)
        commandPayload = {"event": "refresh", "properties": ['state']}
        command = {"topic": 1,"type": "sessionRecording","payload": commandPayload}
        message = json.dumps(command)
        retryCount = 15
        while retryCount > 0:
            ws.send(message)
            response = ws.recv()
            data = json.loads(response)
            if data["payload"]["state"] == "idle":
                break
            time.sleep(10)
            retryCount -= 1
        ws.close()


def isParamFloat(test):
    try:
        float(test)
        return True
    except ValueError:
        return False


def isParamInt(test):
    try:
        int(test)
        return True
    except ValueError:
        return False


def isParamBool(test):
    if test.lower() == "true":
        return True
    elif test.lower() == "false":
        return True
    else:
        return False


#Extract single float value from a navigation string as found in value of
#'Anchor', 'Pitch', and 'Yaw' keys
def extractValueFromNavString(navString: str, headerIdx: int):
    idxEquals = navString.find("=", headerIdx)
    idxComma = navString.find(",", headerIdx)
    if idxComma == -1:
        extracted = navString[idxEquals+1:len(navString)]
    else:
        extracted = navString[idxEquals+1:idxComma]
    return extracted.lstrip(" '\"[{(").rstrip(" '\")}];")


#Extract x,y,z float values from a navigation string as found in value of
#'Position' and 'Up' keys
def extractArrayFromNavString(navString: str, headerIdx: int):
    idxStart = navString.find("{", headerIdx)
    idxEnd = navString.find("}", headerIdx)
    extracted = navString[idxStart+1:idxEnd]
    idxComma0 = navString.find(",", idxStart)
    if idxComma0 != -1:
        idxComma1 = navString.find(",", idxComma0+1)
        x = navString[idxStart+1:idxComma0].lstrip().rstrip()
        y = navString[idxComma0+1:idxComma1].lstrip().rstrip()
        z = navString[idxComma1+1:idxEnd].lstrip().rstrip()
        return [float(x), float(y), float(z)]
    else:
        return [0.0, 0.0, 0.0]


if __name__ == "__main__":
    ospace = OSSession("default", "~/Desktop/OpenSpace", "testLog.txt")
    ospace.startOpenSpace()
    time.sleep(30)
    ospace.disableHudVisibility()

