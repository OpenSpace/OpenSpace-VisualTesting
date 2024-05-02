function maxPixelDifference(record) {
  let difference = 0;
  for (let res of record.data) {
    // res is an array and for the sorting we are only caring about the latest result
    difference = Math.max(difference, res[res.legnth - 1].pixelDifference);
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

function createRow(record) {
  function createNameElement(record) {
    let name = document.createElement("div");
    name.className = "row-cell name-cell";
    name.innerHTML = `${record.group}/${record.name}`;
    return name;
  }

  function createOperatingSystemElement(os) {
    let div = document.createElement("div");
    div.className = "row-cell";
    div.innerHTML = os;
    return div;
  }

  function createImageElement(record, os, urlFunc) {
    let div = document.createElement("div");
    div.className = "row-cell image-cell";
    let imageLink = document.createElement("a");
    imageLink.href = urlFunc(record.group, record.name, os);
    imageLink.target = "_blank";
    div.appendChild(imageLink);
    let image = document.createElement("img");
    image.src = urlFunc(record.group, record.name, os);
    imageLink.appendChild(image);
    return div;
  }

  function createReferenceElement(record, os) {
    return createImageElement(record, os, makeReferenceUrl)
  }

  function createCandidateElement(record, os) {
    return createImageElement(record, os, makeCandidateUrl)
  }

  function createDifferenceElement(record, os) {
    return createImageElement(record, os, makeDifferenceUrl)
  }

  function createScoreElement(score) {
    let div = document.createElement("div");
    div.className = "row-cell score-cell";
    div.innerHTML = `${score}`;
    return div;
  }

  function createDateElement(date) {
    let div = document.createElement("div");
    div.className = "row-cell date-cell";
    div.innerHTML = date;
    return div;
  }

  function createCommitElement(hash) {
    let div = document.createElement("div");
    div.className = "row-cell commit-cell";
    div.innerHTML = hash;
    return div;
  }



  let li = document.createElement("li");
  li.className = "testrow";

  li.appendChild(createNameElement(record));


  console.log(record);
  for (let [key, value] of Object.entries(record.data)) {
    console.log(key);
    console.log(value);
    console.log(value[value.length - 1]);
    li.appendChild(createOperatingSystemElement(key));
    li.appendChild(createReferenceElement(record, key));
    li.appendChild(createCandidateElement(record, key));
    li.appendChild(createDifferenceElement(record, key));
    li.appendChild(createScoreElement(value[value.length - 1].pixelDifference));
    li.appendChild(createDateElement(value[value.length - 1].timeStamp));
    li.appendChild(createCommitElement(value[value.length - 1].commitHash));
  }

  return li;
}

async function main() {
  let records = await fetch("/api/test-records").then(res => res.json());

  // Sort so that the test results with the highest pixel difference are first
  records.sort((a, b) => maxPixelDifference(a) < maxPixelDifference(b));

  let list = document.getElementById("list");
  for (let record of records) {
    let row = createRow(record);
    list.appendChild(row);
  }

}
