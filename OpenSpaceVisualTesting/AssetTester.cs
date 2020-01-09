using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using System.Threading;
using System;
using System.Diagnostics;
using System.IO;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace OpenSpaceVisualTesting
{
    [TestClass]
    public class AssetTester
    {
        public static string testDirName = "\\tests\\visual\\";

        [TestMethod]
        public void RunAssetTests()
        {
            string[] dirs = Directory.GetDirectories(GetTestDir());
            foreach (string dir in dirs)
            {
                ProcessTestDirectory(dir);
            }
        }

        [ClassInitialize]
        public static void ClassInitialize(TestContext context)
        {
            
        }

        public static string GetTestDir()
        {
            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            string openspaceDir = solutionDir.Substring(0, solutionDir.LastIndexOf("OpenSpaceVisualTesting\\OpenSpaceVisualTesting")) + "OpenSpace";
            Console.WriteLine("test dir '{0}'.", openspaceDir + testDirName);
            return openspaceDir + testDirName;
        }

        // Process all files in the directory passed in, recurse on any directories 
        // that are found, and process the files they contain.
        public static void ProcessTestDirectory(string targetDirectory)
        {
            string testGroup = targetDirectory.Substring(targetDirectory.LastIndexOf(testDirName) + testDirName.Length);

            // Process the list of files found in the directory.
            string[] fileEntries = Directory.GetFiles(targetDirectory, "*.ostest");
            for (int i = 0; i < fileEntries.Length; ++i)
            {
                ProcessTestFile(fileEntries[i], testGroup);
            }

            // Recurse into subdirectories of this directory.
            //string[] subdirectoryEntries = Directory.GetDirectories(targetDirectory);
            //foreach (string subdirectory in subdirectoryEntries)
            //    ProcessTestDirectory(subdirectory);
        }

        // Insert logic for processing found files here.
        public static void ProcessTestFile(string path, string testGroup)
        {
            Console.WriteLine("Starting Test file '{0}'.", path);

            string testName = path.Substring(path.LastIndexOf("\\") + 1);
            string scenarioName = testName.Substring(0, testName.LastIndexOf(".ostest"));

            Console.WriteLine("testName '{0}.{1}'.", testGroup, scenarioName);
            if (scenarioName != "MarsHiRISE")
            {
                return;
            }
            Console.WriteLine("Starting asset '{0}'.", testGroup);

            OpenSpaceSession.Setup(testGroup.ToLower());

            using (StreamReader reader = new StreamReader(path))
            {
                string json = reader.ReadToEnd();
                List<TestStep> testSteps = JsonConvert.DeserializeObject<List<TestStep>>(json);
                foreach (var step in testSteps)
                {
                    switch (step.type)
                    {
                        case "script":
                            OpenSpaceSession.sendScript(step.value);
                            break;
                        case "wait":
                            Thread.Sleep(TimeSpan.FromSeconds(int.Parse(step.value)));
                            break;
                        case "screenshot":
                            if (step.value.Length < 1)
                            {
                                step.value = scenarioName;
                            }
                            OpenSpaceSession.moveScreenShot(testGroup, step.value);
                            break;
                        case "time":
                            string timeScript = "openspace.time.setTime('" + step.value + "');";
                            OpenSpaceSession.sendScript(timeScript);
                            break;
                        case "keys":
                            OpenSpaceSession.sendKeys(step.value);
                            break;
                        case "pause":
                            string pauseScript = "openspace.time.setPause(" + step.value + ");";
                            OpenSpaceSession.sendScript(pauseScript);
                            break;
                        case "navigationstate":
                            string navScript = "openspace.navigation.setNavigationState(" + step.value + ");";
                            OpenSpaceSession.sendScript(navScript);
                            break;
                        case "recording":
                            string recordingScript = "openspace.sessionRecording.startPlayback('" + GetTestDir();
                            recordingScript += "\\" + testGroup + "\\" + step.value + ".osrecording')";
                            recordingScript = recordingScript.Replace("\\", "/");
                            //Console.WriteLine("recordingScript '{0}'.", recordingScript);
                            OpenSpaceSession.sendScript(recordingScript);
                            break;
                    }
                    Console.WriteLine("{0} {1}", step.type, step.value);
                }
            }
            OpenSpaceSession.TearDown();
            Console.WriteLine("Processed test '{0}'.", path);
        }

        [ClassCleanup]
        public static void ClassCleanup()
        {
            
        }

        [TestInitialize]
        public void TestInitialize()
        {
            //do anything here before each test?
        }
    }
}

public class TestStep
{
    public string type;
    public string value;
}