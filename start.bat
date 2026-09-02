@echo off
echo Starting AeroFlow Application...
echo.

echo [0/4] Cleaning up existing processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul

echo [1/4] Seeding flights for next 7 days...
cd /d "%~dp0backend"
python seed_from_master.py
cd /d "%~dp0"

echo [2/4] Starting Backend Server...
cd /d "%~dp0backend"
start "AeroFlow Backend" cmd /k "python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
cd /d "%~dp0"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [3/4] Verifying Backend Health...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Backend health check failed, but continuing...
) else (
    echo Backend is healthy!
)

echo [4/4] Starting Frontend Server...
cd /d "%~dp0frontend"
start "AeroFlow Frontend" cmd /k "npm start"
cd /d "%~dp0"

echo.
echo AeroFlow servers started successfully!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop all servers...
pause >nul

echo Stopping servers...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo Servers stopped.
timeout /t 2 /nobreak >nul
