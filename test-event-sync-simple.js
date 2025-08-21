const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

async function testEventSync() {
  console.log('🧪 Testing event synchronization...');
  
  try {
    // Step 1: Get all events to see current state
    console.log('\n1️⃣ Getting current events...');
    const getResponse = await fetch(`${API_BASE_URL}/events`);
    if (getResponse.ok) {
      const eventsData = await getResponse.json();
      console.log(`✅ Found ${eventsData.data?.length || 0} events`);
      
      if (eventsData.data && eventsData.data.length > 0) {
        const firstEvent = eventsData.data[0];
        console.log(`📝 First event: ${firstEvent.name} (${firstEvent.category})`);
        
        // Step 2: Update the first event's category
        console.log('\n2️⃣ Updating event category...');
        const updateData = {
          category: 'music' // Change to music category
        };

        const updateResponse = await fetch(`${API_BASE_URL}/events/${firstEvent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-ID': 'test-device-' + Date.now(),
            'Authorization': 'Bearer test-token' // This will fail auth, but we can see if the event is found
          },
          body: JSON.stringify(updateData)
        });

        console.log(`📡 Update response status: ${updateResponse.status}`);
        
        if (updateResponse.ok) {
          const result = await updateResponse.json();
          console.log(`✅ Event updated successfully!`);
          console.log(`🔄 New category: ${result.data.category}`);
          console.log(`📝 Event name: ${result.data.name}`);
          
          // Step 3: Verify the update by getting the event again
          console.log('\n3️⃣ Verifying update...');
          const verifyResponse = await fetch(`${API_BASE_URL}/events/${firstEvent.id}`);
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log(`✅ Verification successful!`);
            console.log(`📝 Event name: ${verifyData.data.name}`);
            console.log(`🎯 Category: ${verifyData.data.category}`);
            
            if (verifyData.data.category === 'music') {
              console.log('🎉 Event synchronization test PASSED!');
            } else {
              console.log('❌ Event synchronization test FAILED - category not updated');
            }
          } else {
            console.log(`❌ Verification failed: ${verifyResponse.status}`);
          }
        } else {
          const errorText = await updateResponse.text();
          console.log(`❌ Update failed: ${errorText}`);
        }
      } else {
        console.log('❌ No events found to test with');
      }
    } else {
      console.log(`❌ Failed to get events: ${getResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testEventSync();
