# OpenSpaceVisualTesting

## Description
The OpenSpaceVisualTesting code is used to run OpenSpace in a variety of profiles, and generate a screenshot image from a specific setup. A setup can specify the camera position, date/time, and property settings in order to render the exact screenshot. This screenshot will be compared to a standard result using an image difference tool. The intention is for developers to be alerted to any significant differences in the rendering.

Before it can be considered a standard, a screenshot must be approved by at least one developer. Standards are stored in TargetImages/{platform}, where platform is either "windows" or "linux". The filename convention is Target{profile}testname.png, where the profile name is in lowercase.
Each time a new rendering is generated, it is stored in ResultImages/{platform}.

## Usage for both Windows and Linux:
There are two modes of use:

### Automated Mode
`python3 testRun.py`

The test script will wait for the file specified by BuildFlag to be written to (the file is initially empty). When a Jenkins build is complete, the Jenkinsfile script will write the path of the built OpenSpace instance to this file. At that point, the sequence of running the tests will begin.

### Manual Mode
`python3 testRun.py -d /path/to/custom_directory/ [-t single_test_filename]`

If the absolute path to an OpenSpace directory is provided (the base dir not build subdir), then the script will immediately begin the sequence of image tests using that directory. If an optional .ostest filename is provided, then the script will run only that test.

## Configuration for running tests on a server:
### Jenkins
Configuring a Jenkins node to run this script is a necessary step, but is beyond the scope of this readme. Once Jenkins is configured with access to the node, it simply needs to run the Jenkinsfile script in the base directory of this repo. The 'test' stage in the Jenkinsfile writes the cloned OpenSpace base directory to the file which is specified by the environment variable `buildFlag`. This variable can be set in the Jenkins configuration page for the server node.
  
### Settings in testRun.py
The variables that need to be set for a specific server are at the top of **testRun.py**.
- `BuildFlag` specifies the absolute path of the file that Jenkins will write to in order to trigger a test. This file is normally blank (it will be cleared it once an image test run is complete). On startup, this script polls the file and only begins a test once the file contains the absolute path of an OpenSpace directory.
- `OsSyncDir` contains the absolute path of an OpenSpace SYNC directory that test runs will use. This prevents each new build from having to download all of the SYNC data.
- `OpenSpaceExeInOs` is the relative path to the executable from the base path.
- `Platform` must be either "windows" or "linux"

## Post-Run Steps
After completion of a test run, the image comparison operations will be performed. This basically involves running the **targetcompare.py** script on either all files (if a full run), or the individual test file specified.

Finally, the result image, diff image, and comparison score are updated in the web server location for the test summary page. This is where the current script is very specific to the individual server. Currently, the **linkResultsFromWorkingDir.sh** script runs (only on linux), and is specific to a particular linux server.

### Previous notes:
- installed nuget.exe and added to path
- installed WinAppDriver.exe
- added OPENSPACE_FILES to env variables
- added msbuild.exe and vstest.console.exe to path
- added nohup.exe to path (c:/pf/git/usr/bin)
- need .net 4.6.1 development mack
