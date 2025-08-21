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

async function debugEventOwnership() {
  console.log('🔍 Debugging event ownership...\n');

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
        email: `debug-ownership-${Date.now()}@example.com`,
        password: 'testpassword123',
        name: 'Debug Ownership Test User'
      })
    });

    const signupData = await signupResponse.json();
    if (!signupData.success) {
      throw new Error(`Signup failed: ${signupData.error}`);
    }

    console.log('✅ Test user created successfully');
    console.log(`📧 User email: ${signupData.data.user.email}`);
    console.log(`🆔 User ID: ${signupData.data.user.id}`);

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

    // Step 3: Create a test event
    console.log('\n3️⃣ Creating test event...');
    const createEventResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({
        name: `Debug Ownership Test Event ${Date.now()}`,
        description: 'This event will be checked for ownership',
        venue: `Debug Venue ${Date.now()}`,
        address: 'Debug Address',
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
    console.log(`📊 Event createdBy: ${createEventData.data.createdBy}`);
    console.log(`📊 User ID: ${signupData.data.user.id}`);
    console.log(`📊 Match: ${createEventData.data.createdBy === signupData.data.user.id}`);

    // Step 4: Get the event details directly from database
    console.log('\n4️⃣ Getting event details...');
    const getEventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Device-ID': deviceId
      }
    });

    const getEventData = await getEventResponse.json();
    if (!getEventData.success) {
      throw new Error(`Get event failed: ${getEventData.error}`);
    }

    console.log(`✅ Event details retrieved`);
    console.log(`📊 Event createdBy: ${getEventData.data.createdBy}`);
    console.log(`📊 User ID: ${signupData.data.user.id}`);
    console.log(`📊 Match: ${getEventData.data.createdBy === signupData.data.user.id}`);

    // Step 5: Try to update the event
    console.log('\n5️⃣ Attempting to update event...');
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
    console.log(`📡 Update response status: ${updateEventResponse.status}`);
    console.log(`📊 Update response:`, updateEventData);

    if (updateEventData.success) {
      console.log('✅ Event updated successfully!');
    } else {
      console.log('❌ Event update failed');
      console.log(`📊 Error: ${updateEventData.error}`);
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugEventOwnership();
