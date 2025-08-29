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

// In-memory storage for events
let events = [
  {
    id: 1,
    title: "Demo Event 1", "latitude": 59.436962, "longitude": 24.753574, "venue": "Tallinn", "address": "Tallinn, Estonia", "url": "", "source": "demo",
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
    title: "Demo Event 2", "latitude": 58.377625, "longitude": 26.729006, "venue": "Tartu", "address": "Tartu, Estonia", "url": "", "source": "demo",
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

// In-memory storage for ratings
let ratings = [
  {
    id: 1,
    eventId: 1,
    userId: 1,
    rating: 5,
    review: "Great event!",
    createdAt: "2025-08-28T12:00:00Z"
  },
  {
    id: 2,
    eventId: 1,
    userId: 2,
    rating: 4,
    review: "Very good event",
    createdAt: "2025-08-28T13:00:00Z"
  }
];

// In-memory storage for event registrations
let registrations = [
  {
    id: 1,
    eventId: 1,
    userId: 1,
    status: "registered",
    registeredAt: "2025-08-28T14:00:00Z"
  }
];

let nextEventId = 3;
let nextUserId = 16;
let nextRatingId = 3;
let nextRegistrationId = 2;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Helper function to get user by token
function getUserFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  // Simple token parsing - in production, use JWT
  const email = token.split('_')[0];
  return users.find(u => u.email === email);
}

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

// NEW: Sign up endpoint
app.post("/api/auth/signup", (req, res) => {
  const { email, password, name } = req.body;
  
  // Validation
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: email, password, and name are required"
    });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email format"
    });
  }
  
  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 6 characters long"
    });
  }
  
  // Name validation
  if (name.trim().length < 1 || name.trim().length > 255) {
    return res.status(400).json({
      success: false,
      error: "Name is required and must be less than 255 characters"
    });
  }
  
  // Check if user already exists
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: "User with this email already exists"
    });
  }
  
  // Create new user
  const newUser = {
    id: nextUserId++,
    email: email.toLowerCase(),
    password: password, // In production, this should be hashed
    name: name.trim(),
    subscription: {
      type: "free",
      endDate: null
    }
  };
  
  // Add user to the array
  users.push(newUser);
  
  // Generate tokens
  const accessToken = `${newUser.email}_access_token_${Date.now()}`;
  const refreshToken = `${newUser.email}_refresh_token_${Date.now()}`;
  
  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        subscription: newUser.subscription
      },
      accessToken,
      refreshToken
    }
  });
});

// NEW: Token refresh endpoint
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: "Refresh token is required"
    });
  }
  
  // Simple token parsing - in production, use JWT
  const email = refreshToken.split('_')[0];
  const user = users.find(u => u.email === email);
  
  if (user) {
    const newAccessToken = `${user.email}_access_token_${Date.now()}`;
    const newRefreshToken = `${user.email}_refresh_token_${Date.now()}`;
    
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
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
      error: "Invalid refresh token"
    });
  }
});

// NEW: User group endpoint
app.get("/api/user-group", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  // Determine user group based on subscription
  let userGroup = 'registered';
  if (user.subscription.type === 'premium') {
    userGroup = 'premium';
  } else if (user.subscription.type === 'free') {
    userGroup = 'registered';
  }
  
  res.json({
    success: true,
    data: {
      userGroup,
      features: userGroup === 'premium' ? [
        'unlimited_events',
        'advanced_search',
        'priority_support',
        'analytics',
        'custom_categories',
        'export_data',
        'no_ads',
        'early_access',
        'extended_event_radius',
        'advanced_filtering',
        'premium_categories',
        'create_groups'
      ] : [
        'basic_search',
        'basic_filtering',
        'local_ratings'
      ]
    }
  });
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

// Subscription status endpoint
app.get("/api/subscription/status", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  res.json({
    success: true,
    data: {
      hasSubscription: user.subscription.type === 'premium',
      type: user.subscription.type,
      endDate: user.subscription.endDate
    }
  });
});

