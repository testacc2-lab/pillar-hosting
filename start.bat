@echo off
title Pella - Local Server

echo.
echo  ==========================================
echo   Pella ^| Starting local server...
echo  ==========================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python found. Starting SPA server on http://localhost:3000
    echo  [OK] Press Ctrl+C to stop the server.
    echo.
    start http://localhost:3000
    python spa_server.py
    goto end
)

:: Fallback: try py launcher
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python found. Starting SPA server on http://localhost:3000
    echo  [OK] Press Ctrl+C to stop the server.
    echo.
    start http://localhost:3000
    py spa_server.py
    goto end
)

:: Fallback: try Node.js with npx serve
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Node.js found. Starting SPA server on http://localhost:3000
    echo  [OK] Press Ctrl+C to stop the server.
    echo.
    start http://localhost:3000
    npx -y serve . -s -p 3000
    goto end
)

:: Nothing found
echo  [ERROR] Neither Python nor Node.js was found on your system.
echo.
echo  Please install one of the following:
echo    - Python:  https://www.python.org/downloads/
echo    - Node.js: https://nodejs.org/
echo.
pause
goto end

:end
