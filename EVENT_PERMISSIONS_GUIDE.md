# Event Permissions System Guide

## Overview
The Event Permissions System ensures that free users can only edit and delete events they created, while premium users have full editing capabilities for all events. This system provides both backend and frontend protection to maintain data integrity and user privacy.

## System Architecture

### Backend Protection
- **Authentication Middleware**: All event editing/deletion operations require valid JWT authentication
- **Permission Middleware**: `canEditEvent` middleware checks user permissions before allowing operations
- **Database Integration**: Uses the `created_by` field in the events table to track event ownership

### Frontend Protection
- **Permission Checking**: `userService.canEditEvent()` method determines UI visibility
- **Error Handling**: Comprehensive error messages for unauthorized operations
- **Real-time Updates**: Permission status updates when user authentication changes

## Permission Rules

### Free Users
- ✅ Can edit/delete events they created
- ✅ Can edit legacy events with `source: 'user'` but no `createdBy` field (backward compatibility)
- ❌ Cannot edit/delete events created by other users
- ❌ Cannot edit/delete public events

### Premium Users
- ✅ Can edit/delete any event (full access)
- ✅ Can edit/delete their own events
- ✅ Can edit/delete other users' events
- ✅ Can edit/delete public events

### Unauthenticated Users
- ❌ Cannot edit/delete any events
- ❌ Cannot access event editing features

## Implementation Details

### Backend Changes

#### 1. Authentication Middleware (`backend/middleware/auth.js`)
```javascript
// New middleware: canEditEvent
const canEditEvent = async (req, res, next) => {
  // Check authentication
  // Verify event ownership or premium subscription
  // Allow or deny based on permissions
};
```

#### 2. Events Routes (`backend/routes/events.js`)
```javascript
// Protected routes with authentication and permission checks
router.put('/:id', authenticateToken, canEditEvent, eventValidation, async (req, res) => {
  // Update event logic
});

router.delete('/:id', authenticateToken, canEditEvent, async (req, res) => {
  // Delete event logic
});
```

#### 3. Error Handling
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Event not found
- **500 Internal Server Error**: Server-side errors

### Frontend Changes

#### 1. User Service (`src/utils/userService.ts`)
```typescript
// New method: canEditEvent
async canEditEvent(event: { createdBy?: string; source?: string }): Promise<boolean> {
  // Check authentication status
  // Check premium subscription
  // Check event ownership
  // Handle legacy events
}
```

#### 2. Event Service (`src/utils/eventService.ts`)
```typescript
// Enhanced error handling with authentication headers
async updateEvent(eventId: string, updatedData: Partial<Event>): Promise<{ success: boolean; error?: string }> {
  // Include authentication headers
  // Handle specific error responses
  // Return detailed error messages
}
```

#### 3. Map Component (`src/components/MapViewNative.tsx`)
```typescript
// Permission-based UI rendering
const canEdit = await userService.canEditEvent(event);
{canEdit && (
  <View style={styles.eventDetailsActionButtons}>
    <TouchableOpacity onPress={() => startEditingEvent(event)}>
      <Text>Edit</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => deleteEvent(event.id)}>
      <Text>Delete</Text>
    </TouchableOpacity>
  </View>
)}
```

## Database Schema

### Events Table
```sql
CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'other',
    venue VARCHAR(500) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL DEFAULT 0,
    longitude DECIMAL(11, 8) NOT NULL DEFAULT 0,
    starts_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) DEFAULT 'Event Organizer', -- User who created the event
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Subscriptions Table
```sql
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'free', -- 'free', 'premium', 'expired'
    plan VARCHAR(50), -- 'monthly', 'yearly'
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Backend Tests (`test-event-permissions.js`)
Tests the complete permission system:
- ✅ Free user can edit own events
- ✅ Premium user can edit any events
- ✅ Unauthenticated user cannot edit events
- ✅ Proper error messages for unauthorized access

### Frontend Tests (`test-frontend-permissions.js`)
Tests the frontend permission logic:
- ✅ Permission checking for different user types
- ✅ Legacy event support
- ✅ Edge case handling

## Error Messages

### Authentication Errors
- **401**: "Authentication required. Please sign in to edit events."
- **401**: "Authentication required. Please sign in to delete events."

### Permission Errors
- **403**: "You can only edit events you created. Upgrade to premium to edit any event."
- **403**: "You do not have permission to delete this event. Upgrade to premium to delete any event."

### General Errors
- **404**: "Event not found."
- **500**: "Failed to update event" / "Failed to delete event"

## Security Features

### 1. Multi-Layer Protection
- **Frontend**: UI-level permission checks
- **Backend**: Server-side authentication and authorization
- **Database**: Event ownership tracking

### 2. Token-Based Authentication
- JWT access tokens for API requests
- Automatic token refresh
- Token revocation on logout

### 3. Input Validation
- Request validation using express-validator
- SQL injection prevention
- XSS protection

### 4. Audit Trail
- Sync logging for all operations
- Device tracking
- User action history

## Migration and Backward Compatibility

### Legacy Event Support
- Events with `source: 'user'` but no `createdBy` field are treated as editable by free users
- This ensures existing events remain accessible during the transition

### Database Migration
- Existing events are automatically assigned a default `created_by` value
- New events require proper user association

## Usage Examples

### Checking Permissions (Frontend)
```typescript
// Check if user can edit an event
const canEdit = await userService.canEditEvent(event);

if (canEdit) {
  // Show edit/delete buttons
  showEditButtons();
} else {
  // Hide edit/delete buttons
  hideEditButtons();
}
```

### API Calls (Backend)
```javascript
// Update event with authentication
const response = await fetch('/api/events/123', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updatedEvent)
});

if (response.status === 403) {
  // Handle permission error
  const error = await response.json();
  console.log(error.error); // "You can only edit events you created..."
}
```

## Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - User is not logged in
   - Token has expired
   - Solution: Sign in again

2. **"You do not have permission" error**
   - Free user trying to edit another user's event
   - Premium subscription expired
   - Solution: Upgrade to premium or contact event creator

3. **Edit buttons not showing**
   - User not authenticated
   - Event permissions not checked
   - Solution: Check authentication status and permissions

### Debug Steps

1. Check user authentication status
2. Verify event ownership (`created_by` field)
3. Check premium subscription status
4. Review backend logs for detailed error information
5. Test with different user types

## Future Enhancements

### Planned Features
- **Event Transfer**: Allow users to transfer event ownership
- **Collaborative Editing**: Multiple users can edit the same event
- **Permission Delegation**: Event creators can grant editing permissions
- **Audit Logs**: Detailed history of who edited what and when

### Performance Optimizations
- **Caching**: Cache permission results for better performance
- **Batch Operations**: Handle multiple permission checks efficiently
- **Lazy Loading**: Load permissions only when needed

## Conclusion

The Event Permissions System provides robust protection for event data while maintaining a good user experience. It ensures that free users can only modify their own content while premium users have enhanced capabilities. The system is designed to be secure, scalable, and maintainable.
