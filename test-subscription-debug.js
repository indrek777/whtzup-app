const API_BASE_URL = 'http://165.22.90.180:4000/api';
const AUTH_TOKEN = 'ints@me.com_access_token_1756455873582';

async function testSubscription() {
  console.log('🔍 Testing subscription system...\n');

  try {
    // Test 1: Get current subscription status
    console.log('1️⃣ Testing subscription status...');
    const statusResponse = await fetch(`${API_BASE_URL}/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const statusResult = await statusResponse.json();
    console.log('Status Response:', JSON.stringify(statusResult, null, 2));
    console.log('');

    // Test 2: Get subscription features
    console.log('2️⃣ Testing subscription features...');
    const featuresResponse = await fetch(`${API_BASE_URL}/subscription/features`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const featuresResult = await featuresResponse.json();
    console.log('Features Response:', JSON.stringify(featuresResult, null, 2));
    console.log('');

    // Test 3: Get subscription usage
    console.log('3️⃣ Testing subscription usage...');
    const usageResponse = await fetch(`${API_BASE_URL}/subscription/usage`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const usageResult = await usageResponse.json();
    console.log('Usage Response:', JSON.stringify(usageResult, null, 2));
    console.log('');

    // Test 4: Try to upgrade subscription
    console.log('4️⃣ Testing subscription upgrade...');
    const upgradeResponse = await fetch(`${API_BASE_URL}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        plan: 'monthly',
        autoRenew: true
      })
    });
    
    const upgradeResult = await upgradeResponse.json();
    console.log('Upgrade Response:', JSON.stringify(upgradeResult, null, 2));
    console.log('');

    // Test 5: Check status again after upgrade
    console.log('5️⃣ Testing subscription status after upgrade...');
    const statusAfterResponse = await fetch(`${API_BASE_URL}/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const statusAfterResult = await statusAfterResponse.json();
    console.log('Status After Upgrade:', JSON.stringify(statusAfterResult, null, 2));
    console.log('');

    // Test 6: Get billing history
    console.log('6️⃣ Testing billing history...');
    const billingResponse = await fetch(`${API_BASE_URL}/subscription/billing`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    const billingResult = await billingResponse.json();
    console.log('Billing Response:', JSON.stringify(billingResult, null, 2));
    console.log('');

  } catch (error) {
    console.error('❌ Error testing subscription:', error);
  }
}

testSubscription();
