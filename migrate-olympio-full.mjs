import fetch from 'node-fetch';

const OLYMPIO_BASE_URL = 'http://olympio.ee:4000/api';
const LOCAL_BASE_URL = 'http://localhost:4000/api';

async function migrateData() {
    console.log('🚀 Starting FULL migration from olympio.ee to local Docker environment...');
    
    try {
        // Step 1: Get auth token for test user
        console.log('🔐 Getting auth token...');
        const authResponse = await fetch(`${LOCAL_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@test.com',
                password: 'test123'
            })
        });
        
        const authData = await authResponse.json();
        if (!authData.success) {
            throw new Error('Failed to authenticate with test user');
        }
        
        const accessToken = authData.data.accessToken;
        console.log('✅ Authenticated successfully');
        
        // Step 2: Export all events from olympio.ee
        console.log('📥 Exporting events from olympio.ee...');
        const eventsResponse = await fetch(`${OLYMPIO_BASE_URL}/events`);
        const eventsData = await eventsResponse.json();
        
        if (!eventsData.success) {
            throw new Error('Failed to fetch events from olympio.ee');
        }
        
        const events = eventsData.data || [];
        console.log(`✅ Exported ${events.length} events from olympio.ee`);
        
        // Step 3: Import ALL events to local database
        console.log('📤 Importing ALL events to local database...');
        let importedEvents = 0;
        let failedEvents = 0;
        
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            try {
                const eventData = {
                    name: event.name,
                    description: event.description || '',
                    category: event.category || 'other',
                    venue: event.venue || '',
                    address: event.address || '',
                    latitude: parseFloat(event.latitude) || 59.436962,
                    longitude: parseFloat(event.longitude) || 24.753574,
                    startsAt: event.startsAt || event.starts_at || new Date().toISOString(),
                    url: event.url || ''
                };
                
                const response = await fetch(`${LOCAL_BASE_URL}/events`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(eventData)
                });
                
                if (response.ok) {
                    importedEvents++;
                    if (importedEvents % 100 === 0) {
                        console.log(`📊 Progress: ${importedEvents}/${events.length} events imported (${Math.round(importedEvents/events.length*100)}%)`);
                    }
                } else {
                    const errorData = await response.json();
                    console.log(`⚠️ Failed to import event "${event.name}": ${errorData.message || response.statusText}`);
                    failedEvents++;
                }
                
                // Add small delay to avoid overwhelming the server
                if (i % 50 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                failedEvents++;
                console.log(`⚠️ Failed to import event "${event.name}": ${error.message}`);
            }
        }
        
        console.log(`✅ FULL Migration completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Events imported: ${importedEvents}`);
        console.log(`   - Events failed: ${failedEvents}`);
        console.log(`   - Total events processed: ${events.length}`);
        console.log(`   - Success rate: ${Math.round(importedEvents/events.length*100)}%`);
        
        // Step 4: Verify migration
        console.log('🔍 Verifying migration...');
        const verifyResponse = await fetch(`${LOCAL_BASE_URL}/events`);
        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
            console.log(`✅ Local database now contains ${verifyData.data.length} events`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
migrateData();
