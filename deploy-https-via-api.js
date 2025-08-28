const https = require('https');
const http = require('http');

const DO_SERVER = '165.22.90.180';
const HTTP_PORT = 4000;

console.log('🚀 Deploying HTTPS to DigitalOcean via API...\n');

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

// Step 2: Check if HTTPS is already configured
async function checkHTTPSStatus() {
  console.log('\nStep 2: Checking HTTPS status...');
  
  try {
    const response = await makeRequest(DO_SERVER, 4001, '/health');
    console.log(`✅ HTTPS server is already running: ${response.status}`);
    return true;
  } catch (error) {
    console.log('ℹ️  HTTPS server is not yet configured (expected)');
    return false;
  }
}

// Step 3: Create SSL certificates via API
async function createSSLCertificates() {
  console.log('\nStep 3: Creating SSL certificates...');
  
  try {
    // This would require a special API endpoint to generate certificates
    // For now, we'll just check if we can access the server
    const response = await makeRequest(DO_SERVER, HTTP_PORT, '/api/health');
    console.log('✅ Server is accessible for configuration');
    return true;
  } catch (error) {
    console.error('❌ Cannot access server for configuration:', error.message);
    return false;
  }
}

// Step 4: Test HTTPS after deployment
async function testHTTPS() {
  console.log('\nStep 4: Testing HTTPS endpoint...');
  
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
  console.log('Starting HTTPS deployment...\n');
  
  // Check current status
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('❌ Cannot proceed - server is not running');
    return;
  }
  
  // Check if HTTPS is already configured
  const httpsRunning = await checkHTTPSStatus();
  if (httpsRunning) {
    console.log('✅ HTTPS is already configured and running!');
    return;
  }
  
  // Create SSL certificates
  const sslCreated = await createSSLCertificates();
  if (!sslCreated) {
    console.log('❌ Cannot create SSL certificates via API');
    console.log('\n💡 Manual steps required:');
    console.log('1. SSH to the server: ssh -i ~/.ssh/whtzup_key root@165.22.90.180');
    console.log('2. Create SSL certificates:');
    console.log('   mkdir -p /root/whtzup-app/ssl');
    console.log('   openssl req -x509 -newkey rsa:4096 -keyout /root/whtzup-app/ssl/server.key -out /root/whtzup-app/ssl/server.crt -days 365 -nodes -subj "/C=EE/ST=Harju/L=Tallinn/O=WhtzUp/OU=Production/CN=165.22.90.180"');
    console.log('3. Update environment variables:');
    console.log('   echo "SSL_KEY_PATH=/root/whtzup-app/ssl/server.key" >> /root/whtzup-app/.env');
    console.log('   echo "SSL_CERT_PATH=/root/whtzup-app/ssl/server.crt" >> /root/whtzup-app/.env');
    console.log('   echo "HTTPS_PORT=4001" >> /root/whtzup-app/.env');
    console.log('4. Restart Docker containers:');
    console.log('   cd /root/whtzup-app && docker-compose down && docker-compose up -d');
    console.log('5. Open firewall port:');
    console.log('   ufw allow 4001/tcp');
    return;
  }
  
  // Test HTTPS
  const httpsWorking = await testHTTPS();
  if (httpsWorking) {
    console.log('\n🎉 HTTPS deployment successful!');
    console.log('\nServer URLs:');
    console.log(`  HTTP:  http://${DO_SERVER}:4000`);
    console.log(`  HTTPS: https://${DO_SERVER}:4001`);
  } else {
    console.log('\n❌ HTTPS deployment failed');
  }
}

// Run deployment
deployHTTPS().catch(console.error);
