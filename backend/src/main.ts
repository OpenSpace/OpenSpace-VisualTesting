import { registerRoutes } from "./api";
import { initializeAudit } from "./audit";
import { Config, loadConfiguration } from "./configuration";
import { loadTestResults } from "./testrecords";
import cors from "cors";
import express from "express";
import fs from "fs";

// @TODO: Go through all images in the system and ensure they have the same size
// @TODO: Include consistency check that all of the images are represented in the
//        test results and vice versa
// @TODO: When invalidating a reference image, use the last candidate image as the new
//        reference instead
// @TODO: Submitting a test should be a zip file that can contain other files in addition
//        to the candidate image

export function main() {
  loadConfiguration("config.json");

  // Create the folder infrastructure if it doesn't exist already
  if (!fs.existsSync(Config.data)) {
    fs.mkdirSync(Config.data, { recursive: true });
    fs.mkdirSync(`${Config.data}/tests`);
    fs.mkdirSync(`${Config.data}/reference`);
  }

  initializeAudit();
  loadTestResults();

  const app = express();
  app.use(cors({ origin: "*" }));

  registerRoutes(app);
  app.use("/", express.static("public"));

  console.log(`Listening on port: ${Config.port}`);
  app.listen(Config.port);
}
