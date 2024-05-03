import { registerRoutes } from "./api";
import { initializeAudit, printAudit } from "./audit";
import { Config, loadConfiguration } from "./configuration";
import { OperatingSystemList } from "./globals";
import { loadTestResults } from "./testrecords";
import cors from "cors";
import express from "express";
import fs from "fs";


// @TODO: Replace "OperatingSystem" with "Hardware" string. Only allow predefined hardware
//        strings
// @TODO: In the case of an error, send a Slack message (replacing asserts)
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

    for (let os of OperatingSystemList) {
      const testsPath = `${Config.data}/tests/${os}`;
      if (!fs.existsSync(testsPath)) {
        fs.mkdirSync(testsPath, { recursive: true });
      }

      const referencePath = `${Config.data}/reference/${os}`;
      if (!fs.existsSync(referencePath)) {
        fs.mkdirSync(referencePath, { recursive: true });
      }
    }
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
