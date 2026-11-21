@echo off
rem CampusBite build script (MinGW gcc)
rem   build.bat        build the program and the tests
rem   build.bat test   build, then run all tests
rem   build.bat run    build, then start the program

if not exist build mkdir build
set FLAGS=-std=c99 -Wall -Wextra -pedantic

gcc %FLAGS% -o build\campusbite.exe src\main.c src\pipe.c src\canteen.c src\storage.c src\queue.c
if errorlevel 1 goto failed
gcc %FLAGS% -o build\test_queue.exe tests\test_queue.c src\queue.c
if errorlevel 1 goto failed
gcc %FLAGS% -o build\test_canteen.exe tests\test_canteen.c src\canteen.c src\storage.c src\queue.c
if errorlevel 1 goto failed
echo Built build\campusbite.exe, build\test_queue.exe, build\test_canteen.exe

if /i "%1"=="test" (
    build\test_queue.exe
    if errorlevel 1 exit /b 1
    build\test_canteen.exe
    if errorlevel 1 exit /b 1
)
if /i "%1"=="run" build\campusbite.exe
exit /b 0

:failed
echo Build failed.
exit /b 1
