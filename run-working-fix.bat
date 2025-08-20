@echo off
echo Starting Docker containers...
docker-compose up -d

echo Waiting for containers to start...
timeout /t 30 /nobreak

echo Running working fix script...
node working-fix.js

echo.
echo Working fix completed!
pause
