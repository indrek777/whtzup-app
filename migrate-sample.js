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

// Generate a proper UUID
function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Transform app event to Docker backend format
function transformEvent(appEvent) {
  return {
    name: appEvent.name || 'Untitled Event',
    description: appEvent.description || '',
    category: appEvent.category || 'other',
    venue: appEvent.venue || 'Unknown Venue',
    address: appEvent.address || '',
    latitude: parseFloat(appEvent.latitude) || 0,
    longitude: parseFloat(appEvent.longitude) || 0,
    startsAt: appEvent.startsAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdBy: appEvent.createdBy || 'Migration Script'
  };
}

async function migrateSample() {
  console.log('🚀 Starting sample migration...\n');
  
  try {
    // Wait for API to be ready
    console.log('⏳ Waiting for API to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test API connection
    console.log('🔍 Testing API connection...');
    const healthResponse = await makeRequest('/health');
    console.log('Health response:', healthResponse.status);
    
    if (healthResponse.status !== 200) {
      throw new Error('API server is not responding');
    }
    console.log('✅ API connection successful');

    // Read the events data file
    console.log('\n📖 Reading events data from app...');
    const eventsDataPath = path.join(__dirname, 'src', 'data', 'events-data.json');
    const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));
    
    console.log(`📊 Found ${eventsData.length} total events`);
    
    // Take only first 10 events for testing
    const sampleEvents = eventsData.slice(0, 10);
    console.log(`📋 Using sample of ${sampleEvents.length} events`);
    
    // Generate device ID for migration
    const deviceId = generateDeviceId();
    console.log(`🆔 Using device ID: ${deviceId}`);
    
    // Transform and upload events
    console.log('\n📤 Starting sample migration...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const appEvent of sampleEvents) {
      try {
        console.log(`\n📤 Processing: ${appEvent.name}`);
        
        // Transform event
        const dockerEvent = transformEvent(appEvent);
        console.log('Transformed event:', dockerEvent);
        
        // Upload to Docker backend
        const response = await makeRequest('/api/events', 'POST', dockerEvent, {
          'X-Device-ID': deviceId
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
          console.log('✅ Event uploaded successfully!');
          successCount++;
        } else {
          console.log('❌ Failed to upload event:', response.data.error);
          if (response.data.details) {
            console.log('Details:', response.data.details);
          }
          errorCount++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
    const finalResponse = await makeRequest('/api/events');
    const finalEvents = finalResponse.data.data || [];
    console.log(`📊 Total events in Docker backend: ${finalEvents.length}`);
    
    if (successCount > 0) {
      console.log('\n✨ Sample migration successful!');
      console.log('You can now run the full migration with: node migrate-to-docker-fixed.js');
    } else {
      console.log('\n❌ Sample migration failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateSample().catch(console.error);
}

module.exports = { migrateSample };
