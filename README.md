# VisualTesting
The visual testing infrastructure is split into two components that are both described in this document. The goal for this infrastructure is to be able to consistently run regression tests against OpenSpace to ensure that the visual quality of the `master` branch does not change over time, thus preventing bugs. It is also useful as a repository of in-game images from OpenSpace that can be used to show what features OpenSpace has.

Important terms to understand the testing results:

| Term | Description |
| ---- | ----------- |
| Group | A group combines several tests into a logical unit where it makes sense that individual tests are collected. Groups, for example, can be individual profiles or usage scenarios, or describe the intended usecase for the generated images. The group names in general are extracted from the folder structure of the visual test files in the OpenSpace folder. |
| Name | The name of an individual test inside a group. The combination of "Group" + "Name" should be considered the full name of the test, so if the group mentioned "Apollo 11", there is no need to separately mention "Apollo 11" in the name of the test again. The name of a test has to be unique within a group but can be reused between groups. For example, there can only be one "landing" test inside the "Apollo 11" group, but there might be a "landing" test inside both the "Apollo 12" and the "Apollo 11" groups. |
| Hardware | The description of a hardware setup that was used to run a specific test. For regular test runners, this name should be of the form "operating system"-"graphics card vendor", for example "windows-nvidia", "linux-nvidia", "windows-amd", etc. |
| Reference image | A known, good image that has been vetted as a reference for future images. Any future deviation from this reference image will be considered an error. It is possible to update the reference image to the latest candidate image on the webpage using an administrative password. There is always at least one reference image for each group+name+hardware combination, but multiple reference are kept over time, if legitimate changes to the reference image had to be made. |
| Candidate image | A newly created image that is tested against the current reference image. This test generates a difference image and an error score. |
| Difference image | An image that shows the pixel differences between the reference image and a candidate image. |


## Runner
The _Runner_ is a Python script that will execute and possibly submit test results to a regression server. To execute the _Runner_, the `requests` and `openspace-api` PIP packages need to be installed, for example using `pip install requests && pip install openspace-api`. The `main.py` inside the `runner` folder can then be called to run individual tests. Executing `main.py --help` will return all commandline parameters that can be used to customize the program execution. The available commandline arguments are as follows:

| Parameter | Description |
| --------- | ----------- |
| `--dir` | Points to the base folder of the OpenSpace version that is used to execute the tests. There needs to be a compiled version of OpenSpace available in that folder such that `bin/RelWithDebInfo/OpenSpace.exe` (on Windows) or `bin/OpenSpace` (on Linux) exists and is executable. The base test folder will also be taken from this parameter as `tests/visual`. |
| `--test` | A comma-separated list of the group/name combination of the tests that should be run. The group of a test is all of the folders relative to the `tests/visual` server concatenated with the name of the test being the filename. For example a test in `tests/visual/mars/insight/landing.ostest` would have the group "mars/insight" and the name "landing". |
| `--overwrite` | This path can be provided to store commonly used files that can be useful to keep between test runs. Right now, this is only used for the Sync folder and the MRF cache used by OpenSpace.|

Example: `python main.py --dir C:/Development/OpenSpace --test default/earth,rosetta/model default --overwrite C:/Development/TestCache`

Additionally, a `config.json` must be provided if tests are to be submitted to the regression server. The `config.sample.json` provides a stub that can be used as the starting point for configuring the JSON file.

If no `config.json` is found, all tests are run locally and are not submitted to the regression server. Instead all resulting images are stored in a `tests` folder whose subfolders mimick the folder structure found in the `visualtests` folder, resulting in images that can be manually inspected.

If a `config.json` is provided, it requires the specification of the URL at which the regression server is located, the hardware string under which the test images are submitted, and a runner id that has to be provided by the administrator of the regression test server. If all these values are correct, test images are directly submitted to the regression server and be can used to compare against a reference image.

### Helper scripts
The runner folder also contains useful helper scripts that can be used to communicate with the image testing server.

### copy_server
This script can be used to copy the results from an existing image testing (source) server to a new instance (destination). The existing results will be submitted to the destination server as if they had been done by running a test, so the result will be indistinguishable for the destination server. The commandline arguments are `--source` for the URL of the server from which the results should be copied, `--destination` for the URL to which the results should be copied, and `--runner` which is a valid runner id for the **destination** server. No credentials for the source server are needed.

Example: `python copy_server.py --source https://regression.openspaceproject.com --destination http://localhost:8000 --runner runner-id`


