const http = require('http');

const options = {
  hostname: 'olympio.ee',
  port: 4000,
  path: '/api/events?limit=50',
  method: 'GET',
  headers: {
    'X-Device-ID': '550e8400-e29b-41d4-a716-446655440000'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log(`Total events received: ${response.data.length}`);
      
      // Check for events with 0 coordinates
      const zeroCoordEvents = response.data.filter(event => 
        event.latitude === '0.00000000' || event.longitude === '0.00000000' ||
        event.latitude === '0' || event.longitude === '0' ||
        parseFloat(event.latitude) === 0 || parseFloat(event.longitude) === 0
      );
      
      console.log(`Events with 0 coordinates: ${zeroCoordEvents.length}`);
      
      if (zeroCoordEvents.length > 0) {
        console.log('\nSample events with 0 coordinates:');
        zeroCoordEvents.slice(0, 5).forEach((event, i) => {
          console.log(`Event ${i + 1}:`, {
            id: event.id,
            name: event.name,
            latitude: event.latitude,
            longitude: event.longitude,
            venue: event.venue,
            address: event.address
          });
        });
      }
      
      // Check for events with valid coordinates
      const validCoordEvents = response.data.filter(event => {
        const lat = parseFloat(event.latitude);
        const lng = parseFloat(event.longitude);
        return lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng);
      });
      
      console.log(`Events with valid coordinates: ${validCoordEvents.length}`);
      
      if (validCoordEvents.length > 0) {
        console.log('\nSample events with valid coordinates:');
        validCoordEvents.slice(0, 3).forEach((event, i) => {
          console.log(`Event ${i + 1}:`, {
            id: event.id,
            name: event.name,
            latitude: event.latitude,
            longitude: event.longitude,
            venue: event.venue,
            address: event.address
          });
        });
      }
      
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e));
req.end();
