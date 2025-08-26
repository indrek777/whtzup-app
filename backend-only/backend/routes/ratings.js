const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get database connection from config
const { pool, logger } = require('../config/database');

// Import authentication middleware
const { authenticateToken } = require('../middleware/auth');

// Helper function to update event rating stats
async function updateEventRatingStats(eventId) {
  try {
    // Calculate new stats
    const statsQuery = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1_count,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2_count,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3_count,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4_count,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5_count
      FROM event_ratings 
      WHERE event_id = $1
    `;
    
    const statsResult = await pool.query(statsQuery, [eventId]);
    const stats = statsResult.rows[0];
    
    // Update or insert stats
    const upsertQuery = `
      INSERT INTO event_rating_stats (
        event_id, average_rating, total_ratings, 
        rating_1_count, rating_2_count, rating_3_count, rating_4_count, rating_5_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (event_id) DO UPDATE SET
        average_rating = EXCLUDED.average_rating,
        total_ratings = EXCLUDED.total_ratings,
        rating_1_count = EXCLUDED.rating_1_count,
        rating_2_count = EXCLUDED.rating_2_count,
        rating_3_count = EXCLUDED.rating_3_count,
        rating_4_count = EXCLUDED.rating_4_count,
        rating_5_count = EXCLUDED.rating_5_count,
        last_updated = CURRENT_TIMESTAMP
    `;
    
    await pool.query(upsertQuery, [
      eventId,
      parseFloat(stats.average_rating || 0).toFixed(2),
      parseInt(stats.total_ratings || 0),
      parseInt(stats.rating_1_count || 0),
      parseInt(stats.rating_2_count || 0),
      parseInt(stats.rating_3_count || 0),
      parseInt(stats.rating_4_count || 0),
      parseInt(stats.rating_5_count || 0)
    ]);
    
    logger.info(`Updated rating stats for event ${eventId}`);
  } catch (error) {
    logger.error('Error updating event rating stats:', error);
  }
}

// POST /api/ratings - Rate an event
router.post('/', [
  authenticateToken,
  body('eventId').isString().notEmpty().withMessage('Event ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isString().isLength({ max: 1000 }).withMessage('Review must be less than 1000 characters')
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

    const { eventId, rating, review } = req.body;
    const userId = req.user.id;

    // Check if event exists
    const eventQuery = 'SELECT id FROM events WHERE id = $1 AND deleted_at IS NULL';
    const eventResult = await pool.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Insert or update rating
    const upsertQuery = `
      INSERT INTO event_ratings (event_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (event_id, user_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        review = EXCLUDED.review,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [eventId, userId, rating, review]);
    const ratingData = result.rows[0];

    // Update event rating stats
    await updateEventRatingStats(eventId);

    // Get updated stats
    const statsQuery = 'SELECT * FROM event_rating_stats WHERE event_id = $1';
    const statsResult = await pool.query(statsQuery, [eventId]);
    const stats = statsResult.rows[0] || { average_rating: 0, total_ratings: 0 };

    logger.info(`User ${userId} rated event ${eventId} with ${rating} stars`);

    res.status(201).json({
      success: true,
      data: {
        rating: ratingData,
        stats: stats
      },
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting rating:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit rating',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ratings/event/:eventId - Get ratings for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get event rating stats
    const statsQuery = 'SELECT * FROM event_rating_stats WHERE event_id = $1';
    const statsResult = await pool.query(statsQuery, [eventId]);
    const stats = statsResult.rows[0] || { average_rating: 0, total_ratings: 0 };

    // Get individual ratings with user info
    const ratingsQuery = `
      SELECT 
        er.id, er.rating, er.review, er.created_at, er.updated_at,
        u.name as user_name, u.avatar as user_avatar
      FROM event_ratings er
      LEFT JOIN users u ON er.user_id = u.id
      WHERE er.event_id = $1
      ORDER BY er.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const ratingsResult = await pool.query(ratingsQuery, [eventId, limit, offset]);
    const ratings = ratingsResult.rows;

    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM event_ratings WHERE event_id = $1';
    const countResult = await pool.query(countQuery, [eventId]);
    const totalRatings = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        stats: stats,
        ratings: ratings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRatings,
          pages: Math.ceil(totalRatings / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching event ratings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch ratings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ratings/user/:userId - Get user's ratings
router.get('/user/:userId', [
  authenticateToken
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user can access these ratings (own ratings or admin)
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const query = `
      SELECT 
        er.id, er.rating, er.review, er.created_at, er.updated_at,
        e.id as event_id, e.name as event_name, e.venue as event_venue,
        e.starts_at as event_starts_at
      FROM event_ratings er
      JOIN events e ON er.event_id = e.id
      WHERE er.user_id = $1 AND e.deleted_at IS NULL
      ORDER BY er.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);
    const ratings = result.rows;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM event_ratings er
      JOIN events e ON er.event_id = e.id
      WHERE er.user_id = $1 AND e.deleted_at IS NULL
    `;
    const countResult = await pool.query(countQuery, [userId]);
    const totalRatings = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        ratings: ratings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRatings,
          pages: Math.ceil(totalRatings / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user ratings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user ratings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/ratings/:ratingId - Delete a rating
router.delete('/:ratingId', [
  authenticateToken
], async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id;

    // Get rating to check ownership
    const ratingQuery = 'SELECT event_id, user_id FROM event_ratings WHERE id = $1';
    const ratingResult = await pool.query(ratingQuery, [ratingId]);
    
    if (ratingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    const rating = ratingResult.rows[0];

    // Check if user owns the rating
    if (rating.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Delete the rating
    const deleteQuery = 'DELETE FROM event_ratings WHERE id = $1';
    await pool.query(deleteQuery, [ratingId]);

    // Update event rating stats
    await updateEventRatingStats(rating.event_id);

    logger.info(`User ${userId} deleted rating ${ratingId}`);

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting rating:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete rating',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ratings/top-rated - Get top rated events
router.get('/top-rated', async (req, res) => {
  try {
    const { limit = 10, minRatings = 1 } = req.query;

    const query = `
      SELECT 
        e.id, e.name, e.description, e.venue, e.category,
        ers.average_rating, ers.total_ratings
      FROM events e
      JOIN event_rating_stats ers ON e.id = ers.event_id
      WHERE e.deleted_at IS NULL 
        AND ers.total_ratings >= $1
      ORDER BY ers.average_rating DESC, ers.total_ratings DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [minRatings, limit]);
    const topRatedEvents = result.rows;

    res.json({
      success: true,
      data: topRatedEvents
    });
  } catch (error) {
    logger.error('Error fetching top rated events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch top rated events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
