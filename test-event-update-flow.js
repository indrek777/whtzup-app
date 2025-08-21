const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function testEventUpdateFlow() {
  console.log('🔍 Testing complete event update flow...')
  
  try {
    // Step 1: Create a test user and sign in
    console.log('📋 Step 1: Creating and signing in test user...')
    const signupData = {
      email: `flowtest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Flow Test User'
    }
    
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    })
    
    if (!signupResponse.ok) {
      console.log('❌ Signup failed')
      return
    }
    
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupData.email,
        password: signupData.password
      })
    })
    
    if (!signinResponse.ok) {
      console.log('❌ Signin failed')
      return
    }
    
    const signinResult = await signinResponse.json()
    const accessToken = signinResult.accessToken
    console.log('✅ User authenticated')
    
    // Step 2: Create a test event
    console.log('📋 Step 2: Creating test event...')
    const eventData = {
      name: 'Test Event for Update Flow',
      description: 'This event will be updated to test the flow',
      venue: 'Test Venue',
      address: 'Test Address, Tallinn',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      category: 'other', // Use lowercase
      latitude: 59.436962,
      longitude: 24.753574,
      isRecurring: false,
      source: 'app'
    }
    
    const createResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      },
      body: JSON.stringify(eventData)
    })
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      console.log('❌ Event creation failed:', errorData)
      return
    }
    
    const createResult = await createResponse.json()
    const eventId = createResult.data.id
    console.log('✅ Event created with ID:', eventId)
    console.log('📋 Original event:', {
      id: createResult.data.id,
      name: createResult.data.name,
      category: createResult.data.category,
      updatedAt: createResult.data.updatedAt
    })
    
    // Step 3: Fetch events to see the created event
    console.log('📋 Step 3: Fetching events to verify creation...')
    const fetchResponse = await fetch(`${API_BASE_URL}/events`)
    const fetchResult = await fetchResponse.json()
    
    if (fetchResult.success && fetchResult.data) {
      const createdEvent = fetchResult.data.find(e => e.id === eventId)
      if (createdEvent) {
        console.log('✅ Event found in fetch result:', {
          id: createdEvent.id,
          name: createdEvent.name,
          category: createdEvent.category,
          updatedAt: createdEvent.updatedAt
        })
      } else {
        console.log('❌ Created event not found in fetch result')
      }
    }
    
    // Step 4: Update the event category
    console.log('📋 Step 4: Updating event category...')
    const updateData = {
      category: 'music' // Change from 'other' to 'music'
    }
    
    const updateResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      },
      body: JSON.stringify(updateData)
    })
    
    console.log('📊 Update response status:', updateResponse.status)
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json()
      console.log('✅ Event update successful:', updateResult)
      console.log('📋 Updated event from response:', {
        id: updateResult.data.id,
        name: updateResult.data.name,
        category: updateResult.data.category,
        updatedAt: updateResult.data.updatedAt
      })
    } else {
      const errorData = await updateResponse.json().catch(() => ({}))
      console.log('❌ Event update failed:', errorData)
      return
    }
    
    // Step 5: Fetch events again to verify the update
    console.log('📋 Step 5: Fetching events again to verify update...')
    const fetchResponse2 = await fetch(`${API_BASE_URL}/events`)
    const fetchResult2 = await fetchResponse2.json()
    
    if (fetchResult2.success && fetchResult2.data) {
      const updatedEvent = fetchResult2.data.find(e => e.id === eventId)
      if (updatedEvent) {
        console.log('✅ Updated event found in fetch result:', {
          id: updatedEvent.id,
          name: updatedEvent.name,
          category: updatedEvent.category,
          updatedAt: updatedEvent.updatedAt
        })
        
        if (updatedEvent.category === 'music') {
          console.log('✅ Category update verified successfully!')
        } else {
          console.log('❌ Category update verification failed!')
          console.log('Expected: music, Got:', updatedEvent.category)
        }
      } else {
        console.log('❌ Updated event not found in fetch result')
      }
    }
    
    // Step 6: Test individual event fetch
    console.log('📋 Step 6: Testing individual event fetch...')
    const individualResponse = await fetch(`${API_BASE_URL}/events/${eventId}`)
    
    if (individualResponse.ok) {
      const individualResult = await individualResponse.json()
      console.log('✅ Individual event fetch successful:', {
        id: individualResult.data.id,
        name: individualResult.data.name,
        category: individualResult.data.category,
        updatedAt: individualResult.data.updatedAt
      })
      
      if (individualResult.data.category === 'music') {
        console.log('✅ Individual fetch shows correct category!')
      } else {
        console.log('❌ Individual fetch shows wrong category!')
        console.log('Expected: music, Got:', individualResult.data.category)
      }
    } else {
      const errorData = await individualResponse.json().catch(() => ({}))
      console.log('❌ Individual event fetch failed:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testEventUpdateFlow()
