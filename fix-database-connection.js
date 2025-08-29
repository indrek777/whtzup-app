const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://165.22.90.180:4000/api';

// Database configuration fix
const databaseConfig = `
# Database Configuration Fix for Digital Ocean Server

## Current Issue
The server is trying to connect to PostgreSQL with user "postgres" but authentication is failing.

## Solution
Update the DATABASE_URL environment variable on the Digital Ocean server:

### Option 1: Use the correct database URL
DATABASE_URL=postgresql://whtzup_user:whtzup_password@localhost:5432/whtzup_events

### Option 2: Create the correct user and database
1. Connect to the server via SSH
2. Run PostgreSQL commands:

\`\`\`sql
-- Create user and database
CREATE USER whtzup_user WITH PASSWORD 'whtzup_password';
CREATE DATABASE whtzup_events OWNER whtzup_user;
GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;

-- Connect to the database and create tables
\\c whtzup_events

-- Run the initialization script
\\i /path/to/init.sql
\`\`\`

### Option 3: Update environment variables
Set these environment variables on the server:

\`\`\`bash
export DATABASE_URL="postgresql://whtzup_user:whtzup_password@localhost:5432/whtzup_events"
export POSTGRES_PASSWORD="whtzup_password"
export NODE_ENV="production"
\`\`\`

## Docker Configuration
If using Docker, update the docker-compose.yml:

\`\`\`yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: whtzup_events
      POSTGRES_USER: whtzup_user
      POSTGRES_PASSWORD: whtzup_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  api-server:
    environment:
      DATABASE_URL: postgresql://whtzup_user:whtzup_password@postgres:5432/whtzup_events
\`\`\`

## Manual Database Setup
If you need to set up the database manually:

1. Install PostgreSQL on the server
2. Create the database and user
3. Run the initialization script
4. Update the environment variables
5. Restart the application

## Test Connection
After fixing, test with:

\`\`\`bash
curl http://165.22.90.180:4000/api/health
curl http://165.22.90.180:4000/api/events
\`\`\`
`;

// Missing endpoints fix
const missingEndpoints = `
# Missing API Endpoints Fix

## Issues Found
1. /api/events/count - 404 Not Found
2. /api/sync/status - 404 Not Found
3. /api/auth/login - 404 Not Found
4. Database connection failing

## Solutions

### 1. Add /api/events/count endpoint
Add this to backend/routes/events.js:

\`\`\`javascript
// GET /api/events/count - Get total count of events with filters
router.get('/count', optionalAuth, async (req, res) => {
  try {
    const { category, venue, latitude, longitude, radius, from, to } = req.query;
    
    let query = 'SELECT COUNT(*) as total FROM events WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += \` AND category = \$\${paramCount}\`;
      params.push(category);
    }

    if (venue) {
      paramCount++;
      query += \` AND venue ILIKE \$\${paramCount}\`;
      params.push(\`%\${venue}%\`);
    }

    // Add date filtering
    if (from) {
      paramCount++;
      query += \` AND starts_at >= \$\${paramCount}\`;
      params.push(from + 'T00:00:00.000Z');
    }

    if (to) {
      paramCount++;
      query += \` AND starts_at <= \$\${paramCount}\`;
      params.push(to + 'T23:59:59.999Z');
    }

    // Add radius-based filtering
    if (latitude && longitude && radius) {
      paramCount++;
      const currentUserId = req.user?.id || null;
      
      if (currentUserId) {
        query += \` AND (
          created_by = \$\${paramCount} OR
          (
            6371 * acos(
              cos(radians(\$\${paramCount + 1})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(\$\${paramCount + 2})) + 
              sin(radians(\$\${paramCount + 1})) * 
              sin(radians(latitude))
            )
          ) <= \$\${paramCount + 3}
        )\`;
        params.push(currentUserId, parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
      } else {
        query += \` AND (
          6371 * acos(
            cos(radians(\$\${paramCount})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(\$\${paramCount + 1})) + 
            sin(radians(\$\${paramCount})) * 
            sin(radians(latitude))
          )
        ) <= \$\${paramCount + 2}\`;
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
\`\`\`

### 2. Add /api/sync/status endpoint
Add this to backend/routes/sync.js:

\`\`\`javascript
// GET /api/sync/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const deviceIdHeader = req.headers['x-device-id'];
    const currentDeviceId = deviceId || deviceIdHeader;

    // Get queue status
    const queueQuery = \`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,
        COUNT(CASE WHEN processed = false THEN 1 END) as pending,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors
      FROM offline_queue 
      WHERE device_id = \$1
    \`;

    const queueResult = await pool.query(queueQuery, [currentDeviceId]);
    const queueStatus = queueResult.rows[0];

    // Get last sync time
    const lastSyncQuery = \`
      SELECT MAX(updated_at) as last_sync
      FROM events 
      WHERE updated_at > (SELECT MAX(timestamp) FROM sync_log WHERE device_id = \$1)
    \`;

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
\`\`\`

### 3. Check auth routes
Make sure backend/routes/auth.js exists and has login endpoint:

\`\`\`javascript
// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  // Implementation here
});
\`\`\`

## Deployment Steps
1. Fix database connection
2. Add missing endpoints
3. Restart the server
4. Test all endpoints
`;

// Save the fixes
fs.writeFileSync('database-fix.md', databaseConfig);
fs.writeFileSync('endpoints-fix.md', missingEndpoints);

console.log('🔧 Database and endpoint fixes created!');
console.log('📁 Check database-fix.md and endpoints-fix.md for solutions');
console.log('');
console.log('🚨 Main Issues:');
console.log('1. Database authentication failing (postgres user)');
console.log('2. Missing /api/events/count endpoint');
console.log('3. Missing /api/sync/status endpoint');
console.log('4. Missing /api/auth/login endpoint');
console.log('');
console.log('💡 Next Steps:');
console.log('1. Fix database connection on Digital Ocean server');
console.log('2. Add missing endpoints to backend routes');
console.log('3. Restart the server');
console.log('4. Test the app again');
