import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, ScrollView, Modal, Image } from 'react-native'
import MapView, { Marker, Circle } from 'react-native-maps'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { eventsData, totalEventsCount, Event } from '../data/events'
import { ratingService, EventRating, SharedRating } from '../utils/ratingService'
import { eventService } from '../utils/eventService'
import { userService } from '../utils/userService'
import UserProfile from './UserProfile'

// Marker color function
const getMarkerColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'music':
    case 'concert':
    case 'festival':
      return 'red'
    case 'theater':
    case 'performance':
      return 'blue'
    case 'museum':
    case 'exhibition':
      return 'green'
    case 'comedy':
    case 'stand-up':
      return 'orange'
    case 'cultural':
    case 'ball':
      return 'purple'
    default:
      return 'gray'
  }
}

// Category determination function
const determineCategory = (name: string, description: string): string => {
  const text = (name + ' ' + description).toLowerCase()
  if (text.includes('concert') || text.includes('music') || text.includes('festival') || text.includes('symphony')) {
    return 'Music'
  } else if (text.includes('theater') || text.includes('performance') || text.includes('ballet')) {
    return 'Theater'
  } else if (text.includes('museum') || text.includes('exhibition') || text.includes('näitus')) {
    return 'Museum'
  } else if (text.includes('comedy') || text.includes('stand-up') || text.includes('humor')) {
    return 'Comedy'
  } else if (text.includes('cultural') || text.includes('ball') || text.includes('festival')) {
    return 'Cultural'
  } else {
    return 'Other'
  }
}

// Date parsing function
const parseDateTime = (dateTimeString: string) => {
  try {
    const date = new Date(dateTimeString)
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    return { date: dateStr, time: timeStr }
  } catch (error) {
    return { date: 'Unknown', time: 'Unknown' }
  }
}

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c // Distance in kilometers
  return distance
}

// Search and filter interface
interface SearchFilters {
  query: string
  category: string
  dateFrom: string
  dateTo: string
  showSearchModal: boolean
  distanceFilter: boolean
  distanceRadius: number
  userLocation: { latitude: number; longitude: number } | null
}

// Event creation interface
interface NewEvent {
  name: string
  description: string
  venue: string
  address: string
  startsAt: string
  category: string
  latitude: number
  longitude: number
}

