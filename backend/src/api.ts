import { Config } from "./configuration";
import { generateComparison } from "./imagecomparison";
import { groups, operatingSystems, referenceImages } from "./images";
import { TestRecords, updateTestRecord } from "./testrecord";
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";


export function registerRoute(app: express.Application) {
  app.get("/api/image/:type/:group/:name/:os", handleImage);
  app.get("/api/references", handleReferenceImages);
  app.get("/api/groups", handleGroups);
  app.get("/api/operatingsystems", handleOperatingSystems);
  app.get("/api/test-records", handleTestRecords);
  app.post(
    "/api/submit-test",
    bodyParser.raw({ type: [ "image/png" ], "limit": "10mb" }),
    handleSubmitTest
  );
  app.post(
    "/api/remove-reference",
    handleRemoveReference
  );
}

function handleImage(req: express.Request, res: express.Response) {
  const p: any = req.params;
  if (p.type == null || p.group == null || p.name == null || p.os == null) {
    res.status(400).end();
    return;
  }

  const types = ["reference", "candidate", "difference"];

  if (!types.includes(p.type)) {
    res.status(400).end();
    return;
  }

  let base = "";
  switch (p.type) {
    case "reference": base = Config.referenceImagePath; break;
    case "candidate": base = Config.candidateImagePath; break;
    case "difference": base = Config.differenceImagePath; break;
  }

  const path = `${base}/${p.os}/${p.group}/${p.name}.png`;
  if (!fs.existsSync(path)) {
    res.status(404).end();
    return;
  }

  res.sendFile(path, { root: "." });
}

function handleReferenceImages(req: express.Request, res: express.Response) {
  let images = referenceImages();

  let results = [];
  for (let image of images) {
    results.push({
      group: image.group,
      name: image.name,
      os: image.operatingSystem,
      path: image.path
    })
  }
  res.send(JSON.stringify(results)).status(200).end();
}

function handleGroups(req: express.Request, res: express.Response) {
  let grps = groups();
  res.send(JSON.stringify(grps)).status(200).end();
}

function handleOperatingSystems(req: express.Request, res: express.Response) {
  let os = operatingSystems();
  res.send(JSON.stringify(os)).status(200).end();
}

function handleTestRecords(req: express.Request, res: express.Response) {
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

  // the "RunnerID" has to be one of the accepted runners
  if (!Config.runners.includes(runner)) {
    res.status(400).end();
    return;
  }

  // the "OperatingSystem" has to be either "linux" or "windows"
  if (os != "linux" && os != "windows") {
    res.status(400).end();
    return;
  }

  const path = `${Config.candidateImagePath}/${os}/${group}`;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  // @TODO: Check size size of the image

  fs.writeFileSync(`${path}/${name}.png`, req.body);

  let nPixels = generateComparison(os, group, name);
  updateTestRecord(group, name, os, nPixels, new Date(timeStamp), commitHash);

  res.status(200).end();
}

function handleRemoveReference(req: express.Request, res: express.Response) {

}
