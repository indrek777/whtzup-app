# Marker Icon Debugging Guide

## Issue Description
Users are not seeing category-based icons on the map markers. The markers should display emoji icons (⚽, 🎵, 🎨, etc.) based on the event category, but they appear to be missing or not visible.

## Debugging Steps Implemented

### 1. Added Comprehensive Debug Logging
- **CustomMarker Component**: Added logging to track marker creation with event details, category, color, and icon
- **ClusterMarker Component**: Added logging to track cluster marker creation
- **Memoized Markers**: Added logging to track the marker creation flow and count

### 2. Added Test Marker
- Added a simple red test marker at fixed coordinates (Tallinn, Estonia) to verify basic map rendering
- This will help determine if the issue is with custom markers or map rendering in general

### 3. Enhanced Marker Styling
- Explicitly set fontSize, fontWeight, and textAlign in the marker text style
- This ensures the emoji icons are properly sized and positioned

## Potential Issues Identified

### 1. **Marker Visibility Issues**
- **Text Color**: Icons might be invisible due to color contrast issues
- **Font Size**: Icons might be too small to see
- **Z-Index**: Markers might be rendered behind other map elements

### 2. **Category Detection Issues**
- **determineCategory Function**: Might not be returning the expected category names
- **Category Mapping**: Mismatch between UI categories and function categories
- **Case Sensitivity**: Category matching might be case-sensitive

### 3. **Map Rendering Issues**
- **React Native Maps**: Version compatibility issues
- **Platform Differences**: iOS vs Android rendering differences
- **Performance Limits**: Too many markers causing rendering issues

### 4. **Data Issues**
- **Event Coordinates**: Events might not have valid coordinates
- **Event Categories**: Events might not have proper category assignments
- **Filtered Events**: Events might be filtered out before marker creation

## Debugging Commands

### Run the Test Script
```bash
node test-marker-rendering.js
```

### Check Console Logs
Look for logs with "🎯" prefix:
- `🎯 Creating memoized markers`
- `🎯 Creating individual marker for event`
- `🎯 CustomMarker rendering`
- `🎯 ClusterMarker rendering`

### Expected Debug Output
```
🎯 Creating memoized markers: {
  filteredEventsCount: 500,
  memoizedClustersCount: 0,
  maxMarkersToRender: 1000
}
🎯 Creating individual marker for event: {
  eventId: "123",
  eventName: "Football Match",
  category: "sports"
}
🎯 CustomMarker rendering: {
  eventId: "123",
  eventName: "Football Match",
  category: "sports",
  markerColor: "red",
  markerIcon: "⚽",
  coordinates: { lat: 59.436962, lng: 24.753574 }
}
```

## Troubleshooting Steps

### Step 1: Verify Test Marker
1. Run the app
2. Look for a red pin marker in Tallinn, Estonia
3. If visible: Map rendering works, issue is with custom markers
4. If not visible: Issue is with map rendering in general

### Step 2: Check Console Logs
1. Open developer console
2. Look for "🎯" prefixed logs
3. Verify that markers are being created
4. Check category, color, and icon values

### Step 3: Verify Event Data
1. Check if events have valid coordinates
2. Verify event categories are properly set
3. Ensure events are not being filtered out

### Step 4: Test Category Functions
1. Test `getMarkerColor()` with different categories
2. Test `getMarkerIcon()` with different categories
3. Test `determineCategory()` with event names/descriptions

## Common Solutions

### If Test Marker is Visible but Custom Markers Aren't:
1. **Check marker styling**: Ensure proper colors and sizes
2. **Verify category functions**: Test with hardcoded categories
3. **Check z-index**: Ensure markers are on top
4. **Test with simple markers**: Replace custom markers with basic pins

### If No Markers Are Visible:
1. **Check map permissions**: Ensure location access
2. **Verify coordinates**: Check if events have valid lat/lng
3. **Test map region**: Ensure map is centered on events
4. **Check React Native Maps**: Verify installation and linking

### If Icons Are Missing but Markers Are Visible:
1. **Test emoji rendering**: Try different emoji characters
2. **Check font support**: Ensure device supports emoji fonts
3. **Test with text**: Replace emojis with text labels
4. **Verify category detection**: Check if categories are being detected correctly

## Next Steps

1. **Run the app** and check for the test marker
2. **Monitor console logs** for debugging information
3. **Verify event data** has proper coordinates and categories
4. **Test with different categories** to see if any work
5. **Check platform differences** (iOS vs Android)

## Files Modified

- `src/components/MapViewNative.tsx`: Added debugging logs and test marker
- `test-marker-rendering.js`: Created test script
- `MARKER_DEBUGGING_GUIDE.md`: This debugging guide

The debugging logs will help identify exactly where the issue occurs in the marker rendering pipeline.
