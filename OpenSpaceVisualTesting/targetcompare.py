#!/usr/bin/python3

import os
import json
import pathlib
from glob import glob
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError

def writeToReport(filename, s):
    try:
        r = open(filename, 'w')
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
    with open("visualtests_results.json", 'w') as outfile:
        json.dump(items, outfile)

def processImageFilesAndProduceReports(targetDirectory):
    imageListing = list(glob("**/" + targetDirectory + "/Result*.png", recursive=True))
    items = []
    for resultPath in imageListing:
        fileName = pathlib.Path(os.path.basename(resultPath)).stem
        testName = fileName.replace("Result", "")
        targetPath = resultPath.replace("Result", "Target")
        differencePath = resultPath.replace("Result", "Difference")
        isNewTest = True
        compareValue = b""
        if pathlib.Path(targetPath).exists():
            compareValue = compareImage(targetPath, resultPath, differencePath)
            compareValue = str(compareValue.decode()).split(" ")[0]
            writeToReport("comparison.report", fileName + "\n" \
                + compareValue + ";")
            isNewTest = False
        else:
            compareValue = str(compareValue.decode())
            writeToReport("newtests.report", targetPath)
        items = appendJsonEntry(items, testName, isNewTest, str(compareValue))
    writeToVisualTestResultsJsonFile(items)

if __name__ == "__main__":
    platform = "linux"
    processImageFilesAndProduceReports("./TargetImages/" + platform)
