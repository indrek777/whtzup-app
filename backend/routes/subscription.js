const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get database connection and middleware
const { pool, logger } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Validation schemas
const subscriptionValidation = [
  body('plan').isIn(['monthly', 'yearly']).withMessage('Plan must be monthly or yearly'),
  body('autoRenew').optional().isBoolean().withMessage('Auto renew must be a boolean')
];

// GET /api/subscription/status - Get current subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT status, plan, start_date, end_date, auto_renew, features
      FROM user_subscriptions
      WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    const subscription = result.rows[0];
    
    // Check if subscription is expired
    let status = subscription.status;
    if (subscription.status === 'premium' && subscription.end_date) {
      const endDate = new Date(subscription.end_date);
      const now = new Date();
      if (endDate < now) {
        status = 'expired';
        // Update the status in database
        await pool.query(`
          UPDATE user_subscriptions 
          SET status = 'expired' 
          WHERE user_id = $1
        `, [userId]);
      }
    }
    
    res.json({
      success: true,
      data: {
        status,
        plan: subscription.plan,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        autoRenew: subscription.auto_renew || false,
        features: subscription.features || []
      }
    });
    
  } catch (error) {
    logger.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

// POST /api/subscription/upgrade - Upgrade to premium
router.post('/upgrade', [authenticateToken, ...subscriptionValidation], async (req, res) => {
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
    const { plan, autoRenew = true } = req.body;
    
    const now = new Date();
    const endDate = new Date();
    
    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    const premiumFeatures = [
      'unlimited_events',
      'advanced_search',
      'priority_support',
      'analytics',
      'custom_categories',
      'export_data',
      'no_ads',
      'early_access',
      'extended_event_radius'
    ];
    
    // Check if user already has a subscription
    const existingResult = await pool.query(`
      SELECT id FROM user_subscriptions WHERE user_id = $1
    `, [userId]);
    
    if (existingResult.rows.length > 0) {
      // Update existing subscription
      await pool.query(`
        UPDATE user_subscriptions 
        SET status = 'premium', plan = $1, start_date = $2, end_date = $3, 
            auto_renew = $4, features = $5, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
      `, [plan, now, endDate, autoRenew, JSON.stringify(premiumFeatures), userId]);
    } else {
      // Create new subscription
      await pool.query(`
        INSERT INTO user_subscriptions (user_id, status, plan, start_date, end_date, auto_renew, features)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, 'premium', plan, now, endDate, autoRenew, JSON.stringify(premiumFeatures)]);
    }
    
    res.json({
      success: true,
      data: {
        status: 'premium',
        plan,
        startDate: now,
        endDate,
        autoRenew,
        features: premiumFeatures
      },
      message: 'Successfully upgraded to premium'
    });
    
  } catch (error) {
    logger.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade subscription'
    });
  }
});

// POST /api/subscription/cancel - Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      UPDATE user_subscriptions 
      SET status = 'expired', auto_renew = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        status: 'expired',
        autoRenew: false
      },
      message: 'Subscription cancelled successfully'
    });
    
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// POST /api/subscription/reactivate - Reactivate subscription
router.post('/reactivate', [authenticateToken, ...subscriptionValidation], async (req, res) => {
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
    const { plan, autoRenew = true } = req.body;
    
    const now = new Date();
    const endDate = new Date();
    
    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    const premiumFeatures = [
      'unlimited_events',
      'advanced_search',
      'priority_support',
      'analytics',
      'custom_categories',
      'export_data',
      'no_ads',
      'early_access',
      'extended_event_radius'
    ];
    
    await pool.query(`
      UPDATE user_subscriptions 
      SET status = 'premium', plan = $1, start_date = $2, end_date = $3, 
          auto_renew = $4, features = $5, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $6
    `, [plan, now, endDate, autoRenew, JSON.stringify(premiumFeatures), userId]);
    
    res.json({
      success: true,
      data: {
        status: 'premium',
        plan,
        startDate: now,
        endDate,
        autoRenew,
        features: premiumFeatures
      },
      message: 'Subscription reactivated successfully'
    });
    
  } catch (error) {
    logger.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate subscription'
    });
  }
});

module.exports = router;
