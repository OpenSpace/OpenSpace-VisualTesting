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
import glob
import json
import os
import subprocess

from test import *
import openspace


# testPath: The path to the ostest file that should be run
def run_single_test(testPath: str):
  # group, name = get_group_and_name(testPath)
  # print(f"Running test {testPath} ({group}, {name})")
  Test(testPath)
  None



if __name__ == "__main__":
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
      run_single_test(file)
  else:
    path = f"{args.dir}/{test_base_dir}/${args.test}"
    if not os.path.isfile(path):
      raise Exception(f"Could not find test {path}")

    run_single_test(path)





