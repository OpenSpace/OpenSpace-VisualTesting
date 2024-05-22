async function generateComparison() {
  const records = await fetch("/api/test-records").then(res => res.json());

  // Get a unique list of all hardwares used in the tests
  const hardwares = []
  for (const record of records) {
    if (!hardwares.includes(record.hardware)) {
      hardwares.push(record.hardware);
    }
  }
  hardwares = hardwares.sort();

  const groupElem = document.getElementById("group");
  console.assert(groupElem, "No element 'group' found");
  const group = groupElem.value;

  const nameElem = document.getElementById("name");
  console.assert(nameElem, "No element 'name' found");
  const name = nameElem.value;

  const typeElem = document.getElementById("type");
  console.assert(typeElem, "No element 'type' found");
  const type = typeElem.value;

  const table = document.getElementById("splom");
  console.assert(table, "No element 'splom' found");

  // Remove all entries from the table
  while (table.lastElementChild) {
    table.removeChild(table.lastElementChild);
  }

  for (const i = 0; i < hardwares.length; i++) {
    const tr = document.createElement("tr");

    // First add the empty elements to the left of the diagonal
    for (const j = 0; j < i; j++) {
      tr.appendChild(document.createElement("td"));
    }

    // Second, add the diagonal element
    const a = document.createElement("a");
    a.href = `/api/result/${type}/${group}/${name}/${hardwares[i]}`;
    a.target = "_blank";
    td.appendChild(a);

    const img = document.createElement("img");
    img.src = `/api/result/${type}-thumbnail/${group}/${name}/${hardwares[i]}`;
    a.appendChild(img);

    const div = document.createElement("div");
    div.className = "info";
    div.appendChild(document.createTextNode(hardwares[i]));
    td.appendChild(div);

    // Third, add the comparison elements to the right of the diagonal
    for (const j = i + 1; j < hardwares.length; j++) {
      const td = document.createElement("td");
      td.className = "comparison";

      // The off-diagonal values are the interesting ones where we want to compare two
      // different hardwares
      const compareUrl = `/api/compare/${type}/${group}/${name}/${hardwares[i]}/${hardwares[j]}`;
      const response = await fetch(compareUrl);
      console.assert(response.status === 200);
      const pixelError = response.headers.get("result");

      const a = document.createElement("a");
      a.href = compareUrl;
      a.target = "_blank";
      td.appendChild(a);

      const img = document.createElement("img");
      img.src = compareUrl;
      a.appendChild(img);

      const div = document.createElement("div");
      div.className = "info";
      div.appendChild(document.createTextNode(diffDisplay(pixelError)));
      td.appendChild(div);

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  // Create the URL that can serve as a bookmark to the current page
  const url = document.getElementById("url");
  console.assert(url, "No element 'url' found");
  const loc = `${location.protocol}//${location.host}${location.pathname}`;
  url.href = `${loc}?group=${group}&name=${name}&type=${type}`
  url.innerHTML = `${loc}?group=${group}&name=${name}&type=${type}`
} // async function generateComparison()


async function main() {
  // The webpage can be called with up to three URL parameters that we use to fill in the
  // existing fields
  const params = new URLSearchParams(document.location.search);
  const group = params.get("group");
  const name = params.get("name");
  const type = params.get("type");
  if (group) {
    const groupElem = document.getElementById("group");
    console.assert(groupElem, "No element 'group' found");
    groupElem.value = group;
  }
  if (name) {
    const nameElem = document.getElementById("name");
    console.assert(nameElem, "No element 'name' found");
    nameElem.value = name;
  }
  if (type) {
    const typeElem = document.getElementById("type");
    console.assert(typeElem, "No element 'type' found");
    typeElem.value = type;
  }

  if (group && name) {
    // If the group and the name are provided, automatically generate the result
    generateComparison();
  }
} // async function main()
