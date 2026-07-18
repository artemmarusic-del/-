@echo off
title Diabetes App Launcher

start "API server (do not close)" /D "%~dp0server" cmd /k ""C:\Program Files\nodejs\npm.cmd" run dev"
start "Web app (do not close)" /D "%~dp0client" cmd /k ""C:\Program Files\nodejs\npm.cmd" run dev"

echo Starting servers, please wait...
timeout /t 10 /nobreak >nul

start http://localhost:5173

echo.
echo App is running at http://localhost:5173
echo Keep the two black windows open while using the app.
echo This window can be closed.
pause
