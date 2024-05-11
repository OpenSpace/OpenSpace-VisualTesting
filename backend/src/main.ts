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
import { loadTestResults, verifyDataFolder } from "./testrecords";
import cors from "cors";
import express from "express";
import fs from "fs";



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
  verifyDataFolder();
  loadTestResults();

  const app = express();
  app.use(cors({ origin: "*" }));

  registerRoutes(app);
  app.use("/", express.static("public"));

  console.log(`Listening on port: ${Config.port}`);
  app.listen(Config.port);
}
