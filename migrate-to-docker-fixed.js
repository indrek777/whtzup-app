const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE_URL = 'http://localhost:4000';

// Progress log setup (mirror all logs to a file we can tail)
const progressLogPath = path.join(__dirname, 'migration-progress.log');
try {
  fs.writeFileSync(progressLogPath, '');
} catch (e) {
  // ignore
}
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = (...args) => {
  try { fs.appendFileSync(progressLogPath, args.join(' ') + '\n'); } catch (e) {}
  originalConsoleLog(...args);
};
console.error = (...args) => {
  try { fs.appendFileSync(progressLogPath, '[ERROR] ' + args.join(' ') + '\n'); } catch (e) {}
  originalConsoleError(...args);
};

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

// Generate a device ID for migration
function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Transform app event to Docker backend format with proper validation
function transformEvent(appEvent) {
  // Ensure required fields are present and properly formatted
  const transformed = {
    name: appEvent.name || 'Untitled Event',
    description: appEvent.description || '',
    category: appEvent.category || 'other',
    venue: appEvent.venue || 'Unknown Venue',
    address: appEvent.address || '',
    latitude: parseFloat(appEvent.latitude) || 0,
    longitude: parseFloat(appEvent.longitude) || 0,
    createdBy: appEvent.createdBy || 'Migration Script'
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

  return transformed;
}

async function migrateEvents() {
  console.log('🚀 Starting migration of app data to Docker backend...\n');
  
  try {
    // First, test the API connection
    console.log('🔍 Testing API connection...');
    const healthResponse = await makeRequest('/health');
    if (healthResponse.status !== 200) {
      throw new Error('API server is not responding');
    }
    console.log('✅ API connection successful');

    // Read the events data file
    console.log('\n📖 Reading events data from app...');
    const eventsDataPath = path.join(__dirname, 'src', 'data', 'events-data.json');
    const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));
    
    console.log(`📊 Found ${eventsData.length} events to migrate`);
    
    // Generate device ID for migration
    const deviceId = generateDeviceId();
    console.log(`🆔 Using device ID: ${deviceId}`);
    
    // Check current events in Docker backend
    console.log('\n🔍 Checking current events in Docker backend...');
    const currentEventsResponse = await makeRequest('/api/events');
    const currentEvents = currentEventsResponse.data.data || [];
    console.log(`📋 Found ${currentEvents.length} events in Docker backend`);
    
    // Transform and upload events
    console.log('\n📤 Starting migration...');
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process events in smaller batches
    const batchSize = 10;
    const totalBatches = Math.ceil(eventsData.length / batchSize);
    
    for (let i = 0; i < eventsData.length; i += batchSize) {
      const batch = eventsData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} events)...`);
      
      for (const appEvent of batch) {
        try {
          // Check if event already exists (by name and venue to avoid duplicates)
          const existingEvent = currentEvents.find(e => 
            e.name === appEvent.name && 
            e.venue === (appEvent.venue || 'Unknown Venue')
          );
          
          if (existingEvent) {
            console.log(`⏭️  Skipping existing event: ${appEvent.name}`);
            skippedCount++;
            continue;
          }
          
          // Transform event
          const dockerEvent = transformEvent(appEvent);
          
          // Upload to Docker backend
          const response = await makeRequest('/api/events', 'POST', dockerEvent, {
            'X-Device-ID': deviceId
          });
          
          if (response.data.success) {
            successCount++;
            if (successCount % 5 === 0) {
              console.log(`✅ Uploaded ${successCount} events so far...`);
            }
          } else {
            console.log(`❌ Failed to upload event "${appEvent.name}": ${response.data.error}`);
            if (response.data.details) {
              console.log(`📋 Details: ${JSON.stringify(response.data.details)}`);
            }
            errorCount++;
          }
          
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.log(`❌ Error processing event "${appEvent.name}": ${error.message}`);
          errorCount++;
        }
      }
    }
    
    // Final summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} events`);
    console.log(`❌ Failed: ${errorCount} events`);
    console.log(`📋 Total processed: ${successCount + skippedCount + errorCount} events`);
    
    // Verify final count
    console.log('\n🔍 Verifying final count...');
    const finalResponse = await makeRequest('/api/events');
    const finalEvents = finalResponse.data.data || [];
    console.log(`📊 Total events in Docker backend: ${finalEvents.length}`);
    
    console.log('\n✨ Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your React Native app to use the syncService');
    console.log('2. Test the synchronization between app and Docker backend');
    console.log('3. Verify that all events are accessible through the API');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateEvents().catch(console.error);
}

module.exports = { migrateEvents };
