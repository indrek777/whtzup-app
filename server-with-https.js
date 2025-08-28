const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const https = require("https");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const HTTP_PORT = process.env.PORT || 4000;
const HTTPS_PORT = process.env.HTTPS_PORT || 4001;

// App Store users database
const users = [
  {
    id: 1,
    email: "demo@eventdiscovery.app",
    password: "demo123",
    name: "Demo User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  // Premium users
  {
    id: 2,
    email: "premium@eventdiscovery.app",
    password: "premium123",
    name: "Premium User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  {
    id: 3,
    email: "john.doe@eventdiscovery.app",
    password: "john123",
    name: "John Doe",
    subscription: {
      type: "premium",
      endDate: "2026-06-15"
    }
  },
  {
    id: 4,
    email: "sarah.wilson@eventdiscovery.app",
    password: "sarah123",
    name: "Sarah Wilson",
    subscription: {
      type: "premium",
      endDate: "2026-09-30"
    }
  },
  
  // Free users
  {
    id: 5,
    email: "free@eventdiscovery.app",
    password: "free123",
    name: "Free User",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  {
    id: 6,
    email: "mike.brown@eventdiscovery.app",
    password: "mike123",
    name: "Mike Brown",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  {
    id: 7,
    email: "lisa.garcia@eventdiscovery.app",
    password: "lisa123",
    name: "Lisa Garcia",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  
  // Expired subscription users
  {
    id: 8,
    email: "expired@eventdiscovery.app",
    password: "expired123",
    name: "Expired User",
    subscription: {
      type: "expired",
      endDate: "2024-12-31"
    }
  },
  {
    id: 9,
    email: "alex.chen@eventdiscovery.app",
    password: "alex123",
    name: "Alex Chen",
    subscription: {
      type: "expired",
      endDate: "2024-08-15"
    }
  },
  
  // Event organizers
  {
    id: 10,
    email: "organizer@eventdiscovery.app",
    password: "organizer123",
    name: "Event Organizer",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  {
    id: 11,
    email: "festival.manager@eventdiscovery.app",
    password: "festival123",
    name: "Festival Manager",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  
  // Business users
  {
    id: 12,
    email: "business@eventdiscovery.app",
    password: "business123",
    name: "Business User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  {
    id: 13,
    email: "corporate@eventdiscovery.app",
    password: "corporate123",
    name: "Corporate User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  
  // Test users for different scenarios
  {
    id: 14,
    email: "newuser@eventdiscovery.app",
    password: "new123",
    name: "New User",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  {
    id: 15,
    email: "trial@eventdiscovery.app",
    password: "trial123",
    name: "Trial User",
    subscription: {
      type: "premium",
      endDate: "2025-09-15" // Short trial period
    }
  }
];

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
    environment: process.env.NODE_ENV || "development",
    protocol: req.protocol,
    port: req.socket.localPort
  });
});

// Enhanced auth endpoint with App Store users
app.post("/api/auth/signin", (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    res.json({
      success: true,
      data: {
        accessToken: `${user.email}_access_token_${Date.now()}`,
        refreshToken: `${user.email}_refresh_token_${Date.now()}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          subscription: user.subscription
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

// Get all users (for App Store testing)
app.get("/api/users", (req, res) => {
  const usersWithoutPasswords = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    subscription: user.subscription
  }));
  
  res.json({
    success: true,
    data: usersWithoutPasswords
  });
});

// Get user by ID
app.get("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (user) {
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      subscription: user.subscription
    };
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } else {
    res.status(404).json({
      success: false,
      error: "User not found"
    });
  }
});

// Subscription status endpoint (returns user's subscription)
app.get("/api/subscription/status", (req, res) => {
  // For demo purposes, return premium subscription
  // In real app, this would check the authenticated user's subscription
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

// Get event statistics (MUST be before /:id route)
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

// Get events by category (MUST be before /:id route)
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

// Search events (MUST be before /:id route)
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

// Get event by ID (MUST be last)
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
    createdBy: 1, // Default to demo user ID
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

// Get user's events
app.get("/api/users/:userId/events", (req, res) => {
  const userId = parseInt(req.params.userId);
  const userEvents = events.filter(e => e.createdBy === userId);
  
  res.json({
    success: true,
    data: userEvents
  });
});

// SSL configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/server.key')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/server.crt'))
};

// Start HTTP server
app.listen(HTTP_PORT, () => {
  console.log(`🚀 HTTP Server running on port ${HTTP_PORT}`);
});

// Start HTTPS server
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
  console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
});

console.log(`\n📋 Available endpoints:`);
console.log(`- GET /api/health`);
console.log(`- POST /api/auth/signin`);
console.log(`- GET /api/users`);
console.log(`- GET /api/users/:id`);
console.log(`- GET /api/subscription/status`);
console.log(`- GET /api/events`);
console.log(`- GET /api/events/stats`);
console.log(`- GET /api/events/category/:category`);
console.log(`- GET /api/events/search/:query`);
console.log(`- GET /api/events/:id`);
console.log(`- POST /api/events`);
console.log(`- PUT /api/events/:id`);
console.log(`- DELETE /api/events/:id`);
console.log(`- GET /api/users/:userId/events`);

console.log(`\n🌐 Server URLs:`);
console.log(`- HTTP:  http://165.22.90.180:${HTTP_PORT}`);
console.log(`- HTTPS: https://165.22.90.180:${HTTPS_PORT}`);

console.log(`\n📋 App Store Users Available:`);
console.log(`- Premium Users: 8`);
console.log(`- Free Users: 4`);
console.log(`- Expired Users: 2`);
console.log(`- Total Users: 15`);
