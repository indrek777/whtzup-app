const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function createTestEvent() {
  console.log('🔍 Creating test event...')
  
  try {
    const testEvent = {
      name: 'Test Event for Update',
      description: 'This is a test event to verify update functionality',
      venue: 'Test Venue',
      address: 'Test Address, Tallinn',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      category: 'Other',
      latitude: 59.436962,
      longitude: 24.753574,
      isRecurring: false,
      source: 'app'
    }
    
    console.log('📋 Creating event:', testEvent)
    
    const createResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      },
      body: JSON.stringify(testEvent)
    })
    
    console.log('📊 Create response status:', createResponse.status)
    
    if (createResponse.ok) {
      const createResult = await createResponse.json()
      console.log('✅ Event created successfully:', createResult)
      
      // Now let's verify it was created by fetching all events
      console.log('📋 Fetching all events to verify creation...')
      const eventsResponse = await fetch(`${API_BASE_URL}/events`)
      const eventsData = await eventsResponse.json()
      
      if (eventsData.success && eventsData.events) {
        console.log(`📋 Found ${eventsData.events.length} events in database`)
        eventsData.events.forEach(event => {
          console.log('📋 Event:', {
            id: event.id,
            name: event.name,
            category: event.category,
            createdAt: event.createdAt
          })
        })
      }
    } else {
      const errorData = await createResponse.json().catch(() => ({}))
      console.log('❌ Create failed:', errorData)
      console.log('❌ Error details:', JSON.stringify(errorData, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

createTestEvent()
