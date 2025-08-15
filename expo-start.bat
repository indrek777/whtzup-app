@echo off
echo 🚀 Starting Expo Development Server
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Expo CLI is installed
expo --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Expo CLI...
    npm install -g @expo/cli
)

REM Check if EAS CLI is installed
eas --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing EAS CLI...
    npm install -g eas-cli
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

echo.
echo 🎯 Choose your development option:
echo.
echo 1. Start Expo development server (default)
echo 2. Start iOS simulator
echo 3. Start Android emulator
echo 4. Start web version
echo 5. Build for TestFlight
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo 🚀 Starting Expo development server...
    npm run expo:start
) else if "%choice%"=="2" (
    echo 🍎 Starting iOS simulator...
    npm run expo:ios
) else if "%choice%"=="3" (
    echo 🤖 Starting Android emulator...
    npm run expo:android
) else if "%choice%"=="4" (
    echo 🌐 Starting web version...
    npm run expo:web
) else if "%choice%"=="5" (
    echo 📱 Building for TestFlight...
    echo.
    echo ⚠️  Make sure you have:
    echo    • Apple Developer Account
    echo    • EAS account configured
    echo    • Updated app.json with your bundle identifier
    echo.
    pause
    eas build --platform ios --profile production
) else if "%choice%"=="6" (
    echo 👋 Goodbye!
    exit /b 0
) else (
    echo ❌ Invalid choice. Starting default Expo server...
    npm run expo:start
)

pause
