const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get database connection from config
const { pool } = require('../config/database');

// Import authentication middleware
const { authenticateToken, canEditEvent } = require('../middleware/auth');

// Helper function to transform database fields to frontend format
function transformEventFields(event) {
  return {
    ...event,
    createdBy: event.created_by,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    startsAt: event.starts_at,
    deletedAt: event.deleted_at,
    lastSyncAt: event.last_sync_at
  };
}

// Validation schemas
const eventValidation = [
  body('name').trim().isLength({ min: 1, max: 500 }).withMessage('Name is required and must be less than 500 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('category').optional().isIn(['music', 'food', 'sports', 'art', 'business', 'other']).withMessage('Invalid category'),
  body('venue').trim().isLength({ min: 1, max: 500 }).withMessage('Venue is required and must be less than 500 characters'),
  body('address').optional().isLength({ max: 1000 }).withMessage('Address must be less than 1000 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('startsAt').isISO8601().withMessage('Invalid date format'),
  body('createdBy').optional().isLength({ max: 255 }).withMessage('Created by must be less than 255 characters')
];

// Validation schema for updates (all fields optional)
const eventUpdateValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Name must be less than 500 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('category').optional().isIn(['music', 'food', 'sports', 'art', 'business', 'other']).withMessage('Invalid category'),
  body('venue').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Venue must be less than 500 characters'),
  body('address').optional().isLength({ max: 1000 }).withMessage('Address must be less than 1000 characters'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('startsAt').optional().isISO8601().withMessage('Invalid date format'),
  body('createdBy').optional().isLength({ max: 255 }).withMessage('Created by must be less than 255 characters')
];

// GET /api/events - Get all events
router.get('/', async (req, res) => {
  try {
    const { category, venue, limit = 15000, offset = 0, latitude, longitude, radius } = req.query;
    const deviceId = req.headers['x-device-id'];
    
    let query = 'SELECT * FROM events WHERE deleted_at IS NULL';
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

    // Add radius-based filtering if coordinates and radius are provided
    if (latitude && longitude && radius) {
      paramCount++;
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
      paramCount += 2; // Increment by 2 since we used 3 parameters
    }

    query += ' ORDER BY starts_at DESC';
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    
    // Transform field names for frontend compatibility
    const transformedEvents = result.rows.map(transformEventFields);
    
    res.json({
      success: true,
      data: transformedEvents,
      count: transformedEvents.length,
      deviceId
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deviceId = req.headers['x-device-id'];

    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }

    res.json({
      success: true,
      data: transformEventFields(result.rows[0]),
      deviceId
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch event',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/events - Create new event
router.post('/', authenticateToken, eventValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const deviceId = req.headers['x-device-id'];
    const {
      name, description, category, venue, address, 
      latitude, longitude, startsAt, createdBy
    } = req.body;

    // Check if event with same name and venue already exists
    const existingQuery = `
      SELECT * FROM events 
      WHERE name = $1 AND venue = $2 AND deleted_at IS NULL
      LIMIT 1
    `;
    const existingResult = await pool.query(existingQuery, [name, venue]);
    
    if (existingResult.rows.length > 0) {
      // Event already exists, return the existing event
      const existingEvent = existingResult.rows[0];
      console.log(`Event already exists: ${name} at ${venue}, returning existing event`);
      
      return res.status(200).json({
        success: true,
        data: transformEventFields(existingEvent),
        message: 'Event already exists',
        deviceId,
        isDuplicate: true
      });
    }

    const eventId = uuidv4();
    const query = `
      INSERT INTO events (id, name, description, category, venue, address, 
                         latitude, longitude, starts_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      eventId, name, description, category || 'other', venue, address,
      latitude, longitude, startsAt, req.user.id // Use authenticated user's ID
    ];

    const result = await pool.query(query, values);
    const newEvent = result.rows[0];

    // Log the creation
    console.log(`Event created: ${newEvent.name} at ${newEvent.venue}`);

    // Broadcast to all connected clients with transformed event data
    if (req.io) {
      req.io.emit('event-created', {
        eventId: newEvent.id,
        eventData: transformEventFields(newEvent),
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: transformEventFields(newEvent),
      message: 'Event created successfully',
      deviceId
    });
  } catch (error) {
    console.error('Error creating event:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'idx_events_name_venue_unique') {
      return res.status(409).json({
        success: false,
        error: 'Event already exists',
        details: 'An event with this name and venue already exists',
        deviceId
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create event',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', authenticateToken, canEditEvent, eventUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const deviceId = req.headers['x-device-id'];
    const updateData = req.body;

    // Check if event exists
    const checkResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }

    const currentEvent = checkResult.rows[0];
    
    // Build dynamic update query based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Only update fields that are provided in the request
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${++paramCount}`);
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${++paramCount}`);
      values.push(updateData.description);
    }
    if (updateData.category !== undefined) {
      updateFields.push(`category = $${++paramCount}`);
      values.push(updateData.category);
    }
    if (updateData.venue !== undefined) {
      updateFields.push(`venue = $${++paramCount}`);
      values.push(updateData.venue);
    }
    if (updateData.address !== undefined) {
      updateFields.push(`address = $${++paramCount}`);
      values.push(updateData.address);
    }
    if (updateData.latitude !== undefined) {
      updateFields.push(`latitude = $${++paramCount}`);
      values.push(updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      updateFields.push(`longitude = $${++paramCount}`);
      values.push(updateData.longitude);
    }
    if (updateData.startsAt !== undefined) {
      updateFields.push(`starts_at = $${++paramCount}`);
      values.push(updateData.startsAt);
    }
    if (updateData.createdBy !== undefined) {
      updateFields.push(`created_by = $${++paramCount}`);
      values.push(updateData.createdBy);
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause parameter
    values.push(id);

    const query = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const updatedEvent = result.rows[0];

          // Broadcast to all connected clients with transformed event data
      req.io.emit('event-updated', {
        eventId: updatedEvent.id,
        eventData: transformEventFields(updatedEvent),
        timestamp: new Date().toISOString()
      });

    res.json({
      success: true,
      data: transformEventFields(updatedEvent),
      message: 'Event updated successfully',
      deviceId
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update event',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/events/:id - Soft delete event
router.delete('/:id', authenticateToken, canEditEvent, async (req, res) => {
  try {
    const { id } = req.params;
    const deviceId = req.headers['x-device-id'];

    // Check if event exists
    const checkResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }

    // Soft delete
    const result = await pool.query(
      'UPDATE events SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    const deletedEvent = result.rows[0];

          // Broadcast to all connected clients
      req.io.emit('event-deleted', {
        eventId: deletedEvent.id,
        timestamp: new Date().toISOString()
      });

    res.json({
      success: true,
      message: 'Event deleted successfully',
      deviceId
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete event',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/events/sync/changes - Get changes since last sync
router.get('/sync/changes', async (req, res) => {
  try {
    const { lastSyncAt, deviceId } = req.query;
    const deviceIdHeader = req.headers['x-device-id'];

    let query = `
      SELECT * FROM events 
      WHERE updated_at > $1 AND deleted_at IS NULL
      ORDER BY updated_at ASC
    `;
    const params = [lastSyncAt || '1970-01-01'];

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      lastSyncAt: new Date().toISOString(),
      deviceId: deviceIdHeader
    });
  } catch (error) {
    console.error('Error fetching sync changes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sync changes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
