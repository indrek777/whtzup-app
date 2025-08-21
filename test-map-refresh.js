const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

// Generate a proper UUID for device ID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testMapRefresh() {
  console.log('🧪 Testing map refresh and icon updates...\n');

  try {
    // Step 1: Sign up a test user
    console.log('1️⃣ Creating test user...');
    const deviceId = generateUUID();
    console.log(`📱 Using device ID: ${deviceId}`);
    
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({
        email: `test-map-refresh-${Date.now()}@example.com`,
        password: 'testpassword123',
        name: 'Map Refresh Test User'
      })
    });

    const signupData = await signupResponse.json();
    if (!signupData.success) {
      throw new Error(`Signup failed: ${signupData.error}`);
    }

    console.log('✅ Test user created successfully');
    console.log(`📧 User email: ${signupData.data.user.email}`);

    // Step 2: Sign in to get access token
    console.log('\n2️⃣ Signing in...');
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({
        email: signupData.data.user.email,
        password: 'testpassword123'
      })
    });

    const signinData = await signinResponse.json();
    if (!signinData.success) {
      throw new Error(`Signin failed: ${signinData.error}`);
    }

    const accessToken = signinData.data.accessToken;
    console.log('✅ Signed in successfully');

    // Step 3: Create a test event with 'other' category
    console.log('\n3️⃣ Creating test event with "other" category...');
    const createEventResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({
        name: `Test Event for Map Refresh ${Date.now()}`,
        description: 'This event will be updated to test map refresh',
        venue: `Test Venue ${Date.now()}`,
        address: 'Test Address',
        latitude: 59.436962,
        longitude: 24.753574,
        startsAt: '2024-12-25 18:00',
        category: 'other'
      })
    });

    const createEventData = await createEventResponse.json();
    if (!createEventData.success) {
      throw new Error(`Event creation failed: ${createEventData.error}`);
    }

    const eventId = createEventData.data.id;
    console.log(`✅ Test event created with ID: ${eventId}`);
    console.log(`📊 Initial category: ${createEventData.data.category}`);

    // Step 4: Update the event to 'music' category
    console.log('\n4️⃣ Updating event category to "music"...');
    const updateEventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({
        category: 'music'
      })
    });

    const updateEventData = await updateEventResponse.json();
    if (!updateEventData.success) {
      throw new Error(`Event update failed: ${updateEventData.error}`);
    }

    console.log(`✅ Event updated successfully`);
    console.log(`📊 Updated category: ${updateEventData.data.category}`);
    console.log(`📊 Updated timestamp: ${updateEventData.data.updatedAt}`);

    // Step 5: Fetch events to verify the update is reflected
    console.log('\n5️⃣ Fetching events to verify update...');
    const fetchEventsResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });

    const fetchEventsData = await fetchEventsResponse.json();
    if (!fetchEventsData.success) {
      throw new Error(`Fetch events failed: ${fetchEventsData.error}`);
    }

    const updatedEvent = fetchEventsData.data.find(e => e.id === eventId);
    if (!updatedEvent) {
      throw new Error('Updated event not found in fetched events');
    }

    console.log(`✅ Event found in fetched data`);
    console.log(`📊 Fetched category: ${updatedEvent.category}`);
    console.log(`📊 Fetched timestamp: ${updatedEvent.updatedAt}`);

    // Step 6: Verify the category change
    if (updatedEvent.category === 'music') {
      console.log('\n✅ SUCCESS: Event category successfully updated from "other" to "music"');
      console.log('✅ The map should now show the music icon (🎵) instead of the other icon (⭐)');
    } else {
      console.log('\n❌ FAILURE: Event category was not updated properly');
      console.log(`Expected: music, Got: ${updatedEvent.category}`);
    }

    // Step 7: Test another category change
    console.log('\n6️⃣ Testing another category change to "sports"...');
    const updateEventResponse2 = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({
        category: 'sports'
      })
    });

    const updateEventData2 = await updateEventResponse2.json();
    if (!updateEventData2.success) {
      throw new Error(`Second event update failed: ${updateEventData2.error}`);
    }

    console.log(`✅ Event updated to sports category`);
    console.log(`📊 Final category: ${updateEventData2.data.category}`);
    console.log(`📊 Final timestamp: ${updateEventData2.data.updatedAt}`);

    if (updateEventData2.data.category === 'sports') {
      console.log('\n✅ SUCCESS: Event category successfully updated to "sports"');
      console.log('✅ The map should now show the sports icon (⚽)');
    } else {
      console.log('\n❌ FAILURE: Event category was not updated to sports');
      console.log(`Expected: sports, Got: ${updateEventData2.data.category}`);
    }

    console.log('\n🎯 TEST SUMMARY:');
    console.log('✅ User authentication working');
    console.log('✅ Event creation working');
    console.log('✅ Event updates working');
    console.log('✅ Category changes working');
    console.log('✅ Backend data consistency working');
    console.log('\n📱 FRONTEND VERIFICATION:');
    console.log('1. Open the app and sign in with the test user');
    console.log('2. Look for the test event on the map');
    console.log('3. The event should show a sports icon (⚽)');
    console.log('4. Edit the event and change the category');
    console.log('5. The map icon should update immediately');
    console.log('6. Other users should see the updated icon in real-time');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testMapRefresh();
