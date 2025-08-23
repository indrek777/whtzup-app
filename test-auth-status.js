const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'https://olympio.ee/api';

async function testAuthStatus() {
  console.log('🔍 Testing Authentication Status\n');

  try {
    // Test 1: Check if we can access the auth endpoint
    console.log('1. Testing auth endpoint accessibility...');
    const authResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Auth endpoint response status:', authResponse.status);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Auth endpoint accessible');
      console.log('   Response:', JSON.stringify(authData, null, 2));
    } else {
      const errorData = await authResponse.json().catch(() => ({}));
      console.log('❌ Auth endpoint error:', errorData);
    }

    // Test 2: Try to create a test user
    console.log('\n2. Testing user creation...');
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        name: 'Test User'
      }),
    });

    console.log('📡 Signup response status:', signupResponse.status);
    
    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      console.log('✅ User created successfully');
      console.log('   Access Token:', signupData.data?.accessToken ? 'Present' : 'Missing');
      console.log('   Refresh Token:', signupData.data?.refreshToken ? 'Present' : 'Missing');
      
      const accessToken = signupData.data?.accessToken;
      
      if (accessToken) {
        // Test 3: Try to create an event with the token
        console.log('\n3. Testing event creation with token...');
        const eventResponse = await fetch(`${API_BASE_URL}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Event',
            description: 'Test event for authentication',
            category: 'other',
            venue: 'Test Venue',
            address: 'Test Address',
            latitude: 59.436962,
            longitude: 24.753574,
            startsAt: '2025-08-25T10:00:00.000Z'
          }),
        });

        console.log('📡 Event creation response status:', eventResponse.status);
        
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          console.log('✅ Event created successfully');
          console.log('   Event ID:', eventData.data?.id);
        } else {
          const errorData = await eventResponse.json().catch(() => ({}));
          console.log('❌ Event creation failed:', errorData);
        }
      }
      
    } else {
      const errorData = await signupResponse.json().catch(() => ({}));
      console.log('❌ User creation failed:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Authentication status test completed!');
}

// Run the test
testAuthStatus();
