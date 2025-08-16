import React, { useEffect, useState } from 'react'
import { eventService, Event } from '../utils/eventService'
import { userService } from '../utils/userService'
import { ratingService, EventRating } from '../utils/ratingService'

// Web-compatible components
const View = ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>
const Text = ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>
const TouchableOpacity = ({ children, style, onPress, ...props }: any) => (
  <button style={{ ...style, border: 'none', background: 'none', cursor: 'pointer' }} onClick={onPress} {...props}>
    {children}
  </button>
)
const TextInput = ({ style, value, onChangeText, placeholder, ...props }: any) => (
  <input 
    style={style} 
    value={value} 
    onChange={(e) => onChangeText(e.target.value)} 
    placeholder={placeholder} 
    {...props} 
  />
)
const ScrollView = ({ children, style, ...props }: any) => (
  <div style={{ ...style, overflow: 'auto' }} {...props}>{children}</div>
)
const Modal = ({ visible, children, ...props }: any) => 
  visible ? <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} {...props}>{children}</div> : null
const Switch = ({ value, onValueChange, ...props }: any) => (
  <input 
    type="checkbox" 
    checked={value} 
    onChange={(e) => onValueChange(e.target.checked)} 
    {...props} 
  />
)

// Web-compatible MapView
const WebMapView: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    loadEvents()
    getUserLocation()
  }, [])

  const loadEvents = async () => {
    const loadedEvents = await eventService.getAllEvents()
    setEvents(loadedEvents)
  }

  const getUserLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.log('Error getting location:', error)
        }
      )
    }
  }

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const filteredEvents = events.filter(event => {
    const matchesQuery = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory
    return matchesQuery && matchesCategory
  })

  return (
    <View style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {/* Header */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 100, 
        backgroundColor: 'white', 
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          Events Near You
        </Text>
        
        {/* Search Bar */}
        <TextInput
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
            marginBottom: '10px'
          }}
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Category Filter */}
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px'
          }}
        >
          <option value="all">All Categories</option>
          <option value="Music">Music</option>
          <option value="Theater">Theater</option>
          <option value="Museum">Museum</option>
          <option value="Comedy">Comedy</option>
          <option value="Cultural">Cultural</option>
          <option value="Other">Other</option>
        </select>
      </View>

      {/* Map Placeholder */}
      <View style={{ 
        height: '100%', 
        width: '100%', 
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '120px'
      }}>
        <Text style={{ fontSize: '18px', color: '#666', textAlign: 'center' }}>
          📍 Interactive Map View<br/>
          <Text style={{ fontSize: '14px' }}>
            {filteredEvents.length} events found
          </Text>
        </Text>
      </View>

      {/* Events List */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '20px',
        maxHeight: '50vh',
        overflow: 'auto'
      }}>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
          Events ({filteredEvents.length})
        </Text>
        
        <ScrollView>
          {filteredEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={{
                backgroundColor: 'white',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '12px',
                border: '1px solid #eee',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onPress={() => handleEventPress(event)}
            >
              <Text style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                {event.name}
                {event.isRecurring && <Text style={{ color: '#007AFF' }}> 🔄</Text>}
              </Text>
              <Text style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                {event.venue} • {event.category}
              </Text>
              <Text style={{ fontSize: '12px', color: '#999' }}>
                {new Date(event.startsAt).toLocaleDateString()} at {new Date(event.startsAt).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Create Event Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: '60px',
          right: '20px',
          width: '56px',
          height: '56px',
          backgroundColor: '#007AFF',
          borderRadius: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,122,255,0.3)'
        }}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>+</Text>
      </TouchableOpacity>

      {/* Event Detail Modal */}
      <Modal visible={showEventModal}>
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '90%'
        }}>
          {selectedEvent && (
            <>
              <Text style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                {selectedEvent.name}
              </Text>
              <Text style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                {selectedEvent.description}
              </Text>
              <Text style={{ fontSize: '14px', marginBottom: '5px' }}>
                📍 {selectedEvent.venue}
              </Text>
              <Text style={{ fontSize: '14px', marginBottom: '5px' }}>
                📅 {new Date(selectedEvent.startsAt).toLocaleDateString()}
              </Text>
              <Text style={{ fontSize: '14px', marginBottom: '15px' }}>
                🕒 {new Date(selectedEvent.startsAt).toLocaleTimeString()}
              </Text>
              
              <TouchableOpacity
                style={{
                  backgroundColor: '#007AFF',
                  padding: '12px',
                  borderRadius: '8px',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
                onPress={() => setShowEventModal(false)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  )
}

const MapView: React.FC = () => {
  return <WebMapView />
}

module.exports = MapView
