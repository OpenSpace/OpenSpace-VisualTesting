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
 * Runs an image comparison to compare the `reference` image with the `candidate` image.
 * The result returned as a Buffer and the percentage of pixels that are different between
 * the two images. The `reference` and `candidate` images must have the same size.
 *
 * @param reference The path to the reference image. This path must exist and be a valid
 *                  PNG file
 * @param candidate The path to the candidate image. This path must exist and be a valid
 *                  PNG file
 * @returns A buffer containing the difference image and the percentage of pixels that are
 *          changed between the reference and the candidate image or. Returns `null` if
 *          the images had the wrong size
 */
export async function generateComparisonImage(reference: string,
                                         candidate: string): Promise<[PNG, number] | null>
{
  assert(fs.existsSync(reference), `No reference ${reference}`);
  assert(fs.existsSync(candidate), `No candidate ${candidate}`);

  printAudit(`Creating comparison: "${reference}" & "${candidate}"`);

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

  let diff = nPixels / (width * height);
  return [ diffImg, diff ];
}



/**
 * Runs an image comparison to compare the `reference` image with the `candidate` image.
 * The result is stored in the `difference` image. Both the `reference` and `candidate`
 * parameters need to point towards PNG files that exist and that are readable. Any
 * existing file at the path `difference` will be silently overwritten with the new image
 * result. This function will also generate a thumbnail of the comparison image. The
 * `reference` and `candidate` images must have the same size.
 *
 * @param reference The path to the reference image. This path must exist and be a valid
 *                  PNG file
 * @param candidate The path to the candidate image. This path must exist and be a valid
 *                  PNG file
 * @param difference The path to where the difference image is stored by this function
 * @returns The percentage of pixels that are changed between the reference and the
 *          candidate image or `null` if the images had the wrong size
 */
export async function saveComparisonImage(reference: string, candidate: string,
                                          difference: string): Promise<number | null>
{
  let res = await generateComparisonImage(reference, candidate);
  if (res == null) {
    return null;
  }

  let [img, nPixels] = res;

  fs.writeFileSync(difference, PNG.sync.write(img));
  await createThumbnail(difference);

  let diff = nPixels / (img.width * img.height);
  return diff;
}



/**
 * Creates a thumbnail for the image provided by the `path`. The path has to be a valid
 * filepath to a file that exists. The image is scaled down by the value specified in the
 * global configuration file. The thumbnail is stored at a location that is generated by
 * the `thumbnailForImage` function.
 *
 * @param path The path to the file for which a thumbnail should be created
 */
export async function createThumbnail(path: string) {
  assert(fs.existsSync(path), `No path ${path} found`);

  let thumbnailPath = thumbnailForImage(path);
  let width = Config.size.width / Config.thumbnailScale;
  let height = Config.size.height / Config.thumbnailScale
  const image = await resizeImg(fs.readFileSync(path), { width: width, height: height });
  fs.writeFileSync(thumbnailPath, image);
}
