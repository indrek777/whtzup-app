const http = require('http');
const fs = require('fs');

console.log('🔍 Simple Debug Starting...');

// Write debug info to a file
const debugLog = [];

function log(message) {
  console.log(message);
  debugLog.push(message);
}

// Test 1: Check if we can make HTTP requests
log('📋 Test 1: Testing HTTP connection...');

const testUrl = 'http://localhost:4000/health';
const url = new URL(testUrl);

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    log(`✅ HTTP Status: ${res.statusCode}`);
    log(`📊 Response: ${data.substring(0, 200)}`);
    
    // Test 2: Try to upload an event
    log('\n📋 Test 2: Testing event upload...');
    
    const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    const testEvent = {
      name: 'Simple Debug Test',
      description: 'Test event',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 59.437000,
      longitude: 24.753600,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'Simple Debug'
    };
    
    const uploadOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId
      },
      timeout: 10000
    };
    
    const uploadReq = http.request(uploadOptions, (uploadRes) => {
      let uploadData = '';
      uploadRes.on('data', (chunk) => uploadData += chunk);
      uploadRes.on('end', () => {
        log(`📊 Upload Status: ${uploadRes.statusCode}`);
        log(`📊 Upload Response: ${uploadData}`);
        
        try {
          const jsonResponse = JSON.parse(uploadData);
          log(`📊 Success: ${jsonResponse.success}`);
          log(`📊 Error: ${jsonResponse.error}`);
          if (jsonResponse.details) {
            log(`📊 Details: ${JSON.stringify(jsonResponse.details)}`);
          }
        } catch (e) {
          log(`❌ Failed to parse response: ${e.message}`);
        }
        
        // Write debug log to file
        fs.writeFileSync('debug-output.txt', debugLog.join('\n'));
        log('\n📁 Debug log written to debug-output.txt');
        log('✨ Debug completed!');
      });
    });
    
    uploadReq.on('error', (error) => {
      log(`❌ Upload error: ${error.message}`);
      fs.writeFileSync('debug-output.txt', debugLog.join('\n'));
    });
    
    uploadReq.write(JSON.stringify(testEvent));
    uploadReq.end();
  });
});

req.on('error', (error) => {
  log(`❌ HTTP error: ${error.message}`);
  fs.writeFileSync('debug-output.txt', debugLog.join('\n'));
});

req.on('timeout', () => {
  log('❌ HTTP timeout');
  req.destroy();
  fs.writeFileSync('debug-output.txt', debugLog.join('\n'));
});

req.end();
