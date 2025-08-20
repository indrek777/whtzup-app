const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get database connection and middleware
const { pool, logger } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Validation schemas
const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be less than 255 characters')
];

const signinValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Helper function to generate JWT tokens
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', jti: uuidv4() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

// Helper function to create user profile data
async function createUserProfile(userId, email, name) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create user subscription
    await client.query(`
      INSERT INTO user_subscriptions (user_id, status, features)
      VALUES ($1, $2, $3)
    `, [userId, 'free', JSON.stringify(['basic_search', 'basic_filtering', 'local_ratings'])]);
    
    // Create user preferences
    await client.query(`
      INSERT INTO user_preferences (user_id, notifications, email_updates, default_radius, favorite_categories, language, theme)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, true, true, 10, JSON.stringify([]), 'en', 'auto']);
    
    // Create user stats
    await client.query(`
      INSERT INTO user_stats (user_id, events_created, events_attended, ratings_given, reviews_written, total_events, favorite_venues)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, 0, 0, 0, 0, 0, JSON.stringify([])]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// POST /api/auth/signup - User registration
router.post('/signup', signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const userId = uuidv4();
    const result = await pool.query(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, name, created_at
    `, [userId, email, passwordHash, name]);
    
    // Create user profile data
    await createUserProfile(userId, email, name);
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId);
    
    // Store refresh token (new user, so no existing tokens to revoke)
    await pool.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
    `, [userId, refreshToken]);
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
    
    const user = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        accessToken,
        refreshToken
      }
    });
    
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user account'
    });
  }
});

// POST /api/auth/signin - User login
router.post('/signin', signinValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    
    // Find user by email
    const userResult = await pool.query(`
      SELECT id, email, password_hash, name, created_at, last_login, is_active
      FROM users WHERE email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
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
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Revoke any existing refresh tokens for this user
    await pool.query(`
      UPDATE refresh_tokens
      SET is_revoked = TRUE
      WHERE user_id = $1 AND is_revoked = FALSE
    `, [user.id]);
    
    // Store new refresh token
    await pool.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
    `, [user.id, refreshToken]);
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
          lastLogin: user.last_login
        },
        accessToken,
        refreshToken
      }
    });
    
  } catch (error) {
    logger.error('Signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate user'
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    // Check if refresh token exists and is not revoked
    const tokenResult = await pool.query(`
      SELECT user_id, expires_at, is_revoked
      FROM refresh_tokens
      WHERE token = $1
    `, [refreshToken]);
    
    if (tokenResult.rows.length === 0 || tokenResult.rows[0].is_revoked) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or revoked refresh token'
      });
    }
    
    const tokenData = tokenResult.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired'
      });
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenData.user_id);
    
    // Revoke old refresh token
    await pool.query(`
      UPDATE refresh_tokens
      SET is_revoked = TRUE
      WHERE token = $1
    `, [refreshToken]);
    
    // Store new refresh token
    await pool.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
    `, [tokenData.user_id, newRefreshToken]);
    
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// POST /api/auth/signout - User logout
router.post('/signout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Revoke refresh token
      await pool.query(`
        UPDATE refresh_tokens
        SET is_revoked = TRUE
        WHERE token = $1
      `, [refreshToken]);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    logger.error('Signout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Set by auth middleware
    
    // Get user data with related information
    const userResult = await pool.query(`
      SELECT 
        u.id, u.email, u.name, u.avatar, u.created_at, u.last_login,
        us.status as subscription_status, us.plan, us.start_date, us.end_date, us.auto_renew, us.features,
        up.notifications, up.email_updates, up.default_radius, up.favorite_categories, up.language, up.theme,
        ust.events_created, ust.events_attended, ust.ratings_given, ust.reviews_written, ust.total_events, ust.favorite_venues,
        ust.last_event_created_date, ust.events_created_today
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id
      LEFT JOIN user_preferences up ON u.id = up.user_id
      LEFT JOIN user_stats ust ON u.id = ust.user_id
      WHERE u.id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = userResult.rows[0];
    
    // Format response
    const user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      createdAt: userData.created_at,
      lastLogin: userData.last_login,
      subscription: {
        status: userData.subscription_status || 'free',
        plan: userData.plan,
        startDate: userData.start_date,
        endDate: userData.end_date,
        autoRenew: userData.auto_renew || false,
        features: userData.features || []
      },
      preferences: {
        notifications: userData.notifications,
        emailUpdates: userData.email_updates,
        defaultRadius: userData.default_radius,
        favoriteCategories: userData.favorite_categories || [],
        language: userData.language,
        theme: userData.theme
      },
      stats: {
        eventsCreated: userData.events_created || 0,
        eventsAttended: userData.events_attended || 0,
        ratingsGiven: userData.ratings_given || 0,
        reviewsWritten: userData.reviews_written || 0,
        totalEvents: userData.total_events || 0,
        favoriteVenues: userData.favorite_venues || [],
        lastEventCreatedDate: userData.last_event_created_date,
        eventsCreatedToday: userData.events_created_today || 0
      }
    };
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Name must be less than 255 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
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

    const userId = req.user.id;
    const { name, avatar } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
    }
    
    if (avatar !== undefined) {
      paramCount++;
      updateFields.push(`avatar = $${paramCount}`);
      updateValues.push(avatar);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    paramCount++;
    updateValues.push(userId);
    
    const result = await pool.query(`
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, name, avatar, created_at, last_login
    `, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
    
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

module.exports = router;
