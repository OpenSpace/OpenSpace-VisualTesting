#!/bin/bash
src=/home/openspace/Desktop/OpenSpaceVisualTesting/OpenSpaceVisualTesting
tgt=/var/www/html/vis


#Creates soft links for .png images in a relative path
# This path must exist in both $src and $tgt
function makePngImageLinks
{
  relativeDir=$1
  if [ ! -d ${src}/${relativeDir} ]; then
    echo "Relative dir ${relativeDir} not found in source: ${src}" > /dev/stderr
    return
  fi
  if [ ! -d ${tgt}/${relativeDir} ]; then
    echo "Relative dir ${relativeDir} not found in target: ${tgt}" > /dev/stderr
    return
  fi
  fileType="*.png"
  #Remove existing links first
  rm ${tgt}/${relativeDir}/${fileType} 2>/dev/null
  #Loop and make the links
  lsResults="$(ls -1 ${src}/${relativeDir}/${fileType})"
  echo "${lsResults}" | while read file; do
    b="$(basename ${file})"
    filepath=${relativeDir}/${b}
    if [ ! -L ${tgt}/${filepath} ]; then
      ln -s ${src}/${filepath} ${tgt}/${filepath}
    fi
  done
}

#Clean up first
#rm ${tgt}/*.html
#rm ${tgt}/*.json
#makePngImageLinks TargetImages
makePngImageLinks TargetImages/linux
makePngImageLinks TargetImages/windows
makePngImageLinks ResultImages/linux
makePngImageLinks DifferenceImages/windowsvsLinux
makePngImageLinks DifferenceImages/linux
