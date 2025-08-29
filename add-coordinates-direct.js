const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://165.22.90.180:4000/api';
const AUTH_TOKEN = 'ints@me.com_access_token_1756455873582';
const DEVICE_ID = '11c6b5f9-7c09-4819-9e42-1d5796439ed3';

// Headers for API requests
const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
  'X-Device-ID': DEVICE_ID
};

// Common Estonian venue coordinates (latitude, longitude)
const venueCoordinates = {
  'Tallinna Lauluväljak': [59.436962, 24.753574],
  'Vene Teater': [59.436962, 24.753574],
  'Eesti Rahva Muuseum': [58.377625, 26.729006],
  'Alexela Kontserdimaja': [59.436962, 24.753574],
  'Vanemuise Kontserdimaja': [58.377625, 26.729006],
  'Rakvere Teater': [59.352539, 26.360135],
  'Ugala Teater': [58.377625, 26.729006],
  'Endla Teater': [58.377625, 26.729006],
  'Estonia kontserdisaal': [59.436962, 24.753574],
  'Tallinna Raekoda': [59.436962, 24.753574],
  'Fotografiska Tallinn': [59.436962, 24.753574],
  'Unibet Arena': [59.436962, 24.753574],
  'Helitehas': [59.436962, 24.753574],
  'A. Le Coq Arena': [59.436962, 24.753574],
  'Kadrioru Staadion': [59.436962, 24.753574],
  'Viljandi lauluväljak': [58.3639, 25.5900],
  'Pärnu Eliisabeti kirik': [58.3854, 24.4966],
  'Pärnu Kontserdimaja': [58.3854, 24.4966],
  'Tartu Sadamateater': [58.377625, 26.729006],
  'Tartu Uus Teater': [58.377625, 26.729006],
  'Karlova Teater': [58.377625, 26.729006],
  'Vaba Lava Narva teatrikeskus': [59.3772, 28.1906],
  'Vene Kultuurikeskus': [59.436962, 24.753574],
  'Vene Noorsooteater': [59.436962, 24.753574],
  'Vene Nukuteater': [59.436962, 24.753574],
  'Eesti Noorsooteater': [59.436962, 24.753574],
  'Von Glehni teater': [59.436962, 24.753574],
  'Theatrumi saal': [59.436962, 24.753574],
  'Kellerteater': [59.436962, 24.753574],
  'Sakala 3 teatrimaja': [59.436962, 24.753574],
  'Piip ja Tuut Teater': [59.436962, 24.753574],
  'Teoteater': [59.436962, 24.753574],
  'Vaba Lava black box Salme Kultuurikeskuses': [59.436962, 24.753574],
  'Salme Kultuurikeskuse suur lava.': [59.436962, 24.753574],
  'Kumu Auditoorium': [59.436962, 24.753574],
  'Nukuteatrimuuseum': [59.436962, 24.753574],
  'Tallinna Botaanikaaed': [59.436962, 24.753574],
  'Hilton Tallinn Park Hotel': [59.436962, 24.753574],
  'Haapsalu Lossihoov': [58.9431, 23.5414],
  'Haapsalu Raudteejaam': [58.9431, 23.5414],
  'Kuressaare Teater': [58.2525, 22.4853],
  'Jõgeva kultuurikeskus': [58.7467, 26.3939],
  'Põlva Kultuuri- ja Huvikeskus': [58.0603, 27.0694],
  'Võru kultuurimaja KANNEL': [57.8339, 27.0194],
  'Paide Muusika- ja Teatrimaja': [58.8856, 25.5572],
  'Rapla Kultuurikeskus': [59.0072, 24.7928],
  'Jõhvi Kontserdimaja': [59.3592, 27.4131],
  'Narva linn': [59.3772, 28.1906],
  'Lietuvos žydų (litvakų) bendruomenė': [54.6872, 25.2797],
  'Dariaus ir Girėno stadionas': [54.6872, 25.2797],
  'Mežaparka Lielā estrāde': [56.9496, 24.1052],
  'Mihaila Čehova Rīgas Krievu teātris': [56.9496, 24.1052],
  'Lietuvos parodų ir kongresų centras LITEXPO': [54.6872, 25.2797],
  'Hanzas Perons': [56.9496, 24.1052],
  'Siguldas pilsdrupu estrāde': [57.1537, 24.8598],
  'Kiltsi lennuväli': [59.436962, 24.753574],
  'Lihula': [58.6814, 23.8453],
  'Taevapark': [58.0603, 27.0694],
  'Tuhala Kultuuritalu': [59.436962, 24.753574],
  'Hüüru mõis': [59.436962, 24.753574],
  'Ohtu mõis': [59.436962, 24.753574],
  'Österby Sadamaresto': [59.436962, 24.753574],
  'Kärdla Nukuteater': [58.9948, 22.7497],
  'Viljandi Pauluse kirik': [58.3639, 25.5900],
  'Luke mõis': [59.436962, 24.753574],
  'Hageri Rahvamaja': [59.436962, 24.753574],
  'Tõstamaa mõis': [58.2525, 22.4853],
  'Peningi mõis': [59.436962, 24.753574],
  'Elva Laululava': [58.2225, 26.4211],
  'Teatrikeskus Draakonipesa': [59.436962, 24.753574],
  'Tursa metsalava': [59.436962, 24.753574],
  'Tabasalu Kardirada': [59.436962, 24.753574],
  'Keeni Punker': [59.436962, 24.753574],
  'Tuum Teraapiaruum': [59.436962, 24.753574],
  'Lüdigi saal': [59.436962, 24.753574],
  'Vatican': [59.436962, 24.753574],
  'Siidrifarm': [59.436962, 24.753574],
  'Aamen Restoran': [59.436962, 24.753574],
  'Stuudio 3': [59.436962, 24.753574],
  'Nuustaku Villa': [59.436962, 24.753574],
  'Hearts Art Gallery': [59.436962, 24.753574],
  'Haven Kakumäe jahisadam': [59.436962, 24.753574],
  'Lasva järve kaldal': [58.0603, 27.0694],
  'Telliskivi M-hoone': [59.436962, 24.753574],
  'Kultuurikeskus Kaja': [59.436962, 24.753574],
  'Tartu Genialistide Klubi': [58.377625, 26.729006],
  'TÜ raamatukogu W. Struve 1': [58.377625, 26.729006],
  'Tartu Sadamateater': [58.377625, 26.729006],
  'Nõmme Kultuurikeskus': [59.436962, 24.753574],
  'Jazzklubi Philly Joe\'s': [59.436962, 24.753574],
  'Salme Kultuurikeskus': [59.436962, 24.753574],
  'Lennusadama angaar': [59.436962, 24.753574],
  'Anija mõis': [59.436962, 24.753574],
  'Lottemaa': [59.436962, 24.753574],
  'Narva mnt. 95, Tallinn, Estonia': [59.436962, 24.753574],
  'Rahvusooper Estonia': [59.436962, 24.753574],
  'Mardi talu hoovikontserdid': [59.436962, 24.753574],
  'Oru park': [59.436962, 24.753574],
  'Hobuveski': [59.436962, 24.753574],
  'Vihula mõis': [59.436962, 24.753574],
  'Kirna mõis': [59.436962, 24.753574],
  'Tervisetuba Ambrosia': [59.436962, 24.753574],
  'Ärkel Katusebaar': [59.436962, 24.753574],
  'Padise klooster': [59.436962, 24.753574],
  'Rannabaar Playa Võru': [57.8339, 27.0194],
  'Hobuvägi (Lai tn. 47)': [59.436962, 24.753574],
  'Vanalinn': [59.436962, 24.753574],
  'O2 restoran': [59.436962, 24.753574],
  'Vene Noorsooteatri ovaalsaal': [59.436962, 24.753574],
  'Narva loomeinkubaator OBJEKT': [59.3772, 28.1906],
  'Taju': [59.436962, 24.753574],
  'Haabersti jäähall': [59.436962, 24.753574],
  'Lasnamäe Centrum': [59.436962, 24.753574],
  'Teater Vanemuine': [58.377625, 26.729006],
  'Hobuvägi': [59.436962, 24.753574],
  'Mäetaguse mõis': [59.436962, 24.753574],
  'Vaba Lava Narva teatrikeskus': [59.3772, 28.1906],
  'Vaba Lava black box Salme Kultuurikeskuses': [59.436962, 24.753574],
  'Vaba Lava Narva teatrikeskus': [59.3772, 28.1906]
};

