import { Config } from "./configuration";
import fs from "fs";
import path from "path";

export const OperatingSystemList = [ "linux", "windows" ] as const;
export type OperatingSystem = typeof OperatingSystemList[number];

export function isOperatingSystem(value: string): value is OperatingSystem {
  return OperatingSystemList.includes(value as OperatingSystem);
}

function toPath(date: Date): string {
  return date.toISOString().split("-").join("").split(":").join("").split(".").join("");
}

export function latestTestPath(group: string, name: string,
                               os: OperatingSystem): string | null
{
  const path = `${Config.data}/tests/${os}/${group}/${name}`;

  let tests = fs.readdirSync(path);
  if (tests.length == 0) {
    return null;
  }

  tests.sort();

  return `${path}/${tests[tests.length - 1]}`;
}

export function testPath(group: string, name: string, os: OperatingSystem,
                         timestamp: Date): string
{
  return `${Config.data}/tests/${os}/${group}/${name}/${toPath(timestamp)}`
}

function referencePointer(group: string, name: string, os: OperatingSystem): string {
  return `${Config.data}/reference/${os}/${group}/${name}/ref.txt`;
}

export function clearReferencePointer(group: string, name: string, os: OperatingSystem) {
  fs.unlinkSync(referencePointer(group, name, os));
}

export function updateReferencePointer(group: string, name: string, os: OperatingSystem,
                                       timestamp: Date): string {
  console.assert(!hasReferenceImage(group, name, os), "Reference pointer already exists");

  const p = `${toPath(timestamp)}.png`;
  const ref = referencePointer(group, name, os);
  if (!fs.existsSync(path.dirname(ref))) {
    fs.mkdirSync(path.dirname(ref), { recursive: true });
  }
  fs.writeFileSync(ref, p);

  return referenceImage(group, name, os);
}

export function hasReferenceImage(group: string, name: string,
                                  os: OperatingSystem): boolean
{
  return fs.existsSync(referencePointer(group, name, os));
}

export function referenceImage(group: string, name: string, os: OperatingSystem): string {
  console.assert(hasReferenceImage(group, name, os), "No reference image found");

  let path = fs.readFileSync(referencePointer(group, name, os)).toString();
  return `${Config.data}/reference/${os}/${group}/${name}/${path}`;
}

export function candidateImage(group: string, name: string, os: OperatingSystem,
                               timestamp: Date): string
{
  return `${testPath(group, name, os, timestamp)}/candidate.png`;
}

export function differenceImage(group: string, name: string, os: OperatingSystem,
                                timestamp: Date): string
{
return `${testPath(group, name, os, timestamp)}/difference.png`;
}

export function testDataPath(group: string, name: string, os: OperatingSystem,
                             timestamp: Date): string
{
  return `${testPath(group, name, os, timestamp)}/data.json`;
}
