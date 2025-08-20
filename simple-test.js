console.log('🧪 Simple test starting...');

// Test 1: Check if we can read the events file
try {
  const fs = require('fs');
  const path = require('path');
  
  console.log('📁 Testing file access...');
  const eventsDataPath = path.join(__dirname, 'src', 'data', 'events-data.json');
  
  if (fs.existsSync(eventsDataPath)) {
    console.log('✅ Events file exists');
    const stats = fs.statSync(eventsDataPath);
    console.log('📊 File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  } else {
    console.log('❌ Events file not found');
  }
} catch (error) {
  console.log('❌ File test failed:', error.message);
}

// Test 2: Check if we can make HTTP requests
try {
  console.log('\n🌐 Testing HTTP requests...');
  const http = require('http');
  
  const testUrl = 'http://localhost:4000/health';
  const url = new URL(testUrl);
  
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('✅ HTTP request successful');
      console.log('📊 Status:', res.statusCode);
      console.log('📊 Response:', data.substring(0, 200) + '...');
    });
  });
  
  req.on('error', (error) => {
    console.log('❌ HTTP request failed:', error.message);
    console.log('💡 Make sure Docker containers are running');
  });
  
  req.on('timeout', () => {
    console.log('❌ HTTP request timed out');
    req.destroy();
  });
  
  req.end();
  
} catch (error) {
  console.log('❌ HTTP test failed:', error.message);
}

console.log('\n✨ Simple test completed!');
