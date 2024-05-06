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
// @TODO: Extract commit hash from OpenSpace
// @TODO: Error percentage to the left (maybe into color status)
// @TODO: Show last images in the table overview
// @TODO: Display timing information

export function main() {
  loadConfiguration("config.json");

  // Create the folder infrastructure if it doesn't exist already
  if (!fs.existsSync(Config.data)) {
    fs.mkdirSync(Config.data, { recursive: true });
    fs.mkdirSync(`${Config.data}/tests`);
    fs.mkdirSync(`${Config.data}/reference`);
    fs.mkdirSync(`${Config.data}/temporary`);
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
