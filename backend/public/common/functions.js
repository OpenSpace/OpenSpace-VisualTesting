function diffDisplay(diff) {
  console.assert(typeof(diff) === "number", `Diff ${diff} is not a number`);

  // Round the error to 3 digits past the decimal
  return `${Math.round(diff * 100000) / 1000}%`;
} // function diffDisplay(diff)


function timingDisplay(timing) {
  console.assert(typeof(timing) === "number", `Timing ${timing} is not a number`);

  // Round the riming to 3 digits past the decimal
  return `${Math.round(timing * 1000) / 1000}s`;
} // function timingDisplay(timing)

