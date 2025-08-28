const https = require('https');
const http = require('http');

// Test HTTP endpoint
function testHTTP() {
  console.log('Testing HTTP endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`HTTP Status: ${res.statusCode}`);
    console.log(`HTTP Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('HTTP Response:', data);
      console.log('---');
    });
  });

  req.on('error', (error) => {
    console.error('HTTP Error:', error.message);
  });

  req.end();
}

// Test HTTPS endpoint
function testHTTPS() {
  console.log('Testing HTTPS endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/health',
    method: 'GET',
    rejectUnauthorized: false // Allow self-signed certificates
  };

  const req = https.request(options, (res) => {
    console.log(`HTTPS Status: ${res.statusCode}`);
    console.log(`HTTPS Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('HTTPS Response:', data);
      console.log('---');
    });
  });

  req.on('error', (error) => {
    console.error('HTTPS Error:', error.message);
  });

  req.end();
}

// Test API endpoints
function testAPIEndpoints() {
  console.log('Testing API endpoints...');
  
  const endpoints = [
    '/api/health',
    '/api/events',
    '/api/auth/status'
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`Testing HTTPS endpoint: ${endpoint}`);
    
    const options = {
      hostname: 'localhost',
      port: 4001,
      path: endpoint,
      method: 'GET',
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      console.log(`${endpoint} - Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`${endpoint} - Response:`, jsonData);
        } catch (e) {
          console.log(`${endpoint} - Response:`, data);
        }
        console.log('---');
      });
    });

    req.on('error', (error) => {
      console.error(`${endpoint} - Error:`, error.message);
    });

    req.end();
  });
}

// Run tests
console.log('Starting HTTPS connectivity tests...\n');

setTimeout(() => {
  testHTTP();
}, 1000);

setTimeout(() => {
  testHTTPS();
}, 2000);

setTimeout(() => {
  testAPIEndpoints();
}, 3000);
