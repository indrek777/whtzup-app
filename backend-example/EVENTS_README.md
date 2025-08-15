# Event Sharing Backend

This backend provides API endpoints for sharing events between users in the Event Discovery app.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend-example
npm install
```

### 2. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3002`

## 📡 API Endpoints

### Events

#### `GET /api/events`
Get all shared events
- **Response**: List of all events with total count
- **Example**: `GET http://localhost:3002/api/events`

#### `POST /api/events`
Create a new event
- **Body**: Event data (name, description, venue, latitude, longitude, etc.)
- **Response**: Created event with success message
- **Example**: `POST http://localhost:3002/api/events`

#### `GET /api/events/:eventId`
Get a specific event by ID
- **Response**: Single event data
- **Example**: `GET http://localhost:3002/api/events/event_1234567890_1`

#### `PUT /api/events/:eventId`
Update an existing event
- **Body**: Updated event data
- **Response**: Updated event with success message
- **Example**: `PUT http://localhost:3002/api/events/event_1234567890_1`

#### `DELETE /api/events/:eventId`
Delete an event
- **Response**: Success message
- **Example**: `DELETE http://localhost:3002/api/events/event_1234567890_1`

### Statistics

#### `GET /api/events/stats`
Get event statistics
- **Response**: Total events, user-created events, categories, recent events
- **Example**: `GET http://localhost:3002/api/events/stats`

### Health Check

#### `GET /api/health`
Check if the server is running
- **Response**: Server status and timestamp
- **Example**: `GET http://localhost:3002/api/health`

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3002)

### Event Data Structure
```typescript
interface Event {
  id: string
  name: string
  description: string
  venue: string
  address?: string
  startsAt: string
  latitude: number
  longitude: number
  url?: string
  source: 'user' | 'app'
  category?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
}
```

## 🔄 Integration with Mobile App

### 1. Enable Backend Connection
In `src/utils/eventService.ts`, change:
```typescript
const API_BASE_URL = null // Change to:
const API_BASE_URL = 'http://localhost:3002/api'
```

### 2. For Production
Replace `localhost` with your actual server URL:
```typescript
const API_BASE_URL = 'https://your-server.com/api'
```

## 🛡️ Features

### Data Validation
- Required fields validation (name, description, venue, coordinates)
- Coordinate type validation
- Input sanitization

### Error Handling
- Comprehensive error responses
- Graceful fallbacks
- Detailed logging

### Offline Support
- Events are saved locally first
- Queued for sync when backend is available
- Automatic retry mechanism

## 📊 Data Storage

Currently uses in-memory storage (Map) for demonstration. For production:

### Recommended Databases
- **MongoDB**: Document-based storage
- **PostgreSQL**: Relational database with PostGIS for location data
- **Redis**: Fast caching layer

### Example MongoDB Integration
```javascript
const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  venue: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  // ... other fields
})

eventSchema.index({ location: '2dsphere' })
```

## 🔐 Security Considerations

### Authentication
- Implement user authentication (JWT, OAuth)
- Validate user permissions for event operations

### Input Validation
- Sanitize all user inputs
- Validate coordinates range
- Rate limiting for API endpoints

### CORS Configuration
```javascript
app.use(cors({
  origin: ['http://localhost:8081', 'https://your-app.com'],
  credentials: true
}))
```

## 🚀 Deployment

### Heroku
```bash
heroku create your-event-backend
git push heroku main
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### Environment Variables
```bash
PORT=3002
NODE_ENV=production
DATABASE_URL=your_database_url
```

## 📈 Monitoring

### Health Checks
- `/api/health` endpoint for monitoring
- Response time tracking
- Error rate monitoring

### Logging
- Request/response logging
- Error logging with stack traces
- Performance metrics

## 🔄 Future Enhancements

### Real-time Updates
- WebSocket integration for live event updates
- Push notifications for new events

### Advanced Features
- Event categories and filtering
- Location-based event discovery
- Event recommendations
- User event history

### Performance
- Database indexing for location queries
- Caching layer (Redis)
- CDN for static assets

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration
   - Verify client origin

2. **Port Already in Use**
   - Change PORT environment variable
   - Kill existing process: `lsof -ti:3002 | xargs kill`

3. **Database Connection**
   - Verify database URL
   - Check network connectivity

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📝 License

MIT License - see LICENSE file for details
