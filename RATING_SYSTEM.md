# 🌟 Event Rating System

## Overview

The event rating system allows users to rate events and share their ratings with the community. Ratings are stored both locally on the device and synchronized with a backend server to enable sharing between users.

## 🔄 How Ratings Are Shared

### 1. **Local Storage (Immediate)**
- Ratings are immediately saved to the device using `AsyncStorage`
- Users can see their own ratings instantly
- Works offline - no internet connection required

### 2. **Backend Synchronization (Shared)**
- Ratings are sent to a backend API server
- All users can see community ratings
- Real-time sharing between all app users
- Automatic sync when internet is available

### 3. **Offline Support**
- Ratings made offline are queued for sync
- Automatic sync when connection is restored
- No data loss during offline periods

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Rating Service │    │  Backend API    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │AsyncStorage │ │◄──►│ │Local Cache  │ │◄──►│ │Database     │ │
│ │(User Ratings)│ │    │ │(Shared Data)│ │    │ │(All Ratings)│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Rating Modal │ │    │ │Sync Queue   │ │    │ │API Endpoints│ │
│ │(UI)         │ │    │ │(Offline)    │ │    │ │(REST)       │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📱 User Experience

### Rating an Event
1. **Tap event marker** on map
2. **View event details** with current community ratings
3. **Tap "Rate Event"** button
4. **Select stars** (1-5) and optional review
5. **Submit rating** - saved locally and shared with community

### Viewing Ratings
- **Community ratings** shown as "⭐ Community Rating: 4.2/5 (23 reviews)"
- **Personal ratings** highlighted as "👤 Your Rating: 5/5"
- **Sync status** indicated with "🌐 Shared with community" or "📱 Local rating only"

## 🔧 Technical Implementation

### Frontend (React Native)
```typescript
// Rating Service
class RatingService {
  async saveRating(eventId: string, rating: number, review?: string) {
    // 1. Save to local storage immediately
    await this.saveToLocalStorage(eventId, newRating)
    
    // 2. Try to save to backend
    try {
      await this.saveToBackend(newRating)
    } catch (error) {
      // 3. Queue for later sync if backend fails
      await this.queueForSync(newRating)
    }
  }
}
```

### Backend API (Node.js/Express)
```javascript
// Save rating endpoint
app.post('/api/ratings', (req, res) => {
  const { eventId, rating, timestamp, review, userId } = req.body
  
  // Calculate new average rating
  const eventRatings = getEventRatings(eventId)
  eventRatings.push(newRating)
  eventRatings.averageRating = calculateAverage(eventRatings)
  
  // Save to database
  saveToDatabase(eventRatings)
  
  res.json({ success: true, sharedRating: eventRatings })
})
```

## 🌐 Backend Setup

### 1. Install Dependencies
```bash
cd backend-example
npm install
```

### 2. Start Server
```bash
npm start
# Server runs on http://localhost:3001
```

### 3. API Endpoints
- `GET /api/ratings/:eventId` - Get ratings for specific event
- `POST /api/ratings` - Save new rating
- `POST /api/sync` - Sync multiple ratings (offline support)
- `GET /api/stats` - Get rating statistics
- `GET /api/health` - Health check

### 4. Update App Configuration
In `src/utils/ratingService.ts`, update the API URL:
```typescript
const API_BASE_URL = 'http://localhost:3001/api' // Development
// const API_BASE_URL = 'https://your-production-api.com/api' // Production
```

## 📊 Data Flow

### Rating Submission
```
User submits rating
        ↓
Save to AsyncStorage (immediate)
        ↓
Send to backend API
        ↓
Backend calculates new average
        ↓
Store in database
        ↓
Return updated ratings to app
        ↓
Update UI with new community rating
```

### Rating Retrieval
```
App requests ratings
        ↓
Check local cache first
        ↓
Fetch from backend API
        ↓
Update local cache
        ↓
Display in UI
```

## 🔒 Security & Privacy

### User Identification
- **Device ID**: Unique identifier per device
- **No personal data**: Ratings are anonymous
- **Optional reviews**: Users can choose to leave text reviews

### Data Protection
- **HTTPS**: All API communication encrypted
- **Input validation**: Backend validates all rating data
- **Rate limiting**: Prevent spam ratings

## 🚀 Production Deployment

### Backend Options
1. **Heroku**: Easy deployment with `git push heroku main`
2. **AWS**: EC2 instance with RDS database
3. **Google Cloud**: App Engine with Cloud SQL
4. **Vercel**: Serverless functions with database

### Database Options
1. **MongoDB**: Document-based storage
2. **PostgreSQL**: Relational database
3. **Firebase**: Real-time database
4. **Supabase**: Open-source Firebase alternative

### Example Production Setup
```bash
# Deploy to Heroku
heroku create your-event-ratings-api
git push heroku main

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your-database-url

# Update app configuration
const API_BASE_URL = 'https://your-event-ratings-api.herokuapp.com/api'
```

## 📈 Analytics & Insights

### Rating Statistics
- **Total events rated**: Number of events with ratings
- **Total ratings**: Total number of ratings submitted
- **Average rating**: Overall community rating
- **Rating distribution**: How many 1-star, 2-star, etc.

### User Engagement
- **Rating frequency**: How often users rate events
- **Review completion**: Percentage of ratings with reviews
- **Popular events**: Events with most ratings

## 🔄 Future Enhancements

### Planned Features
1. **Rating filters**: Filter events by rating range
2. **Review moderation**: Admin approval for reviews
3. **Rating analytics**: Detailed rating insights
4. **Social features**: Share ratings on social media
5. **Rating notifications**: Notify when events are rated

### Technical Improvements
1. **Real-time updates**: WebSocket for live rating updates
2. **Caching**: Redis for improved performance
3. **CDN**: Global content delivery
4. **Monitoring**: Error tracking and performance monitoring

## 🐛 Troubleshooting

### Common Issues
1. **Ratings not syncing**: Check internet connection and API URL
2. **Backend errors**: Check server logs and database connection
3. **Performance issues**: Implement caching and database indexing

### Debug Commands
```bash
# Check backend health
curl http://localhost:3001/api/health

# Get rating statistics
curl http://localhost:3001/api/stats

# Test rating submission
curl -X POST http://localhost:3001/api/ratings \
  -H "Content-Type: application/json" \
  -d '{"eventId":"123","rating":5,"timestamp":1234567890,"userId":"user123"}'
```

---

**The rating system provides a complete solution for sharing event ratings between users while maintaining offline functionality and data integrity.**
