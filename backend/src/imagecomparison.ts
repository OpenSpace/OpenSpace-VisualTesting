import { Config } from "./configuration";
import fs from "fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";


export function generateComparison(os: "windows" | "linux", group: string, name: string): number
{
  const referencePath = `${Config.referenceImagePath}/${os}/${group}/${name}.png`;
  const testPath = `${Config.candidateImagePath}/${os}/${group}/${name}.png`;
  const comparisonPath = `${Config.differenceImagePath}/${os}/${group}/${name}.png`;

  const refImg = PNG.sync.read(fs.readFileSync(referencePath));
  const testImg = PNG.sync.read(fs.readFileSync(testPath));
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

  const destinationPath = `${Config.differenceImagePath}/${os}/${group}`;
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true })
  }
  fs.writeFileSync(comparisonPath, PNG.sync.write(diffImg));

  return nPixels;
}

