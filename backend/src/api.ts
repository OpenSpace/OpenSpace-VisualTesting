/*****************************************************************************************
 *                                                                                       *
 * OpenSpace Visual Testing                                                              *
 *                                                                                       *
 * Copyright (c) 2024                                                                    *
 *                                                                                       *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this  *
 * software and associated documentation files (the "Software"), to deal in the Software *
 * without restriction, including without limitation the rights to use, copy, modify,    *
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to    *
 * permit persons to whom the Software is furnished to do so, subject to the following   *
 * conditions:                                                                           *
 *                                                                                       *
 * The above copyright notice and this permission notice shall be included in all copies *
 * or substantial portions of the Software.                                              *
 *                                                                                       *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,   *
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A         *
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT    *
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF  *
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE  *
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                         *
 ****************************************************************************************/

import { printAudit } from "./audit";
import { Config, saveConfiguration } from "./configuration";
import {
  candidateImage, clearReferencePointer, differenceImage, hasReferenceImage,
  latestTestPath, referenceImage, temporaryPath, testDataPath, testPath,
  updateReferencePointer } from "./globals";
import { generateComparison } from "./imagecomparison";
import { addTestData, regenerateTestResults, saveTestData, TestData,
  TestRecords } from "./testrecords";
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";
import multer from "multer";
import { PNG } from "pngjs";

/**
 * Registers the routes for the available API calls.
 *
 * @param app The express application to which the routes should be registered
 */
export function registerRoutes(app: express.Application) {
  app.get("/api", handleApi);
  app.get("/api/image/:type/:group/:name/:hardware/:timestamp?", handleImage);
  app.get("/api/test-records", handleTestRecords);
  app.post(
    "/api/update-diff-threshold",
    bodyParser.raw({ type: [ "application/json"] }),
    handleChangeThreshold
  );
  app.post("/api/submit-test", multer().single("file"), handleSubmitTest);
  app.post("/api/run-test", multer().single("file"), handleRunTest);
  app.post(
    "/api/remove-reference",
    bodyParser.raw({ type: [ "application/json"] }),
    handleRemoveReference
  );
}

/**
 * Returns a list of all available API endpoints
 */
function handleApi(req: express.Request, res: express.Response) {
  res.status(200).json([
    { path: "/api", description: "This page describing all available API calls" },
    {
      path: "/api/image/:type/:group/:name/:hardware/:timestamp?",
      description: `
        Returns an image of the specific 'type', 'group', 'name', and 'hardware'. The
        'timestamp' parameter is optional and if it is omitted, the latest image is used.
        The type must be either 'reference', 'candidate', or 'difference'.
      `
    },
    {
      path: "/api/test-records",
      description: "Returns all of the tests results as a JSON object"
    },
    {
      path: "/api/update-diff-threshold",
      description: `
        (Requires admin) This will recalculate all of the difference images with the new
        threshold that is passed to this function. The JSON object in the body must
        contain the 'threshold' value as a number between 0 and 1 that is the new error
        threshold
      `
    },
    {
      path: "/api/submit-test",
      description: `
        (Requires runner) This will submit a new test to the image testing server. The
        body of message must contain a 'runnerID', 'hardware', 'group', 'name',
        'timestamp', and 'commitHash'. The 'runnerID' must be one of the allowed runners
        setup for this server. Furthermore, there needs to be the candidate file as a
        multipart encoded file
      `
    },
    {
      path: "/api/run-test",
      description: `
        This will run a comparison against the current reference image on the server
        without storing the results. The body of message must contain a 'hardware',
        'group', and 'name'. Furthermore, there needs to be the candidate file as a
        multipart encoded file. The API returns the difference image.
      `
    },
    {
      path: "/api/remove-reference",
      description: `
        (Requires admin) Marks the current reference image for a specific test as invalid
        and instead use the latest test as a reference instead. In addition to the
        admin token. The JSON object contained in the body must provide the 'hardware',
        'group', and 'name' for test whose reference should be invalidated
      `
    }
  ]);
}

