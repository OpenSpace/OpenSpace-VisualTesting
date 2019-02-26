using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using System.Threading;
using System;
using System.IO;

namespace OpenSpaceVisualTesting
{
    [TestClass]
    public class ScenarioDefaultSolarSystem : OpenSpaceSession
    {
        private const string ScenarioName = @"DefaultSolarSystem";

        [TestMethod]
        public void TakeSolarSystemScreenShot()
        {
            const string FilePath = "../../OpenSpaceVisualTesting/OpenSpaceVisualTesting/Default/TestingAsset" + ScenarioName;

            Thread.Sleep(TimeSpan.FromSeconds(2));
            session.Keyboard.SendKeys(Keys.Space + "`openspace.asset.add('" + FilePath + "');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(5));
            session.Keyboard.SendKeys(Keys.F8);
            Thread.Sleep(TimeSpan.FromSeconds(2));
            session.Keyboard.SendKeys(Keys.F9);
            Thread.Sleep(TimeSpan.FromSeconds(2));

            string solutionDir = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.FullName;
            string tmpPath = OpenSpaceSession.basePath + "\\screenshots\\OpenSpace_000000.png";
            string moveToPath = solutionDir + "\\Default\\ResultDefaultSolarSystem.png";
            Console.WriteLine("Move " + tmpPath + " to " + moveToPath);
            File.Move(tmpPath, moveToPath);

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
            session.Keyboard.SendKeys(Keys.Space + "`openspace.asset.remove('${BASE}/OpenSpaceVisualTesting/TestingAssetDeafaultSolarSystem');" + Keys.Enter + "`");
            Thread.Sleep(TimeSpan.FromSeconds(2));
            TearDown();
        }

    }
}
