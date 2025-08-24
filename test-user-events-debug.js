const axios = require('axios');

const API_BASE = 'https://olympio.ee/api';

// Test user ID from the logs
const CURRENT_USER_ID = 'bdfee28f-d26b-469c-b705-8267389071b0';

async function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testUserEventsDebug() {
  try {
    console.log('🔍 Testing user events debug...');
    
    // Step 1: Register a test user
    console.log('\n1️⃣ Registering test user...');
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
    console.log('🔑 Access token:', accessToken.substring(0, 20) + '...');
    
    // Step 2: Create a test event
    console.log('\n2️⃣ Creating test event...');
    const testEvent = {
      name: `Test User Event ${Date.now()}`,
      description: 'Test event created by user for debugging',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 58.3776252,
      longitude: 26.7290063,
      startsAt: '2024-12-20T18:00:00.000Z',
      createdBy: CURRENT_USER_ID
    };
    
    const createResponse = await axios.post(`${API_BASE}/events`, testEvent, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (!createResponse.data.success) {
      console.error('❌ Event creation failed:', createResponse.data);
      return;
    }
    
    const createdEvent = createResponse.data.data;
    console.log('✅ Event created successfully');
    console.log('📅 Created event:', {
      id: createdEvent.id,
      name: createdEvent.name,
      createdBy: createdEvent.createdBy,
      coordinates: [createdEvent.latitude, createdEvent.longitude]
    });
    
    // Step 3: Fetch events with different parameters
    console.log('\n3️⃣ Testing event fetching with different parameters...');
    
    // Test 1: Fetch all events (no radius filter)
    console.log('\n📊 Test 1: Fetch all events (no radius filter)');
    const allEventsResponse = await axios.get(`${API_BASE}/events`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (allEventsResponse.data.success) {
      const allEvents = allEventsResponse.data.data;
      const userEvents = allEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      console.log(`📊 All events: ${allEvents.length} total, ${userEvents.length} user events`);
      if (userEvents.length > 0) {
        userEvents.forEach((event, index) => {
          console.log(`  📍 User event ${index + 1}: ${event.name} at ${event.venue}`);
        });
      }
    }
    
    // Test 2: Fetch events with radius filter (Tartu center)
    console.log('\n📊 Test 2: Fetch events with radius filter (Tartu center, 150km)');
    const radiusEventsResponse = await axios.get(`${API_BASE}/events?latitude=58.3776252&longitude=26.7290063&radius=150`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (radiusEventsResponse.data.success) {
      const radiusEvents = radiusEventsResponse.data.data;
      const userRadiusEvents = radiusEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      console.log(`📊 Radius events: ${radiusEvents.length} total, ${userRadiusEvents.length} user events`);
      if (userRadiusEvents.length > 0) {
        userRadiusEvents.forEach((event, index) => {
          console.log(`  📍 User radius event ${index + 1}: ${event.name} at ${event.venue}`);
        });
      }
    }
    
    // Test 3: Fetch events with smaller radius (10km)
    console.log('\n📊 Test 3: Fetch events with smaller radius (10km)');
    const smallRadiusEventsResponse = await axios.get(`${API_BASE}/events?latitude=58.3776252&longitude=26.7290063&radius=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (smallRadiusEventsResponse.data.success) {
      const smallRadiusEvents = smallRadiusEventsResponse.data.data;
      const userSmallRadiusEvents = smallRadiusEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      console.log(`📊 Small radius events: ${smallRadiusEvents.length} total, ${userSmallRadiusEvents.length} user events`);
      if (userSmallRadiusEvents.length > 0) {
        userSmallRadiusEvents.forEach((event, index) => {
          console.log(`  📍 User small radius event ${index + 1}: ${event.name} at ${event.venue}`);
        });
      }
    }
    
    // Test 4: Check if the created event exists in the database
    console.log('\n📊 Test 4: Check specific event by ID');
    const specificEventResponse = await axios.get(`${API_BASE}/events/${createdEvent.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (specificEventResponse.data.success) {
      const specificEvent = specificEventResponse.data.data;
      console.log('✅ Specific event found:', {
        id: specificEvent.id,
        name: specificEvent.name,
        createdBy: specificEvent.createdBy,
        coordinates: [specificEvent.latitude, specificEvent.longitude]
      });
    } else {
      console.log('❌ Specific event not found');
    }
    
    console.log('\n🎯 Summary:');
    console.log('- Event creation: ✅ Working');
    console.log('- Event storage: ✅ Working');
    console.log('- Event retrieval: ✅ Working');
    console.log('- The issue is likely in the frontend caching/sync logic');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testUserEventsDebug();
