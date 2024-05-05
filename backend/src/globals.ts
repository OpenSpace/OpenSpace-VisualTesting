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
import { Config } from "./configuration";
import fs from "fs";
import path from "path";


/**
 * Converts the provided @param date to a version in which it can be used as part of a
 * path in the filesystem or as part of a URL
 *
 * @param date The Date object that should be converted
 * @returns A string that is safe to be used as a filesystem path or a URL
 */
function toPath(date: Date): string {
  return date.toISOString().split("-").join("").split(":").join("").split(".").join("");
}

/**
 * Returns the base path to where the files for the latest test for the @param group,
 * @param name, and @param hardware are stored. If no test exists for that test, `null` is
 * returned.
 *
 * @param group The name of the group for which the latest test should be returned
 * @param name The name of the test for which the latest run should be returned
 * @param hardware The hardware for which the latest test should be returned
 * @returns The path where the test files for the latest test are stored
 */
export function latestTestPath(group: string, name: string,
                               hardware: string): string | null
{
  const path = `${Config.data}/tests/${hardware}/${group}/${name}`;
  if (!fs.existsSync(path)) {
    return null;
  }

  let tests = fs.readdirSync(path);
  if (tests.length == 0) {
    return null;
  }

  tests.sort();

  return `${path}/${tests[tests.length - 1]}`;
}

/**
 * Returns the path to where the files for the test identified by the @param group,
 * @param name, @param hardware, and @param timestamp are located. Note that the returned
 * folder might not exist, if such a test is not available.
 *
 * @param group The name of the group for which the path should be returned
 * @param name The name of the test for which the path should be returned
 * @param hardware The hardware for which the path should be returned
 * @param timestamp The time stamp for which the path should be returned
 * @returns The path to the test files for the provided parameters
 */
export function testPath(group: string, name: string, hardware: string,
                         timestamp: Date): string
{
  return `${Config.data}/tests/${hardware}/${group}/${name}/${toPath(timestamp)}`
}

/**
 * Returns the path to the file that contains the name of the file that is considered the
 * most current reference image. If this file does not exist, then there is no current
 * reference image and the next candidiate image will be upgraded to be the new reference
 * image.
 *
 * @param group The name of the group for which to return the file containing the file
 *              name that is the currently active reference image
 * @param name The name of the test for which to return the file containing the file name
 *             that is the currently active reference image
 * @param hardware The hardware for which to return the file containing the file name
 *           that is the currently active reference image
 * @returns The path to the file that contains the name of the current reference file for
 *          the test
 */
function referencePointer(group: string, name: string, hardware: string): string {
  return `${Config.data}/reference/${hardware}/${group}/${name}/ref.txt`;
}

/**
 * Invalidates the current reference image for the test identified by the @param group,
 * @param name, and @param hardware.
 *
 * @param group The name of the group for which the current reference should be
 *              invalidated
 * @param name The name of the test for which the current reference should be invalidated
 * @param hardware The hardware for which the current reference should be invalidated
 */
export function clearReferencePointer(group: string, name: string, hardware: string) {
  fs.unlinkSync(referencePointer(group, name, hardware));
}

/**
 * Updates the current reference image for the test identified by @param group,
 * @param name, and @param hardware to point at the image identified by the
 * @param timestamp.
 *
 * @param group The name of the group for which to update the current reference image
 * @param name The name of the test for which to update the current reference image
 * @param hardware The hardware for which to update the current reference image
 * @param timestamp The time stamp of the image that is used as the new reference image
 * @returns The path to the file that is used as the new reference image
 */
export function updateReferencePointer(group: string, name: string, hardware: string,
                                       timestamp: Date): string {
  assert(
    !hasReferenceImage(group, name, hardware),
    "Reference pointer already exists"
  );

  const p = `${toPath(timestamp)}.png`;
  const ref = referencePointer(group, name, hardware);
  if (!fs.existsSync(path.dirname(ref))) {
    fs.mkdirSync(path.dirname(ref), { recursive: true });
  }
  fs.writeFileSync(ref, p);

  return referenceImage(group, name, hardware);
}

/**
 * Returns whether the test identified by @param group, @param name, and @param hardware
 * has a current reference image.
 *
 * @param group The name of the group for which to check the current reference image
 * @param name The name of the test for which to check the current reference image
 * @param hardware The hardware for which to check the current reference image
 * @returns Returns `true` if there is a current reference image, `false` otherwise
 */
export function hasReferenceImage(group: string, name: string,
                                  hardware: string): boolean
{
  return fs.existsSync(referencePointer(group, name, hardware));
}

/**
 * Returns the path to the current reference image for the test identified by
 * @param group, @param name, and @param hardware. This function assumes that this test
 * has a currently valid reference image.
 *
 * @param group The name of the group for which to return the current reference image
 * @param name The name of the test for which to return the current reference image
 * @param hardware The hardware for which to return the current reference image
 * @returns The path to the current reference image for the requested test
 */
export function referenceImage(group: string, name: string, hardware: string): string {
  assert(hasReferenceImage(group, name, hardware), "No reference image found");

  let path = fs.readFileSync(referencePointer(group, name, hardware)).toString();
  return `${Config.data}/reference/${hardware}/${group}/${name}/${path}`;
}

/**
 * Returns the path to the candidate image for the test identified by the @param group,
 * @param name, @param hardware, and @param timestamp. Note that this path might not exist
 * if no test has run for these test parameters.
 *
 * @param group The name of the group for which to return the candidate image
 * @param name The name of the test for which to return the candidate image
 * @param hardware The hardware for which to return the candidate image
 * @param timestamp The time stamp for which to return the candidate image
 * @returns The path to the candidate image for the requested test
 */
export function candidateImage(group: string, name: string, hardware: string,
                               timestamp: Date): string
{
  return `${testPath(group, name, hardware, timestamp)}/candidate.png`;
}

/**
 * Returns the path to the difference image for the test identified by the @param group,
 * @param name, @param hardware, and @param timestamp. Note that this path might not exist
 * if no test has run for these test parameters.
 *
 * @param group The name of the group for which to return the difference image
 * @param name The name of the test for which to return the difference image
 * @param hardware The hardware for which to return the difference image
 * @param timestamp The time stamp for which to return the difference image
 * @returns The path to the difference image for the requested test
 */
export function differenceImage(group: string, name: string, hardware: string,
                                timestamp: Date): string
{
return `${testPath(group, name, hardware, timestamp)}/difference.png`;
}

/**
 * Returns the path to the test data file for the test identified by the @param group,
 * @param name, @param hardware, and @param timestamp. Note that this path might not exist
 * if no test has run for these test parameters.
 *
 * @param group The name of the group for which to return the test data file
 * @param name The name of the test for which to return the test data file
 * @param hardware The hardware for which to return the test data file
 * @param timestamp The time stamp for which to return the test data file
 * @returns The path to the test data file for the requested test
 */
export function testDataPath(group: string, name: string, hardware: string,
                             timestamp: Date): string
{
  return `${testPath(group, name, hardware, timestamp)}/data.json`;
}
