const axios = require('axios');

const API_BASE = 'https://olympio.ee/api';

// Test user ID from the logs - this user has existing events
const CURRENT_USER_ID = 'bdfee28f-d26b-469c-b705-8267389071b0';

async function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testAuthDebug() {
  try {
    console.log('🔍 Testing authentication debug...');
    
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
    const registeredUserId = registerResponse.data.data.user.id;
    console.log('✅ User registered successfully');
    console.log('🔑 Access token:', accessToken.substring(0, 20) + '...');
    console.log('👤 Registered user ID:', registeredUserId);
    
    // Step 2: Test authentication with the registered user
    console.log('\n2️⃣ Testing authentication with registered user...');
    
    const radiusEventsResponse = await axios.get(`${API_BASE}/events?latitude=58.3776252&longitude=26.7290063&radius=150`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });
    
    if (radiusEventsResponse.data.success) {
      const radiusEvents = radiusEventsResponse.data.data;
      const userRadiusEvents = radiusEvents.filter(event => event.createdBy === registeredUserId);
      
      console.log(`📊 Radius 150km with registered user auth: ${radiusEvents.length} total events, ${userRadiusEvents.length} user events`);
      
      if (userRadiusEvents.length > 0) {
        userRadiusEvents.forEach((event, index) => {
          console.log(`   📍 User event: ${event.name} at ${event.venue}`);
        });
        console.log('   ✅ User events included with radius filtering (working for registered user)');
      } else {
        console.log('   ❌ No user events found with radius filtering (expected for new user)');
      }
    }
    
    // Step 3: Test with the existing user ID that has events
    console.log('\n3️⃣ Testing with existing user ID that has events...');
    
    // First, we need to get a token for the existing user
    // Let's try to find the existing user's events without authentication
    const allEventsResponse = await axios.get(`${API_BASE}/events`);
    
    if (allEventsResponse.data.success) {
      const allEvents = allEventsResponse.data.data;
      const existingUserEvents = allEvents.filter(event => event.createdBy === CURRENT_USER_ID);
      
      console.log(`📊 All events: ${allEvents.length} total, ${existingUserEvents.length} events by existing user ${CURRENT_USER_ID}`);
      
      if (existingUserEvents.length > 0) {
        existingUserEvents.forEach((event, index) => {
          console.log(`   📍 Existing user event ${index + 1}: ${event.name} at ${event.venue}`);
        });
        
        // Now test radius filtering with the existing user's events
        const radiusEventsExistingResponse = await axios.get(`${API_BASE}/events?latitude=58.3776252&longitude=26.7290063&radius=150`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId
          }
        });
        
        if (radiusEventsExistingResponse.data.success) {
          const radiusEventsExisting = radiusEventsExistingResponse.data.data;
          const userRadiusEventsExisting = radiusEventsExisting.filter(event => event.createdBy === CURRENT_USER_ID);
          
          console.log(`📊 Radius 150km with auth (existing user events): ${radiusEventsExisting.length} total events, ${userRadiusEventsExisting.length} existing user events`);
          
          if (userRadiusEventsExisting.length > 0) {
            userRadiusEventsExisting.forEach((event, index) => {
              console.log(`   📍 Existing user event: ${event.name} at ${event.venue}`);
            });
            console.log('   ✅ Existing user events included with radius filtering (backend fix working!)');
          } else {
            console.log('   ❌ No existing user events found with radius filtering');
            console.log('   🔍 This suggests the backend fix is not working correctly');
          }
        }
      } else {
        console.log('   ❌ No events found for existing user ID');
      }
    }
    
    // Step 4: Test the SQL query logic directly
    console.log('\n4️⃣ Testing SQL query logic...');
    console.log('🔍 The issue might be in the SQL query logic.');
    console.log('🔍 Current user ID from JWT:', registeredUserId);
    console.log('🔍 Existing user ID with events:', CURRENT_USER_ID);
    console.log('🔍 The SQL should include events where created_by = current_user_id OR distance <= radius');
    
    console.log('\n🎯 Summary:');
    console.log('- Authentication middleware is working');
    console.log('- The issue is likely in the SQL query logic');
    console.log('- Need to verify that req.user.id is being passed correctly to the query');
    console.log('- The SQL query should include: created_by = $1 OR (distance calculation) <= $2');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuthDebug();
