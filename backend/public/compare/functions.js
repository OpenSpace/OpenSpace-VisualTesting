function diffDisplay(diff) {
  // Round the error to 3 digits past the decimal
  return `${Math.round(diff * 100000) / 1000}%`;
} // function diffDisplay(diff)

async function generateComparison() {
  let records = await fetch("/api/test-records").then(res => res.json());
  let hardwares = []
  for (let record of records) {
    if (!hardwares.includes(record.hardware)) {
      hardwares.push(record.hardware);
    }
  }
  hardwares = hardwares.sort();

  let group = document.getElementById("group").value;
  let name = document.getElementById("name").value;
  let type = document.getElementById("type").value;
  let table = document.getElementById("splom");
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

      if (i == j) {
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
        let compareUrl = `/api/compare/${type}/${group}/${name}/${hardwares[i]}/${hardwares[j]}`;
        let response = await fetch(compareUrl);
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
}
