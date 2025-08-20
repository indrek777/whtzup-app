# Event Editor Guide

## Overview
The Event Editor is a powerful tool that allows users to edit events on the map and make changes that are saved for all users. It supports both single event editing and bulk editing for multiple events with the same venue.

## Features

### Single Event Editing
- Edit any event by long-pressing on its map marker
- Modify title, description, category, venue, address, date, time, and organizer
- Update location using the built-in geocoding search
- Delete events with confirmation

### Bulk Event Editing
- Group events by venue for efficient bulk editing
- Select multiple events to edit simultaneously
- Apply changes to title, category, venue, and address across multiple events
- Export events for backup or sharing

### Data Persistence
- **Local Storage**: All changes are saved to the device's local storage
- **Server Sync**: Changes are automatically synced to the server for all users
- **Fallback**: If server sync fails, a JSON file is downloaded for manual upload

## How to Use

### Opening the Editor
1. **Single Event**: Long-press on any map marker to edit that specific event
2. **Bulk Edit**: Tap the ✏️ (Editor) button in the bottom-right corner of the map

### Single Event Mode
1. Fill in the event details (title and venue are required)
2. Use the location search to update the event's coordinates
3. Tap "Save" to apply changes
4. Tap "Delete" to remove the event (with confirmation)

### Bulk Edit Mode
1. Select events from the grouped list by venue
2. Choose which fields to update (title, category, venue, address)
3. Fill in the new values
4. Tap "Save Changes" to apply to all selected events
5. Use "Export" to download the current events as JSON

## Data Saving Mechanism

### For All Users
The Event Editor ensures that all changes are available to all users through a multi-layered approach:

1. **Immediate Local Save**: Changes are saved to the device's local storage
2. **Server Update**: Changes are sent to the server via `/api/update-events` endpoint
3. **Fallback Download**: If server update fails, a JSON file is downloaded for manual distribution

### Storage Locations
- **Local**: `localStorage.getItem('event-events')` - Immediate access for current user
- **Server**: Backend API endpoint for sharing with all users
- **Backup**: JSON file download for manual distribution

## Technical Implementation

### Event Structure
The editor uses the standardized Event interface:
```typescript
interface Event {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  startsAt: string
  url: string
  venue: string
  address: string
  source: string
  category?: string
  createdBy?: string
  updatedAt?: string
  // ... additional fields
}
```

### Key Functions
- `updateEventForAllUsers()`: Updates single event and saves for all users
- `deleteEventForAllUsers()`: Deletes event and saves for all users
- `saveEventsToFile()`: Saves events to local storage and server
- `updateServerJSONFile()`: Syncs changes to server for all users

### Error Handling
- Network failures trigger fallback to JSON download
- Loading indicators show operation progress
- User-friendly error messages guide troubleshooting

## Best Practices

### For Event Editors
1. Always verify venue and address information
2. Use the location search for accurate coordinates
3. Test changes before bulk editing multiple events
4. Export data regularly for backup

### For Data Management
1. Monitor server sync status in console logs
2. Use the JSON export feature for manual distribution
3. Verify changes appear for all users after editing
4. Keep backup copies of important event data

## Troubleshooting

### Common Issues
1. **Server Connection Failed**: Check network connection and server status
2. **Changes Not Appearing**: Verify local storage and server sync
3. **Bulk Edit Not Working**: Ensure events are properly grouped by venue
4. **Location Search Issues**: Check internet connection for geocoding service

### Solutions
1. **Manual Distribution**: Use the exported JSON file to share changes
2. **Local Backup**: Check localStorage for saved event data
3. **Server Restart**: Restart the backend server if needed
4. **Clear Cache**: Clear app cache if changes aren't appearing

## Security Considerations

- All edits are logged with timestamps
- User attribution is maintained through `createdBy` field
- Server validation ensures data integrity
- Fallback mechanisms prevent data loss

## Future Enhancements

- Real-time collaboration features
- Version history and rollback capabilities
- Advanced filtering and search in bulk edit mode
- Integration with external event management systems
