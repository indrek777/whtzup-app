import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, ScrollView, Modal, Image, Switch, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Share } from 'react-native'
import MapView, { Marker, Circle, Region, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import * as Sharing from 'expo-sharing'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Event } from '../data/events'
import { ratingService, EventRating, SharedRating } from '../utils/ratingService'
import { eventService } from '../utils/eventService'
import { userService } from '../utils/userService'
import { loadEventsPartially, getTotalEventsCount } from '../utils/eventLoader'

const UserProfile = require('./UserProfile')
import DateTimePicker from '@react-native-community/datetimepicker'
import { GeocodingSearchResult, searchAddress, reverseGeocode } from '../utils/geocoding'
import debounce from 'lodash/debounce'

// Marker color function
const getMarkerColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'sports':
      return 'red'
    case 'music':
    case 'concert':
    case 'festival':
      return 'orange'
    case 'theater':
    case 'performance':
      return 'blue'
    case 'art':
    case 'museum':
    case 'exhibition':
      return 'green'
    case 'comedy':
    case 'stand-up':
      return 'purple'
    case 'food & drink':
      return 'yellow'
    case 'business':
      return 'indigo'
    case 'technology':
      return 'green'
    case 'family & kids':
      return 'pink'
    case 'health & wellness':
      return 'lightblue'
    case 'cultural':
    case 'ball':
      return 'magenta'
    case 'nightlife':
      return 'darkblue'
    case 'charity & community':
      return 'teal'
    case 'fashion & beauty':
      return 'hotpink'
    case 'science & education':
      return 'gray'
    case 'nature & environment':
      return 'darkgreen'
    case 'gaming & entertainment':
      return 'brown'
    case 'other':
      return 'lightgray'
    default:
      return 'gray'
  }
}

// Marker icon function - returns emoji or symbol for event category
const getMarkerIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'sports':
      return '⚽'
    case 'music':
    case 'concert':
    case 'festival':
      return '🎵'
    case 'theater':
    case 'performance':
      return '🎭'
    case 'art':
    case 'museum':
    case 'exhibition':
      return '🎨'
    case 'comedy':
    case 'stand-up':
      return '😂'
    case 'food & drink':
      return '🍽️'
    case 'business':
      return '💼'
    case 'technology':
      return '🤖'
    case 'family & kids':
      return '👨‍👩‍👧‍👦'
    case 'health & wellness':
      return '🧘'
    case 'cultural':
    case 'ball':
      return '🎪'
    case 'nightlife':
      return '🌙'
    case 'charity & community':
      return '🤝'
    case 'fashion & beauty':
      return '👗'
    case 'science & education':
      return '🔬'
    case 'nature & environment':
      return '🌿'
    case 'gaming & entertainment':
      return '🎮'
           case 'other':
         return '📍'
       default:
         return '📍'
  }
}

// Category determination function
const determineCategory = (name: string, description: string): string => {
  const text = (name + ' ' + description).toLowerCase()
  
  // Sports categories
  if (text.includes('football') || text.includes('soccer') || text.includes('match') || text.includes('game')) {
    return 'Sports'
  } else if (text.includes('basketball') || text.includes('volleyball') || text.includes('tennis')) {
    return 'Sports'
  } else if (text.includes('running') || text.includes('marathon') || text.includes('race')) {
    return 'Sports'
  } else if (text.includes('swimming') || text.includes('gym') || text.includes('fitness')) {
    return 'Sports'
  } else if (text.includes('yoga') || text.includes('pilates') || text.includes('workout')) {
    return 'Sports'
  } else if (text.includes('cycling') || text.includes('bike') || text.includes('cycling')) {
    return 'Sports'
  } else if (text.includes('hiking') || text.includes('climbing') || text.includes('outdoor')) {
    return 'Sports'
  }
  
  // Music categories
  else if (text.includes('concert') || text.includes('music') || text.includes('festival') || text.includes('symphony')) {
    return 'Music'
  } else if (text.includes('jazz') || text.includes('rock') || text.includes('pop') || text.includes('classical')) {
    return 'Music'
  } else if (text.includes('opera') || text.includes('orchestra') || text.includes('band')) {
    return 'Music'
  }
  
  // Theater & Performance
  else if (text.includes('theater') || text.includes('performance') || text.includes('ballet')) {
    return 'Theater'
  } else if (text.includes('dance') || text.includes('show') || text.includes('play')) {
    return 'Theater'
  } else if (text.includes('musical') || text.includes('drama') || text.includes('acting')) {
    return 'Theater'
  }
  
  // Art & Culture
  else if (text.includes('museum') || text.includes('exhibition') || text.includes('näitus')) {
    return 'Art'
  } else if (text.includes('gallery') || text.includes('painting') || text.includes('sculpture')) {
    return 'Art'
  } else if (text.includes('photography') || text.includes('art') || text.includes('creative')) {
    return 'Art'
  }
  
  // Comedy & Entertainment
  else if (text.includes('comedy') || text.includes('stand-up') || text.includes('humor')) {
    return 'Comedy'
  } else if (text.includes('magic') || text.includes('circus') || text.includes('variety')) {
    return 'Comedy'
  }
  
  // Food & Drink
  else if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) {
    return 'Food & Drink'
  } else if (text.includes('wine') || text.includes('beer') || text.includes('cocktail')) {
    return 'Food & Drink'
  } else if (text.includes('cooking') || text.includes('chef') || text.includes('culinary')) {
    return 'Food & Drink'
  } else if (text.includes('tasting') || text.includes('festival') || text.includes('market')) {
    return 'Food & Drink'
  }
  
  // Business & Professional
  else if (text.includes('conference') || text.includes('seminar') || text.includes('workshop')) {
    return 'Business'
  } else if (text.includes('meeting') || text.includes('networking') || text.includes('business')) {
    return 'Business'
  } else if (text.includes('training') || text.includes('course') || text.includes('education')) {
    return 'Business'
  }
  
  // Technology
  else if (text.includes('tech') || text.includes('technology') || text.includes('digital')) {
    return 'Technology'
  } else if (text.includes('startup') || text.includes('innovation') || text.includes('ai')) {
    return 'Technology'
  } else if (text.includes('coding') || text.includes('programming') || text.includes('hackathon')) {
    return 'Technology'
  }
  
  // Family & Kids
  else if (text.includes('kids') || text.includes('children') || text.includes('family')) {
    return 'Family & Kids'
  } else if (text.includes('playground') || text.includes('toy') || text.includes('story')) {
    return 'Family & Kids'
  }
  
  // Health & Wellness
  else if (text.includes('health') || text.includes('wellness') || text.includes('medical')) {
    return 'Health & Wellness'
  } else if (text.includes('therapy') || text.includes('healing') || text.includes('mindfulness')) {
    return 'Health & Wellness'
  }
  
  // Cultural & Heritage
  else if (text.includes('cultural') || text.includes('heritage') || text.includes('traditional')) {
    return 'Cultural'
  } else if (text.includes('ball') || text.includes('ceremony') || text.includes('celebration')) {
    return 'Cultural'
  } else if (text.includes('festival') || text.includes('holiday') || text.includes('custom')) {
    return 'Cultural'
  }
  
  // Nightlife
  else if (text.includes('club') || text.includes('party') || text.includes('nightlife')) {
    return 'Nightlife'
  } else if (text.includes('bar') || text.includes('pub') || text.includes('dance')) {
    return 'Nightlife'
  }
  
  // Charity & Community
  else if (text.includes('charity') || text.includes('volunteer') || text.includes('community')) {
    return 'Charity & Community'
  } else if (text.includes('fundraiser') || text.includes('donation') || text.includes('help')) {
    return 'Charity & Community'
  }
  
  // Fashion & Beauty
  else if (text.includes('fashion') || text.includes('beauty') || text.includes('style')) {
    return 'Fashion & Beauty'
  } else if (text.includes('makeup') || text.includes('cosmetic') || text.includes('design')) {
    return 'Fashion & Beauty'
  }
  
  // Science & Education
  else if (text.includes('science') || text.includes('research') || text.includes('lecture')) {
    return 'Science & Education'
  } else if (text.includes('university') || text.includes('academic') || text.includes('study')) {
    return 'Science & Education'
  }
  
  // Nature & Environment
  else if (text.includes('nature') || text.includes('environment') || text.includes('eco')) {
    return 'Nature & Environment'
  } else if (text.includes('park') || text.includes('garden') || text.includes('outdoor')) {
    return 'Nature & Environment'
  }
  
  // Gaming & Entertainment
  else if (text.includes('game') || text.includes('gaming') || text.includes('esports')) {
    return 'Gaming & Entertainment'
  } else if (text.includes('board') || text.includes('card') || text.includes('tournament')) {
    return 'Gaming & Entertainment'
  }
  
  // Other
  else {
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
  source: string
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
  isRecurring: boolean
  recurringPattern: 'daily' | 'weekly' | 'monthly' | 'custom'
  recurringDays: number[] // For weekly: [0,1,2,3,4,5,6] (Sunday=0)
  recurringInterval: number // Every X days/weeks/months
  recurringEndDate: string // When to stop recurring
  recurringOccurrences: number // Number of occurrences
}

