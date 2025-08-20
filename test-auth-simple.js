const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000/api';

async function testAuth() {
  console.log('🧪 Testing WhtzUp Authentication System\n');

  // Generate unique email for this test run
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;

  try {
    // Test 1: Check if server is reachable
    console.log('1. Testing server connectivity...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      if (healthResponse.ok) {
        console.log('✅ Server is reachable');
      } else {
        console.log('❌ Server health check failed');
        return;
      }
    } catch (error) {
      console.log('❌ Server is not reachable:', error.message);
      return;
    }

    // Test 2: Sign up a new user
    console.log('\n2. Testing user signup...');
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

    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      console.log('✅ Signup successful:', signupData.message);
      
      const { accessToken, refreshToken } = signupData.data;
      
      // Test 3: Get user profile
      console.log('\n3. Testing get user profile...');
      const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('✅ Profile retrieved successfully');
        console.log('   User:', profileData.data.name);
        console.log('   Email:', profileData.data.email);
        console.log('   Subscription:', profileData.data.subscription.status);
      } else {
        console.log('❌ Failed to get profile:', profileResponse.status);
      }

      // Test 4: Sign in with existing user
      console.log('\n4. Testing user signin...');
      const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'password123'
        }),
      });

      if (signinResponse.ok) {
        const signinData = await signinResponse.json();
        console.log('✅ Signin successful:', signinData.message);
      } else {
        console.log('❌ Failed to signin:', signinResponse.status);
      }

      // Test 5: Sign out
      console.log('\n5. Testing user signout...');
      const signoutResponse = await fetch(`${API_BASE_URL}/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (signoutResponse.ok) {
        const signoutData = await signoutResponse.json();
        console.log('✅ Signout successful:', signoutData.message);
      } else {
        console.log('❌ Failed to signout:', signoutResponse.status);
      }

    } else {
      const errorData = await signupResponse.json();
      console.log('❌ Signup failed:', errorData.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Authentication test completed!');
}

// Run the test
testAuth();