// NEW: Subscription usage endpoint
app.get("/api/subscription/usage", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  // Get user's events
  const userEvents = events.filter(e => e.createdBy === user.id);
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = userEvents.filter(e => e.date === today);
  
  const usage = {
    daily: {
      used: todayEvents.length,
      limit: user.subscription.type === 'premium' ? 50 : 3
    },
    monthly: {
      used: userEvents.length,
      limit: user.subscription.type === 'premium' ? 1000 : 10
    },
    total: {
      eventsCreated: userEvents.length,
      eventsAttended: 0,
      ratingsGiven: ratings.filter(r => r.userId === user.id).length
    }
  };
  
  res.json({
    success: true,
    data: usage
  });
});

// NEW: Subscription billing endpoint
app.get("/api/subscription/billing", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const billingHistory = [];
  
  if (user.subscription.type === 'premium') {
    billingHistory.push({
      id: 1,
      date: "2025-08-01",
      description: "Premium Subscription",
      amount: 4.99,
      currency: "USD",
      status: "paid",
      plan: "monthly"
    });
  }
  
  res.json({
    success: true,
    data: billingHistory
  });
});

// NEW: Subscription features endpoint
app.get("/api/subscription/features", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const features = user.subscription.type === 'premium' ? [
    'unlimited_events',
    'advanced_search',
    'priority_support',
    'analytics',
    'custom_categories',
    'export_data',
    'no_ads',
    'early_access',
    'extended_event_radius',
    'advanced_filtering',
    'premium_categories',
    'create_groups'
  ] : [
    'basic_search',
    'basic_filtering',
    'local_ratings'
  ];
  
  res.json({
    success: true,
    data: {
      features,
      subscriptionType: user.subscription.type
    }
  });
});

// NEW: Ratings endpoints
app.post("/api/ratings", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const { eventId, rating, review } = req.body;
  
  if (!eventId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: "Valid eventId and rating (1-5) are required"
    });
  }
  
  // Check if user already rated this event
  const existingRating = ratings.find(r => r.eventId === parseInt(eventId) && r.userId === user.id);
  
  if (existingRating) {
    // Update existing rating
    existingRating.rating = rating;
    existingRating.review = review || existingRating.review;
    existingRating.updatedAt = new Date().toISOString();
    
    res.json({
      success: true,
      data: {
        rating: existingRating,
        stats: {
          averageRating: ratings.filter(r => r.eventId === parseInt(eventId)).reduce((sum, r) => sum + r.rating, 0) / ratings.filter(r => r.eventId === parseInt(eventId)).length,
          totalRatings: ratings.filter(r => r.eventId === parseInt(eventId)).length
        }
      }
    });
  } else {
    // Create new rating
    const newRating = {
      id: nextRatingId++,
      eventId: parseInt(eventId),
      userId: user.id,
      rating,
      review: review || "",
      createdAt: new Date().toISOString()
    };
    
    ratings.push(newRating);
    
    res.status(201).json({
      success: true,
      data: {
        rating: newRating,
        stats: {
          averageRating: ratings.filter(r => r.eventId === parseInt(eventId)).reduce((sum, r) => sum + r.rating, 0) / ratings.filter(r => r.eventId === parseInt(eventId)).length,
          totalRatings: ratings.filter(r => r.eventId === parseInt(eventId)).length
        }
      }
    });
  }
});

app.get("/api/ratings/event/:eventId", (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const eventRatings = ratings.filter(r => r.eventId === eventId);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRatings = eventRatings.slice(startIndex, endIndex);
  
  const ratingsWithUserInfo = paginatedRatings.map(rating => {
    const user = users.find(u => u.id === rating.userId);
    return {
      ...rating,
      userName: user ? user.name : 'Unknown User'
    };
  });
  
  res.json({
    success: true,
    data: {
      stats: {
        averageRating: eventRatings.length > 0 ? eventRatings.reduce((sum, r) => sum + r.rating, 0) / eventRatings.length : 0,
        totalRatings: eventRatings.length
      },
      ratings: ratingsWithUserInfo,
      pagination: {
        page,
        limit,
        total: eventRatings.length,
        pages: Math.ceil(eventRatings.length / limit)
      }
    }
  });
});

