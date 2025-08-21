const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE_URL = 'http://olympio.ee:4000/api'

async function testEventUpdate() {
  console.log('🔍 Testing event update flow...')
  
  try {
    // 1. First, let's sign in to get authentication
    console.log('1. Signing in...')
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })
    
    if (!signinResponse.ok) {
      console.log('❌ Signin failed, trying signup...')
      const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
      })
      
      if (!signupResponse.ok) {
        const error = await signupResponse.text()
        console.log('❌ Signup failed:', error)
        return
      }
      
      console.log('✅ Signup successful')
    } else {
      console.log('✅ Signin successful')
    }
    
    // Get the auth token
    const authData = await signinResponse.json()
    const token = authData.accessToken
    
    console.log('2. Getting events...')
    const eventsResponse = await fetch(`${API_BASE_URL}/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      }
    })
    
    if (!eventsResponse.ok) {
      console.log('❌ Failed to get events:', await eventsResponse.text())
      return
    }
    
    const eventsData = await eventsResponse.json()
    console.log(`✅ Found ${eventsData.data.length} events`)
    
    if (eventsData.data.length === 0) {
      console.log('❌ No events found to test with')
      return
    }
    
    // 3. Get the first event to test update
    const testEvent = eventsData.data[0]
    console.log(`3. Testing update on event: ${testEvent.id} (${testEvent.name})`)
    console.log(`   Current category: ${testEvent.category}`)
    
    // 4. Update the event category
    const newCategory = testEvent.category === 'Sports' ? 'Music' : 'Sports'
    console.log(`   Updating category to: ${newCategory}`)
    
    const updateResponse = await fetch(`${API_BASE_URL}/events/${testEvent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      },
      body: JSON.stringify({
        category: newCategory
      })
    })
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      console.log('❌ Update failed:', error)
      return
    }
    
    const updateData = await updateResponse.json()
    console.log('✅ Update successful')
    console.log(`   Updated event category: ${updateData.data.category}`)
    
    // 5. Get the event again to verify the update
    console.log('4. Verifying update...')
    const verifyResponse = await fetch(`${API_BASE_URL}/events/${testEvent.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-id': '550e8400-e29b-41d4-a716-446655440000'
      }
    })
    
    if (!verifyResponse.ok) {
      console.log('❌ Failed to verify update:', await verifyResponse.text())
      return
    }
    
    const verifyData = await verifyResponse.json()
    console.log(`✅ Verification successful`)
    console.log(`   Event category after update: ${verifyData.data.category}`)
    console.log(`   Event updatedAt: ${verifyData.data.updatedAt}`)
    
    if (verifyData.data.category === newCategory) {
      console.log('🎉 SUCCESS: Event category was updated correctly!')
    } else {
      console.log('❌ FAILURE: Event category was not updated correctly!')
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testEventUpdate()
