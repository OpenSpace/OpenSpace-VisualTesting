import { Config } from "./configuration";
import fs from "fs";


type TestRecord = {
  group: string;
  name: string;
  results: {
    [K in "windows" | "linux"]?: [
      {
        pixelDifference: number;
        timeStamp: Date;
        commitHash: string;
      }
    ]
  }
};

export let TestRecords: TestRecord[] = [];

export function loadTestRecords(path: string) {
  TestRecords = JSON.parse(fs.readFileSync(path).toString()).results;

}

function saveTestRecords() {
  fs.writeFileSync(
    Config.testResultStore,
    JSON.stringify({ results: TestRecords }, null, 2)
  );
}

export function updateTestRecord(group: string, name: string, os: "windows" | "linux",
                          pixelDifference: number, timeStamp: Date, commitHash: string)
{
  let found = false;
  for (let test of TestRecords) {
    if (test.group != group || test.name != name)  continue;

    found = true;
    test.results[os]?.push({
      pixelDifference,
      timeStamp,
      commitHash
    });
    break;
  }

  if (!found) {
    TestRecords.push({
      group: group,
      name: name,
      results: {
        [os]: {
          pixelDifference,
          timeStamp,
          commitHash
        }
      }
    });
  }

  saveTestRecords();
}
