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
  const list = document.getElementById("list");
  console.assert(list, "Not element 'list' found");

  const lis = []
  // Starting a 1 as the first line (the header) should not participate in sorting
  for (const i = 1; i < list.childNodes.length; i++) {
    console.assert(list.childNodes[i].nodeName === "LI");
    lis.push(list.childNodes[i]);
  }

  // Sorts the two `li`s by the column that is captured in this lambda. There is probably
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
      const aData = a.record.data[0];
      const bData = b.record.data[0];
      console.assert(column in aData, `Missing column ${column} in a ${a}`);
      console.assert(column in bData, `Missing column ${column} in b ${b}`);

      const aVal = aData[column];
      const bVal = bData[column];

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
  const newList = list.cloneNode(false);
  // Add the header at the top again
  newList.appendChild(list.childNodes[0]);
  for (const li of lis) {
    newList.appendChild(li);
  }
  list.parentNode.replaceChild(newList, list);
} // function sortRows(column)


async function updateReferenceImage(record) {
  const authentication = document.getElementById("admin").value;

  const response = await fetch(
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
  function createDiv(className, sortName, header) {
    const div = document.createElement("div");
    div.className = `cell ${className}`;
    div.onclick = () => sortRows(sortName);
    div.appendChild(document.createTextNode(header));
    return div;
  } // createDiv(className, sortName, header)

  const li = document.createElement("li");
  li.className = "heading";
  ul.appendChild(li);

  li.appendChild(createDiv("status", "pixelError", "Error"));
  li.appendChild(createDiv("group", "group", "Group"));
  li.appendChild(createDiv("name", "name", "Name"));
  li.appendChild(createDiv("hardware", "hardware", "Hardware"));
  li.appendChild(createDiv("timing", "timing", "Timing"));
  li.appendChild(createDiv("commit", "commitHash", "Commit"));
  li.appendChild(createDiv("timestamp", "timeStamp", "Timestamp"));
} // function createHeader(ul)

function createRows(record, ul) {
  function createHead(divHead, divBody, record, data) {
    function createImageDiv(className, type, record) {
      const div = document.createElement("div");
      div.className = `cell ${className}`;

      const a = document.createElement("a");
      a.href = `/api/result/${type}/${record.group}/${record.name}/${record.hardware}`;
      a.target = "_blank";
      div.appendChild(a);

      const img = document.createElement("img");
      img.src = `/api/result/${type}-thumbnail/${record.group}/${record.name}/${record.hardware}`;
      img.className = "overview";
      img.loading = "lazy";
      a.appendChild(img);
      return div;
    }

    divHead.className = "head";
    divHead.onclick = () => divBody.classList.toggle("hidden");

    const status = document.createElement("div");
    const errorClass = classForDiff(data.pixelError);
    status.className = `cell status ${errorClass}`;
    status.appendChild(document.createTextNode(diffDisplay(data.pixelError)));
    divHead.appendChild(status);

    const group = document.createElement("div");
    group.className = "cell group";
    group.appendChild(document.createTextNode(record.group));
    divHead.appendChild(group);

    const name = document.createElement("div");
    name.className = "cell name";
    name.appendChild(document.createTextNode(record.name));
    divHead.appendChild(name);

    const hw = document.createElement("div");
    hw.className = "cell hardware";
    hw.appendChild(document.createTextNode(record.hardware));
    divHead.appendChild(hw);

    const timing = document.createElement("div");
    timing.className = "cell timing";
    timing.appendChild(document.createTextNode(timingDisplay(data.timing)));
    divHead.appendChild(timing);

    const commit = document.createElement("div");
    commit.className = "cell commit";
    const a = document.createElement("a");
    a.href = `https://github.com/OpenSpace/OpenSpace/commit/${data.commitHash}`;
    a.target = "_blank";
    a.appendChild(document.createTextNode(data.commitHash));
    commit.appendChild(a);
    divHead.appendChild(commit);

    const timestamp = document.createElement("div");
    timestamp.className = "cell timestamp";
    timestamp.appendChild(
      document.createTextNode(new Date(data.timeStamp).toISOString())
    );
    divHead.appendChild(timestamp);

    divHead.appendChild(createImageDiv("candidate", "candidate", record));
    divHead.appendChild(createImageDiv("reference", "reference", record));
    divHead.appendChild(createImageDiv("difference", "difference", record));

    return divHead;
  } // function createHead(divHead, divBody, record, data)

  function createBody(divBody, record, testData) {
    function createImageTd(className, type, record, timestamp) {
      const td = document.createElement("td");
      td.className = className;

      const a = document.createElement("a");
      a.href = `/api/result/${type}/${record.group}/${record.name}/${record.hardware}/${timestamp}`;
      a.target = "_blank";
      td.appendChild(a);

      const img = document.createElement("img");
      img.src = `/api/result/${type}-thumbnail/${record.group}/${record.name}/${record.hardware}/${timestamp}`;
      img.loading = "lazy";
      a.appendChild(img);
      return td;
    }

    divBody.className = "body hidden";

    const table = document.createElement("table");
    table.className = "history";
    divBody.appendChild(table);


    testData = testData.reverse();
    const trStatus = document.createElement("tr");
    trStatus.appendChild(document.createElement("td"));
    for (const data of testData) {
      const td = document.createElement("td");
      const errorClass = classForDiff(data.pixelError);
      td.className = `status-small ${errorClass}`;
      trStatus.appendChild(td);
    }
    table.appendChild(trStatus);

    const trTimeStamp = document.createElement("tr");
    trTimeStamp.appendChild(document.createElement("td"));
    for (const data of testData) {
      const td = document.createElement("td");
      td.className = "timestamp";
      td.appendChild(document.createTextNode(new Date(data.timeStamp).toUTCString()));
      trTimeStamp.appendChild(td);
    }
    table.appendChild(trTimeStamp);

    const trDiff = document.createElement("tr");
    trDiff.appendChild(document.createElement("td"));
    for (const data of testData) {
      const td = document.createElement("td");
      td.className = "diff";
      td.appendChild(document.createTextNode(diffDisplay(data.pixelError)));
      trDiff.appendChild(td);
    }
    table.appendChild(trDiff);

    const trCommit = document.createElement("tr");
    trCommit.appendChild(document.createElement("td"));
    for (const data of testData) {
      const td = document.createElement("td");
      td.className = "commit";
      const a = document.createElement("a");
      a.href = `https://github.com/OpenSpace/OpenSpace/commit/${data.commitHash}`;
      a.target = "_blank";
      td.appendChild(a);
      a.appendChild(document.createTextNode(data.commitHash));
      trCommit.appendChild(td);
    }
    table.appendChild(trCommit);

    const trTiming = document.createElement("tr");
    trTiming.appendChild(document.createElement("td"));
    for (const data of testData) {
      const td = document.createElement("td");
      td.className = "timing";
      td.appendChild(document.createTextNode(timingDisplay(data.timing)));
      trTiming.appendChild(td);
    }
    table.appendChild(trTiming);

    const trLog = document.createElement("tr");
    trLog.appendChild(document.createElement("td"));
    for (const data of testData) {
      const td = document.createElement("td");
      td.className = "log";
      const a = document.createElement("a");
      a.href = `/api/result/log/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`;
      a.target = "_blank";
      td.appendChild(a);
      a.appendChild(document.createTextNode(`Log file (${data.nErrors} errors)`));
      trLog.appendChild(td);
    }
    table.appendChild(trLog);

    const trCandidate = document.createElement("tr");
    {
      const td = document.createElement("td");
      td.className = "table-label";
      td.appendChild(document.createTextNode("Candidate"));
      trCandidate.appendChild(td);
    }
    for (const data of testData) {
      trCandidate.appendChild(createImageTd("candidate", "candidate", record, data.timeStamp));
    }
    table.appendChild(trCandidate);

    const trReference = document.createElement("tr");
    {
      const td = document.createElement("td");
      td.className = "table-label";
      td.appendChild(document.createTextNode("Reference"));
      trReference.appendChild(td);
    }
    for (const data of testData) {
      trReference.appendChild(createImageTd("reference", "reference", record, data.timeStamp));
    }
    table.appendChild(trReference);

    const trDifference = document.createElement("tr");
    {
      const td = document.createElement("td");
      td.className = "table-label";
      td.appendChild(document.createTextNode("Difference"));
      trDifference.appendChild(td);
    }
    for (const data of testData) {
      trDifference.appendChild(createImageTd("difference", "difference", record, data.timeStamp));
    }
    table.appendChild(trDifference);

    {
      const trUpdate = document.createElement("tr");
      trUpdate.appendChild(document.createElement("td"));
      // We can only use the more recent image as a new reference image
      const td = document.createElement("td");
      const button = document.createElement("button");
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


  const li = document.createElement("li");
  li.className = "row";
  li.record = record;
  ul.appendChild(li);

  const divHead = document.createElement("div");
  const divBody = document.createElement("div");

  createHead(divHead, divBody, record, record.data[record.data.length - 1]);
  li.appendChild(divHead);

  createBody(divBody, record, record.data);
  li.appendChild(divBody);
} // function createRows(record, ul)


function updateHardwareVisibility() {
  // Collect all selected hardware values
  const hardwareElements = document.getElementsByClassName("hardware-checkbox");
  const hardware = [];
  for (const element of hardwareElements) {
    if (element.checked) {
      hardware.push(element.value);
    }
  }


  const ul = document.getElementById("list");
  // Skipping the first entry as it is the header
  for (const i = 1; i < ul.childNodes.length; i++) {
    const li = ul.childNodes[i];
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
  const select = document.createElement("select");
  select.id = "hardware-select";
  ul.appendChild(select);

  // The option to show all
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.onclick = function() {
    const checkboxes = document.getElementsByClassName("hardware-checkbox");
    for (const checkbox of checkboxes) {
      checkbox.checked = true;
    }
    updateHardwareVisibility();
  };
  allOption.appendChild(document.createTextNode("All"));
  select.appendChild(allOption);

  // Add the rest of the options
  for (const hardware of hardwares) {
    const hardwareOption = document.createElement("option");
    hardwareOption.value = hardware;
    hardwareOption.appendChild(document.createTextNode(hardware));

    hardwareOption.onclick = function() {
      const checkboxes = document.getElementsByClassName("hardware-checkbox");
      for (const checkbox of checkboxes) {
        checkbox.checked = (checkbox.value === hardwareOption.value);
      }
      updateHardwareVisibility();
    };
    select.appendChild(hardwareOption);
  }


  //
  // Create the checkboxes
  for (const hardware of hardwares) {
    const li = document.createElement("li");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "hardware-checkbox";
    input.id = `hardware-${hardware}`;
    input.onclick = () => updateHardwareVisibility();
    input.value = hardware;
    input.checked = true;
    li.appendChild(input);
    const label = document.createElement("label");
    label.for = input.id;
    label.appendChild(document.createTextNode(hardware));
    li.appendChild(label);
    ul.appendChild(li);
  }

} // function createHardware(hardwares)


async function main() {
  const records = await fetch("/api/test-records").then(res => res.json());

  const hardwares = []
  for (const record of records) {
    if (!hardwares.includes(record.hardware)) {
      hardwares.push(record.hardware);
    }
  }
  const hardwareList = document.getElementById("hardware-list");
  console.assert(hardwareList, "No element 'hardware-list' found");
  createHardware(hardwareList, hardwares);

  // Sort by the highest latest pixel difference are first
  records.sort(
    (a, b) => a.data[a.data.length - 1].pixelError < b.data[b.data.length - 1].pixelError
  );

  const list = document.getElementById("list");
  console.assert(hardwareList, "No element 'list' found");
  createHeader(list);

  for (const record of records) {
    console.assert(record.data.length > 0);
    createRows(record, list);
  }
} // async function main()
