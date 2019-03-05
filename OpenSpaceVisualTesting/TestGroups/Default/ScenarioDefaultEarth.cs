using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using System.Threading;
using System;


namespace OpenSpaceVisualTesting.Default
{
    [TestClass]
    public class ScenarioDefaultEarth : OpenSpaceSession
    {
        private const string ScenarioGroup = @"Default";
        private const string ScenarioName = @"Earth";

        [TestMethod]
        public void TakeEarthScreenShot()
        {
            //set to target data
            OpenSpaceSession.setTime("2019-01-01T00:00:00.00");
            //wait for tiles to load
            Thread.Sleep(TimeSpan.FromSeconds(20));
            //take screenshot
            DesktopSession.Keyboard.SendKeys(Keys.F7);
            Thread.Sleep(TimeSpan.FromSeconds(2));
            //move sceenshot to result
            OpenSpaceSession.moveScreenShot(ScenarioGroup, ScenarioName);
            Thread.Sleep(TimeSpan.FromSeconds(1));
            //exit for next test
            TearDown();



        }

        [ClassInitialize]
        public static void ClassInitialize(TestContext context)
        {
            Setup(context);
        }

        [ClassCleanup]
        public static void ClassCleanup()
        {
            TearDown();
        }

    }
}
