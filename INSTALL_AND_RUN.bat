@echo off
setlocal enabledelayedexpansion
title HEYUKA AI by KASPI - Desktop App Installer & Runner

echo ============================================================
echo   HEYUKA AI (KASPI) - 3D DESKTOP COMPANION & STUDIO
echo   Automated Installer & Launcher
echo ============================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js not found in PATH. Calling X auto-installer...
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        winget install -e --id OpenJS.NodeJS.LTS -h --accept-source-agreements --accept-package-agreements
    )
)

:: 2. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo [INFO] Python not found in PATH. Calling X auto-installer...
        where winget >nul 2>nul
        if %errorlevel% equ 0 (
            winget install -e --id Python.Python.3.11 -h --accept-source-agreements --accept-package-agreements
            set PYTHON_CMD=python
        ) else (
            set PYTHON_CMD=python
        )
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

:: 3. Verify pre-configured .env exists
if exist ".env" (
    echo [OK] Pre-configured Plug ^& Play .env detected.
)
echo.


:: 6. Run npm install
echo [1/4] Installing Node.js dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b %errorlevel%
)
echo [OK] npm packages installed.
echo.

:: 7. Run pip install -r backend/requirements.txt
echo [2/4] Installing Python AI backend dependencies...
if exist "backend\requirements.txt" (
    %PYTHON_CMD% -m pip install -r backend\requirements.txt
) else if exist "requirements.txt" (
    %PYTHON_CMD% -m pip install -r requirements.txt
)
if %errorlevel% neq 0 (
    echo [WARNING] Some Python dependencies had notes, proceeding...
) else (
    echo [OK] Python dependencies installed.
)
echo.

:: Start LiteLLM proxy in background (The Minister of Keys)
echo Starting LiteLLM proxy daemon on port 4000...
start /b %PYTHON_CMD% -m litellm --config litellm_config.yaml --port 4000
echo Waiting 5 seconds for LiteLLM proxy to boot...
timeout /t 5 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 6 >nul

:: 8. Run npm run dev in background process (start /b)
echo [3/4] Starting local development server in background...
start /b npm run dev

:: 9. WAIT 10 seconds to let Vite start
echo Waiting 10 seconds for Vite development server to initialize...
timeout /t 10 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 11 >nul
echo [OK] Server is ready.
echo.

:: 10. Run npm run electron:dev -- --disable-gpu to launch Electron app
echo [4/4] Launching NEVEA 3D Desktop Companion...
echo.
call npm run electron:dev -- --disable-gpu

:: 11. If any error occurs or upon exit, keep the window open
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] NEVEA exited with error code %errorlevel%.
)
echo.
echo ============================================================
echo   NEVEA AI session ended.
echo ============================================================
pause
