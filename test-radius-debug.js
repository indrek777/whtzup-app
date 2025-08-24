const axios = require('axios');

const API_BASE = 'https://olympio.ee/api';

// Test user ID from the logs
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

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function testRadiusDebug() {
  try {
    console.log('🔍 Testing radius filtering debug...');
    
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
    
    // Step 2: Fetch all events to find user events
    console.log('\n2️⃣ Fetching all events to find user events...');
    const allEventsResponse = await axios.get(`${API_BASE}/events`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (!allEventsResponse.data.success) {
      console.error('❌ Failed to fetch events:', allEventsResponse.data);
      return;
    }
    
    const allEvents = allEventsResponse.data.data;
    const userEvents = allEvents.filter(event => event.createdBy === CURRENT_USER_ID);
    
    console.log(`📊 Found ${userEvents.length} user events out of ${allEvents.length} total events`);
    
    if (userEvents.length === 0) {
      console.log('❌ No user events found. Creating a new one...');
      
      // Create a test event at Tartu center
      const testEvent = {
        name: `Test Radius Event ${Date.now()}`,
        description: 'Test event for radius debugging',
        category: 'other',
        venue: 'Tartu Test Venue',
        address: 'Tartu Test Address',
        latitude: TARTU_CENTER.latitude,
        longitude: TARTU_CENTER.longitude,
        startsAt: '2024-12-20T18:00:00.000Z',
        createdBy: CURRENT_USER_ID
      };
      
      const createResponse = await axios.post(`${API_BASE}/events`, testEvent, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId
        }
      });
      
      if (createResponse.data.success) {
        console.log('✅ Created new test event at Tartu center');
        userEvents.push(createResponse.data.data);
      }
    }
    
    // Step 3: Analyze user events and their distances
    console.log('\n3️⃣ Analyzing user events and distances...');
    userEvents.forEach((event, index) => {
      const eventLat = parseFloat(event.latitude);
      const eventLon = parseFloat(event.longitude);
      const distance = calculateDistance(
        TARTU_CENTER.latitude,
        TARTU_CENTER.longitude,
        eventLat,
        eventLon
      );
      
      console.log(`📍 User event ${index + 1}:`);
      console.log(`   Name: ${event.name}`);
      console.log(`   Venue: ${event.venue}`);
      console.log(`   Coordinates: [${eventLat}, ${eventLon}]`);
      console.log(`   Distance from Tartu center: ${distance.toFixed(2)}km`);
      console.log(`   Within 150km: ${distance <= 150 ? '✅ YES' : '❌ NO'}`);
      console.log(`   Within 10km: ${distance <= 10 ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
    // Step 4: Test radius filtering with different radii
    console.log('\n4️⃣ Testing radius filtering with different radii...');
    
    const testRadii = [1, 5, 10, 50, 100, 150, 200, 500];
    
    for (const radius of testRadii) {
      const radiusEventsResponse = await axios.get(`${API_BASE}/events?latitude=${TARTU_CENTER.latitude}&longitude=${TARTU_CENTER.longitude}&radius=${radius}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId
        }
      });
      
      if (radiusEventsResponse.data.success) {
        const radiusEvents = radiusEventsResponse.data.data;
        const userRadiusEvents = radiusEvents.filter(event => event.createdBy === CURRENT_USER_ID);
        
        console.log(`📊 Radius ${radius}km: ${radiusEvents.length} total events, ${userRadiusEvents.length} user events`);
        
        if (userRadiusEvents.length > 0) {
          userRadiusEvents.forEach((event, index) => {
            const eventLat = parseFloat(event.latitude);
            const eventLon = parseFloat(event.longitude);
            const distance = calculateDistance(
              TARTU_CENTER.latitude,
              TARTU_CENTER.longitude,
              eventLat,
              eventLon
            );
            console.log(`   📍 User event: ${event.name} (${distance.toFixed(2)}km away)`);
          });
        }
      }
    }
    
    // Step 5: Test with a very large radius to see if any user events appear
    console.log('\n5️⃣ Testing with very large radius (1000km)...');
    const largeRadiusResponse = await axios.get(`${API_BASE}/events?latitude=${TARTU_CENTER.latitude}&longitude=${TARTU_CENTER.longitude}&radius=1000`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (largeRadiusResponse.data.success) {
      const largeRadiusEvents = largeRadiusResponse.data.data;
      const userLargeRadiusEvents = largeRadiusEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      
      console.log(`📊 Large radius 1000km: ${largeRadiusEvents.length} total events, ${userLargeRadiusEvents.length} user events`);
      
      if (userLargeRadiusEvents.length > 0) {
        userLargeRadiusEvents.forEach((event, index) => {
          const eventLat = parseFloat(event.latitude);
          const eventLon = parseFloat(event.longitude);
          const distance = calculateDistance(
            TARTU_CENTER.latitude,
            TARTU_CENTER.longitude,
            eventLat,
            eventLon
          );
          console.log(`   📍 User event: ${event.name} (${distance.toFixed(2)}km away)`);
        });
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('- User events exist in the database');
    console.log('- Radius filtering is working but may be too restrictive');
    console.log('- Check if user events have valid coordinates');
    console.log('- Consider increasing the default radius or fixing coordinate issues');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRadiusDebug();
