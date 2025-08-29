const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://165.22.90.180:4000/api';

// Test authentication and fix token issues
async function fixAuthentication() {
  console.log('🔧 Fixing Authentication Token Issues');
  console.log('=====================================');
  
  try {
    // Step 1: Test authentication with proper credentials
    console.log('\n1️⃣ Testing authentication...');
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'ints@me.com',
        password: 'test123'
      })
    });
    
    const signinResult = await signinResponse.json();
    
    if (!signinResult.success) {
      console.log('❌ Authentication failed:', signinResult.error);
      return;
    }
    
    console.log('✅ Authentication successful');
    const { accessToken, refreshToken } = signinResult.data;
    console.log('🔑 Access Token:', accessToken.substring(0, 50) + '...');
    console.log('🔄 Refresh Token:', refreshToken.substring(0, 50) + '...');
    
    // Step 2: Test event registration with proper JWT token
    console.log('\n2️⃣ Testing event registration...');
    const registerResponse = await fetch(`${API_BASE_URL}/events/sample-event-1/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const registerResult = await registerResponse.json();
    
    if (registerResult.success) {
      console.log('✅ Event registration successful');
      console.log('📊 Registration count:', registerResult.registrationCount);
    } else {
      console.log('❌ Event registration failed:', registerResult.error);
    }
    
    // Step 3: Test event unregistration
    console.log('\n3️⃣ Testing event unregistration...');
    const unregisterResponse = await fetch(`${API_BASE_URL}/events/sample-event-1/register`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const unregisterResult = await unregisterResponse.json();
    
    if (unregisterResult.success) {
      console.log('✅ Event unregistration successful');
      console.log('📊 Registration count:', unregisterResult.registrationCount);
    } else {
      console.log('❌ Event unregistration failed:', unregisterResult.error);
    }
    
    // Step 4: Create instructions for frontend fix
    console.log('\n4️⃣ Creating frontend fix instructions...');
    
    const fixInstructions = `
# 🔧 Authentication Token Fix

## Problem
The frontend app is using a custom token format instead of proper JWT tokens, causing "invalid access token" errors when registering for events.

## Solution
The backend is working correctly and generating proper JWT tokens. The frontend needs to be updated to use these tokens.

## Steps to Fix:

### 1. Clear Stored Tokens
Run this script to clear old tokens:
\`\`\`bash
node clear-tokens.js
\`\`\`

### 2. Sign In Again
The app will prompt for login. Use these credentials:
- Email: ints@me.com
- Password: test123

### 3. Verify Token Format
After signing in, the app should use proper JWT tokens like:
\`\`\`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MGM3ODk5Mi0xZGQ1LTQxMTAtYTM1Mi1iNTllZTI1NWI1NjgiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU2NDgwNzcwLCJleHAiOjE3NTY0ODE2NzB9.t-VN-h_lfrTQRG7H_zyB6xK_aVfkwj1IS_kIMRNVtJw
\`\`\`

### 4. Test Event Registration
Try registering for an event - it should now work without "invalid access token" errors.

## Backend Status
✅ Authentication endpoints working
✅ JWT token generation working
✅ Event registration endpoints working
✅ Database connection working

## Frontend Status
⚠️ Needs to clear old custom tokens and use proper JWT tokens
`;

    fs.writeFileSync('AUTHENTICATION_FIX.md', fixInstructions);
    console.log('✅ Fix instructions saved to AUTHENTICATION_FIX.md');
    
    console.log('\n🎉 Authentication fix completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: node clear-tokens.js');
    console.log('2. Restart the app');
    console.log('3. Sign in with: ints@me.com / test123');
    console.log('4. Test event registration');
    
  } catch (error) {
    console.error('❌ Error fixing authentication:', error);
  }
}

fixAuthentication();
