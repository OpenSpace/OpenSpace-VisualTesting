::targetcompare.bat
@echo off
setlocal enableDelayedExpansion 
echo.>comparison.report
echo.>newtests.report

echo {"items":[>visualtests_results.json.tmp

set /a _count=0
set _nameString={"name":"
set _newString=","new":"
set _scoreString=","score":"
set _endString="}

for /R .\TargetImages %%F in (Result*.png) do (
	if !_count! == 0 (
		set /a _count+=1		
	) else (
		echo ,>>visualtests_results.json.tmp		
	)
	set _fullPath=%%F
	set _fullPath=!_fullPath!
	set _fileName=%%~nF
	set _fileName=!_fileName!
	call set _testName=%%_fileName:Result=%%

	echo !_nameString!>>visualtests_results.json.tmp
	echo !_testName!>>visualtests_results.json.tmp
	echo !_newString!>>visualtests_results.json.tmp


	call set _targetPath=%%_fullPath:Result=Target%%
	call set _differencePath=%%_fullPath:Result=Difference%%
	if EXIST !_targetPath! (
		echo !_fileName!>>comparison.report
		set "_targetFile=%%F"
		compare.exe -fuzz 4%% -metric rmse "!_targetPath!" "!_fullPath!" "!_differencePath!" 2>result.txt
		set /p _compareValue=<result.txt
		echo !_compareValue!>>comparison.report
		echo false>>visualtests_results.json.tmp
		echo !_scoreString!>>visualtests_results.json.tmp
		echo !_compareValue!>>visualtests_results.json.tmp
		echo;>>comparison.report
	) else (
		copy /y !_fullPath! !_targetPath!
		echo true>>visualtests_results.json.tmp
		echo !_scoreString!>>visualtests_results.json.tmp
		echo !_targetPath!>>newtests.report
	)

	echo !_endString!>>visualtests_results.json.tmp
)

echo ]}>>visualtests_results.json.tmp

set row=
for /f %%x in (visualtests_results.json.tmp) do set "row=!row!%%x"
>visualtests_results.json echo %row%