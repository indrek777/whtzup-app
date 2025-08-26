const AsyncStorage = require('@react-native-async-storage/async-storage');

async function clearCache() {
  try {
    console.log('🧹 Clearing all cached events from AsyncStorage...');
    
    // Remove all event-related cache
    await AsyncStorage.removeItem('cachedEvents');
    await AsyncStorage.removeItem('event-events');
    await AsyncStorage.removeItem('sharedEvents');
    await AsyncStorage.removeItem('lastSync');
    await AsyncStorage.removeItem('lastUpdateCheck');
    
    console.log('✅ All cached events cleared successfully');
    
    // Verify cache is cleared
    const cachedEvents = await AsyncStorage.getItem('cachedEvents');
    const eventEvents = await AsyncStorage.getItem('event-events');
    const sharedEvents = await AsyncStorage.getItem('sharedEvents');
    
    console.log('📊 After clearing - CachedEvents:', !!cachedEvents, 'EventEvents:', !!eventEvents, 'SharedEvents:', !!sharedEvents);
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
}

// Run the clear function
clearCache().then((success) => {
  if (success) {
    console.log('🎉 Cache cleared successfully! App will now load fresh events from backend.');
  } else {
    console.log('❌ Failed to clear cache');
  }
  process.exit(0);
});