// Custom marker component to prevent icon replacement issues
const CustomMarker = React.memo(({ 
  event, 
  category, 
  onPress, 
  markerRef
}: {
  event: Event
  category: string
  onPress: () => void
  markerRef: (ref: any) => void
}) => {
  const markerColor = event.source === 'user' ? 'purple' : getMarkerColor(category)
  const markerIcon = event.source === 'user' ? '⭐' : getMarkerIcon(category)
  
  // Create a colored circle with category icon as marker
  return (
    <Marker
      ref={markerRef}
      coordinate={{
        latitude: event.latitude,
        longitude: event.longitude,
      }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      flat={false}
      opacity={1}
      draggable={false}
      zIndex={event.source === 'user' ? 1000 : 1}
    >
      <View style={[
        styles.customMarker,
        { 
          backgroundColor: markerColor,
          borderColor: markerColor === 'yellow' || markerColor === 'lightgray' ? '#333' : 'white'
        }
      ]}>
        <Text style={[
          styles.markerText,
          { color: markerColor === 'yellow' || markerColor === 'lightgray' ? '#333' : 'white' }
        ]}>
          {markerIcon}
        </Text>
      </View>
    </Marker>
  )
})

const MapViewNative: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
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
  const reviewInputRef = useRef<TextInput>(null)
  const scrollViewRef = useRef<ScrollView>(null)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [eventDetails, setEventDetails] = useState<{event: Event, distanceInfo: string, ratingInfo: string, userRatingInfo: string, syncInfo: string, date: string, time: string, category: string} | null>(null)
  
  // State for marker behavior
  const markerRefs = useRef<{ [key: string]: any }>({})
  const clickedMarkerIdRef = useRef<string | null>(null)
  const isProcessingClickRef = useRef<boolean>(false)
  
  // Track component lifecycle and ref initialization
  useEffect(() => {
    isProcessingClickRef.current = false
    clickedMarkerIdRef.current = null
  }, [])
  
  // Simple map state - initialize with Estonia, will be updated to user location
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 58.3776252,
    longitude: 26.7290063,
    latitudeDelta: 0.2, // Approximately 20km view
    longitudeDelta: 0.2, // Approximately 20km view
  })
  
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
    longitude: 0,
    isRecurring: false,
    recurringPattern: 'daily',
    recurringDays: [0],
    recurringInterval: 1,
    recurringEndDate: '',
    recurringOccurrences: 1
  })
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isMapMode, setIsMapMode] = useState(false) // New state for map interaction mode
  
  // Event editing states
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    category: 'All',
    source: 'All',
    dateFrom: new Date().toISOString().split('T')[0], // Today
    dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
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
  
  // User service state
  const [userFeatures, setUserFeatures] = useState<{
    hasAdvancedSearch: boolean
    hasPremium: boolean
    canCreateEventToday: boolean
  }>({
    hasAdvancedSearch: false,
    hasPremium: false,
    canCreateEventToday: false
  })

  // Current loading radius state
  const [currentLoadingRadius, setCurrentLoadingRadius] = useState<number>(20)

  // Ensure free users can't have radius greater than 20km
  useEffect(() => {
    if (!userFeatures.hasPremium && searchFilters.distanceRadius > 20) {
      setSearchFilters(prev => ({ ...prev, distanceRadius: 20 }))
    }
  }, [userFeatures.hasPremium, searchFilters.distanceRadius])

  // Date/Time picker states
  const [showDateFromPicker, setShowDateFromPicker] = useState(false)
  const [showDateToPicker, setShowDateToPicker] = useState(false)
  const [showEventTimePicker, setShowEventTimePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)

  // Simple event limiting - no clustering needed

  // Load events and center map based on user location
  useEffect(() => {
    const loadEventsAndCenterMap = async () => {
      try {
        setIsLoading(true)
        
        // Get user location for initial loading
        let { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied')
          // Load events without location filtering and center on Estonia
          const radius = await getEventLoadingRadius()
          const initialEvents = await loadEventsPartially({
            userLocation: {
              latitude: 59.436962,
              longitude: 24.753574
            },
            maxDistance: radius
          })
          setEvents(initialEvents)
          setFilteredEvents(initialEvents)
          setIsLoading(false)
          return
        }

        let location = await Location.getCurrentPositionAsync({})
        const userLoc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
        setUserLocation(userLoc)
        setLocation(location)
        
        // Update search filters with user location
        setSearchFilters(prev => ({
          ...prev,
          userLocation: userLoc
        }))
        
        // Center map on user location with 20km view
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.2, // Approximately 20km view
          longitudeDelta: 0.2, // Approximately 20km view
        })

        const radius = await getEventLoadingRadius()
        const initialEvents = await loadEventsPartially({
          userLocation: userLoc,
          maxDistance: radius
        })
        
        setEvents(initialEvents)
        setFilteredEvents(initialEvents)
        setIsLoading(false)
        
        // Load user-created events separately to merge with existing events
        loadUserCreatedEvents(initialEvents)
      } catch (error) {
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
    }

    loadEventsAndCenterMap()
  }, [])

  // Load user ratings and shared ratings
  useEffect(() => {
    loadRatings()
  }, [])

  // Load user features
  useEffect(() => {
    loadUserFeatures()
  }, [])

  // Reload events when premium status changes
  useEffect(() => {
    if (userFeatures.hasPremium !== undefined) {
      // Reload events with new radius when premium status is determined
      reloadEventsWithNewRadius()
    }
  }, [userFeatures.hasPremium])

  // Keyboard event listeners for review input
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Keyboard is shown, no need to scroll manually as KeyboardAvoidingView handles it
    })

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Keyboard is hidden
    })

    return () => {
      keyboardDidShowListener?.remove()
      keyboardDidHideListener?.remove()
    }
  }, [])

  // No longer need to reload events when filters change since we load everything at startup

  // Get event loading radius based on user's premium status
  const getEventLoadingRadius = async (): Promise<number> => {
    try {
      const hasPremium = await userService.hasPremiumSubscription()
      const radius = hasPremium ? 500 : 20 // 500km for premium, 20km for free users
      setCurrentLoadingRadius(radius)
      return radius
    } catch (error) {
      // Fallback to free user radius if there's an error
      setCurrentLoadingRadius(20)
      return 20
    }
  }

  // Reload events with new radius when premium status changes
  const reloadEventsWithNewRadius = async () => {
    try {
      if (!userLocation) return

      const radius = await getEventLoadingRadius()
      const newEvents = await loadEventsPartially({
        userLocation,
        maxDistance: radius
      })
      
      setEvents(newEvents)
      setFilteredEvents(newEvents)
    } catch (error) {
      // Error reloading events
    }
  }

  const loadUserFeatures = async () => {
    try {
      const hasAdvancedSearch = await userService.hasFeature('advanced_search')
      const hasPremium = await userService.hasPremiumSubscription()
      const canCreateEventToday = await userService.canCreateEventToday()
      
      setUserFeatures({
        hasAdvancedSearch,
        hasPremium,
        canCreateEventToday
      })

      // Update loading radius based on premium status
      const radius = hasPremium ? 500 : 20
      setCurrentLoadingRadius(radius)
    } catch (error) {
      // Error loading user features
    }
  }

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
      // Error loading ratings
    }
  }

  const saveUserRating = async (eventId: string, rating: number, review?: string) => {
    try {
      const success = await ratingService.saveRating(eventId, rating, review)
      
      if (success) {
        // Update user stats
        const currentStats = await userService.getUserStats()
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



  // Add new state variables for smart filtering
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodingSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)

  // Smart address search function
  const searchAddressSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearchingAddress(true)
    try {
      // Search for addresses and venues
      const results = await searchAddress(query)
      setAddressSuggestions(results)
      setShowSuggestions(results.length > 0)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setAddressSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsSearchingAddress(false)
    }
  }, [])

  // Debounced address search
  const debouncedAddressSearch = useCallback(
    debounce((query: string) => {
      searchAddressSuggestions(query)
    }, 300),
    [searchAddressSuggestions]
  )

  // Optimized search and filter function - no limits, only country filter
  const applySearchAndFilters = useCallback(() => {
    // Only process if we have events
    if (!events || events.length === 0) {
      setFilteredEvents([])
      return
    }

    let filtered = events

    // Smart text search with venue/address prioritization
    if (searchFilters.query.trim()) {
      const query = searchFilters.query.toLowerCase()
      const queryWords = query.split(' ').filter(word => word.length > 0)
      
      filtered = filtered.filter(event => {
        const eventName = event.name.toLowerCase()
        const eventDescription = event.description.toLowerCase()
        const eventVenue = event.venue.toLowerCase()
        const eventAddress = event.address.toLowerCase()
        
        // Check if all query words are found in any field
        const allWordsFound = queryWords.every(word => 
          eventName.includes(word) ||
          eventDescription.includes(word) ||
          eventVenue.includes(word) ||
          eventAddress.includes(word)
        )
        
        if (!allWordsFound) return false
        
        // Calculate relevance score for smart ordering
        let relevanceScore = 0
        
        // Venue matches get highest priority
        queryWords.forEach(word => {
          if (eventVenue.includes(word)) relevanceScore += 10
          if (eventAddress.includes(word)) relevanceScore += 8
          if (eventName.includes(word)) relevanceScore += 5
          if (eventDescription.includes(word)) relevanceScore += 2
        })
        
        // Add the score to the event for sorting
        ;(event as any).relevanceScore = relevanceScore
        
        return true
      })
      
      // Sort by relevance score (highest first)
      filtered.sort((a, b) => {
        const scoreA = (a as any).relevanceScore || 0
        const scoreB = (b as any).relevanceScore || 0
        return scoreB - scoreA
      })
    }

    // Category filter
    if (searchFilters.category !== 'All') {
      filtered = filtered.filter(event => {
        const category = determineCategory(event.name, event.description)
        return category === searchFilters.category
      })
    }

    // Source filter
    if (searchFilters.source !== 'All') {
      filtered = filtered.filter(event => {
        if (searchFilters.source === 'AI') {
          return event.source === 'ai'
        } else if (searchFilters.source === 'App') {
          return event.source === 'app'
        }
        return true
      })
    }

    // Always filter out past events - never show events that have already happened
    const now = new Date()
    
    filtered = filtered.filter(event => {
      const eventDate = new Date(event.startsAt)
      const isPast = eventDate <= now
              if (isPast) {
          return false
        }
      return eventDate > now
    })

    // Date range filter (premium feature)
    if (searchFilters.dateFrom || searchFilters.dateTo) {
      if (!userFeatures.hasAdvancedSearch) {
        // For free users, show limited date filtering (1 week ahead only)
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
          const fromDate = searchFilters.dateFrom ? new Date(searchFilters.dateFrom) : new Date()
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
    } else {
      // If no date filter is applied, still limit free users to 1 week ahead
      if (!userFeatures.hasAdvancedSearch) {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)
        
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.startsAt)
          return eventDate >= today && eventDate <= nextWeek
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

    // No artificial limits - show all filtered events
    setFilteredEvents(filtered)
  }, [events, searchFilters, userFeatures])

  // Apply filters when search criteria change
  useEffect(() => {
    applySearchAndFilters()
  }, [searchFilters.query, searchFilters.category, searchFilters.source, searchFilters.dateFrom, searchFilters.dateTo, searchFilters.distanceFilter, searchFilters.distanceRadius, searchFilters.userLocation, userFeatures, applySearchAndFilters])

  // Handle map region changes - just update the region, no need to reload events
  const handleRegionChange = useCallback((region: Region) => {
    // Only update if the region has actually changed significantly
    const currentRegion = mapRegion
    const latDiff = Math.abs(region.latitude - currentRegion.latitude)
    const lngDiff = Math.abs(region.longitude - currentRegion.longitude)
    const latDeltaDiff = Math.abs(region.latitudeDelta - currentRegion.latitudeDelta)
    const lngDeltaDiff = Math.abs(region.longitudeDelta - currentRegion.longitudeDelta)
    
    // Only update if change is significant (prevents excessive re-renders)
    if (latDiff > 0.001 || lngDiff > 0.001 || latDeltaDiff > 0.1 || lngDeltaDiff > 0.1) {
      setMapRegion(region)
    }
  }, [mapRegion])

  // Use current map region instead of hardcoded Estonia coordinates
  const initialRegion = mapRegion





  // Create marker press handler for each event
  const createMarkerPressHandler = useCallback((event: Event) => {
    return () => {
      // Prevent multiple rapid clicks within 300ms
      if (isProcessingClickRef.current) {
        return
      }
      
      isProcessingClickRef.current = true
      
      // Set the clicked marker
      clickedMarkerIdRef.current = event.id
      
      // Open the event details modal directly instead of showing callout
      openEventDetailsModal(event)
      
      // Reset the processing flag after a delay
      setTimeout(() => {
        isProcessingClickRef.current = false
      }, 300)
    }
  }, [])

  // Helper function to open event details modal
  const openEventDetailsModal = useCallback((event: Event) => {
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
      distanceInfo = `📍 Distance: ${distance.toFixed(1)} km from you`
    }
    
    const ratingInfo = `⭐ Community Rating: ${averageRating}/5 (${ratingCount} reviews)`
    const userRatingInfo = userRating > 0 ? `👤 Your Rating: ${userRating}/5` : ''
    const syncInfo = '📱 Local rating only (backend not configured)'
    
    setEventDetails({
      event,
      distanceInfo,
      ratingInfo,
      userRatingInfo,
      syncInfo,
      date,
      time,
      category
    })
    setShowEventDetailsModal(true)
    clickedMarkerIdRef.current = null
  }, []) // Remove dependencies to prevent recreation



  // Memoized markers to prevent unnecessary re-renders
  const memoizedMarkers = useMemo(() => {
    return filteredEvents.map((event) => {
      const category = determineCategory(event.name, event.description)
      
      return (
        <CustomMarker
          key={event.id}
          event={event}
          category={category}
          onPress={createMarkerPressHandler(event)}
          markerRef={(ref) => {
            if (ref) {
              markerRefs.current[event.id] = ref
            }
          }}
        />
      )
    })
  }, [filteredEvents]) // Remove function dependencies since they're now stable

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
      source: 'All',
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

  const getSourceCount = (source: string) => {
    if (source === 'All') return events.length
    return events.filter(event => {
      if (source === 'AI') {
        return event.source === 'ai'
      } else if (source === 'App') {
        return event.source === 'app'
      }
      return true
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
      longitude: 0,
      isRecurring: false,
      recurringPattern: 'daily',
      recurringDays: [0],
      recurringInterval: 1,
      recurringEndDate: '',
      recurringOccurrences: 1
    })
    setSelectedLocation(null) // No location selected initially
    setIsMapMode(false) // Start in form mode
    setShowCreateEventModal(true)
  }

  const handleMapPress = useCallback(async (event: any) => {
    // Don't handle map press if we're currently processing a marker click
    if (isProcessingClickRef.current) {
      return
    }
    
    // Reset clicked marker when tapping elsewhere on the map
    if (clickedMarkerIdRef.current) {
      // Hide the callout
      if (markerRefs.current[clickedMarkerIdRef.current]) {
        markerRefs.current[clickedMarkerIdRef.current].hideCallout()
      }
      clickedMarkerIdRef.current = null
    }
    
    if (showCreateEventModal && isMapMode) {
      const { latitude, longitude } = event.nativeEvent.coordinate
      setSelectedLocation({ latitude, longitude })
      
      // Get location data using reverse geocoding
      try {
        const locationData = await reverseGeocode(latitude, longitude)
        if (locationData) {
          // Extract venue name and address from the reverse geocoding result
          let venueName = ''
          let address = locationData.display_name
          
          // Try to extract venue name from address components
          if (locationData.address) {
            // Look for common venue indicators
            const venueIndicators = ['building', 'amenity', 'shop', 'leisure', 'tourism']
            for (const indicator of venueIndicators) {
              if (locationData.address[indicator]) {
                venueName = locationData.address[indicator]
                break
              }
            }
            
            // If no specific venue found, use the first meaningful part of the address
            if (!venueName) {
              const addressParts = locationData.display_name.split(', ')
              if (addressParts.length > 0) {
                venueName = addressParts[0]
              }
            }
          }
          
          setNewEvent(prev => ({
            ...prev,
            latitude,
            longitude,
            venue: venueName || 'Selected Location',
            address: address || ''
          }))
        } else {
          // Fallback if reverse geocoding fails
          setNewEvent(prev => ({
            ...prev,
            latitude,
            longitude,
            venue: 'Selected Location',
            address: ''
          }))
        }
      } catch (error) {
        // Fallback if reverse geocoding fails
        setNewEvent(prev => ({
          ...prev,
          latitude,
          longitude,
          venue: 'Selected Location',
          address: ''
        }))
      }
      
      // Switch back to form mode after selecting location
      setIsMapMode(false)
    }
  }, [showCreateEventModal, isMapMode])

  const createEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.description.trim() || !newEvent.venue.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (name, description, venue)')
      return
    }

    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a location on the map')
      return
    }

    // Validate recurring event settings
    if (newEvent.isRecurring) {
      if (newEvent.recurringPattern === 'weekly' && newEvent.recurringDays.length === 0) {
        Alert.alert('Error', 'Please select at least one day for weekly recurring events')
        return
      }
      
      if (newEvent.recurringOccurrences <= 0 && !newEvent.recurringEndDate) {
        Alert.alert('Error', 'Please set either number of occurrences or end date for recurring events')
        return
      }
    }

    // Check if user is authenticated for premium features
    const isAuthenticated = await userService.isAuthenticated()
    const hasPremium = await userService.hasPremiumSubscription()
    
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

    // Check daily event creation limit for free users
    if (!hasPremium && !(await userService.canCreateEventToday())) {
      Alert.alert(
        'Daily Limit Reached',
        'Free users can create only 1 event per day. Upgrade to Premium for unlimited events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => setShowUserProfile(true) }
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
        startsAt: newEvent.startsAt || (() => {
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const hours = String(now.getHours()).padStart(2, '0')
          const minutes = String(now.getMinutes()).padStart(2, '0')
          return `${year}-${month}-${day} ${hours}:${minutes}`
        })(),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        url: '',
        category: newEvent.category,
        isRecurring: newEvent.isRecurring,
        recurringPattern: newEvent.recurringPattern,
        recurringDays: newEvent.recurringDays,
        recurringInterval: newEvent.recurringInterval,
        recurringEndDate: newEvent.recurringEndDate,
        recurringOccurrences: newEvent.recurringOccurrences
      }

      // Use eventService to create and share the event
      const success = await eventService.createEvent(eventData)
      
      if (success) {
        // Update user stats with daily tracking
        await userService.incrementDailyEventCount()

        // Reload events to include the new ones
        try {
          await loadUserCreatedEvents()
        } catch (reloadError) {
          // Event was still created successfully, just couldn't reload
        }
        
        // Check backend status for user feedback
        const syncStatus = await eventService.getSyncStatus()
        
        let message = newEvent.isRecurring 
          ? `Your recurring event has been created successfully! 🎉\n\n📅 ${newEvent.recurringOccurrences || 'Multiple'} instances created`
          : 'Your event has been created successfully! 🎉'
          
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
          longitude: 0,
          isRecurring: false,
          recurringPattern: 'daily',
          recurringDays: [0],
          recurringInterval: 1,
          recurringEndDate: '',
          recurringOccurrences: 1
        })
        setSelectedLocation(null)
      } else {
        Alert.alert('Error', 'Failed to create event. Please try again.')
      }

    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while creating the event.')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const loadUserCreatedEvents = async (currentEvents: Event[] = events) => {
    try {
      // Load user-created events using getAllEvents (which includes local events)
      const userEvents = await eventService.getAllEvents()
      
      // Ensure all user events have required fields
      const validatedUserEvents = userEvents.map(event => ({
        ...event,
        name: event.name || 'Untitled Event',
        description: event.description || '',
        latitude: event.latitude || 0,
        longitude: event.longitude || 0,
        venue: event.venue || '',
        address: event.address || '',
        source: event.source || 'user',
        category: event.category || 'Other'
      }))
      
      // Merge with current events, avoiding duplicates
      const mergedEvents = [...currentEvents, ...validatedUserEvents]
      const uniqueEvents = mergedEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      )
      
      setEvents(uniqueEvents)
      setFilteredEvents(uniqueEvents)
      
      // Try to sync any pending events (this will be skipped if backend is not configured)
      try {
        await eventService.syncEvents()
      } catch (syncError) {
        // Sync failed (this is normal if backend is not configured)
      }
      
      // Update sync status
      try {
        const status = await eventService.getSyncStatus()
        setSyncStatus(status)
      } catch (statusError) {
        // Error getting sync status
      }
      
    } catch (error) {
      // Keep current events if error
    }
  }

  const generateRecurringPreview = () => {
    if (!newEvent.isRecurring) {
      return `${parseDateTime(newEvent.startsAt).date} at ${parseDateTime(newEvent.startsAt).time}`;
    }

    let previewText = `${parseDateTime(newEvent.startsAt).date} at ${parseDateTime(newEvent.startsAt).time}`;

    if (newEvent.recurringPattern === 'daily') {
      previewText += `, then every ${newEvent.recurringInterval} day(s)`;
    } else if (newEvent.recurringPattern === 'weekly') {
      previewText += `, then every ${newEvent.recurringInterval} week(s) on ${newEvent.recurringDays.map(day => {
        switch (day) {
          case 0: return 'Sun';
          case 1: return 'Mon';
          case 2: return 'Tue';
          case 3: return 'Wed';
          case 4: return 'Thu';
          case 5: return 'Fri';
          case 6: return 'Sat';
          default: return '';
        }
      }).join(', ')}`;
    } else if (newEvent.recurringPattern === 'monthly') {
      previewText += `, then every ${newEvent.recurringInterval} month(s)`;
    }

    if (newEvent.recurringOccurrences > 0) {
      previewText += `, for ${newEvent.recurringOccurrences} occurrence(s)`;
    } else if (newEvent.recurringEndDate) {
      previewText += `, until ${newEvent.recurringEndDate}`;
    }

    return previewText;
  };

  // Event management functions
  const startEditingEvent = (event: Event) => {
    setEditingEventId(event.id)
    setNewEvent({
      name: event.name || '',
      description: event.description || '',
      venue: event.venue || '',
      address: event.address || '',
      startsAt: event.startsAt || '',
      category: event.category || 'Other',
      latitude: event.latitude || 0,
      longitude: event.longitude || 0,
      isRecurring: event.isRecurring || false,
      recurringPattern: event.recurringPattern || 'daily',
      recurringDays: event.recurringDays || [0],
      recurringInterval: event.recurringInterval || 1,
      recurringEndDate: event.recurringEndDate || '',
      recurringOccurrences: event.recurringOccurrences || 1
    })
    setSelectedLocation({ latitude: event.latitude || 0, longitude: event.longitude || 0 })
    setIsEditingEvent(true)
    setShowEventDetailsModal(false)
    setShowCreateEventModal(true)
  }

  const updateEvent = async () => {
    if (!editingEventId || !selectedLocation) {
      Alert.alert('Error', 'Missing event data for update.')
      return
    }

    setIsCreatingEvent(true)

    try {
      const updatedData = {
        name: newEvent.name.trim(),
        description: newEvent.description.trim(),
        venue: newEvent.venue.trim(),
        address: newEvent.address.trim(),
        startsAt: newEvent.startsAt,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        category: newEvent.category,
        isRecurring: newEvent.isRecurring,
        recurringPattern: newEvent.recurringPattern,
        recurringDays: newEvent.recurringDays,
        recurringInterval: newEvent.recurringInterval,
        recurringEndDate: newEvent.recurringEndDate,
        recurringOccurrences: newEvent.recurringOccurrences
      }

      const success = await eventService.updateEvent(editingEventId, updatedData)
      
      if (success) {
        Alert.alert(
          'Success!', 
          'Event updated successfully! 🎉',
          [{ text: 'OK', onPress: () => {
            setShowCreateEventModal(false)
            setIsEditingEvent(false)
            setEditingEventId(null)
          }}]
        )

        // Reload events to reflect changes
        await loadUserCreatedEvents()
        
        // Reset form
        setNewEvent({
          name: '',
          description: '',
          venue: '',
          address: '',
          startsAt: '',
          category: 'Other',
          latitude: 0,
          longitude: 0,
          isRecurring: false,
          recurringPattern: 'daily',
          recurringDays: [0],
          recurringInterval: 1,
          recurringEndDate: '',
          recurringOccurrences: 1
        })
        setSelectedLocation(null)
      } else {
        Alert.alert('Error', 'Failed to update event. Please try again.')
      }

    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while updating the event.')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await eventService.deleteEvent(eventId)
              
              if (success) {
                Alert.alert('Success', 'Event deleted successfully!')
                setShowEventDetailsModal(false)
                
                // Reload events to reflect changes
                await loadUserCreatedEvents()
              } else {
                Alert.alert('Error', 'Failed to delete event. Please try again.')
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred while deleting the event.')
            }
          }
        }
      ]
    )
  }

    const shareEvent = async (event: Event) => {
    const { date, time } = parseDateTime(event.startsAt)
    const shareText = `🎉 ${event.name}\n\n📅 ${date} at ${time}\n📍 ${event.venue}\n${event.address ? `📍 ${event.address}\n` : ''}📝 ${event.description}\n\nCheck it out on Event!`

    try {
      // Check if sharing is available on this device
      const isAvailable = await Sharing.isAvailableAsync()

      if (isAvailable) {
        // Use native sharing with React Native's Share API
        await Share.share({
          message: shareText,
          title: event.name
        })
      } else {
        // Fallback to Alert if sharing is not available
        Alert.alert(
          'Share Event',
          shareText,
          [
            { text: 'Copy Text', onPress: () => {
              Alert.alert('Copied!', 'Event details copied to clipboard.')
            }},
            { text: 'Cancel', style: 'cancel' }
          ]
        )
      }
    } catch (error) {
      // Fallback to Alert if sharing fails
      Alert.alert(
        'Share Event',
        shareText,
        [
          { text: 'Copy Text', onPress: () => {
            Alert.alert('Copied!', 'Event details copied to clipboard.')
          }},
          { text: 'Cancel', style: 'cancel' }
        ]
      )
    }
  }

  // Date/Time picker states for temporary values
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null)
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null)
  const [tempEventTime, setTempEventTime] = useState<Date | null>(null)
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null)

  // Date/Time picker handlers
  const handleDateFromChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      // On iOS, just update the temporary value
      setTempDateFrom(selectedDate || new Date())
    } else {
      // On Android, close immediately
      setShowDateFromPicker(false)
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0]
        setSearchFilters(prev => ({ ...prev, dateFrom: dateString }))
      }
    }
  }

  const handleDateToChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      // On iOS, just update the temporary value
      setTempDateTo(selectedDate || new Date())
    } else {
      // On Android, close immediately
      setShowDateToPicker(false)
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0]
        setSearchFilters(prev => ({ ...prev, dateTo: dateString }))
      }
    }
  }

  const handleEventTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      // On iOS, just update the temporary value
      setTempEventTime(selectedDate || new Date())
    } else {
      // On Android, close immediately
      setShowEventTimePicker(false)
      if (selectedDate) {
        // Format date and time in local timezone (not UTC)
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        const hours = String(selectedDate.getHours()).padStart(2, '0')
        const minutes = String(selectedDate.getMinutes()).padStart(2, '0')
        const dateString = `${year}-${month}-${day} ${hours}:${minutes}`
        setNewEvent(prev => ({ ...prev, startsAt: dateString }))
      }
    }
  }

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      // On iOS, just update the temporary value
      setTempEndDate(selectedDate || new Date())
    } else {
      // On Android, close immediately
      setShowEndDatePicker(false)
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0]
        setNewEvent(prev => ({ ...prev, recurringEndDate: dateString }))
      }
    }
  }

  // Confirm handlers for iOS
  const handleDateFromConfirm = () => {
    if (tempDateFrom) {
      const dateString = tempDateFrom.toISOString().split('T')[0]
      setSearchFilters(prev => ({ ...prev, dateFrom: dateString }))
    }
    setShowDateFromPicker(false)
    setTempDateFrom(null)
  }

  const handleDateToConfirm = () => {
    if (tempDateTo) {
      const dateString = tempDateTo.toISOString().split('T')[0]
      setSearchFilters(prev => ({ ...prev, dateTo: dateString }))
    }
    setShowDateToPicker(false)
    setTempDateTo(null)
  }

  const handleEventTimeConfirm = () => {
    if (tempEventTime) {
      // Format date and time in local timezone (not UTC)
      const year = tempEventTime.getFullYear()
      const month = String(tempEventTime.getMonth() + 1).padStart(2, '0')
      const day = String(tempEventTime.getDate()).padStart(2, '0')
      const hours = String(tempEventTime.getHours()).padStart(2, '0')
      const minutes = String(tempEventTime.getMinutes()).padStart(2, '0')
      const dateString = `${year}-${month}-${day} ${hours}:${minutes}`
      setNewEvent(prev => ({ ...prev, startsAt: dateString }))
    }
    setShowEventTimePicker(false)
    setTempEventTime(null)
  }

  const handleEndDateConfirm = () => {
    if (tempEndDate) {
      const dateString = tempEndDate.toISOString().split('T')[0]
      setNewEvent(prev => ({ ...prev, recurringEndDate: dateString }))
    }
    setShowEndDatePicker(false)
    setTempEndDate(null)
  }

  // Cancel handlers for DateTimePicker
  const handleDateFromCancel = () => {
    setShowDateFromPicker(false)
    setTempDateFrom(null)
  }

  const handleDateToCancel = () => {
    setShowDateToPicker(false)
    setTempDateTo(null)
  }

  const handleEventTimeCancel = () => {
    setShowEventTimePicker(false)
    setTempEventTime(null)
  }

  const handleEndDateCancel = () => {
    setShowEndDatePicker(false)
    setTempEndDate(null)
  }

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Select date'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const formatTimeForDisplay = (dateTimeString: string) => {
    if (!dateTimeString) return 'Select time'
    try {
      const [datePart, timePart] = dateTimeString.split(' ')
      if (timePart) {
        const [hours, minutes] = timePart.split(':')
        const date = new Date()
        date.setHours(parseInt(hours), parseInt(minutes))
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      return 'Select time'
    } catch {
      return 'Invalid time'
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
      {/* Search Button */}
      <TouchableOpacity 
        style={styles.searchButton}
        onPress={() => setSearchFilters(prev => ({ ...prev, showSearchModal: true }))}
      >
        <Text style={styles.searchButtonIcon}>🔍</Text>
        {(searchFilters.query || searchFilters.category !== 'All' || searchFilters.source !== 'All' || searchFilters.dateFrom || searchFilters.dateTo || searchFilters.distanceFilter) && (
          <View style={styles.searchButtonBadge}>
            <Text style={styles.searchButtonBadgeText}>{filteredEvents.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Settings Icon */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setShowUserProfile(true)}
      >
        <Text style={styles.settingsIcon}>👤</Text>
        <View style={styles.eventCountBadge}>
          <Text style={styles.eventCountBadgeText}>{filteredEvents.length}</Text>
        </View>
      </TouchableOpacity>





      {/* Create Event Button */}
      <TouchableOpacity 
        style={styles.createEventButton}
        onPress={openCreateEventModal}
      >
        <Text style={styles.createEventButtonText}>+</Text>
        {!userFeatures.hasPremium && (
          <View style={styles.dailyLimitBadge}>
            <Text style={styles.dailyLimitBadgeText}>
              {userFeatures.canCreateEventToday ? '1/day' : '0/1'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      


      


      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}
        mapType="standard"
        showsCompass={true}
        showsScale={true}
        showsTraffic={false}
        showsBuildings={true}
        showsIndoors={true}
        showsIndoorLevelPicker={false}
        showsPointsOfInterest={true}
        followsUserLocation={false}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor="#007AFF"
        loadingBackgroundColor="rgba(255, 255, 255, 0.8)"
        moveOnMarkerPress={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        maxZoomLevel={20}
        minZoomLevel={3}
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

                        {/* Render memoized markers for better performance */}
        {memoizedMarkers}
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
              {isMapMode ? 'Select Location' : (isEditingEvent ? 'Edit Event' : 'Create New Event')}
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
                  setIsEditingEvent(false)
                  setEditingEventId(null)
                  // Reset form
                  setNewEvent({
                    name: '',
                    description: '',
                    venue: '',
                    address: '',
                    startsAt: '',
                    category: 'Other',
                    latitude: 0,
                    longitude: 0,
                    isRecurring: false,
                    recurringPattern: 'daily',
                    recurringDays: [0],
                    recurringInterval: 1,
                    recurringEndDate: '',
                    recurringOccurrences: 1
                  })
                  setSelectedLocation(null)
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
                  <Text style={styles.confirmLocationButtonText}>Confirm</Text>
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
                  <TouchableOpacity 
                    style={styles.dateTimePickerButton}
                    onPress={() => setShowEventTimePicker(true)}
                  >
                    <Text style={styles.dateTimePickerText}>
                      {newEvent.startsAt ? formatTimeForDisplay(newEvent.startsAt) : '📅 Select date & time'}
                    </Text>
                  </TouchableOpacity>
                  
                                     {/* Event Time Picker integrated into create event modal */}
                   {showEventTimePicker && (
                     <View style={styles.inlineDatePicker}>
                       <Text style={styles.inlineDatePickerLabel}>Select Date & Time:</Text>
                       <DateTimePicker
                         value={tempEventTime || (newEvent.startsAt ? new Date(newEvent.startsAt) : new Date())}
                         mode="datetime"
                         display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                         onChange={handleEventTimeChange}
                       />
                       {Platform.OS === 'ios' && (
                         <View style={styles.datePickerButtons}>
                           <TouchableOpacity 
                             style={styles.datePickerCancelButton}
                             onPress={handleEventTimeCancel}
                           >
                             <Text style={styles.datePickerCancelText}>Cancel</Text>
                           </TouchableOpacity>
                           <TouchableOpacity 
                             style={styles.datePickerConfirmButton}
                             onPress={handleEventTimeConfirm}
                           >
                             <Text style={styles.datePickerConfirmText}>Confirm</Text>
                           </TouchableOpacity>
                         </View>
                       )}
                       {Platform.OS !== 'ios' && (
                         <TouchableOpacity 
                           style={styles.inlineDatePickerCancelButton}
                           onPress={handleEventTimeCancel}
                         >
                           <Text style={styles.inlineDatePickerCancelText}>Cancel</Text>
                         </TouchableOpacity>
                       )}
                     </View>
                   )}
                </View>

                             <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Category</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                   {[
                     { key: 'Other', icon: '📌', label: 'Other' },
                     { key: 'Sports', icon: '⚽', label: 'Sports' },
                     { key: 'Music', icon: '🎵', label: 'Music' },
                     { key: 'Theater', icon: '🎭', label: 'Theater' },
                     { key: 'Art', icon: '🎨', label: 'Art' },
                     { key: 'Comedy', icon: '😂', label: 'Comedy' },
                     { key: 'Food & Drink', icon: '🍕', label: 'Food' },
                     { key: 'Business', icon: '💼', label: 'Business' },
                     { key: 'Technology', icon: '🤖', label: 'Tech' },
                     { key: 'Family & Kids', icon: '👨‍👩‍👧‍👦', label: 'Family' },
                     { key: 'Health & Wellness', icon: '🧘', label: 'Health' },
                     { key: 'Cultural', icon: '🏛️', label: 'Cultural' },
                     { key: 'Nightlife', icon: '🌙', label: 'Nightlife' },
                     { key: 'Charity & Community', icon: '🤝', label: 'Community' },
                     { key: 'Fashion & Beauty', icon: '👗', label: 'Fashion' },
                     { key: 'Science & Education', icon: '🔬', label: 'Science' },
                     { key: 'Nature & Environment', icon: '🌿', label: 'Nature' },
                     { key: 'Gaming & Entertainment', icon: '🎮', label: 'Gaming' }
                   ].map((category) => (
                     <TouchableOpacity
                       key={category.key}
                       style={[
                         styles.categoryIconButton,
                         newEvent.category === category.key && styles.categoryIconButtonActive
                       ]}
                       onPress={() => setNewEvent(prev => ({ ...prev, category: category.key }))}
                     >
                       <Text style={[
                         styles.categoryIcon,
                         newEvent.category === category.key && styles.categoryIconActive
                       ]}>
                         {category.icon}
                       </Text>
                       <Text style={[
                         styles.categoryIconLabel,
                         newEvent.category === category.key && styles.categoryIconLabelActive
                       ]}>
                         {category.label}
                       </Text>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
               </View>

              {/* Recurring Event Section */}
              <View style={styles.inputGroup}>
                <View style={styles.recurringHeader}>
                  <Text style={styles.inputLabel}>Recurring Event</Text>
                  <Switch
                    value={newEvent.isRecurring}
                    onValueChange={(value) => setNewEvent(prev => ({ ...prev, isRecurring: value }))}
                  />
                </View>
                
                {newEvent.isRecurring && (
                  <View style={styles.recurringOptions}>
                    <View style={styles.recurringPatternSection}>
                      <Text style={styles.recurringSubLabel}>Repeat Pattern</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patternScroll}>
                        {[
                          { key: 'daily', label: 'Daily' },
                          { key: 'weekly', label: 'Weekly' },
                          { key: 'monthly', label: 'Monthly' },
                          { key: 'custom', label: 'Custom' }
                        ].map((pattern) => (
                          <TouchableOpacity
                            key={pattern.key}
                            style={[
                              styles.patternButton,
                              newEvent.recurringPattern === pattern.key && styles.patternButtonActive
                            ]}
                            onPress={() => setNewEvent(prev => ({ ...prev, recurringPattern: pattern.key as any }))}
                          >
                            <Text style={[
                              styles.patternButtonText,
                              newEvent.recurringPattern === pattern.key && styles.patternButtonTextActive
                            ]}>
                              {pattern.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.recurringIntervalSection}>
                      <Text style={styles.recurringSubLabel}>Repeat Every</Text>
                      <View style={styles.intervalRow}>
                        <TextInput
                          style={[styles.textInput, styles.intervalInput]}
                          placeholder="1"
                          value={newEvent.recurringInterval.toString()}
                          onChangeText={(text) => setNewEvent(prev => ({ 
                            ...prev, 
                            recurringInterval: parseInt(text) || 1 
                          }))}
                          keyboardType="numeric"
                        />
                        <Text style={styles.intervalLabel}>
                          {newEvent.recurringPattern === 'daily' ? 'day(s)' :
                           newEvent.recurringPattern === 'weekly' ? 'week(s)' :
                           newEvent.recurringPattern === 'monthly' ? 'month(s)' : 'time(s)'}
                        </Text>
                      </View>
                    </View>

                    {newEvent.recurringPattern === 'weekly' && (
                      <View style={styles.recurringDaysSection}>
                        <Text style={styles.recurringSubLabel}>Repeat on Days</Text>
                        <View style={styles.daysRow}>
                          {[
                            { key: 0, label: 'Sun' },
                            { key: 1, label: 'Mon' },
                            { key: 2, label: 'Tue' },
                            { key: 3, label: 'Wed' },
                            { key: 4, label: 'Thu' },
                            { key: 5, label: 'Fri' },
                            { key: 6, label: 'Sat' }
                          ].map((day) => (
                            <TouchableOpacity
                              key={day.key}
                              style={[
                                styles.dayButton,
                                newEvent.recurringDays.includes(day.key) && styles.dayButtonActive
                              ]}
                              onPress={() => {
                                const updatedDays = newEvent.recurringDays.includes(day.key)
                                  ? newEvent.recurringDays.filter(d => d !== day.key)
                                  : [...newEvent.recurringDays, day.key]
                                setNewEvent(prev => ({ ...prev, recurringDays: updatedDays }))
                              }}
                            >
                              <Text style={[
                                styles.dayButtonText,
                                newEvent.recurringDays.includes(day.key) && styles.dayButtonTextActive
                              ]}>
                                {day.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.recurringEndSection}>
                      <Text style={styles.recurringSubLabel}>End After</Text>
                      <View style={styles.endOptionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.endOptionButton,
                            newEvent.recurringOccurrences > 0 && styles.endOptionButtonActive
                          ]}
                          onPress={() => setNewEvent(prev => ({ 
                            ...prev, 
                            recurringOccurrences: newEvent.recurringOccurrences > 0 ? 0 : 3,
                            recurringEndDate: ''
                          }))}
                        >
                          <Text style={[
                            styles.endOptionButtonText,
                            newEvent.recurringOccurrences > 0 && styles.endOptionButtonTextActive
                          ]}>
                            Occurrences
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.endOptionButton,
                            newEvent.recurringEndDate && styles.endOptionButtonActive
                          ]}
                          onPress={() => setNewEvent(prev => ({ 
                            ...prev, 
                            recurringOccurrences: 0,
                            recurringEndDate: newEvent.recurringEndDate ? '' : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                          }))}
                        >
                          <Text style={[
                            styles.endOptionButtonText,
                            newEvent.recurringEndDate && styles.endOptionButtonTextActive
                          ]}>
                            End Date
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {newEvent.recurringOccurrences > 0 && (
                        <View style={styles.occurrencesRow}>
                          <TextInput
                            style={[styles.textInput, styles.occurrencesInput]}
                            placeholder="3"
                            value={newEvent.recurringOccurrences.toString()}
                            onChangeText={(text) => setNewEvent(prev => ({ 
                              ...prev, 
                              recurringOccurrences: parseInt(text) || 1 
                            }))}
                            keyboardType="numeric"
                          />
                          <Text style={styles.occurrencesLabel}>occurrences</Text>
                        </View>
                      )}
                      
                                                                                           {newEvent.recurringEndDate && (
                          <View style={styles.endDateRow}>
                            <TouchableOpacity 
                              style={styles.datePickerButton}
                              onPress={() => setShowEndDatePicker(true)}
                            >
                              <Text style={styles.datePickerText}>
                                {formatDateForDisplay(newEvent.recurringEndDate)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        
                                                 {/* Recurring End Date Picker integrated into create event modal */}
                         {showEndDatePicker && (
                           <View style={styles.inlineDatePicker}>
                             <Text style={styles.inlineDatePickerLabel}>Select End Date:</Text>
                             <DateTimePicker
                               value={tempEndDate || (newEvent.recurringEndDate ? new Date(newEvent.recurringEndDate) : new Date())}
                               mode="date"
                               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                               onChange={handleEndDateChange}
                             />
                             {Platform.OS === 'ios' && (
                               <View style={styles.datePickerButtons}>
                                 <TouchableOpacity 
                                   style={styles.datePickerCancelButton}
                                   onPress={handleEndDateCancel}
                                 >
                                   <Text style={styles.datePickerCancelText}>Cancel</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity 
                                   style={styles.datePickerConfirmButton}
                                   onPress={handleEndDateConfirm}
                                 >
                                   <Text style={styles.datePickerConfirmText}>Confirm</Text>
                                 </TouchableOpacity>
                               </View>
                             )}
                             {Platform.OS !== 'ios' && (
                               <TouchableOpacity 
                                 style={styles.inlineDatePickerCancelButton}
                                 onPress={handleEndDateCancel}
                               >
                                 <Text style={styles.inlineDatePickerCancelText}>Cancel</Text>
                               </TouchableOpacity>
                             )}
                           </View>
                         )}
                    </View>

                    <View style={styles.recurringPreview}>
                      <Text style={styles.recurringPreviewTitle}>Preview:</Text>
                      <Text style={styles.recurringPreviewText}>
                        {generateRecurringPreview()}
                      </Text>
                    </View>
                  </View>
                )}
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
                onPress={isEditingEvent ? updateEvent : createEvent}
                disabled={isCreatingEvent}
              >
                <Text style={styles.submitButtonText}>
                  {isCreatingEvent 
                    ? (isEditingEvent ? 'Updating...' : 'Creating...')
                    : isEditingEvent
                      ? 'Update Event'
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
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Event</Text>
            <TouchableOpacity 
              onPress={() => {
                Keyboard.dismiss()
                setShowRatingModal(false)
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                {selectedEvent && (
                  <>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>
                    {selectedEvent.name}
                    {selectedEvent.isRecurring && (
                      <Text style={styles.recurringIndicator}> 🔄</Text>
                    )}
                    {selectedEvent.source === 'app' && (
                      <Text style={styles.systemEventIcon}> ✓</Text>
                    )}
                  </Text>
                  <Text style={styles.eventVenue}>{selectedEvent.venue}</Text>
                  {selectedEvent.source === 'app' && (
                    <Text style={styles.systemEventInfo}>✓ Verified system event</Text>
                  )}
                  <Text style={styles.eventDescription}>{selectedEvent.description}</Text>
                  {selectedEvent.source === 'user' && (
                    <Text style={styles.userCreatedBadge}>👤 Created by you</Text>
                  )}
                  {selectedEvent.isRecurring && (
                    <View style={styles.recurringInfo}>
                      <Text style={styles.recurringInfoTitle}>🔄 Recurring Event</Text>
                      <Text style={styles.recurringInfoText}>
                        {selectedEvent.recurringPattern === 'daily' && `Every ${selectedEvent.recurringInterval || 1} day(s)`}
                        {selectedEvent.recurringPattern === 'weekly' && `Every ${selectedEvent.recurringInterval || 1} week(s) on ${selectedEvent.recurringDays?.map(day => {
                          switch (day) {
                            case 0: return 'Sun';
                            case 1: return 'Mon';
                            case 2: return 'Tue';
                            case 3: return 'Wed';
                            case 4: return 'Thu';
                            case 5: return 'Fri';
                            case 6: return 'Sat';
                            default: return '';
                          }
                        }).join(', ')}`}
                        {selectedEvent.recurringPattern === 'monthly' && `Every ${selectedEvent.recurringInterval || 1} month(s)`}
                        {selectedEvent.recurringOccurrences && ` (${selectedEvent.recurringOccurrences} occurrences)`}
                        {selectedEvent.recurringEndDate && ` (until ${selectedEvent.recurringEndDate})`}
                      </Text>
                    </View>
                  )}
                  {selectedEvent.parentEventId && (
                    <Text style={styles.recurringInstanceText}>
                      📅 This is part of a recurring event series
                    </Text>
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
                    ref={reviewInputRef}
                    style={[styles.textInput, styles.reviewInput]}
                    placeholder="Share your experience with this event..."
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onFocus={() => {
                      // Simple scroll to bottom when input is focused
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true })
                      }, 100)
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.dismissKeyboardButton}
                    onPress={() => Keyboard.dismiss()}
                  >
                    <Text style={styles.dismissKeyboardButtonText}>Done</Text>
                  </TouchableOpacity>
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
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

                                         {/* Search Modal */}
           <Modal
             visible={searchFilters.showSearchModal}
             animationType="slide"
             presentationStyle="pageSheet"
           >
            <View style={styles.searchModalContainer}>
              <View style={styles.searchModalHeader}>
                <Text style={styles.searchModalTitle}>🔍 Search & Filter</Text>
                <View style={styles.searchModalHeaderButtons}>
                  <TouchableOpacity 
                    onPress={() => {
                      // Reset all filters to default values
                      setSearchFilters({
                        query: '',
                        category: 'All',
                        source: 'All',
                        dateFrom: new Date().toISOString().split('T')[0], // Today
                        dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
                        showSearchModal: true,
                        distanceFilter: false,
                        distanceRadius: 10, // Default 10km radius
                        userLocation: searchFilters.userLocation // Keep user location
                      })
                      // Clear address suggestions
                      setAddressSuggestions([])
                      setShowSuggestions(false)
                    }}
                    style={styles.cleanFilterButton}
                  >
                    <Text style={styles.cleanFilterButtonText}>🧹 Clean</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setSearchFilters(prev => ({ ...prev, showSearchModal: false }))}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>

           <ScrollView style={styles.modalContent}>
            {/* Smart Search Input */}
            <View style={styles.inputGroup}>
              <View style={styles.searchLabelContainer}>
                <Text style={styles.inputLabel}>Search Events</Text>
                <Text style={styles.smartFilterIndicator}>🧠 Smart Filtering</Text>
              </View>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Search by name, venue, or description..."
                  value={searchFilters.query}
                  onChangeText={(text) => {
                    setSearchFilters(prev => ({ ...prev, query: text }))
                    // Trigger smart address search for venue/address suggestions
                    if (text.trim().length >= 2) {
                      debouncedAddressSearch(text)
                    } else {
                      setAddressSuggestions([])
                      setShowSuggestions(false)
                    }
                  }}
                  onFocus={() => {
                    if (searchFilters.query.trim().length >= 2) {
                      setShowSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow for touch events
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                />
                {isSearchingAddress && (
                  <View style={styles.searchIndicator}>
                    <Text style={styles.searchIndicatorText}>🔍</Text>
                  </View>
                )}
              </View>
              
              {/* Address/Venue Suggestions */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsTitle}>📍 Venue & Address Suggestions</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowSuggestions(false)
                        setAddressSuggestions([])
                      }}
                      style={styles.clearSuggestionsButton}
                    >
                      <Text style={styles.clearSuggestionsText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {addressSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setSearchFilters(prev => ({ ...prev, query: suggestion.display_name }))
                        setShowSuggestions(false)
                        setAddressSuggestions([])
                      }}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {suggestion.display_name}
                      </Text>
                      {suggestion.importance && (
                        <Text style={styles.suggestionImportance}>
                          Relevance: {Math.round(suggestion.importance * 100)}%
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
                  
                  {/* Premium status and loading radius info */}
                  <View style={styles.premiumStatusContainer}>
                    <Text style={styles.premiumStatusText}>
                      {userFeatures.hasPremium ? '⭐ Premium' : '🔒 Free'} • Loading events within {currentLoadingRadius}km
                    </Text>
                    {!userFeatures.hasPremium && (
                      <Text style={styles.premiumUpgradeText}>
                        Upgrade to Premium for 500km radius
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.radiusSelector}>
                    {[5, 10, 25, 50, 100].map((radius) => {
                      const isPremiumOnly = radius > 20 && !userFeatures.hasPremium
                      return (
                        <TouchableOpacity
                          key={radius}
                          style={[
                            styles.radiusButton,
                            searchFilters.distanceRadius === radius && styles.radiusButtonActive,
                            isPremiumOnly && styles.radiusButtonDisabled
                          ]}
                          onPress={() => {
                            if (!isPremiumOnly) {
                              setSearchFilters(prev => ({ ...prev, distanceRadius: radius }))
                            }
                          }}
                          disabled={isPremiumOnly}
                        >
                          <Text style={[
                            styles.radiusButtonText,
                            searchFilters.distanceRadius === radius && styles.radiusButtonTextActive,
                            isPremiumOnly && styles.radiusButtonTextDisabled
                          ]}>
                            {radius}km
                            {isPremiumOnly && ' 🔒'}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
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
                 {[
                   { key: 'All', icon: '🎯', label: 'All' },
                   { key: 'Sports', icon: '⚽', label: 'Sports' },
                   { key: 'Music', icon: '🎵', label: 'Music' },
                   { key: 'Theater', icon: '🎭', label: 'Theater' },
                   { key: 'Art', icon: '🎨', label: 'Art' },
                   { key: 'Comedy', icon: '😂', label: 'Comedy' },
                   { key: 'Food & Drink', icon: '🍕', label: 'Food' },
                   { key: 'Business', icon: '💼', label: 'Business' },
                   { key: 'Technology', icon: '🤖', label: 'Tech' },
                   { key: 'Family & Kids', icon: '👨‍👩‍👧‍👦', label: 'Family' },
                   { key: 'Health & Wellness', icon: '🧘', label: 'Health' },
                   { key: 'Cultural', icon: '🏛️', label: 'Cultural' },
                   { key: 'Nightlife', icon: '🌙', label: 'Nightlife' },
                   { key: 'Charity & Community', icon: '🤝', label: 'Community' },
                   { key: 'Fashion & Beauty', icon: '👗', label: 'Fashion' },
                   { key: 'Science & Education', icon: '🔬', label: 'Science' },
                   { key: 'Nature & Environment', icon: '🌿', label: 'Nature' },
                   { key: 'Gaming & Entertainment', icon: '🎮', label: 'Gaming' },
                   { key: 'Other', icon: '📌', label: 'Other' }
                 ].map((category) => (
                   <TouchableOpacity
                     key={category.key}
                     style={[
                       styles.categoryIconButton,
                       searchFilters.category === category.key && styles.categoryIconButtonActive
                     ]}
                     onPress={() => setSearchFilters(prev => ({ ...prev, category: category.key }))}
                   >
                     <Text style={[
                       styles.categoryIcon,
                       searchFilters.category === category.key && styles.categoryIconActive
                     ]}>
                       {category.icon}
                     </Text>
                     <Text style={[
                       styles.categoryIconLabel,
                       searchFilters.category === category.key && styles.categoryIconLabelActive
                     ]}>
                       {category.label}
                     </Text>
                     <Text style={[
                       styles.categoryIconCount,
                       searchFilters.category === category.key && styles.categoryIconCountActive
                     ]}>
                       {getCategoryCount(category.key)}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </ScrollView>
             </View>

                         {/* Source Filter */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Source</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                 {[
                   { key: 'All', icon: '🌐', label: 'All Sources' },
                   { key: 'App', icon: '📱', label: 'App Events' },
                   { key: 'AI', icon: '🤖', label: 'AI Generated' }
                 ].map((source) => (
                   <TouchableOpacity
                     key={source.key}
                     style={[
                       styles.categoryIconButton,
                       searchFilters.source === source.key && styles.categoryIconButtonActive
                     ]}
                     onPress={() => setSearchFilters(prev => ({ ...prev, source: source.key }))}
                   >
                     <Text style={[
                       styles.categoryIcon,
                       searchFilters.source === source.key && styles.categoryIconActive
                     ]}>
                       {source.icon}
                     </Text>
                     <Text style={[
                       styles.categoryIconLabel,
                       searchFilters.source === source.key && styles.categoryIconLabelActive
                     ]}>
                       {source.label}
                     </Text>
                     <Text style={[
                       styles.categoryIconCount,
                       searchFilters.source === source.key && styles.categoryIconCountActive
                     ]}>
                       {getSourceCount(source.key)}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </ScrollView>
             </View>

                                                   {/* Date Range */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date Range</Text>
                {!userFeatures.hasAdvancedSearch && (
                  <View style={styles.premiumPrompt}>
                    <Text style={styles.premiumPromptText}>
                      ⭐ Free users can only see events within 1 week ahead
                    </Text>
                    <Text style={styles.premiumPromptText}>
                      Upgrade to Premium for unlimited date filtering
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
                  <TouchableOpacity 
                    style={[styles.datePickerButton, !userFeatures.hasAdvancedSearch && styles.disabledInput]}
                    onPress={() => userFeatures.hasAdvancedSearch && setShowDateFromPicker(true)}
                    disabled={!userFeatures.hasAdvancedSearch}
                  >
                    <Text style={styles.datePickerLabel}>From</Text>
                    <Text style={styles.datePickerText}>
                      {formatDateForDisplay(searchFilters.dateFrom)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, !userFeatures.hasAdvancedSearch && styles.disabledInput]}
                    onPress={() => userFeatures.hasAdvancedSearch && setShowDateToPicker(true)}
                    disabled={!userFeatures.hasAdvancedSearch}
                  >
                    <Text style={styles.datePickerLabel}>To</Text>
                    <Text style={styles.datePickerText}>
                      {formatDateForDisplay(searchFilters.dateTo)}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                                 {/* Date Pickers integrated into search modal */}
                 {showDateFromPicker && userFeatures.hasAdvancedSearch && (
                   <View style={styles.inlineDatePicker}>
                     <Text style={styles.inlineDatePickerLabel}>Select Start Date:</Text>
                     <DateTimePicker
                       value={tempDateFrom || (searchFilters.dateFrom ? new Date(searchFilters.dateFrom) : new Date())}
                       mode="date"
                       display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                       onChange={handleDateFromChange}
                     />
                     {Platform.OS === 'ios' && (
                       <View style={styles.datePickerButtons}>
                         <TouchableOpacity 
                           style={styles.datePickerCancelButton}
                           onPress={handleDateFromCancel}
                         >
                           <Text style={styles.datePickerCancelText}>Cancel</Text>
                         </TouchableOpacity>
                         <TouchableOpacity 
                           style={styles.datePickerConfirmButton}
                           onPress={handleDateFromConfirm}
                         >
                           <Text style={styles.datePickerConfirmText}>Confirm</Text>
                         </TouchableOpacity>
                       </View>
                     )}
                     {Platform.OS !== 'ios' && (
                       <TouchableOpacity 
                         style={styles.inlineDatePickerCancelButton}
                         onPress={handleDateFromCancel}
                       >
                         <Text style={styles.inlineDatePickerCancelText}>Cancel</Text>
                       </TouchableOpacity>
                     )}
                   </View>
                 )}
                 
                 {showDateToPicker && userFeatures.hasAdvancedSearch && (
                   <View style={styles.inlineDatePicker}>
                     <Text style={styles.inlineDatePickerLabel}>Select End Date:</Text>
                     <DateTimePicker
                       value={tempDateTo || (searchFilters.dateTo ? new Date(searchFilters.dateTo) : new Date())}
                       mode="date"
                       display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                       onChange={handleDateToChange}
                     />
                     {Platform.OS === 'ios' && (
                       <View style={styles.datePickerButtons}>
                         <TouchableOpacity 
                           style={styles.datePickerCancelButton}
                           onPress={handleDateToCancel}
                         >
                           <Text style={styles.datePickerCancelText}>Cancel</Text>
                         </TouchableOpacity>
                         <TouchableOpacity 
                           style={styles.datePickerConfirmButton}
                           onPress={handleDateToConfirm}
                         >
                           <Text style={styles.datePickerConfirmText}>Confirm</Text>
                         </TouchableOpacity>
                       </View>
                     )}
                     {Platform.OS !== 'ios' && (
                       <TouchableOpacity 
                         style={styles.inlineDatePickerCancelButton}
                         onPress={handleDateToCancel}
                       >
                         <Text style={styles.inlineDatePickerCancelText}>Cancel</Text>
                       </TouchableOpacity>
                     )}
                   </View>
                 )}
              </View>

                         {/* Search Results Preview */}
             <View style={styles.inputGroup}>
               <View style={styles.resultsHeader}>
                 <Text style={styles.inputLabel}>Results</Text>
                 <Text style={styles.resultsCount}>({filteredEvents.length} events)</Text>
               </View>
               <ScrollView style={styles.resultsPreview} showsVerticalScrollIndicator={false}>
                 {filteredEvents.slice(0, 8).map((event) => {
                   let distanceInfo = ''
                   if (searchFilters.userLocation) {
                     const distance = calculateDistance(
                       searchFilters.userLocation.latitude,
                       searchFilters.userLocation.longitude,
                       event.latitude,
                       event.longitude
                     )
                     distanceInfo = ` • ${distance.toFixed(1)}km`
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
                         // Open event details modal directly from search results
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
                           distanceInfo = `📍 Distance: ${distance.toFixed(1)} km from you`
                         }
                         
                         const ratingInfo = `⭐ Community Rating: ${averageRating}/5 (${ratingCount} reviews)`
                         const userRatingInfo = userRating > 0 ? `👤 Your Rating: ${userRating}/5` : ''
                         const syncInfo = '📱 Local rating only (backend not configured)'
                         
                         setEventDetails({
                           event,
                           distanceInfo,
                           ratingInfo,
                           userRatingInfo,
                           syncInfo,
                           date,
                           time,
                           category
                         })
                         setShowEventDetailsModal(true)
                       }}
                     >
                       <View style={styles.resultHeader}>
                         <Text style={styles.resultTitle}>
                           {event.name}
                           {event.source === 'app' && (
                             <Text style={styles.systemEventIcon}> ✓</Text>
                           )}
                         </Text>
                         <Text style={styles.resultDate}>
                           {parseDateTime(event.startsAt).date}
                         </Text>
                       </View>
                       <Text style={styles.resultVenue}>{event.venue}{distanceInfo}</Text>
                       <View style={styles.resultMeta}>
                         <View style={styles.resultRating}>
                           {renderStars(averageRating, 12)}
                           <Text style={styles.resultRatingText}>
                             {averageRating} ({ratingCount})
                           </Text>
                         </View>
                         <View style={styles.resultBadges}>
                           {userRating > 0 && (
                             <Text style={styles.userRatingText}>👤 {userRating}/5</Text>
                           )}
                           {event.source === 'user' && (
                             <Text style={styles.userCreatedText}>👤</Text>
                           )}
                           {sharedRatings[event.id] && (
                             <Text style={styles.sharedRatingText}>🌐</Text>
                           )}
                         </View>
                       </View>
                     </TouchableOpacity>
                   )
                 })}
                 {filteredEvents.length > 8 && (
                   <Text style={styles.moreResults}>... and {filteredEvents.length - 8} more</Text>
                 )}
               </ScrollView>
             </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Event Details Modal */}
      <Modal
        visible={showEventDetailsModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowEventDetailsModal(false)}
        onShow={() => {}}
      >
        <TouchableWithoutFeedback onPress={() => setShowEventDetailsModal(false)}>
          <View style={styles.eventDetailsOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.eventDetailsContainer}>
                {eventDetails && (
                  <>
                    <View style={styles.eventDetailsHeader}>
                      <Text style={styles.eventDetailsTitle}>{eventDetails.event.name}</Text>
                      <TouchableOpacity
                        style={styles.eventDetailsCloseButton}
                        onPress={() => setShowEventDetailsModal(false)}
                      >
                        <Text style={styles.eventDetailsCloseButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.eventDetailsContent} showsVerticalScrollIndicator={false}>
                      <Text style={styles.eventDetailsDescription}>
                        {eventDetails.event.description}
                      </Text>
                      <View style={styles.eventDetailsInfo}>
                        <Text style={styles.eventDetailsInfoText}>📍 {eventDetails.event.venue}</Text>
                        <Text style={styles.eventDetailsInfoText}>📅 {eventDetails.date} at {eventDetails.time}</Text>
                        <Text style={styles.eventDetailsInfoText}>🎯 Category: {eventDetails.category}</Text>
                        {eventDetails.distanceInfo && (
                          <Text style={styles.eventDetailsInfoText}>{eventDetails.distanceInfo}</Text>
                        )}
                        <Text style={styles.eventDetailsInfoText}>{eventDetails.ratingInfo}</Text>
                        {eventDetails.userRatingInfo && (
                          <Text style={styles.eventDetailsInfoText}>{eventDetails.userRatingInfo}</Text>
                        )}
                        <Text style={styles.eventDetailsInfoText}>{eventDetails.syncInfo}</Text>
                      </View>
                    </ScrollView>
                    <View style={styles.eventDetailsFooter}>
                      {/* Rate and Share buttons in a row */}
                      <View style={styles.eventDetailsActionButtons}>
                        <TouchableOpacity
                          style={styles.eventDetailsRateButton}
                          onPress={() => {
                            setShowEventDetailsModal(false)
                            openRatingModal(eventDetails.event)
                          }}
                        >
                          <Text style={styles.eventDetailsRateButtonText}>Rate</Text>
                        </TouchableOpacity>
                        
                        {/* Show share button for all events */}
                        <TouchableOpacity
                          style={styles.eventDetailsShareButton}
                          onPress={() => shareEvent(eventDetails.event)}
                        >
                          <Text style={styles.eventDetailsShareButtonText}>Share</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Show edit and delete buttons only for user-created events */}
                      {eventDetails.event.source === 'user' && (
                        <View style={styles.eventDetailsActionButtons}>
                          <TouchableOpacity
                            style={styles.eventDetailsEditButton}
                            onPress={() => startEditingEvent(eventDetails.event)}
                          >
                            <Text style={styles.eventDetailsEditButtonText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.eventDetailsDeleteButton}
                            onPress={() => deleteEvent(eventDetails.event.id)}
                          >
                            <Text style={styles.eventDetailsDeleteButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

             {/* User Profile Modal */}
       <UserProfile 
         visible={showUserProfile} 
         onClose={() => {
           setShowUserProfile(false)
           loadUserFeatures() // Reload user features after profile changes
         }} 
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

     searchButton: {
     position: 'absolute',
     bottom: 30,
<<<<<<< HEAD
     right: 160,
=======
     right: 90,
>>>>>>> ef1b2680b8cbfd2ba6852e22d7f158348b435592
     backgroundColor: 'white',
     width: Platform.OS === 'ios' ? (Platform.isPad ? 60 : 50) : 50,
     height: Platform.OS === 'ios' ? (Platform.isPad ? 60 : 50) : 50,
     borderRadius: Platform.OS === 'ios' ? (Platform.isPad ? 30 : 25) : 25,
     justifyContent: 'center',
     alignItems: 'center',
     zIndex: 1000,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
   searchButtonIcon: {
     fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 24 : 20) : 20,
     color: '#333',
   },
   searchButtonBadge: {
     position: 'absolute',
     top: -5,
     right: -5,
     backgroundColor: '#007AFF',
     borderRadius: 10,
     minWidth: 20,
     height: 20,
     justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 4,
   },
   searchButtonBadgeText: {
     color: 'white',
     fontSize: 10,
     fontWeight: 'bold',
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
          padding: Platform.OS === 'ios' ? (Platform.isPad ? 25 : 15) : 15, // Reduced padding for cleaner look
          paddingBottom: Platform.OS === 'ios' ? (Platform.isPad ? 30 : 20) : 20, // Extra bottom padding for more space
          backgroundColor: 'white',
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
  dismissKeyboardButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  dismissKeyboardButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
         marginBottom: Platform.OS === 'ios' ? (Platform.isPad ? 25 : 20) : 20, // Reduced spacing for cleaner look
       },
      inputLabel: {
      fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 18 : 16) : 16, // Larger font on iPad
      fontWeight: '600',
      color: '#333',
      marginBottom: Platform.OS === 'ios' ? (Platform.isPad ? 12 : 8) : 8, // More spacing on iPad
    },
                           textInput: {
          // Removed border for cleaner look
          borderRadius: 8,
          paddingHorizontal: Platform.OS === 'ios' ? (Platform.isPad ? 20 : 15) : 15, // More padding on iPad
          paddingVertical: Platform.OS === 'ios' ? (Platform.isPad ? 16 : 12) : 12, // More padding on iPad
          fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 18 : 16) : 16, // Larger font on iPad
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
  premiumStatusContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  premiumStatusText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  premiumUpgradeText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontStyle: 'italic',
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
  radiusButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.6,
  },
  radiusButtonText: {
    fontSize: 14,
    color: '#666',
  },
  radiusButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  radiusButtonTextDisabled: {
    color: '#999',
    fontStyle: 'italic',
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
                             categoryIconButton: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: Platform.OS === 'ios' ? (Platform.isPad ? 16 : 12) : 12, // Larger radius on iPad
          marginRight: Platform.OS === 'ios' ? (Platform.isPad ? 16 : 12) : 12, // More spacing on iPad
          paddingHorizontal: Platform.OS === 'ios' ? (Platform.isPad ? 16 : 12) : 12, // More padding on iPad
          paddingVertical: Platform.OS === 'ios' ? (Platform.isPad ? 14 : 10) : 10, // More padding on iPad
          alignItems: 'center',
          minWidth: Platform.OS === 'ios' ? (Platform.isPad ? 80 : 60) : 60, // Larger buttons on iPad
          // Removed shadows and border for cleaner look
        },
   categoryIconButtonActive: {
     backgroundColor: '#007AFF',
     shadowColor: '#007AFF',
     shadowOpacity: 0.3,
     elevation: 4,
   },
       categoryIcon: {
      fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 24 : 20) : 20, // Larger icons on iPad
      marginBottom: Platform.OS === 'ios' ? (Platform.isPad ? 6 : 4) : 4, // More spacing on iPad
    },
   categoryIconActive: {
     // Icon color stays the same for better visibility
   },
       categoryIconLabel: {
      fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 12 : 10) : 10, // Larger font on iPad
      color: '#666',
      fontWeight: '500',
      textAlign: 'center',
    },
   categoryIconLabelActive: {
     color: 'white',
     fontWeight: '600',
   },
   categoryIconCount: {
     fontSize: 8,
     color: '#999',
     fontWeight: '400',
     marginTop: 2,
   },
   categoryIconCountActive: {
     color: 'rgba(255, 255, 255, 0.8)',
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
          maxHeight: Platform.OS === 'ios' ? (Platform.isPad ? 500 : 350) : 350, // Increased height for more space
        },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
                           resultItem: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: Platform.OS === 'ios' ? (Platform.isPad ? 12 : 10) : 10, // Reduced padding for cleaner look
          borderRadius: Platform.OS === 'ios' ? (Platform.isPad ? 10 : 6) : 6, // Smaller radius for cleaner look
          marginBottom: Platform.OS === 'ios' ? (Platform.isPad ? 8 : 6) : 6, // Reduced spacing for cleaner look
          // Removed border for cleaner look
        },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
      resultTitle: {
      fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 18 : 16) : 16, // Larger font on iPad
      fontWeight: '600',
      color: '#333',
      marginBottom: Platform.OS === 'ios' ? (Platform.isPad ? 6 : 4) : 4, // More spacing on iPad
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
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    bottom: 30,
    right: 160,
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
  clusterMarker: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },

  clusterToggle: {
    position: 'absolute',
    top: 120,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clusterToggleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  clusterToggleText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  performanceButton: {
    position: 'absolute',
    top: 160,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  performanceButtonText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
                   datePickerButton: {
          flex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          // Removed border for cleaner look
          borderRadius: 8,
          paddingHorizontal: 15,
          paddingVertical: 12,
          marginRight: 10,
        },
  datePickerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
                   dateTimePickerButton: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          // Removed border for cleaner look
          borderRadius: 8,
          paddingHorizontal: 15,
          paddingVertical: 12,
        },
  dateTimePickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
                   inlineDatePicker: {
          marginTop: 15,
          padding: 15,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          // Removed border for cleaner look
        },
  inlineDatePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  inlineDatePickerCancelButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignItems: 'center',
  },
     inlineDatePickerCancelText: {
     color: 'white',
     fontSize: 14,
     fontWeight: '600',
   },
   datePickerButtons: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginTop: 15,
     gap: 10,
   },
   datePickerCancelButton: {
     flex: 1,
     paddingHorizontal: 20,
     paddingVertical: 10,
     backgroundColor: '#6c757d',
     borderRadius: 8,
     alignItems: 'center',
   },
   datePickerCancelText: {
     color: 'white',
     fontSize: 14,
     fontWeight: '600',
   },
   datePickerConfirmButton: {
     flex: 1,
     paddingHorizontal: 20,
     paddingVertical: 10,
     backgroundColor: '#007AFF',
     borderRadius: 8,
     alignItems: 'center',
   },
   datePickerConfirmText: {
     color: 'white',
     fontSize: 14,
     fontWeight: '600',
   },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recurringOptions: {
    backgroundColor: '#f0f0f9',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  recurringPatternSection: {
    marginBottom: 10,
  },
  recurringSubLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  patternScroll: {
    flexDirection: 'row',
  },
  patternButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  patternButtonActive: {
    backgroundColor: '#007AFF',
  },
  patternButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  patternButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  recurringIntervalSection: {
    marginBottom: 10,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalInput: {
    flex: 1,
    marginRight: 10,
  },
  intervalLabel: {
    fontSize: 14,
    color: '#666',
  },
  recurringDaysSection: {
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dayButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 35,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  recurringEndSection: {
    marginTop: 10,
  },
  endOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  endOptionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  endOptionButtonActive: {
    backgroundColor: '#007AFF',
  },
  endOptionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  endOptionButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  occurrencesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  occurrencesInput: {
    flex: 1,
    marginRight: 10,
  },
  occurrencesLabel: {
    fontSize: 14,
    color: '#666',
  },
  endDateRow: {
    marginTop: 10,
  },
  recurringPreview: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  recurringPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  recurringPreviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recurringIndicator: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  systemEventIcon: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  systemEventInfo: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
    marginTop: 2,
    fontStyle: 'italic',
  },
  recurringInstanceText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  recurringInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  recurringInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  recurringInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  dailyLimitBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    width: 25,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
     dailyLimitBadgeText: {
     color: 'white',
     fontSize: 8,
     fontWeight: 'bold',
   },
                                                   searchModalContainer: {
        flex: 0.9, // Increased from 0.8 to 0.9 for more space
        backgroundColor: 'white',
        marginTop: Platform.OS === 'ios' ? (Platform.isPad ? 10 : 5) : 5, // Minimal top margin
        marginHorizontal: Platform.OS === 'ios' ? (Platform.isPad ? 20 : 10) : 10, // Minimal side margins
        marginBottom: Platform.OS === 'ios' ? (Platform.isPad ? 10 : 5) : 5, // Minimal bottom margin
        // Removed borders and shadows for cleaner look
      },
                   searchModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Platform.OS === 'ios' ? (Platform.isPad ? 25 : 15) : 15, // More padding on iPad
        // Removed border and border radius for cleaner look
        paddingTop: Platform.OS === 'ios' ? (Platform.isPad ? 20 : 10) : 10, // More top padding on iPad
        backgroundColor: 'white',
      },
       searchModalTitle: {
      fontSize: Platform.OS === 'ios' ? (Platform.isPad ? 24 : 20) : 20, // Larger font on iPad
      fontWeight: 'bold',
      color: '#333',
    },
    searchModalHeaderButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cleanFilterButton: {
      backgroundColor: '#FF6B6B',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginRight: 8,
    },
    cleanFilterButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
  // Event Details Modal Styles
              eventDetailsOverlay: {
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)', // Solid background - no transparency
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            },
            eventDetailsContainer: {
              backgroundColor: 'rgba(255, 255, 255, 1)', // Solid white - no transparency
              borderRadius: 12,
              width: '100%',
              maxWidth: Platform.OS === 'ios' ? 350 : 400,
              maxHeight: Platform.OS === 'ios' ? '80%' : '75%', // Reduced max height to ensure it doesn't go out of screen
              minHeight: Platform.OS === 'ios' ? 320 : 380, // Increased minimum height to accommodate button and content
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              flexDirection: 'column', // Ensure proper flex layout
            },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 15 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  eventDetailsTitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  eventDetailsCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetailsCloseButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  eventDetailsContent: {
    flex: 1,
    padding: Platform.OS === 'ios' ? 15 : 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 15, // Reduced top padding to start text from top
    minHeight: Platform.OS === 'ios' ? 180 : 220, // Reduced minimum height to use screen space more efficiently
    paddingBottom: Platform.OS === 'ios' ? 15 : 20, // Reduced bottom padding to move button back to original position
  },
  eventDetailsDescription: {
    fontSize: Platform.OS === 'ios' ? 14 : 16,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: Platform.OS === 'ios' ? 20 : 24,
    marginBottom: Platform.OS === 'ios' ? 15 : 20,
  },
  eventDetailsInfo: {
    gap: Platform.OS === 'ios' ? 6 : 8,
  },
  eventDetailsInfoText: {
    fontSize: Platform.OS === 'ios' ? 12 : 14,
    fontWeight: 'bold',
    color: '#666',
    lineHeight: Platform.OS === 'ios' ? 16 : 20,
  },
  eventDetailsFooter: {
    padding: Platform.OS === 'ios' ? 15 : 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 15, // Reduced top padding to move button back to original position
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    // Remove separate background and border radius since it's part of the main container
  },
  eventDetailsRateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'ios' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 44 : 48,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDetailsRateButtonText: {
    color: 'white',
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventDetailsActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    justifyContent: 'center',
  },
  eventDetailsEditButton: {
    backgroundColor: '#28a745',
    paddingVertical: Platform.OS === 'ios' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 44 : 48,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDetailsEditButtonText: {
    color: 'white',
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  eventDetailsShareButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: Platform.OS === 'ios' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 44 : 48,
    shadowColor: '#17a2b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDetailsShareButtonText: {
    color: 'white',
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventDetailsDeleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: Platform.OS === 'ios' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 44 : 48,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDetailsDeleteButtonText: {
    color: 'white',
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Callout styles
  calloutContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    maxWidth: 280,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    // Make the entire callout area clickable
    justifyContent: 'center',
    alignItems: 'center',
    // Ensure touch events are properly handled
    pointerEvents: 'auto',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  calloutHint: {
    fontSize: 10,
    color: '#007AFF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Smart Search styles
  searchInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIndicator: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
  },
  searchIndicatorText: {
    fontSize: 16,
    color: '#007AFF',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  clearSuggestionsButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSuggestionsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  searchLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smartFilterIndicator: {
    fontSize: 10,
    color: '#007AFF',
    fontStyle: 'italic',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'transparent',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 2,
  },
  suggestionImportance: {
    fontSize: 11,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  customMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
 })

module.exports = MapViewNative
