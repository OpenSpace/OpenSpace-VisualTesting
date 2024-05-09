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
import fs from "fs";
import { thumbnailForImage } from "./globals";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import resizeImg from "resize-img";


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
 *          candidate image or `null` if the images had the wrong size
 */
export async function generateComparison(reference: string, candidate: string,
                                   difference: string): Promise<number | null>
{
  assert(fs.existsSync(reference), `No reference ${reference}`);
  assert(fs.existsSync(candidate), `No candidate ${candidate}`);

  printAudit(`Creating comparison: "${reference}" & "${candidate}" -> "${difference}"`);

  const refImg = PNG.sync.read(fs.readFileSync(reference));
  if (refImg.width != Config.size.width || refImg.height != Config.size.height) {
    return null;
  }

  const testImg = PNG.sync.read(fs.readFileSync(candidate));
  if (testImg.width != Config.size.width || testImg.height != Config.size.height) {
    return null;
  }

  let width = Config.size.width;
  let height = Config.size.height
  let diffImg = new PNG({ width, height });
  let nPixels = pixelmatch(
    refImg.data,
    testImg.data,
    diffImg.data,
    width,
    height,
    { threshold: Config.comparisonThreshold }
  );

  fs.writeFileSync(difference, PNG.sync.write(diffImg));

  // Generate the thumbnail for the image
  let thumbnailPath = thumbnailForImage(difference);
  const image = await resizeImg(
    fs.readFileSync(difference),
    { width: Config.size.width / 4, height: Config.size.height / 4 }
  );
  fs.writeFileSync(thumbnailPath, image);


  let diff = nPixels / (width * height);
  return diff;
}

