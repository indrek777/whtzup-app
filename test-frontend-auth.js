const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function testFrontendAuth() {
  console.log('🔍 Testing Frontend Authentication State\n');

  try {
    // Check stored authentication data
    console.log('1. Checking stored authentication data...');
    
    const userData = await AsyncStorage.getItem('user');
    const authToken = await AsyncStorage.getItem('authToken');
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    
    console.log('📱 Stored user data:', userData ? 'Present' : 'Missing');
    console.log('🔑 Stored auth token:', authToken ? 'Present' : 'Missing');
    console.log('🔄 Stored refresh token:', refreshToken ? 'Present' : 'Missing');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('👤 User info:', {
          name: user.name,
          email: user.email,
          userGroup: user.userGroup,
          subscription: user.subscription?.status || 'none'
        });
      } catch (e) {
        console.log('❌ Error parsing user data:', e.message);
      }
    }
    
    if (authToken) {
      console.log('🔑 Auth token length:', authToken.length);
      console.log('🔑 Auth token preview:', authToken.substring(0, 50) + '...');
      
      // Try to decode the JWT to check expiration
      try {
        const base64Url = authToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log('🕐 Token expiration info:', {
          issuedAt: new Date(payload.iat * 1000),
          expiresAt: new Date(payload.exp * 1000),
          currentTime: new Date(currentTime * 1000),
          isExpired: payload.exp < currentTime,
          secondsUntilExpiry: payload.exp - currentTime
        });
      } catch (e) {
        console.log('❌ Error decoding JWT:', e.message);
      }
    }
    
    // Test 2: Check if we can make an authenticated request
    console.log('\n2. Testing authenticated API request...');
    
    if (authToken) {
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      
      const response = await fetch('https://olympio.ee/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Profile request status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile request successful');
        console.log('   User:', data.data?.name);
        console.log('   Email:', data.data?.email);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Profile request failed:', errorData);
      }
    } else {
      console.log('❌ No auth token available for testing');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n🏁 Frontend authentication test completed!');
}

// Run the test
testFrontendAuth();
