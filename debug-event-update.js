const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function testEventUpdate() {
  console.log('🔍 Testing event update flow...')
  
  try {
    // First, let's get all events to see the current state
    console.log('📋 Fetching all events...')
    const eventsResponse = await fetch(`${API_BASE_URL}/events`)
    const eventsData = await eventsResponse.json()
    
    if (eventsData.success && eventsData.data && eventsData.data.length > 0) {
      const firstEvent = eventsData.data[0]
      console.log('📋 Found event:', {
        id: firstEvent.id,
        name: firstEvent.name,
        category: firstEvent.category,
        updatedAt: firstEvent.updatedAt
      })
      
      // Now let's try to update this event
      console.log('🔄 Attempting to update event...')
      const updateData = {
        name: `Updated ${firstEvent.name} - ${Date.now()}`,
        category: 'Music'
      }
      
      const updateResponse = await fetch(`${API_BASE_URL}/events/${firstEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('📊 Update response status:', updateResponse.status)
      
      if (updateResponse.ok) {
        const updateResult = await updateResponse.json()
        console.log('✅ Update successful:', updateResult)
        
        // Now let's fetch the events again to see if the update is reflected
        console.log('📋 Fetching events again to check update...')
        const eventsResponse2 = await fetch(`${API_BASE_URL}/events`)
        const eventsData2 = await eventsResponse2.json()
        
        if (eventsData2.success && eventsData2.data) {
          const updatedEvent = eventsData2.data.find(e => e.id === firstEvent.id)
          if (updatedEvent) {
            console.log('📋 Updated event found:', {
              id: updatedEvent.id,
              name: updatedEvent.name,
              category: updatedEvent.category,
              updatedAt: updatedEvent.updatedAt
            })
            
            if (updatedEvent.name === updateData.name && updatedEvent.category === updateData.category) {
              console.log('✅ Event update is properly reflected in the API!')
            } else {
              console.log('❌ Event update is NOT reflected in the API!')
              console.log('Expected:', updateData)
              console.log('Actual:', { name: updatedEvent.name, category: updatedEvent.category })
            }
          } else {
            console.log('❌ Updated event not found in API response!')
          }
        }
      } else {
        const errorData = await updateResponse.json().catch(() => ({}))
        console.log('❌ Update failed:', errorData)
      }
    } else {
      console.log('❌ No events found to test with')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testEventUpdate()
