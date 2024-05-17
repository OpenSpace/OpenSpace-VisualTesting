function classForDiff(diff) {
  console.assert(typeof(diff) === "number", `Diff ${diff} is not a number`);
  console.assert(diff >= 0.0 && diff <= 1.0, `Diff ${diff} out of range [0,1]`);

  // Diff is in [0, 1] and represents % of changed pixels
  if (diff == 0.0)       { return "error-0"; }
  else if (diff < 0.001) { return "error-1"; }
  else if (diff < 0.01)  { return "error-2"; }
  else if (diff < 0.05)  { return "error-3"; }
  else if (diff < 0.1)   { return "error-4"; }
  else if (diff < 0.25)  { return "error-5"; }
  else if (diff < 0.5)   { return "error-6"; }
  else if (diff < 0.75)  { return "error-7"; }
  else if (diff < 1.0)   { return "error-8"; }
  else                   { return "error-9"; }
} // function classForDiff(diff)


function sortRows(column) {
  let list = document.getElementById("list");
  console.assert(list, "Not element 'list' found");

  let lis = []
  // Starting a 1 as the first line (the header) should not participate in sorting
  for (let i = 1; i < list.childNodes.length; i++) {
    console.assert(list.childNodes[i].nodeName === "LI");
    lis.push(list.childNodes[i]);
  }

  // Sorts the two `li`s by the column that is captures in this lambda. There is probably
  // a better way to write this, but it works for now and I don't foresee adding many
  // columns to the list for now that we'd want to sort on
  function sortFunc(a, b) {
    console.assert(a.record, `a ${a} does not contain a record`);
    console.assert(b.record, `b ${b} does not contain a record`);
    if (column in a.record) {
      console.assert(
        ["group", "name", "hardware"].includes(column),
        `Invalid column ${column}`
      );
      console.assert(column in b.record, `Missing column ${column} in b ${b}`);

      // These are just names so we want to sort them with the lower value first
      return a.record[column] > b.record[column];
    }
    else {
      console.assert(
        ["pixelError", "timing", "commitHash", "timeStamp"].includes(column),
        `Invalid column ${column}`
      );
      console.assert(a.record.data.length > 0, `No test records in a ${a}`);
      console.assert(b.record.data.length > 0, `No test records in b ${b}`);

      // These are values that exist in the individual records and we want to sort based
      // on the most recent value, which is at the front of the list
      let aData = a.record.data[0];
      let bData = b.record.data[0];
      console.assert(column in aData, `Missing column ${column} in a ${a}`);
      console.assert(column in bData, `Missing column ${column} in b ${b}`);

      let aVal = aData[column];
      let bVal = bData[column];

      if (column === "timeStamp") {
        // The time stamp gets passed to us as an ISO string, which we need to convert
        // into a Date object to do a proper comparison
        return new Date(aVal) > new Date(bVal);
      }
      else if (column === "pixelError") {
        // The pixel error is the only value that we want to sort inverted, meaning that
        // we want the row with the biggest error at the top
        return aVal < bVal;
      }
      else {
        return aVal > bVal;
      }
    }
  }

  lis.sort(sortFunc);
  let newList = list.cloneNode(false);
  // Add the header at the top again
  newList.appendChild(list.childNodes[0]);
  for (let li of lis) {
    newList.appendChild(li);
  }
  list.parentNode.replaceChild(newList, list);
} // function sortRows(column)


async function updateReferenceImage(record) {
  let authentication = document.getElementById("admin").value;

  let response = await fetch(
    "/api/update-reference",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminToken: authentication,
        group: record.group,
        name: record.name,
        hardware: record.hardware
      })
    },
  );

  if (response.status === 200) {
    alert("Successfully updated reference image")
  }
  else {
    alert(`Error updating reference\n${response.status}\nError: ${response.statusText}`);
  }
} // async function updateReferenceImage(record)


