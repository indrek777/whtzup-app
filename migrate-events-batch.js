const fs = require('fs');
const path = require('path');

// Configuration
const BATCH_SIZE = 20; // Smaller batch size for individual requests
const API_BASE_URL = 'http://165.22.90.180:4000/api';
const EVENTS_FILE = 'data/events-user.json';

// Helper function to convert date format
function convertDateTime(startsAt) {
  if (!startsAt) return { date: null, time: null };
  
  try {
    const [datePart, timePart] = startsAt.split(' ');
    return {
      date: datePart,
      time: timePart || '00:00'
    };
  } catch (error) {
    console.log('⚠️ Error parsing date:', startsAt);
    return { date: null, time: null };
  }
}

// Helper function to determine category from event name/description
function determineCategory(name, description) {
  const text = (name + ' ' + description).toLowerCase();
  
  if (text.includes('jazz') || text.includes('music') || text.includes('concert') || text.includes('symphony')) {
    return 'Entertainment';
  }
  if (text.includes('food') || text.includes('wine') || text.includes('tasting') || text.includes('restaurant')) {
    return 'Food & Drink';
  }
  if (text.includes('basketball') || text.includes('sport') || text.includes('marathon') || text.includes('race')) {
    return 'Sports';
  }
  if (text.includes('art') || text.includes('gallery') || text.includes('exhibition') || text.includes('photography')) {
    return 'Arts & Culture';
  }
  if (text.includes('business') || text.includes('networking') || text.includes('conference') || text.includes('workshop')) {
    return 'Business';
  }
  if (text.includes('workshop') || text.includes('class') || text.includes('training') || text.includes('education')) {
    return 'Education';
  }
  
  return 'Entertainment'; // Default category
}

// Convert local event format to backend format
function convertEventFormat(localEvent, index) {
  const { date, time } = convertDateTime(localEvent.startsAt);
  const category = determineCategory(localEvent.name, localEvent.description);
  
  return {
    title: localEvent.name,
    description: localEvent.description,
    latitude: parseFloat(localEvent.latitude),
    longitude: parseFloat(localEvent.longitude),
    venue: localEvent.venue,
    address: localEvent.address,
    url: localEvent.url || '',
    source: localEvent.source || 'migrated',
    date: date,
    time: time,
    location: localEvent.address,
    category: category,
    createdBy: 1 // Default user ID
  };
}

// Create a single event
async function createEvent(eventData) {
  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ints@me.com_access_token_1756455873582'
      },
      body: JSON.stringify(eventData)
    });
    
    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Migrate a batch of events
async function migrateBatch(events, batchNumber, startIndex) {
  console.log(`\n🔄 Migrating batch ${batchNumber} (${events.length} events, starting from index ${startIndex})...`);
  
  const convertedEvents = events.map((event, index) => {
    const globalIndex = startIndex + index;
    return convertEventFormat(event, globalIndex);
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < convertedEvents.length; i++) {
    const eventData = convertedEvents[i];
    const eventIndex = startIndex + i;
    
    console.log(`  📝 Creating event ${eventIndex + 1}: ${eventData.title.substring(0, 50)}...`);
    
    const result = await createEvent(eventData);
    
    if (result.success) {
      successCount++;
      console.log(`    ✅ Event ${eventIndex + 1} created successfully`);
    } else {
      errorCount++;
      console.log(`    ❌ Event ${eventIndex + 1} failed: ${result.error}`);
    }
    
    // Small delay between individual requests
    if (i < convertedEvents.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`📊 Batch ${batchNumber} completed: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Main migration function
async function migrateEvents() {
  console.log('🚀 Starting event migration...');
  
  try {
    // Read events file
    const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    console.log(`📊 Found ${eventsData.length} events to migrate`);
    
    // Split into batches
    const batches = [];
    for (let i = 0; i < eventsData.length; i += BATCH_SIZE) {
      batches.push(eventsData.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Created ${batches.length} batches of ${BATCH_SIZE} events each`);
    
    // Migrate each batch
    let totalSuccessCount = 0;
    let totalErrorCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batchNumber = i + 1;
      const startIndex = i * BATCH_SIZE;
      const result = await migrateBatch(batches[i], batchNumber, startIndex);
      
      totalSuccessCount += result.successCount;
      totalErrorCount += result.errorCount;
      
      // Add delay between batches to avoid overwhelming the server
      if (i < batches.length - 1) {
        console.log('⏳ Waiting 3 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${totalSuccessCount} events`);
    console.log(`❌ Failed to migrate: ${totalErrorCount} events`);
    console.log(`📊 Total processed: ${totalSuccessCount + totalErrorCount} events`);
    
  } catch (error) {
    console.log('❌ Migration failed:', error.message);
  }
}

// Run migration
migrateEvents();
