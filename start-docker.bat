@echo off
echo Starting WhtzUp Docker Backend System...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: docker-compose is not available. Please install Docker Compose.
    pause
    exit /b 1
)

echo Building and starting containers...
docker-compose up --build -d

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo Checking service status...
docker-compose ps

echo.
echo Services are starting up. You can check the logs with:
echo docker-compose logs -f
echo.
echo API Server will be available at: http://localhost:3000
echo Health check: http://localhost:3000/health
echo.
echo Press any key to view logs...
pause >nul

docker-compose logs -f
