@echo off
title Site preview - Olga Kisurina
cd /d "%~dp0"

echo.
echo   Opening the site in your browser.
echo   Address: http://localhost:4321
echo.
echo   Keep this window open while you browse.
echo   To stop: close this window or press Ctrl+C.
echo.

call npm run dev -- --open --port 4321

echo.
echo   Stopped. Press any key to close this window.
pause >nul
