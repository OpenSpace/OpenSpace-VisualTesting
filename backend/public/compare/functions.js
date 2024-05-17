async function generateComparison() {
  let records = await fetch("/api/test-records").then(res => res.json());

  // Get a unique list of all hardwares used in the tests
  let hardwares = []
  for (let record of records) {
    if (!hardwares.includes(record.hardware)) {
      hardwares.push(record.hardware);
    }
  }
  hardwares = hardwares.sort();

  let groupElem = document.getElementById("group");
  console.assert(groupElem, "No element 'group' found");
  let group = groupElem.value;

  let nameElem = document.getElementById("name");
  console.assert(nameElem, "No element 'name' found");
  let name = nameElem.value;

  let typeElem = document.getElementById("type");
  console.assert(typeElem, "No element 'type' found");
  let type = typeElem.value;

  let table = document.getElementById("splom");
  console.assert(table, "No element 'splom' found");

  // Remove all entries from the table
  while (table.lastElementChild) {
    table.removeChild(table.lastElementChild);
  }

  for (let i = 0; i < hardwares.length; i++) {
    let tr = document.createElement("tr");

    for (let j = 0; j < i; j++) {
      tr.appendChild(document.createElement("td"));
    }
    for (let j = i; j < hardwares.length; j++) {
      let td = document.createElement("td");
      td.className = "comparison";

      if (i === j) {
        // This is the diagonal and we want to show the actual image
        let a = document.createElement("a");
        a.href = `/api/result/${type}/${group}/${name}/${hardwares[i]}`;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = `/api/result/${type}-thumbnail/${group}/${name}/${hardwares[i]}`;
        a.appendChild(img);

        let div = document.createElement("div");
        div.className = "info";
        div.appendChild(document.createTextNode(hardwares[i]));
        td.appendChild(div);
      }
      else {
        // The off-diagonal values are the interesting ones where we want to compare two
        // different hardwares
        let compareUrl = `/api/compare/${type}/${group}/${name}/${hardwares[i]}/${hardwares[j]}`;
        let response = await fetch(compareUrl);
        console.assert(response.status === 200);
        let pixelError = response.headers.get("result");

        let a = document.createElement("a");
        a.href = compareUrl;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = compareUrl;
        a.appendChild(img);

        let div = document.createElement("div");
        div.className = "info";
        div.appendChild(document.createTextNode(diffDisplay(pixelError)));
        td.appendChild(div);
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  // Create the URL that can serve as a bookmark to the current page
  let url = document.getElementById("url");
  console.assert(url, "No element 'url' found");
  let loc = `${location.protocol}//${location.host}${location.pathname}`;
  url.href = `${loc}?group=${group}&name=${name}&type=${type}`
  url.innerHTML = `${loc}?group=${group}&name=${name}&type=${type}`
} // async function generateComparison()


async function main() {
  // The webpage can be called with up to three URL parameters that we use to fill in the
  // existing fields
  const params = new URLSearchParams(document.location.search);
  let group = params.get("group");
  let name = params.get("name");
  let type = params.get("type");
  if (group) {
    let groupElem = document.getElementById("group");
    console.assert(groupElem, "No element 'group' found");
    groupElem.value = group;
  }
  if (name) {
    let nameElem = document.getElementById("name");
    console.assert(nameElem, "No element 'name' found");
    nameElem.value = name;
  }
  if (type) {
    let typeElem = document.getElementById("type");
    console.assert(typeElem, "No element 'type' found");
    typeElem.value = type;
  }

  if (group && name) {
    // If the group and the name are provided, automatically generate the result
    generateComparison();
  }
} // async function main()
