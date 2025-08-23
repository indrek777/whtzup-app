const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function testFrontendAuth() {
  console.log('🔍 Testing frontend authentication flow...')
  
  try {
    // Step 1: Create a test user
    console.log('📋 Step 1: Creating test user...')
    const signupData = {
      email: `frontendtest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Frontend Test User'
    }
    
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signupData)
    })
    
    if (!signupResponse.ok) {
      const errorData = await signupResponse.json().catch(() => ({}))
      console.log('❌ Signup failed:', errorData)
      return
    }
    
    const signupResult = await signupResponse.json()
    console.log('✅ Signup successful')
    
    // Step 2: Sign in to get tokens
    console.log('📋 Step 2: Signing in...')
    const signinData = {
      email: signupData.email,
      password: signupData.password
    }
    
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signinData)
    })
    
    if (!signinResponse.ok) {
      const errorData = await signinResponse.json().catch(() => ({}))
      console.log('❌ Signin failed:', errorData)
      return
    }
    
    const signinResult = await signinResponse.json()
    console.log('✅ Signin successful, got tokens')
    
    const accessToken = signinResult.data.accessToken
    const refreshToken = signinResult.data.refreshToken
    
    // Step 3: Test getting user profile with authentication
    console.log('📋 Step 3: Testing profile retrieval...')
    const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    console.log('📊 Profile response status:', profileResponse.status)
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json()
      console.log('✅ Profile retrieval successful:', profileResult)
    } else {
      const errorData = await profileResponse.json().catch(() => ({}))
      console.log('❌ Profile retrieval failed:', errorData)
    }
    
    // Step 4: Test creating an event with authentication
    console.log('📋 Step 4: Testing event creation...')
    const eventData = {
      name: 'Test Event for Frontend',
      description: 'This is a test event created with authentication',
      venue: 'Test Venue',
      address: 'Test Address, Tallinn',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      category: 'Other',
      latitude: 59.436962,
      longitude: 24.753574,
      isRecurring: false,
      source: 'app'
    }
    
    const createEventResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      },
      body: JSON.stringify(eventData)
    })
    
    console.log('📊 Create event response status:', createEventResponse.status)
    
    if (createEventResponse.ok) {
      const createResult = await createEventResponse.json()
      console.log('✅ Event creation successful:', createResult)
      
      const createdEventId = createResult.data.id
      
      // Step 5: Test updating the created event
      console.log('📋 Step 5: Testing event update...')
      const updateData = {
        name: 'Updated Test Event',
        category: 'Music'
      }
      
      const updateEventResponse = await fetch(`${API_BASE_URL}/events/${createdEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify(updateData)
      })
      
      console.log('📊 Update event response status:', updateEventResponse.status)
      
      if (updateEventResponse.ok) {
        const updateResult = await updateEventResponse.json()
        console.log('✅ Event update successful:', updateResult)
        
        // Step 6: Verify the update by fetching the event
        console.log('📋 Step 6: Verifying event update...')
        const getEventResponse = await fetch(`${API_BASE_URL}/events/${createdEventId}`)
        
        if (getEventResponse.ok) {
          const getResult = await getEventResponse.json()
          console.log('📋 Retrieved event:', {
            id: getResult.data.id,
            name: getResult.data.name,
            category: getResult.data.category,
            updatedAt: getResult.data.updatedAt
          })
          
          if (getResult.data.name === updateData.name && getResult.data.category === updateData.category) {
            console.log('✅ Event update verification successful!')
          } else {
            console.log('❌ Event update verification failed!')
          }
        }
      } else {
        const errorData = await updateEventResponse.json().catch(() => ({}))
        console.log('❌ Event update failed:', errorData)
      }
    } else {
      const errorData = await createEventResponse.json().catch(() => ({}))
      console.log('❌ Event creation failed:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFrontendAuth()
