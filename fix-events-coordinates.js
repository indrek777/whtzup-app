const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://165.22.90.180:4000/api';
const EVENTS_FILE = 'data/events-user.json';

// Common location coordinates (latitude, longitude)
const LOCATION_COORDINATES = {
  'tallinn': [59.436962, 24.753574],
  'tartu': [58.377625, 26.729006],
  'pärnu': [58.385808, 24.496577],
  'narva': [59.377222, 28.190278],
  'kohtla-järve': [59.398611, 27.273889],
  'viljandi': [58.363889, 25.590000],
  'rakvere': [59.346667, 26.355833],
  'maardu': [59.476667, 25.025000],
  'kuressaare': [58.252778, 22.485278],
  'sillamäe': [59.399722, 27.754722],
  'valga': [57.777778, 26.047222],
  'võru': [57.833333, 27.016667],
  'jõhvi': [59.359167, 27.421111],
  'haapsalu': [58.943889, 23.541389],
  'keila': [59.303889, 24.413889],
  'paide': [58.885556, 25.557222],
  'türi': [58.808889, 25.432500],
  'elva': [58.222778, 26.421111],
  'saue': [59.320833, 24.552778],
  'kiviõli': [59.352778, 26.971111],
  'põlva': [58.055556, 27.069444],
  'jõgeva': [58.746667, 26.393889],
  'tapa': [59.260556, 25.958889],
  'rapla': [59.007222, 24.792778],
  'kardla': [58.997778, 22.749167],
  'räpina': [58.098889, 27.463889],
  'narva-jõesuu': [59.463889, 28.040833],
  'põltsamaa': [58.652778, 25.970556],
  'kunda': [59.483889, 26.538889],
  'kallaste': [58.655556, 27.161667],
  'oru': [59.366667, 27.466667],
  'suure-jaani': [58.536111, 25.470833],
  'kõpu': [58.283333, 24.783333],
  'võhma': [58.628889, 25.556667],
  'antsla': [57.825556, 26.540556],
  'lüganuse': [59.380556, 27.076667],
  'nõo': [58.275556, 26.537500],
  'põlva': [58.055556, 27.069444],
  'estonia': [58.377625, 26.729006], // Default for Estonia
  'default': [59.436962, 24.753574] // Tallinn as default
};

// Helper function to determine coordinates from venue/address
function getCoordinatesFromLocation(venue, address) {
  const locationText = (venue + ' ' + (address || '')).toLowerCase();
  
  // Check for specific cities/locations
  for (const [location, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (locationText.includes(location)) {
      return coords;
    }
  }
  
  // Check for common venue types and assign nearby coordinates
  if (locationText.includes('restaurant') || locationText.includes('cafe') || locationText.includes('bar')) {
    return LOCATION_COORDINATES.tallinn; // Most restaurants are in cities
  }
  
  if (locationText.includes('theater') || locationText.includes('cinema') || locationText.includes('museum')) {
    return LOCATION_COORDINATES.tallinn; // Cultural venues usually in cities
  }
  
  if (locationText.includes('park') || locationText.includes('beach') || locationText.includes('forest')) {
    return LOCATION_COORDINATES.pärnu; // Parks and nature areas
  }
  
  if (locationText.includes('stadium') || locationText.includes('arena') || locationText.includes('gym')) {
    return LOCATION_COORDINATES.tallinn; // Sports venues
  }
  
  // Default to Tallinn if no specific location found
  return LOCATION_COORDINATES.default;
}

// Update event coordinates
async function updateEventCoordinates(eventId, latitude, longitude) {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ints@me.com_access_token_1756455873582'
      },
      body: JSON.stringify({
        latitude: latitude,
        longitude: longitude
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Process events and add coordinates
async function fixEventCoordinates() {
  console.log('🔧 Starting coordinate fix for events...');
  
  try {
    // Read events file
    const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    console.log(`📊 Found ${eventsData.length} events to process`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < eventsData.length; i++) {
      const event = eventsData[i];
      
      // Check if event has valid coordinates (not 0,0)
      const hasValidCoordinates = event.latitude && event.longitude && 
                                 parseFloat(event.latitude) !== 0 && 
                                 parseFloat(event.longitude) !== 0;
      
      if (!hasValidCoordinates) {
        console.log(`📍 Event ${i + 1}: ${event.name} - Missing coordinates`);
        
        // Get coordinates from venue/address
        const [latitude, longitude] = getCoordinatesFromLocation(event.venue, event.address);
        
        console.log(`  📍 Assigning coordinates: ${latitude}, ${longitude}`);
        
        // Update the event data
        event.latitude = latitude.toString();
        event.longitude = longitude.toString();
        
        // Try to update on server (but don't fail if server is down)
        try {
          const result = await updateEventCoordinates(event.id, latitude, longitude);
          if (result.success) {
            console.log(`    ✅ Updated on server`);
          } else {
            console.log(`    ⚠️ Server update failed: ${result.error}`);
          }
        } catch (error) {
          console.log(`    ⚠️ Server update failed: ${error.message}`);
        }
        
        updatedCount++;
      } else {
        console.log(`✅ Event ${i + 1}: ${event.name} - Has valid coordinates`);
      }
    }
    
    // Save updated events back to file
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsData, null, 2));
    
    console.log('\n🎉 Coordinate fix completed!');
    console.log(`✅ Updated ${updatedCount} events with coordinates`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Updated file: ${EVENTS_FILE}`);
    
  } catch (error) {
    console.log('❌ Error fixing coordinates:', error.message);
  }
}

// Run the fix
fixEventCoordinates();