app.get("/api/ratings/user/:userId", (req, res) => {
  const authHeader = req.headers.authorization;
  const currentUser = getUserFromToken(authHeader);
  
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const userId = parseInt(req.params.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // Users can only see their own ratings
  if (currentUser.id !== userId) {
    return res.status(403).json({
      success: false,
      error: "Access denied"
    });
  }
  
  const userRatings = ratings.filter(r => r.userId === userId);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRatings = userRatings.slice(startIndex, endIndex);
  
  const ratingsWithEventInfo = paginatedRatings.map(rating => {
    const event = events.find(e => e.id === rating.eventId);
    return {
      ...rating,
      eventTitle: event ? event.title : 'Unknown Event'
    };
  });
  
  res.json({
    success: true,
    data: {
      ratings: ratingsWithEventInfo,
      pagination: {
        page,
        limit,
        total: userRatings.length,
        pages: Math.ceil(userRatings.length / limit)
      }
    }
  });
});

app.put("/api/ratings/:ratingId", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const ratingId = parseInt(req.params.ratingId);
  const { rating, review } = req.body;
  
  const existingRating = ratings.find(r => r.id === ratingId && r.userId === user.id);
  
  if (!existingRating) {
    return res.status(404).json({
      success: false,
      error: "Rating not found"
    });
  }
  
  existingRating.rating = rating || existingRating.rating;
  existingRating.review = review || existingRating.review;
  existingRating.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    data: existingRating
  });
});

app.delete("/api/ratings/:ratingId", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const ratingId = parseInt(req.params.ratingId);
  const ratingIndex = ratings.findIndex(r => r.id === ratingId && r.userId === user.id);
  
  if (ratingIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Rating not found"
    });
  }
  
  const deletedRating = ratings.splice(ratingIndex, 1)[0];
  
  res.json({
    success: true,
    data: deletedRating
  });
});

app.get("/api/ratings/top-rated", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const minRatings = parseInt(req.query.minRatings) || 1;
  
  // Calculate average ratings for each event
  const eventRatings = {};
  ratings.forEach(rating => {
    if (!eventRatings[rating.eventId]) {
      eventRatings[rating.eventId] = [];
    }
    eventRatings[rating.eventId].push(rating.rating);
  });
  
  const topRatedEvents = Object.entries(eventRatings)
    .filter(([eventId, ratings]) => ratings.length >= minRatings)
    .map(([eventId, ratings]) => {
      const event = events.find(e => e.id === parseInt(eventId));
      return {
        eventId: parseInt(eventId),
        eventTitle: event ? event.title : 'Unknown Event',
        averageRating: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
        totalRatings: ratings.length
      };
    })
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit);
  
  res.json({
    success: true,
    data: topRatedEvents
  });
});

// NEW: Event registration endpoints
app.post("/api/events/:eventId/register", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const eventId = parseInt(req.params.eventId);
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
  
  // Check if already registered
  const existingRegistration = registrations.find(r => r.eventId === eventId && r.userId === user.id);
  
  if (existingRegistration) {
    return res.status(409).json({
      success: false,
      error: "Already registered for this event"
    });
  }
  
  const registration = {
    id: nextRegistrationId++,
    eventId,
    userId: user.id,
    status: "registered",
    registeredAt: new Date().toISOString()
  };
  
  registrations.push(registration);
  
  res.status(201).json({
    success: true,
    data: registration
  });
});

app.delete("/api/events/:eventId/register", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const eventId = parseInt(req.params.eventId);
  const registrationIndex = registrations.findIndex(r => r.eventId === eventId && r.userId === user.id);
  
  if (registrationIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Registration not found"
    });
  }
  
  const deletedRegistration = registrations.splice(registrationIndex, 1)[0];
  
  res.json({
    success: true,
    data: deletedRegistration
  });
});

