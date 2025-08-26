const AsyncStorage = require('@react-native-async-storage/async-storage');

async function clearTokens() {
  try {
    console.log('🧹 Clearing old tokens from AsyncStorage...');
    
    // Remove old tokens
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user');
    
    console.log('✅ Old tokens cleared successfully');
    
    // Verify tokens are removed
    const authToken = await AsyncStorage.getItem('auth_token');
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    const user = await AsyncStorage.getItem('user');
    
    console.log('📊 After clearing - AuthToken:', !!authToken, 'RefreshToken:', !!refreshToken, 'User:', !!user);
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
    return false;
  }
}

// Run the clear function
clearTokens().then(success => {
  if (success) {
    console.log('🎉 Token clearing completed successfully!');
  } else {
    console.log('💥 Token clearing failed!');
  }
});
