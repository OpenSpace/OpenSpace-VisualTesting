import { Config } from "./configuration";
import fs from "fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";


export function generateComparison(referencePath: string, candidatePath: string,
                                   differencePath: string): number
{
  console.assert(fs.existsSync(referencePath), `No reference ${referencePath}`);
  console.assert(fs.existsSync(candidatePath), `No candidate ${candidatePath}`);

  const refImg = PNG.sync.read(fs.readFileSync(referencePath));
  const testImg = PNG.sync.read(fs.readFileSync(candidatePath));
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

  fs.writeFileSync(differencePath, PNG.sync.write(diffImg));
  return nPixels;
}

