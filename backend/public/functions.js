function maxPixelDifference(record) {
  let difference = 0;
  for (let [_, value] of Object.entries(record.data)) {
    // res is an array and for the sorting we are only caring about the latest result
    difference = Math.max(difference, value[value.length - 1].pixelDifference);
  }
  return difference;
}


function makeReferenceUrl(group, name, operatingSystem) {
  return `/api/image/reference/${group}/${name}/${operatingSystem}`;
}

function makeCandidateUrl(group, name, operatingSystem) {
  return `/api/image/candidate/${group}/${name}/${operatingSystem}`;
}

function makeDifferenceUrl(group, name, operatingSystem) {
  return `/api/image/difference/${group}/${name}/${operatingSystem}`;
}

function createRows(record, ul) {
  for (let [operatingSystem, testData] of Object.entries(record.data)) {
    let li = document.createElement("li");
    li.className = "row";
    {
      let div = document.createElement("div");
      div.className = "li_head";
      li.appendChild(div);

      let group = document.createElement("div");
      group.className = "cell group";
      group.appendChild(document.createTextNode(record.group));
      div.appendChild(group);

      let name = document.createElement("div");
      name.className = "cell name";
      name.appendChild(document.createTextNode(record.name));
      div.appendChild(name);

      let os = document.createElement("div");
      os.className = "cell os";
      os.appendChild(document.createTextNode(operatingSystem));
      div.appendChild(os);

      let diff = document.createElement("div");
      diff.className = "cell diff";
      diff.appendChild(document.createTextNode(testData[testData.length - 1].pixelDifference));
      div.appendChild(diff);

      let commit = document.createElement("div");
      commit.className = "cell commit";
      commit.appendChild(document.createTextNode(testData[testData.length - 1].commitHash));
      div.appendChild(commit);

      let timestamp = document.createElement("div");
      timestamp.className = "cell timestamp";
      timestamp.appendChild(document.createTextNode(testData[testData.length - 1].timeStamp));
      div.appendChild(timestamp);
    }
    {
      let div = document.createElement("div");
      div.className = "li_body";
      li.appendChild(div);

      let table = document.createElement("table");
      table.className = "history";
      div.appendChild(table);


      testData = testData.reverse();
      let trCandidate = document.createElement("tr");
      for (let data of testData) {
        let td = document.createElement("td");
        td.className = "candidate";
        trCandidate.appendChild(td);

        let a = document.createElement("a");
        a.href = `/api/image/candidate/${record.group}/${record.name}/${operatingSystem}/${data.timeStamp}`;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = a.href;
        a.appendChild(img);
      }
      table.appendChild(trCandidate);

      let trReference = document.createElement("tr");
      for (let data of testData) {
        let td = document.createElement("td");
        td.className = "reference";
        trReference.appendChild(td);

        let a = document.createElement("a");
        a.href = `/api/image/reference/${record.group}/${record.name}/${operatingSystem}/${data.timeStamp}`;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = a.href;
        a.appendChild(img);
      }
      table.appendChild(trReference);

      let trDifference = document.createElement("tr");
      for (let data of testData) {
        let td = document.createElement("td");
        td.className = "difference";
        trDifference.appendChild(td);

        let a = document.createElement("a");
        a.href = `/api/image/difference/${record.group}/${record.name}/${operatingSystem}/${data.timeStamp}`;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = a.href;
        a.appendChild(img);
      }
      table.appendChild(trDifference);

      let trTimeStamp = document.createElement("tr");
      for (let data of testData) {
        let td = document.createElement("td");
        td.className = "timestamp";
        td.appendChild(document.createTextNode(data.timeStamp));
        trTimeStamp.appendChild(td);
      }
      table.appendChild(trTimeStamp);

      let trDiff = document.createElement("tr");
      for (let data of testData) {
        let td = document.createElement("td");
        td.className = "diff";
        td.appendChild(document.createTextNode(data.pixelDifference));
        trDiff.appendChild(td);
      }
      table.appendChild(trDiff);

      let trCommit = document.createElement("tr");
      for (let data of testData) {
        let td = document.createElement("td");
        td.className = "commit";
        td.appendChild(document.createTextNode(data.commitHash));
        trCommit.appendChild(td);
      }
      table.appendChild(trCommit);
    }

    ul.appendChild(li);
  }
}

async function main() {
  let records = await fetch("/api/test-records").then(res => res.json());

  // Sort so that the test results with the highest pixel difference are first
  records.sort((a, b) => maxPixelDifference(a) < maxPixelDifference(b));

  let list = document.getElementById("list");
  for (let record of records) {
    let row = createRows(record, list);
  }

}
