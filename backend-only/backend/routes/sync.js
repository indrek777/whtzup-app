const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get database connection from config
const { pool, redis } = require('../config/database');

// POST /api/sync/queue - Add operation to offline queue
router.post('/queue', [
  body('operation').isIn(['CREATE', 'UPDATE', 'DELETE']).withMessage('Invalid operation'),
  body('eventData').isObject().withMessage('Event data is required'),
  body('deviceId').isString().withMessage('Device ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { operation, eventData, deviceId } = req.body;

    const query = `
      INSERT INTO offline_queue (operation, event_data, device_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [operation, eventData, deviceId]);
    const queueItem = result.rows[0];

    res.status(201).json({
      success: true,
      data: queueItem,
      message: 'Operation queued for sync'
    });
  } catch (error) {
    console.error('Error queuing operation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to queue operation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/sync/process - Process offline queue
router.post('/process', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const deviceIdHeader = req.headers['x-device-id'];

    // Get unprocessed queue items for this device
    const queueQuery = `
      SELECT * FROM offline_queue 
      WHERE device_id = $1 AND processed = false
      ORDER BY timestamp ASC
    `;

    const queueResult = await pool.query(queueQuery, [deviceId || deviceIdHeader]);
    const queueItems = queueResult.rows;

    const results = [];
    const errors = [];

    for (const item of queueItems) {
      try {
        let result;
        
        switch (item.operation) {
          case 'CREATE':
            result = await processCreate(item.event_data);
            break;
          case 'UPDATE':
            result = await processUpdate(item.event_data);
            break;
          case 'DELETE':
            result = await processDelete(item.event_data.id);
            break;
          default:
            throw new Error(`Unknown operation: ${item.operation}`);
        }

        // Mark as processed
        await pool.query(
          'UPDATE offline_queue SET processed = true WHERE id = $1',
          [item.id]
        );

        results.push({
          queueId: item.id,
          operation: item.operation,
          success: true,
          result
        });
      } catch (error) {
        // Mark as failed
        await pool.query(
          'UPDATE offline_queue SET processed = true, error_message = $1 WHERE id = $2',
          [error.message, item.id]
        );

        errors.push({
          queueId: item.id,
          operation: item.operation,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error processing sync queue:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process sync queue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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
      isOnline: true // You can implement actual online detection here
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

// POST /api/sync/conflicts - Resolve conflicts
router.post('/conflicts', async (req, res) => {
  try {
    const { conflicts } = req.body;
    const deviceId = req.headers['x-device-id'];

    const results = [];

    for (const conflict of conflicts) {
      try {
        const { eventId, localVersion, serverVersion, resolution } = conflict;

        // Get current server version
        const serverQuery = 'SELECT * FROM events WHERE id = $1';
        const serverResult = await pool.query(serverQuery, [eventId]);
        
        if (serverResult.rows.length === 0) {
          throw new Error('Event not found on server');
        }

        const serverEvent = serverResult.rows[0];

        // Apply resolution based on strategy
        let resolvedEvent;
        switch (resolution) {
          case 'local':
            resolvedEvent = localVersion;
            break;
          case 'server':
            resolvedEvent = serverVersion;
            break;
          case 'merge':
            resolvedEvent = mergeEvents(localVersion, serverVersion);
            break;
          default:
            throw new Error(`Unknown resolution strategy: ${resolution}`);
        }

        // Update with resolved version
        const updateQuery = `
          UPDATE events 
          SET name = $1, description = $2, category = $3, venue = $4, address = $5,
              latitude = $6, longitude = $7, starts_at = $8, created_by = $9,
              updated_at = CURRENT_TIMESTAMP, version = version + 1
          WHERE id = $10
          RETURNING *
        `;

        const values = [
          resolvedEvent.name, resolvedEvent.description, resolvedEvent.category,
          resolvedEvent.venue, resolvedEvent.address, resolvedEvent.latitude,
          resolvedEvent.longitude, resolvedEvent.startsAt, resolvedEvent.createdBy,
          eventId
        ];

        const updateResult = await pool.query(updateQuery, values);
        const updatedEvent = updateResult.rows[0];

        results.push({
          eventId,
          success: true,
          resolvedEvent: updatedEvent
        });
      } catch (error) {
        results.push({
          eventId: conflict.eventId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      resolved: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Error resolving conflicts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resolve conflicts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions for processing queue items
async function processCreate(eventData) {
  const query = `
    INSERT INTO events (id, name, description, category, venue, address, 
                       latitude, longitude, starts_at, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    eventData.id, eventData.name, eventData.description, eventData.category,
    eventData.venue, eventData.address, eventData.latitude, eventData.longitude,
    eventData.startsAt, eventData.createdBy
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function processUpdate(eventData) {
  const query = `
    UPDATE events 
    SET name = $1, description = $2, category = $3, venue = $4, address = $5,
        latitude = $6, longitude = $7, starts_at = $8, created_by = $9,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;

  const values = [
    eventData.name, eventData.description, eventData.category,
    eventData.venue, eventData.address, eventData.latitude,
    eventData.longitude, eventData.startsAt, eventData.createdBy,
    eventData.id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function processDelete(eventId) {
  const query = `
    UPDATE events 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [eventId]);
  return result.rows[0];
}

// Helper function to merge events
function mergeEvents(localEvent, serverEvent) {
  // Simple merge strategy - take the most recent non-null values
  return {
    ...localEvent,
    name: localEvent.name || serverEvent.name,
    description: localEvent.description || serverEvent.description,
    category: localEvent.category || serverEvent.category,
    venue: localEvent.venue || serverEvent.venue,
    address: localEvent.address || serverEvent.address,
    latitude: localEvent.latitude !== 0 ? localEvent.latitude : serverEvent.latitude,
    longitude: localEvent.longitude !== 0 ? localEvent.longitude : serverEvent.longitude,
    startsAt: localEvent.startsAt || serverEvent.startsAt,
    createdBy: localEvent.createdBy || serverEvent.createdBy
  };
}

module.exports = router;
