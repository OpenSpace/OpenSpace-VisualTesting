::targetcompare.bat
@echo off
setlocal enableDelayedExpansion 
echo.>comparison.report
for /R %%F in (Target*.png) do (
	set _fullPath=%%F
	set _fullPath=!_fullPath!
	set _fileName=%%~nF
	set _fileName=!_fileName!
	call set _resultPath=%%_fullPath:Target=Result%%
	call set _differencePath=%%_fullPath:Target=Difference%%
	echo !_fileName!>>comparison.report
	compare.exe -fuzz 0.5%% -metric ae %%F "!_resultPath!" "!_differencePath!" 2>>comparison.report
	echo.>>comparison.report
)