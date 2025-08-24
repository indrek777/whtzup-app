const axios = require('axios');

const API_BASE = 'https://olympio.ee/api';

// Test user ID from the logs - this user has existing events
const CURRENT_USER_ID = 'bdfee28f-d26b-469c-b705-8267389071b0';

// Tartu center coordinates
const TARTU_CENTER = { latitude: 58.3776252, longitude: 26.7290063 };

async function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testExistingUserEvents() {
  try {
    console.log('🔍 Testing existing user events inclusion...');
    
    // Step 1: Register a test user to get authentication
    console.log('\n1️⃣ Registering test user for authentication...');
    const deviceId = await generateUUID();
    const registerResponse = await axios.post(`${API_BASE}/auth/signup`, {
      deviceId: deviceId,
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      name: `Test User ${Date.now()}`
    });
    
    if (!registerResponse.data.success) {
      console.error('❌ Registration failed:', registerResponse.data);
      return;
    }
    
    const accessToken = registerResponse.data.data.accessToken;
    console.log('✅ User registered successfully');
    
    // Step 2: Fetch all events to see existing user events
    console.log('\n2️⃣ Fetching all events to see existing user events...');
    
    const allEventsResponse = await axios.get(`${API_BASE}/events`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (allEventsResponse.data.success) {
      const allEvents = allEventsResponse.data.data;
      const userEvents = allEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      
      console.log(`📊 All events: ${allEvents.length} total, ${userEvents.length} events by user ${CURRENT_USER_ID}`);
      
      if (userEvents.length > 0) {
        userEvents.forEach((event, index) => {
          console.log(`   📍 User event ${index + 1}: ${event.name} at ${event.venue}`);
        });
      } else {
        console.log('   ❌ No events found for this user ID');
        return;
      }
    }
    
    // Step 3: Test radius filtering with authentication (should now include user events)
    console.log('\n3️⃣ Testing radius filtering with authentication...');
    
    // Test with 150km radius (should now include user events)
    const radiusEventsResponse = await axios.get(`${API_BASE}/events?latitude=${TARTU_CENTER.latitude}&longitude=${TARTU_CENTER.longitude}&radius=150`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (radiusEventsResponse.data.success) {
      const radiusEvents = radiusEventsResponse.data.data;
      const userRadiusEvents = radiusEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      
      console.log(`📊 Radius 150km with auth: ${radiusEvents.length} total events, ${userRadiusEvents.length} user events`);
      
      if (userRadiusEvents.length > 0) {
        userRadiusEvents.forEach((event, index) => {
          console.log(`   📍 User event: ${event.name} at ${event.venue}`);
        });
        console.log('   ✅ User events included with radius filtering (backend fix working!)');
      } else {
        console.log('   ❌ No user events found with radius filtering');
      }
    }
    
    // Step 4: Test with small radius (10km) to verify user events are always included
    console.log('\n4️⃣ Testing with small radius (10km) to verify user events are always included...');
    
    const smallRadiusResponse = await axios.get(`${API_BASE}/events?latitude=${TARTU_CENTER.latitude}&longitude=${TARTU_CENTER.longitude}&radius=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (smallRadiusResponse.data.success) {
      const smallRadiusEvents = smallRadiusResponse.data.data;
      const userSmallRadiusEvents = smallRadiusEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      
      console.log(`📊 Radius 10km with auth: ${smallRadiusEvents.length} total events, ${userSmallRadiusEvents.length} user events`);
      
      if (userSmallRadiusEvents.length > 0) {
        userSmallRadiusEvents.forEach((event, index) => {
          console.log(`   📍 User event: ${event.name} at ${event.venue}`);
        });
        console.log('   ✅ User events included even with small radius (backend fix working!)');
      } else {
        console.log('   ❌ No user events found with small radius');
      }
    }
    
    // Step 5: Test without authentication (should not include user events)
    console.log('\n5️⃣ Testing without authentication (should not include user events)...');
    
    const noAuthResponse = await axios.get(`${API_BASE}/events?latitude=${TARTU_CENTER.latitude}&longitude=${TARTU_CENTER.longitude}&radius=150`);
    
    if (noAuthResponse.data.success) {
      const noAuthEvents = noAuthResponse.data.data;
      const userNoAuthEvents = noAuthEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      
      console.log(`📊 Radius 150km without auth: ${noAuthEvents.length} total events, ${userNoAuthEvents.length} user events`);
      
      if (userNoAuthEvents.length > 0) {
        console.log('   ❌ User events found without authentication (unexpected)');
        userNoAuthEvents.forEach((event, index) => {
          console.log(`   📍 User event: ${event.name} at ${event.venue}`);
        });
      } else {
        console.log('   ✅ No user events found without authentication (expected)');
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('- Backend should now include user events regardless of radius when authenticated');
    console.log('- Frontend default radius increased to 200km');
    console.log('- User events should now appear on the map');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testExistingUserEvents();
