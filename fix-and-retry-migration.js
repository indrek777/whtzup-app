const fs = require('fs');
const path = require('path');

// Configuration
const BATCH_SIZE = 20;
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
  
  if (text.includes('jazz') || text.includes('music') || text.includes('concert') || text.includes('symphony') || text.includes('kitarr') || text.includes('kontsert')) {
    return 'Entertainment';
  }
  if (text.includes('food') || text.includes('wine') || text.includes('tasting') || text.includes('restaurant')) {
    return 'Food & Drink';
  }
  if (text.includes('basketball') || text.includes('sport') || text.includes('marathon') || text.includes('race') || text.includes('mäng')) {
    return 'Sports';
  }
  if (text.includes('art') || text.includes('gallery') || text.includes('exhibition') || text.includes('photography') || text.includes('teater') || text.includes('lavastus')) {
    return 'Arts & Culture';
  }
  if (text.includes('business') || text.includes('networking') || text.includes('conference') || text.includes('workshop')) {
    return 'Business';
  }
  if (text.includes('workshop') || text.includes('class') || text.includes('training') || text.includes('education') || text.includes('festival')) {
    return 'Education';
  }
  
  return 'Entertainment'; // Default category
}

// Fix missing fields in event data
function fixEventData(localEvent, index) {
  const { date, time } = convertDateTime(localEvent.startsAt);
  const category = determineCategory(localEvent.name, localEvent.description);
  
  // Fix missing venue - use address if venue is empty
  const venue = localEvent.venue || localEvent.address || 'Unknown Venue';
  
  // Fix missing description
  const description = localEvent.description || `Event: ${localEvent.name}`;
  
  // Fix missing address - use venue if address is empty
  const address = localEvent.address || localEvent.venue || 'Unknown Address';
  
  return {
    title: localEvent.name,
    description: description,
    latitude: parseFloat(localEvent.latitude),
    longitude: parseFloat(localEvent.longitude),
    venue: venue,
    address: address,
    url: localEvent.url || '',
    source: localEvent.source || 'migrated',
    date: date,
    time: time,
    location: address,
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

// Retry failed events (events that were missing required fields)
async function retryFailedEvents() {
  console.log('🔄 Retrying failed events with fixed data...');
  
  try {
    // Read events file
    const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    console.log(`📊 Found ${eventsData.length} events total`);
    
    // Find events that likely failed due to missing fields
    const failedEvents = [];
    for (let i = 0; i < eventsData.length; i++) {
      const event = eventsData[i];
      if (!event.venue || !event.description || !event.address) {
        failedEvents.push({ event, index: i });
      }
    }
    
    console.log(`🔧 Found ${failedEvents.length} events with missing fields to retry`);
    
    if (failedEvents.length === 0) {
      console.log('✅ No events to retry!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < failedEvents.length; i++) {
      const { event, index } = failedEvents[i];
      const eventData = fixEventData(event, index);
      
      console.log(`📝 Retrying event ${index + 1}: ${eventData.title.substring(0, 50)}...`);
      console.log(`   Fixed venue: ${eventData.venue}`);
      console.log(`   Fixed description: ${eventData.description.substring(0, 50)}...`);
      
      const result = await createEvent(eventData);
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ Event ${index + 1} created successfully`);
      } else {
        errorCount++;
        console.log(`   ❌ Event ${index + 1} failed: ${result.error}`);
      }
      
      // Small delay between requests
      if (i < failedEvents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('\n🎉 Retry migration completed!');
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`❌ Failed to migrate: ${errorCount} events`);
    
  } catch (error) {
    console.log('❌ Retry migration failed:', error.message);
  }
}

// Run retry
retryFailedEvents();
