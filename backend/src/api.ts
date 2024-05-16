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
  candidateImage, clearReferencePointer, dateToPath, differenceImage, hasReferenceImage,
  latestTestDataPath, latestTestPath, logFile, referenceImage, referenceImagePath,
  temporaryPath, testDataPath, testPath, thumbnailForImage,
  updateReferencePointer } from "./globals";
import { createThumbnail, generateComparisonImage, saveComparisonImage } from "./image";
import { addTestData, regenerateTestResults, reloadTestResults, saveTestData, TestData,
  TestRecords } from "./testrecords";
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { PNG } from "pngjs";



/**
 * Registers the routes for the available API calls.
 *
 * @param app The express application to which the routes should be registered
 */
export function registerRoutes(app: express.Application) {
  app.get("/api", handleApi);
  app.get("/api/result/:type/:group/:name/:hardware/:timestamp?", handleResult);
  app.get("/api/compare/:type/:group/:name/:hardware1/:hardware2", handleCompare);
  app.get("/api/test-records", handleTestRecords);
  app.get("/api/diff-threshold", handleThreshold);
  app.post(
    "/api/update-diff-threshold",
    bodyParser.raw({ type: [ "application/json"] }),
    handleChangeThreshold
  );
  app.post(
    "/api/submit-test",
    multer().fields([
      { name: "file", maxCount: 1 },
      { name: "log", maxCount: 1 }
    ]),
    handleSubmitTest
  );
  app.post("/api/run-test", multer().single("file"), handleRunTest);
  app.post(
    "/api/update-reference",
    bodyParser.raw({ type: [ "application/json"] }),
    handleUpdateReference
  );
}



/**
 * Returns a list of all available API endpoints
 */
function handleApi(req: express.Request, res: express.Response) {
  res.status(200).json([
    { path: "/api", description: "This page describing all available API calls" },
    {
      path: "/api/result/:type/:group/:name/:hardware/:timestamp?",
      description: `Returns the result for a specific 'type', 'group', 'name', and
        'hardware'. The 'timestamp' parameter is optional and if it is omitted, the latest
        image is used. The type must be either 'reference', 'candidate', 'difference',
        "reference-thumbnail", "candidate-thumbnail", "difference-thumbnail", or "log".
        For all but the last option, the result will be an image file, for the "log"
        option, the result will be a text file.`
    },
    {
      path: "/api/compare/:type/:group/:name/:hardware1/:hardware2",
      description: `Generates a new comparison image that takes either the reference
        images or the candidate images for two hardware setups for the same test and runs
        a comparison image on those. These images will generally not be cached and thus
        this API call will take some time to finish. The 'type' must be either
        "reference" or "candidate".`
    },
    {
      path: "/api/test-records",
      description: "Returns all of the tests results as a JSON object"
    },
    {
      path: "/api/diff-threshold",
      description: "Returns the current difference threshold used for image comparisons"
    },
    {
      path: "/api/update-diff-threshold",
      description: `(Requires admin) This will recalculate all of the difference images
        with the new threshold that is passed to this function. The JSON object in the
        body must contain the 'threshold' value as a number between 0 and 1 that is the
        new error threshold`
    },
    {
      path: "/api/submit-test",
      description: `(Requires runner) This will submit a new test to the image testing
        server. The body of message must contain a 'runnerID', 'hardware', 'group',
        'name', 'timestamp', 'timing', and 'commitHash'. The 'runnerID' must be one of the
        allowed runners setup for this server. Furthermore, there needs to be the
        candidate file as a multipart encoded file`
    },
    {
      path: "/api/run-test",
      description: `This will run a comparison against the current reference image on the
        server without storing the results. The body of message must contain a 'hardware',
        'group', and 'name'. Furthermore, there needs to be the candidate file as a
        multipart encoded file. The API returns the difference image.`
    },
    {
      path: "/api/update-reference",
      description: `(Requires admin) Marks the current reference image for a specific test
        as invalid and instead use the latest test as a reference instead. In addition to
        the admin token, the JSON object contained in the body must provide the
        'hardware', 'group', and 'name' for test whose reference should be invalidated.`
    }
  ]);
}



/**
 * Returns a single requested result. The URL parameters used for this function are:
 *  - `type`: One of "reference", "candidate", "difference", "reference-thumbnail",
 *            "candidate-thumbnail", "difference-thumbnail", or "log"
 *  - `group`: The name of the test's group for which to return the image
 *  - `name`: The name of the test for which to return the image
 *  - `hardware`: The test's hardware for which to return the image
 *  - `timestamp`: The timestamp of the test for which to return the image. This is an
 *                 optional parameter. If it is left out, the latest result for the
 *                 specified type will be returned
 */
