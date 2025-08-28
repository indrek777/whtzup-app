const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = 'http://165.22.90.180:4000';
const BATCH_SIZE = 50; // Process 50 events at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches
const START_DATE = '2025-08-28'; // Today's date

// Load events data
const eventsDataPath = path.join(__dirname, 'src/data/events-data.json');
const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));

console.log(`📊 Total events in file: ${eventsData.length}`);

// Filter events from today onwards
const today = new Date(START_DATE);
const filteredEvents = eventsData.filter(event => {
  if (!event.startsAt) return false;
  const eventDate = new Date(event.startsAt);
  return eventDate >= today;
});

console.log(`📅 Events from ${START_DATE} onwards: ${filteredEvents.length}`);

// Get existing events from backend to check for duplicates
async function getExistingEvents() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/events`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('❌ Error fetching existing events:', error.message);
    return [];
  }
}

// Create a unique identifier for each event
function createEventId(event) {
  return `${event.name}_${event.startsAt}_${event.venue}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

// Check if event already exists
function isDuplicate(event, existingEvents) {
  const eventId = createEventId(event);
  return existingEvents.some(existing => createEventId(existing) === eventId);
}

// Add event to backend
async function addEventToBackend(event) {
  try {
    // Parse date and time from startsAt
    const startsAt = event.startsAt;
    let date = '2025-08-28';
    let time = '12:00';
    
    if (startsAt && startsAt.includes(' ')) {
      const parts = startsAt.split(' ');
      date = parts[0];
      time = parts[1];
    } else if (startsAt) {
      date = startsAt;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: event.name || 'Untitled Event',
        description: event.description || '',
        date: date,
        time: time,
        location: event.venue || event.address || 'Unknown location',
        category: event.category || 'other'
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, event: result.data };
    } else {
      const error = await response.text();
      return { success: false, error: error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Process events in batches
async function processEventsInBatches() {
  console.log('🔄 Starting migration...');
  
  // Get existing events
  const existingEvents = await getExistingEvents();
  console.log(`📋 Found ${existingEvents.length} existing events in backend`);
  
  // Filter out duplicates
  const newEvents = filteredEvents.filter(event => !isDuplicate(event, existingEvents));
  console.log(`🆕 New events to add: ${newEvents.length}`);
  
  if (newEvents.length === 0) {
    console.log('✅ No new events to add!');
    return;
  }
  
  // Process in batches
  const batches = [];
  for (let i = 0; i < newEvents.length; i += BATCH_SIZE) {
    batches.push(newEvents.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} events each`);
  
  let totalAdded = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} events)`);
    
    const batchPromises = batch.map(async (event, index) => {
      const result = await addEventToBackend(event);
      if (result.success) {
        console.log(`  ✅ Added: ${event.name}`);
        return { success: true };
      } else {
        console.log(`  ❌ Failed: ${event.name} - ${result.error}`);
        return { success: false, error: result.error };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    const batchSuccesses = batchResults.filter(r => r.success).length;
    const batchErrors = batchResults.filter(r => !r.success).length;
    
    totalAdded += batchSuccesses;
    totalErrors += batchErrors;
    
    console.log(`  📊 Batch ${i + 1} results: ${batchSuccesses} added, ${batchErrors} errors`);
    
    // Delay between batches (except for the last batch)
    if (i < batches.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  console.log(`\n🎉 Migration completed!`);
  console.log(`📊 Total results:`);
  console.log(`   ✅ Successfully added: ${totalAdded}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   📋 Total events in backend now: ${existingEvents.length + totalAdded}`);
}

// Run the migration
processEventsInBatches().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
