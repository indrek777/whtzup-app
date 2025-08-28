#!/bin/bash

# iOS Build Script using Fastlane
# This script provides options to build for simulator or device using Fastlane

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -s, --simulator    Build for iOS Simulator using Fastlane"
    echo "  -d, --device       Build for iOS Device using Fastlane"
    echo "  -a, --archive      Build and archive for distribution"
    echo "  -t, --testflight   Build and upload to TestFlight"
    echo "  -r, --release      Build and deploy to App Store"
    echo "  -c, --clean        Clean build artifacts"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -s                    # Build for simulator"
    echo "  $0 -d                    # Build for device"
    echo "  $0 -a                    # Build and archive"
    echo "  $0 -t                    # Build and upload to TestFlight"
    echo "  $0 -r                    # Build and deploy to App Store"
    echo "  $0 -c                    # Clean build artifacts"
}

# Default values
BUILD_TYPE=""
CLEAN_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--simulator)
            BUILD_TYPE="simulator"
            shift
            ;;
        -d|--device)
            BUILD_TYPE="device"
            shift
            ;;
        -a|--archive)
            BUILD_TYPE="archive"
            shift
            ;;
        -t|--testflight)
            BUILD_TYPE="testflight"
            shift
            ;;
        -r|--release)
            BUILD_TYPE="release"
            shift
            ;;
        -c|--clean)
            CLEAN_ONLY=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Starting iOS build process with Fastlane..."
print_status "Build type: $BUILD_TYPE"

# Step 1: Install dependencies
print_status "Installing npm dependencies..."
npm install

# Step 2: Prebuild iOS project
print_status "Running Expo prebuild for iOS..."
npx expo prebuild --platform ios --clean

# Step 3: Navigate to iOS directory
cd ios

# Step 4: Install CocoaPods dependencies
print_status "Installing CocoaPods dependencies..."
pod install

# Step 5: Check if Fastlane is installed
if ! command -v fastlane &> /dev/null; then
    print_error "Fastlane is not installed. Please install it first:"
    print_error "  gem install fastlane"
    exit 1
fi

# Step 6: Execute Fastlane command based on build type
if [ "$CLEAN_ONLY" = true ]; then
    print_status "Cleaning build artifacts..."
    fastlane clean
    print_success "Build artifacts cleaned!"
    
elif [ "$BUILD_TYPE" = "simulator" ]; then
    print_status "Building for iOS Simulator using Fastlane..."
    fastlane build_simulator
    print_success "Build completed for iOS Simulator!"
    
elif [ "$BUILD_TYPE" = "device" ]; then
    print_status "Building for iOS Device using Fastlane..."
    fastlane build_device
    print_success "Build completed for iOS Device!"
    
elif [ "$BUILD_TYPE" = "archive" ]; then
    print_status "Building and archiving for distribution..."
    fastlane build_archive
    print_success "Build and archive completed!"
    
elif [ "$BUILD_TYPE" = "testflight" ]; then
    print_status "Building and uploading to TestFlight..."
    fastlane beta
    print_success "Build uploaded to TestFlight!"
    
elif [ "$BUILD_TYPE" = "release" ]; then
    print_status "Building and deploying to App Store..."
    fastlane release
    print_success "App deployed to App Store!"
    
else
    print_error "No build type specified. Please choose one:"
    echo "  -s, --simulator    Build for iOS Simulator"
    echo "  -d, --device       Build for iOS Device"
    echo "  -a, --archive      Build and archive for distribution"
    echo "  -t, --testflight   Build and upload to TestFlight"
    echo "  -r, --release      Build and deploy to App Store"
    echo "  -c, --clean        Clean build artifacts"
    exit 1
fi

print_success "iOS build process completed with Fastlane!"

# Show available lanes
if [ "$BUILD_TYPE" != "" ]; then
    echo ""
    print_status "Available Fastlane lanes:"
    echo "  fastlane build_simulator  # Build for simulator"
    echo "  fastlane build_device     # Build for device"
    echo "  fastlane build_archive    # Build and archive"
    echo "  fastlane beta             # Upload to TestFlight"
    echo "  fastlane release          # Deploy to App Store"
    echo "  fastlane clean            # Clean build artifacts"
fi