function createHeader(ul) {
  let li = document.createElement("li");
  li.className = "heading";
  ul.appendChild(li);

  let status = document.createElement("div");
  status.className = "cell status";
  status.onclick = () => sortRows("pixelError");
  status.appendChild(document.createTextNode("Error"));
  li.appendChild(status);

  let group = document.createElement("div");
  group.className = "cell group";
  group.onclick = () => sortRows("group");
  group.appendChild(document.createTextNode("Group"));
  li.appendChild(group);

  let name = document.createElement("div");
  name.className = "cell name";
  name.onclick = () => sortRows("name");
  name.appendChild(document.createTextNode("Name"));
  li.appendChild(name);

  let hw = document.createElement("div");
  hw.className = "cell hardware";
  hw.onclick = () => sortRows("hardware");
  hw.appendChild(document.createTextNode("Hardware"));
  li.appendChild(hw);

  let timing = document.createElement("div");
  timing.className = "cell timing";
  timing.onclick = () => sortRows("timing");
  timing.appendChild(document.createTextNode("Timing"));
  li.appendChild(timing);

  let commit = document.createElement("div");
  commit.className = "cell commit";
  commit.onclick = () => sortRows("commitHash");
  commit.appendChild(document.createTextNode("Commit"));
  li.appendChild(commit);

  let timestamp = document.createElement("div");
  timestamp.className = "cell timestamp";
  timestamp.onclick = () => sortRows("timeStamp");
  timestamp.appendChild(document.createTextNode("Timestamp"));
  li.appendChild(timestamp);
} // function createHeader(ul)

