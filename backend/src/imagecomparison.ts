import { assert } from "./assert";
import { printAudit } from "./audit";
import { Config } from "./configuration";
import fs from "fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";


/**
 * Runs an image comparison to compare the @param reference image with the
 * @param candidate image. The result is stored in the @param difference image. Both the
 * @param reference and @param candidate parameters need to point towards PNG files that
 * exist and that are readable. Any existing file at the path @param difference will be
 * silently overwritten with the new image result.
 * The @param reference and @param candidate images must have the same size
 *
 * @param reference The path to the reference image. This path must exist and be a valid
 *                  PNG file
 * @param candidate The path to the candidate image. This path must exist and be a valid
 *                  PNG file
 * @param difference The path to where the difference image is stored by this function
 * @returns The percentage of pixels that are changed between the reference and the
 *          candidate image
 */
export function generateComparison(reference: string, candidate: string,
                                   difference: string): number
{
  assert(fs.existsSync(reference), `No reference ${reference}`);
  assert(fs.existsSync(candidate), `No candidate ${candidate}`);

  printAudit(`Creating comparison: "${reference}" & "${candidate}" -> "${difference}"`);

  const refImg = PNG.sync.read(fs.readFileSync(reference));
  const testImg = PNG.sync.read(fs.readFileSync(candidate));

  const refWidth = refImg.width;
  const refHeight = refImg.height;
  const testWidth = testImg.width;
  const testHeight = testImg.height;
  assert(refWidth == testWidth, "Mismatched widths");
  assert(refHeight == testHeight, "Mismatched heights");

  const width = refWidth;
  const height = refHeight;

  let diffImg = new PNG({ width, height });
  let nPixels = pixelmatch(
    refImg.data,
    testImg.data,
    diffImg.data,
    width,
    height,
    {
      threshold: Config.comparisonThreshold
    }
  );

  fs.writeFileSync(difference, PNG.sync.write(diffImg));

  let diff = nPixels / (width * height);
  return diff;
}

