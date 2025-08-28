// Server URLs
const OLYMPIO_URL = 'http://olympio.ee:4000';
const DIGITAL_OCEAN_URL = 'https://165.22.90.180:4001';

// Admin credentials for Digital Ocean
const ADMIN_EMAIL = 'admin@whtzup.com';
const ADMIN_PASSWORD = 'admin123456';

let currentToken = null;
let fetch;

// Initialize fetch
async function initFetch() {
  if (!fetch) {
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  }
}

// Function to get fresh token
async function getToken() {
  try {
    await initFetch();
    const response = await fetch(`${DIGITAL_OCEAN_URL}/api/auth/signin`, {
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
      throw new Error(`Failed to get token: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error getting token:', error.message);
    throw error;
  }
}

// Function to create event in Digital Ocean backend
async function createEvent(event) {
  try {
    await initFetch();
    
    if (!currentToken) {
      await getToken();
    }

    const response = await fetch(`${DIGITAL_OCEAN_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        name: event.name,
        description: event.description || '',
        category: event.category || 'other',
        venue: event.venue || '',
        address: event.address || '',
        latitude: event.latitude || '0',
        longitude: event.longitude || '0',
        startsAt: event.startsAt,
        source: 'olympio_migration_finish'
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`✅ Created: ${event.name}`);
      return { success: true, created: true };
    } else if (result.error && result.error.includes('already exists')) {
      console.log(`🔄 Skipping duplicate: ${event.name}`);
      return { success: true, created: false, duplicate: true };
    } else if (result.error && result.error.includes('Access token expired')) {
      console.log('🔄 Token expired, getting new token...');
      currentToken = null;
      await getToken();
      // Retry with new token
      return await createEvent(event);
    } else {
      console.log(`❌ Failed to create: ${event.name} - ${JSON.stringify(result)}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('🔄 Token expired, getting new token...');
      currentToken = null;
      return await createEvent(event); // Retry with new token
    }
    console.error(`❌ Error creating event ${event.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to fetch all events from Olympio.ee
async function fetchOlympioEvents() {
  try {
    await initFetch();
    console.log('📡 Fetching events from Olympio.ee...');
    const response = await fetch(`${OLYMPIO_URL}/api/events`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Olympio.ee: ${response.status}`);
    }

    const result = await response.json();
    console.log(`📊 Found ${result.data.length} events on Olympio.ee`);
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching from Olympio.ee:', error.message);
    throw error;
  }
}

// Function to fetch all events from Digital Ocean
async function fetchDigitalOceanEvents() {
  try {
    await initFetch();
    console.log('📡 Fetching events from Digital Ocean...');
    const response = await fetch(`${DIGITAL_OCEAN_URL}/api/events`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Digital Ocean: ${response.status}`);
    }

    const result = await response.json();
    console.log(`📊 Found ${result.data.length} events on Digital Ocean`);
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching from Digital Ocean:', error.message);
    throw error;
  }
}

// Main migration function
async function finishMigration() {
  try {
    console.log('🚀 Starting to finish migration from Olympio.ee to Digital Ocean...');
    
    // Get events from both servers
    const [olympioEvents, digitalOceanEvents] = await Promise.all([
      fetchOlympioEvents(),
      fetchDigitalOceanEvents()
    ]);

    // Create a set of existing event names and venues for quick lookup
    const existingEvents = new Set();
    digitalOceanEvents.forEach(event => {
      existingEvents.add(`${event.name}|${event.venue}`);
    });

    console.log(`📊 Existing events in Digital Ocean: ${existingEvents.size}`);

    // Find missing events
    const missingEvents = [];
    olympioEvents.forEach(event => {
      const eventKey = `${event.name}|${event.venue}`;
      if (!existingEvents.has(eventKey)) {
        missingEvents.push(event);
      }
    });

    console.log(`📊 Missing events to migrate: ${missingEvents.length}`);
    console.log(`📊 Total Olympio events: ${olympioEvents.length}`);
    console.log(`📊 Migration progress: ${olympioEvents.length - missingEvents.length}/${olympioEvents.length} (${Math.round((olympioEvents.length - missingEvents.length) / olympioEvents.length * 100)}%)`);

    if (missingEvents.length === 0) {
      console.log('🎉 All events are already migrated!');
      return;
    }

    let created = 0;
    let skipped = 0;
    let failed = 0;
    let total = missingEvents.length;

    console.log(`📦 Processing ${total} missing events...`);

    // Process events in batches
    const batchSize = 5; // Smaller batch size to avoid token expiration
    for (let i = 0; i < missingEvents.length; i += batchSize) {
      const batch = missingEvents.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(total/batchSize)} (${i + 1}-${Math.min(i + batchSize, total)})`);

      for (const event of batch) {
        const result = await createEvent(event);
        
        if (result.success) {
          if (result.created) {
            created++;
            existingEvents.add(`${event.name}|${event.venue}`);
          } else if (result.duplicate) {
            skipped++;
          }
        } else {
          failed++;
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Progress update
      console.log(`📊 Progress: ${created} created, ${failed} failed, ${skipped} skipped`);
      
      // Get fresh token after each batch to avoid expiration
      if (i + batchSize < missingEvents.length) {
        console.log('🔄 Getting fresh token for next batch...');
        currentToken = null;
        await getToken();
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Migration finished!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   🔄 Skipped: ${skipped}`);
    console.log(`   📦 Total processed: ${total}`);

    // Final count
    const finalCount = await fetchDigitalOceanEvents();
    console.log(`📊 Final event count in Digital Ocean: ${finalCount.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run migration
finishMigration();
