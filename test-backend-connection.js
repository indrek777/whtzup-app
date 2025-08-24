#!/usr/bin/env node

const http = require('http');

console.log('🔍 Testing backend connection from simulator environment...\n');

// Test the backend connection
function testBackendConnection() {
  const options = {
    hostname: 'olympio.ee',
    port: 4000,
    path: '/api/events?limit=1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'EventDiscoveryApp/1.0'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ Backend Response Status: ${res.statusCode}`);
      console.log(`📡 Response Headers:`, res.headers);
      console.log(`📄 Response Data:`, data.substring(0, 200) + '...');
      
      if (res.statusCode === 200) {
        console.log('\n🎉 Backend connection successful!');
        console.log('📱 The app should now be able to fetch events.');
      } else {
        console.log('\n❌ Backend connection failed with status:', res.statusCode);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Network Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if olympio.ee:4000 is accessible');
    console.log('2. Verify network connectivity');
    console.log('3. Check if the backend server is running');
  });

  req.setTimeout(10000, () => {
    console.log('⏰ Request timeout - backend may be slow or unreachable');
    req.destroy();
  });

  req.end();
}

// Test health endpoint
function testHealthEndpoint() {
  const options = {
    hostname: 'olympio.ee',
    port: 4000,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`🏥 Health Check Status: ${res.statusCode}`);
      console.log(`📊 Health Data:`, data);
    });
  });

  req.on('error', (error) => {
    console.log('❌ Health check failed:', error.message);
  });

  req.end();
}

console.log('1️⃣ Testing events endpoint...');
testBackendConnection();

setTimeout(() => {
  console.log('\n2️⃣ Testing health endpoint...');
  testHealthEndpoint();
}, 2000);