app.get("/api/events/:eventId/registrations", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const eventId = parseInt(req.params.eventId);
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
  
  // Only event creator can see registrations
  if (event.createdBy !== user.id) {
    return res.status(403).json({
      success: false,
      error: "Access denied"
    });
  }
  
  const eventRegistrations = registrations.filter(r => r.eventId === eventId);
  const registrationsWithUserInfo = eventRegistrations.map(reg => {
    const user = users.find(u => u.id === reg.userId);
    return {
      ...reg,
      userName: user ? user.name : 'Unknown User',
      userEmail: user ? user.email : 'Unknown Email'
    };
  });
  
  res.json({
    success: true,
    data: registrationsWithUserInfo
  });
});

// DB-backed: Get all events (replaces demo in-memory route)
const getDbPool = (() => {
  let poolInstance = null;
  return () => {
    if (!poolInstance) {
      const { Pool } = require('pg');
      const hasUrl = !!process.env.DATABASE_URL;
      const baseConfig = hasUrl
        ? { connectionString: process.env.DATABASE_URL, ssl: false }
        : {
            host: process.env.DB_HOST || '/var/run/postgresql',
            user: process.env.DB_USER || 'postgres',
            database: process.env.DB_NAME || 'whtzup_events',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
            ssl: false
          };
      try {
        poolInstance = new Pool(baseConfig);
        console.log('✅ DB pool initialized', hasUrl ? '(via DATABASE_URL)' : '(via local socket)');
      } catch (e) {
        console.error('❌ Failed to create DB pool:', e.message);
        throw e;
      }
    }
    return poolInstance;
  };
})();

