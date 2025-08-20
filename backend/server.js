const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database configuration
const { pool, redis, logger } = require('./config/database');

// Import routes and middleware
const eventsRouter = require('./routes/events');
const syncRouter = require('./routes/sync');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { validateDeviceId } = require('./middleware/deviceValidation');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://olympio.ee'] 
    : ['http://localhost:3000', 'http://localhost:8081', 'exp://localhost:8081', 'http://olympio.ee:4000', 'exp://olympio.ee:8081', 'http://10.0.0.57:4000', 'exp://10.0.0.57:8081']
}));

// Rate limiting (can be disabled with DISABLE_RATE_LIMIT=true)
// Rate limiting is disabled during bulk migration to avoid 429s
// Re-enable in production as needed.
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);
logger.warn('Rate limiting middleware is DISABLED for migration');

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/events', validateDeviceId, (req, res, next) => {
  req.io = io;
  next();
}, eventsRouter);
app.use('/api/sync', validateDeviceId, syncRouter);
app.use('/api/health', healthRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Join device room for targeted updates
  socket.on('join-device', (deviceId) => {
    socket.join(`device-${deviceId}`);
    logger.info(`Device ${deviceId} joined room`);
  });

  // Handle event updates
  socket.on('event-updated', async (data) => {
    try {
      const { eventId, eventData, deviceId } = data;
      
      // Broadcast to all connected clients except sender
      socket.broadcast.emit('event-updated', {
        eventId,
        eventData,
        timestamp: new Date().toISOString()
      });
      
      // Log the update
      await logSyncEvent(eventId, 'UPDATE', null, eventData, deviceId);
      
      logger.info(`Event ${eventId} updated by device ${deviceId}`);
    } catch (error) {
      logger.error('Error handling event update:', error);
    }
  });

  // Handle event creation
  socket.on('event-created', async (data) => {
    try {
      const { eventId, eventData, deviceId } = data;
      
      socket.broadcast.emit('event-created', {
        eventId,
        eventData,
        timestamp: new Date().toISOString()
      });
      
      await logSyncEvent(eventId, 'CREATE', null, eventData, deviceId);
      
      logger.info(`Event ${eventId} created by device ${deviceId}`);
    } catch (error) {
      logger.error('Error handling event creation:', error);
    }
  });

  // Handle event deletion
  socket.on('event-deleted', async (data) => {
    try {
      const { eventId, deviceId } = data;
      
      socket.broadcast.emit('event-deleted', {
        eventId,
        timestamp: new Date().toISOString()
      });
      
      await logSyncEvent(eventId, 'DELETE', null, null, deviceId);
      
      logger.info(`Event ${eventId} deleted by device ${deviceId}`);
    } catch (error) {
      logger.error('Error handling event deletion:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Helper function to log sync events
async function logSyncEvent(eventId, operation, oldData, newData, deviceId) {
  try {
    const query = `
      INSERT INTO sync_log (event_id, operation, old_data, new_data, device_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [eventId, operation, oldData, newData, deviceId]);
  } catch (error) {
    logger.error('Error logging sync event:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  
  try {
    if (redis.isReady) {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, server, io, pool, redis };
