import axios from "axios";
import fs from "fs";

export function main() {
  let headers = {
    "Content-Type": "image/png",
    "RunnerID": "abc",
    "OperatingSystem": "linux",
    "Group": "newhorizons",
    "Name": "NewHorizonsModel",
    "TimeStamp": new Date().toISOString(),
    "CommitHash": "foobar"
  };

  const file = "./NewHorizonsModel.png";
  if (!fs.existsSync(file)) {
    throw "Missing file";
  }

  axios.post(
    "http://localhost:8000/api/submit-test",
    fs.readFileSync(file),
    { headers }
  );
}
