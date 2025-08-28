const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// In-memory storage for events (in production, this would be a database)
let events = [
  {
    id: 1,
    title: "Demo Event 1",
    description: "This is a demo event for testing",
    date: "2025-09-15",
    time: "18:00",
    location: "Tallinn, Estonia",
    category: "Entertainment",
    createdBy: 1,
    createdAt: "2025-08-28T10:00:00Z",
    updatedAt: "2025-08-28T10:00:00Z"
  },
  {
    id: 2,
    title: "Demo Event 2",
    description: "Another demo event",
    date: "2025-09-20",
    time: "19:30",
    location: "Tartu, Estonia",
    category: "Education",
    createdBy: 1,
    createdAt: "2025-08-28T11:00:00Z",
    updatedAt: "2025-08-28T11:00:00Z"
  }
];

let nextEventId = 3;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Simple auth endpoint
app.post("/api/auth/signin", (req, res) => {
  const { email, password } = req.body;
  
  if (email === "demo@eventdiscovery.app" && password === "demo123") {
    res.json({
      success: true,
      data: {
        accessToken: "demo_access_token_123",
        refreshToken: "demo_refresh_token_123",
        user: {
          id: 1,
          name: "Demo User",
          email: "demo@eventdiscovery.app",
          subscription: {
            type: "premium",
            endDate: "2026-12-31"
          }
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Invalid credentials"
    });
  }
});

// Subscription status endpoint
app.get("/api/subscription/status", (req, res) => {
  res.json({
    success: true,
    data: {
      hasSubscription: true,
      type: "premium",
      endDate: "2026-12-31"
    }
  });
});

// Get all events
app.get("/api/events", (req, res) => {
  res.json({
    success: true,
    data: events
  });
});

// Get event by ID
app.get("/api/events/:id", (req, res) => {
  const eventId = parseInt(req.params.id);
  const event = events.find(e => e.id === eventId);
  
  if (event) {
    res.json({
      success: true,
      data: event
    });
  } else {
    res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
});

// Create new event
app.post("/api/events", (req, res) => {
  const { title, description, date, time, location, category } = req.body;
  
  if (!title || !description || !date || !time || !location || !category) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }
  
  const newEvent = {
    id: nextEventId++,
    title,
    description,
    date,
    time,
    location,
    category,
    createdBy: 1, // Demo user ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  events.push(newEvent);
  
  res.status(201).json({
    success: true,
    data: newEvent
  });
});

// Update event
app.put("/api/events/:id", (req, res) => {
  const eventId = parseInt(req.params.id);
  const eventIndex = events.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
  
  const { title, description, date, time, location, category } = req.body;
  
  events[eventIndex] = {
    ...events[eventIndex],
    title: title || events[eventIndex].title,
    description: description || events[eventIndex].description,
    date: date || events[eventIndex].date,
    time: time || events[eventIndex].time,
    location: location || events[eventIndex].location,
    category: category || events[eventIndex].category,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: events[eventIndex]
  });
});

// Delete event
app.delete("/api/events/:id", (req, res) => {
  const eventId = parseInt(req.params.id);
  const eventIndex = events.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
  
  const deletedEvent = events.splice(eventIndex, 1)[0];
  
  res.json({
    success: true,
    data: deletedEvent
  });
});

// Get events by category
app.get("/api/events/category/:category", (req, res) => {
  const category = req.params.category;
  const filteredEvents = events.filter(e => 
    e.category.toLowerCase() === category.toLowerCase()
  );
  
  res.json({
    success: true,
    data: filteredEvents
  });
});

// Search events
app.get("/api/events/search/:query", (req, res) => {
  const query = req.params.query.toLowerCase();
  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(query) ||
    e.description.toLowerCase().includes(query) ||
    e.location.toLowerCase().includes(query)
  );
  
  res.json({
    success: true,
    data: filteredEvents
  });
});

// Get user's events
app.get("/api/users/:userId/events", (req, res) => {
  const userId = parseInt(req.params.userId);
  const userEvents = events.filter(e => e.createdBy === userId);
  
  res.json({
    success: true,
    data: userEvents
  });
});

// Get event statistics
app.get("/api/events/stats", (req, res) => {
  const totalEvents = events.length;
  const categories = [...new Set(events.map(e => e.category))];
  const categoryCounts = categories.map(category => ({
    category,
    count: events.filter(e => e.category === category).length
  }));
  
  res.json({
    success: true,
    data: {
      totalEvents,
      categories: categoryCounts,
      recentEvents: events.slice(-5) // Last 5 events
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`- GET /api/health`);
  console.log(`- POST /api/auth/signin`);
  console.log(`- GET /api/subscription/status`);
  console.log(`- GET /api/events`);
  console.log(`- GET /api/events/:id`);
  console.log(`- POST /api/events`);
  console.log(`- PUT /api/events/:id`);
  console.log(`- DELETE /api/events/:id`);
  console.log(`- GET /api/events/category/:category`);
  console.log(`- GET /api/events/search/:query`);
  console.log(`- GET /api/users/:userId/events`);
  console.log(`- GET /api/events/stats`);
});
