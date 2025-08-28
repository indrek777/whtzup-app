const AsyncStorage = require('@react-native-async-storage/async-storage');

// Demo user credentials
const DEMO_USER = {
  email: 'demo@eventdiscovery.app',
  password: 'demo123' // Assuming this is the password
};

async function loginDemoUser() {
  try {
    console.log('🔐 Logging in demo user...');
    
    const response = await fetch('https://165.22.90.180:4001/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(DEMO_USER)
    });

    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('✅ Demo user login successful');
      
      // Save tokens to AsyncStorage
      await AsyncStorage.setItem('auth_token', result.data.accessToken);
      await AsyncStorage.setItem('refresh_token', result.data.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(result.data.user));
      
      console.log('💾 Tokens saved to AsyncStorage');
      console.log('👤 User:', result.data.user.name);
      console.log('📧 Email:', result.data.user.email);
      
      return true;
    } else {
      console.log('❌ Demo user login failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return false;
  }
}

// Run the login
loginDemoUser().then(success => {
  if (success) {
    console.log('🎉 Demo user login completed successfully!');
  } else {
    console.log('💥 Demo user login failed!');
  }
});
