const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: '165.22.90.180',
  port: 5432,
  database: 'whtzup_events',
  user: 'postgres',
  password: 'your_password_here' // You'll need to provide the actual password
});

// Estonian cities and their coordinates
const cityCoordinates = {
  'Tallinn': [59.436962, 24.753574],
  'Tartu': [58.377625, 26.729006],
  'Narva': [59.377625, 28.190006],
  'Pärnu': [58.385625, 24.497574],
  'Kohtla-Järve': [59.398625, 27.273574],
  'Viljandi': [58.363625, 25.590006],
  'Rakvere': [59.352539, 26.360135],
  'Maardu': [59.476625, 25.017574],
  'Kuressaare': [58.252625, 22.485006],
  'Sillamäe': [59.399625, 27.763574],
  'Valga': [57.777625, 26.047574],
  'Võru': [57.833625, 27.017574],
  'Jõhvi': [59.359625, 27.417574],
  'Haapsalu': [58.943625, 23.540006],
  'Paide': [58.885625, 25.557574],
  'Keila': [59.303625, 24.420006],
  'Kiviõli': [59.352625, 26.970006],
  'Tapa': [59.266625, 25.957574],
  'Põlva': [58.055625, 27.057574],
  'Jõgeva': [58.746625, 26.390006],
  'Türi': [58.808625, 25.430006],
  'Elva': [58.222625, 26.420006],
  'Rapla': [59.007625, 24.797574],
  'Saue': [59.320625, 24.550006],
  'Põltsamaa': [58.652625, 25.970006],
  'Paldiski': [59.356625, 24.053574],
  'Sindi': [58.400625, 24.667574],
  'Kunda': [59.498625, 26.540006],
  'Kärdla': [58.997625, 22.750006],
  'Kohila': [59.168625, 24.757574],
  'Räpina': [58.098625, 27.460006],
  'Tõrva': [58.002625, 25.930006],
  'Karksi-Nuia': [58.103625, 25.560006],
  'Otepää': [58.058625, 26.497574],
  'Käina': [58.823625, 22.790006],
  'Lihula': [58.681625, 23.840006],
  'Antsla': [57.825625, 26.540006],
  'Abja-Paluoja': [58.125625, 25.360006],
  'Suure-Jaani': [58.536625, 25.470006],
  'Mustvee': [58.848625, 26.940006],
  'Võhma': [58.628625, 25.550006],
  'Sõmerpalu': [57.852625, 26.830006],
  'Kallaste': [58.655625, 27.160006],
  'Mõisaküla': [58.092625, 25.190006]
};

