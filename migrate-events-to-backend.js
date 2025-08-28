const fs = require('fs');
const path = require('path');

// Backend API URL
const BACKEND_URL = 'https://165.22.90.180:4001';

// Load events from JSON file
const eventsDataPath = path.join(__dirname, 'src/data/events-data.json');
const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));

console.log(`📊 Found ${eventsData.length} events to migrate`);

// Function to create event in backend
async function createEvent(event) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhY2IxNWU5MC0zZmRiLTRiNTItOTcxMS04ZjRkMTJiYzcxMjYiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzU2MjI0NzExLCJleHAiOjE3NTYyMjU2MTF9.-tspDHN_I5Fkstz7X02gepDGuaRcXH7vSQWIe32VFnw'
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
    } else {
      const error = await response.text();
      return { success: false, error: error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Function to migrate events in batches
async function migrateEvents(events, batchSize = 10) {
  console.log(`🚀 Starting migration of ${events.length} events in batches of ${batchSize}`);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < events.length; i += batchSize) {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Progress update
    console.log(`📊 Progress: ${successCount} created, ${errorCount} failed, ${skippedCount} skipped`);
  }
  
  return { successCount, errorCount, skippedCount };
}

// Main migration function
async function main() {
  console.log('🔄 Starting event migration to backend...');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log(`📁 Events file: ${eventsDataPath}`);
  
  // Filter out events that are too old (before 2024)
  const currentDate = new Date();
  const filteredEvents = eventsData.filter(event => {
    const eventDate = new Date(event.startsAt);
    return eventDate >= new Date('2024-01-01');
  });
  
  console.log(`📅 Filtered to ${filteredEvents.length} events from 2024 onwards`);
  
  // Start migration
  const result = await migrateEvents(filteredEvents, 5); // Small batch size to be safe
  
  console.log('\n🎉 Migration completed!');
  console.log(`✅ Successfully created: ${result.successCount} events`);
  console.log(`❌ Failed to create: ${result.errorCount} events`);
  console.log(`⚠️  Skipped: ${result.skippedCount} events`);
  console.log(`📊 Total processed: ${result.successCount + result.errorCount + result.skippedCount}`);
}

// Run migration
main().catch(console.error);
