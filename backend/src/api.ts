import { Config } from "./configuration";
import {
  candidateImage, clearReferencePointer, differenceImage, hasReferenceImage,
  isOperatingSystem, latestTestPath, referenceImage, testDataPath, testPath,
  updateReferencePointer } from "./globals";
import { generateComparison } from "./imagecomparison";
import { addTestRecord, saveTestData, TestData, TestRecords } from "./testrecords";
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";


export function registerRoute(app: express.Application) {
  app.get("/api/image/:type/:group/:name/:os/:timestamp?", handleImage);
  // app.get("/api/references", handleReferenceImages);
  // app.get("/api/groups", handleGroups);
  // app.get("/api/operatingsystems", handleOperatingSystems);
  app.get("/api/test-records", handleTestRecords);
  app.post(
    "/api/submit-test",
    bodyParser.raw({ type: [ "image/png" ], "limit": "10mb" }),
    handleSubmitTest
  );
  app.post("/api/remove-reference", handleRemoveReference);
}

function handleImage(req: express.Request, res: express.Response) {
  const p: any = req.params;
  const type = p.type;
  const group = p.group;
  const name = p.name;
  const os = p.os;
  const timestamp = p.timestamp;

  if (type == null || group == null || name == null || os == null) {
    res.status(400).end();
    return;
  }

  const types = ["reference", "candidate", "difference"] as const;

  if (!types.includes(type)) {
    res.status(400).end();
    return;
  }

  if (!isOperatingSystem(os)) {
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

// function handleReferenceImages(req: express.Request, res: express.Response) {
//   let images = referenceImages();
// 
//   let results = [];
//   for (let image of images) {
//     results.push({
//       group: image.group,
//       name: image.name,
//       os: image.operatingSystem,
//       path: image.path
//     })
//   }
//   res.send(JSON.stringify(results)).status(200).end();
// }
// 
// function handleGroups(req: express.Request, res: express.Response) {
//   let grps = groups();
//   res.send(JSON.stringify(grps)).status(200).end();
// }
// 
// function handleOperatingSystems(req: express.Request, res: express.Response) {
//   let os = operatingSystems();
//   res.send(JSON.stringify(os)).status(200).end();
// }
// 
function handleTestRecords(req: express.Request, res: express.Response) {
  res.type("application/json");
  res.send(JSON.stringify(TestRecords)).status(200).end();
}

function handleSubmitTest(req: express.Request, res: express.Response) {
  const runner = req.header("RunnerID");
  const os = req.header("OperatingSystem");
  const group = req.header("Group");
  const name = req.header("Name");
  const timeStamp = req.header("TimeStamp");
  const commitHash = req.header("CommitHash");

  if (runner == null || group == null || name == null || os == null ||
      timeStamp == null || commitHash == null)
  {
    res.status(400).end();
    return;
  }

  const ts = new Date(timeStamp);

  // the "RunnerID" has to be one of the accepted runners
  if (!Config.runners.includes(runner)) {
    res.status(400).end();
    return;
  }

  if (!isOperatingSystem(os)) {
    res.status(400).end();
    return;
  }

  const path = testPath(group, name, os, ts);
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  // @TODO: Check size size of the image

  if (!hasReferenceImage(group, name, os)) {
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
    pixelDifference: nPixels,
    timeStamp: ts,
    commitHash: commitHash,
    referenceImage: reference
  };

  saveTestData(testData, testDataPath(group, name, os, ts));
  addTestRecord(group, name, os, testData);
  res.status(200).end();
}

function handleRemoveReference(req: express.Request, res: express.Response) {
  const adminToken = req.header("AdminToken");
  const os = req.header("OperatingSystem");
  const group = req.header("Group");
  const name = req.header("Name");

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

  clearReferencePointer(group, name, os);
}
