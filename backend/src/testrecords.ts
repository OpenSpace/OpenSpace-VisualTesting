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

import { assert } from "./assert";
import { printAudit } from "./audit";
import { Config } from "./configuration";
import { referenceImagePath } from "./globals";
import { generateComparison } from "./imagecomparison";
import fs from "fs";
import { globSync } from "glob";
import path from "path";
import { PNG } from "pngjs";


type TestRecord = {
  /// The group name of the test record. This value contains URL safe characters
  group: string; // @TODO Can only be filepath-valid names
  /// The name of the test record. This value contains URL safe characters
  name: string; // @TODO Can only be filepath-valid names
  /// The individual test runs, grouped by the hardware string
  data: {
    [hardware: string]: [ TestData ]
  }
};

export type TestData = {
  /// Contains the pixel error in the image as a value between 0 and 1 as the ratio of
  /// changed pixels to overall pixels
  pixelError: number;

  /// The timestamp at which this test data was generated
  timeStamp: Date;

  /// The number of seconds it took to run this test
  timing: number;

  /// The commit hash of the OpenSpace repository that was used to generate this image
  commitHash: string;

  /// Path to the reference image that was used for this test
  referenceImage: string;
}

/// An in-memory data storage of test records. The array gets created at startup time by
/// parsing the 'data' folder and continuously updated as new test data comes in. This
/// array is not stored on disk, but instead recreated from files that are kept instead
export let TestRecords: TestRecord[] = [];

/**
 * Saves a specific test data to the provided path. It will overwrite the file that is
 * already present in that location
 *
 * @param data The TestData object that should be serialized
 * @param path The path to which the data is serialized
 */
export function saveTestData(data: TestData, path: string) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

/**
 * Add a new test data to the internal list of records that are being kept. If the
 * @param group, @param name, or @param hardware did not exist before in the record, they
 * will be created inside this function. At the end of the function call, a record will
 * exist that contains at least the @param data passed into this function.
 *
 * @param group The name of the group to which the @param data belongs
 * @param name The name of the test to which the @param data belongs
 * @param hardware The hardware on which the test was run
 * @param data The test data that should be added to the list of test records
 */
export function addTestData(group: string, name: string, hardware: string, data: TestData)
{
  printAudit(`Adding new record for (${group}/${name}/${hardware})`);

  for (let record of TestRecords) {
    if (record.group != group || record.name != name)  continue;

    if (hardware in record.data) {
      printAudit("  Adding to data existing record");
      // @TODO: Not sure why the '?' is necessary here. We are checking in the 'if'
      //        statement before that `os` exists in `record.data`
      record.data[hardware]?.push(data);
      record.data[hardware]?.sort((a, b) => a.timeStamp.getTime() - b.timeStamp.getTime())
    }
    else {
      printAudit("  Creating new record list");
      record.data[hardware] = [ data ];
    }
    return;
  }

  // if we get here, it's a new record
  printAudit("Creating new test record");
  TestRecords.push({
    group: group,
    name: name,
    data: {
      [hardware]: [ data ]
    }
  });
}

/**
 * Runs a check on all of the data results and ensure that they are all self consistent.
 * This includes checks for:
 *   - All reference, candidate, or difference images have the expected size
 *   - All reference pointers point at files that exist
 *   - All test data files' reference images exist
 */
export function verifyDataFolder() {
  printAudit("Verifying data files");

  printAudit("  Image size");
  let images = globSync(`${Config.data}/**/*.png`);
  for (let image of images) {
    const img = PNG.sync.read(fs.readFileSync(image));
    if (img.width != Config.size.width || img.height != Config.size.height) {
      throw `Image ${image} has wrong size (${img.width}, ${img.height}})`;
    }
  }

  printAudit("  Reference pointers");
  let references = globSync(`${Config.data}/reference/**/ref.txt`);
  for (let reference of references) {
    let content = fs.readFileSync(reference).toString();
    let dir = path.dirname(reference);
    let p = `${dir}/${content}`;
    if (!fs.existsSync(p)) {
      throw `Reference image ${content} in ${reference} does not exist`
    }
  }

  printAudit("  Data file references");
  let dataFiles = globSync(`${Config.data}/tests/**/data.json`);
  for (let dataFile of dataFiles) {
    let data: TestData = JSON.parse(fs.readFileSync(dataFile).toString());
    console.log(data);
  }

}

/**
 * Loads all of the existing test results from the data folder as provided in the
 * configuration. It will iterate through all of the tests and will assert if one of the
 * test folders is malformed due to, for example, missing files.
 */
export function loadTestResults() {
  printAudit("Loading test results");

  let hardwares = fs.readdirSync(`${Config.data}/tests`);
  for (let hardware of hardwares) {
    const base = `${Config.data}/tests/${hardware}`;

    let groups = fs.readdirSync(base);
    for (let group of groups) {
      let names = fs.readdirSync(`${base}/${group}`);
      for (let name of names) {
        let runs = fs.readdirSync(`${base}/${group}/${name}`);
        for (let run of runs) {
          const p = `${base}/${group}/${name}/${run}`;
          const files = fs.readdirSync(p);
          assert(files.length == 3, `Wrong number of files in ${p}`);
          assert(files.includes("candidate.png"), `'candidate.png' in ${p}`);
          assert(files.includes("difference.png"), `'difference.png' in ${p}`);
          assert(files.includes("data.json"), `'data.json' in ${p}`);

          let data: TestData = JSON.parse(fs.readFileSync(`${p}/data.json`).toString());
          data.timeStamp = new Date(data.timeStamp);
          addTestData(group, name, hardware, data);
        }
      }
    }
  }
}

/**
 * This function will regenerate all of the difference images that are locally stored and
 * update the pixel error values in all tests. In general this should only be necessary if
 * the version of the image diff tool has been updated or if the global image threshold
 * limit has changed.
 */
export function regenerateTestResults() {
  printAudit("Regenerating all test results");

  let hardwares = fs.readdirSync(`${Config.data}/tests`);
  for (let hardware of hardwares) {
    const base = `${Config.data}/tests/${hardware}`;

    let groups = fs.readdirSync(base);
    for (let group of groups) {
      let names = fs.readdirSync(`${base}/${group}`);
      for (let name of names) {
        let runs = fs.readdirSync(`${base}/${group}/${name}`);
        for (let run of runs) {
          const p = `${base}/${group}/${name}/${run}`;

          let data: TestData = JSON.parse(fs.readFileSync(`${p}/data.json`).toString());
          let folder = referenceImagePath(group, name, hardware);
          let diff = generateComparison(
            `${folder}/${data.referenceImage}`,
            `${p}/candidate.png`,
            `${p}/difference.png`
          );
          data.pixelError = diff!;
          saveTestData(data, `${p}/data.json`);
        }
      }
    }
  }

  // Reset the local records and load a fresh version from disk
  reloadTestResults();
}

/**
 * Reloads all of the test results from disk. This should be called whenever any testdata
 * file has been rewritten
 */
export function reloadTestResults() {
  TestRecords = [];
  loadTestResults();
}