const MapViewNative: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRatings, setUserRatings] = useState<{ [eventId: string]: EventRating }>({})
  const [sharedRatings, setSharedRatings] = useState<{ [eventId: string]: SharedRating }>({})
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [currentRating, setCurrentRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  
  // Event creation states
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [newEvent, setNewEvent] = useState<NewEvent>({
    name: '',
    description: '',
    venue: '',
    address: '',
    startsAt: '',
    category: 'Other',
    latitude: 0,
    longitude: 0
  })
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isMapMode, setIsMapMode] = useState(false) // New state for map interaction mode
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    category: 'All',
    dateFrom: '',
    dateTo: '',
    showSearchModal: false,
    distanceFilter: false,
    distanceRadius: 10, // Default 10km radius
    userLocation: null
  })

  // Sync status state
  const [syncStatus, setSyncStatus] = useState<{
    backendAvailable: boolean
    pendingEvents: number
    lastSync: string | null
  }>({
    backendAvailable: false,
    pendingEvents: 0,
    lastSync: null
  })

  // User profile state
  const [showUserProfile, setShowUserProfile] = useState(false)

  // Load events from imported data
  useEffect(() => {
    try {
      console.log(`Loaded ${eventsData.length} events from data file`)
      loadUserCreatedEvents()
      setIsLoading(false)
    } catch (error) {
      console.log('Error loading events:', error)
      // Fallback to sample events if error
      const sampleEvents = [
        {
          id: '1',
          name: 'Jazz Night',
          description: 'Live jazz music at the local cafe',
          latitude: 59.436962,
          longitude: 24.753574,
          startsAt: '2024-01-15 20:00',
          url: '',
          venue: 'Cafe Central',
          address: 'Downtown',
          source: 'sample'
        }
      ]
      setEvents(sampleEvents)
      setFilteredEvents(sampleEvents)
      setIsLoading(false)
    }
  }, [])

  // Load user ratings and shared ratings
  useEffect(() => {
    loadRatings()
  }, [])

  const loadRatings = async () => {
    try {
      // Load user ratings
      const userRatingsData = await AsyncStorage.getItem('userEventRatings')
      if (userRatingsData) {
        setUserRatings(JSON.parse(userRatingsData))
      }

      // Load shared ratings
      const sharedRatingsData = await ratingService.getAllSharedRatings()
      setSharedRatings(sharedRatingsData)

      // Try to sync any pending ratings
      await ratingService.syncRatings()
    } catch (error) {
      console.log('Error loading ratings:', error)
    }
  }

  const saveUserRating = async (eventId: string, rating: number, review?: string) => {
    try {
      const success = await ratingService.saveRating(eventId, rating, review)
      
      if (success) {
        // Update user stats
        const currentStats = userService.getUserStats()
        if (currentStats) {
          const updates: any = { ratingsGiven: currentStats.ratingsGiven + 1 }
          if (review && review.trim()) {
            updates.reviewsWritten = currentStats.reviewsWritten + 1
          }
          await userService.updateStats(updates)
        }

        // Update local state
        const newRating: EventRating = {
          eventId,
          rating,
          timestamp: Date.now(),
          review
        }
        
        setUserRatings(prev => ({
          ...prev,
          [eventId]: newRating
        }))

        // Refresh shared ratings for this event
        const sharedRating = await ratingService.getSharedRatings(eventId)
        if (sharedRating) {
          setSharedRatings(prev => ({
            ...prev,
            [eventId]: sharedRating
          }))
        }

        Alert.alert('Success', 'Your rating has been saved and shared with the community!')
      } else {
        Alert.alert('Error', 'Failed to save rating. Please try again.')
      }
    } catch (error) {
      console.log('Error saving rating:', error)
      Alert.alert('Error', 'Failed to save rating. Please try again.')
    }
  }

  const getUserRating = (eventId: string): number => {
    return userRatings[eventId]?.rating || 0
  }

  const getUserReview = (eventId: string): string => {
    return userRatings[eventId]?.review || ''
  }

  const getAverageRating = (eventId: string): number => {
    const sharedRating = sharedRatings[eventId]
    if (sharedRating && sharedRating.totalRatings > 0) {
      return Math.round(sharedRating.averageRating * 10) / 10
    }
    
    // Fallback to demo data if no shared ratings
    const baseRating = 3.5 + Math.random() * 1.5
    const userRating = getUserRating(eventId)
    
    if (userRating > 0) {
      return Math.round((baseRating + userRating) / 2 * 10) / 10
    }
    
    return Math.round(baseRating * 10) / 10
  }

  const getRatingCount = (eventId: string): number => {
    const sharedRating = sharedRatings[eventId]
    if (sharedRating) {
      return sharedRating.totalRatings
    }
    
    // Fallback to demo data
    return Math.floor(Math.random() * 50) + 5
  }

  // Get user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied')
        return
      }

      let location = await Location.getCurrentPositionAsync({})
      setLocation(location)
      
      // Update search filters with user location
      setSearchFilters(prev => ({
        ...prev,
        userLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      }))
    })()
  }, [])

  // Search and filter function
  const applySearchAndFilters = () => {
    let filtered = events

    // Text search
    if (searchFilters.query.trim()) {
      const query = searchFilters.query.toLowerCase()
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.address.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (searchFilters.category !== 'All') {
      filtered = filtered.filter(event => {
        const category = determineCategory(event.name, event.description)
        return category === searchFilters.category
      })
    }

    // Date range filter (premium feature)
    if (searchFilters.dateFrom || searchFilters.dateTo) {
      if (!userService.hasFeature('advanced_search')) {
        // For free users, show limited date filtering
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)
        
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.startsAt)
          return eventDate >= today && eventDate <= nextWeek
        })
      } else {
        // Premium users get full date range filtering
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.startsAt)
          const fromDate = searchFilters.dateFrom ? new Date(searchFilters.dateFrom) : null
          const toDate = searchFilters.dateTo ? new Date(searchFilters.dateTo) : null

          if (fromDate && toDate) {
            return eventDate >= fromDate && eventDate <= toDate
          } else if (fromDate) {
            return eventDate >= fromDate
          } else if (toDate) {
            return eventDate <= toDate
          }
          return true
        })
      }
    }

    // Distance filter
    if (searchFilters.distanceFilter && searchFilters.userLocation) {
      filtered = filtered.filter(event => {
        const distance = calculateDistance(
          searchFilters.userLocation!.latitude,
          searchFilters.userLocation!.longitude,
          event.latitude,
          event.longitude
        )
        return distance <= searchFilters.distanceRadius
      })
    }

    setFilteredEvents(filtered)
  }

  // Apply filters when search criteria change
  useEffect(() => {
    applySearchAndFilters()
  }, [searchFilters.query, searchFilters.category, searchFilters.dateFrom, searchFilters.dateTo, searchFilters.distanceFilter, searchFilters.distanceRadius, searchFilters.userLocation])

  // Initial region (centered on Estonia)
  const initialRegion = {
    latitude: 58.3776252,
    longitude: 26.7290063,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  }

  const handleMarkerPress = (event: Event) => {
    const { date, time } = parseDateTime(event.startsAt)
    const category = determineCategory(event.name, event.description)
    const averageRating = getAverageRating(event.id)
    const ratingCount = getRatingCount(event.id)
    const userRating = getUserRating(event.id)
    
    let distanceInfo = ''
    if (searchFilters.userLocation) {
      const distance = calculateDistance(
        searchFilters.userLocation.latitude,
        searchFilters.userLocation.longitude,
        event.latitude,
        event.longitude
      )
      distanceInfo = `\n📍 Distance: ${distance.toFixed(1)} km from you`
    }
    
    const ratingInfo = `\n⭐ Community Rating: ${averageRating}/5 (${ratingCount} reviews)`
    const userRatingInfo = userRating > 0 ? `\n👤 Your Rating: ${userRating}/5` : ''
    const syncInfo = '\n📱 Local rating only (backend not configured)'
    
    Alert.alert(
      event.name,
      `${event.description}\n\n📍 ${event.venue}\n📅 ${date} at ${time}\n🎯 Category: ${category}${distanceInfo}${ratingInfo}${userRatingInfo}${syncInfo}`,
      [
        { text: 'Rate Event', onPress: () => openRatingModal(event) },
        { text: 'OK' }
      ]
    )
  }

  const openRatingModal = (event: Event) => {
    setSelectedEvent(event)
    setCurrentRating(getUserRating(event.id))
    setReviewText(getUserReview(event.id))
    setShowRatingModal(true)
  }

  const submitRating = () => {
    if (selectedEvent && currentRating > 0) {
      saveUserRating(selectedEvent.id, currentRating, reviewText.trim() || undefined)
      setShowRatingModal(false)
      setSelectedEvent(null)
      setCurrentRating(0)
      setReviewText('')
    } else {
      Alert.alert('Error', 'Please select a rating before submitting.')
    }
  }

  const clearFilters = () => {
    setSearchFilters(prev => ({
      ...prev,
      query: '',
      category: 'All',
      dateFrom: '',
      dateTo: '',
      distanceFilter: false,
      distanceRadius: 10
    }))
  }

  const getCategoryCount = (category: string) => {
    if (category === 'All') return events.length
    return events.filter(event => {
      const eventCategory = determineCategory(event.name, event.description)
      return eventCategory === category
    }).length
  }

  const getEventsInRadius = (radius: number) => {
    if (!searchFilters.userLocation) return 0
    return events.filter(event => {
      const distance = calculateDistance(
        searchFilters.userLocation!.latitude,
        searchFilters.userLocation!.longitude,
        event.latitude,
        event.longitude
      )
      return distance <= radius
    }).length
  }

  const renderStars = (rating: number, size: number = 20, interactive: boolean = false, onPress?: (star: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => interactive && onPress && onPress(star)}
            disabled={!interactive}
          >
            <Text style={[styles.star, { fontSize: size }]}>
              {star <= rating ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  // Event creation functions
  const openCreateEventModal = () => {
    // Don't set location yet - let user choose during creation
    setNewEvent({
      name: '',
      description: '',
      venue: '',
      address: '',
      startsAt: '',
      category: 'Other',
      latitude: 0,
      longitude: 0
    })
    setSelectedLocation(null) // No location selected initially
    setIsMapMode(false) // Start in form mode
    setShowCreateEventModal(true)
  }

  const handleMapPress = (event: any) => {
    if (showCreateEventModal && isMapMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate
      setSelectedLocation({ latitude, longitude })
      setNewEvent(prev => ({
        ...prev,
        latitude,
        longitude
      }))
      // Switch back to form mode after selecting location
      setIsMapMode(false)
    }
  }

  const createEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.description.trim() || !newEvent.venue.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (name, description, venue)')
      return
    }

    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a location on the map')
      return
    }

    // Check if user is authenticated for premium features
    const isAuthenticated = userService.isAuthenticated()
    const hasPremium = userService.hasPremiumSubscription()
    
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required', 
        'Please sign in to create events and sync them across devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => setShowUserProfile(true) }
        ]
      )
      return
    }

    setIsCreatingEvent(true)

    try {
      // Create event data
      const eventData = {
        name: newEvent.name.trim(),
        description: newEvent.description.trim(),
        venue: newEvent.venue.trim(),
        address: newEvent.address.trim(),
        startsAt: newEvent.startsAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        url: '',
        category: newEvent.category
      }

      // Use eventService to create and share the event
      const success = await eventService.createEvent(eventData)
      
      if (success) {
        // Update user stats
        const currentStats = userService.getUserStats()
        if (currentStats) {
          await userService.updateStats({
            eventsCreated: currentStats.eventsCreated + 1,
            totalEvents: currentStats.totalEvents + 1
          })
        }

        // Reload events to include the new one
        try {
          await loadUserCreatedEvents()
        } catch (reloadError) {
          console.log('Error reloading events after creation:', reloadError)
          // Event was still created successfully, just couldn't reload
        }
        
        // Check backend status for user feedback
        const syncStatus = await eventService.getSyncStatus()
        
        let message = 'Your event has been created successfully! 🎉'
        if (!syncStatus.backendAvailable) {
          message += '\n\n📱 Event saved locally (backend not configured)'
        } else if (syncStatus.pendingEvents > 0) {
          message += `\n\n⏳ ${syncStatus.pendingEvents} events queued for sync`
        } else {
          message += '\n\n🌐 Event shared with the community!'
        }
        
        Alert.alert(
          'Success!', 
          message,
          [{ text: 'OK', onPress: () => setShowCreateEventModal(false) }]
        )

        // Reset form
        setNewEvent({
          name: '',
          description: '',
          venue: '',
          address: '',
          startsAt: '',
          category: 'Other',
          latitude: 0,
          longitude: 0
        })
        setSelectedLocation(null)
      } else {
        Alert.alert('Error', 'Failed to create event. Please try again.')
      }

    } catch (error) {
      console.error('Error creating event:', error)
      Alert.alert('Error', 'Failed to create event. Please try again.')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const loadUserCreatedEvents = async () => {
    try {
      // Load all events (imported + user-created + shared)
      const allEvents = await eventService.getAllEvents()
      
      // Merge with imported events, avoiding duplicates
      const mergedEvents = [...eventsData, ...allEvents]
      const uniqueEvents = mergedEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      )
      
      setEvents(uniqueEvents)
      setFilteredEvents(uniqueEvents)
      
      // Try to sync any pending events (this will be skipped if backend is not configured)
      try {
        await eventService.syncEvents()
      } catch (syncError) {
        console.log('Sync failed (this is normal if backend is not configured):', syncError)
      }
      
      // Update sync status
      try {
        const status = await eventService.getSyncStatus()
        setSyncStatus(status)
      } catch (statusError) {
        console.log('Error getting sync status:', statusError)
      }
      
    } catch (error) {
      console.error('Error loading events:', error)
      // Fallback to imported events only
      setEvents(eventsData)
      setFilteredEvents(eventsData)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => setSearchFilters(prev => ({ ...prev, showSearchModal: true }))}
        >
          <Text style={styles.searchBarText}>
            {searchFilters.query ? `"${searchFilters.query}"` : 'Search events...'}
          </Text>
          <Text style={styles.searchBarSubtext}>
            {filteredEvents.length} of {events.length} events
            {searchFilters.distanceFilter && searchFilters.userLocation && (
              ` • Within ${searchFilters.distanceRadius}km`
            )}
            {!syncStatus.backendAvailable && ' • 📱 Local'}
            {syncStatus.pendingEvents > 0 && ` • ⏳ ${syncStatus.pendingEvents} pending`}
          </Text>
        </TouchableOpacity>
        
        {(searchFilters.query || searchFilters.category !== 'All' || searchFilters.dateFrom || searchFilters.dateTo || searchFilters.distanceFilter) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings Icon */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setShowUserProfile(true)}
      >
        <Text style={styles.settingsIcon}>👤</Text>
        <View style={styles.eventCountBadge}>
          <Text style={styles.eventCountBadgeText}>{events.length}</Text>
        </View>
      </TouchableOpacity>

      {/* Create Event Button */}
      <TouchableOpacity 
        style={styles.createEventButton}
        onPress={openCreateEventModal}
      >
        <Text style={styles.createEventButtonText}>+</Text>
      </TouchableOpacity>

      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={handleMapPress}
      >
        {/* Distance radius circle */}
        {searchFilters.distanceFilter && searchFilters.userLocation && (
          <Circle
            center={searchFilters.userLocation}
            radius={searchFilters.distanceRadius * 1000} // Convert km to meters
            strokeColor="rgba(0, 122, 255, 0.3)"
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeWidth={2}
          />
        )}

        {/* Selected location for new event */}
        {showCreateEventModal && selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            pinColor="purple"
            title="Selected Location"
            description="Tap to change location"
          />
        )}

        {filteredEvents.map((event) => {
          const category = determineCategory(event.name, event.description)
          const averageRating = getAverageRating(event.id)
          const userRating = getUserRating(event.id)
          
          return (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              onPress={() => handleMarkerPress(event)}
              pinColor={event.source === 'user' ? 'purple' : getMarkerColor(category)}
            />
          )
        })}
      </MapView>

      {/* Create Event Modal */}
      <Modal
        visible={showCreateEventModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isMapMode ? 'Select Location' : 'Create New Event'}
            </Text>
            <View style={styles.modalHeaderButtons}>
              {!isMapMode && (
                <TouchableOpacity 
                  style={styles.mapModeButton}
                  onPress={() => setIsMapMode(true)}
                >
                  <Text style={styles.mapModeButtonText}>📍 Map</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => {
                  setShowCreateEventModal(false)
                  setIsMapMode(false)
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isMapMode ? (
            <View style={styles.mapSelectionContainer}>
              <MapView
                style={styles.mapSelectionMap}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
                onPress={handleMapPress}
              >
                {/* Selected location for new event */}
                {selectedLocation && (
                  <Marker
                    coordinate={selectedLocation}
                    pinColor="purple"
                    title="Selected Location"
                    description="Tap to change location"
                  />
                )}
              </MapView>
              <View style={styles.mapSelectionInfo}>
                <Text style={styles.mapSelectionInfoText}>
                  📍 Tap anywhere on the map to select event location
                </Text>
                <Text style={styles.mapSelectionInfoText}>
                  💡 The purple marker shows your selected location
                </Text>
                {selectedLocation && (
                  <TouchableOpacity 
                    style={styles.confirmLocationButton}
                    onPress={() => setIsMapMode(false)}
                  >
                    <Text style={styles.confirmLocationButtonText}>Confirm Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              <View style={styles.createEventInfo}>
                <Text style={styles.createEventInfoText}>
                  📍 Use the "📍 Map" button to select event location
                </Text>
                <Text style={styles.createEventInfoText}>
                  {syncStatus.backendAvailable 
                    ? '🌐 Your event will be shared with the community'
                    : '📱 Your event will be saved locally'
                  }
                </Text>
                <Text style={styles.createEventInfoText}>
                  💡 The purple marker shows your selected location
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter event name..."
                  value={newEvent.name}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe your event..."
                  value={newEvent.description}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Venue *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter venue name..."
                  value={newEvent.venue}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, venue: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter full address..."
                  value={newEvent.address}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, address: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date & Time</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD HH:MM (optional)"
                  value={newEvent.startsAt}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, startsAt: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {['Other', 'Music', 'Theater', 'Museum', 'Comedy', 'Cultural'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        newEvent.category === category && styles.categoryButtonActive
                      ]}
                      onPress={() => setNewEvent(prev => ({ ...prev, category }))}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        newEvent.category === category && styles.categoryButtonTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {selectedLocation ? (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationInfoText}>
                    📍 Selected Location: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              ) : (
                <View style={styles.locationWarning}>
                  <Text style={styles.locationWarningText}>
                    ⚠️ Please tap on the map to select a location for your event
                  </Text>
                </View>
              )}

              <View style={styles.shareInfo}>
                <Text style={styles.shareInfoText}>
                  {syncStatus.backendAvailable 
                    ? '🌐 This event will be shared with all users in the community'
                    : '📱 This event will be saved locally (backend not configured)'
                  }
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, isCreatingEvent && styles.submitButtonDisabled]}
                onPress={createEvent}
                disabled={isCreatingEvent}
              >
                <Text style={styles.submitButtonText}>
                  {isCreatingEvent 
                    ? 'Creating...' 
                    : syncStatus.backendAvailable 
                      ? 'Create & Share Event'
                      : 'Create Event (Local)'
                  }
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Event</Text>
            <TouchableOpacity 
              onPress={() => setShowRatingModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedEvent && (
              <>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{selectedEvent.name}</Text>
                  <Text style={styles.eventVenue}>{selectedEvent.venue}</Text>
                  <Text style={styles.eventDescription}>{selectedEvent.description}</Text>
                  {selectedEvent.source === 'user' && (
                    <Text style={styles.userCreatedBadge}>👤 Created by you</Text>
                  )}
                </View>

                <View style={styles.ratingSection}>
                  <Text style={styles.ratingTitle}>Your Rating</Text>
                  {renderStars(currentRating, 30, true, setCurrentRating)}
                  <Text style={styles.ratingText}>
                    {currentRating > 0 ? `${currentRating}/5 stars` : 'Tap stars to rate'}
                  </Text>
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.inputLabel}>Review (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.reviewInput]}
                    placeholder="Share your experience with this event..."
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.syncInfo}>
                  <Text style={styles.syncInfoText}>
                    📱 Rating saved locally (backend not configured)
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.submitButton, currentRating === 0 && styles.submitButtonDisabled]}
                  onPress={submitRating}
                  disabled={currentRating === 0}
                >
                  <Text style={styles.submitButtonText}>Submit Rating</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={searchFilters.showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search & Filter</Text>
            <TouchableOpacity 
              onPress={() => setSearchFilters(prev => ({ ...prev, showSearchModal: false }))}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Search Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Search Events</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Search by name, venue, or description..."
                value={searchFilters.query}
                onChangeText={(text) => setSearchFilters(prev => ({ ...prev, query: text }))}
              />
            </View>

            {/* Distance Filter */}
            <View style={styles.inputGroup}>
              <View style={styles.distanceHeader}>
                <Text style={styles.inputLabel}>Distance Filter</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    searchFilters.distanceFilter && styles.toggleButtonActive
                  ]}
                  onPress={() => setSearchFilters(prev => ({ 
                    ...prev, 
                    distanceFilter: !prev.distanceFilter 
                  }))}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    searchFilters.distanceFilter && styles.toggleButtonTextActive
                  ]}>
                    {searchFilters.distanceFilter ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {searchFilters.distanceFilter && (
                <View>
                  <Text style={styles.distanceSubtext}>
                    Show events within {searchFilters.distanceRadius}km of your location
                    {searchFilters.userLocation && (
                      ` (${getEventsInRadius(searchFilters.distanceRadius)} events available)`
                    )}
                  </Text>
                  
                  <View style={styles.radiusSelector}>
                    {[5, 10, 25, 50, 100].map((radius) => (
                      <TouchableOpacity
                        key={radius}
                        style={[
                          styles.radiusButton,
                          searchFilters.distanceRadius === radius && styles.radiusButtonActive
                        ]}
                        onPress={() => setSearchFilters(prev => ({ ...prev, distanceRadius: radius }))}
                      >
                        <Text style={[
                          styles.radiusButtonText,
                          searchFilters.distanceRadius === radius && styles.radiusButtonTextActive
                        ]}>
                          {radius}km
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {!searchFilters.userLocation && (
                    <Text style={styles.locationWarning}>
                      ⚠️ Location access required for distance filtering
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Category Filter */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {['All', 'Music', 'Theater', 'Museum', 'Comedy', 'Cultural'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      searchFilters.category === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setSearchFilters(prev => ({ ...prev, category }))}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      searchFilters.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category} ({getCategoryCount(category)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date Range */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date Range</Text>
              {!userService.hasFeature('advanced_search') && (
                <View style={styles.premiumPrompt}>
                  <Text style={styles.premiumPromptText}>
                    ⭐ Upgrade to Premium for unlimited date filtering
                  </Text>
                  <TouchableOpacity 
                    style={styles.premiumButton}
                    onPress={() => {
                      setSearchFilters(prev => ({ ...prev, showSearchModal: false }))
                      setShowUserProfile(true)
                    }}
                  >
                    <Text style={styles.premiumButtonText}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>From</Text>
                  <TextInput
                    style={[styles.textInput, !userService.hasFeature('advanced_search') && styles.disabledInput]}
                    placeholder="YYYY-MM-DD"
                    value={searchFilters.dateFrom}
                    onChangeText={(text) => setSearchFilters(prev => ({ ...prev, dateFrom: text }))}
                    editable={userService.hasFeature('advanced_search')}
                  />
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>To</Text>
                  <TextInput
                    style={[styles.textInput, !userService.hasFeature('advanced_search') && styles.disabledInput]}
                    placeholder="YYYY-MM-DD"
                    value={searchFilters.dateTo}
                    onChangeText={(text) => setSearchFilters(prev => ({ ...prev, dateTo: text }))}
                    editable={userService.hasFeature('advanced_search')}
                  />
                </View>
              </View>
            </View>

            {/* Search Results Preview */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Results ({filteredEvents.length} events)</Text>
              <ScrollView style={styles.resultsPreview} showsVerticalScrollIndicator={false}>
                {filteredEvents.slice(0, 10).map((event) => {
                  let distanceInfo = ''
                  if (searchFilters.userLocation) {
                    const distance = calculateDistance(
                      searchFilters.userLocation.latitude,
                      searchFilters.userLocation.longitude,
                      event.latitude,
                      event.longitude
                    )
                    distanceInfo = ` • ${distance.toFixed(1)}km away`
                  }
                  
                  const averageRating = getAverageRating(event.id)
                  const ratingCount = getRatingCount(event.id)
                  const userRating = getUserRating(event.id)
                  
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.resultItem}
                      onPress={() => {
                        setSearchFilters(prev => ({ ...prev, showSearchModal: false }))
                        handleMarkerPress(event)
                      }}
                    >
                      <Text style={styles.resultTitle}>{event.name}</Text>
                      <Text style={styles.resultVenue}>{event.venue}{distanceInfo}</Text>
                      <View style={styles.resultRating}>
                        {renderStars(averageRating, 14)}
                        <Text style={styles.resultRatingText}>
                          {averageRating} ({ratingCount})
                        </Text>
                        {userRating > 0 && (
                          <Text style={styles.userRatingText}>
                            • You: {userRating}/5
                          </Text>
                        )}
                        {event.source === 'user' && (
                          <Text style={styles.userCreatedText}>
                            • 👤 Created by you
                          </Text>
                        )}
                        {sharedRatings[event.id] && (
                          <Text style={styles.sharedRatingText}>
                            • 🌐 Shared
                          </Text>
                        )}
                      </View>
                      <Text style={styles.resultDate}>
                        {parseDateTime(event.startsAt).date} at {parseDateTime(event.startsAt).time}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
                {filteredEvents.length > 10 && (
                  <Text style={styles.moreResults}>... and {filteredEvents.length - 10} more</Text>
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* User Profile Modal */}
      <UserProfile 
        visible={showUserProfile} 
        onClose={() => setShowUserProfile(false)} 
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBarText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  searchBarSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  clearButton: {
    marginLeft: 10,
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createEventButton: {
    position: 'absolute',
    bottom: 30, // Move closer to bottom since no bottom sheet
    right: 20,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  createEventButtonText: {
    color: 'white',
    fontSize: 24, // Larger font for the + sign
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapModeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  mapModeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  eventInfo: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  eventVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  userCreatedBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  ratingSection: {
    marginBottom: 25,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  starButton: {
    marginHorizontal: 2,
  },
  star: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  reviewSection: {
    marginBottom: 25,
  },
  reviewInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  syncInfo: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  syncInfoText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 80,
  },
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  distanceSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  radiusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  radiusButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  radiusButtonActive: {
    backgroundColor: '#007AFF',
  },
  radiusButtonText: {
    fontSize: 14,
    color: '#666',
  },
  radiusButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  locationWarning: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  locationWarningText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginRight: 10,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  locationInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f0f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  locationInfoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  shareInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  shareInfoText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  userCreatedText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 5,
    fontWeight: '600',
  },
  createEventInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  createEventInfoText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
    textAlign: 'center',
  },
  resultsPreview: {
    maxHeight: 300,
  },
  resultItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  userRatingText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 5,
    fontWeight: '600',
  },
  sharedRatingText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 5,
    fontWeight: '600',
  },
  resultDate: {
    fontSize: 12,
    color: '#999',
  },
  moreResults: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  mapSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  mapSelectionMap: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapSelectionInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapSelectionInfoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmLocationButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmLocationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 24,
    color: '#333',
  },
  eventCountBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  eventCountBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  premiumPrompt: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffeeba',
    marginBottom: 15,
    alignItems: 'center',
  },
  premiumPromptText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 10,
  },
  premiumButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  premiumButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledInput: {
    opacity: 0.7,
  },
})

export default MapViewNative
