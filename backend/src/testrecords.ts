import { printAudit } from "./audit";
import { Config } from "./configuration";
import { OperatingSystem } from "./globals";
import fs from "fs";


type TestRecord = {
  group: string; // Can only be filepath-valid names
  name: string; // Can only be filepath-valid names
  data: {
    [K in OperatingSystem]?: [ TestData ]
  }
};

export type TestData = {
  pixelDifference: number;
  timeStamp: Date;
  commitHash: string;

  /// Path to the reference image that was used for this test
  referenceImage: string;
}

export let TestRecords: TestRecord[] = [];

export function saveTestData(data: TestData, path: string) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

export function addTestRecord(group: string, name: string, os: OperatingSystem,
                              data: TestData)
{
  printAudit(`Adding new record for (${group}/${name}/${os})`);

  for (let record of TestRecords) {
    if (record.group != group || record.name != name)  continue;

    if (os in record.data) {
      printAudit("  Adding to data existing record");
      record.data[os]?.push(data);
      record.data[os]?.sort((a, b) => a.timeStamp.getTime() - b.timeStamp.getTime())
    }
    else {
      printAudit("  Creating new record list");
      record.data[os] = [ data ];
    }
    return;
  }

  // if we get here, it's a new record
  printAudit("Creating new test record");
  TestRecords.push({
    group: group,
    name: name,
    data: {
      [os]: [ data ]
    }
  });
}

export function loadTestResults() {
  printAudit("Loading test results");

  let oss = fs.readdirSync(`${Config.data}/tests`);
  for (let os of oss) {
    const base = `${Config.data}/tests/${os}`;

    let groups = fs.readdirSync(base);
    for (let group of groups) {
      let names = fs.readdirSync(`${base}/${group}`);
      for (let name of names) {
        let runs = fs.readdirSync(`${base}/${group}/${name}`);
        for (let run of runs) {
          const p = `${base}/${group}/${name}/${run}`;
          const files = fs.readdirSync(p);
          console.assert(files.length == 3, `Wrong number of files in ${p}`);
          console.assert(files.includes("candidate.png"), `'candidate.png' in ${p}`);
          console.assert(files.includes("difference.png"), `'difference.png' in ${p}`);
          console.assert(files.includes("data.json"), `'data.json' in ${p}`);

          let data: TestData = JSON.parse(fs.readFileSync(`${p}/data.json`).toString());
          data.timeStamp = new Date(data.timeStamp);
          addTestRecord(group, name, os as OperatingSystem, data);
        }
      }
    }
  }
}
