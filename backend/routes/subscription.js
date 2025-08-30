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
      return res.json({
        success: true,
        data: {
          status: 'free',
          plan: null,
          startDate: null,
          endDate: null,
          autoRenew: false,
          features: ['basic_search', 'basic_filtering', 'view_events']
        }
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

// GET /api/subscription/usage - Get subscription usage statistics
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user stats
    const statsResult = await pool.query(`
      SELECT events_created, events_created_today, last_event_created_date
      FROM user_stats
      WHERE user_id = $1
    `, [userId]);
    
    // Get subscription limits
    const subscriptionResult = await pool.query(`
      SELECT status, plan, features
      FROM user_subscriptions
      WHERE user_id = $1
    `, [userId]);
    
    const stats = statsResult.rows[0] || { events_created: 0, events_created_today: 0 };
    const subscription = subscriptionResult.rows[0];
    
    // Determine limits based on subscription status
    let dailyLimit = 1; // Free users
    let monthlyLimit = 30;
    
    if (subscription && subscription.status === 'premium') {
      dailyLimit = 50;
      monthlyLimit = 1500;
    } else if (subscription && subscription.status === 'expired') {
      dailyLimit = 5; // Registered users
      monthlyLimit = 150;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const lastCreatedDate = stats.last_event_created_date;
    const eventsCreatedToday = lastCreatedDate === today ? (stats.events_created_today || 0) : 0;
    
    res.json({
      success: true,
      data: {
        daily: {
          used: eventsCreatedToday,
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - eventsCreatedToday)
        },
        monthly: {
          used: stats.events_created || 0,
          limit: monthlyLimit,
          remaining: Math.max(0, monthlyLimit - (stats.events_created || 0))
        },
        total: {
          eventsCreated: stats.events_created || 0,
          eventsAttended: 0, // TODO: Implement attendance tracking
          ratingsGiven: 0 // TODO: Implement rating tracking
        }
      }
    });
    
  } catch (error) {
    logger.error('Get subscription usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription usage'
    });
  }
});

// GET /api/subscription/billing - Get billing history
router.get('/billing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For demo purposes, return mock billing history
    // In a real implementation, this would query a billing table
    const billingHistory = [
      {
        id: 'bill_001',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 4.99,
        currency: 'USD',
        status: 'paid',
        description: 'Monthly Premium Subscription',
        plan: 'monthly'
      },
      {
        id: 'bill_002',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 4.99,
        currency: 'USD',
        status: 'paid',
        description: 'Monthly Premium Subscription',
        plan: 'monthly'
      }
    ];
    
    res.json({
      success: true,
      data: billingHistory
    });
    
  } catch (error) {
    logger.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get billing history'
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
      'extended_event_radius',
      'advanced_filtering',
      'premium_categories',
      'create_groups',
      'priority_support'
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
      'extended_event_radius',
      'advanced_filtering',
      'premium_categories',
      'create_groups',
      'priority_support'
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

// POST /api/subscription/change-plan - Change subscription plan
router.post('/change-plan', [authenticateToken, ...subscriptionValidation], async (req, res) => {
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
    
    // Get current subscription
    const currentResult = await pool.query(`
      SELECT plan, end_date FROM user_subscriptions WHERE user_id = $1 AND status = 'premium'
    `, [userId]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active premium subscription found'
      });
    }
    
    const currentSubscription = currentResult.rows[0];
    const now = new Date();
    let newEndDate = new Date(currentSubscription.end_date);
    
    // Calculate new end date based on remaining time
    if (plan !== currentSubscription.plan) {
      const remainingDays = Math.ceil((newEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (plan === 'monthly') {
        newEndDate = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);
      } else {
        // Convert to yearly
        newEndDate = new Date(now.getTime() + remainingDays * 24 * 60 * 60 * 1000);
      }
    }
    
    await pool.query(`
      UPDATE user_subscriptions 
      SET plan = $1, end_date = $2, auto_renew = $3, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4
    `, [plan, newEndDate, autoRenew, userId]);
    
    res.json({
      success: true,
      data: {
        plan,
        endDate: newEndDate,
        autoRenew
      },
      message: 'Subscription plan changed successfully'
    });
    
  } catch (error) {
    logger.error('Change subscription plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change subscription plan'
    });
  }
});

