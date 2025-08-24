# Event Ownership and Permissions System

This document describes the implementation of event ownership and permissions in the WhtzUp backend, ensuring users can only edit and delete events they created.

## 🔒 Security Implementation

### Authentication Requirements
- **Event Creation**: Requires authentication (`authenticateToken` middleware)
- **Event Updates**: Requires authentication + ownership verification (`canEditEvent` middleware)
- **Event Deletion**: Requires authentication + ownership verification (`canEditEvent` middleware)

### Ownership Verification
- Users can only edit/delete events where `created_by` matches their user ID
- No premium user override - strict ownership enforcement
- Proper error messages for unauthorized access attempts

## 📋 API Endpoints

### 🔐 Protected Endpoints

#### `POST /api/events` - Create Event
- **Authentication**: Required
- **Ownership**: Automatically assigned to authenticated user
- **Usage**: Creates new event with `created_by` set to user's ID

```bash
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Event",
  "venue": "My Venue",
  "latitude": 59.437,
  "longitude": 24.7536,
  "startsAt": "2024-12-25T19:00:00Z"
}
```

#### `PUT /api/events/:id` - Update Event
- **Authentication**: Required
- **Ownership**: Must be event creator
- **Response**: 403 Forbidden if not owner

```bash
PUT /api/events/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Event Name"
}
```

#### `DELETE /api/events/:id` - Delete Event
- **Authentication**: Required
- **Ownership**: Must be event creator
- **Response**: 403 Forbidden if not owner

```bash
DELETE /api/events/:id
Authorization: Bearer <token>
```

### 🔍 Query Endpoints

#### `GET /api/events/my-events` - Get User's Events
- **Authentication**: Required
- **Response**: List of events created by authenticated user
- **Pagination**: Supported with `limit` and `offset` parameters

```bash
GET /api/events/my-events?limit=10&offset=0
Authorization: Bearer <token>
```

#### `GET /api/events/:id/can-edit` - Check Edit Permissions
- **Authentication**: Required
- **Response**: Boolean indicating if user can edit the event

```bash
GET /api/events/:id/can-edit
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "canEdit": true,
    "isOwner": true,
    "eventId": "event-id"
  }
}
```

## 🛡️ Middleware Implementation

### `canEditEvent` Middleware
Located in `backend/middleware/auth.js`

```javascript
const canEditEvent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const { id } = req.params;
    
    // Get the event to check ownership
    const eventResult = await pool.query(`
      SELECT created_by FROM events WHERE id = $1 AND deleted_at IS NULL
    `, [id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    const event = eventResult.rows[0];
    
    // Check if user is the creator of the event
    if (event.created_by === req.user.id) {
      return next(); // User can edit their own events
    }
    
    // User trying to edit someone else's event
    return res.status(403).json({
      success: false,
      error: 'You can only edit events you created.'
    });
    
  } catch (error) {
    logger.error('Event edit permission check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify edit permissions'
    });
  }
};
```

## 🗄️ Database Schema

### Events Table
The `events` table includes a `created_by` field that stores the user ID of the event creator:

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
    created_by VARCHAR(255) NOT NULL, -- User ID of creator
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing

### Test Script
A comprehensive test script (`test-event-permissions.js`) verifies:

1. ✅ User registration and authentication
2. ✅ Event creation with proper ownership
3. ✅ Can-edit endpoint functionality
4. ✅ My-events endpoint functionality
5. ✅ Successful update of own events
6. ✅ Successful deletion of own events
7. ✅ Blocked access to edit others' events
8. ✅ Blocked access to delete others' events

### Test Results
```
🎉 All tests completed successfully!

📋 Summary:
✅ Users can only edit/delete their own events
✅ Authentication is required for edit/delete operations
✅ Can-edit endpoint works correctly
✅ My-events endpoint works correctly
✅ Proper error messages for unauthorized access
```

## 🔧 Frontend Integration

### Check Edit Permissions
Before showing edit/delete buttons, check if user can edit:

```javascript
const checkCanEdit = async (eventId) => {
  try {
    const response = await fetch(`/api/events/${eventId}/can-edit`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.data.canEdit;
  } catch (error) {
    return false;
  }
};
```

### Get User's Events
To display events the user can edit:

```javascript
const getMyEvents = async () => {
  try {
    const response = await fetch('/api/events/my-events', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    return [];
  }
};
```

## 🚨 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "You can only edit events you created."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Event not found"
}
```

## 🔄 Route Order

Important: The route order in `backend/routes/events.js` is critical:

1. `GET /` - Get all events
2. `GET /updates` - Get event updates
3. `GET /my-events` - Get user's events (must come before `/:id`)
4. `GET /:id` - Get single event
5. `GET /:id/can-edit` - Check edit permissions
6. `GET /sync/changes` - Get sync changes

The `/my-events` route must be defined before `/:id` to prevent route conflicts.

## 🎯 Security Benefits

1. **Data Integrity**: Users cannot modify events they didn't create
2. **Privacy Protection**: Event creators maintain control over their content
3. **Audit Trail**: Clear ownership tracking via `created_by` field
4. **Prevention of Abuse**: No unauthorized modifications possible
5. **Clear Error Messages**: Users understand why access is denied

## 📈 Performance Considerations

- **Indexed Queries**: `created_by` field is indexed for fast lookups
- **Efficient Middleware**: Permission checks use minimal database queries
- **Caching Ready**: Can-edit responses can be cached for better performance

---

**Implementation Status**: ✅ Complete and Tested  
**Security Level**: 🔒 High - Strict ownership enforcement  
**API Coverage**: 📋 Full CRUD operations protected
