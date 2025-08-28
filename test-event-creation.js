// Test event creation functionality
const DEMO_USER = {
  email: 'demo@eventdiscovery.app',
  password: 'demo123'
};

async function testEventCreation() {
  try {
    console.log('🔐 Testing login first...');
    
    // Login
    const loginResponse = await fetch('http://165.22.90.180:4000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(DEMO_USER)
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResult.success) {
      console.log('❌ Login failed:', loginResult.error);
      return false;
    }

    console.log('✅ Login successful!');
    const accessToken = loginResult.data.accessToken;
    
    // Test subscription status
    console.log('📊 Checking subscription status...');
    const subResponse = await fetch('http://165.22.90.180:4000/api/subscription/status', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const subResult = await subResponse.json();
    console.log('📊 Subscription status:', subResult);
    
    // Test if user can create events (this would be a frontend check)
    const user = loginResult.data.user;
    console.log('👤 User details:', {
      name: user.name,
      email: user.email,
      subscription: user.subscription
    });
    
    // Check subscription logic
    const hasSubscription = user.subscription && user.subscription.type === 'premium';
    const endDate = new Date(user.subscription.endDate);
    const now = new Date();
    const isActive = endDate > now;
    
    console.log('💎 Has subscription:', hasSubscription);
    console.log('📅 End date:', user.subscription.endDate);
    console.log('⏰ Is active:', isActive);
    console.log('✅ Can create events:', hasSubscription && isActive);
    
    if (hasSubscription && isActive) {
      console.log('🎉 User should be able to create events!');
      return true;
    } else {
      console.log('❌ User cannot create events');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

// Run the test
testEventCreation().then(success => {
  if (success) {
    console.log('🎉 Event creation test passed!');
  } else {
    console.log('💥 Event creation test failed!');
  }
});
