const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'https://olympio.ee/api';

async function testRatingSystem() {
  console.log('⭐ Testing Event Rating System\n');

  try {
    // Test 1: Get an event to rate
    console.log('1. Fetching an event to rate...');
    const eventsResponse = await fetch(`${API_BASE_URL}/events?limit=1`);
    
    if (!eventsResponse.ok) {
      console.log('❌ Failed to fetch events:', eventsResponse.status);
      return;
    }

    const eventsData = await eventsResponse.json();
    if (!eventsData.data || eventsData.data.length === 0) {
      console.log('❌ No events found to test with');
      return;
    }

    const testEvent = eventsData.data[0];
    console.log('✅ Found test event:', testEvent.name);
    console.log('   Event ID:', testEvent.id);

    // Test 2: Get current ratings for the event
    console.log('\n2. Getting current ratings for the event...');
    const ratingsResponse = await fetch(`${API_BASE_URL}/ratings/event/${testEvent.id}`);
    
    if (ratingsResponse.ok) {
      const ratingsData = await ratingsResponse.json();
      console.log('✅ Current ratings:');
      console.log('   Average Rating:', ratingsData.data.stats.averageRating);
      console.log('   Total Ratings:', ratingsData.data.stats.totalRatings);
      console.log('   Recent Ratings:', ratingsData.data.ratings.length);
    } else {
      console.log('❌ Failed to get ratings:', ratingsResponse.status);
    }

    // Test 3: Create a test user and get authentication token
    console.log('\n3. Creating test user for rating...');
    const timestamp = Date.now();
    const testEmail = `ratingtest${timestamp}@example.com`;
    
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        name: 'Rating Test User'
      }),
    });

    if (!signupResponse.ok) {
      console.log('❌ Failed to create test user:', signupResponse.status);
      return;
    }

    const signupData = await signupResponse.json();
    const accessToken = signupData.data.accessToken;
    console.log('✅ Test user created successfully');

    // Test 4: Rate the event
    console.log('\n4. Rating the event...');
    const ratingResponse = await fetch(`${API_BASE_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: testEvent.id,
        rating: 5,
        review: 'This is a test review from the rating system test!'
      }),
    });

    if (ratingResponse.ok) {
      const ratingData = await ratingResponse.json();
      console.log('✅ Rating submitted successfully!');
      console.log('   Rating ID:', ratingData.data.rating.id);
      console.log('   New Average:', ratingData.data.stats.averageRating);
      console.log('   New Total:', ratingData.data.stats.totalRatings);
    } else {
      const errorData = await ratingResponse.json().catch(() => ({}));
      console.log('❌ Failed to submit rating:', errorData);
    }

    // Test 5: Get updated ratings
    console.log('\n5. Getting updated ratings...');
    const updatedRatingsResponse = await fetch(`${API_BASE_URL}/ratings/event/${testEvent.id}`);
    
    if (updatedRatingsResponse.ok) {
      const updatedRatingsData = await updatedRatingsResponse.json();
      console.log('✅ Updated ratings:');
      console.log('   Average Rating:', updatedRatingsData.data.stats.averageRating);
      console.log('   Total Ratings:', updatedRatingsData.data.stats.totalRatings);
      console.log('   Rating Distribution:');
      console.log('     5 stars:', updatedRatingsData.data.stats.rating5Count);
      console.log('     4 stars:', updatedRatingsData.data.stats.rating4Count);
      console.log('     3 stars:', updatedRatingsData.data.stats.rating3Count);
      console.log('     2 stars:', updatedRatingsData.data.stats.rating2Count);
      console.log('     1 star:', updatedRatingsData.data.stats.rating1Count);
    }

    // Test 6: Get top rated events
    console.log('\n6. Getting top rated events...');
    const topRatedResponse = await fetch(`${API_BASE_URL}/ratings/top-rated?limit=5&minRatings=1`);
    
    if (topRatedResponse.ok) {
      const topRatedData = await topRatedResponse.json();
      console.log('✅ Top rated events:');
      topRatedData.data.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.name} - ${event.averageRating}⭐ (${event.totalRatings} ratings)`);
      });
    } else {
      console.log('❌ Failed to get top rated events:', topRatedResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Rating system test completed!');
}

// Run the test
testRatingSystem();
