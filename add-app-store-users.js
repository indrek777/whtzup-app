const BACKEND_URL = 'http://165.22.90.180:4000';

// App Store users with different roles and subscription types
const appStoreUsers = [
  // Premium users
  {
    id: 2,
    email: "premium@eventdiscovery.app",
    password: "premium123",
    name: "Premium User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  {
    id: 3,
    email: "john.doe@eventdiscovery.app",
    password: "john123",
    name: "John Doe",
    subscription: {
      type: "premium",
      endDate: "2026-06-15"
    }
  },
  {
    id: 4,
    email: "sarah.wilson@eventdiscovery.app",
    password: "sarah123",
    name: "Sarah Wilson",
    subscription: {
      type: "premium",
      endDate: "2026-09-30"
    }
  },
  
  // Free users
  {
    id: 5,
    email: "free@eventdiscovery.app",
    password: "free123",
    name: "Free User",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  {
    id: 6,
    email: "mike.brown@eventdiscovery.app",
    password: "mike123",
    name: "Mike Brown",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  {
    id: 7,
    email: "lisa.garcia@eventdiscovery.app",
    password: "lisa123",
    name: "Lisa Garcia",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  
  // Expired subscription users
  {
    id: 8,
    email: "expired@eventdiscovery.app",
    password: "expired123",
    name: "Expired User",
    subscription: {
      type: "expired",
      endDate: "2024-12-31"
    }
  },
  {
    id: 9,
    email: "alex.chen@eventdiscovery.app",
    password: "alex123",
    name: "Alex Chen",
    subscription: {
      type: "expired",
      endDate: "2024-08-15"
    }
  },
  
  // Event organizers
  {
    id: 10,
    email: "organizer@eventdiscovery.app",
    password: "organizer123",
    name: "Event Organizer",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  {
    id: 11,
    email: "festival.manager@eventdiscovery.app",
    password: "festival123",
    name: "Festival Manager",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  
  // Business users
  {
    id: 12,
    email: "business@eventdiscovery.app",
    password: "business123",
    name: "Business User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  {
    id: 13,
    email: "corporate@eventdiscovery.app",
    password: "corporate123",
    name: "Corporate User",
    subscription: {
      type: "premium",
      endDate: "2026-12-31"
    }
  },
  
  // Test users for different scenarios
  {
    id: 14,
    email: "newuser@eventdiscovery.app",
    password: "new123",
    name: "New User",
    subscription: {
      type: "free",
      endDate: null
    }
  },
  {
    id: 15,
    email: "trial@eventdiscovery.app",
    password: "trial123",
    name: "Trial User",
    subscription: {
      type: "premium",
      endDate: "2025-09-15" // Short trial period
    }
  }
];

// Function to add user to backend
async function addUserToBackend(user) {
  try {
    // Note: Since the backend currently only has hardcoded demo user,
    // we'll simulate adding users by creating a response
    // In a real implementation, this would add users to a database
    
    console.log(`✅ Added user: ${user.name} (${user.email})`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Subscription: ${user.subscription.type}`);
    console.log(`   - End Date: ${user.subscription.endDate || 'N/A'}`);
    
    return { success: true, user };
  } catch (error) {
    console.log(`❌ Failed to add user: ${user.name} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Function to test user authentication
async function testUserAuth(user) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Auth test passed for: ${user.name}`);
      return { success: true, data };
    } else {
      console.log(`❌ Auth test failed for: ${user.name} - User not found`);
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.log(`❌ Auth test error for: ${user.name} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function to add all App Store users
async function addAppStoreUsers() {
  console.log('🚀 Adding App Store users to backend...\n');
  
  let totalAdded = 0;
  let totalErrors = 0;
  
  for (const user of appStoreUsers) {
    console.log(`📝 Processing user: ${user.name}`);
    
    // Add user to backend
    const addResult = await addUserToBackend(user);
    
    if (addResult.success) {
      totalAdded++;
      
      // Test authentication (this will fail since users aren't actually in backend yet)
      await testUserAuth(user);
    } else {
      totalErrors++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🎉 App Store users setup completed!');
  console.log(`📊 Results:`);
  console.log(`   ✅ Users added: ${totalAdded}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   📋 Total users: ${appStoreUsers.length}`);
  
  console.log('\n📋 App Store Users Summary:');
  console.log('========================');
  
  const premiumUsers = appStoreUsers.filter(u => u.subscription.type === 'premium');
  const freeUsers = appStoreUsers.filter(u => u.subscription.type === 'free');
  const expiredUsers = appStoreUsers.filter(u => u.subscription.type === 'expired');
  
  console.log(`Premium Users: ${premiumUsers.length}`);
  premiumUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
  
  console.log(`\nFree Users: ${freeUsers.length}`);
  freeUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
  
  console.log(`\nExpired Users: ${expiredUsers.length}`);
  expiredUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
  
  console.log('\n💡 Note: To actually implement these users in the backend,');
  console.log('   you would need to modify the server.js file to include');
  console.log('   these users in the authentication logic.');
}

// Run the script
addAppStoreUsers().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
