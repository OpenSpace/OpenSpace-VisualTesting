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
from test import Test
import openspace

# TODO: Retry openspace api connection until it works

test_base_dir = "tests/visual"

# Writes an overwrite file for the openspace.cfg
def write_configuration_overwrite(base_path, data_path):
  with open(f"{base_path}/openspace.cfg.override", "w") as f:
    f.write(f"Paths.SYNC = [[{data_path}/sync]]\n")
    f.write("ModuleConfigurations.GlobeBrowsing.MRFCacheEnabled = true\n")
    f.write(f"ModuleConfigurations.GlobeBrowsing.MRFCacheLocation = [[{data_path}/mrf]]\n")
    f.write("VersionCheckUrl = [[]]\n")
    f.write("CheckOpenGLState = true\n")
    f.write("ShutdownCountdown = 0.25\n")

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
  print(f"Running test: {testPath}")

  test = Test(testPath)
  group, name = test.get_group_and_name()

  start = time.perf_counter()
  process = subprocess.Popen(
    [
      executable,
      "--config", f"{os.getcwd()}/1920-1080.json",
      "--profile", test.profile,
      "--bypassLauncher"
    ],
    cwd=os.path.dirname(executable),
    stdout=subprocess.DEVNULL,
    stderr=subprocess.PIPE
  )

  # Add a sleeping time instead of repeatedly trying to reconnect. Starting up OpenSpace
  # in general takes longer than this, so we don't actually lose any time
  time.sleep(15)

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

    global commit
    version = await openspace.version()
    print(version)
    commit = version["Commit"]

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

  # Another wait while OpenSpace is shutting down
  time.sleep(2)

  error = process.stderr.read().decode()

  process.kill()
  end = time.perf_counter()
  runtime = end - start

  print(f"Folder: {screenshot_folder}")

  # We now have a list of screenshots in the `screenshot_folder` and can return them
  return {
    "group": group,
    "name": name,
    "files": glob.glob(f"{screenshot_folder}/*.png"),
    "timing": runtime,
    "commit": commit,
    "error": error
  }

def submit_candidate_image(group, name, hardware, timestamp, timing, hash, file, runner_id, error, url):
  res = requests.post(
    url,
    data = {
      "group": group,
      "name": name,
      "hardware": hardware,
      "runnerID": runner_id,
      "timestamp": timestamp,
      "timing": timing,
      "commitHash": hash
    },
    files = {
      "file": open(file, "rb"),
      "log": error
    }
  )
  print(res)


if __name__ == "__main__":
  global_start = time.perf_counter()
  with open("config.json") as f:
    config = json.load(f)

  parser = argparse.ArgumentParser()
  parser.add_argument(
    "-d", "--dir",
    dest="dir",
    type=str,
    help="Specifies the OpenSpace directory in which to run the tests",
    required=True
  )
  parser.add_argument(
    "-t", "--test",
    dest="test",
    type=str,
    help="A comma-separated list of specific tests that should be run. If this value is "
        "omitted, all tests will be run",
    required=False
  )
  parser.add_argument(
    "-uo", "--use-overwrite",
    dest="overwrite",
    type=bool,
    help="Determines whether the test script should create an overwrite file for the "
    "openspace.cfg file. The overwrite file will contain settings that we want all "
    "regularly executing test machines to have, such as using caching, reusing "
    "synchronization folders, etc. If this value is specified, the --overwrite-path "
    "also needs to be set to the location that is used as a base folder to store data "
    "that is retained between test runs",
    required=False
  )
  parser.add_argument(
    "-o", "--overwrite",
    dest="overwrite_path",
    type=str,
    help="This specifies the base path to the folder where data is stored that is reused "
      "between diffrent test runs. This value has to be specified if '--use-overwrite' "
      "is provided. If that option is not set, setting this value does not do anything",
    required=False
  )
  args = parser.parse_args()

  # Find the executable location
  if os.name == "nt":
    executable = f"{args.dir}/bin/RelWithDebInfo/OpenSpace.exe"
  else:
    executable = f"{args.dir}/bin/OpenSpace"

  if args.overwrite != None:
    if args.overwrite_path == None:
      raise Exception("Missing overwrite path value")

    write_configuration_overwrite(args.dir, args.overwrite_path)

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
      res = run_single_test(file, executable)
      timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
      for candidate in res["files"]:
        hardware = config["hardware"]
        runner_id = config["id"]
        url = config["url"]
        submit_candidate_image(
          res["group"],
          res["name"],
          hardware,
          timestamp,
          res["timing"],
          res["commit"],
          candidate,
          runner_id,
          res["error"],
          f"{url}/api/submit-test"
        )
        time.sleep(0.5)
  else:
    print(f"Running tests: {args.test}")
    tests = args.test.split(",")
    for test in tests:
      path = f"{args.dir}/{test_base_dir}/{test}.ostest"
      if not os.path.isfile(path):
        raise Exception(f"Could not find test {path}")

      timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
      res = run_single_test(path, executable)
      for candidate in res["files"]:
        hardware = config["hardware"]
        commit_hash = "abc"
        runner_id = config["id"]
        url = config["url"]
        submit_candidate_image(
          res["group"],
          res["name"],
          hardware,
          timestamp,
          res["timing"],
          res["commit"],
          candidate,
          runner_id,
          res["error"],
          f"{url}/api/submit-test"
        )
  global_end = time.perf_counter()
  print(f"Total time: {global_end - global_start}")

