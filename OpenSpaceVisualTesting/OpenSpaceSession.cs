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
        private static string OpenSpaceAppId = @"C:\os\OpenSpace\bin\RelWithDebInfo\OpenSpace.exe";

        public static string basePath = "";

        protected static WindowsDriver<WindowsElement> LaunchSession;
        protected static WindowsDriver<WindowsElement> DesktopSession;
        protected static WindowsDriver<WindowsElement> currentSession;

        public static void Setup(TestContext context, string asset = "default")
        {

            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            OpenSpaceSession.basePath = solutionDir.Substring(0, solutionDir.LastIndexOf("OpenSpaceVisualTesting\\OpenSpaceVisualTesting"));
            OpenSpaceAppId = basePath + "bin\\RelWithDebInfo\\OpenSpace.exe";
            // Launch a new instance of OpenSpace
             try
             {
                    // Create a new session to launch OpenSpace
                    DesiredCapabilities appCapabilities = new DesiredCapabilities();
                    appCapabilities.SetCapability("app", OpenSpaceAppId);
                    string configValues = "ScreenshotUseDate=false;ModuleConfigurations.Server={};ModuleConfigurations.WebBrowser.Enabled=false;";
                    string args = "/c --config \"" + configValues + "Asset='" + asset + "'\"";
                    appCapabilities.SetCapability("appArguments", args);
                    LaunchSession = new WindowsDriver<WindowsElement>(new Uri(WindowsApplicationDriverUrl), appCapabilities, TimeSpan.FromMinutes(2));
                    Assert.IsNotNull(LaunchSession);
                    currentSession = LaunchSession;
             }
             catch (Exception Ex)
             {
                Console.WriteLine(Ex.ToString());
                Thread.Sleep(TimeSpan.FromSeconds(3));
                DesiredCapabilities desktopappCapabilities = new DesiredCapabilities();
                desktopappCapabilities.SetCapability("app", "Root");
                DesktopSession = new WindowsDriver<WindowsElement>(new Uri("http://127.0.0.1:4723"), desktopappCapabilities);
                    
                    // Create session by attaching to os top level window
                    //DesiredCapabilities appCapabilities = new DesiredCapabilities();
                    //var OpenSpaceWindow = DesktopSession.FindElementByName("OpenSpace");
                    //var OpenSpaceTopLevelWindowHandle = OpenSpaceWindow.GetAttribute("NativeWindowHandle");
                    //OpenSpaceTopLevelWindowHandle = (int.Parse(OpenSpaceTopLevelWindowHandle)).ToString("x"); // Convert to Hex
                    //appCapabilities.SetCapability("appTopLevelWindow", OpenSpaceTopLevelWindowHandle);
                    //LaunchSession = new WindowsDriver<WindowsElement>(new Uri(WindowsApplicationDriverUrl), appCapabilities);

                currentSession = DesktopSession;
            }
            Thread.Sleep(TimeSpan.FromSeconds(30));
            //pause and load keys and set initial setup for all tests
            currentSession.Keyboard.SendKeys(Keys.Space + "`openspace.asset.add('util/testing_keybindings');" + Keys.Enter + "`");
            //hide ui for screenshots
//            currentSession.Keyboard.SendKeys(Keys.F6);
            currentSession.Keyboard.PressKey(Keys.Shift);
            currentSession.Keyboard.SendKeys(Keys.Tab);
            currentSession.Keyboard.ReleaseKey(Keys.Shift);
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
            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            string tmpPath = OpenSpaceSession.basePath + "\\screenshots\\OpenSpace_000000.png";
            string moveToPath = solutionDir + "\\TestGroups\\" + scenarioGroup + "\\Result" + scenarioGroup + scenarioName + ".png";

            if (File.Exists(moveToPath))
            {
                File.Delete(moveToPath);
            }

            File.Move(tmpPath, moveToPath);
        }

        public static void TearDown()
        {
            currentSession.Keyboard.SendKeys(Keys.Escape);
            Thread.Sleep(TimeSpan.FromSeconds(5));

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
