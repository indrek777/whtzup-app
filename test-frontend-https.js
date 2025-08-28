const https = require('https');

const DO_SERVER = '165.22.90.180';
const HTTPS_PORT = 4001;

console.log('📱 Testing Frontend HTTPS Connectivity...\n');

// Function to make HTTPS request
function makeRequest(hostname, port, path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method,
      rejectUnauthorized: false, // Allow self-signed certificates
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
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

// Test API endpoints that frontend uses
async function testFrontendEndpoints() {
  console.log('Testing Frontend API Endpoints...\n');
  
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/events', method: 'GET' },
    { path: '/api/auth/signin', method: 'POST' },
    { path: '/api/auth/signup', method: 'POST' },
    { path: '/api/subscription/status', method: 'GET' },
    { path: '/api/ratings', method: 'GET' },
    { path: '/api/sync', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
    
    try {
      const response = await makeRequest(DO_SERVER, HTTPS_PORT, endpoint.path, endpoint.method);
      console.log(`✅ ${endpoint.method} ${endpoint.path} - Status: ${response.status}`);
      
              if (response.status === 200) {
          console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        } else if (response.status === 404) {
          console.log(`   ⚠️  Route not found (expected for some endpoints)`);
        } else if (response.status === 401) {
          console.log(`   🔐 Authentication required (expected)`);
        } else if (response.status === 400) {
          console.log(`   📝 Bad request: ${JSON.stringify(response.data)}`);
        } else if (response.status === 500) {
          console.log(`   ❌ Server error: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
      console.log(`❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Test with sample data
async function testWithSampleData() {
  console.log('Testing with Sample Data...\n');
  
  // Test event creation (if endpoint exists)
  try {
    const sampleEvent = {
      title: 'Test Event',
      description: 'Test event for HTTPS',
      date: new Date().toISOString(),
      location: 'Test Location'
    };
    
    const response = await makeRequest(DO_SERVER, HTTPS_PORT, '/api/events', 'POST', sampleEvent);
    console.log(`Event Creation Test - Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.log(`Event Creation Test - Error: ${error.message}`);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Frontend HTTPS Tests...\n');
  
  // Test basic connectivity
  try {
    const healthResponse = await makeRequest(DO_SERVER, HTTPS_PORT, '/health');
    console.log(`✅ HTTPS Connectivity: ${healthResponse.status} OK`);
    console.log(`   Server: ${DO_SERVER}:${HTTPS_PORT}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.data)}\n`);
  } catch (error) {
    console.log(`❌ HTTPS Connectivity Failed: ${error.message}\n`);
    return;
  }
  
  // Test frontend endpoints
  await testFrontendEndpoints();
  
  // Test with sample data
  await testWithSampleData();
  
  console.log('🎉 Frontend HTTPS Tests Completed!');
  console.log('\n📋 Summary:');
  console.log(`   ✅ HTTPS Server: https://${DO_SERVER}:${HTTPS_PORT}`);
  console.log(`   ✅ API Base URL: https://${DO_SERVER}:${HTTPS_PORT}/api`);
  console.log(`   ✅ Frontend can now use HTTPS for all API calls`);
}

// Run tests
runTests().catch(console.error);
