const { io } = require('socket.io-client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://olympio.ee:4000';
const EVENT_ID = 'e4b0b613-6b7b-47a2-827b-1ca0550b7c42';

// Simulate two devices
const device1 = 'test-device-1-' + Date.now();
const device2 = 'test-device-2-' + Date.now();

let device1Socket = null;
let device2Socket = null;
let device1ReceivedUpdate = false;
let device2ReceivedUpdate = false;

async function testRealTimeSync() {
  console.log('🧪 Testing real-time synchronization between devices...');
  console.log(`📱 Device 1: ${device1}`);
  console.log(`📱 Device 2: ${device2}`);
  
  try {
    // Step 1: Connect both devices to Socket.IO
    console.log('\n1️⃣ Connecting devices to Socket.IO...');
    
    device1Socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });
    
    device2Socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    // Device 1 event listeners
    device1Socket.on('connect', () => {
      console.log('✅ Device 1 connected to Socket.IO');
      device1Socket.emit('join-device', device1);
    });

    device1Socket.on('event-updated', (data) => {
      console.log('🔄 Device 1 received event-updated:', {
        eventId: data.eventId,
        category: data.eventData?.category,
        name: data.eventData?.name
      });
      device1ReceivedUpdate = true;
    });

    // Device 2 event listeners
    device2Socket.on('connect', () => {
      console.log('✅ Device 2 connected to Socket.IO');
      device2Socket.emit('join-device', device2);
    });

    device2Socket.on('event-updated', (data) => {
      console.log('🔄 Device 2 received event-updated:', {
        eventId: data.eventId,
        category: data.eventData?.category,
        name: data.eventData?.name
      });
      device2ReceivedUpdate = true;
    });

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Get current event data
    console.log('\n2️⃣ Getting current event data...');
    const getResponse = await fetch(`${API_BASE_URL}/api/events/${EVENT_ID}`);
    if (getResponse.ok) {
      const eventData = await getResponse.json();
      console.log(`📝 Current event: ${eventData.data.name}`);
      console.log(`🎯 Current category: ${eventData.data.category}`);
    } else {
      console.log(`❌ Failed to get event: ${getResponse.status}`);
      return;
    }

    // Step 3: Update event category (this should trigger Socket.IO events)
    console.log('\n3️⃣ Updating event category...');
    const updateData = {
      category: 'sports' // Change to sports category
    };

    const updateResponse = await fetch(`${API_BASE_URL}/api/events/${EVENT_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': device1,
        'Authorization': 'Bearer test-token' // This will fail auth, but we can see if the event is found
      },
      body: JSON.stringify(updateData)
    });

    console.log(`📡 Update response status: ${updateResponse.status}`);
    
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log(`✅ Event updated successfully!`);
      console.log(`🔄 New category: ${result.data.category}`);
    } else {
      const errorText = await updateResponse.text();
      console.log(`❌ Update failed: ${errorText}`);
    }

    // Step 4: Wait for real-time updates
    console.log('\n4️⃣ Waiting for real-time updates...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Check results
    console.log('\n5️⃣ Results:');
    console.log(`📱 Device 1 received update: ${device1ReceivedUpdate ? '✅ YES' : '❌ NO'}`);
    console.log(`📱 Device 2 received update: ${device2ReceivedUpdate ? '✅ YES' : '❌ NO'}`);

    if (device1ReceivedUpdate && device2ReceivedUpdate) {
      console.log('🎉 Real-time synchronization is working!');
    } else {
      console.log('❌ Real-time synchronization is NOT working!');
    }

    // Cleanup
    if (device1Socket) device1Socket.disconnect();
    if (device2Socket) device2Socket.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealTimeSync();