// Function to determine coordinates based on location text
function getCoordinatesFromLocation(location) {
  if (!location) return [59.436962, 24.753574]; // Default to Tallinn
  
  const locationLower = location.toLowerCase();
  
  // Check for exact city matches
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (locationLower.includes(city.toLowerCase())) {
      return coords;
    }
  }
  
  // Check for common venue patterns
  if (locationLower.includes('tallinna') || locationLower.includes('tallinn')) {
    return [59.436962, 24.753574];
  }
  if (locationLower.includes('tartu')) {
    return [58.377625, 26.729006];
  }
  if (locationLower.includes('pärnu')) {
    return [58.385625, 24.497574];
  }
  if (locationLower.includes('viljandi')) {
    return [58.363625, 25.590006];
  }
  if (locationLower.includes('rakvere')) {
    return [59.352539, 26.360135];
  }
  if (locationLower.includes('haapsalu')) {
    return [58.943625, 23.540006];
  }
  if (locationLower.includes('paide')) {
    return [58.885625, 25.557574];
  }
  if (locationLower.includes('keila')) {
    return [59.303625, 24.420006];
  }
  if (locationLower.includes('põlva')) {
    return [58.055625, 27.057574];
  }
  if (locationLower.includes('jõgeva')) {
    return [58.746625, 26.390006];
  }
  if (locationLower.includes('elva')) {
    return [58.222625, 26.420006];
  }
  if (locationLower.includes('rapla')) {
    return [59.007625, 24.797574];
  }
  if (locationLower.includes('saue')) {
    return [59.320625, 24.550006];
  }
  if (locationLower.includes('põltsamaa')) {
    return [58.652625, 25.970006];
  }
  if (locationLower.includes('paldiski')) {
    return [59.356625, 24.053574];
  }
  if (locationLower.includes('sindi')) {
    return [58.400625, 24.667574];
  }
  if (locationLower.includes('kunda')) {
    return [59.498625, 26.540006];
  }
  if (locationLower.includes('kärdla')) {
    return [58.997625, 22.750006];
  }
  if (locationLower.includes('kohila')) {
    return [59.168625, 24.757574];
  }
  if (locationLower.includes('räpina')) {
    return [58.098625, 27.460006];
  }
  if (locationLower.includes('tõrva')) {
    return [58.002625, 25.930006];
  }
  if (locationLower.includes('karksi')) {
    return [58.103625, 25.560006];
  }
  if (locationLower.includes('otepää')) {
    return [58.058625, 26.497574];
  }
  if (locationLower.includes('käina')) {
    return [58.823625, 22.790006];
  }
  if (locationLower.includes('lihula')) {
    return [58.681625, 23.840006];
  }
  if (locationLower.includes('antsla')) {
    return [57.825625, 26.540006];
  }
  if (locationLower.includes('abja')) {
    return [58.125625, 25.360006];
  }
  if (locationLower.includes('suure-jaani')) {
    return [58.536625, 25.470006];
  }
  if (locationLower.includes('mustvee')) {
    return [58.848625, 26.940006];
  }
  if (locationLower.includes('võhma')) {
    return [58.628625, 25.550006];
  }
  if (locationLower.includes('sõmerpalu')) {
    return [57.852625, 26.830006];
  }
  if (locationLower.includes('kallaste')) {
    return [58.655625, 27.160006];
  }
  if (locationLower.includes('mõisaküla')) {
    return [58.092625, 25.190006];
  }
  
  // Default to Tallinn for unknown locations
  return [59.436962, 24.753574];
}

async function updateAllEventCoordinates() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Get all events that need coordinates
    const result = await pool.query(`
      SELECT id, name, venue, address, location, latitude, longitude 
      FROM events 
      WHERE deleted_at IS NULL 
      AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
      ORDER BY id
    `);
    
    const events = result.rows;
    console.log(`📊 Found ${events.length} events that need coordinates`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    // Process events in batches of 50
    const batchSize = 50;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(events.length/batchSize)} (events ${i+1}-${Math.min(i+batchSize, events.length)})`);
      
      for (const event of batch) {
        try {
          // Skip events that already have valid coordinates
          if (event.latitude && event.longitude && event.latitude !== 0 && event.longitude !== 0) {
            console.log(`⏭️ Skipping event ${event.id}: already has coordinates`);
            skippedCount++;
            continue;
          }
          
          // Get coordinates based on location
          const location = event.location || event.venue || event.address;
          const [latitude, longitude] = getCoordinatesFromLocation(location);
          
          // Update the event in the database
          const updateResult = await pool.query(`
            UPDATE events 
            SET latitude = $1, longitude = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [latitude, longitude, event.id]);
          
          if (updateResult.rowCount > 0) {
            console.log(`✅ Updated event ${event.id}: ${event.name} -> [${latitude}, ${longitude}]`);
            updatedCount++;
          } else {
            console.log(`❌ Failed to update event ${event.id}: no rows affected`);
            failedCount++;
          }
          
        } catch (error) {
          console.log(`❌ Failed to update event ${event.id}: ${error.message}`);
          failedCount++;
        }
      }
      
      // Wait between batches
      if (i + batchSize < events.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 Summary:`);
    console.log(`✅ Updated: ${updatedCount} events`);
    console.log(`⏭️ Skipped: ${skippedCount} events (already had coordinates)`);
    console.log(`❌ Failed: ${failedCount} events`);
    console.log(`📊 Total processed: ${events.length} events`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
updateAllEventCoordinates();
