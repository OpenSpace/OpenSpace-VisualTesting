using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using System.Threading;
using System;


namespace OpenSpaceVisualTesting
{
    [TestClass]
    public class ScenarioDefaultEarth : OpenSpaceSession
    {
        private const string ScenarioName = @"DefaultEarth";

        [TestMethod]
        public void TakeEarthScreenShot()
        {
            const string FilePath = "../../OpenSpaceVisualTesting/OpenSpaceVisualTesting/TestingAsset" + ScenarioName;
            Thread.Sleep(TimeSpan.FromSeconds(2));
            session.Keyboard.SendKeys(Keys.Space + "`openspace.asset.add('" + FilePath + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(15));
            session.Keyboard.SendKeys(Keys.F8);
            session.Keyboard.SendKeys(Keys.Space + "`openspace.asset.remove('" + FilePath + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(2));
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
