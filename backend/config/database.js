const { Pool } = require('pg');
const Redis = require('redis');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whtzup-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local development
});

// Redis connection
const redis = Redis.createClient({
  url: process.env.REDIS_URL
});

redis.on('error', (err) => logger.error('Redis Client Error', err));
redis.on('connect', () => logger.info('Connected to Redis'));

// Connect to Redis
redis.connect().catch(err => logger.error('Failed to connect to Redis:', err));

// Graceful shutdown for Redis
process.on('SIGTERM', async () => {
  try {
    if (redis.isReady) {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
});

module.exports = { pool, redis, logger };
