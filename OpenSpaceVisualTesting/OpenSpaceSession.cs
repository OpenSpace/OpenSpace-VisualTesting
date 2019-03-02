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
        private const string OpenSpaceAppId = @"C:\os\OpenSpace\bin\RelWithDebInfo\OpenSpace.exe";

        public static string basePath = "";

        protected static WindowsDriver<WindowsElement> LaunchSession;
        protected static WindowsDriver<WindowsElement> DesktopSession;

        public static void Setup(TestContext context, string asset = "default")
        {

            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            OpenSpaceSession.basePath = solutionDir.Substring(0, solutionDir.LastIndexOf("OpenSpaceVisualTesting\\OpenSpaceVisualTesting"));

            // Launch a new instance of OpenSpace
            if (LaunchSession == null)
            {
                try
                {
                    // Create a new session to launch OpenSpace
                    DesiredCapabilities appCapabilities = new DesiredCapabilities();
                    appCapabilities.SetCapability("app", OpenSpaceAppId);
                    string args = "/c --config \"ScreenshotUseDate=false;Asset='" + asset + "'\"";
                    appCapabilities.SetCapability("appArguments", args);
                    LaunchSession = new WindowsDriver<WindowsElement>(new Uri(WindowsApplicationDriverUrl), appCapabilities, TimeSpan.FromMinutes(2));
                    Assert.IsNotNull(LaunchSession);

                }
                catch (Exception Ex)
                {

                    Thread.Sleep(TimeSpan.FromSeconds(3));

                    DesiredCapabilities desktopappCapabilities = new DesiredCapabilities();
                    desktopappCapabilities.SetCapability("app", "Root");
                    DesktopSession = new WindowsDriver<WindowsElement>(new Uri("http://127.0.0.1:4723"), desktopappCapabilities);


                    // Create session by attaching to os top level window
                    DesiredCapabilities appCapabilities = new DesiredCapabilities();
                    var OpenSpaceWindow = DesktopSession.FindElementByName("OpenSpace");
                    var OpenSpaceTopLevelWindowHandle = OpenSpaceWindow.GetAttribute("NativeWindowHandle");
                    OpenSpaceTopLevelWindowHandle = (int.Parse(OpenSpaceTopLevelWindowHandle)).ToString("x"); // Convert to Hex
                    appCapabilities.SetCapability("appTopLevelWindow", OpenSpaceTopLevelWindowHandle);
                    LaunchSession = new WindowsDriver<WindowsElement>(new Uri(WindowsApplicationDriverUrl), appCapabilities);
                }
                Thread.Sleep(TimeSpan.FromSeconds(30));


                //wait for startup



                //var allWindowHandles = session.WindowHandles;
                //session.SwitchTo().Window(allWindowHandles[0]);

                //session.LaunchApp();
                //ensure successful startup
                //Assert.IsNotNull(session.SessionId);
                //load keys and set initial setup for all tests
                DesktopSession.Keyboard.SendKeys(Keys.Space + "`openspace.asset.add('util/testing_keybindings');" + Keys.Enter + "`");
                DesktopSession.Keyboard.SendKeys(Keys.F6);
                DesktopSession.Keyboard.SendKeys(Keys.Space);
            }
        }

        public static void addAssetFile(string scenarioGroup, string scenarioName)
        {
            Thread.Sleep(TimeSpan.FromSeconds(1));
            string FilePath = "../../OpenSpaceVisualTesting/OpenSpaceVisualTesting/" + scenarioGroup + "/TestingAsset" + scenarioGroup + scenarioName;
            DesktopSession.Keyboard.SendKeys("`openspace.asset.add('" + FilePath + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(2));
        }

        public static void setTime(string time)
        {
            DesktopSession.Keyboard.SendKeys("`openspace.time.setTime('" + time + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(1));
        }

        public static void moveScreenShot(string scenarioGroup, string scenarioName)
        {
            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            string tmpPath = OpenSpaceSession.basePath + "\\screenshots\\OpenSpace_000000.png";
            string moveToPath = solutionDir + "\\" + scenarioGroup + "\\Result" + scenarioGroup + scenarioName + ".png";

            if (File.Exists(moveToPath))
            {
                File.Delete(moveToPath);
            }

            File.Move(tmpPath, moveToPath);
        }

        public static void TearDown()
        {
            // Close the application and delete the session
            if (DesktopSession != null)
            {
                LaunchSession.Close();
                LaunchSession.Quit();
                LaunchSession = null;
                DesktopSession.Close();
                DesktopSession.Quit();
                DesktopSession = null;
            }
        }

        [TestInitialize]
        public void TestInitialize()
        {
            //do anything here before each test?
        }

    }
}