/**
 * Returns a single requested image. The URL parameters used for this function are:
 *  - `type`: One of "reference", "candidate", or "difference"
 *  - `group`: The name of the test's group for which to return the image
 *  - `name`: The name of the test for which to return the image
 *  - `hardware`: The test's hardware for which to return the image
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
  const hardware = p.hardware;
  const timestamp = p.timestamp;

  if (!types.includes(type)) {
    res.status(400).json({ error: `Invalid type ${type} provided` });
    return;
  }

  let basePath = "";
  if (timestamp == null) {
    // If the request did not have any timestamp we are interested in the latest test
    let p = latestTestPath(group, name, hardware);
    if (p == null) {
      res.status(404).end();
      return;
    }

    basePath = p;
  }
  else {
    // If there is a timestamp, we are trying to find that specific test instead
    basePath = testPath(group, name, hardware, new Date(timestamp));

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
  res.status(200).json(TestRecords);
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
  res.status(200).end();
}

/**
 * This API call is made when a new test result is submitted. The necessary test
 * information is passed along as a JSON-encoded body, and test-related files are included
 * as multipart-encoded files.
 *
 * For the body, the required fields are:
 *   - `runnerID`: One of the allowed runners that are provided in the configuration file
 *   - `hardware`: The hardware on which the test was run
 *   - `group`: The name for the test's group for which a candidate is submitted
 *   - `name`: The name of the test for which a candidate is submitted
 *   - `timestamp`: The time stamp of the test run for which a candidate is submitted
 *   - `commitHash`: The commit hash of the code that was used to generated the candidate
 *
 * For the files, the following are needed:
 *   - file: The generated candidate file
 */
function handleSubmitTest(req: express.Request, res: express.Response) {
  const runner = req.body.runnerID;
  if (runner == null) {
    res.status(400).json({ error: "Missing field 'runnerID'" });
    return;
  }
  // the "RunnerID" has to be one of the accepted runners
  if (!Config.runners.includes(runner)) {
    res.status(401).end();
    return;
  }

  const hardware = req.body.hardware;
  if (hardware == null) {
    res.status(400).json({ error: "Missing field 'hardware'" });
    return;
  }

  const group = req.body.group;
  if (group == null) {
    res.status(400).json({ error: "Missing field 'group'" });
    return;
  }

  const name = req.body.name;
  if (name == null) {
    res.status(400).json({ error: "Missing field 'name'" });
    return;
  }

  const timeStamp = req.body.timestamp;
  if (timeStamp == null) {
    res.status(400).json({ error: "Missing field 'timeStamp'" });
    return;
  }

  const commitHash = req.body.commitHash;
  if (commitHash == null) {
    res.status(400).json({ error: "Missing field 'commitHash'" });
    return;
  }

  if (req.file == null) {
    res.status(400).json({ error: "Missing field 'file'" });
    return;
  }

  try {
    const png = PNG.sync.read(req.file.buffer);
    if (png.width != Config.size.width || png.height != Config.size.height) {
      let w = Config.size.width
      let h = Config.size.height
      res.status(400).json({ error: `Image has the wrong size. Expected (${w}, ${h})`});
      return;
    }
  }
  catch (e: any) {
    res.status(400).json({ error: `Error loading image: ${e}`});
    return;
  }


  const ts = new Date(timeStamp);

  printAudit(`Submitting result for (${group}/${name}/${hardware}/${ts.toISOString()})`);

  const path = testPath(group, name, hardware, ts);
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  if (!hasReferenceImage(group, name, hardware)) {
    printAudit("  No reference image found");
    // We are either the first, or someone has marked the previous reference as not valid
    let path = updateReferencePointer(group, name, hardware, ts);
    // Write the current candidate image as the reference image
    fs.writeFileSync(path, req.file.buffer);
  }

  const reference = referenceImage(group, name, hardware);
  const candidate = candidateImage(group, name, hardware, ts);
  const difference = differenceImage(group, name, hardware, ts);

  fs.writeFileSync(candidate, req.file.buffer);


  let nPixels = generateComparison(reference, candidate, difference);
  if (nPixels == null) {
    // The image comparison has failed, which means that the candidate image had the wrong
    // size
    res.status(400).end();
    return;
  }

  let testData: TestData = {
    pixelError: nPixels,
    timeStamp: ts,
    commitHash: commitHash,
    referenceImage: reference
  };

  saveTestData(testData, testDataPath(group, name, hardware, ts));
  addTestData(group, name, hardware, testData);
  res.status(200).end();
}

