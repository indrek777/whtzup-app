// Test script to debug marker rendering issues
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing marker rendering flow...');

// Check if the MapViewNative component exists
const mapViewPath = path.join(__dirname, 'src', 'components', 'MapViewNative.tsx');
if (fs.existsSync(mapViewPath)) {
  console.log('✅ MapViewNative.tsx found');
  
  const content = fs.readFileSync(mapViewPath, 'utf8');
  
  // Check for marker-related functions
  const hasGetMarkerColor = content.includes('getMarkerColor');
  const hasGetMarkerIcon = content.includes('getMarkerIcon');
  const hasCustomMarker = content.includes('CustomMarker');
  const hasClusterMarker = content.includes('ClusterMarker');
  const hasMemoizedMarkers = content.includes('memoizedMarkers');
  
  console.log('🔍 Marker function checks:');
  console.log(`  - getMarkerColor: ${hasGetMarkerColor ? '✅' : '❌'}`);
  console.log(`  - getMarkerIcon: ${hasGetMarkerIcon ? '✅' : '❌'}`);
  console.log(`  - CustomMarker component: ${hasCustomMarker ? '✅' : '❌'}`);
  console.log(`  - ClusterMarker component: ${hasClusterMarker ? '✅' : '❌'}`);
  console.log(`  - memoizedMarkers: ${hasMemoizedMarkers ? '✅' : '❌'}`);
  
  // Check for MapView and Marker imports
  const hasMapViewImport = content.includes("import MapView");
  const hasMarkerImport = content.includes("import.*Marker");
  
  console.log('🔍 Import checks:');
  console.log(`  - MapView import: ${hasMapViewImport ? '✅' : '❌'}`);
  console.log(`  - Marker import: ${hasMarkerImport ? '✅' : '❌'}`);
  
  // Check for marker rendering in MapView
  const hasMarkerRendering = content.includes('<Marker') && content.includes('</Marker>');
  const hasMemoizedMarkersRendering = content.includes('{memoizedMarkers}');
  
  console.log('🔍 Rendering checks:');
  console.log(`  - Marker tags: ${hasMarkerRendering ? '✅' : '❌'}`);
  console.log(`  - memoizedMarkers rendering: ${hasMemoizedMarkersRendering ? '✅' : '❌'}`);
  
  // Check for debugging logs
  const hasDebugLogs = content.includes('console.log.*🎯');
  console.log(`  - Debug logs: ${hasDebugLogs ? '✅' : '❌'}`);
  
} else {
  console.log('❌ MapViewNative.tsx not found');
}

// Check package.json for react-native-maps
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const hasReactNativeMaps = packageJson.dependencies && packageJson.dependencies['react-native-maps'];
  
  console.log('🔍 Dependencies check:');
  console.log(`  - react-native-maps: ${hasReactNativeMaps ? '✅' : '❌'}`);
  if (hasReactNativeMaps) {
    console.log(`    Version: ${hasReactNativeMaps}`);
  }
}

console.log('\n🎯 Next steps:');
console.log('1. Run the app and check console logs for marker creation');
console.log('2. Look for "🎯" prefixed logs to see marker rendering flow');
console.log('3. Check if markers are being created but not visible');
console.log('4. Verify that events have proper coordinates and categories');
