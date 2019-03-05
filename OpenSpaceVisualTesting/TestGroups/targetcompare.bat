::targetcompare.bat
@echo off
setlocal enableDelayedExpansion
for /R %%F in (Target*.png) do (
	set _fullPath=%%F
	set _fullPath=!_fullPath!
	call set _resultPath=%%_fullPath:Target=Result%%
	call set _differencePath=%%_fullPath:Target=Difference%%
	echo %%F:
	compare.exe -fuzz 0.5%% -metric ae %%F !_resultPath! !_differencePath!
	echo.
)
