const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || 3001

// Enable CORS for mobile app
app.use(cors())
app.use(bodyParser.json())

// In-memory storage (in production, use a database like MongoDB or PostgreSQL)
let ratings = new Map() // eventId -> SharedRating
let pendingSync = []

// Helper function to calculate average rating
const calculateAverageRating = (ratingsList) => {
  if (ratingsList.length === 0) return 0
  const sum = ratingsList.reduce((acc, rating) => acc + rating.rating, 0)
  return sum / ratingsList.length
}

// GET /api/ratings/:eventId - Get shared ratings for an event
app.get('/api/ratings/:eventId', (req, res) => {
  const { eventId } = req.params
  
  if (ratings.has(eventId)) {
    const sharedRating = ratings.get(eventId)
    res.json(sharedRating)
  } else {
    res.json({
      eventId,
      averageRating: 0,
      totalRatings: 0,
      ratings: []
    })
  }
})

// POST /api/ratings - Save a new rating
app.post('/api/ratings', (req, res) => {
  try {
    const { eventId, rating, timestamp, review, userId } = req.body
    
    if (!eventId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating data' })
    }

    const newRating = {
      eventId,
      rating,
      timestamp,
      review,
      userId
    }

    // Get existing ratings for this event
    let eventRatings = ratings.get(eventId) || {
      eventId,
      averageRating: 0,
      totalRatings: 0,
      ratings: []
    }

    // Check if user already rated this event
    const existingRatingIndex = eventRatings.ratings.findIndex(r => r.userId === userId)
    
    if (existingRatingIndex >= 0) {
      // Update existing rating
      eventRatings.ratings[existingRatingIndex] = newRating
    } else {
      // Add new rating
      eventRatings.ratings.push(newRating)
    }

    // Recalculate average and total
    eventRatings.averageRating = calculateAverageRating(eventRatings.ratings)
    eventRatings.totalRatings = eventRatings.ratings.length

    // Save updated ratings
    ratings.set(eventId, eventRatings)

    console.log(`Rating saved for event ${eventId}: ${rating}/5 stars`)
    console.log(`Event ${eventId} now has ${eventRatings.totalRatings} ratings with average ${eventRatings.averageRating.toFixed(1)}`)

    res.json({ 
      success: true, 
      message: 'Rating saved successfully',
      sharedRating: eventRatings
    })

  } catch (error) {
    console.error('Error saving rating:', error)
    res.status(500).json({ error: 'Failed to save rating' })
  }
})

// GET /api/ratings - Get all ratings (for admin/debugging)
app.get('/api/ratings', (req, res) => {
  const allRatings = Array.from(ratings.values())
  res.json(allRatings)
})

// POST /api/sync - Sync multiple ratings (for offline sync)
app.post('/api/sync', (req, res) => {
  try {
    const { ratings: ratingsToSync } = req.body
    
    if (!Array.isArray(ratingsToSync)) {
      return res.status(400).json({ error: 'Invalid sync data' })
    }

    const results = []
    
    for (const ratingData of ratingsToSync) {
      try {
        const { eventId, rating, timestamp, review, userId } = ratingData
        
        if (!eventId || !rating || rating < 1 || rating > 5) {
          results.push({ eventId, success: false, error: 'Invalid rating data' })
          continue
        }

        const newRating = { eventId, rating, timestamp, review, userId }
        
        let eventRatings = ratings.get(eventId) || {
          eventId,
          averageRating: 0,
          totalRatings: 0,
          ratings: []
        }

        const existingRatingIndex = eventRatings.ratings.findIndex(r => r.userId === userId)
        
        if (existingRatingIndex >= 0) {
          eventRatings.ratings[existingRatingIndex] = newRating
        } else {
          eventRatings.ratings.push(newRating)
        }

        eventRatings.averageRating = calculateAverageRating(eventRatings.ratings)
        eventRatings.totalRatings = eventRatings.ratings.length

        ratings.set(eventId, eventRatings)
        
        results.push({ eventId, success: true })
        
      } catch (error) {
        results.push({ eventId: ratingData.eventId, success: false, error: error.message })
      }
    }

    res.json({ 
      success: true, 
      message: `Synced ${ratingsToSync.length} ratings`,
      results 
    })

  } catch (error) {
    console.error('Error syncing ratings:', error)
    res.status(500).json({ error: 'Failed to sync ratings' })
  }
})

// GET /api/stats - Get rating statistics
app.get('/api/stats', (req, res) => {
  const totalEvents = ratings.size
  const totalRatings = Array.from(ratings.values()).reduce((sum, event) => sum + event.totalRatings, 0)
  const averageRating = Array.from(ratings.values()).reduce((sum, event) => sum + event.averageRating, 0) / totalEvents || 0

  res.json({
    totalEvents,
    totalRatings,
    averageRating: Math.round(averageRating * 10) / 10,
    eventsWithRatings: Array.from(ratings.keys())
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ratingsCount: ratings.size
  })
})

app.listen(PORT, () => {
  console.log(`Rating API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
  console.log(`API endpoints:`)
  console.log(`  GET  /api/ratings/:eventId - Get ratings for an event`)
  console.log(`  POST /api/ratings - Save a new rating`)
  console.log(`  POST /api/sync - Sync multiple ratings`)
  console.log(`  GET  /api/stats - Get rating statistics`)
})

module.exports = app
