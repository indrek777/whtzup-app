const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

async function testBackend() {
  console.log('🧪 Testing backend connectivity...');
  
  try {
    // Test 1: Check if backend is responding
    console.log('\n1️⃣ Testing backend connectivity...');
    const healthResponse = await fetch(`${API_BASE_URL}/events`);
    console.log(`📡 Health check status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const eventsData = await healthResponse.json();
      console.log(`✅ Backend is working! Found ${eventsData.data?.length || 0} events`);
      
      if (eventsData.data && eventsData.data.length > 0) {
        const firstEvent = eventsData.data[0];
        console.log(`📝 First event: ${firstEvent.name} (${firstEvent.category})`);
        console.log(`🆔 Event ID: ${firstEvent.id}`);
        
        // Test 2: Try to get a specific event
        console.log('\n2️⃣ Testing single event retrieval...');
        const singleEventResponse = await fetch(`${API_BASE_URL}/events/${firstEvent.id}`);
        console.log(`📡 Single event status: ${singleEventResponse.status}`);
        
        if (singleEventResponse.ok) {
          const singleEventData = await singleEventResponse.json();
          console.log(`✅ Single event retrieved: ${singleEventData.data.name} (${singleEventData.data.category})`);
          
          // Test 3: Try to update the event (this will fail due to auth, but we can see the response)
          console.log('\n3️⃣ Testing event update (will fail due to auth)...');
          const updateData = {
            category: 'test-category-' + Date.now()
          };

          const updateResponse = await fetch(`${API_BASE_URL}/events/${firstEvent.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Device-ID': 'test-device-' + Date.now(),
              'Authorization': 'Bearer invalid-token'
            },
            body: JSON.stringify(updateData)
          });

          console.log(`📡 Update response status: ${updateResponse.status}`);
          
          if (updateResponse.status === 401) {
            console.log('✅ Expected 401 (unauthorized) - backend is working correctly');
          } else if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log(`✅ Event updated successfully! New category: ${result.data.category}`);
          } else {
            const errorText = await updateResponse.text();
            console.log(`❌ Update failed: ${errorText}`);
          }
        } else {
          console.log(`❌ Single event retrieval failed: ${singleEventResponse.status}`);
        }
      } else {
        console.log('⚠️ No events found in database');
      }
    } else {
      console.log(`❌ Backend health check failed: ${healthResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testBackend();
