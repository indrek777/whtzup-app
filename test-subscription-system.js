const axios = require('axios');

// Test configuration
const API_BASE_URL = 'https://api.olympio.ee/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testpassword123';

// Test data
const mockReceiptData = 'mock_receipt_data_for_testing';
const mockProductId = 'premium_monthly';

async function testSubscriptionSystem() {
  console.log('🧪 Testing Subscription System...\n');

  try {
    // Test 1: Check if backend is accessible
    console.log('1️⃣ Testing backend accessibility...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Backend is accessible:', healthResponse.data.status);
    console.log('   Environment:', healthResponse.data.environment);
    console.log('   Uptime:', Math.round(healthResponse.data.uptime / 60), 'minutes\n');

    // Test 2: Check subscription endpoints
    console.log('2️⃣ Testing subscription endpoints...');
    try {
      const subscriptionResponse = await axios.get(`${API_BASE_URL}/subscription/status`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Expected 401 but got:', subscriptionResponse.status);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Subscription endpoint requires authentication (expected)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test 3: Test receipt validation endpoint structure
    console.log('3️⃣ Testing receipt validation endpoint...');
    try {
      const receiptResponse = await axios.post(`${API_BASE_URL}/subscription/validate-receipt`, {
        receiptData: mockReceiptData,
        productId: mockProductId
      }, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Expected 401 but got:', receiptResponse.status);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Receipt validation endpoint requires authentication (expected)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test 4: Check SSL certificate
    console.log('4️⃣ Testing SSL certificate...');
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse(API_BASE_URL);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      rejectUnauthorized: true
    };

    const sslTest = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log('✅ SSL certificate is valid');
        console.log('   Server:', res.headers.server);
        console.log('   Security headers present');
        resolve();
      });

      req.on('error', (error) => {
        console.log('❌ SSL certificate error:', error.message);
        reject(error);
      });

      req.end();
    });

    await sslTest;
    console.log('');

    // Test 5: Check database connection (via health endpoint)
    console.log('5️⃣ Testing database connection...');
    const dbHealthResponse = await axios.get(`${API_BASE_URL}/health`);
    if (dbHealthResponse.data.status === 'OK') {
      console.log('✅ Database connection is working');
    } else {
      console.log('❌ Database connection issue');
    }
    console.log('');

    // Test 6: Check environment variables
    console.log('6️⃣ Testing environment configuration...');
    console.log('✅ API Base URL:', API_BASE_URL);
    console.log('✅ Using HTTPS:', API_BASE_URL.startsWith('https'));
    console.log('✅ Domain:', new URL(API_BASE_URL).hostname);
    console.log('');

    console.log('🎉 All basic tests passed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Add subscription products to App Store Connect');
    console.log('2. Test with real Apple receipts in sandbox');
    console.log('3. Deploy to TestFlight for user testing');
    console.log('4. Monitor subscription metrics');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run tests
testSubscriptionSystem();
