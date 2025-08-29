
# Missing API Endpoints Fix

## Issues Found
1. /api/events/count - 404 Not Found
2. /api/sync/status - 404 Not Found
3. /api/auth/login - 404 Not Found
4. Database connection failing

## Solutions

### 1. Add /api/events/count endpoint
Add this to backend/routes/events.js:

```javascript
// GET /api/events/count - Get total count of events with filters
router.get('/count', optionalAuth, async (req, res) => {
  try {
    const { category, venue, latitude, longitude, radius, from, to } = req.query;
    
    let query = 'SELECT COUNT(*) as total FROM events WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (venue) {
      paramCount++;
      query += ` AND venue ILIKE $${paramCount}`;
      params.push(`%${venue}%`);
    }

    // Add date filtering
    if (from) {
      paramCount++;
      query += ` AND starts_at >= $${paramCount}`;
      params.push(from + 'T00:00:00.000Z');
    }

    if (to) {
      paramCount++;
      query += ` AND starts_at <= $${paramCount}`;
      params.push(to + 'T23:59:59.999Z');
    }

    // Add radius-based filtering
    if (latitude && longitude && radius) {
      paramCount++;
      const currentUserId = req.user?.id || null;
      
      if (currentUserId) {
        query += ` AND (
          created_by = $${paramCount} OR
          (
            6371 * acos(
              cos(radians($${paramCount + 1})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians($${paramCount + 2})) + 
              sin(radians($${paramCount + 1})) * 
              sin(radians(latitude))
            )
          ) <= $${paramCount + 3}
        )`;
        params.push(currentUserId, parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
      } else {
        query += ` AND (
          6371 * acos(
            cos(radians($${paramCount})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians($${paramCount + 1})) + 
            sin(radians($${paramCount})) * 
            sin(radians(latitude))
          )
        ) <= $${paramCount + 2}`;
        params.push(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
      }
    }

    const result = await pool.query(query, params);
    const total = parseInt(result.rows[0].total);
    
    res.json({
      success: true,
      count: total,
      filters: { category, venue, latitude, longitude, radius, from, to }
    });
  } catch (error) {
    console.error('Error counting events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to count events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

### 2. Add /api/sync/status endpoint
Add this to backend/routes/sync.js:

```javascript
// GET /api/sync/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const deviceIdHeader = req.headers['x-device-id'];
    const currentDeviceId = deviceId || deviceIdHeader;

    // Get queue status
    const queueQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,
        COUNT(CASE WHEN processed = false THEN 1 END) as pending,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors
      FROM offline_queue 
      WHERE device_id = $1
    `;

    const queueResult = await pool.query(queueQuery, [currentDeviceId]);
    const queueStatus = queueResult.rows[0];

    // Get last sync time
    const lastSyncQuery = `
      SELECT MAX(updated_at) as last_sync
      FROM events 
      WHERE updated_at > (SELECT MAX(timestamp) FROM sync_log WHERE device_id = $1)
    `;

    const lastSyncResult = await pool.query(lastSyncQuery, [currentDeviceId]);
    const lastSync = lastSyncResult.rows[0]?.last_sync;

    res.json({
      success: true,
      deviceId: currentDeviceId,
      queue: {
        total: parseInt(queueStatus.total),
        processed: parseInt(queueStatus.processed),
        pending: parseInt(queueStatus.pending),
        errors: parseInt(queueStatus.errors)
      },
      lastSync: lastSync,
      isOnline: true
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get sync status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

### 3. Check auth routes
Make sure backend/routes/auth.js exists and has login endpoint:

```javascript
// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  // Implementation here
});
```

## Deployment Steps
1. Fix database connection
2. Add missing endpoints
3. Restart the server
4. Test all endpoints
