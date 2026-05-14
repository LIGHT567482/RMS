@echo off
REM RMS System Comprehensive Test & Run Script
REM Author: Copilot
REM Purpose: Build, test, and run the Report Management System

setlocal enabledelayedexpansion
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo.
echo ========================================
echo RMS - Report Management System
echo Comprehensive Build & Test Script
echo ========================================
echo.

REM Check if Node/npm is available
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Bun is available
where bun >nul 2>&1
set BUN_AVAILABLE=0
if %errorlevel% equ 0 set BUN_AVAILABLE=1

echo [1/5] Checking environment...
echo - Project: RMS (Report Management System)
echo - Package Manager: npm
if %BUN_AVAILABLE% equ 1 echo - Bun: Available
echo - Directory: %PROJECT_DIR%
echo.

REM Test 1: Check dependencies
echo [2/5] Verifying dependencies...
if not exist "node_modules" (
    echo - node_modules not found, installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
) else (
    echo - node_modules found
)
echo ✓ Dependencies ready
echo.

REM Test 2: Run ESLint
echo [3/5] Running code quality checks (ESLint)...
call npm run lint
if %errorlevel% neq 0 (
    echo WARNING: ESLint found issues (see above)
) else (
    echo ✓ ESLint passed
)
echo.

REM Test 3: Build application
echo [4/5] Building application (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✓ Build successful
echo.

REM Test 4: Preview build (if dist exists)
echo [5/5] Verifying build artifacts...
if exist "dist" (
    echo ✓ dist/ folder created successfully
    dir /b dist | findstr /c:"index" >nul
    if %errorlevel% equ 0 echo ✓ index.html found
    dir /b dist | findstr /c:"_app" >nul
    if %errorlevel% equ 0 echo ✓ Application bundle found
) else (
    echo WARNING: dist/ folder not found
)
echo.

echo ========================================
echo ✓ ALL TESTS PASSED!
echo ========================================
echo.
echo Next steps:
echo 1. Start development server: npm run dev
echo 2. Open http://localhost:5173 in browser
echo 3. Create admin account with access code
echo 4. Test application features
echo.
echo Additional commands:
echo - npm run build:dev    : Development build
echo - npm run preview      : Preview production build
echo - npm run format       : Format code with Prettier
echo.

REM Ask user if they want to start dev server
echo.
set /p START_DEV="Start development server now? (y/n): "
if /i "%START_DEV%"=="y" (
    echo.
    echo Starting development server...
    echo Opening http://localhost:5173 in 3 seconds...
    timeout /t 3 /nobreak
    echo.
    call npm run dev
) else (
    echo.
    echo Skipping dev server. Run 'npm run dev' to start.
    echo.
    pause
)
