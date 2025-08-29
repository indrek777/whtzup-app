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

// Sample events with coordinates for different Estonian cities
const sampleEvents = [
  {
    name: "Tallinn Jazz Festival 2025",
    description: "Annual jazz festival featuring local and international artists",
    category: "entertainment",
    venue: "Tallinna Lauluväljak",
    address: "Tallinn, Estonia",
    latitude: 59.436962,
    longitude: 24.753574,
    startsAt: "2025-09-15T18:00:00Z"
  },
  {
    name: "Tartu University Concert",
    description: "Classical music concert at the university hall",
    category: "entertainment",
    venue: "Tartu Ülikooli Aula",
    address: "Tartu, Estonia",
    latitude: 58.377625,
    longitude: 26.729006,
    startsAt: "2025-09-20T19:00:00Z"
  },
  {
    name: "Pärnu Beach Party",
    description: "Summer beach party with live music and food",
    category: "entertainment",
    venue: "Pärnu Beach",
    address: "Pärnu, Estonia",
    latitude: 58.385625,
    longitude: 24.497574,
    startsAt: "2025-09-25T20:00:00Z"
  },
  {
    name: "Viljandi Folk Festival",
    description: "Traditional Estonian folk music festival",
    category: "entertainment",
    venue: "Viljandi Castle",
    address: "Viljandi, Estonia",
    latitude: 58.363625,
    longitude: 25.590006,
    startsAt: "2025-09-30T17:00:00Z"
  },
  {
    name: "Rakvere Theater Night",
    description: "Evening of theater performances",
    category: "entertainment",
    venue: "Rakvere Teater",
    address: "Rakvere, Estonia",
    latitude: 59.352539,
    longitude: 26.360135,
    startsAt: "2025-10-05T19:30:00Z"
  },
  {
    name: "Haapsalu Art Exhibition",
    description: "Contemporary art exhibition featuring local artists",
    category: "art",
    venue: "Haapsalu Kunstikool",
    address: "Haapsalu, Estonia",
    latitude: 58.943625,
    longitude: 23.540006,
    startsAt: "2025-10-10T14:00:00Z"
  },
  {
    name: "Paide Sports Tournament",
    description: "Annual sports tournament for all ages",
    category: "sports",
    venue: "Paide Spordikeskus",
    address: "Paide, Estonia",
    latitude: 58.885625,
    longitude: 25.557574,
    startsAt: "2025-10-15T10:00:00Z"
  },
  {
    name: "Keila Music Festival",
    description: "Local music festival with various genres",
    category: "entertainment",
    venue: "Keila Kultuurikeskus",
    address: "Keila, Estonia",
    latitude: 59.303625,
    longitude: 24.420006,
    startsAt: "2025-10-20T18:00:00Z"
  },
  {
    name: "Põlva Food Festival",
    description: "Traditional Estonian food and drink festival",
    category: "food",
    venue: "Põlva Keskväljak",
    address: "Põlva, Estonia",
    latitude: 58.055625,
    longitude: 27.057574,
    startsAt: "2025-10-25T12:00:00Z"
  },
  {
    name: "Jõgeva Literature Night",
    description: "Evening of poetry readings and book discussions",
    category: "education",
    venue: "Jõgeva Raamatukogu",
    address: "Jõgeva, Estonia",
    latitude: 58.746625,
    longitude: 26.390006,
    startsAt: "2025-10-30T19:00:00Z"
  },
  {
    name: "Elva Nature Walk",
    description: "Guided nature walk in Elva's beautiful parks",
    category: "nature & environment",
    venue: "Elva Park",
    address: "Elva, Estonia",
    latitude: 58.222625,
    longitude: 26.420006,
    startsAt: "2025-11-05T14:00:00Z"
  },
  {
    name: "Rapla Business Conference",
    description: "Annual business networking and conference event",
    category: "business",
    venue: "Rapla Kultuurikeskus",
    address: "Rapla, Estonia",
    latitude: 59.007625,
    longitude: 24.797574,
    startsAt: "2025-11-10T09:00:00Z"
  },
  {
    name: "Saue Technology Expo",
    description: "Latest technology showcase and demonstrations",
    category: "technology",
    venue: "Saue Kultuurimaja",
    address: "Saue, Estonia",
    latitude: 59.320625,
    longitude: 24.550006,
    startsAt: "2025-11-15T11:00:00Z"
  },
  {
    name: "Põltsamaa Wine Tasting",
    description: "Wine tasting event featuring local and international wines",
    category: "food",
    venue: "Põltsamaa Loss",
    address: "Põltsamaa, Estonia",
    latitude: 58.652625,
    longitude: 25.970006,
    startsAt: "2025-11-20T18:00:00Z"
  },
  {
    name: "Paldiski Maritime Festival",
    description: "Celebration of maritime history and culture",
    category: "cultural",
    venue: "Paldiski Sadam",
    address: "Paldiski, Estonia",
    latitude: 59.356625,
    longitude: 24.053574,
    startsAt: "2025-11-25T15:00:00Z"
  }
];

async function createEventsWithCoordinates() {
  try {
    console.log('🎯 Creating events with coordinates...');
    
    let createdCount = 0;
    let failedCount = 0;
    
    for (const event of sampleEvents) {
      try {
        console.log(`📝 Creating event: ${event.name}`);
        
        const response = await axios.post(
          `${API_BASE_URL}/events`,
          event,
          { headers }
        );
        
        if (response.data.success) {
          console.log(`✅ Created event: ${event.name} at [${event.latitude}, ${event.longitude}]`);
          createdCount++;
        } else {
          console.log(`❌ Failed to create event: ${event.name} - ${response.data.error}`);
          failedCount++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`❌ Failed to create event: ${event.name} - ${error.message}`);
        failedCount++;
      }
    }
    
    console.log(`\n🎉 Summary:`);
    console.log(`✅ Created: ${createdCount} events`);
    console.log(`❌ Failed: ${failedCount} events`);
    console.log(`📊 Total processed: ${sampleEvents.length} events`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
createEventsWithCoordinates();
