const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

async function testEventUpdate() {
  console.log('🧪 Testing backend event update functionality...\n');
  
  try {
    // Step 1: Sign up a test user
    console.log('1️⃣ Creating test user...');
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'test-device-123'
      },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'testpass123',
        name: 'Test User'
      })
    });
    
    const signupData = await signupResponse.json();
    console.log('Signup result:', signupData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!signupData.success) {
      console.error('Signup failed:', signupData.error);
      return;
    }
    
    console.log('Signup response:', signupData);
    
    // Step 2: Sign in to get access token
    console.log('\n2️⃣ Signing in...');
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'test-device-123'
      },
      body: JSON.stringify({
        email: signupData.data.email,
        password: 'testpass123'
      })
    });
    
    const signinData = await signinResponse.json();
    console.log('Signin result:', signinData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!signinData.success) {
      console.error('Signin failed:', signinData.error);
      return;
    }
    
    const accessToken = signinData.accessToken;
    console.log('Access token received:', accessToken ? '✅' : '❌');
    
    // Step 3: Create a test event
    console.log('\n3️⃣ Creating test event...');
    const createEventResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': 'test-device-123'
      },
      body: JSON.stringify({
        name: 'Test Event for Update',
        description: 'This is a test event for updating',
        venue: 'Test Venue',
        address: 'Test Address',
        latitude: 59.436962,
        longitude: 24.753574,
        startsAt: '2024-12-25T18:00:00Z',
        category: 'other'
      })
    });
    
    const createEventData = await createEventResponse.json();
    console.log('Event creation result:', createEventData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!createEventData.success) {
      console.error('Event creation failed:', createEventData.error);
      return;
    }
    
    const eventId = createEventData.data.id;
    console.log('Event created with ID:', eventId);
    
    // Step 4: Update the event
    console.log('\n4️⃣ Updating test event...');
    const updateEventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': 'test-device-123'
      },
      body: JSON.stringify({
        name: 'Updated Test Event',
        description: 'This event has been updated',
        category: 'music'
      })
    });
    
    const updateEventData = await updateEventResponse.json();
    console.log('Event update result:', updateEventData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (!updateEventData.success) {
      console.error('Event update failed:', updateEventData.error);
      return;
    }
    
    console.log('Updated event data:', {
      id: updateEventData.data.id,
      name: updateEventData.data.name,
      description: updateEventData.data.description,
      category: updateEventData.data.category,
      updatedAt: updateEventData.data.updatedAt
    });
    
    // Step 5: Verify the update by fetching the event
    console.log('\n5️⃣ Verifying update by fetching event...');
    const getEventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': 'test-device-123'
      }
    });
    
    const getEventData = await getEventResponse.json();
    console.log('Event fetch result:', getEventData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (getEventData.success) {
      console.log('Fetched event data:', {
        id: getEventData.data.id,
        name: getEventData.data.name,
        description: getEventData.data.description,
        category: getEventData.data.category,
        updatedAt: getEventData.data.updatedAt
      });
      
      // Verify the update was successful
      if (getEventData.data.name === 'Updated Test Event' && 
          getEventData.data.category === 'music') {
        console.log('✅ Event update verification: SUCCESS - Event was properly updated');
      } else {
        console.log('❌ Event update verification: FAILED - Event was not properly updated');
      }
    }
    
    // Step 6: Clean up - Delete the test event
    console.log('\n6️⃣ Cleaning up - Deleting test event...');
    const deleteEventResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': 'test-device-123'
      }
    });
    
    const deleteEventData = await deleteEventResponse.json();
    console.log('Event deletion result:', deleteEventData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    console.log('\n🎉 Backend event update test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testEventUpdate();
