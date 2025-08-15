const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(bodyParser.json())

// In-memory storage for events (in production, use a database)
let events = new Map() // eventId -> Event
let eventCounter = 1

// Helper function to generate unique event ID
const generateEventId = () => {
  return `event_${Date.now()}_${eventCounter++}`
}

// Helper function to validate event data
const validateEvent = (event) => {
  const required = ['name', 'description', 'venue', 'latitude', 'longitude']
  for (const field of required) {
    if (!event[field]) {
      return { valid: false, error: `Missing required field: ${field}` }
    }
  }
  
  if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number') {
    return { valid: false, error: 'Latitude and longitude must be numbers' }
  }
  
  return { valid: true }
}

// GET /api/events - Get all events
app.get('/api/events', (req, res) => {
  try {
    const eventsList = Array.from(events.values())
    res.json({
      success: true,
      events: eventsList,
      total: eventsList.length
    })
  } catch (error) {
    console.error('Error getting events:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve events'
    })
  }
})

// POST /api/events - Create a new event
app.post('/api/events', (req, res) => {
  try {
    const eventData = req.body
    
    // Validate event data
    const validation = validateEvent(eventData)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }
    
    // Generate unique ID if not provided
    const eventId = eventData.id || generateEventId()
    
    // Create event object
    const newEvent = {
      id: eventId,
      name: eventData.name.trim(),
      description: eventData.description.trim(),
      venue: eventData.venue.trim(),
      address: eventData.address || '',
      startsAt: eventData.startsAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      url: eventData.url || '',
      source: 'user',
      createdAt: new Date().toISOString(),
      createdBy: eventData.userId || 'anonymous'
    }
    
    // Store the event
    events.set(eventId, newEvent)
    
    console.log(`Event created: ${newEvent.name} (${eventId})`)
    
    res.status(201).json({
      success: true,
      event: newEvent,
      message: 'Event created successfully'
    })
    
  } catch (error) {
    console.error('Error creating event:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    })
  }
})

// GET /api/events/:eventId - Get specific event
app.get('/api/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params
    const event = events.get(eventId)
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      })
    }
    
    res.json({
      success: true,
      event
    })
    
  } catch (error) {
    console.error('Error getting event:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event'
    })
  }
})

// PUT /api/events/:eventId - Update event
app.put('/api/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params
    const eventData = req.body
    
    const existingEvent = events.get(eventId)
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      })
    }
    
    // Validate event data
    const validation = validateEvent(eventData)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }
    
    // Update event
    const updatedEvent = {
      ...existingEvent,
      name: eventData.name.trim(),
      description: eventData.description.trim(),
      venue: eventData.venue.trim(),
      address: eventData.address || '',
      startsAt: eventData.startsAt || existingEvent.startsAt,
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      url: eventData.url || '',
      updatedAt: new Date().toISOString()
    }
    
    events.set(eventId, updatedEvent)
    
    console.log(`Event updated: ${updatedEvent.name} (${eventId})`)
    
    res.json({
      success: true,
      event: updatedEvent,
      message: 'Event updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating event:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    })
  }
})

// DELETE /api/events/:eventId - Delete event
app.delete('/api/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params
    const event = events.get(eventId)
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      })
    }
    
    events.delete(eventId)
    
    console.log(`Event deleted: ${event.name} (${eventId})`)
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting event:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    })
  }
})

// GET /api/events/stats - Get event statistics
app.get('/api/events/stats', (req, res) => {
  try {
    const eventsList = Array.from(events.values())
    const totalEvents = eventsList.length
    const userCreatedEvents = eventsList.filter(e => e.source === 'user').length
    
    // Group by category (simplified)
    const categories = {}
    eventsList.forEach(event => {
      const category = event.category || 'Other'
      categories[category] = (categories[category] || 0) + 1
    })
    
    res.json({
      success: true,
      stats: {
        totalEvents,
        userCreatedEvents,
        categories,
        recentEvents: eventsList
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
      }
    })
    
  } catch (error) {
    console.error('Error getting stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Events API is running',
    timestamp: new Date().toISOString(),
    totalEvents: events.size
  })
})

app.listen(PORT, () => {
  console.log(`Events API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
  console.log(`API endpoints:`)
  console.log(`  GET  /api/events - Get all events`)
  console.log(`  POST /api/events - Create a new event`)
  console.log(`  GET  /api/events/:eventId - Get specific event`)
  console.log(`  PUT  /api/events/:eventId - Update event`)
  console.log(`  DELETE /api/events/:eventId - Delete event`)
  console.log(`  GET  /api/events/stats - Get event statistics`)
})

module.exports = app
