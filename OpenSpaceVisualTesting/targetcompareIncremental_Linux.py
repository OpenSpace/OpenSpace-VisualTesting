#!/usr/bin/python3

import sys
import os
import json
import pathlib
import time
import datetime
from glob import glob
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError

comparisonReportFilename = "comparisonIncrementalLinux.report"

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

def appendJsonEntry(compList, testName, isNewTest, compareScore, dtStr):
    compList.append({"name":testName, "new":isNewTest, "score":compareScore, "datet":dtStr})
    return compList

def writeToVisualTestResultsJsonFile(items):
    with open("visualtests_IncrementalLinux_results.json", 'w') as outfile:
        json.dump({"items":items}, outfile)

def processImageFilesAndProduceReports(resultDir, targetDir, diffDir, testSubset):
    targetDir = targetDir + "/linux/"
    resultDir = resultDir + "/linux/"
    diffDir = diffDir + "/linux/"
    imageListingTargets = list(glob("**/" + targetDir + "/Target*.png", \
        recursive=True))
    items = []
    for resultPath in imageListingTargets:
        fileNameBase = pathlib.Path(os.path.basename(resultPath)).stem
        fileNameBase = fileNameBase.replace("Target", "")
        print(fileNameBase[0:len(testSubset)])
        if testSubset != "" and fileNameBase[0:len(testSubset)] != testSubset.replace("/", ""):
            continue
        fileNameTarget = targetDir + "Target" + fileNameBase + ".png"
        fileNameResult = resultDir + fileNameBase + ".png"
        fileNameDiff = diffDir + fileNameBase + ".png"
        compareValue = b""
        found_target = pathlib.Path(fileNameTarget).exists()
        found_result = pathlib.Path(fileNameResult).exists()
        if found_target and found_result:
            print("Comparing '" + fileNameResult + "' against prev linux target '"
                  + fileNameTarget + "'.")
            compareValue = compareImage(fileNameTarget, fileNameResult, fileNameDiff)
            compareValue = str(compareValue.decode()).split(" ")[0]
            writeToReport(comparisonReportFilename, fileNameBase + "\n" \
                + compareValue + ";\n")
            dt = os.path.getmtime(fileNameResult)
            year,month,day,hour,minute,second = time.gmtime(dt)[:-3]
            dtStr = str(year) + "-" + str(month) + "-" + str(day) + " " + \
                str(hour) + ":" + str(minute) + ":" + str(second) + " UTC"
            items = appendJsonEntry(items, fileNameBase, False, str(compareValue), dtStr)
        else:
            if not found_result:
                print("Could not find result file '" + fileNameResult + "'.")
            if not found_target:
                print("Could not find target file '" + fileNameTarget + "'.")
        print("")
    if testSubset == "":
        #Only write json results if all tests were run
        writeToVisualTestResultsJsonFile(items)

if __name__ == "__main__":
    if pathlib.Path(comparisonReportFilename).exists():
        os.remove(comparisonReportFilename)
    testSubsetString = ""
    if len(sys.argv) > 1:
        testSubsetString = sys.argv[1]
    processImageFilesAndProduceReports(\
        "./ResultImages", \
        "./TargetImages", \
        "./DifferenceImages", \
        testSubsetString
    )
