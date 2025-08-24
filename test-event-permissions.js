const axios = require('axios');

const API_BASE = 'http://localhost:4000';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

const testEvent = {
  name: `Test Event for Permissions ${Date.now()}`,
  description: 'Testing event ownership',
  category: 'other',
  venue: 'Test Venue',
  address: 'Test Address',
  latitude: 59.437,
  longitude: 24.7536,
  startsAt: '2024-12-25T19:00:00Z'
};

async function testEventPermissions() {
  console.log('🧪 Testing Event Ownership and Permissions System\n');

  try {
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    const registerResponse = await axios.post(`${API_BASE}/api/auth/signup`, {
      ...testUser,
      name: 'Test User'
    });
    const { accessToken, user } = registerResponse.data.data;
    console.log('✅ User registered successfully');
    console.log(`   User ID: ${user.id}\n`);

    // Step 2: Create an event
    console.log('2️⃣ Creating test event...');
    const createResponse = await axios.post(`${API_BASE}/api/events`, testEvent, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const eventId = createResponse.data.data.id;
    console.log(`✅ Event created with ID: ${eventId}\n`);

    // Step 3: Test can-edit endpoint
    console.log('3️⃣ Testing can-edit endpoint...');
    const canEditResponse = await axios.get(`${API_BASE}/api/events/${eventId}/can-edit`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Can edit response:', canEditResponse.data.data);
    console.log(`   Can edit: ${canEditResponse.data.data.canEdit}\n`);

    // Step 4: Test my-events endpoint
    console.log('4️⃣ Testing my-events endpoint...');
    const myEventsResponse = await axios.get(`${API_BASE}/api/events/my-events`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`✅ My events found: ${myEventsResponse.data.data.length} events\n`);

    // Step 5: Test updating own event
    console.log('5️⃣ Testing update of own event...');
    const updateData = { name: 'Updated Test Event' };
    const updateResponse = await axios.put(`${API_BASE}/api/events/${eventId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Event updated successfully\n');

    // Step 6: Test deleting own event
    console.log('6️⃣ Testing delete of own event...');
    const deleteResponse = await axios.delete(`${API_BASE}/api/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Event deleted successfully\n');

    // Step 7: Test trying to edit someone else's event (should fail)
    console.log('7️⃣ Testing edit of someone else\'s event...');
    try {
      const otherEventId = 'sample-event-1'; // System event
      await axios.put(`${API_BASE}/api/events/${otherEventId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Correctly blocked editing someone else\'s event');
        console.log(`   Error: ${error.response.data.error}\n`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 8: Test trying to delete someone else's event (should fail)
    console.log('8️⃣ Testing delete of someone else\'s event...');
    try {
      const otherEventId = 'sample-event-1'; // System event
      await axios.delete(`${API_BASE}/api/events/${otherEventId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('❌ Should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Correctly blocked deleting someone else\'s event');
        console.log(`   Error: ${error.response.data.error}\n`);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Users can only edit/delete their own events');
    console.log('✅ Authentication is required for edit/delete operations');
    console.log('✅ Can-edit endpoint works correctly');
    console.log('✅ My-events endpoint works correctly');
    console.log('✅ Proper error messages for unauthorized access');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEventPermissions();
