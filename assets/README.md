# 📱 App Assets

This directory contains the required assets for your Expo app.

## Required Images

### App Icon
- **File**: `icon.png`
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Description**: Your app's main icon that appears on the home screen

### Splash Screen
- **File**: `splash.png`
- **Size**: 1242x2436 pixels (iPhone X resolution)
- **Format**: PNG
- **Description**: Loading screen shown when app starts

### Adaptive Icon (Android)
- **File**: `adaptive-icon.png`
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Description**: Android adaptive icon (foreground)

### Favicon (Web)
- **File**: `favicon.png`
- **Size**: 32x32 pixels
- **Format**: PNG
- **Description**: Web browser favicon

## Design Guidelines

### App Icon
- Use a simple, recognizable design
- Ensure it looks good at small sizes
- Avoid text that's too small to read
- Use high contrast colors
- Test on both light and dark backgrounds

### Splash Screen
- Keep it simple and clean
- Include your app logo/name
- Use your brand colors
- Avoid too much text or complex graphics
- Ensure it loads quickly

## Creating Assets

### Using Design Tools
- **Figma**: Create 1024x1024 icon, export as PNG
- **Sketch**: Design with proper artboards
- **Photoshop**: Use smart objects for scalability
- **Canva**: Use the app icon template

### Online Generators
- [App Icon Generator](https://appicon.co/)
- [Expo Icon Generator](https://expo.github.io/expo-icons/)
- [MakeAppIcon](https://makeappicon.com/)

## Testing

After adding your assets:
1. Run `expo start` to test the app
2. Check how icons look on different devices
3. Test splash screen timing
4. Verify adaptive icon on Android

## Example Assets

You can create placeholder assets for testing:

```bash
# Create a simple colored square as placeholder
# Use any image editing tool to create:
# - icon.png (1024x1024)
# - splash.png (1242x2436)
# - adaptive-icon.png (1024x1024)
# - favicon.png (32x32)
```

## Brand Guidelines

When creating your final assets:
- Use consistent colors with your app theme
- Maintain visual hierarchy
- Ensure accessibility (good contrast)
- Follow platform-specific guidelines
- Test on actual devices
