function diffDisplay(diff) {
  // Round the error to 3 digits past the decimal
  return `${Math.round(diff * 100000) / 1000}%`;
} // function diffDisplay(diff)


function timingDisplay(timing) {
  // Round the riming to 3 digits past the decimal
  return `${Math.round(timing * 1000) / 1000}s`;
} // function timingDisplay(timing)
