
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

    // Add date filtering if from and/or to parameters are provided
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

    // Add radius-based filtering if coordinates and radius are provided
    if (latitude && longitude && radius) {
      paramCount++;
      
      // Get current user ID from the request (if authenticated)
      const currentUserId = req.user?.id || null;
      
      if (currentUserId) {
        // User is authenticated, include their events regardless of radius
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
        // No authentication, only include events within radius
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
