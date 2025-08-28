const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
