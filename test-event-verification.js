const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'https://olympio.ee/api';

async function verifyEvent() {
  console.log('🔍 Verifying Event in Backend Database\n');

  try {
    // Test 1: Get all events to see if our event is there
    console.log('1. Fetching all events from backend...');
    const eventsResponse = await fetch(`${API_BASE_URL}/events`);
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      console.log('✅ Events fetched successfully');
      console.log(`📊 Total events in database: ${eventsData.data?.length || 0}`);
      
      // Look for our specific event
      const ourEvent = eventsData.data?.find(event => 
        event.name === 'test' && 
        event.venue === 'Unknown location' &&
        event.created_by === 'bdfee28f-d26b-469c-b705-8267389071b0'
      );
      
      if (ourEvent) {
        console.log('🎉 OUR EVENT FOUND IN DATABASE!');
        console.log('   Event ID:', ourEvent.id);
        console.log('   Name:', ourEvent.name);
        console.log('   Venue:', ourEvent.venue);
        console.log('   Created:', ourEvent.created_at);
        console.log('   Location:', `${ourEvent.latitude}, ${ourEvent.longitude}`);
        console.log('   Category:', ourEvent.category);
      } else {
        console.log('❌ Our event not found in general events list');
        
        // Test 2: Try to get the specific event by ID
        console.log('\n2. Trying to fetch specific event by ID...');
        const specificEventId = '0f2483c3-2260-4e79-a828-2db072a374f5';
        const specificResponse = await fetch(`${API_BASE_URL}/events/${specificEventId}`);
        
        if (specificResponse.ok) {
          const specificData = await specificResponse.json();
          console.log('✅ Specific event found by ID!');
          console.log('   Event:', JSON.stringify(specificData.data, null, 2));
        } else {
          console.log('❌ Specific event not found by ID');
          console.log('   Status:', specificResponse.status);
        }
      }
    } else {
      console.log('❌ Failed to fetch events:', eventsResponse.status);
    }

    // Test 3: Check events near the location where we created it
    console.log('\n3. Checking events near creation location...');
    const locationResponse = await fetch(
      `${API_BASE_URL}/events?latitude=37.71502639&longitude=-122.42714671&radius=10`
    );
    
    if (locationResponse.ok) {
      const locationData = await locationResponse.json();
      console.log(`📍 Events near creation location: ${locationData.data?.length || 0}`);
      
      if (locationData.data?.length > 0) {
        console.log('📍 Events in area:');
        locationData.data.forEach(event => {
          console.log(`   - ${event.name} at ${event.venue} (${event.latitude}, ${event.longitude})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Event verification completed!');
}

// Run the test
verifyEvent();
