const fs = require('fs');
const path = require('path');

// Backend API URL
const BACKEND_URL = 'http://165.22.90.180:4000';

// Admin credentials
const ADMIN_EMAIL = 'admin@whtzup.com';
const ADMIN_PASSWORD = 'admin123456';

let currentToken = null;

// Function to get fresh token
async function getToken() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (response.ok) {
      const result = await response.json();
      currentToken = result.data.accessToken;
      console.log('🔑 Got fresh token');
      return currentToken;
    } else {
      throw new Error('Failed to get token');
    }
  } catch (error) {
    console.error('❌ Error getting token:', error.message);
    throw error;
  }
}

// Load events from JSON file
const eventsDataPath = path.join(__dirname, 'src/data/events-data.json');
const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));

console.log(`📊 Found ${eventsData.length} events to migrate`);

// Function to create event in backend
async function createEvent(event) {
  try {
    if (!currentToken) {
      await getToken();
    }

    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        name: event.name,
        description: event.description,
        latitude: event.latitude,
        longitude: event.longitude,
        startsAt: event.startsAt,
        venue: event.venue,
        address: event.address,
        category: event.category || 'other',
        source: event.source || 'migrated'
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, id: result.data?.id };
    } else if (response.status === 401) {
      // Token expired, get new one and retry
      console.log('🔄 Token expired, getting new token...');
      await getToken();
      return await createEvent(event); // Retry with new token
    } else {
      const error = await response.text();
      return { success: false, error: error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Function to migrate events in batches
async function migrateEvents(events, batchSize = 10, startIndex = 0) {
  console.log(`🚀 Starting migration of ${events.length} events in batches of ${batchSize}`);
  console.log(`📍 Starting from index: ${startIndex}`);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  // Get initial token
  await getToken();
  
  for (let i = startIndex; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, events.length)})`);
    
    for (const event of batch) {
      // Skip events with invalid data
      if (!event.name || !event.latitude || !event.longitude) {
        console.log(`⚠️  Skipping event with invalid data: ${event.name || 'No name'}`);
        skippedCount++;
        continue;
      }
      
      const result = await createEvent(event);
      
      if (result.success) {
        successCount++;
        console.log(`✅ Created event: ${event.name}`);
      } else {
        errorCount++;
        console.log(`❌ Failed to create event: ${event.name} - ${result.error}`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Progress update
    console.log(`📊 Progress: ${successCount} created, ${errorCount} failed, ${skippedCount} skipped`);
    
    // Save progress every 100 events
    if (i % 100 === 0) {
      fs.writeFileSync('migration-progress.json', JSON.stringify({
        lastProcessedIndex: i,
        successCount,
        errorCount,
        skippedCount,
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  return { successCount, errorCount, skippedCount };
}

// Main migration function
async function main() {
  console.log('🔄 Starting event migration to backend...');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log(`📁 Events file: ${eventsDataPath}`);
  
  // Check if we have progress saved
  let startIndex = 0;
  if (fs.existsSync('migration-progress.json')) {
    const progress = JSON.parse(fs.readFileSync('migration-progress.json', 'utf8'));
    console.log(`📈 Found previous progress: ${progress.successCount} events created`);
    startIndex = progress.lastProcessedIndex + 1;
  }
  
  // Filter out events that are too old (before 2024)
  const currentDate = new Date();
  const filteredEvents = eventsData.filter(event => {
    const eventDate = new Date(event.startsAt);
    return eventDate >= new Date('2024-01-01');
  });
  
  console.log(`📅 Filtered to ${filteredEvents.length} events from 2024 onwards`);
  
  // Start migration
  const result = await migrateEvents(filteredEvents, 5, startIndex); // Small batch size to be safe
  
  console.log('\n🎉 Migration completed!');
  console.log(`✅ Successfully created: ${result.successCount} events`);
  console.log(`❌ Failed to create: ${result.errorCount} events`);
  console.log(`⚠️  Skipped: ${result.skippedCount} events`);
  console.log(`📊 Total processed: ${result.successCount + result.errorCount + result.skippedCount}`);
  
  // Clean up progress file
  if (fs.existsSync('migration-progress.json')) {
    fs.unlinkSync('migration-progress.json');
  }
}

// Run migration
main().catch(console.error);
