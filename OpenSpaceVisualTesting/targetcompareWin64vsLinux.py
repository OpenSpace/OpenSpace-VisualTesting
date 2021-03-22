#!/usr/bin/python3

import os
import json
import pathlib
from glob import glob
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError

comparisonReportFilename = "comparisonWin64vsLinux.report"

def writeToReport(filename, s):
    try:
        r = open(filename, 'a')
        r.write(s)
    except Exception as e:
        print("Problem writing to " + filename)
    finally:
        r.close()

def compareImage(target, current, diff):
    imgMgck = "compare -fuzz 4%% -metric rmse " + target + " " + current + " " + diff
    p = Popen(imgMgck, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    return p.stdout.read()

def appendJsonEntry(compList, testName, isNewTest, compareScore):
    compList.append({"name":testName, "new":isNewTest, "score":compareScore})
    return compList

def writeToVisualTestResultsJsonFile(items):
    with open("visualtests_Win64vsLinux_results.json", 'w') as outfile:
        json.dump({"items":items}, outfile)

def processImageFilesAndProduceReports(targetDirectory):
    winDir = targetDirectory + "win64/"
    linuxDir = targetDirectory + "linux/"
    diffDir = targetDirectory
    imageListingWin = list(glob("**/" + winDir + "/Target*.png", recursive=True))
    items = []
    for resultPath in imageListingWin:
        fileName = pathlib.Path(os.path.basename(resultPath)).stem
        testName = fileName.replace("Target", "")
        fileNameWin = winDir + fileName + ".png"
        fileNameLinux = linuxDir + fileName + ".png"
        fileNameDiff = diffDir + fileName.replace("Target", "Difference") + ".png"
        compareValue = b""
        if pathlib.Path(fileNameWin).exists() and pathlib.Path(fileNameLinux).exists():
            compareValue = compareImage(fileNameWin, fileNameLinux, fileNameDiff)
            compareValue = str(compareValue.decode()).split(" ")[0]
            writeToReport(comparisonReportFilename, fileName + "\n" \
                + compareValue + ";\n")
            items = appendJsonEntry(items, testName, False, str(compareValue))
    writeToVisualTestResultsJsonFile(items)

if __name__ == "__main__":
    if pathlib.Path(comparisonReportFilename).exists():
        os.remove(comparisonReportFilename)
    processImageFilesAndProduceReports("./TargetImages/")
