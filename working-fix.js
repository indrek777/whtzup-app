const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🚀 Working Fix Script Starting...\n');

// Step 1: Check if events file exists
console.log('📁 Step 1: Checking events file...');
const eventsDataPath = path.join(__dirname, 'src', 'data', 'events-data.json');

if (!fs.existsSync(eventsDataPath)) {
  console.log('❌ Events file not found!');
  process.exit(1);
}

const stats = fs.statSync(eventsDataPath);
console.log(`✅ Events file found: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// Step 2: Read events data
console.log('\n📖 Step 2: Reading events data...');
let eventsData;
try {
  eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));
  console.log(`✅ Loaded ${eventsData.length} events`);
} catch (error) {
  console.log('❌ Failed to parse events:', error.message);
  process.exit(1);
}

// Step 3: Test API connection
console.log('\n🌐 Step 3: Testing API connection...');

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
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test health endpoint
makeRequest('/health')
  .then(response => {
    console.log('✅ API is responding');
    console.log('📊 Health status:', response.data.status);
    
    // Step 4: Test single event upload
    console.log('\n📤 Step 4: Testing event upload...');
    
    const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    const testEvent = {
      name: 'Working Fix Test Event',
      description: 'Test event for working fix',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 59.437000,
      longitude: 24.753600,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'Working Fix Script'
    };
    
    return makeRequest('/api/events', 'POST', testEvent, {
      'X-Device-ID': deviceId
    });
  })
  .then(response => {
    console.log('📊 Upload response status:', response.status);
    console.log('📊 Upload response data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 201 || response.data.success) {
      console.log('✅ Test event uploaded successfully!');
      
      // Step 5: Start sample migration
      console.log('\n📤 Step 5: Starting sample migration...');
      
      const sampleEvents = eventsData.slice(0, 3); // Just 3 events for testing
      let successCount = 0;
      let errorCount = 0;
      
      const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      return new Promise((resolve) => {
        let processed = 0;
        
        sampleEvents.forEach((appEvent, index) => {
          setTimeout(async () => {
            try {
              console.log(`📤 Processing ${index + 1}/${sampleEvents.length}: ${appEvent.name}`);
              
              const dockerEvent = {
                name: String(appEvent.name || 'Untitled Event').trim(),
                description: String(appEvent.description || '').trim(),
                category: String(appEvent.category || 'other').trim(),
                venue: String(appEvent.venue || 'Unknown Venue').trim(),
                address: String(appEvent.address || '').trim(),
                latitude: parseFloat(appEvent.latitude) || 0,
                longitude: parseFloat(appEvent.longitude) || 0,
                startsAt: appEvent.startsAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                createdBy: String(appEvent.createdBy || 'Working Fix Script').trim()
              };
              
              const response = await makeRequest('/api/events', 'POST', dockerEvent, {
                'X-Device-ID': deviceId
              });
              
              if (response.status === 201 || response.data.success) {
                console.log('✅ Event uploaded successfully!');
                successCount++;
              } else {
                console.log('❌ Failed to upload:', response.data.error || 'Unknown error');
                errorCount++;
              }
            } catch (error) {
              console.log('❌ Error:', error.message);
              errorCount++;
            }
            
            processed++;
            if (processed === sampleEvents.length) {
              resolve({ successCount, errorCount });
            }
          }, index * 1000); // 1 second delay between uploads
        });
      });
    } else {
      console.log('❌ Test event upload failed:', response.data.error || 'Unknown error');
      throw new Error('Test upload failed');
    }
  })
  .then(({ successCount, errorCount }) => {
    console.log('\n📊 Sample Migration Results:');
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`❌ Failed: ${errorCount} events`);
    
    if (successCount > 0) {
      console.log('\n✨ Sample migration successful!');
      console.log('\n📋 Next steps:');
      console.log('1. Run full migration: node migrate-to-docker-fixed.js');
      console.log('2. Integrate sync service into your React Native app');
      console.log('3. Test offline/online functionality');
    } else {
      console.log('\n❌ Sample migration failed. Check the errors above.');
    }
  })
  .catch(error => {
    console.log('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Docker is running');
    console.log('2. Run: docker-compose up -d');
    console.log('3. Wait 30 seconds for containers to start');
    console.log('4. Try again: node working-fix.js');
  });
