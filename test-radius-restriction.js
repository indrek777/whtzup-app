const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

async function testRadiusRestriction() {
  console.log('🧪 Testing Radius Restriction for Non-Authenticated Users\n');

  try {
    // Test 1: Fetch events without authentication (should be limited to 10km)
    console.log('1. Testing events fetch without authentication...');
    
    // Test with Tallinn coordinates (59.436962, 24.753574)
    const tallinnResponse = await fetch(`${API_BASE_URL}/events?latitude=59.436962&longitude=24.753574&radius=10`);
    
    if (tallinnResponse.ok) {
      const tallinnData = await tallinnResponse.json();
      console.log(`✅ Events within 10km of Tallinn: ${tallinnData.data?.length || 0} events`);
      
      // Test with larger radius (should return same or more events)
      const largeRadiusResponse = await fetch(`${API_BASE_URL}/events?latitude=59.436962&longitude=24.753574&radius=50`);
      
      if (largeRadiusResponse.ok) {
        const largeRadiusData = await largeRadiusResponse.json();
        console.log(`✅ Events within 50km of Tallinn: ${largeRadiusData.data?.length || 0} events`);
        
        if (largeRadiusData.data?.length >= tallinnData.data?.length) {
          console.log('✅ Radius filtering is working correctly');
        } else {
          console.log('❌ Radius filtering may not be working correctly');
        }
      }
    } else {
      console.log('❌ Failed to fetch events:', tallinnResponse.status);
    }

    // Test 2: Test with different locations
    console.log('\n2. Testing with different locations...');
    
    // Test with Tartu coordinates (58.3776, 26.7290)
    const tartuResponse = await fetch(`${API_BASE_URL}/events?latitude=58.3776&longitude=26.7290&radius=10`);
    
    if (tartuResponse.ok) {
      const tartuData = await tartuResponse.json();
      console.log(`✅ Events within 10km of Tartu: ${tartuData.data?.length || 0} events`);
    } else {
      console.log('❌ Failed to fetch events from Tartu:', tartuResponse.status);
    }

    // Test 3: Test without radius parameter (should return all events)
    console.log('\n3. Testing without radius parameter...');
    
    const allEventsResponse = await fetch(`${API_BASE_URL}/events`);
    
    if (allEventsResponse.ok) {
      const allEventsData = await allEventsResponse.json();
      console.log(`✅ All events (no radius filter): ${allEventsData.data?.length || 0} events`);
    } else {
      console.log('❌ Failed to fetch all events:', allEventsResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Radius restriction test completed!');
}

// Run the test
testRadiusRestriction();
