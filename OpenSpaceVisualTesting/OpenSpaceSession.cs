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

        protected static WindowsDriver<WindowsElement> session;
  
        public static void Setup(TestContext context)
        {

            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            OpenSpaceSession.basePath = solutionDir.Substring(0, solutionDir.LastIndexOf("OpenSpaceVisualTesting\\OpenSpaceVisualTesting"));

            // Launch a new instance of OpenSpace
            if (session == null)
            {
                // Create a new session to launch OpenSpace
                DesiredCapabilities appCapabilities = new DesiredCapabilities();
                appCapabilities.SetCapability("app", OpenSpaceAppId);
                session = new WindowsDriver<WindowsElement>(new Uri(WindowsApplicationDriverUrl), appCapabilities);
                //wait for startup
                Thread.Sleep(TimeSpan.FromSeconds(30));
                //ensure successful startup
                Assert.IsNotNull(session);
                Assert.IsNotNull(session.SessionId);
                //load keys and set initial setup for all tests
                session.Keyboard.SendKeys(Keys.Space + "`openspace.asset.add('util/testing_keybindings');" + Keys.Enter + "`");
                session.Keyboard.SendKeys(Keys.F6);
            }
        }

        public static void TearDown()
        {
            // Close the application and delete the session
            if (session != null)
            {
                session.Close();
                session.Quit();
                session = null;
            }
        }

        [TestInitialize]
        public void TestInitialize()
        {
            //do anything here before each test?
        }
    }
}
