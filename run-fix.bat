@echo off
echo Starting Docker containers...
docker-compose up -d

echo Waiting for containers to start...
timeout /t 30 /nobreak

echo Running quick fix script...
node quick-fix.js

echo.
echo Fix completed!
pause
