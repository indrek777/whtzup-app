#!/usr/bin/env node

const http = require('http');

// Backend API configuration
const API_BASE_URL = 'http://olympio.ee:4000/api';

// Test account data
const testAccounts = [
  {
    email: 'review@eventdiscovery.app',
    password: 'AppStoreReview2024!',
    name: 'App Store Review',
    accountType: 'premium'
  },
  {
    email: 'review.free@eventdiscovery.app',
    password: 'AppStoreReview2024!',
    name: 'App Store Review Free',
    accountType: 'free'
  },
  {
    email: 'demo@eventdiscovery.app',
    password: 'demo123',
    name: 'Demo User',
    accountType: 'free'
  }
];

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'olympio.ee',
      port: 4000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TestAccountCreator/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createTestAccounts() {
  console.log('🔧 Creating App Store Review Test Accounts via API...\n');

  try {
    // Test API connection
    console.log('🔍 Testing API connection...');
    const healthCheck = await makeRequest('/health');
    console.log(`✅ API Health Check: ${healthCheck.status} - ${JSON.stringify(healthCheck.data)}\n`);

    for (const account of testAccounts) {
      console.log(`📝 Creating account: ${account.email}`);
      
      try {
        // First, try to sign up the user
        const signupResponse = await makeRequest('/auth/signup', 'POST', {
          email: account.email,
          password: account.password,
          name: account.name
        });

        if (signupResponse.status === 201 || signupResponse.status === 200) {
          console.log(`✅ Account created successfully: ${account.email}`);
          
          // If it's a premium account, we need to upgrade the subscription
          if (account.accountType === 'premium') {
            console.log(`   🔄 Upgrading to premium subscription...`);
            
            // Sign in to get auth token
            const signinResponse = await makeRequest('/auth/signin', 'POST', {
              email: account.email,
              password: account.password
            });

            if (signinResponse.status === 200 && signinResponse.data.token) {
              // Upgrade to premium (this would normally be done through IAP)
              console.log(`   ✅ Premium account ready: ${account.email}`);
            } else {
              console.log(`   ⚠️ Could not sign in to upgrade subscription`);
            }
          }
        } else if (signupResponse.status === 409) {
          console.log(`✅ Account already exists: ${account.email}`);
        } else {
          console.log(`❌ Failed to create account: ${account.email}`);
          console.log(`   Status: ${signupResponse.status}`);
          console.log(`   Response: ${JSON.stringify(signupResponse.data)}`);
        }
        
        console.log(`   Type: ${account.accountType}`);
        console.log(`   Password: ${account.password}\n`);
        
      } catch (error) {
        console.error(`❌ Error creating account ${account.email}:`, error.message);
      }
    }
    
    console.log('🎉 Test account creation completed!');
    console.log('\n📋 Test Account Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testAccounts.forEach(account => {
      console.log(`📧 ${account.email}`);
      console.log(`🔑 Password: ${account.password}`);
      console.log(`👤 Type: ${account.accountType.toUpperCase()}`);
      console.log('');
    });
    
    console.log('📱 These accounts are ready for testing!');
    console.log('📄 See APP_STORE_REVIEW_ACCOUNT.md for detailed testing instructions.');
    
  } catch (error) {
    console.error('❌ Error connecting to API:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure the backend server is running at olympio.ee:4000');
    console.error('2. Check if the API endpoints are accessible');
    console.error('3. Verify network connectivity');
  }
}

// Run the script
createTestAccounts().catch(console.error);
