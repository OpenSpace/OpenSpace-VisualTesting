import axios from "axios";
import fs from "fs";

export function main2() {
  axios.post(
    "http://localhost:8000/api/update-diff-threshold",
    { adminToken: "foo", threshold: 0.005 }
  );
}

export async function main() {
  let files = fs.readdirSync("../old/OpenSpaceVisualTesting/testImages");
  let headers = {
    "Content-Type": "image/png",
    "RunnerID": "abc",
    "Hardware": "linux-nvidia",
    "Group": "",
    "Name": "",
    "TimeStamp": new Date().toISOString(),
    "CommitHash": "foobar"
  };

  for (let file of files) {
    if (file.startsWith("Target")) {
      let f = file.substring(6);

      if (f.startsWith("apollo_sites11")) {
        f = f.substring("apollo_sites11".length);
        headers.Group = "apollo_sites11";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo_sites17")) {
        f = f.substring("apollo_sites17".length);
        headers.Group = "apollo_sites17";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo11")) {
        f = f.substring("apollo11".length);
        headers.Group = "apollo11";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo17")) {
        f = f.substring("apollo17".length);
        headers.Group = "apollo17";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo")) {
        f = f.substring("apollo".length);
        headers.Group = "apollo";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("default")) {
        f = f.substring("default".length);
        headers.Group = "default";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("eclipse")) {
        f = f.substring("eclipse".length);
        headers.Group = "eclipse";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("gaia")) {
        f = f.substring("gaia".length);
        headers.Group = "gaia";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("juno")) {
        f = f.substring("juno".length);
        headers.Group = "juno";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("jwst")) {
        f = f.substring("jwst".length);
        headers.Group = "jwst";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("marsinsight")) {
        f = f.substring("marsinsight".length);
        headers.Group = "marsinsight";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("newhorizons")) {
        f = f.substring("newhorizons".length);
        headers.Group = "newhorizons";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("nightsky")) {
        f = f.substring("nightsky".length);
        headers.Group = "nightsky";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("osirisrex")) {
        f = f.substring("osirisrex".length);
        headers.Group = "osirisrex";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("voyager")) {
        f = f.substring("voyager".length);
        headers.Group = "voyager";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }
    }
  }

  for (let file of files) {
    if (!file.startsWith("Target")) {
      let f = file;
      if (f.startsWith("apollo_sites11")) {
        f = f.substring("apollo_sites11".length);
        headers.Group = "apollo_sites11";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo_sites17")) {
        f = f.substring("apollo_sites17".length);
        headers.Group = "apollo_sites17";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo11")) {
        f = f.substring("apollo11".length);
        headers.Group = "apollo11";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo17")) {
        f = f.substring("apollo17".length);
        headers.Group = "apollo17";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("apollo")) {
        f = f.substring("apollo".length);
        headers.Group = "apollo";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("default")) {
        f = f.substring("default".length);
        headers.Group = "default";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("eclipse")) {
        f = f.substring("eclipse".length);
        headers.Group = "eclipse";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("gaia")) {
        f = f.substring("gaia".length);
        headers.Group = "gaia";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("juno")) {
        f = f.substring("juno".length);
        headers.Group = "juno";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("jwst")) {
        f = f.substring("jwst".length);
        headers.Group = "jwst";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("marsinsight")) {
        f = f.substring("marsinsight".length);
        headers.Group = "marsinsight";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("newhorizons")) {
        f = f.substring("newhorizons".length);
        headers.Group = "newhorizons";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("nightsky")) {
        f = f.substring("nightsky".length);
        headers.Group = "nightsky";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("osirisrex")) {
        f = f.substring("osirisrex".length);
        headers.Group = "osirisrex";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }

      if (f.startsWith("voyager")) {
        f = f.substring("voyager".length);
        headers.Group = "voyager";
        headers.Name = f.substring(0, f.length - 4);
        headers.TimeStamp = new Date().toISOString();

        await axios.post(
          "http://localhost:8000/api/submit-test",
          fs.readFileSync(`../old/OpenSpaceVisualTesting/testImages/${file}`),
          { headers }
        );
        continue;
      }
    }
  }
}
