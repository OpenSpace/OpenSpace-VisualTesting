import { printAudit } from "./audit";
import { Config } from "./configuration";
import fs from "fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";


export function generateComparison(reference: string, candidate: string,
                                   difference: string): number
{
  console.assert(fs.existsSync(reference), `No reference ${reference}`);
  console.assert(fs.existsSync(candidate), `No candidate ${candidate}`);

  printAudit(`Running comparison between "${reference}" & "${candidate}" -> "${difference}"`);

  const refImg = PNG.sync.read(fs.readFileSync(reference));
  const testImg = PNG.sync.read(fs.readFileSync(candidate));
  // @TODO: Ensure the images have the same size
  const { width, height } = refImg;
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

