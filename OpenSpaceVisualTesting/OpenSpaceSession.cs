using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium.Appium.Windows;
using OpenQA.Selenium.Remote;
using OpenQA.Selenium;
using System;
using System.Threading;
using System.IO;

namespace OpenSpaceVisualTesting
{
    public class OpenSpaceSession
    {
        protected const string WindowsApplicationDriverUrl = "http://127.0.0.1:4723";
        private static string OpenSpaceAppId = @"";

        public static string basePath = "";

        protected static WindowsDriver<WindowsElement> LaunchSession;
        protected static WindowsDriver<WindowsElement> DesktopSession;
        protected static WindowsDriver<WindowsElement> currentSession;

        public static void Setup(string asset = "default")
        {
            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            OpenSpaceSession.basePath = solutionDir.Substring(0, solutionDir.LastIndexOf("OpenSpaceVisualTesting\\OpenSpaceVisualTesting")) + "OpenSpace\\";
            OpenSpaceAppId = basePath + "bin\\RelWithDebInfo\\OpenSpace.exe";
            // Launch a new instance of OpenSpace
             try
             {
                // Create a new session to launch OpenSpace
                DesiredCapabilities appCapabilities = new DesiredCapabilities();
                appCapabilities.SetCapability("app", OpenSpaceAppId);
                appCapabilities.SetCapability("appWorkingDir", OpenSpaceSession.basePath + "bin\\RelWithDebInfo");
                string configValues = "ScreenshotUseDate=false;ModuleConfigurations.Server={};";
                configValues += "ModuleConfigurations.WebBrowser.Enabled=false;";
                configValues += "ModuleConfigurations.WebGui={};";
                configValues += "ModuleConfigurations.GlobeBrowsing.WMSCacheEnabled=true;";

                string args = "--config \"" + configValues + "Profile='" + asset + "'\"";
                appCapabilities.SetCapability("appArguments", args);
                LaunchSession = new WindowsDriver<WindowsElement>(new Uri(WindowsApplicationDriverUrl), appCapabilities, TimeSpan.FromMinutes(2));
                Assert.IsNotNull(LaunchSession);
                currentSession = LaunchSession;
             }
             catch (Exception Ex)
             {
                Console.WriteLine(Ex.ToString());
                currentSession = DesktopSession;
            }
            Thread.Sleep(TimeSpan.FromSeconds(30));

            currentSession.Keyboard.PressKey(Keys.Shift);
            currentSession.Keyboard.SendKeys(Keys.Tab);
            currentSession.Keyboard.ReleaseKey(Keys.Shift);
        }

        public static void sendScript(string script)
        {
            Thread.Sleep(TimeSpan.FromSeconds(1));
            currentSession.Keyboard.SendKeys("`" + script + Keys.Enter + "`");
        }

        public static void sendKeys(string keys)
        {
            Thread.Sleep(TimeSpan.FromSeconds(1));
            switch (keys)
            {
                case "F7":
                    currentSession.Keyboard.SendKeys(Keys.F7);
                    break;
                case "F11":
                    currentSession.Keyboard.SendKeys(Keys.F11);
                    break;
                default:
                    currentSession.Keyboard.SendKeys(keys);
                    break;
            }
        }

        public static void addAssetFile(string scenarioGroup, string scenarioName)
        {
            Thread.Sleep(TimeSpan.FromSeconds(1));
            string FilePath = "../../OpenSpaceVisualTesting/OpenSpaceVisualTesting/TestGroups/" + scenarioGroup + "/TestingAsset" + scenarioGroup + scenarioName;
            currentSession.Keyboard.SendKeys("`openspace.asset.add('" + FilePath + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(2));
        }

        public static void setTime(string time)
        {
            currentSession.Keyboard.SendKeys("`openspace.time.setTime('" + time + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(1));
        }

        public static void moveScreenShot(string scenarioGroup, string scenarioName)
        {
            Thread.Sleep(TimeSpan.FromSeconds(1));
            currentSession.Keyboard.SendKeys(Keys.F12);
            Thread.Sleep(TimeSpan.FromSeconds(1));
            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            string tmpPath = OpenSpaceSession.basePath + "\\screenshots\\OpenSpace_000000.png";
            string moveToPath = solutionDir + "\\TargetImages\\win64\\Result" + scenarioGroup + scenarioName + ".png";

            if (File.Exists(moveToPath))
            {
                File.Delete(moveToPath);
            }

            File.Move(tmpPath, moveToPath);
        }

        public static void TearDown()
        {
            currentSession.Keyboard.SendKeys(Keys.Escape);
            Thread.Sleep(TimeSpan.FromSeconds(10));

            // Close the application and delete the session
            if (DesktopSession != null)
            {
                DesktopSession.Quit();
                DesktopSession = null;
            }

            if (LaunchSession != null)
            {
                LaunchSession.Quit();
                LaunchSession = null;
            }

            currentSession = null;
        }

        [TestInitialize]
        public void TestInitialize()
        {
            //do anything here before each test?
        }

    }
}
