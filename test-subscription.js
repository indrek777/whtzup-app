// Simple test to check subscription status
const { UserService } = require('./src/utils/userService');

async function testSubscription() {
  console.log('🧪 Testing subscription status...');
  
  const userService = new UserService();
  
  try {
    // Check authentication
    const isAuth = await userService.isAuthenticated();
    console.log('🔐 Is authenticated:', isAuth);
    
    if (!isAuth) {
      console.log('❌ User not authenticated - this is the problem!');
      return;
    }
    
    // Check subscription status
    const hasPremium = await userService.hasPremiumSubscription();
    console.log('🔍 Has premium subscription:', hasPremium);
    
    // Get user group
    const userGroup = await userService.getUserGroup();
    console.log('🔍 User group:', userGroup);
    
    // Check permissions
    const canCreate = await userService.canPerformAction('canCreateEvents');
    console.log('🔍 Can create events:', canCreate);
    
    const canCreateToday = await userService.canCreateEventToday();
    console.log('🔍 Can create event today:', canCreateToday);
    
    // Get current user
    const user = await userService.getCurrentUser();
    console.log('🔍 Current user subscription:', user?.subscription);
    
    if (!canCreate) {
      console.log('❌ PROBLEM: User cannot create events!');
      console.log('🔍 User group:', userGroup);
      console.log('🔍 Subscription status:', user?.subscription?.status);
      console.log('🔍 Has premium:', hasPremium);
    } else {
      console.log('✅ User can create events');
    }
    
  } catch (error) {
    console.error('❌ Error testing subscription:', error);
  }
}

testSubscription();
