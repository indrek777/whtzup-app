# WhtzUp Authentication System Setup

This document explains how to set up and use the fully functional user authentication system for WhtzUp Events.

## 🏗️ System Overview

The authentication system includes:

- **JWT-based authentication** with access and refresh tokens
- **Secure password hashing** using bcrypt
- **User registration and login** with email/password
- **Token refresh mechanism** for seamless user experience
- **User profiles** with preferences, subscriptions, and stats
- **Database storage** for users, tokens, and related data

## 📋 Prerequisites

1. **Docker Desktop** running with the backend services
2. **Node.js 18+** for development
3. **PostgreSQL** database (via Docker)
4. **Redis** cache (via Docker)

## 🚀 Quick Start

### 1. Start the Backend Services

```bash
# Start all services (PostgreSQL, Redis, API Server)
docker-compose up --build -d

# Or use the provided script
start-docker.bat
```

### 2. Verify Services are Running

```bash
# Check container status
docker-compose ps

# Test API health
curl http://localhost:4000/health
```

### 3. Test Authentication System

```bash
# Run the authentication test
node test-auth.js
```

## 🔧 Configuration

### Environment Variables

The backend uses these environment variables (set in `docker-compose.yml`):

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
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

### Frontend Configuration

Update the API URL in `src/utils/userService.ts`:

```typescript
const API_BASE_URL = 'http://localhost:4000/api' // Update this to your actual backend URL
```

## 📚 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/signin` | Login user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/signout` | Logout user |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Request/Response Examples

#### User Registration
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### User Login
```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get User Profile
```bash
GET /api/auth/profile
Authorization: Bearer <access_token>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "subscription": {
      "status": "free",
      "plan": null,
      "startDate": null,
      "endDate": null,
      "autoRenew": false,
      "features": ["basic_search", "basic_filtering", "local_ratings"]
    },
    "preferences": {
      "notifications": true,
      "emailUpdates": true,
      "defaultRadius": 10,
      "favoriteCategories": [],
      "language": "en",
      "theme": "auto"
    },
    "stats": {
      "eventsCreated": 0,
      "eventsAttended": 0,
      "ratingsGiven": 0,
      "reviewsWritten": 0,
      "totalEvents": 0,
      "favoriteVenues": [],
      "lastEventCreatedDate": null,
      "eventsCreatedToday": 0
    }
  }
}
```

## 🔐 Security Features

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- Minimum password length of 6 characters
- Email validation and normalization

### Token Security
- **Access tokens**: 15-minute expiration
- **Refresh tokens**: 7-day expiration
- Tokens are stored securely in the database
- Automatic token refresh mechanism
- Token revocation on logout

### Database Security
- User passwords are never stored in plain text
- Refresh tokens are stored with expiration dates
- Automatic cleanup of expired tokens
- User account deactivation support

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);
```

### User Subscriptions Table
```sql
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'free',
    plan VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '[]'
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE
);
```

## 🎯 Frontend Integration

### UserService Methods

The frontend `UserService` class provides these methods:

```typescript
// Authentication
await userService.signUp(email, password, name)
await userService.signIn(email, password)
await userService.signOut()
await userService.refreshAccessToken()

// User data
await userService.getCurrentUser()
await userService.getFullUserProfile()
await userService.isAuthenticated()

// Headers for API requests
await userService.getAuthHeaders()
```

### Usage in Components

```typescript
import { userService } from '../utils/userService'

// Check if user is authenticated
const isAuth = await userService.isAuthenticated()

// Get user profile
const user = await userService.getFullUserProfile()

// Make authenticated API requests
const headers = await userService.getAuthHeaders()
const response = await fetch('/api/events', { headers })
```

## 🧪 Testing

### Run Authentication Tests
```bash
node test-auth.js
```

This will test:
1. User registration
2. User login
3. Profile retrieval
4. Token refresh
5. User logout

### Manual Testing with curl

```bash
# Register a user
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

## 🔄 Token Refresh Flow

1. **Access token expires** (15 minutes)
2. **Frontend detects 401 response**
3. **Automatically calls refresh endpoint**
4. **Gets new access and refresh tokens**
5. **Retries original request**
6. **Seamless user experience**

## 🚨 Error Handling

### Common Error Responses

```json
// Invalid credentials
{
  "success": false,
  "error": "Invalid email or password"
}

// Token expired
{
  "success": false,
  "error": "Access token expired"
}

// Validation errors
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check if PostgreSQL container is running
   - Verify database credentials in docker-compose.yml

2. **JWT_SECRET not set**
   - Ensure JWT_SECRET is set in environment variables
   - Generate a secure random string for production

3. **CORS errors**
   - Update ALLOWED_ORIGINS in backend configuration
   - Check frontend API_BASE_URL matches backend

4. **Token refresh failing**
   - Check if refresh token is stored correctly
   - Verify token expiration dates

### Debug Commands

```bash
# Check backend logs
docker-compose logs api-server

# Check database logs
docker-compose logs postgres

# Test database connection
docker exec -it whtzup-postgres psql -U whtzup_user -d whtzup_events

# Check Redis connection
docker exec -it whtzup-redis redis-cli ping
```

## 🚀 Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to a secure random string
- [ ] Enable HTTPS in production
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] SSL/TLS certificates

### Environment Variables for Production

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-random-string-here
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
```

## 📝 Next Steps

1. **Email verification** - Add email verification flow
2. **Password reset** - Implement forgot password functionality
3. **Social login** - Add Google, Facebook, Apple login
4. **Two-factor authentication** - Add 2FA support
5. **User roles** - Implement admin and moderator roles
6. **Audit logging** - Track user actions for security

---

The authentication system is now fully functional! Users can register, login, and access protected features with secure token-based authentication.
