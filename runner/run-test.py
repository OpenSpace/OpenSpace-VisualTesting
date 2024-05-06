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

import argparse
import asyncio
import datetime
import glob
import json
import os
import requests
import subprocess
import time

from test import *
import openspace

# Settings common to all test runs
async def setup_test_run(openspace):
  # We always want to start paused to prevent some timing-related inconsistencies
  await openspace.time.setPause(True)

  # Unless explicitly added, we don't want display elements that show variable content
  #  WebUI: Date and time
  #  Dashboard: Framerate
  #  ScreenLog: Log message retention
  #  Version: Contains the commit hash
  #  Camera: Not technically needed, but results in a cleaner time
  await openspace.setPropertyValueSingle("Modules.CefWebGui.Visible", False)
  await openspace.setPropertyValueSingle("Dashboard.IsEnabled", False)
  await openspace.setPropertyValueSingle("RenderEngine.ShowLog", False)
  await openspace.setPropertyValueSingle("RenderEngine.ShowVersion", False)
  await openspace.setPropertyValueSingle("RenderEngine.ShowCamera", False)



# testPath: The path to the ostest file that should be run
def run_single_test(testPath, executable):
  # group, name = get_group_and_name(testPath)
  # print(f"Running test {testPath} ({group}, {name})")
  test = Test(testPath)
  group, name = test.get_group_and_name()

  process = subprocess.Popen(
    [
      executable,
      "--config 1920-1080.json",
      f"--profile {test.profile}",
      "--bypassLauncher"
    ]
  )

  osApi = openspace.Api("localhost", 4681)

  async def internal_test_run(openspace):
    print(f"Running test {testPath}")
    await setup_test_run(openspace)
    await test.run(openspace)
    print("Finished running")

    # Give the screenshot writing some time to finish
    time.sleep(1)

    global screenshot_folder
    screenshot_folder = await openspace.absPath("${SCREENSHOTS}")

    await openspace.toggleShutdown()
    osApi.disconnect()
    disconnected.set()

  async def onConnect():
    await osApi.authenticate("")
    openspace = await osApi.singleReturnLibrary()
    asyncio.create_task(internal_test_run(openspace), name=f"Test {group}/{name}")

  osApi.onConnect(onConnect)
  disconnected = asyncio.Event()

  async def mainLoop():
    osApi.connect()
    await disconnected.wait()

  loop = asyncio.new_event_loop()
  loop.run_until_complete(mainLoop())

  process.kill()

  print(f"Folder: {screenshot_folder}")

  # We now have a list of screenshots in the `screenshot_folder` and can return them
  return [ group, name, glob.glob(f"{screenshot_folder}/*.png") ]

def submit_candidate_image(group, name, hardware, timestamp, hash, file, runner_id, url):
  res = requests.post(
    url,
    data = {
      "group": group,
      "name": name,
      "hardware": hardware,
      "runnerID": runner_id,
      "timestamp": timestamp,
      "commitHash": hash
    },
    files = { "file": open(file, "rb") }
  )
  print(res)


if __name__ == "__main__":
  with open("config.json") as f:
    config = json.load(f)

  parser = argparse.ArgumentParser()
  parser.add_argument(
    "-d", "--dir",
    dest="dir",
    type=str,
    help="Specifies the OpenSpace directory in which to run the tests",
    # required=True
  )
  parser.add_argument(
    "-t", "--test",
    dest="test",
    type=str,
    help="A comma-separated list of specific tests that should be run. If this value is "
        "omitted, all tests will be run",
    required=False
  )
  args = parser.parse_args()

  os.chdir(args.dir)

  # Find the executable location
  if os.name == "nt":
    executable = f"{args.dir}/bin/RelWithDebInfo/OpenSpace.exe"
  else:
    executable = f"{args.dir}/bin/OpenSpace"

  # If the executable does't exist, we need to build OpenSpace
  if not os.path.isfile(executable):
    print(f"Did not find OpenSpace executable: '{executable}'. Building OpenSpace")

    # Run CMake
    subprocess.run([ "cmake", "-S .", "-B ./build" ])

    # Then build the application
    subprocess.run([ "cmake", "--build build", "--parallel 8" ])
  else:
    print(f"Found OpenSpace executable '{executable}'")

  if args.test is None:
    print("Running all tests in OpenSpace folder")
    files = glob.glob(f"{args.dir}/{test_base_dir}/**/*.ostest", recursive=True)
    for file in files:
      # Normalize the path endings to always do forward slashes
      file = file.replace(os.sep, "/")
      group, name, candidates = run_single_test(file, executable)
      timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
      for candidate in candidates:
        hardware = config["hardware"]
        commit_hash = "abc"
        runner_id = config["id"]
        url = config["url"]
        submit_candidate_image(
          group,
          name,
          hardware,
          timestamp,
          commit_hash,
          candidate,
          runner_id,
          f"{url}/api/submit-test"
        )
  else:
    path = f"{args.dir}/{test_base_dir}/{args.test}.ostest"
    if not os.path.isfile(path):
      raise Exception(f"Could not find test {path}")

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    group, name, candidates = run_single_test(path, executable)
    for candidate in candidates:
      hardware = config["hardware"]
      commit_hash = "abc"
      runner_id = config["id"]
      url = config["url"]
      submit_candidate_image(
        group,
        name,
        hardware,
        timestamp,
        commit_hash,
        candidate,
        runner_id,
        f"{url}/api/submit-test"
      )
