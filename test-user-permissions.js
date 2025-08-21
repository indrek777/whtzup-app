const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function testUserPermissions() {
  console.log('🔍 Testing user permissions and event updates...')
  
  try {
    // Step 1: Create a test user and sign in
    console.log('📋 Step 1: Creating and signing in test user...')
    const signupData = {
      email: `permissiontest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Permission Test User'
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
    
    // Step 2: Check user profile and subscription
    console.log('📋 Step 2: Checking user profile...')
    const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json()
      console.log('✅ User profile:', {
        id: profileResult.data.id,
        name: profileResult.data.name,
        subscription: profileResult.data.subscription?.status
      })
    } else {
      console.log('❌ Profile check failed')
    }
    
    // Step 3: Create a test event
    console.log('📋 Step 3: Creating test event...')
    const eventData = {
      name: 'Permission Test Event',
      description: 'This event will test user permissions',
      venue: 'Test Venue',
      address: 'Test Address, Tallinn',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      category: 'other',
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
    console.log('📋 Created event:', {
      id: createResult.data.id,
      name: createResult.data.name,
      category: createResult.data.category,
      createdBy: createResult.data.createdBy
    })
    
    // Step 4: Try to update the event
    console.log('📋 Step 4: Testing event update...')
    const updateData = {
      category: 'music'
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
      console.log('📋 Updated event:', {
        id: updateResult.data.id,
        name: updateResult.data.name,
        category: updateResult.data.category,
        updatedAt: updateResult.data.updatedAt
      })
    } else {
      const errorData = await updateResponse.json().catch(() => ({}))
      console.log('❌ Event update failed:', errorData)
    }
    
    // Step 5: Try to update an existing event (not created by this user)
    console.log('📋 Step 5: Testing update of existing event...')
    const eventsResponse = await fetch(`${API_BASE_URL}/events`)
    const eventsResult = await eventsResponse.json()
    
    if (eventsResult.success && eventsResult.data && eventsResult.data.length > 0) {
      // Find an event not created by our test user
      const existingEvent = eventsResult.data.find(e => e.createdBy !== signupData.name)
      
      if (existingEvent) {
        console.log('📋 Found existing event to test:', {
          id: existingEvent.id,
          name: existingEvent.name,
          category: existingEvent.category,
          createdBy: existingEvent.createdBy
        })
        
        const updateExistingResponse = await fetch(`${API_BASE_URL}/events/${existingEvent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
          },
          body: JSON.stringify({ category: 'sports' })
        })
        
        console.log('📊 Update existing event response status:', updateExistingResponse.status)
        
        if (updateExistingResponse.ok) {
          console.log('✅ Successfully updated existing event (user has permission)')
        } else {
          const errorData = await updateExistingResponse.json().catch(() => ({}))
          console.log('❌ Failed to update existing event:', errorData)
        }
      } else {
        console.log('📋 No existing events found to test')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testUserPermissions()
