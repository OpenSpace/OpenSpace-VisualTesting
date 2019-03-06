using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using System.Threading;
using System;
using System.IO;

namespace OpenSpaceVisualTesting.Default
{
    [TestClass]
    public class ScenarioDefaultSolarSystem : OpenSpaceSession
    {
        private const string ScenarioGroup = @"Default";
        private const string ScenarioName = @"SolarSystem";

        [TestMethod]
        public void TakeSolarSystemScreenShot()
        {
            //load asset file
            OpenSpaceSession.addAssetFile(ScenarioGroup, ScenarioName);
            //play recording file
            currentSession.Keyboard.SendKeys(Keys.F8);
            Thread.Sleep(TimeSpan.FromSeconds(2));
            //take screenshot
            currentSession.Keyboard.SendKeys(Keys.F7);
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
            //nothing since we already teeardown after test
        }
    }
}
