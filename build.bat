@echo off
rem CampusBite build script (MinGW gcc)
rem   build.bat        build the queue tests
rem   build.bat test   build and run the queue tests

if not exist build mkdir build

gcc -std=c99 -Wall -Wextra -pedantic -o build\test_queue.exe tests\test_queue.c src\queue.c
if errorlevel 1 (
    echo Build failed.
    exit /b 1
)
echo Built build\test_queue.exe

if /i "%1"=="test" build\test_queue.exe
