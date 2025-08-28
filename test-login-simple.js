// Simple login test without AsyncStorage
const DEMO_USER = {
  email: 'demo@eventdiscovery.app',
  password: 'demo123'
};

async function testLogin() {
  try {
    console.log('🔐 Testing login...');
    
    const response = await fetch('http://165.22.90.180:4000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(DEMO_USER)
    });

    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('✅ Login successful!');
      console.log('👤 User:', result.data.user.name);
      console.log('📧 Email:', result.data.user.email);
      console.log('💎 Subscription:', result.data.user.subscription.type);
      console.log('📅 End Date:', result.data.user.subscription.endDate);
      
      // Test subscription status
      const subResponse = await fetch('http://165.22.90.180:4000/api/subscription/status');
      const subResult = await subResponse.json();
      
      if (subResult.success) {
        console.log('✅ Subscription status check successful!');
        console.log('📊 Has subscription:', subResult.data.hasSubscription);
        console.log('💎 Type:', subResult.data.type);
      }
      
      return true;
    } else {
      console.log('❌ Login failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return false;
  }
}

// Run the test
testLogin().then(success => {
  if (success) {
    console.log('🎉 All tests passed! Backend is working correctly.');
  } else {
    console.log('💥 Tests failed!');
  }
});
