# VisualTesting
The visual testing framework is split into three services:
  1. Runner: This set of scripts is responsible to render test images, collect necessary build information (for example the commit hash), and send everything to the backend for processing
  1. Backend: Receives the test images from multiple runners, performs the image comparison and collects it into a form that is usable and displayable by the frontend
  1. Frontend: A website that shows the results of previous runs

