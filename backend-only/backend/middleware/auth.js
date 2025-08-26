const jwt = require('jsonwebtoken');
const { pool, logger } = require('../config/database');

// Middleware to verify JWT access token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    // Get user from database
    const userResult = await pool.query(`
      SELECT id, email, name, avatar, created_at, last_login, is_active
      FROM users WHERE id = $1
    `, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }
    
    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token expired'
      });
    }
    
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return next(); // Continue without authentication
    }
    
    // Get user from database
    const userResult = await pool.query(`
      SELECT id, email, name, avatar, created_at, last_login, is_active
      FROM users WHERE id = $1
    `, [decoded.userId]);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      
      if (user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.created_at,
          lastLogin: user.last_login
        };
      }
    }
    
    next();
  } catch (error) {
    // If token verification fails, continue without authentication
    next();
  }
};

// Middleware to check if user has premium subscription
const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const subscriptionResult = await pool.query(`
      SELECT status, end_date
      FROM user_subscriptions
      WHERE user_id = $1
    `, [req.user.id]);
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required'
      });
    }
    
    const subscription = subscriptionResult.rows[0];
    
    if (subscription.status !== 'premium') {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required'
      });
    }
    
    // Check if subscription is expired
    if (subscription.end_date && new Date() > new Date(subscription.end_date)) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription has expired'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Premium check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify subscription'
    });
  }
};

// Middleware to check if user can edit/delete an event (only own events)
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

module.exports = {
  authenticateToken,
  optionalAuth,
  requirePremium,
  canEditEvent
};
