const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing marker flow in MapViewNative.tsx...\n');

const filePath = path.join(__dirname, 'src/components/MapViewNative.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Check for key components and functions
const checks = [
  {
    name: 'Marker import',
    pattern: /import.*Marker.*from.*react-native-maps/,
    required: true
  },
  {
    name: 'CustomMarker component',
    pattern: /const CustomMarker = React\.memo/,
    required: true
  },
  {
    name: 'ClusterMarker component',
    pattern: /const ClusterMarker = React\.memo/,
    required: true
  },
  {
    name: 'getMarkerIcon function',
    pattern: /const getMarkerIcon = \(category: string\)/,
    required: true
  },
  {
    name: 'getMarkerColor function',
    pattern: /const getMarkerColor = \(category: string\)/,
    required: true
  },
  {
    name: 'determineCategory function',
    pattern: /const determineCategory = \(name: string, description: string\)/,
    required: true
  },
  {
    name: 'memoizedMarkers creation',
    pattern: /const memoizedMarkers = useMemo/,
    required: true
  },
  {
    name: 'MapView with markers',
    pattern: /<MapView.*>[\s\S]*{memoizedMarkers}[\s\S]*<\/MapView>/,
    required: true
  },
  {
    name: 'Test marker',
    pattern: /Test.*Marker.*red/,
    required: true
  },
  {
    name: 'Debug logs',
    pattern: /console\.log.*🎯/,
    required: true
  }
];

console.log('📋 Component Analysis:');
checks.forEach(check => {
  const match = content.match(check.pattern);
  const status = match ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${match ? 'Found' : 'Missing'}`);
  
  if (!match && check.required) {
    console.log(`   ⚠️  This is required for marker functionality`);
  }
});

// Check for potential issues
console.log('\n🔍 Potential Issues Analysis:');

// Check if CustomMarker uses the correct props
const customMarkerProps = content.match(/const CustomMarker = React\.memo\(\([^)]+\) => \{/);
if (customMarkerProps) {
  console.log('✅ CustomMarker component found');
  
  // Check if it uses markerIcon and markerColor
  const usesIcon = content.includes('markerIcon') && content.includes('markerColor');
  console.log(`${usesIcon ? '✅' : '❌'} CustomMarker uses markerIcon and markerColor`);
  
  // Check markerText style
  const markerTextStyle = content.match(/markerText:\s*\{[^}]*fontSize[^}]*\}/);
  console.log(`${markerTextStyle ? '✅' : '❌'} markerText style with fontSize found`);
}

// Check if ClusterMarker uses the correct props
const clusterMarkerProps = content.match(/const ClusterMarker = React\.memo\(\([^)]+\) => \{/);
if (clusterMarkerProps) {
  console.log('✅ ClusterMarker component found');
  
  // Check if it uses clusterIcon
  const usesClusterIcon = content.includes('clusterIcon');
  console.log(`${usesClusterIcon ? '✅' : '❌'} ClusterMarker uses clusterIcon`);
}

// Check for event data structure
const eventInterface = content.match(/interface Event \{[\s\S]*?\}/);
if (eventInterface) {
  console.log('✅ Event interface found');
  
  // Check for required fields
  const hasLatitude = content.includes('latitude: number');
  const hasLongitude = content.includes('longitude: number');
  const hasName = content.includes('name: string');
  const hasDescription = content.includes('description: string');
  
  console.log(`${hasLatitude ? '✅' : '❌'} Event has latitude field`);
  console.log(`${hasLongitude ? '✅' : '❌'} Event has longitude field`);
  console.log(`${hasName ? '✅' : '❌'} Event has name field`);
  console.log(`${hasDescription ? '✅' : '❌'} Event has description field`);
}

// Check for category mapping
const categoryCases = content.match(/case ['"`][^'"`]+['"`]:/g);
if (categoryCases) {
  console.log(`✅ Found ${categoryCases.length} category cases in getMarkerColor/getMarkerIcon`);
  
  // Show some examples
  const examples = categoryCases.slice(0, 5);
  console.log(`   Examples: ${examples.join(', ')}`);
}

console.log('\n🎯 Next Steps:');
console.log('1. Run the app and check console logs for "🎯" prefixed messages');
console.log('2. Look for CustomMarker and ClusterMarker rendering logs');
console.log('3. Check if events have proper coordinates and categories');
console.log('4. Verify the test marker (red) appears on the map');
console.log('5. Check if custom markers with emoji icons are visible');

console.log('\n📱 To run the app:');
console.log('   npm start');
console.log('   Then press "a" for Android or "i" for iOS');
