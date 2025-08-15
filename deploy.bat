@echo off
setlocal enabledelayedexpansion

REM WhtzUp Event Discovery App - Docker Deployment Script (Windows)
REM This script automates the deployment process

echo 🐳 WhtzUp Event Discovery App - Docker Deployment
echo ==================================================

REM Check if Docker is installed
echo [INFO] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    echo Visit: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    echo Visit: https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed

REM Check Docker service
echo [INFO] Checking Docker service...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker service is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [SUCCESS] Docker service is running

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "data" mkdir data
if not exist "backups" mkdir backups

REM Copy events file to data directory if it doesn't exist
if not exist "data\events-user.json" (
    if exist "public\events-user.json" (
        copy "public\events-user.json" "data\events-user.json" >nul
        echo [SUCCESS] Copied events file to data directory
    )
)

echo [SUCCESS] Directories created

REM Check command line arguments
set "command=%1"
if "%command%"=="" set "command=deploy"

if "%command%"=="deploy" goto :deploy
if "%command%"=="stop" goto :stop
if "%command%"=="restart" goto :restart
if "%command%"=="logs" goto :logs
if "%command%"=="update" goto :update
if "%command%"=="clean" goto :clean
if "%command%"=="help" goto :help
goto :unknown

:deploy
echo [INFO] Building and starting the application...

REM Stop existing containers if running
docker-compose ps | findstr "whtzup-event-app" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Stopping existing containers...
    docker-compose down
)

REM Build and start
docker-compose up -d --build
if errorlevel 1 (
    echo [ERROR] Failed to deploy application
    pause
    exit /b 1
)

echo [SUCCESS] Application deployed successfully!

REM Check application health
echo [INFO] Checking application health...
timeout /t 10 /nobreak >nul

REM Check if container is running
docker-compose ps | findstr "Up" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Container failed to start
    docker-compose logs whtzup-app
    pause
    exit /b 1
) else (
    echo [SUCCESS] Container is running
)

REM Check API endpoint
curl -s http://localhost:7777/api/events >nul 2>&1
if errorlevel 1 (
    echo [WARNING] API endpoint not responding yet (this is normal during startup)
) else (
    echo [SUCCESS] API endpoint is responding
)

goto :show_info

:stop
echo [INFO] Stopping application...
docker-compose down
echo [SUCCESS] Application stopped
goto :end

:restart
echo [INFO] Restarting application...
docker-compose restart
echo [SUCCESS] Application restarted
goto :end

:logs
docker-compose logs -f whtzup-app
goto :end

:update
echo [INFO] Updating application...
git pull
docker-compose down
docker-compose up -d --build
echo [SUCCESS] Application updated
goto :end

:clean
echo [WARNING] This will remove all containers and volumes!
set /p "confirm=Are you sure? (y/N): "
if /i "!confirm!"=="y" (
    docker-compose down -v
    docker system prune -f
    echo [SUCCESS] Cleaned up Docker resources
) else (
    echo [INFO] Cleanup cancelled
)
goto :end

:help
echo Usage: %0 [command]
echo.
echo Commands:
echo   deploy   - Deploy the application (default)
echo   stop     - Stop the application
echo   restart  - Restart the application
echo   logs     - View application logs
echo   update   - Update and redeploy the application
echo   clean    - Clean up Docker resources
echo   help     - Show this help message
goto :end

:unknown
echo [ERROR] Unknown command: %command%
echo Use '%0 help' for available commands
pause
exit /b 1

:show_info
echo.
echo 🎉 Deployment Complete!
echo ======================
echo.
echo 📱 Application URLs:
echo    • Main App: http://localhost:7777
echo    • API: http://localhost:7777/api/events
echo.
echo 📊 Useful Commands:
echo    • View logs: docker-compose logs -f whtzup-app
echo    • Stop app: docker-compose down
echo    • Restart app: docker-compose restart whtzup-app
echo    • Update app: docker-compose up -d --build
echo.
echo 📁 Data Locations:
echo    • Events data: .\data\
echo    • Backups: .\backups\
echo    • Events file: .\public\events-user.json
echo.

:end
pause

