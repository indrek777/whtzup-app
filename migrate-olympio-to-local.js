import fetch from 'node-fetch';

const OLYMPIO_BASE_URL = 'http://olympio.ee:4000/api';
const LOCAL_BASE_URL = 'http://localhost:4000/api';

async function migrateData() {
    console.log('🚀 Starting migration from olympio.ee to local Docker environment...');
    
    try {
        // Step 1: Export all events from olympio.ee
        console.log('📥 Exporting events from olympio.ee...');
        const eventsResponse = await fetch(`${OLYMPIO_BASE_URL}/events`);
        const eventsData = await eventsResponse.json();
        
        if (!eventsData.success) {
            throw new Error('Failed to fetch events from olympio.ee');
        }
        
        const events = eventsData.data || [];
        console.log(`✅ Exported ${events.length} events from olympio.ee`);
        
        // Step 2: Export all users from olympio.ee
        console.log('📥 Exporting users from olympio.ee...');
        const usersResponse = await fetch(`${OLYMPIO_BASE_URL}/users`);
        const usersData = await usersResponse.json();
        
        if (!usersData.success) {
            console.log('⚠️ Could not fetch users from olympio.ee, continuing with events only');
        }
        
        const users = usersData.data || [];
        console.log(`✅ Exported ${users.length} users from olympio.ee`);
        
        // Step 3: Clear local database (optional - comment out if you want to keep existing data)
        console.log('🧹 Clearing local database...');
        try {
            await fetch(`${LOCAL_BASE_URL}/admin/clear-all`, { method: 'POST' });
            console.log('✅ Local database cleared');
        } catch (error) {
            console.log('⚠️ Could not clear local database, continuing...');
        }
        
        // Step 4: Import users to local database
        if (users.length > 0) {
            console.log('📤 Importing users to local database...');
            let importedUsers = 0;
            
            for (const user of users) {
                try {
                    const userData = {
                        email: user.email,
                        password: 'migrated_user_123', // Default password for migrated users
                        name: user.name || user.email
                    };
                    
                    const response = await fetch(`${LOCAL_BASE_URL}/auth/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData)
                    });
                    
                    if (response.ok) {
                        importedUsers++;
                    }
                } catch (error) {
                    console.log(`⚠️ Failed to import user ${user.email}: ${error.message}`);
                }
            }
            
            console.log(`✅ Imported ${importedUsers} users to local database`);
        }
        
        // Step 5: Import events to local database
        console.log('📤 Importing events to local database...');
        let importedEvents = 0;
        let failedEvents = 0;
        
        for (const event of events) {
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
                
                if (response.ok) {
                    importedEvents++;
                    if (importedEvents % 100 === 0) {
                        console.log(`📊 Progress: ${importedEvents}/${events.length} events imported`);
                    }
                } else {
                    failedEvents++;
                }
            } catch (error) {
                failedEvents++;
                console.log(`⚠️ Failed to import event "${event.name}": ${error.message}`);
            }
        }
        
        console.log(`✅ Migration completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Events imported: ${importedEvents}`);
        console.log(`   - Events failed: ${failedEvents}`);
        console.log(`   - Users imported: ${users.length > 0 ? importedUsers : 'N/A'}`);
        
        // Step 6: Verify migration
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
