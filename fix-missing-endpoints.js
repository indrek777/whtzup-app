const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://165.22.90.180:4000/api';

// Test missing endpoints
async function testEndpoints() {
  console.log('🔍 Testing API endpoints...');
  
  const endpoints = [
    '/health',
    '/events',
    '/events/count',
    '/sync/status',
    '/auth/login',
    '/subscription/status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ints@me.com_access_token_1756455873582',
          'X-Device-ID': 'test-device-123'
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - OK (${response.status})`);
      } else {
        console.log(`❌ ${endpoint} - Error (${response.status})`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Network Error: ${error.message}`);
    }
  }
}

// Create missing endpoint implementations
function createMissingEndpoints() {
  console.log('🔧 Creating missing endpoint implementations...');
  
  // Add missing endpoints to events.js
  const eventsEndpoints = `
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

    // Add date filtering if from and/or to parameters are provided
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

    // Add radius-based filtering if coordinates and radius are provided
    if (latitude && longitude && radius) {
      paramCount++;
      
      // Get current user ID from the request (if authenticated)
      const currentUserId = req.user?.id || null;
      
      if (currentUserId) {
        // User is authenticated, include their events regardless of radius
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
        // No authentication, only include events within radius
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
`;

  // Add missing endpoints to sync.js
  const syncEndpoints = `
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
`;

  console.log('📝 Generated endpoint implementations:');
  console.log('  - /api/events/count endpoint');
  console.log('  - /api/sync/status endpoint');
  
  // Save to files
  fs.writeFileSync('events-count-endpoint.js', eventsEndpoints);
  fs.writeFileSync('sync-status-endpoint.js', syncEndpoints);
  
  console.log('💾 Saved endpoint implementations to files');
}

// Main function
async function main() {
  console.log('🚀 Starting endpoint fix...');
  
  await testEndpoints();
  createMissingEndpoints();
  
  console.log('\n🎉 Endpoint fix completed!');
  console.log('📁 Check the generated files for endpoint implementations');
}

// Run the fix
main();