function createRows(record, ul) {
  function createHead(divHead, divBody, record, data) {
    divHead.className = "head";
    divHead.onclick = () => divBody.classList.toggle("hidden");

    let status = document.createElement("div");
    let errorClass = classForDiff(data.pixelError);
    status.className = `cell status ${errorClass}`;
    status.appendChild(document.createTextNode(diffDisplay(data.pixelError)));
    divHead.appendChild(status);

    let group = document.createElement("div");
    group.className = "cell group";
    group.appendChild(document.createTextNode(record.group));
    divHead.appendChild(group);

    let name = document.createElement("div");
    name.className = "cell name";
    name.appendChild(document.createTextNode(record.name));
    divHead.appendChild(name);

    let hw = document.createElement("div");
    hw.className = "cell hardware";
    hw.appendChild(document.createTextNode(record.hardware));
    divHead.appendChild(hw);

    let timing = document.createElement("div");
    timing.className = "cell timing";
    timing.appendChild(document.createTextNode(timingDisplay(data.timing)));
    divHead.appendChild(timing);

    let commit = document.createElement("div");
    commit.className = "cell commit";
    let a = document.createElement("a");
    a.href = `https://github.com/OpenSpace/OpenSpace/commit/${data.commitHash}`;
    a.target = "_blank";
    a.appendChild(document.createTextNode(data.commitHash));
    commit.appendChild(a);
    divHead.appendChild(commit);

    let timestamp = document.createElement("div");
    timestamp.className = "cell timestamp";
    timestamp.appendChild(
      document.createTextNode(new Date(data.timeStamp).toISOString())
    );
    divHead.appendChild(timestamp);

    {
      let div = document.createElement("div");
      div.className = "cell candidate";

      let a = document.createElement("a");
      a.href = `/api/result/candidate/${record.group}/${record.name}/${record.hardware}`;
      a.target = "_blank";
      div.appendChild(a);

      let img = document.createElement("img");
      img.src = `/api/result/candidate-thumbnail/${record.group}/${record.name}/${record.hardware}`;
      img.className = "overview";
      img.loading = "lazy";
      a.appendChild(img);
      divHead.appendChild(div);
    }

    {
      let div = document.createElement("div");
      div.className = "cell reference";

      let a = document.createElement("a");
      a.href = `/api/result/reference/${record.group}/${record.name}/${record.hardware}`;
      a.target = "_blank";
      div.appendChild(a);

      let img = document.createElement("img");
      img.src = `/api/result/reference-thumbnail/${record.group}/${record.name}/${record.hardware}`;
      img.className = "overview";
      img.loading = "lazy";
      a.appendChild(img);
      divHead.appendChild(div);
    }

    {
      let div = document.createElement("div");
      div.className = "cell difference";

      let a = document.createElement("a");
      a.href = `/api/result/difference/${record.group}/${record.name}/${record.hardware}`;
      a.target = "_blank";
      div.appendChild(a);

      let img = document.createElement("img");
      img.src = `/api/result/difference-thumbnail/${record.group}/${record.name}/${record.hardware}`;
      img.className = "overview";
      img.loading = "lazy";
      a.appendChild(img);
      divHead.appendChild(div);
    }

    return divHead;
  } // function createHead(divHead, divBody, record, data)

  function createBody(divBody, record, testData) {
    divBody.className = "body hidden";

    let table = document.createElement("table");
    table.className = "history";
    divBody.appendChild(table);


    testData = testData.reverse();
    let trStatus = document.createElement("tr");
    trStatus.appendChild(document.createElement("td"));
    for (let data of testData) {
      let td = document.createElement("td");
      let errorClass = classForDiff(data.pixelError);
      td.className = `status-small ${errorClass}`;
      trStatus.appendChild(td);
    }
    table.appendChild(trStatus);

    let trTimeStamp = document.createElement("tr");
    trTimeStamp.appendChild(document.createElement("td"));
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "timestamp";
      td.appendChild(document.createTextNode(new Date(data.timeStamp).toUTCString()));
      trTimeStamp.appendChild(td);
    }
    table.appendChild(trTimeStamp);

    let trDiff = document.createElement("tr");
    trDiff.appendChild(document.createElement("td"));
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "diff";
      td.appendChild(document.createTextNode(diffDisplay(data.pixelError)));
      trDiff.appendChild(td);
    }
    table.appendChild(trDiff);

    let trCommit = document.createElement("tr");
    trCommit.appendChild(document.createElement("td"));
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "commit";
      let a = document.createElement("a");
      a.href = `https://github.com/OpenSpace/OpenSpace/commit/${data.commitHash}`;
      a.target = "_blank";
      td.appendChild(a);
      a.appendChild(document.createTextNode(data.commitHash));
      trCommit.appendChild(td);
    }
    table.appendChild(trCommit);

    let trTiming = document.createElement("tr");
    trTiming.appendChild(document.createElement("td"));
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "timing";
      td.appendChild(document.createTextNode(timingDisplay(data.timing)));
      trTiming.appendChild(td);
    }
    table.appendChild(trTiming);

    let trLog = document.createElement("tr");
    trLog.appendChild(document.createElement("td"));
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "log";
      let a = document.createElement("a");
      a.href = `/api/result/log/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      a.target = "_blank";
      td.appendChild(a);
      a.appendChild(document.createTextNode(`Log file (${data.nErrors} errors)`));
      trLog.appendChild(td);
    }
    table.appendChild(trLog);

    let trCandidate = document.createElement("tr");
    {
      let td = document.createElement("td");
      td.className = "table-label";
      td.appendChild(document.createTextNode("Candidate"));
      trCandidate.appendChild(td);
    }
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "candidate";
      trCandidate.appendChild(td);

      let a = document.createElement("a");
      a.href = `/api/result/candidate/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      a.target = "_blank";
      td.appendChild(a);

      let img = document.createElement("img");
      img.src = `/api/result/candidate-thumbnail/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      img.loading = "lazy";
      a.appendChild(img);
    }
    table.appendChild(trCandidate);

    let trReference = document.createElement("tr");
    {
      let td = document.createElement("td");
      td.className = "table-label";
      td.appendChild(document.createTextNode("Reference"));
      trReference.appendChild(td);
    }
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "reference";
      trReference.appendChild(td);

      let a = document.createElement("a");
      a.href = `/api/result/reference/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      a.target = "_blank";
      td.appendChild(a);

      let img = document.createElement("img");
      img.src = `/api/result/reference-thumbnail/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      img.loading = "lazy";
      a.appendChild(img);
    }
    table.appendChild(trReference);

    let trDifference = document.createElement("tr");
    {
      let td = document.createElement("td");
      td.className = "table-label";
      td.appendChild(document.createTextNode("Difference"));
      trDifference.appendChild(td);
    }
    for (let data of testData) {
      let td = document.createElement("td");
      td.className = "difference";
      trDifference.appendChild(td);

      let a = document.createElement("a");
      a.href = `/api/result/difference/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      a.target = "_blank";
      td.appendChild(a);

      let img = document.createElement("img");
      img.src = `/api/result/difference-thumbnail/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      img.loading = "lazy";
      a.appendChild(img);
    }
    table.appendChild(trDifference);

    {
      let trUpdate = document.createElement("tr");
      trUpdate.appendChild(document.createElement("td"));
      // We can only use the more recent image as a new reference image
      let td = document.createElement("td");
      let button = document.createElement("button");
      button.onclick = () => updateReferenceImage(record)
      button.appendChild(document.createTextNode("Upgrade Candidate to Reference"));
      td.appendChild(button);
      trUpdate.appendChild(td);
      table.appendChild(trUpdate);

      for (let i = 0; i < testData.length - 1; i++) {
        trUpdate.appendChild(document.createElement("td"));
      }
    }
  } // function createBody(divBody, record, testData)


  let li = document.createElement("li");
  li.className = "row";
  li.record = record;
  ul.appendChild(li);

  let divHead = document.createElement("div");
  let divBody = document.createElement("div");

  createHead(divHead, divBody, record, record.data[record.data.length - 1]);
  li.appendChild(divHead);

  createBody(divBody, record, record.data);
  li.appendChild(divBody);
} // function createRows(record, ul)


function updateHardwareVisibility() {
  // Collect all selected hardware values
  let hardwareElements = document.getElementsByClassName("hardware-checkbox");
  let hardware = [];
  for (let element of hardwareElements) {
    if (element.checked) {
      hardware.push(element.value);
    }
  }


  let ul = document.getElementById("list");
  // Skipping the first entry as it is the header
  for (let i = 1; i < ul.childNodes.length; i++) {
    let li = ul.childNodes[i];
    if (hardware.includes(li.record.hardware)) {
      li.style.display = "";
    }
    else {
      li.style.display = "none";
    }
  }
} // function updateHardwareVisibility(hardware)


function createHardware(ul, hardwares) {
  //
  // Create the dropdown menu
  let select = document.createElement("select");
  select.id = "hardware-select";
  ul.appendChild(select);

  // The option to show all
  let allOption = document.createElement("option");
  allOption.value = "all";
  allOption.onclick = function() {
    let checkboxes = document.getElementsByClassName("hardware-checkbox");
    for (let checkbox of checkboxes) {
      checkbox.checked = true;
    }
    updateHardwareVisibility();
  };
  allOption.appendChild(document.createTextNode("All"));
  select.appendChild(allOption);

  // Add the rest of the options
  for (let hardware of hardwares) {
    let hardwareOption = document.createElement("option");
    hardwareOption.value = hardware;
    hardwareOption.appendChild(document.createTextNode(hardware));

    hardwareOption.onclick = function() {
      let checkboxes = document.getElementsByClassName("hardware-checkbox");
      for (let checkbox of checkboxes) {
        checkbox.checked = (checkbox.value === hardwareOption.value);
      }
      updateHardwareVisibility();
    };
    select.appendChild(hardwareOption);
  }


  //
  // Create the checkboxes
  for (let hardware of hardwares) {
    let li = document.createElement("li");

    let input = document.createElement("input");
    input.type = "checkbox";
    input.className = "hardware-checkbox";
    input.id = `hardware-${hardware}`;
    input.onclick = () => updateHardwareVisibility();
    input.value = hardware;
    input.checked = true;
    li.appendChild(input);
    let label = document.createElement("label");
    label.for = input.id;
    label.appendChild(document.createTextNode(hardware));
    li.appendChild(label);
    ul.appendChild(li);
  }

} // function createHardware(hardwares)


async function main() {
  let records = await fetch("/api/test-records").then(res => res.json());

  let hardwares = []
  for (let record of records) {
    if (!hardwares.includes(record.hardware)) {
      hardwares.push(record.hardware);
    }
  }
  let hardwareList = document.getElementById("hardware-list");
  console.assert(hardwareList, "No element 'hardware-list' found");
  createHardware(hardwareList, hardwares);

  // Sort by the highest latest pixel difference are first
  records.sort(
    (a, b) => a.data[a.data.length - 1].pixelError < b.data[b.data.length - 1].pixelError
  );

  let list = document.getElementById("list");
  console.assert(hardwareList, "No element 'list' found");
  createHeader(list);

  for (let record of records) {
    console.assert(record.data.length > 0);
    createRows(record, list);
  }
} // async function main()
