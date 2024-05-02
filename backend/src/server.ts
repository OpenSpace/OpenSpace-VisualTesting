import { registerRoute } from "./api";
import { Config, loadConfiguration } from "./configuration";
import { DoConsoleLogging } from "./globals";
import { initializeReferenceImages } from "./images";
import { loadTestRecords } from "./testrecord";
import cors from "cors";
import express from "express";
import fs from "fs";


export function main() {
  if (DoConsoleLogging)  console.log(Config);
  loadConfiguration("config.json");


  // Create the folder infrastructure if it doesn't exist already
  if (!fs.existsSync(Config.referenceImagePath)) {
    fs.mkdirSync(Config.referenceImagePath, { recursive: true });
  }
  if (!fs.existsSync(Config.candidateImagePath)) {
    fs.mkdirSync(Config.candidateImagePath, { recursive: true });
  }
  if (!fs.existsSync(Config.differenceImagePath)) {
    fs.mkdirSync(Config.differenceImagePath, { recursive: true });
  }

  // Create an empty results file if one doesn't exist yet
  if (!fs.existsSync(Config.testResultStore)) {
    fs.writeFileSync(Config.testResultStore, JSON.stringify({ results: [] }));
  }

  initializeReferenceImages(Config.referenceImagePath);
  loadTestRecords(Config.testResultStore);


  // @TODO: Go through all images in the system and ensure they have the same size
  // @TODO: Include consistency check that all of the images are represented in the
  //        test results and vice versa

  const app = express();
  app.use(cors({ origin: "*" }));

  // Backend
  registerRoute(app);
  app.use("/", express.static("public"));

  // Frontend

  console.log(`Listening on port: ${Config.port}`);
  app.listen(Config.port);
}
