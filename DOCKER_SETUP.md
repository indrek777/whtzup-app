# WhtzUp Docker Backend Setup

This document explains how to set up and use the Docker-based backend system for WhtzUp Events with real-time synchronization and offline support.

## 🏗️ Architecture Overview

The system consists of:

- **PostgreSQL Database**: Stores all event data with versioning and sync tracking
- **Redis Cache**: Handles real-time features and session management
- **Node.js API Server**: RESTful API with Socket.IO for real-time updates
- **Nginx Reverse Proxy**: Production-ready load balancing (optional)

## 📋 Prerequisites

1. **Docker Desktop** installed and running
2. **Docker Compose** (usually included with Docker Desktop)
3. **Node.js 18+** (for local development)
4. **Git** (for version control)

## 🚀 Quick Start

### 1. Start the Backend System

```bash
# Windows
start-docker.bat

# Linux/Mac
docker-compose up --build -d
```

### 2. Verify Services

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Health check
curl http://localhost:3000/health
```

### 3. Access Services

- **API Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Detailed Health**: http://localhost:3000/api/health/detailed
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://whtzup_user:whtzup_password@postgres:5432/whtzup_events
POSTGRES_DB=whtzup_events
POSTGRES_USER=whtzup_user
POSTGRES_PASSWORD=whtzup_password

# Redis
REDIS_URL=redis://redis:6379

# API Server
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS (for production)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Production Configuration

For production deployment:

1. **Update CORS origins** in `backend/server.js`
2. **Change JWT secret** to a secure random string
3. **Set up SSL certificates** for HTTPS
4. **Configure database backups**
5. **Set up monitoring and logging**

## 📊 API Endpoints

### Events API

```
GET    /api/events              # Get all events
GET    /api/events/:id          # Get single event
POST   /api/events              # Create event
PUT    /api/events/:id          # Update event
DELETE /api/events/:id          # Delete event
GET    /api/events/sync/changes # Get changes since last sync
```

### Sync API

```
POST   /api/sync/queue          # Queue offline operation
POST   /api/sync/process        # Process offline queue
GET    /api/sync/status         # Get sync status
POST   /api/sync/conflicts      # Resolve conflicts
```

### Health API

```
GET    /api/health              # Basic health check
GET    /api/health/detailed     # Detailed health with services
GET    /api/health/ready        # Readiness probe
GET    /api/health/live         # Liveness probe
```

## 🔄 Synchronization Features

### Real-time Updates

- **Socket.IO integration** for instant updates
- **Device-specific rooms** for targeted notifications
- **Automatic reconnection** with exponential backoff

### Offline Support

- **Operation queuing** when offline
- **Automatic sync** when connection restored
- **Conflict resolution** strategies
- **Retry mechanism** with exponential backoff

### Conflict Resolution

Three resolution strategies:

1. **Local**: Use local version
2. **Server**: Use server version
3. **Merge**: Combine both versions intelligently

## 📱 Client Integration

### React Native Setup

1. **Install dependencies**:

```bash
npm install socket.io-client @react-native-community/netinfo
```

2. **Import sync service**:

```typescript
import { syncService } from './src/utils/syncService';
```

3. **Use in your app**:

```typescript
// Create event (works offline)
const newEvent = await syncService.createEvent(eventData);

// Update event (works offline)
const updatedEvent = await syncService.updateEvent(eventData);

// Delete event (works offline)
await syncService.deleteEvent(eventId);

// Listen for sync events
syncService.addListener('eventCreated', (event) => {
  console.log('New event created:', event);
});

// Get sync status
const status = await syncService.getSyncStatusAsync();
```

### Event Listeners

Available events:

- `networkStatus`: Network connectivity changes
- `socketStatus`: Socket.IO connection status
- `eventCreated`: New event created remotely
- `eventUpdated`: Event updated remotely
- `eventDeleted`: Event deleted remotely
- `pendingOperations`: Offline queue changes
- `error`: Sync errors

## 🗄️ Database Schema

### Events Table

```sql
CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'other',
    venue VARCHAR(500) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL DEFAULT 0,
    longitude DECIMAL(11, 8) NOT NULL DEFAULT 0,
    starts_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) DEFAULT 'Event Organizer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sync Tables

- `sync_log`: Tracks all changes for audit
- `offline_queue`: Stores offline operations
- Indexes for optimal performance

## 🔍 Monitoring & Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-server

# Database logs
docker-compose logs -f postgres
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it whtzup-postgres psql -U whtzup_user -d whtzup_events

# View tables
\dt

# Check sync status
SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 10;
```

### Health Monitoring

```bash
# Basic health
curl http://localhost:3000/health

# Detailed health
curl http://localhost:3000/api/health/detailed

# Sync status
curl http://localhost:3000/api/sync/status
```

## 🛠️ Development

### Local Development

1. **Start services**:
```bash
docker-compose up -d postgres redis
```

2. **Run API server locally**:
```bash
cd backend
npm install
npm run dev
```

3. **Update API URL** in `src/utils/syncService.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3000';
```

### Testing

```bash
# Run tests
cd backend
npm test

# Test API endpoints
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Event","venue":"Test Venue","latitude":59.437,"longitude":24.7536,"startsAt":"2024-01-15T19:00:00Z"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**:
   - Change ports in `docker-compose.yml`
   - Kill processes using the ports

2. **Database connection errors**:
   - Check if PostgreSQL container is running
   - Verify credentials in environment variables

3. **Sync not working**:
   - Check network connectivity
   - Verify device ID is being sent
   - Check offline queue status

4. **Memory issues**:
   - Increase Docker memory allocation
   - Monitor container resource usage

### Reset Everything

```bash
# Stop and remove containers
docker-compose down -v

# Remove volumes (WARNING: This deletes all data)
docker volume rm whtzup-app_postgres_data whtzup-app_redis_data

# Rebuild and start
docker-compose up --build -d
```

## 📈 Performance Optimization

### Database Optimization

- **Connection pooling** configured
- **Indexes** on frequently queried columns
- **Query optimization** with prepared statements

### Caching Strategy

- **Redis** for session data and real-time features
- **Client-side caching** for offline support
- **API response caching** for static data

### Scaling Considerations

- **Horizontal scaling** with load balancers
- **Database read replicas** for read-heavy workloads
- **Redis clustering** for high availability

## 🔒 Security

### Best Practices

1. **Change default passwords**
2. **Use HTTPS in production**
3. **Implement rate limiting**
4. **Validate all inputs**
5. **Use environment variables for secrets**
6. **Regular security updates**

### Network Security

- **Firewall rules** for database access
- **VPN** for remote database access
- **SSL/TLS** encryption for all connections

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Native NetInfo](https://github.com/react-native-community/react-native-netinfo)

## 🤝 Support

For issues and questions:

1. Check the troubleshooting section
2. Review logs for error messages
3. Test with the health endpoints
4. Create an issue with detailed information

---

**Happy syncing! 🎉**
