const http = require('http');

// First, get a sample event
const getEventOptions = {
  hostname: 'olympio.ee',
  port: 4000,
  path: '/api/events?limit=1',
  method: 'GET',
  headers: {
    'X-Device-ID': '550e8400-e29b-41d4-a716-446655440000'
  }
};

const getEventReq = http.request(getEventOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.data && response.data.length > 0) {
        const event = response.data[0];
        console.log('Original event:', {
          id: event.id,
          name: event.name,
          latitude: event.latitude,
          longitude: event.longitude,
          latType: typeof event.latitude,
          lngType: typeof event.longitude,
          startsAt: event.startsAt,
          startsAtType: typeof event.startsAt
        });
        
        // Now update the event with the same data
        const updateData = JSON.stringify({
          name: event.name,
          description: event.description,
          category: event.category,
          venue: event.venue,
          address: event.address,
          latitude: Number(event.latitude),
          longitude: Number(event.longitude),
          startsAt: event.startsAt,
          createdBy: event.createdBy
        });
        
        console.log('\nSending update data:', updateData);
        
        const updateOptions = {
          hostname: 'olympio.ee',
          port: 4000,
          path: `/api/events/${event.id}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-ID': '550e8400-e29b-41d4-a716-446655440000'
          }
        };
        
        const updateReq = http.request(updateOptions, (updateRes) => {
          let updateData = '';
          updateRes.on('data', (chunk) => updateData += chunk);
          updateRes.on('end', () => {
            try {
              const updateResponse = JSON.parse(updateData);
              console.log('\nUpdate response:', {
                success: updateResponse.success,
                error: updateResponse.error,
                data: updateResponse.data ? {
                  id: updateResponse.data.id,
                  name: updateResponse.data.name,
                  latitude: updateResponse.data.latitude,
                  longitude: updateResponse.data.longitude,
                  latType: typeof updateResponse.data.latitude,
                  lngType: typeof updateResponse.data.longitude
                } : null
              });
            } catch (error) {
              console.error('Error parsing update response:', error);
              console.log('Raw update response:', updateData);
            }
          });
        });
        
        updateReq.on('error', (e) => console.error('Update request error:', e));
        updateReq.write(updateData);
        updateReq.end();
        
      } else {
        console.log('No events found');
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

getEventReq.on('error', (e) => console.error('Get event error:', e));
getEventReq.end();
