import { Config } from "./configuration";
import fs from "fs";
import path from "path";

export const OperatingSystemList = [ "linux", "windows" ] as const;
export type OperatingSystem = typeof OperatingSystemList[number];

export function isOperatingSystem(value: string): value is OperatingSystem {
  return OperatingSystemList.includes(value as OperatingSystem);
}

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
 * @param name, and @param os are stored. If no test exists for that test, `null` is
 * returned.
 *
 * @param group The name of the group for which the latest test should be returned
 * @param name The name of the test for which the latest run should be returned
 * @param os The operating system for which the latest test should be returned
 * @returns The path where the test files for the latest test are stored
 */
export function latestTestPath(group: string, name: string,
                               os: OperatingSystem): string | null
{
  const path = `${Config.data}/tests/${os}/${group}/${name}`;
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
 * @param name, @param os, and @param timestamp are located. Note that the returned folder
 * might not exist, if such a test is not available.
 *
 * @param group The name of the group for which the path should be returned
 * @param name The name of the test for which the path should be returned
 * @param os The operating system for which the path should be returned
 * @param timestamp The time stamp for which the path should be returned
 * @returns The path to the test files for the provided parameters
 */
export function testPath(group: string, name: string, os: OperatingSystem,
                         timestamp: Date): string
{
  return `${Config.data}/tests/${os}/${group}/${name}/${toPath(timestamp)}`
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
 * @param os The operating system for which to return the file containing the file name
 *           that is the currently active reference image
 * @returns The path to the file that contains the name of the current reference file for
 *          the test
 */
function referencePointer(group: string, name: string, os: OperatingSystem): string {
  return `${Config.data}/reference/${os}/${group}/${name}/ref.txt`;
}

/**
 * Invalidates the current reference image for the test identified by the @param group,
 * @param name, and @param os.
 *
 * @param group The name of the group for which the current reference should be
 *              invalidated
 * @param name The name of the test for which the current reference should be invalidated
 * @param os The operating system for which the current reference should be invalidated
 */
export function clearReferencePointer(group: string, name: string, os: OperatingSystem) {
  fs.unlinkSync(referencePointer(group, name, os));
}

/**
 * Updates the current reference image for the test identified by @param group,
 * @param name, and @param os to point at the image identified by the @param timestamp.
 * This requires that `/api/image/reference/${group}/${name}/${os}/${timestamp}` must
 * resolve to a valid image.
 *
 * @param group The name of the group for which to update the current reference image
 * @param name The name of the test for which to update the current reference image
 * @param os The operating system for which to update the current reference image
 * @param timestamp The time stamp of the image that is used as the new reference image
 * @returns The path to the file that is used as the new reference image
 */
export function updateReferencePointer(group: string, name: string, os: OperatingSystem,
                                       timestamp: Date): string {
  console.assert(!hasReferenceImage(group, name, os), "Reference pointer already exists");

  const p = `${toPath(timestamp)}.png`;
  console.assert(fs.existsSync(`${Config.data}/reference/${os}/${group}/${name}/${p}`));

  const ref = referencePointer(group, name, os);
  if (!fs.existsSync(path.dirname(ref))) {
    fs.mkdirSync(path.dirname(ref), { recursive: true });
  }
  fs.writeFileSync(ref, p);

  return referenceImage(group, name, os);
}

/**
 * Returns whether the test identified by @param group, @param name, and @param os has a
 * current reference image.
 *
 * @param group The name of the group for which to check the current reference image
 * @param name The name of the test for which to check the current reference image
 * @param os The operating system for which to check the current reference image
 * @returns Returns `true` if there is a current reference image, `false` otherwise
 */
export function hasReferenceImage(group: string, name: string,
                                  os: OperatingSystem): boolean
{
  return fs.existsSync(referencePointer(group, name, os));
}

/**
 * Returns the path to the current reference image for the test identified by
 * @param group, @param name, and @param os. This function assumes that this test has a
 * currently valid reference image.
 *
 * @param group The name of the group for which to return the current reference image
 * @param name The name of the test for which to return the current reference image
 * @param os The operating system for which to return the current reference image
 * @returns The path to the current reference image for the requested test
 */
export function referenceImage(group: string, name: string, os: OperatingSystem): string {
  console.assert(hasReferenceImage(group, name, os), "No reference image found");

  let path = fs.readFileSync(referencePointer(group, name, os)).toString();
  return `${Config.data}/reference/${os}/${group}/${name}/${path}`;
}

/**
 * Returns the path to the candidate image for the test identified by the @param group,
 * @param name, @param os, and @param timestamp. Note that this path might not exist if no
 * test has run for these test parameters.
 *
 * @param group The name of the group for which to return the candidate image
 * @param name The name of the test for which to return the candidate image
 * @param os The operating system for which to return the candidate image
 * @param timestamp The time stamp for which to return the candidate image
 * @returns The path to the candidate image for the requested test
 */
export function candidateImage(group: string, name: string, os: OperatingSystem,
                               timestamp: Date): string
{
  return `${testPath(group, name, os, timestamp)}/candidate.png`;
}

/**
 * Returns the path to the difference image for the test identified by the @param group,
 * @param name, @param os, and @param timestamp. Note that this path might not exist if no
 * test has run for these test parameters.
 *
 * @param group The name of the group for which to return the difference image
 * @param name The name of the test for which to return the difference image
 * @param os The operating system for which to return the difference image
 * @param timestamp The time stamp for which to return the difference image
 * @returns The path to the difference image for the requested test
 */
export function differenceImage(group: string, name: string, os: OperatingSystem,
                                timestamp: Date): string
{
return `${testPath(group, name, os, timestamp)}/difference.png`;
}

/**
 * Returns the path to the test data file for the test identified by the @param group,
 * @param name, @param os, and @param timestamp. Note that this path might not exist if no
 * test has run for these test parameters.
 *
 * @param group The name of the group for which to return the test data file
 * @param name The name of the test for which to return the test data file
 * @param os The operating system for which to return the test data file
 * @param timestamp The time stamp for which to return the test data file
 * @returns The path to the test data file for the requested test
 */
export function testDataPath(group: string, name: string, os: OperatingSystem,
                             timestamp: Date): string
{
  return `${testPath(group, name, os, timestamp)}/data.json`;
}
