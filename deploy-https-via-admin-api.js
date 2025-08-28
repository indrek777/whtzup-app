const https = require('https');
const http = require('http');

const DO_SERVER = '165.22.90.180';
const HTTP_PORT = 4000;

console.log('🚀 Deploying HTTPS to DigitalOcean via Admin API...\n');

// Function to make HTTP request
function makeRequest(hostname, port, path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = (port === 443 || port === 4001 ? https : http).request(options, (res) => {
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

// Step 1: Check current server status
async function checkServerStatus() {
  console.log('Step 1: Checking current server status...');
  
  try {
    const response = await makeRequest(DO_SERVER, HTTP_PORT, '/health');
    console.log(`✅ HTTP server is running: ${response.status}`);
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ HTTP server is not responding:', error.message);
    return false;
  }
}

// Step 2: Check HTTPS status via admin API
async function checkHTTPSStatus() {
  console.log('\nStep 2: Checking HTTPS status via admin API...');
  
  try {
    const response = await makeRequest(DO_SERVER, HTTP_PORT, '/api/admin/https-status');
    console.log('HTTPS Status:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Cannot access admin API:', error.message);
    return null;
  }
}

// Step 3: Generate SSL certificates via admin API
async function generateSSLCertificates() {
  console.log('\nStep 3: Generating SSL certificates via admin API...');
  
  try {
    const response = await makeRequest(DO_SERVER, HTTP_PORT, '/api/admin/generate-ssl', 'POST');
    console.log('SSL Generation Response:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ Failed to generate SSL certificates:', error.message);
    return false;
  }
}

// Step 4: Configure HTTPS via admin API
async function configureHTTPS() {
  console.log('\nStep 4: Configuring HTTPS via admin API...');
  
  try {
    const configData = {
      sslKeyPath: '/root/whtzup-app/ssl/server.key',
      sslCertPath: '/root/whtzup-app/ssl/server.crt',
      httpsPort: 4001
    };
    
    const response = await makeRequest(DO_SERVER, HTTP_PORT, '/api/admin/configure-https', 'POST', configData);
    console.log('HTTPS Configuration Response:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('❌ Failed to configure HTTPS:', error.message);
    return false;
  }
}

// Step 5: Test HTTPS endpoint
async function testHTTPS() {
  console.log('\nStep 5: Testing HTTPS endpoint...');
  
  try {
    const response = await makeRequest(DO_SERVER, 4001, '/health');
    console.log(`✅ HTTPS server is working: ${response.status}`);
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ HTTPS server is not working:', error.message);
    return false;
  }
}

// Main deployment function
async function deployHTTPS() {
  console.log('Starting HTTPS deployment via Admin API...\n');
  
  // Check current status
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('❌ Cannot proceed - server is not running');
    return;
  }
  
  // Check HTTPS status
  const httpsStatus = await checkHTTPSStatus();
  if (httpsStatus && httpsStatus.httpsEnabled) {
    console.log('✅ HTTPS is already configured and enabled!');
    return;
  }
  
  // Generate SSL certificates
  console.log('Generating SSL certificates...');
  const sslGenerated = await generateSSLCertificates();
  if (!sslGenerated) {
    console.log('❌ Failed to generate SSL certificates');
    console.log('\n💡 Manual steps required:');
    console.log('1. SSH to the server (if possible)');
    console.log('2. Or manually create SSL certificates on the server');
    return;
  }
  
  // Configure HTTPS
  console.log('Configuring HTTPS...');
  const httpsConfigured = await configureHTTPS();
  if (!httpsConfigured) {
    console.log('❌ Failed to configure HTTPS');
    return;
  }
  
  // Wait a moment for configuration to take effect
  console.log('Waiting for configuration to take effect...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test HTTPS
  const httpsWorking = await testHTTPS();
  if (httpsWorking) {
    console.log('\n🎉 HTTPS deployment successful!');
    console.log('\nServer URLs:');
    console.log(`  HTTP:  http://${DO_SERVER}:4000`);
    console.log(`  HTTPS: https://${DO_SERVER}:4001`);
    console.log('\nNote: You may need to restart the server for HTTPS to take effect.');
  } else {
    console.log('\n⚠️  HTTPS configuration completed but server needs restart');
    console.log('\nTo complete the deployment:');
    console.log('1. Restart the server on DigitalOcean');
    console.log('2. Or use: docker-compose restart api-server');
    console.log('3. Test again with: node test-digitalocean-https.js');
  }
}

// Run deployment
deployHTTPS().catch(console.error);