// Function to get coordinates for a location
function getCoordinates(location) {
  if (!location) return null;
  
  // Try exact match first
  if (venueCoordinates[location]) {
    return venueCoordinates[location];
  }
  
  // Try partial matches
  for (const [venue, coords] of Object.entries(venueCoordinates)) {
    if (location.toLowerCase().includes(venue.toLowerCase()) || 
        venue.toLowerCase().includes(location.toLowerCase())) {
      return coords;
    }
  }
  
  // Default to Tallinn if no match found
  console.log(`⚠️ No coordinates found for location: ${location}, using Tallinn default`);
  return [59.436962, 24.753574]; // Tallinn coordinates
}

// Function to update event with coordinates
async function updateEventCoordinates(eventId, latitude, longitude) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/events/${eventId}`,
      {
        latitude: latitude,
        longitude: longitude
      },
      { headers }
    );
    
    console.log(`✅ Updated event ${eventId} with coordinates: ${latitude}, ${longitude}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to update event ${eventId}:`, error.response?.data?.message || error.message);
    return false;
  }
}

// Main function to add coordinates to all events
async function addCoordinatesToEvents() {
  try {
    console.log('🔍 Fetching all events...');
    const response = await axios.get(`${API_BASE_URL}/events`, { headers });
    const events = response.data.data; // The events are in response.data.data
    
    console.log(`📊 Found ${events.length} events`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process events in smaller batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} (events ${i + 1}-${Math.min(i + batchSize, events.length)})`);
      
      for (const event of batch) {
        // Skip events that already have coordinates
        if (event.latitude && event.longitude && 
            event.latitude !== 0 && event.longitude !== 0) {
          console.log(`⏭️ Skipping event ${event.id} (${event.title}) - already has coordinates`);
          skippedCount++;
          continue;
        }
        
        // Get coordinates for the event location
        const coords = getCoordinates(event.location);
        if (!coords) {
          console.log(`⚠️ Could not get coordinates for event ${event.id} (${event.title})`);
          continue;
        }
        
        // Update the event
        const success = await updateEventCoordinates(event.id, coords[0], coords[1]);
        if (success) {
          updatedCount++;
        }
        
        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Add a delay between batches
      if (i + batchSize < events.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Summary:`);
    console.log(`✅ Updated: ${updatedCount} events`);
    console.log(`⏭️ Skipped: ${skippedCount} events (already had coordinates)`);
    console.log(`📊 Total processed: ${events.length} events`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

// Run the script
addCoordinatesToEvents();
