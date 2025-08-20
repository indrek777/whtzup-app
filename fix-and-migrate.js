const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
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
      },
      timeout: 10000
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

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Generate a proper UUID
function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Transform app event to Docker backend format with robust validation
function transformEvent(appEvent) {
  // Ensure all required fields are present and properly formatted
  const transformed = {
    name: String(appEvent.name || 'Untitled Event').trim(),
    description: String(appEvent.description || '').trim(),
    category: String(appEvent.category || 'other').trim(),
    venue: String(appEvent.venue || 'Unknown Venue').trim(),
    address: String(appEvent.address || '').trim(),
    latitude: parseFloat(appEvent.latitude) || 0,
    longitude: parseFloat(appEvent.longitude) || 0,
    createdBy: String(appEvent.createdBy || 'Migration Script').trim()
  };

  // Handle date formatting - ensure it's a valid ISO string
  if (appEvent.startsAt) {
    try {
      const date = new Date(appEvent.startsAt);
      if (!isNaN(date.getTime())) {
        transformed.startsAt = date.toISOString();
      } else {
        // If invalid date, use current date + 1 day
        transformed.startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
    } catch (error) {
      // If date parsing fails, use current date + 1 day
      transformed.startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    // If no date, use current date + 1 day
    transformed.startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  // Validate required fields
  if (!transformed.name || transformed.name === 'Untitled Event') {
    transformed.name = `Event ${Date.now()}`;
  }

  return transformed;
}

async function waitForAPI() {
  console.log('⏳ Waiting for API to be ready...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await makeRequest('/health');
      if (response.status === 200) {
        console.log('✅ API is ready!');
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.stdout.write('.');
  }
  
  console.log('\n❌ API did not become ready in time');
  return false;
}

async function fixAndMigrate() {
  console.log('🚀 Starting comprehensive fix and migration...\n');
  
  try {
    // Step 1: Check if events data file exists
    console.log('📁 Step 1: Checking events data file...');
    const eventsDataPath = path.join(__dirname, 'src', 'data', 'events-data.json');
    
    if (!fs.existsSync(eventsDataPath)) {
      console.log('❌ Events data file not found at:', eventsDataPath);
      console.log('💡 Make sure the file exists in src/data/events-data.json');
      return;
    }
    
    const stats = fs.statSync(eventsDataPath);
    console.log('✅ Events data file found');
    console.log('📊 File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Step 2: Try to read and parse the file
    console.log('\n📖 Step 2: Reading events data file...');
    let eventsData;
    try {
      eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));
      console.log('✅ Events data parsed successfully');
      console.log('📊 Total events:', eventsData.length);
    } catch (parseError) {
      console.log('❌ Failed to parse events data:', parseError.message);
      return;
    }
    
    // Step 3: Wait for API to be ready
    console.log('\n🌐 Step 3: Waiting for API to be ready...');
    const apiReady = await waitForAPI();
    if (!apiReady) {
      console.log('❌ API is not responding. Please check:');
      console.log('1. Docker is running');
      console.log('2. Run: docker-compose up -d');
      console.log('3. Wait 30 seconds for containers to start');
      return;
    }
    
    // Step 4: Test API connection
    console.log('\n🔍 Step 4: Testing API connection...');
    try {
      const healthResponse = await makeRequest('/health');
      console.log('✅ API health check successful');
      console.log('📊 Health status:', healthResponse.data.status);
    } catch (apiError) {
      console.log('❌ API connection failed:', apiError.message);
      return;
    }
    
    // Step 5: Test single event upload
    console.log('\n📤 Step 5: Testing single event upload...');
    const deviceId = generateDeviceId();
    const testEvent = {
      name: 'Fix Test Event',
      description: 'This is a test event for the fix script',
      category: 'other',
      venue: 'Test Venue',
      address: 'Test Address',
      latitude: 59.437000,
      longitude: 24.753600,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'Fix Script'
    };
    
    try {
      const uploadResponse = await makeRequest('/api/events', 'POST', testEvent, {
        'X-Device-ID': deviceId
      });
      
      if (uploadResponse.data.success) {
        console.log('✅ Test event uploaded successfully!');
      } else {
        console.log('❌ Test event upload failed:', uploadResponse.data.error);
        if (uploadResponse.data.details) {
          console.log('📋 Details:', uploadResponse.data.details);
        }
        return;
      }
    } catch (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message);
      return;
    }
    
    // Step 6: Start migration with sample
    console.log('\n📤 Step 6: Starting sample migration...');
    const sampleEvents = eventsData.slice(0, 5); // Start with just 5 events
    let successCount = 0;
    let errorCount = 0;
    
    for (const appEvent of sampleEvents) {
      try {
        console.log(`\n📤 Processing: ${appEvent.name}`);
        
        // Transform event
        const dockerEvent = transformEvent(appEvent);
        
        // Upload to Docker backend
        const response = await makeRequest('/api/events', 'POST', dockerEvent, {
          'X-Device-ID': deviceId
        });
        
        if (response.data.success) {
          console.log('✅ Event uploaded successfully!');
          successCount++;
        } else {
          console.log('❌ Failed to upload event:', response.data.error);
          if (response.data.details) {
            console.log('📋 Details:', response.data.details);
          }
          errorCount++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`❌ Error processing event "${appEvent.name}": ${error.message}`);
        errorCount++;
      }
    }
    
    // Final summary
    console.log('\n📊 Sample Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`❌ Failed: ${errorCount} events`);
    console.log(`📋 Total processed: ${successCount + errorCount} events`);
    
    // Verify final count
    console.log('\n🔍 Verifying final count...');
    try {
      const finalResponse = await makeRequest('/api/events');
      const finalEvents = finalResponse.data.data || [];
      console.log(`📊 Total events in Docker backend: ${finalEvents.length}`);
    } catch (error) {
      console.log('❌ Failed to verify final count:', error.message);
    }
    
    if (successCount > 0) {
      console.log('\n✨ Sample migration successful!');
      console.log('\n📋 Next steps:');
      console.log('1. If sample worked, run full migration: node migrate-to-docker-fixed.js');
      console.log('2. Integrate sync service into your React Native app');
      console.log('3. Test offline/online functionality');
    } else {
      console.log('\n❌ Sample migration failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fix and migration failed:', error.message);
  }
}

// Run fix and migration if this script is executed directly
if (require.main === module) {
  fixAndMigrate().catch(console.error);
}

module.exports = { fixAndMigrate };
