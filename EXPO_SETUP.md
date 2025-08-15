# 📱 Expo Setup Guide for iOS App Store Deployment

This guide will help you convert your Event Discovery web app to a native iOS app using Expo and deploy it to TestFlight and the App Store.

## 🚀 Quick Start

### 1. Install Expo CLI
```bash
npm install -g @expo/cli
npm install -g eas-cli
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development
```bash
# Start Expo development server
npm run expo:start

# Or start directly on iOS simulator
npm run expo:ios
```

## 📋 Prerequisites

### For Development
- **Node.js** (version 16 or higher)
- **Expo CLI** and **EAS CLI**
- **Xcode** (for iOS development)
- **iOS Simulator** or **physical iPhone**

### For App Store Deployment
- **Apple Developer Account** ($99/year)
- **App Store Connect** access
- **EAS Account** (free tier available)

## 🔧 Configuration

### 1. Update Bundle Identifier
Edit `app.json` and change:
```json
"bundleIdentifier": "com.yourcompany.eventdiscovery"
```

### 2. Update EAS Configuration
Edit `eas.json` and replace:
- `your-apple-id@example.com` with your Apple ID
- `your-app-store-connect-app-id` with your App Store Connect App ID
- `your-apple-team-id` with your Apple Developer Team ID

### 3. Create App Store Connect App
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in app details
4. Copy the App ID to `eas.json`

## 🧪 Testing with Expo Go

### 1. Install Expo Go on iPhone
- Download from App Store
- Sign in with your Expo account

### 2. Run Development Build
```bash
npm run expo:start
```

### 3. Scan QR Code
- Open Expo Go
- Scan the QR code from terminal
- App will load on your device

## 🏗️ Building for TestFlight

### 1. Configure EAS Build
```bash
eas build:configure
```

### 2. Build for iOS
```bash
# Development build (for testing)
eas build --platform ios --profile development

# Production build (for TestFlight)
eas build --platform ios --profile production
```

### 3. Monitor Build
- Check build status at [EAS Dashboard](https://expo.dev)
- Download IPA when complete

## 📱 TestFlight Deployment

### 1. Submit to App Store Connect
```bash
eas submit --platform ios
```

### 2. Configure TestFlight
1. Go to App Store Connect
2. Select your app
3. Go to "TestFlight" tab
4. Add testers (internal or external)
5. Submit for review (if external testers)

### 3. Test on Device
- Testers receive email invitation
- Download TestFlight app
- Install your app from TestFlight

## 🏪 App Store Deployment

### 1. Prepare App Store Listing
1. App Store Connect → "App Information"
2. Fill in all required fields:
   - App description
   - Screenshots
   - Keywords
   - Privacy policy URL

### 2. Submit for Review
1. Go to "App Store" tab
2. Click "Submit for Review"
3. Answer compliance questions
4. Submit

### 3. Review Process
- Apple review takes 1-7 days
- You'll receive email notifications
- Address any issues if rejected

## 🔄 Development Workflow

### Daily Development
```bash
# Start development server
npm run expo:start

# Test on iOS simulator
npm run expo:ios

# Test on physical device via Expo Go
# Scan QR code with Expo Go app
```

### Testing New Features
```bash
# Build development version
eas build --platform ios --profile development

# Install on device via TestFlight
# Or use Expo Go for quick testing
```

### Production Release
```bash
# Update version in app.json
# Build production version
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## 📊 Key Differences from Web

### Maps
- **Web**: Leaflet + React-Leaflet
- **Mobile**: React Native Maps (already configured)

### Navigation
- **Web**: React Router
- **Mobile**: React Navigation (configured)

### Storage
- **Web**: localStorage
- **Mobile**: AsyncStorage (configured)

### Location
- **Web**: Browser Geolocation API
- **Mobile**: Expo Location (configured)

## 🛠️ Troubleshooting

### Common Issues

#### Build Fails
```bash
# Clear cache
expo r -c

# Rebuild
eas build --platform ios --clear-cache
```

#### App Crashes on Device
1. Check Expo logs
2. Test on simulator first
3. Verify permissions in app.json

#### TestFlight Issues
1. Ensure bundle identifier matches
2. Check provisioning profiles
3. Verify App Store Connect setup

### Useful Commands
```bash
# View logs
expo logs

# Clear cache
expo r -c

# Reset Metro bundler
expo start --clear

# Check build status
eas build:list
```

## 📈 Performance Optimization

### iOS Specific
- Use `react-native-maps` for better performance
- Implement proper image caching
- Optimize bundle size with EAS Build

### Testing
- Test on multiple iOS versions
- Test on different device sizes
- Test with poor network conditions

## 🔒 Security Considerations

### App Store Requirements
- Implement proper privacy policy
- Handle user data securely
- Follow Apple's App Store guidelines

### Permissions
- Request location permission properly
- Explain why permissions are needed
- Handle permission denials gracefully

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Apple Developer Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## 🎉 Success Checklist

- [ ] App runs on iOS Simulator
- [ ] App runs on physical device via Expo Go
- [ ] Development build works on device
- [ ] Production build completes successfully
- [ ] App submitted to TestFlight
- [ ] TestFlight testing completed
- [ ] App Store listing prepared
- [ ] App submitted for App Store review
- [ ] App approved and published

---

**Happy iOS Development! 🍎**
