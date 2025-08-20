const express = require('express');
const router = express.Router();

// Get database connection from config
const { pool, redis } = require('../config/database');

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// GET /api/health/detailed - Detailed health check with all services
router.get('/detailed', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {}
    };

    // Check database connection
    try {
      const dbResult = await pool.query('SELECT NOW() as current_time');
      health.services.database = {
        status: 'OK',
        currentTime: dbResult.rows[0].current_time
      };
    } catch (error) {
      health.services.database = {
        status: 'ERROR',
        error: error.message
      };
      health.status = 'DEGRADED';
    }

    // Check Redis connection
    try {
      await redis.ping();
      health.services.redis = {
        status: 'OK'
      };
    } catch (error) {
      health.services.redis = {
        status: 'ERROR',
        error: error.message
      };
      health.status = 'DEGRADED';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    };

    // Check event count
    try {
      const eventCountResult = await pool.query('SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL');
      health.events = {
        total: parseInt(eventCountResult.rows[0].count)
      };
    } catch (error) {
      health.events = {
        error: error.message
      };
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// GET /api/health/ready - Readiness probe for Kubernetes
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await pool.query('SELECT 1');
    
    // Check if Redis is ready
    await redis.ping();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/live - Liveness probe for Kubernetes
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
