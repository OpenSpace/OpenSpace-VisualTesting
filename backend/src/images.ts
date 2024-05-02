import { OperatingSystem } from "./globals";
import fs from "fs";


namespace cache {
  export let ReferenceImages: ReferenceImage[] = [];
  export let Groups: string[] = [];
  export let OperatingSystems: string[] = [];
} // namespace cache

//////////////////////////////////////////////////////////////////////////////////////////

type ReferenceImage = {
  group: string,
  name: string,
  operatingSystem: OperatingSystem,

  path: string
};

//////////////////////////////////////////////////////////////////////////////////////////

function loadOsImages(operatingSystem: OperatingSystem, path: string): ReferenceImage[] {
  let res: ReferenceImage[] = [];

  path = `${path}/${operatingSystem}`;
  let folders = fs.readdirSync(path);
  for (let folder of folders) {
    let fullFolder = `${path}/${folder}`;

    let files = fs.readdirSync(fullFolder);
    for (let file of files) {
      let fullPath = `${fullFolder}/${file}`;
      let name = file.split(".").slice(0, -1).join(".");

      res.push({
        group: folder,
        name: name,
        operatingSystem: operatingSystem,
        path: fullPath
      });
    }
  }

  return res;
}

//////////////////////////////////////////////////////////////////////////////////////////

export function initializeReferenceImages(path: string) {
  // Load all references images from the filesystem
  let linux = loadOsImages(OperatingSystem.Linux, path);
  let windows = loadOsImages(OperatingSystem.Windows, path);
  cache.ReferenceImages = cache.ReferenceImages.concat(linux, windows);

  // Create the other caches
  for (let image of cache.ReferenceImages) {
    if (!cache.Groups.includes(image.group)) {
      cache.Groups.push(image.group);
    }

    if (!cache.OperatingSystems.includes(image.operatingSystem)) {
      cache.OperatingSystems.push(image.operatingSystem);
    }
  }
}

export function referenceImage(group: string, name: string, os: string): string | null {
  for (let image of cache.ReferenceImages) {
    if (image.group == group && image.name == name && image.operatingSystem == os) {
      return image.path;
    }
  }

  return null;
}

export function referenceImages(): ReferenceImage[] {
  return cache.ReferenceImages;
}

export function groups(): string[] {
  return cache.Groups;
}

export function operatingSystems(): string[] {
  return cache.OperatingSystems;
}
