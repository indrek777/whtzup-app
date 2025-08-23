# Marker Visibility Debugging Steps

## Current Status
✅ All required components are present in `MapViewNative.tsx`:
- Marker import from react-native-maps
- CustomMarker component with emoji icons
- ClusterMarker component with emoji icons
- getMarkerIcon and getMarkerColor functions
- determineCategory function
- Debug logs with 🎯 prefix
- Test marker (red) for verification

## Debugging Steps

### 1. Run the App
```bash
npm start
```
Then press 'a' for Android or 'i' for iOS

### 2. Check Console Logs
Look for logs with 🎯 prefix in the console:

#### Expected Logs:
- `🎯 CustomMarker rendering:` - Shows individual event markers being created
- `🎯 ClusterMarker rendering:` - Shows cluster markers being created
- `🎯 Creating memoized markers:` - Shows marker creation process
- `🎯 Creating individual marker for event:` - Shows each event being processed

#### What to Look For:
1. **Event Data**: Check if events have proper coordinates (latitude/longitude)
2. **Categories**: Check if events have categories assigned
3. **Icons**: Check if markerIcon and markerColor are being set
4. **Coordinates**: Verify coordinates are valid numbers

### 3. Visual Verification
1. **Test Marker**: Look for a red marker at coordinates (59.436962, 24.753574) - Estonia center
2. **Custom Markers**: Look for markers with emoji icons instead of default pins
3. **Clusters**: Look for cluster markers with numbers and emoji icons

### 4. Potential Issues to Check

#### Issue 1: Events Missing Coordinates
- Check if events have valid latitude/longitude values
- Look for `NaN` or `undefined` coordinates in logs

#### Issue 2: Categories Not Assigned
- Check if `determineCategory` function is working
- Verify events have meaningful names/descriptions

#### Issue 3: Icons Not Visible
- Check if emoji font size is too small
- Verify markerText style has proper fontSize (should be 20)
- Check if emoji characters are supported on device

#### Issue 4: Clustering Issues
- Check if events are being clustered instead of shown individually
- Verify cluster radius settings

#### Issue 5: Performance Limits
- Check if `MAX_MARKERS_TO_RENDER` is limiting visible markers
- Verify `MAX_EVENTS_TO_PROCESS` isn't filtering out too many events

### 5. Debug Commands

#### Check Event Data:
```javascript
// In console, check if events have proper data
console.log('Events:', events);
console.log('Filtered events:', filteredEvents);
```

#### Check Marker Creation:
```javascript
// Look for these logs in console
🎯 Creating memoized markers: { filteredEventsCount, memoizedClustersCount, maxMarkersToRender }
🎯 Creating individual marker for event: { eventId, eventName, category, markerColor, markerIcon, coordinates }
```

#### Check CustomMarker Rendering:
```javascript
// Look for these logs in console
🎯 CustomMarker rendering: { eventId, eventName, category, markerColor, markerIcon, coordinates }
```

### 6. Quick Fixes to Try

#### If Icons Are Too Small:
- Increase fontSize in markerText style
- Check if fontWeight is set to 'bold'

#### If No Markers Appear:
- Check if test marker (red) is visible
- Verify MapView is rendering correctly
- Check if events have valid coordinates

#### If Only Default Pins Show:
- Verify CustomMarker component is being used
- Check if markerIcon and markerColor are being passed correctly

### 7. Expected Behavior
- **Test Marker**: Red pin at Estonia center (always visible)
- **Individual Events**: Emoji icons with category-based colors
- **Clusters**: Number + emoji icon for multiple events
- **Performance**: Smooth rendering with large datasets

### 8. Next Steps After Running App
1. Check console logs for 🎯 prefixed messages
2. Verify test marker appears on map
3. Look for custom markers with emoji icons
4. Report any errors or missing functionality
5. Share console output for further debugging

## File Locations
- Main Component: `src/components/MapViewNative.tsx`
- Event Data: `src/data/events.ts`
- Event Interface: `src/data/events.ts`
- Debug Scripts: `debug-marker-flow.js`, `test-marker-rendering.js`
