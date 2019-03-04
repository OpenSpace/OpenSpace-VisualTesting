using System;
using System.Threading;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;

namespace OpenSpaceVisualTesting.NewHorizions
{
    [TestClass]
    public class ScenarioNewHorizionsModel : OpenSpaceSession
    {
        private const string ScenarioGroup = @"NewHorizions";
        private const string ScenarioName = @"Model";

        [TestMethod]
        public void ScreenshotModel()
        {
            //load asset file
            OpenSpaceSession.addAssetFile(ScenarioGroup, ScenarioName);
            //play recording file
            DesktopSession.Keyboard.SendKeys(Keys.F8);
            Thread.Sleep(TimeSpan.FromSeconds(2));
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
            Setup(context, "newhorizons");
        }

        [ClassCleanup]
        public static void ClassCleanup()
        {
            //nothing since we already teeardown after test
        }

    }
}
