/*****************************************************************************************
 *                                                                                       *
 * OpenSpace Visual Testing                                                              *
 *                                                                                       *
 * Copyright (c) 2024-2025                                                               *
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
import { candidateImage, differenceImage, referenceImagePath,
  thumbnailForImage } from "./globals";
import { createThumbnail, saveComparisonImage } from "./image";
import fs from "fs";
import { globSync } from "glob";
import path from "path";
import { z } from "zod";



type TestRecord = {
  /// The group name of the test record. This value contains URL safe characters
  group: string; // @TODO Can only be filepath-valid names
  /// The name of the test record. This value contains URL safe characters
  name: string; // @TODO Can only be filepath-valid names
  /// The name of the hardware that was used to generate this record
  hardware: string;
  /// The individual test runs, grouped by the hardware string
  data: [ TestData ];
};



const TestDataSchema = z.object({
  pixelError: z.number().min(0).max(1),
  timeStamp: z.coerce.date(),
  timing: z.number().min(0),
  nErrors: z.number().int().positive(),
  commitHash: z.string().min(1),
  referenceImage: z.string().min(1),
  candidateImage: z.coerce.date(),
  differenceImage: z.coerce.date()
});


export type TestData = {
  /// Contains the pixel error in the image as a value between 0 and 1 as the ratio of
  /// changed pixels to overall pixels
  pixelError: number;

  /// The timestamp at which this test data was generated
  timeStamp: Date;

  /// The number of seconds it took to run this test
  timing: number;

  /// The number of error lines in the log file
  nErrors: number;

  /// The commit hash of the OpenSpace repository that was used to generate this image
  commitHash: string;

  /// Path to the reference image that was used for this test
  referenceImage: string;

  /// The timestamp of the test whose candidate image that was used for this test
  candidateImage: Date;

  /// The timestamp for the test whose difference image that was used for this test
  differenceImage: Date;
}



/// An in-memory data storage of test records. The array gets created at startup time by
/// parsing the 'data' folder and continuously updated as new test data comes in. This
/// array is not stored on disk, but instead recreated from files that are kept instead
export let TestRecords: TestRecord[] = [];



/**
 * Loads a test record from the provided `path`.
 *
 * @param path The path to the `.json` file that should be loaded
 * @returns The loaded TestRecord instance
 */
export function loadTestRecord(path: string): TestData {
  const data = JSON.parse(fs.readFileSync(path).toString());
  const res = TestDataSchema.safeParse(data);
  if (!res.success) {
    console.error(res.error.issues);
    process.exit();
  }

  return res.data;
}



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
 * `group`, `name`, or `hardware` did not exist before in the record, they will be created
 * inside this function. At the end of the function call, a record will exist that
 * contains at least the `data` passed into this function.
 *
 * @param group The name of the group to which the @param data belongs
 * @param name The name of the test to which the @param data belongs
 * @param hardware The hardware on which the test was run
 * @param data The test data that should be added to the list of test records
 */
export function addTestData(group: string, name: string, hardware: string, data: TestData)
{
  printAudit(`Adding new record for (${group}/${name}/${hardware})`);

  for (const record of TestRecords) {
    if (record.group != group || record.name != name || record.hardware != hardware) {
      continue;
    }

    printAudit("  Adding to data existing record");
    record.data.push(data);
    record.data.sort((a, b) => a.timeStamp.getTime() - b.timeStamp.getTime())
    return;
  }

  // If we get here, it's a new record
  printAudit("Creating new test record");
  TestRecords.push({
    group: group,
    name: name,
    hardware: hardware,
    data: [ data ]
  });
}



/**
 * Runs a check on all of the data results and ensure that they are all self consistent.
 * This includes checks for:
 *   - All reference pointers point at files that exist
 *   - All test data files' reference images exist
 */
