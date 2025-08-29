const fs = require('fs');
const path = require('path');

// Configuration
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

// Test migration with 5 events
async function testMigration() {
  console.log('🧪 Testing migration with 5 events...');
  
  try {
    // Read events file
    const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    console.log(`📊 Found ${eventsData.length} events total`);
    
    // Take first 5 events
    const testEvents = eventsData.slice(0, 5);
    console.log(`🧪 Testing with first ${testEvents.length} events`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < testEvents.length; i++) {
      const localEvent = testEvents[i];
      const eventData = convertEventFormat(localEvent, i);
      
      console.log(`\n📝 Creating event ${i + 1}: ${eventData.title}`);
      console.log(`   Category: ${eventData.category}`);
      console.log(`   Date: ${eventData.date} ${eventData.time}`);
      console.log(`   Location: ${eventData.venue}, ${eventData.address}`);
      
      const result = await createEvent(eventData);
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ Event ${i + 1} created successfully`);
      } else {
        errorCount++;
        console.log(`   ❌ Event ${i + 1} failed: ${result.error}`);
      }
      
      // Small delay between requests
      if (i < testEvents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n🎉 Test migration completed!');
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`❌ Failed to migrate: ${errorCount} events`);
    
    if (successCount > 0) {
      console.log('\n✅ Test successful! Ready to run full migration.');
    } else {
      console.log('\n❌ Test failed! Need to fix issues before full migration.');
    }
    
  } catch (error) {
    console.log('❌ Test migration failed:', error.message);
  }
}

// Run test
testMigration();
