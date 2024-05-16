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

      if (i == j) {
        // This is the diagonal and we want to show the actual image
        let a = document.createElement("a");
        a.href = `/api/result/reference/${group}/${name}/${hardwares[i]}`;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = `/api/result/reference-thumbnail/${group}/${name}/${hardwares[i]}`;
        a.appendChild(img);
      }
      else {
        let a = document.createElement("a");
        a.href = `/api/compare/reference/${group}/${name}/${hardwares[i]}/${hardwares[j]}`;
        a.target = "_blank";
        td.appendChild(a);

        let img = document.createElement("img");
        img.src = `/api/compare/reference/${group}/${name}/${hardwares[i]}/${hardwares[j]}`;
        a.appendChild(img);
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}