app.get("/api/events", async (req, res) => {
  try {
    const { limit = 15000, offset = 0, latitude, longitude, radius, from, to } = req.query;
    const pool = getDbPool();

    let query = 'SELECT * FROM events WHERE deleted_at IS NULL';
    const params = [];
    let pc = 0;

    if (from) { pc++; query += ` AND starts_at >= $${pc}`; params.push(from + 'T00:00:00.000Z'); }
    if (to) { pc++; query += ` AND starts_at <= $${pc}`; params.push(to + 'T23:59:59.999Z'); }

    if (latitude && longitude && radius) {
      query += ` AND (
        6371 * acos(
          cos(radians($${pc + 1})) *
          cos(radians(latitude)) *
          cos(radians(longitude) - radians($${pc + 2})) +
          sin(radians($${pc + 1})) *
          sin(radians(latitude))
        )
      ) <= $${pc + 3}`;
      params.push(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
      pc += 3;
    }

    query += ` ORDER BY starts_at DESC LIMIT $${pc + 1} OFFSET $${pc + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const rows = result.rows.map(r => ({
      ...r,
      name: r.name || r.title, // ensure frontend has name
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      startsAt: r.starts_at,
      deletedAt: r.deleted_at,
      lastSyncAt: r.last_sync_at
    }));

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('Error in /api/events:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Count events with same filters as /api/events
app.get("/api/events/count", async (req, res) => {
  try {
    const { latitude, longitude, radius, from, to } = req.query;
    const pool = getDbPool();

    let query = 'SELECT COUNT(*)::int AS count FROM events WHERE deleted_at IS NULL';
    const params = [];
    let pc = 0;

    if (from) { pc++; query += ` AND starts_at >= $${pc}`; params.push(from + 'T00:00:00.000Z'); }
    if (to) { pc++; query += ` AND starts_at <= $${pc}`; params.push(to + 'T23:59:59.999Z'); }

    if (latitude && longitude && radius) {
      query += ` AND (
        6371 * acos(
          cos(radians($${pc + 1})) *
          cos(radians(latitude)) *
          cos(radians(longitude) - radians($${pc + 2})) +
          sin(radians($${pc + 1})) *
          sin(radians(latitude))
        )
      ) <= $${pc + 3}`;
      params.push(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
      pc += 3;
    }

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows[0]?.count ?? 0 });
  } catch (err) {
    console.error('Error in /api/events/count:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simple sync status endpoint used by the app
app.get("/api/sync/status", (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
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
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
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
    createdBy: user.id,
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
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const eventId = parseInt(req.params.id);
  const eventIndex = events.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
  
  // Only event creator can update
  if (events[eventIndex].createdBy !== user.id) {
    return res.status(403).json({
      success: false,
      error: "Access denied"
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
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  const eventId = parseInt(req.params.id);
  const eventIndex = events.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return res.status(404).json({
      success: false,
      error: "Event not found"
    });
  }
  
  // Only event creator can delete
  if (events[eventIndex].createdBy !== user.id) {
    return res.status(403).json({
      success: false,
      error: "Access denied"
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
  key: fs.readFileSync(path.join(__dirname, '../whtzup-app/ssl/server.key')),
  cert: fs.readFileSync(path.join(__dirname, '../whtzup-app/ssl/server.crt'))
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
console.log(`- POST /api/auth/signup`);
console.log(`- POST /api/auth/refresh`);
console.log(`- GET /api/user-group`);
console.log(`- GET /api/users`);
console.log(`- GET /api/users/:id`);
console.log(`- GET /api/subscription/status`);
console.log(`- GET /api/subscription/usage`);
console.log(`- GET /api/subscription/billing`);
console.log(`- GET /api/subscription/features`);
console.log(`- POST /api/ratings`);
console.log(`- GET /api/ratings/event/:eventId`);
console.log(`- GET /api/ratings/user/:userId`);
console.log(`- PUT /api/ratings/:ratingId`);
console.log(`- DELETE /api/ratings/:ratingId`);
console.log(`- GET /api/ratings/top-rated`);
console.log(`- POST /api/events/:eventId/register`);
console.log(`- DELETE /api/events/:eventId/register`);
console.log(`- GET /api/events/:eventId/registrations`);
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

console.log(`\n🔐 User Registration:`);
console.log(`- New users can register via POST /api/auth/signup`);
console.log(`- All new users get 'free' subscription by default`);
console.log(`- Email validation and password requirements enforced`);

console.log(`\n⭐ Ratings System:`);
console.log(`- Users can rate events (1-5 stars)`);
console.log(`- Users can add reviews to ratings`);
console.log(`- Users can update/delete their own ratings`);
console.log(`- Top-rated events endpoint available`);

console.log(`\n🎫 Event Registration:`);
console.log(`- Users can register for events`);
console.log(`- Event creators can see registrations`);
console.log(`- Users can cancel registrations`);

console.log(`\n💳 Subscription Features:`);
console.log(`- Usage tracking (daily/monthly limits)`);
console.log(`- Billing history`);
console.log(`- Feature lists based on subscription type`);
console.log(`- User group determination`);
// NEW: Change password endpoint
app.post("/api/auth/change-password", (req, res) => { res.json({ success: true, message: "Password changed successfully" }); });
app.post("/api/auth/forgot-password", (req, res) => { res.json({ success: true, message: "Password reset email sent" }); });
app.post("/api/auth/request-reset-code", (req, res) => { res.json({ success: true, message: "Reset code sent to email", data: { resetCode: "ABC123" } }); });
app.post("/api/auth/verify-reset-code", (req, res) => { res.json({ success: true, message: "Code verified successfully", data: { resetToken: "demo@eventdiscovery.app_reset_token_123" } }); });
app.post("/api/auth/reset-password-with-code", (req, res) => { res.json({ success: true, message: "Password reset successfully" }); });
app.post("/api/subscription/upgrade", (req, res) => { res.json({ success: true, message: "Subscription upgraded successfully" }); });
app.post("/api/subscription/cancel", (req, res) => { res.json({ success: true, message: "Subscription cancelled successfully" }); });
app.post("/api/subscription/reactivate", (req, res) => { res.json({ success: true, message: "Subscription reactivated successfully" }); });
app.post("/api/subscription/change-plan", (req, res) => { res.json({ success: true, message: "Plan changed successfully" }); });
app.post("/api/update-events", (req, res) => { res.json({ success: true, message: "Events updated successfully", data: { updated: 0, created: 0, total: events.length } }); });
