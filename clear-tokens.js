const AsyncStorage = require('@react-native-async-storage/async-storage');

// Clear all stored authentication data
async function clearTokens() {
  try {
    console.log('🧹 Clearing stored authentication tokens...');
    
    // Clear all authentication-related storage
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refresh_token');
    
    console.log('✅ All authentication tokens cleared');
    console.log('🔄 User will need to sign in again');
    
  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
  }
}

clearTokens();
