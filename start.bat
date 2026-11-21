@echo off
rem CampusBite: build everything and open the dashboard
rem   1. compile the C program      (build.bat)
rem   2. install + build the React dashboard (first run needs internet for npm)
rem   3. start the Node bridge, which starts the C program in --pipe mode
cd /d "%~dp0"

call build.bat
if errorlevel 1 exit /b 1

if not exist dashboard\node_modules (
    echo Installing dashboard packages...
    pushd dashboard
    call npm install
    if errorlevel 1 ( popd & exit /b 1 )
    popd
)

echo Building dashboard...
pushd dashboard
call npm run build
if errorlevel 1 ( popd & exit /b 1 )
popd

echo.
echo Opening http://localhost:3001  (press Ctrl+C here to stop)
start "" http://localhost:3001
node server\server.js
