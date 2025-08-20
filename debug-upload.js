const http = require('http');

console.log('🔍 Debug Upload Script Starting...\n');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:4000');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    console.log(`🌐 Making ${method} request to: ${url.href}`);
    console.log(`📋 Headers:`, JSON.stringify(options.headers, null, 2));
    if (data) {
      console.log(`📦 Data:`, JSON.stringify(data, null, 2));
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📊 Response Status: ${res.statusCode}`);
        console.log(`📊 Response Headers:`, JSON.stringify(res.headers, null, 2));
        console.log(`📊 Response Body:`, body);
        
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData, rawBody: body });
        } catch (error) {
          console.log(`❌ Failed to parse JSON: ${error.message}`);
          resolve({ status: res.statusCode, data: body, rawBody: body });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log(`❌ Request timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function debugUpload() {
  try {
    // Step 1: Test health endpoint
    console.log('📋 Step 1: Testing health endpoint...');
    const healthResponse = await makeRequest('/health');
    console.log('✅ Health check completed\n');

    // Step 2: Test events endpoint (GET)
    console.log('📋 Step 2: Testing GET /api/events...');
    const getEventsResponse = await makeRequest('/api/events');
    console.log('✅ GET events completed\n');

    // Step 3: Test single event upload with detailed logging
    console.log('📋 Step 3: Testing event upload...');
    
    const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    console.log(`🆔 Generated Device ID: ${deviceId}`);
    
    const testEvent = {
      name: 'Debug Test Event',
      description: 'Test event for debugging',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 59.437000,
      longitude: 24.753600,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'Debug Script'
    };
    
    console.log(`📦 Test Event Data:`, JSON.stringify(testEvent, null, 2));
    
    const uploadResponse = await makeRequest('/api/events', 'POST', testEvent, {
      'X-Device-ID': deviceId
    });
    
    console.log('\n📊 Upload Response Analysis:');
    console.log(`Status: ${uploadResponse.status}`);
    console.log(`Success: ${uploadResponse.data.success}`);
    console.log(`Error: ${uploadResponse.data.error}`);
    console.log(`Message: ${uploadResponse.data.message}`);
    
    if (uploadResponse.data.details) {
      console.log(`Details:`, JSON.stringify(uploadResponse.data.details, null, 2));
    }
    
    if (uploadResponse.data.success) {
      console.log('\n✅ Upload successful!');
    } else {
      console.log('\n❌ Upload failed!');
      console.log('🔍 Analyzing failure...');
      
      // Check if it's a validation error
      if (uploadResponse.data.details && uploadResponse.data.details.errors) {
        console.log('📋 Validation errors:');
        uploadResponse.data.details.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.msg} (${error.param})`);
        });
      }
    }

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.log(`Stack trace: ${error.stack}`);
  }
}

debugUpload();
