# App Store Users for EventDiscovery App

## Overview
Total users: **15**
- Premium users: **8**
- Free users: **4** 
- Expired users: **2**

## Premium Users (8)

### 1. Demo User
- **Email:** demo@eventdiscovery.app
- **Password:** demo123
- **ID:** 1
- **Subscription:** Premium (until 2026-12-31)

### 2. Premium User
- **Email:** premium@eventdiscovery.app
- **Password:** premium123
- **ID:** 2
- **Subscription:** Premium (until 2026-12-31)

### 3. John Doe
- **Email:** john.doe@eventdiscovery.app
- **Password:** john123
- **ID:** 3
- **Subscription:** Premium (until 2026-06-15)

### 4. Sarah Wilson
- **Email:** sarah.wilson@eventdiscovery.app
- **Password:** sarah123
- **ID:** 4
- **Subscription:** Premium (until 2026-09-30)

### 5. Event Organizer
- **Email:** organizer@eventdiscovery.app
- **Password:** organizer123
- **ID:** 10
- **Subscription:** Premium (until 2026-12-31)

### 6. Festival Manager
- **Email:** festival.manager@eventdiscovery.app
- **Password:** festival123
- **ID:** 11
- **Subscription:** Premium (until 2026-12-31)

### 7. Business User
- **Email:** business@eventdiscovery.app
- **Password:** business123
- **ID:** 12
- **Subscription:** Premium (until 2026-12-31)

### 8. Corporate User
- **Email:** corporate@eventdiscovery.app
- **Password:** corporate123
- **ID:** 13
- **Subscription:** Premium (until 2026-12-31)

### 9. Trial User
- **Email:** trial@eventdiscovery.app
- **Password:** trial123
- **ID:** 15
- **Subscription:** Premium (until 2025-09-15) - Short trial period

## Free Users (4)

### 1. Free User
- **Email:** free@eventdiscovery.app
- **Password:** free123
- **ID:** 5
- **Subscription:** Free (no end date)

### 2. Mike Brown
- **Email:** mike.brown@eventdiscovery.app
- **Password:** mike123
- **ID:** 6
- **Subscription:** Free (no end date)

### 3. Lisa Garcia
- **Email:** lisa.garcia@eventdiscovery.app
- **Password:** lisa123
- **ID:** 7
- **Subscription:** Free (no end date)

### 4. New User
- **Email:** newuser@eventdiscovery.app
- **Password:** new123
- **ID:** 14
- **Subscription:** Free (no end date)

## Expired Users (2)

### 1. Expired User
- **Email:** expired@eventdiscovery.app
- **Password:** expired123
- **ID:** 8
- **Subscription:** Expired (since 2024-12-31)

### 2. Alex Chen
- **Email:** alex.chen@eventdiscovery.app
- **Password:** alex123
- **ID:** 9
- **Subscription:** Expired (since 2024-08-15)

## API Endpoints

### Authentication
```
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@eventdiscovery.app",
  "password": "password123"
}
```

### Get All Users
```
GET /api/users
```

### Get User by ID
```
GET /api/users/:id
```

### Get User's Events
```
GET /api/users/:userId/events
```

## Testing Scenarios

### Premium Features Testing
Use any premium user to test:
- Event creation
- Advanced filters
- Premium categories
- Analytics access

### Free User Limitations
Use free users to test:
- Basic event browsing
- Limited features
- Upgrade prompts

### Expired Subscription Testing
Use expired users to test:
- Subscription renewal prompts
- Feature restrictions
- Payment flows

### Business User Testing
Use business/corporate users to test:
- Bulk operations
- Team features
- Business-specific functionality

## Notes

- All users are stored in the backend server at `165.22.90.180:4000`
- Passwords are simple for testing purposes
- Subscription dates are set for realistic testing scenarios
- Users cover different roles and subscription states for comprehensive App Store testing
