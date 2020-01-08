::targetcompare.bat
@echo off
setlocal enableDelayedExpansion 
echo.>comparison.report
echo.>newtests.report

set _html=^<html^>
echo !_html!>visualtests.html
for /F "delims=" %%a in (visualtests_header.html) do (
  set line=%%a
  echo !line!>>visualtests.html
)

set _rowStart=^<li^>^<div^>^<div class='row-cell name-cell'^>
set _nameTail=^</div^>^<div class='row-cell image-cell'^>^<img src='
set _targetTail=' /^>^</div^>^<div class='row-cell image-cell'^>^<img src='
set _resultTail=' /^>^</div^>^<div class='row-cell image-cell'^>^<img src='
set _differenceTail=' /^>^</div^>^<div class='row-cell score-cell'^>
set _scoreTail=^</div^>
set _newTestRow=' /^>^</div^>^<div class='row-cell name-cell'^>NEW^</div^>
set _rowEnd=^</div^>^</li^>

for /R %%F in (TargetImages\Result*.png) do (
	set _fullPath=%%F
	set _fullPath=!_fullPath!
	set _fileName=%%~nF
	set _fileName=!_fileName!
	call set _testName=%%_fileName:Result=%%

	echo !_rowStart!>>visualtests.html
	echo !_testName!>>visualtests.html
	echo !_nameTail!>>visualtests.html


	call set _targetPath=%%_fullPath:Result=Target%%
	call set _differencePath=%%_fullPath:Result=Difference%%
	if EXIST !_targetPath! (
		echo !_fileName!>>comparison.report
		echo !_targetPath!>>visualtests.html
		echo !_targetTail!>>visualtests.html
		echo !_fullPath!>>visualtests.html
		echo !_resultTail!>>visualtests.html
		echo !_differencePath!>>visualtests.html
		set "_targetFile=%%F"
		compare.exe -fuzz 4%% -metric rmse "!_targetPath!" "!_fullPath!" "!_differencePath!" 2>result.txt
		set /p _compareValue=<result.txt
		echo !_differenceTail!>>visualtests.html
		echo !_compareValue!>>comparison.report
		echo !_compareValue!>>visualtests.html
		echo !_scoreTail!>>visualtests.html
		echo;>>comparison.report
	) else (
		copy /y !_fullPath! !_targetPath!
		echo !_targetPath!>>visualtests.html
		echo !_newTestRow!>>visualtests.html
		echo !_targetPath!>>newtests.report
	)

	echo !_rowEnd!>>visualtests.html
)

set /p _htmlFooter=<visualtests_footer.html
echo !_htmlFooter!>>visualtests.html