/**
 * This API call runs a single test against the current reference image and returns the
 * difference image back to the caller. The results of this comparison are _not_ stored on
 * the server. The necessary test information is passed along as a JSON-encoded body, and
 * test-related files are included as multipart-encoded files.
 *
 * For the body, the required fields are:
 *   - `hardware`: The hardware on which the test was run
 *   - `group`: The name for the test's group for which a candidate is submitted
 *   - `name`: The name of the test for which a candidate is submitted
 *
 * For the files, the following are needed:
 *   - file: The generated candidate file
 */
function handleRunTest(req: express.Request, res: express.Response) {
  const hardware = req.body.hardware;
  if (hardware == null) {
    res.status(400).json({ error: "Missing field 'hardware'" });
    return;
  }

  const group = req.body.group;
  if (group == null) {
    res.status(400).json({ error: "Missing field 'group'" });
    return;
  }

  const name = req.body.name;
  if (name == null) {
    res.status(400).json({ error: "Missing field 'name'" });
    return;
  }

  if (req.file == null) {
    res.status(400).json({ error: "Missing field 'file'" });
    return;
  }

  try {
    const png = PNG.sync.read(req.file.buffer);
    if (png.width != Config.size.width || png.height != Config.size.height) {
      let w = Config.size.width
      let h = Config.size.height
      res.status(400).json({ error: `Image has the wrong size. Expected (${w}, ${h})`});
      return;
    }
  }
  catch (e: any) {
    res.status(400).json({ error: `Error loading image: ${e}`});
    return;
  }

  if (!hasReferenceImage(group, name, hardware)) {
    res.status(400).json({ error: "Error comparing, no reference image found" });
    return;
  }

  const reference = referenceImage(group, name, hardware);
  const candidate = temporaryPath() + "/candidate.png";
  const difference = temporaryPath() + "/difference.png";

  fs.writeFileSync(candidate, req.file.buffer);

  let nPixels = generateComparison(reference, candidate, difference);
  if (nPixels == null) {
    // The image comparison has failed, which means that the candidate image had the wrong
    // size
    res.status(400).end();
    return;
  }

  res.sendFile(difference, { root: ".", headers: { Result: nPixels } });
}

/**
 * Removes the current reference for a specific test. This API call can only be performed
 * with elevated priviledges. The payload of this call must be a JSON object with the
 * following values:
 *   - `adminToken`: The admin token that was provided in the configuration file
 *   - `hardware`: The hardware on which to remove the reference image
 *   - `group`: The name of the test's group for which to remove the reference image
 *   - `name`: The name of the test for which to remove the refernce image
 */
function handleRemoveReference(req: express.Request, res: express.Response) {
  // @TODO: Use the latest reference image instead
  const adminToken = req.body.adminToken;
  const hardware = req.body.hardware;
  const group = req.body.group;
  const name = req.body.name;

  if (adminToken == null || group == null || name == null || hardware == null) {
    res.status(400).end();
    return;
  }

  if (adminToken != Config.adminToken) {
    res.status(401).end();
    return;
  }

  printAudit(`Removing reference for (${group}, ${name}, ${hardware})`);
  clearReferencePointer(group, name, hardware);
}
