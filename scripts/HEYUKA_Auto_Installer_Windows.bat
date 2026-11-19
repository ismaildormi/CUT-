@echo off
chcp 65001 >nul
title HEYUKA Desktop OS Installer (Powered by KASPI)

echo ============================================================================
echo   HEYUKA Desktop OS — Official KASPI Standalone Companion Installer (v10.0)
echo ============================================================================
echo.
echo [1/4] Checking Node.js runtime...
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js not found. Attempting installation via Windows winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
)

echo [2/4] Launching standalone HEYUKA OS Companion Window...
set HEYUKA_PORTAL=https://kaspi-pos.vercel.app/ar/heyuka

where msedge >nul 2>nul
if %errorlevel% equ 0 (
  start "" msedge --app="%HEYUKA_PORTAL%"
  goto :DONE
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
  start "" chrome --app="%HEYUKA_PORTAL%"
  goto :DONE
)

start "" "%HEYUKA_PORTAL%"

:DONE
echo [3/4] Optional Python / Local Node Setup:
echo       Configure your zx-live-... API key from KASPI /zebra-x or /heyuka
echo       to enable TripoSR (:8188), Adobe UXP/JSX, Blender-MCP & Ghost Cursor.
echo [4/4] Launch complete. HEYUKA Desktop OS (by KASPI) is active.
pause
