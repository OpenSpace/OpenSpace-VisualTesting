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
parallel linux_run: {
  environment {
    DISPLAY = ":1"
  }

  if (env.USE_BUILD_OS_LINUX == 'true') {
    node('linux-visual') {
      wrap([$class: 'Xvfb', displayNameOffset: 1, screen: '1 1280x960x24']) {
        sh '/var/lib/jenkins/Desktop/OpenSpace/bin/OpenSpace'
      }
      cleanWs()
    } // node('linux')
  }
}
