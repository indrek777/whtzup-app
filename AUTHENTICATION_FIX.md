
# 🔧 Authentication Token Fix

## Problem
The frontend app is using a custom token format instead of proper JWT tokens, causing "invalid access token" errors when registering for events.

## Solution
The backend is working correctly and generating proper JWT tokens. The frontend needs to be updated to use these tokens.

## Steps to Fix:

### 1. Clear Stored Tokens
Run this script to clear old tokens:
```bash
node clear-tokens.js
```

### 2. Sign In Again
The app will prompt for login. Use these credentials:
- Email: ints@me.com
- Password: test123

### 3. Verify Token Format
After signing in, the app should use proper JWT tokens like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MGM3ODk5Mi0xZGQ1LTQxMTAtYTM1Mi1iNTllZTI1NWI1NjgiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU2NDgwNzcwLCJleHAiOjE3NTY0ODE2NzB9.t-VN-h_lfrTQRG7H_zyB6xK_aVfkwj1IS_kIMRNVtJw
```

### 4. Test Event Registration
Try registering for an event - it should now work without "invalid access token" errors.

## Backend Status
✅ Authentication endpoints working
✅ JWT token generation working
✅ Event registration endpoints working
✅ Database connection working

## Frontend Status
⚠️ Needs to clear old custom tokens and use proper JWT tokens
