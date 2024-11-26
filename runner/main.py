##########################################################################################
#                                                                                        #
# OpenSpace Visual Testing                                                               #
#                                                                                        #
# Copyright (c) 2024                                                                     #
#                                                                                        #
# Permission is hereby granted, free of charge, to any person obtaining a copy of this   #
# software and associated documentation files (the "Software"), to deal in the Software  #
# without restriction, including without limitation the rights to use, copy, modify,     #
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to     #
# permit persons to whom the Software is furnished to do so, subject to the following    #
# conditions:                                                                            #
#                                                                                        #
# The above copyright notice and this permission notice shall be included in all copies  #
# or substantial portions of the Software.                                               #
#                                                                                        #
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,    #
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A          #
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT     #
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF   #
# CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE   #
# OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                          #
##########################################################################################

import datetime
#from datetime import datetime, timedelta
import glob
import json
import sys
import os
import requests
import shutil
import time
from testsuite.constants import test_base_dir
from testsuite.openspace import write_configuration_overwrite, run_single_test
from testsuite.test import TestResult

def submit_image(result: TestResult, hardware: str, timestamp: str, file: str,
                 runner: str, url: str):
  """
  Submits a new candidate image to the provided URL. This function logs a method
  indicating whether the image submission succeeded
  """
  res = requests.post(
    url,
    data = {
      "group": result.group,
      "name": result.name,
      "hardware": hardware,
      "runnerID": runner,
      "timestamp": timestamp,
      "timing": result.timing,
      "commitHash": result.commit
    },
    files = {
      "file": open(file, "rb"),
      "log": result.error
    }
  )
  if res.status_code != 200:
    print(f"Image submission failed with error {res.status_code}")
    print(res.text)
  else:
    print("Image submitted successfully")


def store_image(result: TestResult, file: str):
  """
  Stores the images of the provided `TestResult` locally by creating the necessary folders
  if they don't exist and then saving the image. Only the latest test result are stored.
  """
  dest_folder = f"tests/{result.group}"
  os.makedirs(dest_folder, exist_ok=True)
  destination = f"{dest_folder}/{result.name}.png"
  print(f"Copying file {file} -> {destination}")
  shutil.copy(file, destination)

def generate_commands(start_time, resolution, end_time=None):
    """
    Generates a list of commands for the given interval and resolution.

    Args:
    - start_time (str): Start time in ISO format (e.g., "2012-07-11T00:00:00.00").
    - resolution (str): Time resolution ('minute', 'hour').
    - end_time (str, optional): End time for the sequence, in ISO format (e.g., "2012-07-25T23:00:00.00").

    Returns:
    - dict: A dictionary with the profile and commands list in JSON format.
    """
    # Convert start_time and end_time to datetime objects
    start_time = datetime.datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%S.%f")
    if end_time:
        end_time = datetime.datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%S.%f")

    commands = [{"type": "wait", "value": 10},
                {"type": "time", "value": start_time.strftime("%Y-%m-%dT%H:%M:%S.%f")},
                {"type": "wait", "value": 45}]

    # Adding screenshots based on interval and resolution
    current_time = start_time
    while not end_time or current_time <= end_time:
        commands.append({
            "type": "time",
            "value": current_time.strftime("%Y-%m-%dT%H:%M:%S.%f")
        })
        commands.append({"type": "screenshot"})

        # Adjust the current time based on resolution
        if resolution == "hour":
            current_time += datetime.timedelta(hours=2)
        elif resolution == "minute":
            current_time += datetime.timedelta(minutes=6)
        else:
            raise ValueError("Resolution must be 'hour' or 'minute'")

    json_data = {
        "profile": "solarstorm2012",
        "commands": commands
    }

    return json_data

def write_json_to_file(data, filename=f"ostestfiles/commands.ostest"):
    """Writes the generated JSON data to a file."""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)


# Directly define parameters
open_space_dir = "C:/Users/alundkvi/Documents/work/OpenSpace"

start_time = "2012-07-14T15:00:00.00"
resolution = "minute"
end_time = "2012-07-15T15:05:00.00"

commands = generate_commands(start_time, resolution, end_time)
write_json_to_file(commands)

global_start = time.perf_counter()

# Load configuration from config.json if it exists
if os.path.exists("config.json"):
    submit_images = True
    with open("config.json") as f:
        config = json.load(f)
        url = config["url"]
        submit_url = f"{url}/api/submit-test"
        hardware = config["hardware"]
        runner_id = config["id"]
else:
    print("No 'config.json' provided. Test results will be stored locally instead")
    submit_images = False

# Find the executable location and its name
if os.name == "nt":
    executable = f"{open_space_dir}/bin/RelWithDebInfo/OpenSpace.exe"
else:
    executable = f"{open_space_dir}/bin/OpenSpace"

if not os.path.exists(executable):
    raise Exception(f"Could not find executable '{executable}'")

# Running the specific test
path = "ostestfiles/commands.ostest"
if not os.path.isfile(path):
    raise Exception(f"Could not find test '{path}'")

timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
result = run_single_test(path, executable)
for file in result.files:
    if submit_images:
        submit_image(result, hardware, timestamp, file, runner_id, submit_url)
    else:
        store_image(result, file)
    time.sleep(0.5)

global_end = time.perf_counter()
print(f"Total time for the test: {global_end - global_start}")