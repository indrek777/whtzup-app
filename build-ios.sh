#!/bin/bash

# iOS Build Script for Event Discovery App
# This script provides options to build for simulator or device

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
    echo "  -s, --simulator    Build for iOS Simulator (default)"
    echo "  -d, --device       Build for iOS Device (requires code signing)"
    echo "  -c, --clean        Clean build before building"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build for simulator"
    echo "  $0 -s                 # Build for simulator"
    echo "  $0 -d                 # Build for device"
    echo "  $0 -c -s              # Clean and build for simulator"
    echo "  $0 -c -d              # Clean and build for device"
}

# Default values
BUILD_TYPE="simulator"
CLEAN_BUILD=false

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
        -c|--clean)
            CLEAN_BUILD=true
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

print_status "Starting iOS build process..."
print_status "Build type: $BUILD_TYPE"
print_status "Clean build: $CLEAN_BUILD"

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

# Step 5: Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    print_status "Cleaning build..."
    xcodebuild clean -workspace EventDiscovery.xcworkspace -scheme EventDiscovery
fi

# Step 6: Build based on type
if [ "$BUILD_TYPE" = "simulator" ]; then
    print_status "Building for iOS Simulator..."
    
    # Get available simulators
    print_status "Available simulators:"
    xcrun simctl list devices available | grep "iPhone" | head -5
    
    # Build for iPhone 16 simulator
    xcodebuild -workspace EventDiscovery.xcworkspace \
               -scheme EventDiscovery \
               -configuration Debug \
               -destination 'platform=iOS Simulator,name=iPhone 16' \
               build
    
    print_success "Build completed successfully for iOS Simulator!"
    print_status "You can now run the app in Xcode or use:"
    print_status "  xcrun simctl install booted /path/to/EventDiscovery.app"
    
elif [ "$BUILD_TYPE" = "device" ]; then
    print_status "Building for iOS Device..."
    print_warning "This requires proper code signing setup in Xcode."
    print_warning "Please ensure you have:"
    print_warning "  1. A valid Apple Developer account"
    print_warning "  2. Proper provisioning profiles"
    print_warning "  3. Code signing configured in Xcode"
    
    # Build for generic iOS device
    xcodebuild -workspace EventDiscovery.xcworkspace \
               -scheme EventDiscovery \
               -configuration Release \
               -destination 'generic/platform=iOS' \
               build
    
    print_success "Build completed successfully for iOS Device!"
    print_status "You can now archive and distribute the app."
fi

# Step 7: Show build location
BUILD_PATH=$(xcodebuild -workspace EventDiscovery.xcworkspace -scheme EventDiscovery -showBuildSettings | grep "BUILT_PRODUCTS_DIR" | head -1 | awk '{print $3}')
if [ -n "$BUILD_PATH" ]; then
    print_status "Build output location: $BUILD_PATH"
fi

print_success "iOS build process completed!"
