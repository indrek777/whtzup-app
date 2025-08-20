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

// Generate a proper UUID for device ID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testHealth() {
  console.log('🏥 Testing health endpoints...');
  
  try {
    const response = await makeRequest('/health');
    console.log('✅ Health check:', response.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

async function testDetailedHealth() {
  console.log('\n🔍 Testing detailed health...');
  
  try {
    const response = await makeRequest('/api/health/detailed');
    console.log('✅ Detailed health:', {
      status: response.data.status,
      database: response.data.services?.database?.status,
      redis: response.data.services?.redis?.status,
      events: response.data.events?.total || 0
    });
  } catch (error) {
    console.log('❌ Detailed health failed:', error.message);
  }
}

async function testEventsAPI() {
  console.log('\n📅 Testing events API...');
  
  try {
    // Test GET events
    const getResponse = await makeRequest('/api/events');
    console.log(`✅ GET events: ${getResponse.data.data?.length || 0} events found`);
    
    // Test POST event
    const testEvent = {
      name: 'Test Event from Script',
      description: 'This is a test event created by the setup script',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address, Test City',
      latitude: 59.437000,
      longitude: 24.753600,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      createdBy: 'Setup Script'
    };
    
    const deviceId = generateUUID();
    const postResponse = await makeRequest('/api/events', 'POST', testEvent, {
      'X-Device-ID': deviceId
    });
    
    if (postResponse.data.success) {
      console.log('✅ POST event: Event created successfully');
      
      // Test PUT event
      const updatedEvent = { ...postResponse.data.data, name: 'Updated Test Event' };
      const putResponse = await makeRequest(`/api/events/${postResponse.data.data.id}`, 'PUT', updatedEvent, {
        'X-Device-ID': deviceId
      });
      
      if (putResponse.data.success) {
        console.log('✅ PUT event: Event updated successfully');
      } else {
        console.log('❌ PUT event failed:', putResponse.data.error);
      }
      
      // Test DELETE event
      const deleteResponse = await makeRequest(`/api/events/${postResponse.data.data.id}`, 'DELETE', null, {
        'X-Device-ID': deviceId
      });
      
      if (deleteResponse.data.success) {
        console.log('✅ DELETE event: Event deleted successfully');
      } else {
        console.log('❌ DELETE event failed:', deleteResponse.data.error);
      }
    } else {
      console.log('❌ POST event failed:', postResponse.data.error);
    }
  } catch (error) {
    console.log('❌ Events API test failed:', error.message);
  }
}

async function testSyncAPI() {
  console.log('\n🔄 Testing sync API...');
  
  try {
    const deviceId = generateUUID();
    const response = await makeRequest(`/api/sync/status?deviceId=${deviceId}`);
    console.log('✅ Sync status:', {
      deviceId: response.data.deviceId,
      isOnline: response.data.isOnline,
      pendingOperations: response.data.queue?.pending || 0,
      totalOperations: response.data.queue?.total || 0
    });
  } catch (error) {
    console.log('❌ Sync API test failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing WhtzUp Docker Backend Setup...\n');
  
  // Wait a bit for database to be ready
  console.log('⏳ Waiting for database to be ready...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await testHealth();
  await testDetailedHealth();
  await testEventsAPI();
  await testSyncAPI();
  
  console.log('\n✨ Test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Start your React Native app');
  console.log('2. Import and use the syncService');
  console.log('3. Test offline/online functionality');
  console.log('\n📚 See DOCKER_SETUP.md for detailed documentation');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
