#!/bin/bash

echo "🚀 Starting Expo Development Server"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo
echo "🎯 Choose your development option:"
echo
echo "1. Start Expo development server (default)"
echo "2. Start iOS simulator"
echo "3. Start Android emulator"
echo "4. Start web version"
echo "5. Build for TestFlight"
echo "6. Exit"
echo

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo "🚀 Starting Expo development server..."
        npm run expo:start
        ;;
    2)
        echo "🍎 Starting iOS simulator..."
        npm run expo:ios
        ;;
    3)
        echo "🤖 Starting Android emulator..."
        npm run expo:android
        ;;
    4)
        echo "🌐 Starting web version..."
        npm run expo:web
        ;;
    5)
        echo "📱 Building for TestFlight..."
        echo
        echo "⚠️  Make sure you have:"
        echo "   • Apple Developer Account"
        echo "   • EAS account configured"
        echo "   • Updated app.json with your bundle identifier"
        echo
        read -p "Press Enter to continue..."
        eas build --platform ios --profile production
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Starting default Expo server..."
        npm run expo:start
        ;;
esac
