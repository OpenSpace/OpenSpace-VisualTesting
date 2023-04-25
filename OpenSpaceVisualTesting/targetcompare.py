#!/usr/bin/python3

import sys
import os
import json
import pathlib
import time
import datetime
from glob import glob
from subprocess import Popen, PIPE, STDOUT, check_output, CalledProcessError


def writeToReport(filename, s):
    try:
        r = open(filename, 'a')
        r.write(s)
    except Exception as e:
        print("Problem writing to " + filename)
    finally:
        r.close()


def compareImage(target, current, diff):
    imgMgck = f"compare -fuzz 4%% -metric rmse {target} {current} {diff}"
    p = Popen(imgMgck, shell=True, stdin=PIPE, stdout=PIPE, stderr=STDOUT, close_fds=True)
    return p.stdout.read()


def appendJsonEntry(compList, testName, isNewTest, compareScore, dtStr):
    compList.append({"name":testName, "new":isNewTest, "score":compareScore, "datet":dtStr})
    return compList


def writeToVisualTestResultsJsonFile(items, src, target):
    with open(f"visualtests_{src}-vs-{target}_results.json", 'w') as outfile:
        json.dump({"items":items}, outfile)


def processImageFilesAndProduceReports(srcPlatform, targetPlatform, testSubset):
    targetDir = f"./TargetImages/{targetPlatform}"
    resultDir = f"./ResultImages/{srcPlatform}"
    diffDir = f"./DifferenceImages/{srcPlatform}"
    imageListingTargets = list(glob("**/" + targetDir + "/Target*.png", \
        recursive=True))
    items = []
    comparisonReportFilename = f"Comparison_{srcPlatform}-vs-{targetPlatform}.report"
    if testSubset.endswith(".ostest"):
        testSubset = testSubset[:-(len(".ostest"))]
    if pathlib.Path(comparisonReportFilename).exists():
        os.remove(comparisonReportFilename)
    for resultPath in imageListingTargets:
        fileNameBase = pathlib.Path(os.path.basename(resultPath)).stem
        fileNameBase = fileNameBase.replace("Target", "")
        #print(fileNameBase[0:len(testSubset)])
        if testSubset != "":
            if fileNameBase[0:len(testSubset)] != testSubset.replace("/", ""):
                continue
        fileNameTarget = f"{targetDir}/Target{fileNameBase}.png"
        fileNameResult = f"{resultDir}/{fileNameBase}.png"
        fileNameDiff = f"{diffDir}/{fileNameBase}.png"
        compareValue = b""
        found_target = pathlib.Path(fileNameTarget).exists()
        found_result = pathlib.Path(fileNameResult).exists()
        if found_target and found_result:
            print(f"Comparing source '{fileNameResult}' against target "\
                  f"'{fileNameTarget}'.")
            compareValue = compareImage(fileNameTarget, fileNameResult, fileNameDiff)
            compareValue = str(compareValue.decode()).split(" ")[0]
            writeToReport(comparisonReportFilename,
                          f"{fileNameBase}\n{compareValue};\n")
            dt = os.path.getmtime(fileNameResult)
            year,month,day,hour,minute,second = time.gmtime(dt)[:-3]
            dtStr = str(year) + "-" + str(month) + "-" + str(day) + " " + \
                str(hour) + ":" + str(minute) + ":" + str(second) + " UTC"
            items = appendJsonEntry(items, fileNameBase, False, str(compareValue), dtStr)
        else:
            if not found_result:
                print(f"Could not find result file '{fileNameResult}'.")
            if not found_target:
                print(f"Could not find target file '{fileNameTarget}'.")
        print("")
    if testSubset == "":
        #Only write json results if all tests were run
        writeToVisualTestResultsJsonFile(items, srcPlatform, targetPlatform)


def runComparison(testSubsetString, srcPlatform, targetPlatform):
    processImageFilesAndProduceReports(srcPlatform, targetPlatform, testSubsetString)


if __name__ == "__main__":
    if len(sys.argv) > 3:
        runComparison(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Need 3 arguments: $1=testSubset name, $2=source_platform, "\
              "$3=target_platform", file=sys.stderr)
        quit(-1)
