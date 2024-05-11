async function clearElement(elem) {
  elem.innerHTML = "";
}

async function updateReferenceUi() {
  let name = document.getElementById("updateReferenceName").value;
  let group = document.getElementById("updateReferenceGroup").value;
  let hardware = document.getElementById("updateReferenceHardware").value;

  if (name == "" || group == "" || hardware == "")  return;

  let img = document.getElementById("updateReferenceImage");
  let btn = document.getElementById("updateReferenceButton");

  let src = `/api/result/candidate/${group}/${name}/${hardware}`
  let res = await fetch(src);
  if (res.status == 200) {
    img.src = src;
    btn.innerHTML  = "Submit";
    btn.disabled = false;
  }
  else {
    img.src = "transparent.png";
    btn.innerHTML  = "Invalid test";
    btn.disabled = true;
  }

}

async function updateReference() {
  let admin = document.getElementById("adminToken").value;
  let name = document.getElementById("updateReferenceName").value;
  let group = document.getElementById("updateReferenceGroup").value;
  let hardware = document.getElementById("updateReferenceHardware").value;

  let res = await fetch(
    "/api/update-reference",
    {
      method: "POST",
      body: JSON.stringify({
        adminToken: admin,
        name: name,
        group: group,
        hardware: hardware
      }),
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  if (res.status != 200) {
    let error = document.getElementById("updateReferenceError");
    error.innerHTML = ""

    let text = await res.text()

    if (text != "") {
      let errorMsg = JSON.parse(text).error;
      error.appendChild(document.createTextNode(`${res.status}: ${errorMsg}`));
    }
    else {
      error.appendChild(document.createTextNode(`Error with the request ${res.status}`));
    }
  }
}

async function updateDiffThreshold() {
  let admin = document.getElementById("adminToken").value;
  let value = document.getElementById("updateThresholdNumber").value;

  let res = await fetch(
    "/api/update-diff-threshold",
    {
      method: "POST",
      body: JSON.stringify({
        adminToken: admin,
        threshold: Number(value)
        // threshold: value
      }),
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  let error = document.getElementById("updateThresholdError");
  error.innerHTML = ""

  if (res != 200) {
    let text = await res.text()
    if (text != "") {
      let errorMsg = JSON.parse(text).error;
      error.appendChild(document.createTextNode(`${res.status}: ${errorMsg}`));
    }
    else {
      error.appendChild(document.createTextNode(`Error with the request ${res.status}`));
    }
  }
}
