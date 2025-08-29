
// Force Fresh Login Script
// Run this in the React Native app to clear old tokens and get proper JWT tokens

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function forceFreshLogin() {
  try {
    console.log('🧹 Clearing all stored authentication data...');
    
    // Clear all authentication-related storage
    await AsyncStorage.removeItem('user_profile');
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user_preferences');
    await AsyncStorage.removeItem('user_subscription');
    await AsyncStorage.removeItem('user_group');
    
    console.log('✅ All authentication data cleared');
    console.log('🔄 App will now require fresh login with proper JWT tokens');
    
    // Force app restart or redirect to login
    return true;
  } catch (error) {
    console.error('❌ Error clearing authentication data:', error);
    return false;
  }
}

// Usage: Call this function when the app starts to force fresh login
// await forceFreshLogin();
