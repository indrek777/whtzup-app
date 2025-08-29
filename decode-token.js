const jwt = require('jsonwebtoken');

const token = 'ints@me.com_access_token_1756455873582';

try {
  // Try to decode without verification first
  const decoded = jwt.decode(token);
  console.log('Decoded token:', JSON.stringify(decoded, null, 2));
  
  // Try to verify with a dummy secret to see if it's a valid JWT
  try {
    jwt.verify(token, 'dummy-secret');
  } catch (error) {
    console.log('Token verification failed (expected):', error.message);
  }
  
} catch (error) {
  console.log('Token is not a valid JWT:', error.message);
}
