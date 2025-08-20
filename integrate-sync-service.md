# Integrating Sync Service with React Native App

## 🚀 **Step 1: Update App Configuration**

### Update `src/utils/syncService.ts`
The sync service is already created and ready to use. Make sure it's configured to use port 4000:

```typescript
const API_BASE_URL = __DEV__ ? 'http://localhost:4000' : 'https://your-production-domain.com';
```

## 🚀 **Step 2: Update MapViewNative.tsx**

Replace the current event loading logic with the sync service:

```typescript
// Add import at the top
import { syncService } from '../utils/syncService';

// Replace the events state initialization
const [events, setEvents] = useState<Event[]>([]);

// Add useEffect to load events from sync service
useEffect(() => {
  const loadEvents = async () => {
    try {
      const eventsFromServer = await syncService.fetchEvents();
      setEvents(eventsFromServer);
    } catch (error) {
      console.error('Error loading events:', error);
      // Fallback to local events if server is unavailable
      setEvents(eventsData);
    }
  };

  loadEvents();
}, []);

// Add sync status listener
useEffect(() => {
  const handleSyncStatus = (status: any) => {
    console.log('Sync status:', status);
  };

  syncService.addListener('sync-status', handleSyncStatus);
  
  return () => {
    syncService.removeListener('sync-status', handleSyncStatus);
  };
}, []);
```

## 🚀 **Step 3: Update EventEditor.tsx**

Replace the current event saving logic with sync service:

```typescript
// Add import at the top
import { syncService } from '../utils/syncService';

// Replace saveEvent function
const saveEvent = async (event: Event) => {
  try {
    if (event.id) {
      // Update existing event
      const updatedEvent = await syncService.updateEvent(event);
      onUpdateEvent(updatedEvent);
    } else {
      // Create new event
      const newEvent = await syncService.createEvent(event);
      onUpdateEvent(newEvent);
    }
    
    Alert.alert('Success', 'Event saved successfully!');
  } catch (error) {
    console.error('Error saving event:', error);
    Alert.alert('Error', 'Failed to save event. It will be synced when online.');
  }
};

// Replace deleteEventHandler function
const deleteEventHandler = async (eventId: string) => {
  try {
    await syncService.deleteEvent(eventId);
    onDeleteEvent(eventId);
    Alert.alert('Success', 'Event deleted successfully!');
  } catch (error) {
    console.error('Error deleting event:', error);
    Alert.alert('Error', 'Failed to delete event. It will be synced when online.');
  }
};
```

## 🚀 **Step 4: Add Sync Status UI**

Add a sync status indicator to your app:

```typescript
// In your main App component or MapViewNative
const [syncStatus, setSyncStatus] = useState({
  isOnline: true,
  pendingOperations: 0,
  lastSyncAt: null
});

useEffect(() => {
  const updateSyncStatus = async () => {
    const status = await syncService.getSyncStatusAsync();
    setSyncStatus(status);
  };

  updateSyncStatus();
  
  // Update status every 30 seconds
  const interval = setInterval(updateSyncStatus, 30000);
  
  return () => clearInterval(interval);
}, []);
```

## 🚀 **Step 5: Test the Integration**

1. **Start the Docker backend**:
   ```bash
   docker-compose up -d
   ```

2. **Run the migration script**:
   ```bash
   node migrate-to-docker-fixed.js
   ```

3. **Start your React Native app**:
   ```bash
   npm start
   ```

4. **Test offline/online functionality**:
   - Turn off network connection
   - Make changes to events
   - Turn network back on
   - Verify changes sync to server

## 🚀 **Step 6: Verify Data Sync**

Check that all your events are now in the Docker backend:

```bash
# Test the API
node test-docker-setup.js

# Check database directly
docker exec whtzup-postgres psql -U whtzup_user -d whtzup_events -c "SELECT COUNT(*) FROM events;"
```

## 📊 **Expected Results**

After successful integration:
- ✅ All 13,359 events migrated to Docker backend
- ✅ Real-time synchronization between devices
- ✅ Offline support with automatic sync when online
- ✅ Event editing, creation, and deletion synced across devices
- ✅ Conflict resolution for simultaneous edits

## 🔧 **Troubleshooting**

If you encounter issues:

1. **Check Docker containers**: `docker-compose ps`
2. **Check API logs**: `docker-compose logs api-server`
3. **Test API manually**: `node test-docker-setup.js`
4. **Check database**: `docker exec whtzup-postgres psql -U whtzup_user -d whtzup_events -c "\dt"`

## 📱 **Next Steps**

1. Test the app with multiple devices
2. Verify real-time updates work
3. Test offline functionality
4. Monitor sync performance
5. Consider adding sync progress indicators