async function handleResult(req: express.Request, res: express.Response) {
  const types = [
    "reference", "candidate", "difference", "reference-thumbnail", "candidate-thumbnail",
    "difference-thumbnail", "log"
  ] as const;

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
  let isThumbnail = false;
  switch (type) {
    case "reference-thumbnail":
      isThumbnail = true;
    case "reference":
      let data = JSON.parse(fs.readFileSync(`${basePath}/data.json`).toString());
      let folder = referenceImagePath(group, name, hardware);
      path = `${folder}/${data.referenceImage}`;
      break;
    case "candidate-thumbnail":
      isThumbnail = true;
    case "candidate":
      path = `${basePath}/candidate.png`;
      break;
    case "difference-thumbnail":
      isThumbnail = true;
    case "difference":
      path = `${basePath}/difference.png`;
      break;
    case "log":
      path = logFile(group, name, hardware, new Date(timestamp));
      break;
  }

  if (isThumbnail) {
    let thumbnailPath = thumbnailForImage(path);
    if (!fs.existsSync(thumbnailPath)) {
      res.status(500).end();
      return;
    }

    res.sendFile(thumbnailPath, { root: "." });
  }
  else {
    if (!fs.existsSync(path)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path, { root: "." });
  }
}



/**
 * Generates a new comparison image that takes either the reference images or the
 * candidate images for two hardware setups for the same test and runs a comparison image
 * on those. These images will generally not be cached and thus this API call will take
 * some time to finish. The URL parameters used for this function are:
 *  - `type`: Must be either "reference" or "candidate"
 *  - `group`: The name of the test's group for which to return the comparison
 *  - `name`: The name of the test for which to return the comparison
 *  - `hardware1`: The first hardware for which to return the comparison.
 *  - `hardware2`: The second hardware for which to return the comparison
 */
async function handleCompare(req: express.Request, res: express.Response) {
  const p: any = req.params;
  const type = p.type;
  const group = p.group;
  const name = p.name;
  const hardware1 = p.hardware1;
  const hardware2 = p.hardware2;

  if (![ "reference", "candidate" ].includes(type)) {
    res.status(400).json({ error: `Invalid type ${type} provided` });
    return;
  }

  let img1;
  let img2;
  if (type == "reference") {
    img1 = referenceImage(group, name, hardware1);
    img2 = referenceImage(group, name, hardware2);
  }
  else {
    img1 = candidateImage(group, name, hardware1);
    img2 = candidateImage(group, name, hardware2);
  }

  if (!fs.existsSync(img1) || !fs.existsSync(img2)) {
    res.status(400).json({ error: `Unknown image ${img1} or ${img2}`});
    return;
  }


  printAudit(
    `Generating temporary comparison for ${group}/${name}   ${hardware1} <-> ${hardware2}`
  );
  let r = await generateComparisonImage(img1, img2);
  if (r == null) {
    res.status(500).end();
    return;
  }
  let [img, nPixels] = r;
  let diff = `${temporaryPath()}/compare/${group}-${name}-${hardware1}-${hardware2}.png`;
  fs.writeFileSync(diff, PNG.sync.write(img));
  res.sendFile(diff, { root: ".", headers: { Result: nPixels } });
}



/**
 * Returns a full list of the test records to the API caller. This API call has no further
 * parameters.
 */
function handleTestRecords(req: express.Request, res: express.Response) {
  res.status(200).json(TestRecords);
}



/**
 * Returns the current threshold value used for image comparisons
 */
function handleThreshold(req: express.Request, res: express.Response) {
  res.status(200).json({ value: Config.comparisonThreshold });
}



/**
 * This API call updates the threshold value used to determine which pixels of a candidate
 * image have changed. Setting this value will cause all difference images and test
 * results to be recalculated immediately. The changed threshold value is then also used
 * for all upcoming tests. This API call requires elevated priviledges. The payload of
 * this call must be a JSON object with the following values:
 *   - `adminToken`: The admin token that was provided in the configuration file
 */
