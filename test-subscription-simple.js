// Simple test to check subscription status without TypeScript dependencies
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing subscription status...');

// Check if user data exists
const userDataPath = path.join(__dirname, 'data', 'user.json');
const eventsDataPath = path.join(__dirname, 'data', 'events-user.json');

console.log('📁 Checking user data files...');

if (fs.existsSync(userDataPath)) {
  try {
    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    console.log('✅ User data found');
    console.log('🔍 User ID:', userData.id);
    console.log('🔍 User email:', userData.email);
    console.log('🔍 User group:', userData.userGroup);
    console.log('🔍 Subscription status:', userData.subscription?.status);
    console.log('🔍 Subscription plan:', userData.subscription?.plan);
    console.log('🔍 Subscription end date:', userData.subscription?.endDate);
    
    // Check if subscription is active
    if (userData.subscription?.endDate) {
      const endDate = new Date(userData.subscription.endDate);
      const now = new Date();
      const isActive = endDate > now;
      console.log('🔍 Subscription active:', isActive);
      console.log('🔍 End date:', endDate.toISOString());
      console.log('🔍 Current date:', now.toISOString());
    }
    
    // Check user group permissions
    const userGroups = {
      unregistered: {
        canCreateEvents: false,
        maxEventsPerDay: 0
      },
      registered: {
        canCreateEvents: true,
        maxEventsPerDay: 1
      },
      premium: {
        canCreateEvents: true,
        maxEventsPerDay: 50
      }
    };
    
    const group = userData.userGroup || 'unregistered';
    const permissions = userGroups[group];
    
    console.log('🔍 User group:', group);
    console.log('🔍 Can create events:', permissions.canCreateEvents);
    console.log('🔍 Max events per day:', permissions.maxEventsPerDay);
    
    if (!permissions.canCreateEvents) {
      console.log('❌ PROBLEM: User cannot create events based on group!');
    } else {
      console.log('✅ User can create events based on group');
    }
    
  } catch (error) {
    console.error('❌ Error reading user data:', error.message);
  }
} else {
  console.log('❌ User data file not found');
}

// Check events data
if (fs.existsSync(eventsDataPath)) {
  try {
    const eventsData = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8'));
    console.log('✅ Events data found');
    console.log('🔍 Total events:', eventsData.length);
    
    // Count events created today
    const today = new Date().toISOString().split('T')[0];
    const eventsToday = eventsData.filter(event => {
      const eventDate = new Date(event.createdAt).toISOString().split('T')[0];
      return eventDate === today;
    });
    
    console.log('🔍 Events created today:', eventsToday.length);
    
  } catch (error) {
    console.error('❌ Error reading events data:', error.message);
  }
} else {
  console.log('❌ Events data file not found');
}

console.log('\n🔍 Summary:');
console.log('1. Check if user is authenticated');
console.log('2. Check if subscription status is "premium"');
console.log('3. Check if subscription is not expired');
console.log('4. Check if user group is set to "premium"');
console.log('5. Check if daily event limit is not reached');
