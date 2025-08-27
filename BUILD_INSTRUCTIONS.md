# iOS Build Instructions

This document provides comprehensive instructions for building the Event Discovery iOS app.

## Prerequisites

### Required Software
- **Xcode 16+** (Latest version recommended)
- **Node.js 18+** and npm
- **CocoaPods** (`sudo gem install cocoapods`)
- **Expo CLI** (`npm install -g @expo/cli`)

### Required Accounts
- **Apple Developer Account** (for device builds and App Store distribution)
- **Expo Account** (optional, for EAS builds)

## Quick Start

### Option 1: Using the Build Script (Recommended)

We've created a comprehensive build script that handles the entire process:

```bash
# Build for iOS Simulator (default)
./build-ios.sh

# Build for iOS Simulator with clean build
./build-ios.sh -c -s

# Build for iOS Device (requires code signing setup)
./build-ios.sh -d

# Show help
./build-ios.sh --help
```

### Option 2: Manual Build Process

If you prefer to build manually, follow these steps:

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Prebuild iOS Project
```bash
npx expo prebuild --platform ios --clean
```

#### 3. Install CocoaPods Dependencies
```bash
cd ios
pod install
```

#### 4. Build for Simulator
```bash
xcodebuild -workspace EventDiscovery.xcworkspace \
           -scheme EventDiscovery \
           -configuration Debug \
           -destination 'platform=iOS Simulator,name=iPhone 16' \
           build
```

#### 5. Build for Device
```bash
xcodebuild -workspace EventDiscovery.xcworkspace \
           -scheme EventDiscovery \
           -configuration Release \
           -destination 'generic/platform=iOS' \
           build
```

## Build Configurations

### Debug Configuration
- Used for development and testing
- Includes debugging symbols
- Optimized for development workflow
- Used with iOS Simulator

### Release Configuration
- Used for production builds
- Optimized for performance
- Stripped debugging symbols
- Used for device builds and App Store submission

## Code Signing Setup

### For Device Builds

1. **Open Xcode**
   ```bash
   open ios/EventDiscovery.xcworkspace
   ```

2. **Configure Signing & Capabilities**
   - Select the `EventDiscovery` target
   - Go to "Signing & Capabilities" tab
   - Select your development team
   - Ensure "Automatically manage signing" is checked

3. **Provisioning Profiles**
   - Xcode will automatically manage provisioning profiles
   - Ensure your Apple Developer account has the necessary certificates

### For App Store Distribution

1. **Archive the App**
   ```bash
   xcodebuild -workspace EventDiscovery.xcworkspace \
              -scheme EventDiscovery \
              -configuration Release \
              -destination 'generic/platform=iOS' \
              archive -archivePath EventDiscovery.xcarchive
   ```

2. **Export for Distribution**
   ```bash
   xcodebuild -exportArchive \
              -archivePath EventDiscovery.xcarchive \
              -exportPath EventDiscovery.ipa \
              -exportOptionsPlist exportOptions.plist
   ```

## Troubleshooting

### Common Issues

#### 1. Pod Install Fails
```bash
# Clean CocoaPods cache
pod cache clean --all
rm -rf ios/Pods ios/Podfile.lock
pod install
```

#### 2. Build Fails with Code Signing Errors
- Ensure you have a valid Apple Developer account
- Check that your certificates are not expired
- Verify provisioning profiles are correctly configured

#### 3. Simulator Build Fails
```bash
# Clean build
xcodebuild clean -workspace EventDiscovery.xcworkspace -scheme EventDiscovery

# Reset simulator
xcrun simctl erase all
```

#### 4. Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache
```

### Build Script Troubleshooting

#### 1. Permission Denied
```bash
chmod +x build-ios.sh
```

#### 2. Script Fails at Prebuild
- Ensure you're in the project root directory
- Check that `package.json` exists
- Verify Expo CLI is installed globally

#### 3. Xcode Build Fails
- Open the project in Xcode to see detailed error messages
- Check that all dependencies are properly installed
- Verify iOS deployment target compatibility

## Build Output Locations

### Simulator Build
```
~/Library/Developer/Xcode/DerivedData/EventDiscovery-*/Build/Products/Debug-iphonesimulator/EventDiscovery.app
```

### Device Build
```
~/Library/Developer/Xcode/DerivedData/EventDiscovery-*/Build/Products/Release-iphoneos/EventDiscovery.app
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: iOS Build
on: [push, pull_request]
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx expo prebuild --platform ios --clean
      - run: cd ios && pod install
      - run: xcodebuild -workspace EventDiscovery.xcworkspace -scheme EventDiscovery -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build
```

## Performance Optimization

### Build Time Optimization
- Use `-c` flag for clean builds when needed
- Consider using Xcode's parallel builds
- Use appropriate simulator for testing

### App Performance
- Use Release configuration for performance testing
- Profile the app using Xcode Instruments
- Monitor memory usage and CPU utilization

## Support

If you encounter issues not covered in this document:

1. Check the [Expo documentation](https://docs.expo.dev/)
2. Review [React Native troubleshooting guide](https://reactnative.dev/docs/troubleshooting)
3. Check [Xcode documentation](https://developer.apple.com/xcode/)
4. Open an issue in the project repository

## Version History

- **v1.3.0** - Current version with comprehensive build script
- **v1.2.0** - Added EAS build support
- **v1.1.0** - Initial iOS build setup