async function handleChangeThreshold(req: express.Request, res: express.Response) {
  let body = JSON.parse(req.body);

  if (body.adminToken != Config.adminToken) {
    res.status(401).end();
    return;
  }

  const threshold = body.threshold;
  if (threshold == null || typeof threshold !== "number") {
    res.status(400).json({ error: "Threshold must be provided and be a number" });
    return;
  }

  printAudit(`Changing image comparison threshold to: ${threshold}`);

  Config.comparisonThreshold = threshold;
  saveConfiguration();
  await regenerateTestResults();
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
 *   - `timing`: The number of seconds that it took to run the test
 *   - `commitHash`: The commit hash of the code that was used to generated the candidate
 *
 * For the files, the following are needed:
 *   - file: The generated candidate file
 */
async function handleSubmitTest(req: express.Request, res: express.Response) {
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

  const timing = req.body.timing;
  if (timing == null) {
    res.status(400).json({ error: "Missing field 'timing'" });
    return;
  }

  const commitHash = req.body.commitHash;
  if (commitHash == null) {
    res.status(400).json({ error: "Missing field 'commitHash'" });
    return;
  }

  if (req.files == null) {
    res.status(400).json({ error: "Missing files" });
    return;
  }

  let files: any = req.files!;
  if (files.file == null || files.file.length == 0) {
    res.status(400).json({ error: "Missing field 'file'" });
    return;
  }
  let file = files.file[0];

  if (files.log == null || files.log.length == 0) {
    res.status(400).json({ error: "Missing field 'log'" });
    return;
  }
  let log = files.log[0];



  try {
    const png = PNG.sync.read(file.buffer);
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

  const p = testPath(group, name, hardware, ts);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }

  let logPath = logFile(group, name, hardware, ts);
  let logContent = log.buffer.toString();
  function removeEmptyLines(str: string) {
    return str.split("\n").filter(line => line.trim() !== "").join("\n");
  }
  logContent = removeEmptyLines(logContent);
  let nLogLines = logContent.split("\n").length;
  fs.writeFileSync(logPath, logContent);


  if (!hasReferenceImage(group, name, hardware)) {
    printAudit("  No reference image found");
    // We are either the first, or someone has marked the previous reference as not valid
    let p = updateReferencePointer(group, name, hardware, ts);
    // Write the current candidate image as the reference image
    fs.writeFileSync(p, file.buffer);
    createThumbnail(p);
  }

  const reference = referenceImage(group, name, hardware);
  const candidate = candidateImage(group, name, hardware, ts);
  const difference = differenceImage(group, name, hardware, ts);

  fs.writeFileSync(candidate, file.buffer);
  createThumbnail(candidate);

  let nPixels = await saveComparisonImage(reference, candidate, difference);
  if (nPixels == null) {
    // The image comparison has failed, which means that the candidate image had the wrong
    // size
    res.status(400).end();
    return;
  }

  let testData: TestData = {
    pixelError: nPixels,
    timeStamp: ts,
    timing: Number(timing),
    nErrors: nLogLines,
    commitHash: commitHash,
    referenceImage: path.basename(reference)
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

  let nPixels = saveComparisonImage(reference, candidate, difference);
  if (nPixels == null) {
    // The image comparison has failed, which means that the candidate image had the wrong
    // size
    res.status(400).end();
    return;
  }

  res.sendFile(difference, { root: ".", headers: { Result: nPixels } });
}



/**
 * Updates the current reference for a specific test. The latest candidate image will be
 * upgraded to a reference image and the latest test will be updated to reflect this. This
 * API call can only be performed with elevated priviledges. The payload of this call must
 * be a JSON object with the following values:
 *   - `adminToken`: The admin token that was provided in the configuration file
 *   - `hardware`: The hardware on which to remove the reference image
 *   - `group`: The name of the test's group for which to remove the reference image
 *   - `name`: The name of the test for which to remove the refernce image
 */
async function handleUpdateReference(req: express.Request, res: express.Response) {
  let body = JSON.parse(req.body);
  const adminToken = body.adminToken;
  if (adminToken == null || adminToken != Config.adminToken) {
    res.status(401).end();
    return;
  }

  const hardware = body.hardware;
  if (hardware == null) {
    res.status(400).json({ error: "Missing key 'hardware'" });
    return;
  }

  const group = body.group;
  if (group == null) {
    res.status(400).json({ error: "Missing key 'group'" });
    return;
  }

  const name = body.name;
  if (name == null) {
    res.status(400).json({ error: "Missing key 'name'" });
    return;
  }

  // If we remove the reference, we want to take the latest candidate image available for
  // the test instead. We'll copy it over to the reference folder and then rewrite the
  // reference pointer to point at the most recent image instead
  let testPath = latestTestPath(group, name, hardware);
  if (testPath == null) {
    // There was no test for this, so why are we trying to update the reference?
    res.status(400).json({ error: `No test found for (${group}, ${name}, ${hardware})`});
    return;
  }

  printAudit(`Updating reference for (${group}, ${name}, ${hardware})`);

  let dataPath = latestTestDataPath(group, name, hardware);
  let data: TestData = JSON.parse(fs.readFileSync(dataPath).toString());

  // Get the new file name for the reference image. First get the old reference image,
  // extract the folder name from it, and create a new file name based on the timestamp
  let currentReference = referenceImage(group, name, hardware);
  let time = dateToPath(new Date(data.timeStamp));
  let newReference = `${path.dirname(currentReference)}/${time}.png`;

  // Make the last candidate image the new reference image by copying it over
  let candidate = candidateImage(group, name, hardware, new Date(data.timeStamp));
  fs.copyFileSync(candidate, newReference)
  createThumbnail(newReference);

  // And updating the reference pointer
  clearReferencePointer(group, name, hardware);
  updateReferencePointer(group, name, hardware, new Date(data.timeStamp));

  // Then we need to rerun the comparison image for the candidate image as it is now
  // out of date
  let difference = differenceImage(group, name, hardware, new Date(data.timeStamp));
  let diff = await saveComparisonImage(newReference, candidate, difference);

  // The diff cannot be `null` as `newReference` and `candidate` are the same image
  data.pixelError = diff!;
  data.referenceImage = path.basename(newReference);
  saveTestData(data, testDataPath(group, name, hardware, new Date(data.timeStamp)));
  reloadTestResults();
}
