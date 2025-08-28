const { UserService } = require('./src/utils/userService');

async function debugSubscription() {
  console.log('🔍 Debugging subscription status...');
  
  const userService = new UserService();
  
  try {
    // Check if user is authenticated
    const isAuth = await userService.isAuthenticated();
    console.log('🔐 Is authenticated:', isAuth);
    
    if (!isAuth) {
      console.log('❌ User not authenticated');
      return;
    }
    
    // Check subscription status
    const hasPremium = await userService.hasPremiumSubscription();
    console.log('🔍 Has premium subscription:', hasPremium);
    
    // Get user group
    const userGroup = await userService.getUserGroup();
    console.log('🔍 User group:', userGroup);
    
    // Get user group features
    const features = await userService.getUserGroupFeatures();
    console.log('🔍 User group features:', features);
    
    // Check if can create events
    const canCreate = await userService.canPerformAction('canCreateEvents');
    console.log('🔍 Can create events:', canCreate);
    
    // Check daily limit
    const canCreateToday = await userService.canCreateEventToday();
    console.log('🔍 Can create event today:', canCreateToday);
    
    // Get current user data
    const currentUser = await userService.getCurrentUser();
    console.log('🔍 Current user subscription:', currentUser?.subscription);
    
  } catch (error) {
    console.error('❌ Error debugging subscription:', error);
  }
}

debugSubscription();
