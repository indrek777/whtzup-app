const jwt = require('jsonwebtoken');

// The token from the test
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhY2M2ZjhiZS02NjU3LTQwYWEtOTQ1ZS05ZmM3Zjk5ZmRlNzciLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU1ODAyMDM1LCJleHAiOjE3NTU4MDI5MzV9.7g0UnIIvcRjLL1tl4ozR9oLjfLsYsbvU32R6Nk-K6DQ';

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

console.log('🔍 Analyzing JWT token...');

try {
  // Decode without verification first
  const decoded = jwt.decode(token);
  console.log('📋 Decoded token payload:', JSON.stringify(decoded, null, 2));
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  console.log('🕐 Current time:', now);
  console.log('🕐 Token expires at:', decoded.exp);
  console.log('⏰ Token expired:', now > decoded.exp);
  
  // Try to verify the token
  const verified = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verification successful:', JSON.stringify(verified, null, 2));
  
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
  
  if (error.name === 'TokenExpiredError') {
    console.log('⏰ Token has expired');
  } else if (error.name === 'JsonWebTokenError') {
    console.log('🔑 Invalid token signature');
  }
}
