import { printAudit } from "./audit";
import { Config, saveConfiguration } from "./configuration";
import {
  candidateImage, clearReferencePointer, differenceImage, hasReferenceImage,
  isOperatingSystem, latestTestPath, referenceImage, testDataPath, testPath,
  updateReferencePointer } from "./globals";
import { generateComparison } from "./imagecomparison";
import { addTestData, regenerateTestResults, saveTestData, TestData,
  TestRecords } from "./testrecords";
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";

/**
 * Registers the routes for the available API calls.
 *
 * @param app The express application to which the routes should be registered
 */
export function registerRoutes(app: express.Application) {
  app.get("/api/image/:type/:group/:name/:os/:timestamp?", handleImage);
  // app.get("/api/references", handleReferenceImages);
  // app.get("/api/groups", handleGroups);
  // app.get("/api/operatingsystems", handleOperatingSystems);
  app.get("/api/test-records", handleTestRecords);
  app.post(
    "/api/update-diff-threshold",
    bodyParser.raw({ type: [ "application/json"] }),
    handleChangeThreshold
  );
  app.post(
    "/api/submit-test",
    bodyParser.raw({ type: [ "image/png" ], "limit": "10mb" }),
    handleSubmitTest
  );
  app.post("/api/remove-reference", handleRemoveReference);
}

/**
 * Returns a single requested image. The URL parameters used for this function are:
 *  - `type`: One of "reference", "candidate", or "difference"
 *  - `group`: The name of the test's group for which to return the image
 *  - `name`: The name of the test for which to return the image
 *  - `os`: The name of the test's operating system for which to return the image
 *  - `timestamp`: The timestamp of the test for which to return the image. This is an
 *                 optional parameter. If it is left out, the latest result for the
 *                 specified type will be returned
 */
function handleImage(req: express.Request, res: express.Response) {
  const types = ["reference", "candidate", "difference"] as const;

  const p: any = req.params;
  const type = p.type;
  const group = p.group;
  const name = p.name;
  const os = p.os;
  const timestamp = p.timestamp;

  if (type == null || group == null || name == null || os == null ||
      !types.includes(type) || !isOperatingSystem(os))
  {
    res.status(400).end();
    return;
  }

  let basePath = "";
  if (timestamp == null) {
    // If the request did not have any timestamp we are interested in the latest test
    let p = latestTestPath(group, name, os);
    if (p == null) {
      res.status(404).end();
      return;
    }

    basePath = p;
  }
  else {
    // If there is a timestamp, we are trying to find that specific test instead
    basePath = testPath(group, name, os, new Date(timestamp));

    if (!fs.existsSync(basePath)) {
      res.status(404).end();
      return;
    }
  }

  let path = "";
  switch (type) {
    case "reference":
      let data = JSON.parse(fs.readFileSync(`${basePath}/data.json`).toString());
      path = data.referenceImage;
      break;
    case "candidate":
      path = `${basePath}/candidate.png`;
      break;
    case "difference":
      path = `${basePath}/difference.png`;
      break;
  }

  if (!fs.existsSync(path)) {
    res.status(404).end();
    return;
  }

  res.sendFile(path, { root: "." });
}

/**
 * Returns a full list of the test records to the API caller. This API call has no further
 * parameters.
 */
function handleTestRecords(req: express.Request, res: express.Response) {
  res.type("application/json");
  res.send(JSON.stringify(TestRecords)).status(200).end();
}

/**
 * This API call is made when a new test result is submitted. Necessary additional
 * information about the test must be provided in the post request header. The required
 * fields are:
 *   - `RunnerID`: One of the allowed runners that are provided in the configuration file
 *   - `OperatingSystem`: The name of the operating system on which the test was run
 *   - `Group`: The name for the test's group for which a candidate is submitted
 *   - `Name`: The name of the test for which a candidate is submitted
 *   - `TimeStamp`: The time stamp of the test run for which a candidate is submitted
 *   - `CommitHash`: The commit hash of the code that was used to generated the candidate
 */
function handleSubmitTest(req: express.Request, res: express.Response) {
  const runner = req.header("RunnerID");
  const os = req.header("OperatingSystem");
  const group = req.header("Group");
  const name = req.header("Name");
  const timeStamp = req.header("TimeStamp");
  const commitHash = req.header("CommitHash");

  // the "RunnerID" has to be one of the accepted runners
  if (runner == null || group == null || name == null || os == null ||
      timeStamp == null || commitHash == null || !Config.runners.includes(runner) ||
      !isOperatingSystem(os))
  {
    res.status(400).end();
    return;
  }

  const ts = new Date(timeStamp);

  printAudit(`Submitting new result for (${group}/${name}/${os}/${ts.toISOString()}`);

  const path = testPath(group, name, os, ts);
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  // @TODO: Check size size of the image

  if (!hasReferenceImage(group, name, os)) {
    printAudit("  No reference image found");
    // We are either the first, or someone has marked the previous reference as not valid
    let path = updateReferencePointer(group, name, os, ts);
    // Write the current candidate image as the reference image
    fs.writeFileSync(path, req.body);
  }

  const reference = referenceImage(group, name, os);
  const candidate = candidateImage(group, name, os, ts);
  const difference = differenceImage(group, name, os, ts);

  fs.writeFileSync(candidate, req.body);
  let nPixels = generateComparison(reference, candidate, difference);
  let testData: TestData = {
    pixelError: nPixels,
    timeStamp: ts,
    commitHash: commitHash,
    referenceImage: reference
  };

  saveTestData(testData, testDataPath(group, name, os, ts));
  addTestData(group, name, os, testData);
  res.status(200).end();
}

/**
 * Removes the current reference for a specific test. This API call can only be performed
 * with elevated priviledges. The payload of this call must be a JSON object with the
 * following values:
 *   - `adminToken`: The admin token that was provided in the configuration file
 *   - `os`: The operating system for which to remove the reference image
 *   - `group`: The name of the test's group for which to remove the reference image
 *   - `name`: The name of the test for which to remove the refernce image
 */
function handleRemoveReference(req: express.Request, res: express.Response) {
  let body = JSON.parse(req.body);
  const adminToken = body.adminToken;
  const os = body.os;
  const group = body.group;
  const name = body.name;

  if (adminToken == null || group == null || name == null || os == null) {
    res.status(400).end();
    return;
  }

  if (adminToken != Config.adminToken) {
    res.status(401).end();
    return;
  }

  if (!isOperatingSystem(os)) {
    res.status(400).end();
    return;
  }

  printAudit(`Removing reference for (${group}, ${name}, ${os})`);
  clearReferencePointer(group, name, os);
}

/**
 * This API call updates the threshold value used to determine which pixels of a candidate
 * image have changed. Setting this value will cause all difference images and test
 * results to be recalculated immediately. The changed threshold value is then also used
 * for all upcoming tests. This API call requires elevated priviledges. The payload of
 * this call must be a JSON object with the following values:
 *   - `adminToken`: The admin token that was provided in the configuration file
 */
function handleChangeThreshold(req: express.Request, res: express.Response) {
  let body = JSON.parse(req.body);

  if (body.adminToken != Config.adminToken) {
    res.status(401).end();
    return;
  }

  const threshold = body.threshold;
  if (threshold == null || typeof threshold !== "number") {
    res.status(400).end();
    return;
  }

  printAudit(`Changing image comparison threshold to: ${threshold}`);

  Config.comparisonThreshold = threshold;
  saveConfiguration();
  regenerateTestResults();
}