export function verifyDataFolder() {
  printAudit("Verifying data files");

  printAudit("  Reference pointers");
  const references = globSync(`${Config.data}/reference/**/ref.txt`);
  for (const reference of references) {
    const content = fs.readFileSync(reference).toString();
    const dir = path.dirname(reference);
    const p = `${dir}/${content}`;
    assert(fs.existsSync(p), `Reference image ${content} in ${reference} does not exist`);
  }

  printAudit("  Data file references");
  const hardwares = fs.readdirSync(`${Config.data}/tests`);
  for (const hardware of hardwares) {
    const base = `${Config.data}/tests/${hardware}`;

    const groups = fs.readdirSync(base);
    for (const group of groups) {
      const names = fs.readdirSync(`${base}/${group}`);
      for (const name of names) {
        const runs = fs.readdirSync(`${base}/${group}/${name}`);
        for (const run of runs) {
          const p = `${base}/${group}/${name}/${run}`;
          assert(fs.existsSync(`${p}/data.json`), `Missing 'data.json' in ${p}`);

          const data = loadTestRecord(`${p}/data.json`);

          // Verify reference image existence
          const reference = data.referenceImage;
          const folder = referenceImagePath(group, name, hardware);
          const fullReference = `${folder}/${reference}`;
          assert(fs.existsSync(fullReference), `Missing reference file ${fullReference}`);
          assert(
            fs.existsSync(thumbnailForImage(fullReference)),
            `Missing thumbnail for reference image ${fullReference}`
          );

          // Verify candidate image existence
          const candidate = candidateImage(group, name, hardware, new Date(data.candidateImage));
          assert(fs.existsSync(candidate), `Missing candidate file ${candidate}`);
          assert(
            fs.existsSync(thumbnailForImage(candidate)),
            `Missing thumbnail for candidate image ${candidate}`
          );

          // Verify difference image existence
          const difference = differenceImage(
            group,
            name,
            hardware,
            new Date(data.differenceImage)
          );
          assert(fs.existsSync(difference), `Missing difference file ${difference}`);
          assert(
            fs.existsSync(thumbnailForImage(difference)),
            `Missing thumbnail for difference image ${difference}`
          );
        }
      }
    }
  }
}



/**
 * Loads all of the existing test results from the data folder as provided in the
 * configuration. It will iterate through all of the tests and will assert if one of the
 * test folders is malformed due to, for example, missing files.
 */
export function loadTestResults() {
  printAudit("Loading test results");

  const hardwares = fs.readdirSync(`${Config.data}/tests`);
  for (const hardware of hardwares) {
    const base = `${Config.data}/tests/${hardware}`;

    const groups = fs.readdirSync(base);
    for (const group of groups) {
      const names = fs.readdirSync(`${base}/${group}`);
      for (const name of names) {
        const runs = fs.readdirSync(`${base}/${group}/${name}`);
        for (const run of runs) {
          const p = `${base}/${group}/${name}/${run}`;
          const files = fs.readdirSync(p);
          assert(files.includes("data.json"), `No 'data.json' in ${p}`);
          assert(files.includes("log.txt"), `No 'log.txt' in ${p}`);

          const data = loadTestRecord(`${p}/data.json`);
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
export async function regenerateTestResults() {
  printAudit("Regenerating all test results");

  const hardwares = fs.readdirSync(`${Config.data}/tests`);
  for (const hardware of hardwares) {
    const base = `${Config.data}/tests/${hardware}`;

    const groups = fs.readdirSync(base);
    for (const group of groups) {
      const names = fs.readdirSync(`${base}/${group}`);
      for (const name of names) {
        const runs = fs.readdirSync(`${base}/${group}/${name}`);
        for (const run of runs) {
          const p = `${base}/${group}/${name}/${run}`;

          const data = loadTestRecord(`${p}/data.json`);
          const folder = referenceImagePath(group, name, hardware);
          const diff = await saveComparisonImage(
            `${folder}/${data.referenceImage}`,
            `${p}/candidate.png`,
            `${p}/difference.png`
          );

          // Remove the old thumbnail of the difference image
          const diffThumbnail = thumbnailForImage(`${p}/difference.png`);
          fs.unlinkSync(diffThumbnail);

          // And regenerate it
          createThumbnail(`${p}/difference.png`);

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
 * file has been rewritten.
 */
export function reloadTestResults() {
  TestRecords = [];
  loadTestResults();
}
