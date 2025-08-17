# Two-Click Marker Behavior Test

## Implementation Summary

The map markers now have a two-click interaction pattern:

1. **First Click**: Shows the marker's callout (built-in popup with title and description)
2. **Second Click**: Opens the full event details modal with all information

## How to Test

1. **Start the app** and navigate to the map view
2. **Find an event marker** on the map
3. **First click**: Tap the marker once
   - Expected: A small callout appears showing the event name and venue
4. **Second click**: Tap the same marker again
   - Expected: The full event details modal opens with all information
5. **Click elsewhere**: Tap anywhere else on the map
   - Expected: The callout disappears and the interaction resets

## Technical Implementation

- Added `clickedMarkerId` state to track which marker was clicked first
- Added `markerRefs` ref to store references to marker components
- Modified `handleMarkerPress` to implement the two-click logic
- Modified `handleMapPress` to reset the interaction when tapping elsewhere
- Added refs to markers in `memoizedMarkers` for programmatic callout control

## Benefits

- Users can quickly preview event information with the callout
- Full details are available on second click
- Better user experience for mobile devices
- Reduces accidental modal openings
