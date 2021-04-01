import groovy.io.FileType

library('sharedSpace'); // jenkins-pipeline-lib

def url = 'https://github.com/OpenSpace/OpenSpace';
//def branch = env.BRANCH_NAME;
def branch =  "master"

@NonCPS
def readDir() {
  def dirsl = [];
  new File("${workspace}").eachDir() {
    dirs -> println dirs.getName() 
    if (!dirs.getName().startsWith('.')) {
      dirsl.add(dirs.getName());
    }
  }
  return dirs;
}

def moduleCMakeFlags() {
  def modules = [];
  // using new File doesn't work as it is not allowed in the sandbox
  
  if (isUnix()) {
     modules = sh(returnStdout: true, script: 'ls -d modules/*').trim().split('\n');
  };
  else {
    modules = bat(returnStdout: true, script: '@dir modules /b /ad /on').trim().split('\r\n');
  }

  def flags = '';
  for (module in modules) {
      flags += "-DOPENSPACE_MODULE_${module.toUpperCase()}=ON "
  }
  return flags;
}

//
// Pipeline start
//
//hi micah
parallel linux_gcc_make: {
  if (env.USE_BUILD_OS_LINUX == 'true') {
    node('linux-visual' && 'gcc') {
      stage('linux-gcc-make/scm') {
        deleteDir();
        gitHelper.checkoutGit(url, branch);
      }
      stage('linux-gcc-make/build') {
          def cmakeCompileOptions = moduleCMakeFlags();
          cmakeCompileOptions += ' -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS:STRING="-DGLM_ENABLE_EXPERIMENTAL"'
          cmakeCompileOptions += ' -DOpenGL_GL_PREFERENCE:STRING=GLVND -DASSIMP_BUILD_MINIZIP=1';
          compileHelper.build(compileHelper.Make(), compileHelper.Gcc(), cmakeCompileOptions, 'OpenSpace', 'build-make');
          compileHelper.recordCompileIssues(compileHelper.Gcc());
      }
      stage('linux-gcc-make/img-compare') {
        sh 'echo $(pwd) > ${IMAGE_TESTING_BASE_PATH}/latestBuild.txt'
        sh 'while [ 1 ]; do sleep 300; if [ "$(cat ${IMAGE_TESTING_BASE_PATH}/latestBuild.txt)" = "" ]; then break; fi; done'
      }
      stage('linux-gcc-make/test') {
        // testHelper.runUnitTests('build/OpenSpaceTest');
        // testHelper.runUnitTests('bin/codegentest')
      }
      cleanWs()
    } // node('linux')
  }
},
windows_msvc: {
  if (env.USE_BUILD_OS_WINDOWS == 'true') {
    node('windows-visual') {
      stage('windows-msvc/scm') {
        deleteDir();
        gitHelper.checkoutGit(url, branch);
      }
      stage('windows-msvc/build') {
        compileHelper.build(compileHelper.VisualStudio(), compileHelper.VisualStudio(), moduleCMakeFlags(), '', 'build-msvc');
        compileHelper.recordCompileIssues(compileHelper.VisualStudio());
      }
      stage('windows/visual-tests') {
          dir('OpenSpace') {
            testHelper.linkFolder(env.OPENSPACE_FILES + "\\sync_full", "sync", );
            testHelper.linkFolder(env.OPENSPACE_FILES + "\\cache_gdal", "cache_gdal");
          }
          testHelper.startTestRunner();
          testHelper.runUiTests()
          //commit new test images
          //copy test results to static dir
      }
    }
  }
}
