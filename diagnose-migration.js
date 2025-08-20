const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE_URL = 'http://localhost:4000';

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
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

async function diagnoseMigration() {
  console.log('🔍 Diagnosing migration issues...\n');
  
  try {
    // Step 1: Check if events data file exists
    console.log('📁 Step 1: Checking events data file...');
    const eventsDataPath = path.join(__dirname, 'src', 'data', 'events-data.json');
    
    if (!fs.existsSync(eventsDataPath)) {
      console.log('❌ Events data file not found at:', eventsDataPath);
      return;
    }
    
    const stats = fs.statSync(eventsDataPath);
    console.log('✅ Events data file found');
    console.log('📊 File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Step 2: Try to read and parse the file
    console.log('\n📖 Step 2: Reading events data file...');
    try {
      const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));
      console.log('✅ Events data parsed successfully');
      console.log('📊 Total events:', eventsData.length);
      
      if (eventsData.length > 0) {
        console.log('📋 Sample event structure:');
        console.log(JSON.stringify(eventsData[0], null, 2));
      }
    } catch (parseError) {
      console.log('❌ Failed to parse events data:', parseError.message);
      return;
    }
    
    // Step 3: Test API connection
    console.log('\n🌐 Step 3: Testing API connection...');
    try {
      const healthResponse = await makeRequest('/health');
      console.log('✅ API health check response:', healthResponse.status);
      console.log('📊 Health data:', JSON.stringify(healthResponse.data, null, 2));
    } catch (apiError) {
      console.log('❌ API connection failed:', apiError.message);
      console.log('💡 Make sure Docker containers are running: docker-compose up -d');
      return;
    }
    
    // Step 4: Test single event upload
    console.log('\n📤 Step 4: Testing single event upload...');
    try {
      const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      const testEvent = {
        name: 'Diagnostic Test Event',
        description: 'This is a test event for diagnostics',
        category: 'other',
        venue: 'Test Venue',
        address: 'Test Address',
        latitude: 59.437000,
        longitude: 24.753600,
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Diagnostic Script'
      };
      
      console.log('📤 Uploading test event...');
      console.log('🆔 Device ID:', deviceId);
      console.log('📋 Test event:', JSON.stringify(testEvent, null, 2));
      
      const uploadResponse = await makeRequest('/api/events', 'POST', testEvent, {
        'X-Device-ID': deviceId
      });
      
      console.log('📊 Upload response status:', uploadResponse.status);
      console.log('📊 Upload response data:', JSON.stringify(uploadResponse.data, null, 2));
      
      if (uploadResponse.data.success) {
        console.log('✅ Test event uploaded successfully!');
      } else {
        console.log('❌ Test event upload failed:', uploadResponse.data.error);
        if (uploadResponse.data.details) {
          console.log('📋 Details:', uploadResponse.data.details);
        }
      }
    } catch (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message);
    }
    
    // Step 5: Check current events in database
    console.log('\n📊 Step 5: Checking current events in database...');
    try {
      const eventsResponse = await makeRequest('/api/events');
      const events = eventsResponse.data.data || [];
      console.log('✅ Current events in database:', events.length);
      
      if (events.length > 0) {
        console.log('📋 Sample database event:');
        console.log(JSON.stringify(events[0], null, 2));
      }
    } catch (eventsError) {
      console.log('❌ Failed to get events:', eventsError.message);
    }
    
    console.log('\n✨ Diagnosis completed!');
    console.log('\n📋 Next steps:');
    console.log('1. If API connection failed: Run docker-compose up -d');
    console.log('2. If upload failed: Check the error details above');
    console.log('3. If everything works: Run node migrate-sample.js');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

// Run diagnosis if this script is executed directly
if (require.main === module) {
  diagnoseMigration().catch(console.error);
}

module.exports = { diagnoseMigration };
