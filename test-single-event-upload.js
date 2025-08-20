const http = require('http');

const API_BASE_URL = 'http://localhost:4000';

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSingleEvent() {
  console.log('🧪 Testing single event upload...\n');
  
  // Generate a proper UUID
  const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  const testEvent = {
    name: 'Test Event',
    description: 'This is a test event',
    category: 'other',
    venue: 'Test Venue',
    address: 'Test Address',
    latitude: 59.437000,
    longitude: 24.753600,
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'Test Script'
  };
  
  console.log('📤 Uploading test event:', testEvent);
  console.log('🆔 Device ID:', deviceId);
  
  try {
    const response = await makeRequest('/api/events', 'POST', testEvent, {
      'X-Device-ID': deviceId
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Test event uploaded successfully!');
    } else {
      console.log('❌ Test event upload failed:', response.data.error);
      if (response.data.details) {
        console.log('📋 Details:', response.data.details);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleEvent().catch(console.error);
