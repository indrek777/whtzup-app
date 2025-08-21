const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function testAuthStatus() {
  console.log('🔍 Testing authentication status...')
  
  try {
    // First, let's try to create a user account
    console.log('📋 Attempting to create a test user...')
    const signupData = {
      email: `testuser${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    }
    
    const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signupData)
    })
    
    console.log('📊 Signup response status:', signupResponse.status)
    
    if (signupResponse.ok) {
      const signupResult = await signupResponse.json()
      console.log('✅ Signup successful:', signupResult)
      
      // Now let's sign in to get access token
      console.log('📋 Attempting to sign in...')
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
      
      console.log('📊 Signin response status:', signinResponse.status)
      
      if (signinResponse.ok) {
        const signinResult = await signinResponse.json()
        console.log('✅ Signin successful, got access token')
        
        const accessToken = signinResult.accessToken
        
        // Now let's test updating an event with authentication
        console.log('📋 Testing event update with authentication...')
        
        // First get an event
        const eventsResponse = await fetch(`${API_BASE_URL}/events`)
        const eventsData = await eventsResponse.json()
        
        if (eventsData.success && eventsData.data && eventsData.data.length > 0) {
          const firstEvent = eventsData.data[0]
          console.log('📋 Found event to update:', {
            id: firstEvent.id,
            name: firstEvent.name,
            category: firstEvent.category
          })
          
          // Try to update the event with authentication
          const updateData = {
            name: `Updated ${firstEvent.name} - ${Date.now()}`,
            category: 'Music'
          }
          
          const updateResponse = await fetch(`${API_BASE_URL}/events/${firstEvent.id}`, {
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
            console.log('✅ Event update successful with authentication!')
            
            // Verify the update
            const eventsResponse2 = await fetch(`${API_BASE_URL}/events`)
            const eventsData2 = await eventsResponse2.json()
            
            if (eventsData2.success && eventsData2.data) {
              const updatedEvent = eventsData2.data.find(e => e.id === firstEvent.id)
              if (updatedEvent) {
                console.log('📋 Updated event:', {
                  id: updatedEvent.id,
                  name: updatedEvent.name,
                  category: updatedEvent.category,
                  updatedAt: updatedEvent.updatedAt
                })
                
                if (updatedEvent.name === updateData.name && updatedEvent.category === updateData.category) {
                  console.log('✅ Event update is properly reflected in the API!')
                } else {
                  console.log('❌ Event update is NOT reflected in the API!')
                }
              }
            }
          } else {
            const errorData = await updateResponse.json().catch(() => ({}))
            console.log('❌ Update failed even with authentication:', errorData)
          }
        }
      } else {
        const errorData = await signinResponse.json().catch(() => ({}))
        console.log('❌ Signin failed:', errorData)
      }
    } else {
      const errorData = await signupResponse.json().catch(() => ({}))
      console.log('❌ Signup failed:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAuthStatus()
