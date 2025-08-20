// Test script for frontend permission logic
// This simulates the userService.canEditEvent logic

// Mock user data
const mockUsers = {
  freeUser: {
    id: 'user-123',
    subscription: {
      status: 'free',
      endDate: null
    }
  },
  premiumUser: {
    id: 'user-456',
    subscription: {
      status: 'premium',
      endDate: new Date(Date.now() + 86400000 * 30).toISOString() // 30 days from now
    }
  },
  expiredPremiumUser: {
    id: 'user-789',
    subscription: {
      status: 'premium',
      endDate: new Date(Date.now() - 86400000).toISOString() // 1 day ago (expired)
    }
  }
};

  // Mock events
  const mockEvents = {
    ownEvent: {
      id: 'event-1',
      createdBy: 'user-123',
      source: 'user'
    },
    otherUserEvent: {
      id: 'event-2',
      createdBy: 'user-456',
      source: 'user'
    },
    legacyEvent: {
      id: 'event-3',
      source: 'user' // Legacy format without createdBy
    },
    publicEvent: {
      id: 'event-4',
      source: 'public'
    },
    otherUserEventNoSource: {
      id: 'event-5',
      createdBy: 'user-456'
      // No source field
    }
  };

  // Simulate the canEditEvent logic
  function canEditEvent(user, event) {
    // If not authenticated, cannot edit any events
    if (!user) return false;
    
    // If user has premium subscription, they can edit any event
    if (user.subscription.status === 'premium') {
      if (user.subscription.endDate) {
        const endDate = new Date(user.subscription.endDate);
        const now = new Date();
        if (endDate > now) {
          return true; // Premium and not expired
        }
      }
    }
    
    // For free users, they can only edit events they created
    // Check if the event was created by the current user
    if (event.createdBy === user.id) return true;
    
    // Legacy check: if event has source 'user' but no createdBy, allow edit
    // This is for backward compatibility with old events
    if (event.source === 'user' && !event.createdBy) return true;
    
    return false;
  }

// Test cases
function runTests() {
  console.log('🧪 Testing Frontend Permission Logic\n');

  // Test 1: Unauthenticated user
  console.log('1️⃣ Unauthenticated user:');
  console.log(`   - Own event: ${canEditEvent(null, mockEvents.ownEvent)} (should be false)`);
  console.log(`   - Other user's event: ${canEditEvent(null, mockEvents.otherUserEvent)} (should be false)`);
  console.log(`   - Public event: ${canEditEvent(null, mockEvents.publicEvent)} (should be false)`);

  // Test 2: Free user
  console.log('\n2️⃣ Free user:');
  console.log(`   - Own event: ${canEditEvent(mockUsers.freeUser, mockEvents.ownEvent)} (should be true)`);
  console.log(`   - Other user's event: ${canEditEvent(mockUsers.freeUser, mockEvents.otherUserEvent)} (should be false)`);
  console.log(`   - Legacy event (no createdBy): ${canEditEvent(mockUsers.freeUser, mockEvents.legacyEvent)} (should be true - legacy support)`);
  console.log(`   - Public event: ${canEditEvent(mockUsers.freeUser, mockEvents.publicEvent)} (should be false)`);
  console.log(`   - Other user's event (no source): ${canEditEvent(mockUsers.freeUser, mockEvents.otherUserEventNoSource)} (should be false)`);

  // Test 3: Premium user
  console.log('\n3️⃣ Premium user:');
  console.log(`   - Own event: ${canEditEvent(mockUsers.premiumUser, mockEvents.ownEvent)} (should be true)`);
  console.log(`   - Other user's event: ${canEditEvent(mockUsers.premiumUser, mockEvents.otherUserEvent)} (should be true)`);
  console.log(`   - Legacy event: ${canEditEvent(mockUsers.premiumUser, mockEvents.legacyEvent)} (should be true)`);
  console.log(`   - Public event: ${canEditEvent(mockUsers.premiumUser, mockEvents.publicEvent)} (should be true)`);

  // Test 4: Expired premium user
  console.log('\n4️⃣ Expired premium user:');
  console.log(`   - Own event: ${canEditEvent(mockUsers.expiredPremiumUser, mockEvents.ownEvent)} (should be true)`);
  console.log(`   - Other user's event: ${canEditEvent(mockUsers.expiredPremiumUser, mockEvents.otherUserEvent)} (should be false)`);
  console.log(`   - Legacy event: ${canEditEvent(mockUsers.expiredPremiumUser, mockEvents.legacyEvent)} (should be true)`);
  console.log(`   - Public event: ${canEditEvent(mockUsers.expiredPremiumUser, mockEvents.publicEvent)} (should be false)`);

  // Test 5: Edge cases
  console.log('\n5️⃣ Edge cases:');
  const eventWithoutCreatedBy = { id: 'event-5', source: 'user' };
  console.log(`   - Event without createdBy: ${canEditEvent(mockUsers.freeUser, eventWithoutCreatedBy)} (should be true - legacy support)`);
  
  const eventWithoutSource = { id: 'event-6', createdBy: 'user-123' };
  console.log(`   - Event without source: ${canEditEvent(mockUsers.freeUser, eventWithoutSource)} (should be true - own event)`);

  console.log('\n🎉 Frontend permission logic test completed!');
}

// Run the tests
runTests();