// GET /api/subscription/features - Get available features for current subscription
router.get('/features', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT status, features FROM user_subscriptions WHERE user_id = $1
    `, [userId]);
    
    let features = ['basic_search', 'basic_filtering', 'view_events'];
    let status = 'free';
    
    if (result.rows.length > 0) {
      const subscription = result.rows[0];
      status = subscription.status;
      if (subscription.features) {
        features = subscription.features;
      }
    }
    
    // Define all available features
    const allFeatures = {
      basic: [
        'basic_search',
        'basic_filtering', 
        'view_events',
        'create_events',
        'rate_events'
      ],
      premium: [
        'unlimited_events',
        'advanced_search',
        'priority_support',
        'analytics',
        'custom_categories',
        'export_data',
        'no_ads',
        'early_access',
        'extended_event_radius',
        'advanced_filtering',
        'premium_categories',
        'create_groups',
        'priority_support'
      ]
    };
    
    res.json({
      success: true,
      data: {
        status,
        currentFeatures: features,
        availableFeatures: allFeatures,
        upgradeBenefits: status === 'free' ? allFeatures.premium : []
      }
    });
    
  } catch (error) {
    logger.error('Get subscription features error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription features'
    });
  }
});

// POST /api/subscription/validate-receipt - Validate Apple receipt
router.post('/validate-receipt', authenticateToken, [
  body('receiptData').isString().notEmpty().withMessage('Receipt data is required'),
  body('productId').isString().notEmpty().withMessage('Product ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { receiptData, productId } = req.body;
    const userId = req.user.id;

    console.log('🔍 Validating receipt for user:', userId);

    // Import receipt validator
    const { ReceiptValidator } = require('../../src/utils/receiptValidator');
    
    const validator = new ReceiptValidator(
      'com.eventdiscovery.app',
      '1.5.0',
      process.env.APPLE_SHARED_SECRET
    );

    // Validate receipt
    const validationResult = await validator.validateReceipt(receiptData);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Receipt validation failed',
        details: validationResult.error
      });
    }

    if (!validationResult.isValid) {
      return res.status(400).json({
        error: 'Invalid receipt',
        details: validationResult.error
      });
    }

    // Check if product ID matches
    if (validationResult.productId !== productId) {
      return res.status(400).json({
        error: 'Product ID mismatch',
        expected: productId,
        received: validationResult.productId
      });
    }

    // Determine subscription plan
    const plan = productId === 'premium_monthly' ? 'monthly' : 'yearly';

    // Calculate subscription dates
    const startDate = validationResult.purchaseDate;
    const endDate = validationResult.expirationDate || new Date();

    // If no expiration date, calculate based on plan
    if (!validationResult.expirationDate) {
      if (plan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
    }

    // Check if user already has a subscription
    const existingResult = await pool.query(
      'SELECT id FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    const subscriptionData = {
      status: validationResult.isExpired ? 'expired' : 'premium',
      plan,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: validationResult.autoRenewStatus,
      features: [
        'unlimited_events',
        'advanced_search',
        'priority_support',
        'analytics',
        'custom_categories',
        'export_data',
        'no_ads',
        'early_access',
        'extended_event_radius',
        'advanced_filtering',
        'premium_categories',
        'create_groups'
      ],
      transactionId: validationResult.transactionId,
      originalTransactionId: validationResult.originalTransactionId,
      receiptData: receiptData,
      environment: validationResult.environment,
      isTrialPeriod: validationResult.isTrialPeriod,
      isIntroOfferPeriod: validationResult.isIntroOfferPeriod
    };

    if (existingResult.rows.length > 0) {
      // Update existing subscription
      await pool.query(`
        UPDATE user_subscriptions 
        SET status = $1, plan = $2, start_date = $3, end_date = $4, 
            auto_renew = $5, features = $6, transaction_id = $7, 
            original_transaction_id = $8, receipt_data = $9, 
            environment = $10, is_trial_period = $11, is_intro_offer_period = $12,
            updated_at = NOW()
        WHERE user_id = $13
      `, [
        subscriptionData.status,
        subscriptionData.plan,
        subscriptionData.startDate,
        subscriptionData.endDate,
        subscriptionData.autoRenew,
        JSON.stringify(subscriptionData.features),
        subscriptionData.transactionId,
        subscriptionData.originalTransactionId,
        subscriptionData.receiptData,
        subscriptionData.environment,
        subscriptionData.isTrialPeriod,
        subscriptionData.isIntroOfferPeriod,
        userId
      ]);
    } else {
      // Create new subscription
      await pool.query(`
        INSERT INTO user_subscriptions (
          user_id, status, plan, start_date, end_date, auto_renew, 
          features, transaction_id, original_transaction_id, 
          receipt_data, environment, is_trial_period, is_intro_offer_period
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        userId,
        subscriptionData.status,
        subscriptionData.plan,
        subscriptionData.startDate,
        subscriptionData.endDate,
        subscriptionData.autoRenew,
        JSON.stringify(subscriptionData.features),
        subscriptionData.transactionId,
        subscriptionData.originalTransactionId,
        subscriptionData.receiptData,
        subscriptionData.environment,
        subscriptionData.isTrialPeriod,
        subscriptionData.isIntroOfferPeriod
      ]);
    }

    console.log('✅ Receipt validated and subscription updated for user:', userId);

    res.json({
      success: true,
      message: 'Receipt validated successfully',
      subscription: {
        status: subscriptionData.status,
        plan: subscriptionData.plan,
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.endDate,
        autoRenew: subscriptionData.autoRenew,
        features: subscriptionData.features,
        isTrialPeriod: subscriptionData.isTrialPeriod,
        isIntroOfferPeriod: subscriptionData.isIntroOfferPeriod,
        environment: subscriptionData.environment
      },
      validation: {
        isValid: validationResult.isValid,
        isExpired: validationResult.isExpired,
        autoRenewStatus: validationResult.autoRenewStatus,
        environment: validationResult.environment
      }
    });

  } catch (error) {
    logger.error('Validate receipt error:', error);
    res.status(500).json({
      error: 'Failed to validate receipt'
    });
  }
});

module.exports = router;
