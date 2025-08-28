const https = require('https');
const http = require('http');

const DO_SERVER = '165.22.90.180';

console.log('🌐 Testing DigitalOcean HTTPS connectivity...\n');

// Test HTTP endpoint
function testHTTP() {
  console.log('Testing HTTP endpoint...');
  
  const options = {
    hostname: DO_SERVER,
    port: 4000,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`HTTP Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('HTTP Response:', jsonData);
      } catch (e) {
        console.log('HTTP Response:', data);
      }
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
    hostname: DO_SERVER,
    port: 4001,
    path: '/health',
    method: 'GET',
    rejectUnauthorized: false // Allow self-signed certificates
  };

  const req = https.request(options, (res) => {
    console.log(`HTTPS Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('HTTPS Response:', jsonData);
      } catch (e) {
        console.log('HTTPS Response:', data);
      }
      console.log('---');
    });
  });

  req.on('error', (error) => {
    console.error('HTTPS Error:', error.message);
    console.log('💡 This is expected if HTTPS is not yet deployed to DigitalOcean');
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
      hostname: DO_SERVER,
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
setTimeout(() => {
  testHTTP();
}, 1000);

setTimeout(() => {
  testHTTPS();
}, 2000);

setTimeout(() => {
  testAPIEndpoints();
}, 3000);
