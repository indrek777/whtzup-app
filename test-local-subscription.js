// Test local subscription logic without backend
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing local subscription logic...');

// Mock user data with premium subscription
const mockUserWithPremium = {
  id: 'test-user-1',
  email: 'premium@test.com',
  name: 'Premium User',
  userGroup: 'premium',
  subscription: {
    status: 'premium',
    plan: 'monthly',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2026-01-01T00:00:00.000Z', // Future date (not expired)
    autoRenew: true,
    features: ['unlimited_events', 'advanced_search', 'priority_support']
  }
};

// Mock user data without premium subscription
const mockUserWithoutPremium = {
  id: 'test-user-2',
  email: 'free@test.com',
  name: 'Free User',
  userGroup: 'registered',
  subscription: {
    status: 'free',
    plan: null,
    startDate: null,
    endDate: null,
    autoRenew: false,
    features: ['basic_search', 'basic_filtering']
  }
};

// User group configuration
const USER_GROUP_CONFIG = {
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

// Test function to check if user can create events
function canUserCreateEvents(user) {
  console.log(`\n🔍 Testing user: ${user.name} (${user.email})`);
  console.log(`🔍 User group: ${user.userGroup}`);
  console.log(`🔍 Subscription status: ${user.subscription?.status}`);
  
  // Check user group permissions
  const groupConfig = USER_GROUP_CONFIG[user.userGroup] || USER_GROUP_CONFIG.unregistered;
  console.log(`🔍 Can create events (group): ${groupConfig.canCreateEvents}`);
  console.log(`🔍 Max events per day: ${groupConfig.maxEventsPerDay}`);
  
  // Check subscription status
  let hasActiveSubscription = false;
  if (user.subscription?.status === 'premium') {
    if (user.subscription.endDate) {
      const endDate = new Date(user.subscription.endDate);
      const now = new Date();
      hasActiveSubscription = endDate > now;
      console.log(`🔍 Subscription end date: ${endDate.toISOString()}`);
      console.log(`🔍 Current date: ${now.toISOString()}`);
      console.log(`🔍 Subscription active: ${hasActiveSubscription}`);
    } else {
      hasActiveSubscription = true;
      console.log(`🔍 Subscription active (no end date): ${hasActiveSubscription}`);
    }
  }
  
  // Final result
  const canCreate = groupConfig.canCreateEvents && (user.userGroup === 'premium' ? hasActiveSubscription : true);
  console.log(`🔍 Final result - Can create events: ${canCreate}`);
  
  return canCreate;
}

// Test both users
console.log('=== TESTING PREMIUM USER ===');
const premiumCanCreate = canUserCreateEvents(mockUserWithPremium);

console.log('\n=== TESTING FREE USER ===');
const freeCanCreate = canUserCreateEvents(mockUserWithoutPremium);

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Premium user can create events: ${premiumCanCreate}`);
console.log(`Free user can create events: ${freeCanCreate}`);

if (premiumCanCreate && !freeCanCreate) {
  console.log('✅ Test passed: Premium users can create events, free users cannot');
} else if (!premiumCanCreate) {
  console.log('❌ PROBLEM: Premium user cannot create events!');
  console.log('🔍 Possible issues:');
  console.log('  1. Subscription is expired');
  console.log('  2. User group is not set to "premium"');
  console.log('  3. Subscription status is not "premium"');
} else if (freeCanCreate) {
  console.log('⚠️  WARNING: Free user can create events (this might be intended)');
}
