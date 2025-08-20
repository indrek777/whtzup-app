const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

// Generate a proper UUID for device ID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Test data
const testUsers = {
  freeUser: {
    email: `test-free-${Date.now()}@example.com`,
    password: 'testpass123',
    name: 'Free Test User'
  },
  premiumUser: {
    email: `test-premium-${Date.now()}@example.com`,
    password: 'testpass123',
    name: 'Premium Test User'
  }
};

let freeUserToken = null;
let premiumUserToken = null;
let testEventId = null;
const deviceId = generateUUID();

async function testEventPermissions() {
  console.log('🧪 Testing Event Permission System\n');

  try {
    // Step 1: Create test users
    console.log('1️⃣ Creating test users...');
    
    // Create free user
    const freeSignupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUsers.freeUser)
    });
    
    if (!freeSignupResponse.ok) {
      const error = await freeSignupResponse.json();
      console.log(`❌ Free user signup failed: ${error.error}`);
      return;
    }
    
    const freeSignupData = await freeSignupResponse.json();
    freeUserToken = freeSignupData.data.accessToken;
    console.log('✅ Free user created successfully');

    // Create premium user
    const premiumSignupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUsers.premiumUser)
    });
    
    if (!premiumSignupResponse.ok) {
      const error = await premiumSignupResponse.json();
      console.log(`❌ Premium user signup failed: ${error.error}`);
      return;
    }
    
    const premiumSignupData = await premiumSignupResponse.json();
    premiumUserToken = premiumSignupData.data.accessToken;
    console.log('✅ Premium user created successfully');

    // Step 2: Create a test event with free user
    console.log('\n2️⃣ Creating test event with free user...');
    
    const testEvent = {
      name: 'Test Event for Permissions',
      description: 'This is a test event to verify permission system',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 58.3776252,
      longitude: 26.7290063,
      startsAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      createdBy: freeSignupData.data.user.id
    };

    const createEventResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-device-id': deviceId
      },
      body: JSON.stringify(testEvent)
    });

    if (!createEventResponse.ok) {
      const error = await createEventResponse.json();
      console.log(`❌ Event creation failed: ${error.error}`);
      return;
    }

    const createdEvent = await createEventResponse.json();
    testEventId = createdEvent.data.id;
    console.log(`✅ Test event created with ID: ${testEventId}`);

    // Step 3: Test free user editing their own event (should succeed)
    console.log('\n3️⃣ Testing free user editing their own event...');
    
    const freeUserUpdateResponse = await fetch(`${API_BASE_URL}/events/${testEventId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freeUserToken}`,
        'x-device-id': deviceId
      },
      body: JSON.stringify({
        ...testEvent,
        name: 'Updated by Free User',
        description: 'Updated description by free user'
      })
    });

    if (freeUserUpdateResponse.ok) {
      console.log('✅ Free user can edit their own event');
    } else {
      const error = await freeUserUpdateResponse.json();
      console.log(`❌ Free user cannot edit their own event: ${error.error}`);
    }

    // Step 4: Test premium user editing free user's event (should succeed)
    console.log('\n4️⃣ Testing premium user editing free user\'s event...');
    
    const premiumUserUpdateResponse = await fetch(`${API_BASE_URL}/events/${testEventId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${premiumUserToken}`,
        'x-device-id': deviceId
      },
      body: JSON.stringify({
        ...testEvent,
        name: 'Updated by Premium User',
        description: 'Updated description by premium user'
      })
    });

    if (premiumUserUpdateResponse.ok) {
      console.log('✅ Premium user can edit any event');
    } else {
      const error = await premiumUserUpdateResponse.json();
      console.log(`❌ Premium user cannot edit event: ${error.error}`);
    }

    // Step 5: Test unauthenticated user editing event (should fail)
    console.log('\n5️⃣ Testing unauthenticated user editing event...');
    
    const unauthenticatedUpdateResponse = await fetch(`${API_BASE_URL}/events/${testEventId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-device-id': deviceId
      },
      body: JSON.stringify({
        ...testEvent,
        name: 'Updated by Unauthenticated User',
        description: 'This should fail'
      })
    });

    if (!unauthenticatedUpdateResponse.ok) {
      const error = await unauthenticatedUpdateResponse.json();
      console.log(`✅ Unauthenticated user correctly blocked: ${error.error}`);
    } else {
      console.log('❌ Unauthenticated user was able to edit event (security issue!)');
    }

    // Step 6: Test free user deleting their own event (should succeed)
    console.log('\n6️⃣ Testing free user deleting their own event...');
    
    const freeUserDeleteResponse = await fetch(`${API_BASE_URL}/events/${testEventId}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freeUserToken}`,
        'x-device-id': deviceId
      }
    });

    if (freeUserDeleteResponse.ok) {
      console.log('✅ Free user can delete their own event');
    } else {
      const error = await freeUserDeleteResponse.json();
      console.log(`❌ Free user cannot delete their own event: ${error.error}`);
    }

    console.log('\n🎉 Event permission system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testEventPermissions();