## Backend
The _backend_ is a Typescript-based server that is receiving individual tests, creating comparison images, and making past tests available via a website. By default this server is located at [https://regression.openspaceproject.com](https://regression.openspaceproject.com), but it is also possible to run a local copy of it.

To run the regression server locally:

  1. Run `npm install` in the `backend` folder to install all required packages
  1. Run `tsc` in the `backend` folder to compile Typescript into Javascript
  1. Duplicate the `config.sample.json` into `config.json`
  1. Run `npm run server` to start the hosting of the regression server
  1. Visit `localhost:8000` (or whichever port was configured in the `config.json`) and an empty webpage should be visible

To be able to receive test images, at least one `runners` id in the `config.json` has to be configured, which then also has to be provided in the _Runner_'s `config.json`.

The webpage provides access to the previous test results. The main panel is the table view in the center that shows all tests that have been run sorted by their error score. For each test, the latest score, group, name, hardware, how long it took to run the test, which commit of OpenSpace was used to generated the test, the timestamp at which the test was run, and the reference, candidate, and difference images for the latest test are shown. By clicking on an entry, the entire test history is available. In this detail view the most recent image (on the left) also has an "Upgrade Candidate to Reference" image button, which will set the latest Candidate Image to be the new Reference image. **Note**: This should only be done when it is clear that a change in OpenSpace _improved_ the rendering. It should not be done just to silence an error message. Also note that this action can only be done after entering the "Admin" password in the header at the top of the site.

The "Hardware Compare" link in the top right gives the ability to compare either the latest reference or candidate images between hardware setups. On that page, the "Group" and the "Name" of a test is entered, and the server will then generate pairwise comparison images for each hardware setup that has run that specific test. This can be useful to ensure not only a temporal stability for individual hardware setups, but also that, for example, the Windows version of OpenSpace generates the same result as the Linux version.


### API
The backend has a number of API calls available that can be used to query the previous tests, submit new tests, or just run tests manually. A full list and explanations of all API calls is available at the `/api` endpoint (see [API](https://regression.openspaceproject.com/api)).


### Folder structure
The server stores all of the test results inside a folder whose location is specified by the `data` value in the `config.json`. In the `config.sample.json`, this folder is also called `data`. The server will create three folders and one text file inside the `data` folder.

  - `audit.txt`: This file contains a list of all of the high-level functions that the server has been asked to perform. These entries are time-stamped and are stored to reason about the changes that have been made to the server, for example by submitting a new test, upgrading a candidate image to a reference image, etc.
  - `temporary`: This temporary folder will contain files that are only valid for a limited time and include, for example, comparison images between different hardware setups, that are generated, returned, and then cached for a short time. In general it is always safe to delete any file inside this folder and the server will continue to function.
  - `reference`: This folder contains all of the reference images for the different tests. Each test is stored in subfolders according to their group and their name, with the reference images stored in the leaf folder with the timestamp as a filename. For example for the "apollo-8" group and the "earthrise" name, a potential reference image would be `data/reference/apollo-8/earthrise/20240101T120000Z.png` and a later reference image would be `data/reference/apollo-8/earthrise/20240102T120000Z.png`. Additionally this folder contains a `ref.txt` which contains the name of the reference file that is currently used as the "active" reference image used to compare candidate images to. Lastly, each reference image also has a `-thumbnail` version that is a reduced-size version of the reference image that the server utilizes in overview pages, where a full resolution is not required. The scale factor used for the thumbnail images is configured in the `config.json`.
  - `tests`: This folder contains all of the candidate images and derived data products. Subfolders here are of the form `hardware/group/name/timestamp`, which is a folder that then contains all of the necessary files for that specific test run. In general this folder contains between 2 and 5 different files. At a minimum, the folder contains a `data.json` file which stores information about the test run. This information can for example be the pixel error, the timestamp, how long the test took to run, the commit hash, the candidate image, the resulting difference image from the test, and the name of the reference image that was the active image at the time when the test was submitted. The `candidate.png` is the submitted candidate picture, a `candidate-thumbnail.png` is a reduced-size version of the submitted image. The `difference.png` is an image that shows the pixel difference between the candidate image and the reference image. The image is grayscale where two pixels are the same, and red where the pixels disagree. Similarly, the `difference-thumbnail.png` is a reduced-size version of the `difference.png`. In case the candidate image is a duplicate of a previous image (for example if a test run results in exactly the same result multiple times), the `candidate.png` is not stored multiple times, but a newer test instead will refer to the first instance the candidate image was submitted. Similarly, the difference image is not stored if it is pixel-identical to an already existing difference image.
