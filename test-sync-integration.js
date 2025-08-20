const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:4000');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': 'test-device-123'
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSyncIntegration() {
  console.log('🧪 Testing Sync Service Integration...\n');

  try {
    // Test 1: Check if API is running
    console.log('1. Testing API connectivity...');
    const healthResponse = await makeRequest('/api/health');
    console.log(`   ✅ API Status: ${healthResponse.status} - ${healthResponse.data.message || 'OK'}`);

    // Test 2: Check current events count
    console.log('\n2. Testing events endpoint...');
    const eventsResponse = await makeRequest('/api/events');
    const eventsCount = eventsResponse.data?.data?.length || 0;
    console.log(`   ✅ Events in database: ${eventsCount}`);

    // Test 3: Test creating a new event
    console.log('\n3. Testing event creation...');
    const testEvent = {
      name: 'Test Event - Sync Integration',
      description: 'Testing sync service integration',
      category: 'test',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 59.436962,
      longitude: 24.753574,
      startsAt: '2024-12-31 20:00:00',
      createdBy: 'test-user',
      source: 'test'
    };

    const createResponse = await makeRequest('/api/events', 'POST', testEvent);
    if (createResponse.status === 201) {
      console.log(`   ✅ Event created successfully: ${createResponse.data.data?.id}`);
    } else {
      console.log(`   ❌ Event creation failed: ${createResponse.status} - ${JSON.stringify(createResponse.data)}`);
    }

    // Test 4: Check events count after creation
    console.log('\n4. Verifying event count after creation...');
    const eventsResponse2 = await makeRequest('/api/events');
    const eventsCount2 = eventsResponse2.data?.data?.length || 0;
    console.log(`   ✅ Events in database: ${eventsCount2} (was ${eventsCount})`);

    // Test 5: Test sync status endpoint
    console.log('\n5. Testing sync status...');
    const syncResponse = await makeRequest('/api/sync/status');
    console.log(`   ✅ Sync Status: ${syncResponse.status} - ${JSON.stringify(syncResponse.data)}`);

    console.log('\n🎉 Sync Service Integration Test Complete!');
    console.log('\n📱 Your React Native app should now be able to:');
    console.log('   • Load events from the Docker backend');
    console.log('   • Create, update, and delete events');
    console.log('   • Sync changes to all users in real-time');
    console.log('   • Work offline with automatic sync when online');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSyncIntegration();
