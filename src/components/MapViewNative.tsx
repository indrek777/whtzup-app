import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Dimensions,
  Linking,
  Share
} from 'react-native'
import MapView, { Marker, Region, Callout, Circle } from 'react-native-maps'
import * as Location from 'expo-location'
import { loadEventsPartially } from '../utils/eventLoader'
import { Event } from '../data/events'
import EventEditor from './EventEditor'
import { useEvents } from '../context/EventContext'
import UserGroupManager from './UserGroupManager'
import { reverseGeocode } from '../utils/geocoding'
import UserProfile from './UserProfile'
import { userService, UserGroup } from '../utils/userService'
// import EventRating from './EventRating' // Removed - using Alert-based rating instead
import RatingDisplay from './RatingDisplay'
import { ratingService } from '../utils/ratingService'
import { errorHandler, ErrorType } from '../utils/errorHandler'
import ErrorDisplay from './ErrorDisplay'
import { UserGroupBanner } from './UserGroupBanner'
import { EventRegistrationComponent } from './EventRegistration'

// Clustering interfaces
interface EventCluster {
  id: string
  latitude: number
  longitude: number
  events: Event[]
  count: number
  categories: Set<string>
}

// Performance optimization constants
const MAX_MARKERS_TO_RENDER = 1000 // Limit markers to prevent crashes
const CLUSTER_RADIUS = 0.01 // ~1km cluster radius
const MARKER_BATCH_SIZE = 100 // Render markers in batches

// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Comprehensive marker color function
const getMarkerColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'music': '#FF6B35',
    'sports': '#FF4444', 
    'art': '#4CAF50',
    'food': '#FFC107',
    'business': '#3F51B5',
    'technology': '#2196F3',
    'health & wellness': '#4CAF50',
    'entertainment': '#9C27B0',
    'education': '#607D8B',
    'cultural': '#795548',
    'nightlife': '#673AB7',
    'family & kids': '#E91E63',
    'nature & environment': '#388E3C',
    'theater': '#FF9800',
    'comedy': '#FF5722',
    'charity & community': '#8BC34A',
    'fashion & beauty': '#E91E63',
    'science & education': '#00BCD4',
    'gaming & entertainment': '#9C27B0',
    'other': '#9E9E9E'
  }
  return colors[category.toLowerCase()] || '#9E9E9E'
}

// Comprehensive marker icon function
const getMarkerIcon = (category: string): string => {
  const icons: { [key: string]: string } = {
    'music': '🎵',
    'sports': '⚽',
    'art': '🎨',
    'food': '🍽️',
    'business': '💼',
    'technology': '💻',
    'health & wellness': '🏥',
    'entertainment': '🎭',
    'education': '📚',
    'cultural': '🏛️',
    'nightlife': '🌙',
    'family & kids': '👨‍👩‍👧‍👦',
    'nature & environment': '��',
    'theater': '🎭',
    'comedy': '😄',
    'charity & community': '🤝',
    'fashion & beauty': '👗',
    'science & education': '🔬',
    'gaming & entertainment': '🎮',
    'other': '⭐'
  }
  return icons[category.toLowerCase()] || '📍'
}

// Enhanced clustering function for large groups
const createClusters = (events: Event[], clusterRadius: number = 0.001): EventCluster[] => {
  const clusters: EventCluster[] = []
  
  // Group events by exact location first
  const locationGroups = new Map<string, Event[]>()
  
  events.forEach(event => {
    // Skip events without valid coordinates
    if (!event.latitude || !event.longitude || 
        typeof event.latitude !== 'number' || typeof event.longitude !== 'number') {
      return
    }
    
    // Create a location key with high precision for exact grouping
    const locationKey = `${event.latitude.toFixed(6)},${event.longitude.toFixed(6)}`
    
    if (!locationGroups.has(locationKey)) {
      locationGroups.set(locationKey, [])
    }
    locationGroups.get(locationKey)!.push(event)
  })
  
  // Process each location group - create ONE cluster per location
  locationGroups.forEach(locationEvents => {
    if (locationEvents.length === 0) return
    
    // Sort events by start time for better organization
    locationEvents.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    
         // Use the first event as the cluster center
     const centerEvent = locationEvents[0]
     const categories = new Set(locationEvents.map(e => {
       // Use determineCategory if category is missing, undefined, or "other"
       return (!e.category || e.category === 'other') 
         ? determineCategory(e.name, e.description)
         : e.category
     }))
    
    // Create ONE cluster for ALL events at this location
    const cluster: EventCluster = {
      id: `location-cluster-${centerEvent.latitude?.toFixed(6) || '0.000000'}-${centerEvent.longitude?.toFixed(6) || '0.000000'}-${locationEvents.length}`,
      latitude: centerEvent.latitude,
      longitude: centerEvent.longitude,
      events: locationEvents,
      count: locationEvents.length,
      categories
    }
    
    clusters.push(cluster)
  })
  
  return clusters
}

// Enhanced cluster marker component for large groups
const ClusterMarker = React.memo(({ 
  cluster, 
  onPress,
  onShare
}: {
  cluster: EventCluster
  onPress: () => void
  onShare: (event: Event) => void
}) => {
  const isMultiEvent = cluster.count > 1
  
  if (isMultiEvent) {
    // Multi-event cluster with size scaling
    const dominantCategory = Array.from(cluster.categories)[0] || 'other'
    const color = getMarkerColor(dominantCategory)
    const icon = getMarkerIcon(dominantCategory)
    
    // Scale marker size based on event count
    let markerSize = 50
    let iconSize = 24
    let badgeSize = 24
    let badgeTextSize = 12
    
    if (cluster.count >= 100) {
      markerSize = 80
      iconSize = 32
      badgeSize = 32
      badgeTextSize = 14
    } else if (cluster.count >= 50) {
      markerSize = 70
      iconSize = 28
      badgeSize = 28
      badgeTextSize = 13
    } else if (cluster.count >= 20) {
      markerSize = 60
      iconSize = 26
      badgeSize = 26
      badgeTextSize = 12
    }
    
    // Format count for display (e.g., 150 -> "150", 1000 -> "1K")
    const formatCount = (count: number): string => {
      if (count >= 1000) return `${Math.floor(count / 1000)}K`
      return count.toString()
    }
    
    const dynamicMarkerStyle = {
      ...styles.clusterMarker,
      backgroundColor: color,
      width: markerSize,
      height: markerSize,
      borderRadius: markerSize / 2,
    }
    
    const dynamicIconStyle = {
      ...styles.clusterIcon,
      fontSize: iconSize,
    }
    
    const dynamicBadgeStyle = {
      ...styles.clusterBadge,
      minWidth: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
    }
    
    const dynamicBadgeTextStyle = {
      ...styles.clusterBadgeText,
      fontSize: badgeTextSize,
    }
    
    return (
      <Marker
        coordinate={{
          latitude: cluster.latitude,
          longitude: cluster.longitude,
        }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={dynamicMarkerStyle}>
          <Text style={dynamicIconStyle}>{icon}</Text>
          <View style={dynamicBadgeStyle}>
            <Text style={dynamicBadgeTextStyle}>{formatCount(cluster.count)}</Text>
          </View>
        </View>
      </Marker>
    )
  } else {
    // Single event
    const event = cluster.events[0]
    // Use determineCategory if category is missing, undefined, or "other"
    const originalCategory = event.category
    const category = (!event.category || event.category === 'other') 
      ? determineCategory(event.name, event.description)
      : event.category
    
    // Debug logging for category determination
    if (originalCategory === 'other' || !originalCategory) {
      console.log(`🎯 Category fix: "${event.name}" - Backend: "${originalCategory}" → Frontend: "${category}"`)
    }
    
    const color = getMarkerColor(category)
    const icon = getMarkerIcon(category)
    
    return (
      <Marker
        coordinate={{
          latitude: cluster.latitude,
          longitude: cluster.longitude,
        }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={[styles.marker, { backgroundColor: color }]}>
          <Text style={styles.markerIcon}>{icon}</Text>
        </View>
      </Marker>
    )
  }
})

// Comprehensive category determination function (matching EventContext)
const determineCategory = (name: string, description: string): string => {
  const text = (name + ' ' + description).toLowerCase()
  
  // Estonian language patterns
  const estonianPatterns = {
    'music': ['kontsert', 'muusika', 'laulmine', 'bänd', 'ansambel', 'ooper', 'sümfoonia', 'jazz', 'rokk', 'pop', 'klassikaline', 'orkester', 'koor', 'kitarr', 'klaver'],
    'theater': ['teater', 'lavastus', 'etendus', 'näidend', 'drama', 'komöödia', 'balet', 'tants'],
    'art': ['näitus', 'galerii', 'kunst', 'maal', 'skulptuur', 'foto', 'kunstnik', 'looming', 'arhitektuur', 'keraamika', 'fotograafia'],
    'sports': ['sport', 'võistlus', 'jooks', 'ujumine', 'jalgratas', 'tennis', 'korvpall', 'jalgpall', 'orienteerumine', 'triatlon', 'maastik', 'jää', 'mäng', 'liiga', 'staadion', 'arena', 'kardisõit', 'rattaõhtud'],
    'education': ['koolitus', 'seminar', 'loeng', 'õpituba', 'workshop', 'kursus', 'haridus'],
    'food': ['toit', 'restoran', 'kohvik', 'söök', 'jook', 'vein', 'õlu', 'kokandus', 'turg', 'kokteili', 'õhtusöök', 'pakett'],
    'cultural': ['kultuur', 'traditsioon', 'pärand', 'ajalugu', 'muuseum', 'festival', 'päev'],
    'nature & environment': ['loodus', 'keskkond', 'mets', 'park', 'õues', 'looduskaitse', 'öko'],
    'health & wellness': ['tervis', 'heaolu', 'jooga', 'meditatsion', 'massaaž', 'wellness', 'ravi', 'häälejooga', 'gongihüpnorännakute'],
    'family & kids': ['lapsed', 'pere', 'laste', 'mudilased', 'noored', 'mäng'],
    'business': ['äri', 'konverents', 'kohtumine', 'võrgustumine', 'ettevõtlus', 'töötuba', 'networking'],
    'technology': ['tehnoloogia', 'IT', 'programmeerimine', 'arvuti', 'digitaal']
  }
  
  // Check Estonian patterns first
  for (const [category, patterns] of Object.entries(estonianPatterns)) {
    if (patterns.some(pattern => text.includes(pattern))) {
      return category
    }
  }
  
  // Music categories (English + specific terms)
  if (text.includes('concert') || text.includes('music') || text.includes('symphony')) {
    return 'music'
  } else if (text.includes('jazz') || text.includes('rock') || text.includes('pop') || text.includes('classical')) {
    return 'music'
  } else if (text.includes('opera') || text.includes('orchestra') || text.includes('band')) {
    return 'music'
  } else if (text.includes('live') && (text.includes('music') || text.includes('performance'))) {
    return 'music'
  }
  
  // Sports categories
  else if (text.includes('football') || text.includes('soccer') || text.includes('match') || text.includes('game')) {
    return 'sports'
  } else if (text.includes('basketball') || text.includes('volleyball') || text.includes('tennis')) {
    return 'sports'
  } else if (text.includes('running') || text.includes('marathon') || text.includes('race')) {
    return 'sports'
  } else if (text.includes('swimming') || text.includes('gym') || text.includes('fitness')) {
    return 'sports'
  } else if (text.includes('cycling') || text.includes('bike')) {
    return 'sports'
  } else if (text.includes('hiking') || text.includes('climbing')) {
    return 'sports'
  }
  
  // Health & Wellness (check before generic outdoor activities)
  else if (text.includes('yoga') || text.includes('pilates') || text.includes('workout')) {
    return 'health & wellness'
  } else if (text.includes('beach yoga') || text.includes('outdoor yoga')) {
    return 'health & wellness'
  } else if (text.includes('meditation') || text.includes('mindfulness')) {
    return 'health & wellness'
  }
  
  // Outdoor activities
  else if (text.includes('outdoor music') || text.includes('outdoor meditation')) {
    return 'entertainment'
  } else if (text.includes('beach volleyball') || text.includes('beach running')) {
    return 'sports'
  } else if (text.includes('stand-up paddleboarding') || text.includes('paddleboarding')) {
    return 'sports'
  } else if (text.includes('kayaking') || text.includes('canoeing')) {
    return 'sports'
  } else if (text.includes('sailing') || text.includes('boating')) {
    return 'sports'
  } else if (text.includes('wildlife watching') || text.includes('bird watching')) {
    return 'nature & environment'
  } else if (text.includes('beach cleanup') || text.includes('environmental')) {
    return 'nature & environment'
  } else if (text.includes('urban sketching') || text.includes('outdoor chess')) {
    return 'entertainment'
  } else if (text.includes('tide pool exploration') || text.includes('tree climbing')) {
    return 'nature & environment'
  } else if (text.includes('rock climbing') || text.includes('bouldering')) {
    return 'sports'
  } else if (text.includes('sunset watching') || text.includes('park picnic')) {
    return 'entertainment'
  } else if (text.includes('mountaineering') || text.includes('wilderness camping')) {
    return 'sports'
  } else if (text.includes('surfing lessons') || text.includes('surfing')) {
    return 'sports'
  }
  
  // Theater & Performance
  else if (text.includes('theater') || text.includes('theatre') || text.includes('performance') || text.includes('ballet')) {
    return 'theater'
  } else if (text.includes('dance') || text.includes('play')) {
    return 'theater'
  } else if (text.includes('musical') || text.includes('drama') || text.includes('acting')) {
    return 'theater'
  }
  
  // Art & Culture
  else if (text.includes('museum') || text.includes('exhibition') || text.includes('näitus')) {
    return 'art'
  } else if (text.includes('gallery') || text.includes('painting') || text.includes('sculpture')) {
    return 'art'
  } else if (text.includes('photography') || text.includes('art') || text.includes('creative')) {
    return 'art'
  }
  
  // Entertainment (Cinema, etc.)
  else if (text.includes('cinema') || text.includes('movie') || text.includes('film')) {
    return 'entertainment'
  } else if (text.includes('magic') || text.includes('circus') || text.includes('variety')) {
    return 'entertainment'
  }
  
  // Comedy
  else if (text.includes('comedy') || text.includes('stand-up') || text.includes('humor')) {
    return 'comedy'
  }
  
  // Food & Drink
  else if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) {
    return 'food'
  } else if (text.includes('wine') || text.includes('beer') || text.includes('cocktail')) {
    return 'food'
  } else if (text.includes('cooking') || text.includes('chef') || text.includes('culinary')) {
    return 'food'
  } else if (text.includes('tasting') || text.includes('market')) {
    return 'food'
  } else if (text.includes('festival') && (text.includes('food') || text.includes('culinary'))) {
    return 'food'
  }
  
  // Education & Learning
  else if (text.includes('workshop') || text.includes('seminar') || text.includes('course')) {
    return 'education'
  } else if (text.includes('training') || text.includes('education') || text.includes('learning')) {
    return 'education'
  } else if (text.includes('lecture') || text.includes('class') || text.includes('tutorial')) {
    return 'education'
  }
  
  // Business & Professional
  else if (text.includes('conference') || text.includes('meeting') || text.includes('networking')) {
    return 'business'
  } else if (text.includes('business') || text.includes('corporate') || text.includes('professional')) {
    return 'business'
  }
  
  // Technology
  else if (text.includes('tech') || text.includes('technology') || text.includes('digital')) {
    return 'technology'
  } else if (text.includes('startup') || text.includes('innovation') || text.includes('ai')) {
    return 'technology'
  } else if (text.includes('coding') || text.includes('programming') || text.includes('hackathon')) {
    return 'technology'
  }
  
  // Family & Kids
  else if (text.includes('kids') || text.includes('children') || text.includes('family')) {
    return 'family & kids'
  } else if (text.includes('playground') || text.includes('toy') || text.includes('story')) {
    return 'family & kids'
  }
  
  // Health & Wellness (additional patterns)
  else if (text.includes('health') || text.includes('wellness') || text.includes('medical')) {
    return 'health & wellness'
  } else if (text.includes('therapy') || text.includes('healing')) {
    return 'health & wellness'
  }
  
  // Cultural & Heritage
  else if (text.includes('cultural') || text.includes('heritage') || text.includes('traditional')) {
    return 'cultural'
  } else if (text.includes('ball') || text.includes('ceremony') || text.includes('celebration')) {
    return 'cultural'
  } else if (text.includes('festival') || text.includes('holiday') || text.includes('custom')) {
    return 'cultural'
  }
  
  // Nightlife
  else if (text.includes('club') || text.includes('party') || text.includes('nightlife')) {
    return 'nightlife'
  } else if (text.includes('bar') || text.includes('pub') || text.includes('dance')) {
    return 'nightlife'
  }
  
  // Charity & Community
  else if (text.includes('charity') || text.includes('volunteer') || text.includes('community')) {
    return 'charity & community'
  } else if (text.includes('fundraiser') || text.includes('donation') || text.includes('help')) {
    return 'charity & community'
  }
  
  // Fashion & Beauty
  else if (text.includes('fashion') || text.includes('beauty') || text.includes('style')) {
    return 'fashion & beauty'
  } else if (text.includes('makeup') || text.includes('cosmetic') || text.includes('design')) {
    return 'fashion & beauty'
  }
  
  // Science & Education
  else if (text.includes('science') || text.includes('research') || text.includes('lecture')) {
    return 'science & education'
  } else if (text.includes('university') || text.includes('academic') || text.includes('study')) {
    return 'science & education'
  }
  
  // Nature & Environment
  else if (text.includes('nature') || text.includes('environment') || text.includes('eco')) {
    return 'nature & environment'
  } else if (text.includes('park') || text.includes('garden') || text.includes('outdoor')) {
    return 'nature & environment'
  }
  
  // Gaming & Entertainment
  else if (text.includes('game') || text.includes('gaming') || text.includes('esports')) {
    return 'gaming & entertainment'
  } else if (text.includes('board') || text.includes('card') || text.includes('tournament')) {
    return 'gaming & entertainment'
  }
  
  // Default fallback
  return 'other'
}

// Simple marker component
const SimpleMarker = React.memo(({ 
  event, 
  onPress,
  onShare
}: {
  event: Event
  onPress: () => void
  onShare: (event: Event) => void
}) => {
  // Use determineCategory if category is missing, undefined, or "other"
  const category = (!event.category || event.category === 'other') 
    ? determineCategory(event.name, event.description)
    : event.category
  const color = getMarkerColor(category)
  const icon = getMarkerIcon(category)
  
  return (
    <Marker
      coordinate={{
        latitude: event.latitude,
        longitude: event.longitude,
      }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={[styles.marker, { backgroundColor: color }]}>
        <Text style={styles.markerIcon}>{icon}</Text>
      </View>
      <Callout>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{event.name}</Text>
          <Text style={styles.calloutVenue}>{event.venue}</Text>
          <View style={styles.calloutActions}>
            <TouchableOpacity
              style={styles.calloutShareButton}
              onPress={() => onShare(event)}
            >
              <Text style={styles.calloutShareButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Callout>
    </Marker>
  )
})

const MapViewNative: React.FC = () => {
  const { events, updateEvent, deleteEvent, isLoading, isBackgroundLoading, syncStatus, userLocation, locationPermissionGranted, currentRadius, setCurrentRadius, dateFilter, setDateFilter, forceUpdateCheck, refreshEvents, refreshUserGroupLimits, persistUserGroupState, restoreUserGroupState } = useEvents()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [currentError, setCurrentError] = useState<any>(null)
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [showEventEditor, setShowEventEditor] = useState(false)
  const [showClusterModal, setShowClusterModal] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<EventCluster | null>(null)
  const [clusterSearchQuery, setClusterSearchQuery] = useState('')
  const [clusterPageIndex, setClusterPageIndex] = useState(0)
  const [showUserGroupManager, setShowUserGroupManager] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  
  // Rating state
  // const [showRatingModal, setShowRatingModal] = useState(false) // Removed - using Alert-based rating instead
  const [eventRatingStats, setEventRatingStats] = useState<any>(null)
  
  // Permission states
  const [canEditSelectedEvent, setCanEditSelectedEvent] = useState(false)
  const [eventPermissions, setEventPermissions] = useState<{[key: string]: boolean}>({})
  const [permissionLoading, setPermissionLoading] = useState(false)
  
  // Location picker state
  const [isLocationPickerMode, setIsLocationPickerMode] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null)
  const [onLocationSelected, setOnLocationSelected] = useState<((location: { latitude: number; longitude: number; address?: string }) => void) | null>(null)
  
  // Map reference
  const mapRef = useRef<MapView>(null)
  
  // Get user group limits
  const [userMaxRadius, setUserMaxRadius] = useState(500) // Default to premium limit
  const [userGroup, setUserGroup] = useState<UserGroup>('unregistered')
  
  // Load user group limits
  useEffect(() => {
    const loadUserGroupLimits = async () => {
      try {
        console.log('🎯 Loading user group limits...')
        const group = await userService.getUserGroup()
        const features = await userService.getUserGroupFeatures()
        setUserGroup(group)
        setUserMaxRadius(features.maxRadiusKm)
        console.log(`🎯 User group loaded: ${group}, max radius: ${features.maxRadiusKm}km`)
        console.log(`🎯 User group features:`, features)
        console.log(`🎯 State updated: userGroup=${group}, userMaxRadius=${features.maxRadiusKm}`)
      } catch (error) {
        console.log('⚠️ Could not load user group limits, using default:', error)
      }
    }
    
    loadUserGroupLimits()
    
    // Set up interval to check for subscription changes
    const interval = setInterval(async () => {
      try {
        const currentGroup = await userService.getUserGroup()
        if (currentGroup !== userGroup) {
          console.log(`🎯 User group changed from ${userGroup} to ${currentGroup}, reloading limits`)
          loadUserGroupLimits()
        }
      } catch (error) {
        console.log('⚠️ Error checking user group changes:', error)
      }
    }, 5000) // Check every 5 seconds
    
    return () => clearInterval(interval)
  }, [userGroup])

  // Persist user group state on component mount and when user group changes
  useEffect(() => {
    const persistState = async () => {
      try {
        await persistUserGroupState()
        console.log('🔄 User group state persisted on component mount')
      } catch (error) {
        console.log('⚠️ Could not persist user group state:', error)
      }
    }
    
    persistState()
  }, [persistUserGroupState])
  
  // Function to start location picker mode
  const startLocationPicker = useCallback((callback: (location: { latitude: number; longitude: number; address?: string }) => void) => {
    console.log('🗺️ startLocationPicker called')
    setIsLocationPickerMode(true)
    setSelectedLocation(null)
    setOnLocationSelected(() => callback)
    // EventEditor visibility is now controlled by the visible prop
    setShowEventDetailsModal(false)
    console.log('🗺️ Location picker mode activated, modal should be visible')
  }, [])
  
  // Function to handle map press in location picker mode
  const handleMapPress = useCallback(async (event: any) => {
    console.log('🗺️ Map pressed, isLocationPickerMode:', isLocationPickerMode)
    if (!isLocationPickerMode) return
    
    const { latitude, longitude } = event.nativeEvent.coordinate
    console.log('📍 Location selected:', latitude, longitude)
    
    try {
      // Perform reverse geocoding to get address
      const addressResult = await reverseGeocode(latitude, longitude)
      const address = addressResult ? addressResult.display_name || 'Unknown location' : 'Unknown location'
      const location = { latitude, longitude, address }
      
      setSelectedLocation(location)
    } catch (error) {
      console.error('Error reverse geocoding:', error)
      const location = { latitude, longitude, address: 'Unknown location' }
      setSelectedLocation(location)
    }
  }, [isLocationPickerMode])
  
  // Function to confirm location selection
  const confirmLocationSelection = useCallback(() => {
    console.log('📍 confirmLocationSelection called, selectedLocation:', !!selectedLocation, 'onLocationSelected:', !!onLocationSelected)
    if (selectedLocation && onLocationSelected) {
      console.log('📍 Confirming location selection, calling callback...')
      onLocationSelected(selectedLocation)
      setIsLocationPickerMode(false)
      setSelectedLocation(null)
      setOnLocationSelected(null)
      console.log('📍 Location picker closed, EventEditor should be visible again')
      // EventEditor will become visible again automatically due to the visible prop
    } else {
      console.log('📍 Cannot confirm location: missing selectedLocation or onLocationSelected')
    }
  }, [selectedLocation, onLocationSelected])
  
  // Function to cancel location picker
  const cancelLocationPicker = useCallback(() => {
    setIsLocationPickerMode(false)
    setSelectedLocation(null)
    setOnLocationSelected(null)
  }, [])

  // Function to load event rating stats
  const loadEventRatingStats = useCallback(async (eventId: string) => {
    try {
      const ratingsData = await ratingService.getEventRatings(eventId, 1, 1)
      setEventRatingStats(ratingsData.stats)
    } catch (error) {
      console.error('Error loading event rating stats:', error)
      setEventRatingStats(null)
    }
  }, [])

    // Function to handle event sharing
  const handleShareEvent = useCallback(async (event: Event) => {
    if (!event) return

    try {
      // Create share content
      const eventDate = new Date(event.startsAt)
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })

      // Create location link (Google Maps)
      const locationLink = `https://maps.google.com/?q=${event.latitude},${event.longitude}`
      
      // Create share message
      const shareMessage = `🎉 Check out this event!\n\n` +
        `📅 ${event.name}\n` +
        `📅 ${formattedDate} at ${formattedTime}\n` +
        `🏢 ${event.venue}\n` +
        `${event.address ? `📍 ${event.address}\n` : ''}` +
        `${event.description ? `📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n` : ''}` +
        `🗺️ Location: ${locationLink}\n\n` +
        `📱 Shared via Event Discovery App`

      // Share options
      Alert.alert(
        'Share Event',
        'How would you like to share this event?',
        [
          {
            text: '📤 Share via App',
            onPress: async () => {
              try {
                // Persist current state before sharing
                await persistUserGroupState()
                
                await Share.share({
                  message: shareMessage,
                  title: event.name
                })
                
                // Restore state after sharing
                console.log('🔄 Restoring state after share...')
                const restoredState = restoreUserGroupState()
                setUserGroup(restoredState.userGroup as UserGroup)
                setUserMaxRadius(restoredState.maxRadius)
                
                // Ensure modal stays open
                if (!showEventDetailsModal) {
                  setShowEventDetailsModal(true)
                }
                if (!selectedEvent) {
                  setSelectedEvent(event)
                }
              } catch (error) {
                console.error('Error sharing:', error)
                Alert.alert('Error', 'Could not share the event')
              }
            }
          },
          {
            text: '🗺️ Open in Maps',
            onPress: () => {
              Linking.openURL(locationLink).catch(() => {
                Alert.alert('Error', 'Could not open maps')
              })
            }
          },
          {
            text: '📋 Copy Details',
            onPress: () => {
              // Copy to clipboard functionality would go here
              Alert.alert('Copied!', 'Event details copied to clipboard')
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      )
    } catch (error) {
      console.error('Error preparing share:', error)
      Alert.alert('Error', 'Could not prepare event for sharing')
    }
  }, [selectedEvent, showEventDetailsModal, userGroup, userMaxRadius])

  // Function to handle cluster sharing
  const handleShareCluster = useCallback(async (cluster: EventCluster) => {
    if (!cluster || !cluster.events || cluster.events.length === 0) return

    try {
      const firstEvent = cluster.events[0]
      const locationLink = `https://maps.google.com/?q=${cluster.latitude},${cluster.longitude}`
      
      // Create share message for cluster
      const shareMessage = `🎉 Check out these events!\n\n` +
        `📍 ${cluster.count} events at this location\n` +
        `🏢 ${firstEvent.venue}\n` +
        `${firstEvent.address ? `📍 ${firstEvent.address}\n` : ''}` +
        `🗺️ Location: ${locationLink}\n\n` +
        `📱 Shared via Event Discovery App`

      // Share options
      Alert.alert(
        'Share Events',
        'How would you like to share these events?',
        [
          {
            text: '📤 Share via App',
            onPress: async () => {
              try {
                // Persist current state before sharing
                await persistUserGroupState()
                
                await Share.share({
                  message: shareMessage,
                  title: `${cluster.count} Events`
                })
                
                // Restore state after sharing
                console.log('🔄 Restoring cluster state after share...')
                const restoredState = restoreUserGroupState()
                setUserGroup(restoredState.userGroup as UserGroup)
                setUserMaxRadius(restoredState.maxRadius)
                
                // Ensure modal stays open
                if (!showClusterModal) {
                  setShowClusterModal(true)
                }
                if (!selectedCluster) {
                  setSelectedCluster(cluster)
                }
              } catch (error) {
                console.error('Error sharing cluster:', error)
                Alert.alert('Error', 'Could not share the events')
              }
            }
          },
          {
            text: '🗺️ Open in Maps',
            onPress: () => {
              Linking.openURL(locationLink).catch(() => {
                Alert.alert('Error', 'Could not open maps')
              })
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      )
    } catch (error) {
      console.error('Error preparing cluster share:', error)
      Alert.alert('Error', 'Could not prepare events for sharing')
    }
  }, [selectedCluster, showClusterModal, userGroup, userMaxRadius])
   
  // Map state - initialize with user location or default to Estonia
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 58.3776252,
    longitude: 26.7290063,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  })

  // Debug location picker state
  useEffect(() => {
    console.log('🗺️ Location picker state changed:', { isLocationPickerMode, selectedLocation: !!selectedLocation })
  }, [isLocationPickerMode, selectedLocation])

  useEffect(() => {
    console.log('🎯 showEventEditor state changed:', showEventEditor)
  }, [showEventEditor])

  // Load rating stats when event details modal is shown
  useEffect(() => {
    if (showEventDetailsModal && selectedEvent) {
      loadEventRatingStats(selectedEvent.id)
    }
  }, [showEventDetailsModal, selectedEvent, loadEventRatingStats])

  // Check permissions for selected event
  useEffect(() => {
    const checkSelectedEventPermissions = async () => {
      console.log('🔐 Checking permissions for selected event:', selectedEvent?.name, selectedEvent?.id);
      setPermissionLoading(true);
      try {
        if (selectedEvent) {
          const canEdit = await userService.canEditEvent(selectedEvent);
          console.log('🔐 Can edit event:', canEdit, 'Event created by:', selectedEvent.createdBy);
          setCanEditSelectedEvent(canEdit);
        } else {
          console.log('🔐 No selected event, setting canEdit to false');
          setCanEditSelectedEvent(false);
        }
      } catch (error) {
        console.error('🔐 Error checking permissions:', error);
        setCanEditSelectedEvent(false);
      } finally {
        setPermissionLoading(false);
      }
    };
    checkSelectedEventPermissions();
  }, [selectedEvent]);

  // Check permissions for cluster events
  useEffect(() => {
    const checkClusterEventPermissions = async () => {
      console.log('🔐 Checking cluster event permissions for cluster with', selectedCluster?.count, 'events');
      if (selectedCluster) {
        const permissions: {[key: string]: boolean} = {};
        for (const event of selectedCluster.events) {
          const canEdit = await userService.canEditEvent(event);
          permissions[event.id] = canEdit;
          console.log('🔐 Cluster event permission:', event.name, 'canEdit:', canEdit);
        }
        console.log('🔐 Setting cluster permissions:', permissions);
        setEventPermissions(permissions);
      }
    };
    checkClusterEventPermissions();
  }, [selectedCluster]);

  // Submit rating function
  const submitRating = async (rating: number) => {
    if (!selectedEvent) return;
    
    try {
      const result = await ratingService.rateEvent(selectedEvent.id, rating);
      
      // Refresh rating stats
      await loadEventRatingStats(selectedEvent.id);
      
      Alert.alert(
        'Rating Submitted!',
        `Thank you for rating "${selectedEvent.name}" with ${rating} star${rating > 1 ? 's' : ''}!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const appError = errorHandler.handleApiError(error, {
        action: 'rate_event',
        entity: 'event',
        value: selectedEvent.id
      });
      setCurrentError(appError);
    }
  };

  // Auto-fit map to user location or events when they load
  useEffect(() => {
    if (userLocation) {
      // Center map on user location first
      const userRegion: Region = {
        latitude: userLocation[0],
        longitude: userLocation[1],
        latitudeDelta: 1.0, // Show ~100km around user
        longitudeDelta: 1.0,
      }
      console.log('📍 Centering map on user location:', userRegion)
      setMapRegion(userRegion)
    } else if (filteredEvents.length > 0) {
      // Fallback to auto-fit events if no user location
      const validEvents = filteredEvents.filter(event => 
        event.latitude && event.longitude && 
        !isNaN(event.latitude) && !isNaN(event.longitude) &&
        event.latitude !== 0 && event.longitude !== 0
      )
      
      if (validEvents.length > 0) {
        const lats = validEvents.map(e => e.latitude)
        const lngs = validEvents.map(e => e.longitude)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        
        const newRegion: Region = {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 1.1, 0.1),
          longitudeDelta: Math.max((maxLng - minLng) * 1.1, 0.1),
        }
        
        console.log('🎯 Auto-fitting map to events:', newRegion)
        setMapRegion(newRegion)
      }
    }
  }, [userLocation, filteredEvents])

  // Update filtered events when events change
  useEffect(() => {
    console.log('🎯 Events updated:', events.length)
    if (events.length > 0) {
      console.log('🎯 Sample event:', events[0])
      console.log('🎯 Event fields:', Object.keys(events[0]))
      console.log('🎯 Sample coordinates:', events[0].latitude, events[0].longitude)
    }
    
    // Apply radius filtering if user location is available
    let filtered = events;
    if (userLocation && currentRadius) {
      // Ensure radius doesn't exceed user group limit
      const effectiveRadius = Math.min(currentRadius, userMaxRadius)
      
      console.log(`🎯 Radius filtering debug: currentRadius=${currentRadius}km, userMaxRadius=${userMaxRadius}km, effectiveRadius=${effectiveRadius}km`)
      
      if (currentRadius > userMaxRadius) {
        console.log(`⚠️ Requested radius ${currentRadius}km exceeds user group limit ${userMaxRadius}km, using ${effectiveRadius}km`)
      }
      
      const radiusInDegrees = effectiveRadius / 111; // Approximate conversion from km to degrees
      filtered = events.filter(event => {
        if (!event.latitude || !event.longitude) return false;
        
        const latDiff = Math.abs(event.latitude - userLocation[0]);
        const lngDiff = Math.abs(event.longitude - userLocation[1]);
        
        // Simple distance check (approximate)
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        const isWithinRadius = distance <= radiusInDegrees;
        
        if (!isWithinRadius) {
          console.log(`🎯 Event filtered out by radius: ${event.name} (distance: ${(distance * 111).toFixed(1)}km)`);
        }
        
        return isWithinRadius;
      });
      
      console.log(`🎯 Radius filtering: ${events.length} total events, ${filtered.length} within ${effectiveRadius}km radius (user group limit: ${userMaxRadius}km)`);
    }
    
    setFilteredEvents(filtered)
  }, [events, userLocation, currentRadius, userMaxRadius])

  // Event press handler
  const handleEventPress = useCallback((event: Event) => {
    console.log(`🎯 Event pressed: ${event.name} (${event.category})`)
    setSelectedEvent(event)
    setShowEventDetailsModal(true)
  }, [])

  // Cluster press handler
  const handleClusterPress = useCallback((cluster: EventCluster) => {
    console.log(`🎯 Cluster pressed: ${cluster.count} events`)
    console.log(`🎯 Cluster events:`, cluster.events.map(e => `${e.name} (${e.id})`))
    
    if (cluster.count === 1) {
      // Single event - open event details modal directly
      const event = cluster.events[0]
      console.log(`🎯 Opening single event details modal: ${event.name}`)
      setSelectedEvent(event)
      setShowEventDetailsModal(true)
      
      // Load rating stats for the event
      loadEventRatingStats(event.id)
    } else {
      // Multiple events - open cluster modal
      console.log(`🎯 Opening cluster modal with ${cluster.count} events`)
      setClusterSearchQuery('')
      setClusterPageIndex(0)
      setSelectedCluster(cluster)
      setShowClusterModal(true)
    }
  }, [loadEventRatingStats])

  // Create clusters and markers with performance optimization
  const markers = useMemo(() => {
    console.log('🎯 Creating markers from', filteredEvents.length, 'events')
    
    // Limit events for performance - increased limit for better coverage
    const maxEvents = Math.min(filteredEvents.length, 2000) // Increased from 500 to 2000
    const eventsToShow = filteredEvents.slice(0, maxEvents)
    
    console.log('🎯 Processing', eventsToShow.length, 'events for markers (limited for performance)')
    
    // Filter out events with invalid coordinates
    const validEvents = eventsToShow.filter(event => {
      const isValid = event.latitude && event.longitude && 
                     !isNaN(event.latitude) && !isNaN(event.longitude) &&
                     event.latitude !== 0 && event.longitude !== 0
      if (!isValid) {
        console.log('🎯 Invalid coordinates for event:', event.name, event.latitude, event.longitude)
      }
      return isValid
    })
    
    console.log('🎯 Valid events with coordinates:', validEvents.length)
    
    // Create clusters
    const clusters = createClusters(validEvents, 0.01) // 0.01 degrees ≈ 1km
    
    // Debug clustering results (only log if there are many events)
    if (validEvents.length > 100) {
      const singleEventClusters = clusters.filter(c => c.count === 1)
      const multiEventClusters = clusters.filter(c => c.count > 1)
      const largeEventClusters = clusters.filter(c => c.count >= 20)
      const veryLargeEventClusters = clusters.filter(c => c.count >= 100)
      
      console.log(`🎯 Created ${clusters.length} clusters from ${eventsToShow.length} events`)
      console.log(`🎯 Single-event clusters: ${singleEventClusters.length}`)
      console.log(`🎯 Multi-event clusters: ${multiEventClusters.length}`)
      console.log(`🎯 Large clusters (20+): ${largeEventClusters.length}`)
      console.log(`🎯 Very large clusters (100+): ${veryLargeEventClusters.length}`)
      
      if (multiEventClusters.length > 0) {
        // Sort by count to show largest first
        const sortedClusters = multiEventClusters.sort((a, b) => b.count - a.count)
        console.log(`🎯 Largest cluster: ${sortedClusters[0].count} events at ${sortedClusters[0].latitude}, ${sortedClusters[0].longitude}`)
      }
    }
    
    console.log('🎯 Rendering', clusters.length, 'cluster markers')
    
    return clusters.map(cluster => {
      return (
        <ClusterMarker
          key={cluster.id}
          cluster={cluster}
          onPress={() => handleClusterPress(cluster)}
          onShare={handleShareEvent}
        />
      )
    })
  }, [filteredEvents, handleClusterPress])



  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {locationPermissionGranted === undefined 
            ? 'Checking location permission...' 
            : 'Loading events...'
          }
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Map - Full screen */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
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
        onPress={handleMapPress}
      >
        {/* Render radius circle if user location is available */}
        {userLocation && currentRadius && (
          <Circle
            center={{
              latitude: userLocation[0],
              longitude: userLocation[1],
            }}
            radius={currentRadius * 1000} // Convert km to meters
            strokeColor="rgba(0, 122, 255, 0.3)"
            strokeWidth={2}
            fillColor="rgba(0, 122, 255, 0.1)"
          />
        )}
        
        {/* Render simple markers */}
        {markers}
        
        {/* Location picker marker */}
        {isLocationPickerMode && selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            pinColor="red"
            title="Selected Location"
            description={selectedLocation.address || 'Tap confirm to use this location'}
          />
        )}
      </MapView>

      {/* Location Picker Overlay */}
      {isLocationPickerMode && (
        <>
          {/* Transparent overlay for map interaction */}
          <View style={styles.locationPickerMapOverlay} pointerEvents="box-none" />
          
          {/* Header overlay */}
          <View style={styles.locationPickerHeaderOverlay}>
            <Text style={styles.locationPickerTitle}>Choose Location</Text>
            <TouchableOpacity onPress={cancelLocationPicker} style={styles.locationPickerCloseButton}>
              <Text style={styles.locationPickerCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Bottom content overlay */}
          <View style={styles.locationPickerContentOverlay}>
            <Text style={styles.locationPickerSubtitle}>Tap on the map to select a location</Text>
            
            {selectedLocation && (
              <View style={styles.locationPickerInfo}>
                <Text style={styles.locationPickerCoords}>
                  📍 {selectedLocation.latitude?.toFixed(6) || '0.000000'}, {selectedLocation.longitude?.toFixed(6) || '0.000000'}
                </Text>
                {selectedLocation.address && (
                  <Text style={styles.locationPickerAddress}>{selectedLocation.address}</Text>
                )}
              </View>
            )}
            
            <View style={styles.locationPickerButtons}>
              <TouchableOpacity
                style={styles.locationPickerCancelButton}
                onPress={cancelLocationPicker}
              >
                <Text style={styles.locationPickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.locationPickerConfirmButton,
                  !selectedLocation && styles.locationPickerConfirmButtonDisabled
                ]}
                onPress={confirmLocationSelection}
                disabled={!selectedLocation}
              >
                <Text style={[
                  styles.locationPickerConfirmText,
                  !selectedLocation && styles.locationPickerConfirmTextDisabled
                ]}>
                  Confirm Location
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Bottom Button Container */}
      <View style={styles.bottomButtonContainer}>
        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            Alert.alert(
              'Filter Options',
              'Choose your filters:',
              [
                { text: 'Adjust Radius', onPress: () => {
                  // Create radius options based on user group limits
                  const radiusOptions = [
                    { text: '5km (Very Local)', onPress: () => setCurrentRadius(5) },
                    { text: '10km (Local)', onPress: () => setCurrentRadius(10) },
                    { text: '15km (Regional)', onPress: () => setCurrentRadius(15) },
                    { text: '50km (Wide)', onPress: () => setCurrentRadius(50) },
                    { text: '100km (Very Wide)', onPress: () => setCurrentRadius(100) },
                    { text: '200km (Extended)', onPress: () => setCurrentRadius(200) },
                    { text: '300km (Very Extended)', onPress: () => setCurrentRadius(300) },
                    { text: '500km (Maximum)', onPress: () => setCurrentRadius(500) }
                  ].filter(option => {
                    // Extract radius value from text (e.g., "5km" -> 5)
                    const radiusMatch = option.text.match(/(\d+)km/)
                    if (radiusMatch) {
                      const radius = parseInt(radiusMatch[1])
                      return radius <= userMaxRadius
                    }
                    return true
                  })
                  
                  console.log(`🎯 Radius options for user group ${userGroup} (max: ${userMaxRadius}km):`, radiusOptions.map(o => o.text))
                  
                  Alert.alert(
                    'Search Radius',
                    `Choose your search radius (max: ${userMaxRadius}km):`,
                    [
                      ...radiusOptions,
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  )
                }},
                { text: 'Date Range', onPress: () => {
                  // Get user group date filter limits
                  const getDateFilterOptions = () => {
                    const now = new Date()
                    const today = now.toISOString().split('T')[0]
                    
                    const options = [
                      { text: 'Today', onPress: () => {
                        setDateFilter({ from: today, to: today })
                      }}
                    ]
                    
                    // Add "This Week" option based on user group
                    if (userGroup === 'registered' || userGroup === 'premium') {
                      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                      options.push({
                        text: 'This Week',
                        onPress: () => {
                          setDateFilter({ 
                            from: today, 
                            to: endOfWeek.toISOString().split('T')[0] 
                          })
                        }
                      })
                    }
                    
                    // Add "Next 2 Weeks" option for premium users
                    if (userGroup === 'premium') {
                      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
                      options.push({
                        text: 'Next 2 Weeks',
                        onPress: () => {
                          setDateFilter({ 
                            from: today, 
                            to: twoWeeksFromNow.toISOString().split('T')[0] 
                          })
                        }
                      })
                    }
                    
                    // Add "This Month" option for premium users
                    if (userGroup === 'premium') {
                      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                      options.push({
                        text: 'This Month',
                        onPress: () => {
                          setDateFilter({ 
                            from: today, 
                            to: endOfMonth.toISOString().split('T')[0] 
                          })
                        }
                      })
                    }
                    
                    // Add "All Events" option for premium users
                    if (userGroup === 'premium') {
                      options.push({
                        text: 'All Events',
                        onPress: () => {
                          setDateFilter({ from: today, to: '' })
                        }
                      })
                    }
                    
                    return options
                  }
                  
                  const options = getDateFilterOptions()
                  
                  console.log(`🎯 Date filter options for user group ${userGroup}:`, options.map(o => o.text))
                  
                  Alert.alert(
                    'Date Range',
                    `Choose your date range (${userGroup} user):`,
                    [
                      ...options,
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  )
                }},
                { text: 'Cancel', style: 'cancel' }
              ]
            )
          }}
        >
          <Text style={styles.filterButtonText}>⚙️</Text>
        </TouchableOpacity>

        {/* Create Event Button */}
        <TouchableOpacity
          style={styles.createEventButton}
          onPress={() => {
            console.log('🎯 Create Event button clicked')
            setSelectedEvent(null)
            setShowEventEditor(true)
            console.log('🎯 EventEditor should now be visible')
            // Add a timeout to check if the state actually changed
            setTimeout(() => {
              console.log('🎯 After timeout - showEventEditor should be true')
            }, 100)
          }}
        >
          <Text style={styles.createEventButtonText}>+ Create Event</Text>
        </TouchableOpacity>

        {/* Profile Button */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setShowUserProfile(true)}
        >
          <Text style={styles.profileButtonText}>👤</Text>
        </TouchableOpacity>
      </View>

             {/* User Group Manager - Hidden by default, shown via modal */}

       {/* Background Loading Indicator */}
       {isBackgroundLoading && (
         <View style={styles.backgroundLoadingContainer}>
           <ActivityIndicator size="small" color="#007AFF" />
           <Text style={styles.backgroundLoadingText}>Loading more events...</Text>
         </View>
       )}

      {/* Radius Info Display */}
      {userLocation && currentRadius && (
        <View style={styles.radiusInfoContainer}>
          <Text style={styles.radiusInfoText}>
            📍 Showing events within {currentRadius}km radius
          </Text>
          {userGroup === 'unregistered' && (
            <Text style={styles.radiusInfoSubtext}>
              Register to see more events and features!
            </Text>
          )}
        </View>
      )}



      {/* Event Details Modal */}
       <Modal
         visible={showEventDetailsModal}
         animationType="slide"
         presentationStyle="pageSheet"
         onRequestClose={() => {
           setShowEventDetailsModal(false)
           setSelectedEvent(null)
         }}
       >
         <View style={styles.modalContainer}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Event Details</Text>
             <View style={styles.modalHeaderActions}>
               <TouchableOpacity 
                 style={styles.iconButton}
                 onPress={() => selectedEvent && handleShareEvent(selectedEvent)}
               >
                 <Text style={styles.iconButtonText}>📤</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={() => {
                   setShowEventDetailsModal(false)
                   setSelectedEvent(null)
                 }}
                 style={styles.iconButton}
               >
                 <Text style={styles.iconButtonText}>✕</Text>
               </TouchableOpacity>
             </View>
           </View>
           
           {selectedEvent && (
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Event Header */}
               <View style={styles.eventHeader}>
                 <View style={styles.eventTitleContainer}>
                   <Text style={styles.eventTitle}>{selectedEvent.name}</Text>
                   <View style={styles.categoryBadge}>
                     <Text style={styles.categoryIcon}>
                       {getMarkerIcon(selectedEvent.category || 'other')}
                     </Text>
                     <Text style={styles.categoryText}>
                       {selectedEvent.category || 'other'}
                     </Text>
                   </View>
                 </View>
               </View>

               {/* Rating Section */}
               <View style={styles.ratingSection}>
                 <View style={styles.ratingContainer}>
                   <RatingDisplay
                     averageRating={eventRatingStats?.averageRating || 0}
                     totalRatings={eventRatingStats?.totalRatings || 0}
                     size="medium"
                     onPress={async () => {
                       const isAuth = await userService.isAuthenticated();
                       
                       if (isAuth) {
                         Alert.alert(
                           `Rate "${selectedEvent?.name}"`,
                           'How would you rate this event?',
                           [
                             { text: '⭐ 1 Star', onPress: () => submitRating(1) },
                             { text: '⭐⭐ 2 Stars', onPress: () => submitRating(2) },
                             { text: '⭐⭐⭐ 3 Stars', onPress: () => submitRating(3) },
                             { text: '⭐⭐⭐⭐ 4 Stars', onPress: () => submitRating(4) },
                             { text: '⭐⭐⭐⭐⭐ 5 Stars', onPress: () => submitRating(5) },
                             { text: 'Cancel', style: 'cancel' }
                           ]
                         );
                       } else {
                         Alert.alert(
                           'Authentication Required',
                           'You need to sign in to rate events. Would you like to sign in now?',
                           [
                             { text: 'Cancel', style: 'cancel' },
                             { text: 'Sign In', onPress: () => {
                               Alert.alert('Sign In', 'Please sign in through the app settings to rate events.');
                             }}
                           ]
                         );
                       }
                     }}
                   />
                   <TouchableOpacity
                     style={styles.rateButton}
                     onPress={async () => {
                       const isAuth = await userService.isAuthenticated();
                       
                       if (isAuth) {
                         Alert.alert(
                           `Rate "${selectedEvent?.name}"`,
                           'How would you rate this event?',
                           [
                             { text: '⭐ 1 Star', onPress: () => submitRating(1) },
                             { text: '⭐⭐ 2 Stars', onPress: () => submitRating(2) },
                             { text: '⭐⭐⭐ 3 Stars', onPress: () => submitRating(3) },
                             { text: '⭐⭐⭐⭐ 4 Stars', onPress: () => submitRating(4) },
                             { text: '⭐⭐⭐⭐⭐ 5 Stars', onPress: () => submitRating(5) },
                             { text: 'Cancel', style: 'cancel' }
                           ]
                         );
                       } else {
                         Alert.alert(
                           'Authentication Required',
                           'You need to sign in to rate events. Would you like to sign in now?',
                           [
                             { text: 'Cancel', style: 'cancel' },
                             { text: 'Sign In', onPress: () => {
                               Alert.alert('Sign In', 'Please sign in through the app settings to rate events.');
                             }}
                           ]
                         );
                       }
                     }}
                   >
                     <Text style={styles.rateButtonIcon}>⭐</Text>
                   </TouchableOpacity>
                 </View>
               </View>

               {/* Event Details */}
               <View style={styles.eventDetailsSection}>
                 {selectedEvent.description && (
                   <View style={styles.detailItem}>
                     <Text style={styles.detailLabel}>📝 Description</Text>
                     <Text style={styles.eventDescription}>{selectedEvent.description}</Text>
                   </View>
                 )}

                 <View style={styles.detailItem}>
                   <Text style={styles.detailLabel}>🏢 Venue</Text>
                   <Text style={styles.eventVenue}>{selectedEvent.venue}</Text>
                 </View>

                 {selectedEvent.address && (
                   <View style={styles.detailItem}>
                     <Text style={styles.detailLabel}>📍 Address</Text>
                     <Text style={styles.eventAddress}>{selectedEvent.address}</Text>
                   </View>
                 )}

                 <View style={styles.detailItem}>
                   <Text style={styles.detailLabel}>📅 Date & Time</Text>
                   <Text style={styles.eventDateTime}>
                     {new Date(selectedEvent.startsAt).toLocaleDateString('en-US', {
                       weekday: 'long',
                       year: 'numeric',
                       month: 'long',
                       day: 'numeric'
                     })}
                   </Text>
                   <Text style={styles.eventTime}>
                     {new Date(selectedEvent.startsAt).toLocaleTimeString('en-US', {
                       hour: '2-digit',
                       minute: '2-digit'
                     })}
                   </Text>
                 </View>

                 {selectedEvent.url && selectedEvent.url.trim() !== '' && (
                   <View style={styles.detailItem}>
                     <Text style={styles.detailLabel}>🌐 Website</Text>
                     <TouchableOpacity
                       style={styles.urlButton}
                       onPress={() => {
                         if (selectedEvent.url) {
                           Linking.openURL(selectedEvent.url).catch(() => {
                             Alert.alert('Error', 'Could not open the website. Please check the URL.');
                           });
                         }
                       }}
                     >
                       <Text style={styles.urlText}>Visit Website</Text>
                       <Text style={styles.urlIcon}>🔗</Text>
                     </TouchableOpacity>
                   </View>
                 )}

                 {selectedEvent.createdBy && (
                   <View style={styles.detailItem}>
                     <Text style={styles.detailLabel}>👤 Organizer</Text>
                     <Text style={styles.eventOrganizer}>{selectedEvent.createdBy}</Text>
                   </View>
                 )}

                 {/* Event Registration */}
                 <EventRegistrationComponent
                   eventId={selectedEvent.id}
                   eventName={selectedEvent.name}
                   onRegistrationChange={(registrationCount, isRegistered) => {
                     console.log('🎯 Registration changed:', { registrationCount, isRegistered });
                   }}
                 />
               </View>
               
               {/* Permission loading indicator */}
               {permissionLoading && (
                 <View style={styles.permissionLoadingContainer}>
                   <ActivityIndicator size="small" color="#007AFF" />
                   <Text style={styles.permissionLoadingText}>Checking permissions...</Text>
                 </View>
               )}
               
                                               {/* Edit and Delete Buttons - Only show if user can edit this event */}
                {(() => {
                  console.log('🔐 Rendering action buttons - selectedEvent:', !!selectedEvent, 'canEditSelectedEvent:', canEditSelectedEvent, 'permissionLoading:', permissionLoading);
                  return selectedEvent && canEditSelectedEvent && !permissionLoading;
                })() && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => {
                        setShowEventDetailsModal(false)
                        setShowEventEditor(true)
                        // Don't set selectedEvent to null - keep it for editing
                      }}
                    >
                      <Text style={styles.actionButtonText}>Edit Event</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => {
                        Alert.alert(
                          'Delete Event',
                          `Are you sure you want to delete "${selectedEvent.name}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await deleteEvent(selectedEvent.id)
                                  setShowEventDetailsModal(false)
                                  setSelectedEvent(null)
                                  Alert.alert('Success', 'Event deleted successfully! Changes are synced to all users.')
                                } catch (error) {
                                  const appError = errorHandler.handleApiError(error, {
                                    action: 'delete_event',
                                    entity: 'event',
                                    value: selectedEvent.id
                                  });
                                  setCurrentError(appError);
                                }
                              }
                            }
                          ]
                        )
                      }}
                    >
                      <Text style={styles.actionButtonText}>Delete Event</Text>
                    </TouchableOpacity>
                  </View>
                )}
               
               {/* Sync Status */}
               <View style={styles.syncStatus}>
                 <Text style={styles.syncStatusText}>
                   Status: {syncStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
                 </Text>
                 {syncStatus.lastSyncAt && (
                   <Text style={styles.syncStatusText}>
                     Last sync: {new Date(syncStatus.lastSyncAt).toLocaleTimeString()}
                   </Text>
                 )}
                 {syncStatus.pendingOperations > 0 && (
                   <Text style={styles.syncStatusText}>
                     Pending: {syncStatus.pendingOperations} operations
                   </Text>
                 )}
                 {syncStatus.errors.length > 0 && (
                   <Text style={styles.syncErrorText}>
                     Errors: {syncStatus.errors.length}
                                    </Text>
                   )}
               </View>
               </ScrollView>
           )}
         </View>
       </Modal>

       {/* Event Editor Modal */}
       <EventEditor
         visible={(() => {
           const isVisible = showEventEditor && !isLocationPickerMode
           console.log('🎯 EventEditor visibility:', { showEventEditor, isLocationPickerMode, isVisible })
           return isVisible
         })()}
         onClose={() => setShowEventEditor(false)}
         selectedEvent={selectedEvent}
         onEventUpdated={(updatedEvent) => {
           console.log('🎯 Event updated via editor:', updatedEvent.name)
           setShowEventEditor(false)
           setShowEventDetailsModal(false)
         }}
         events={events}
         onUpdateEvent={updateEvent}
         onDeleteEvent={deleteEvent}
         startLocationPicker={startLocationPicker}
         onLocationPickerClose={() => {
           console.log('🎯 Location picker closed callback received from MapViewNative')
         }}
       />

               {/* Enhanced Cluster Details Modal */}
        <Modal
          visible={showClusterModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowClusterModal(false)
            setClusterSearchQuery('')
            setClusterPageIndex(0)
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCluster?.count} Events at This Location</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => selectedCluster && handleShareCluster(selectedCluster)}
                >
                  <Text style={styles.iconButtonText}>📤</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setShowClusterModal(false)
                    setClusterSearchQuery('')
                    setClusterPageIndex(0)
                  }}
                  style={styles.iconButton}
                >
                  <Text style={styles.iconButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedCluster && (() => {
              // Filter events based on search query
              const filteredClusterEvents = (selectedCluster.events || []).filter(event =>
                clusterSearchQuery === '' || 
                (event.name || '').toLowerCase().includes(clusterSearchQuery.toLowerCase()) ||
                (event.description || '').toLowerCase().includes(clusterSearchQuery.toLowerCase())
              )
              
              // Pagination logic
              const EVENTS_PER_PAGE = 20
              const totalPages = Math.ceil(filteredClusterEvents.length / EVENTS_PER_PAGE)
              const startIndex = clusterPageIndex * EVENTS_PER_PAGE
              const endIndex = startIndex + EVENTS_PER_PAGE
              const currentPageEvents = filteredClusterEvents.slice(startIndex, endIndex)
              
              return (
                <View style={styles.modalContent}>
                  {/* Search bar for large clusters */}
                  {selectedCluster.count > 10 && (
                    <View style={styles.searchContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search events..."
                        value={clusterSearchQuery}
                        onChangeText={setClusterSearchQuery}
                        autoCapitalize="none"
                      />
                    </View>
                  )}
                  
                  {/* Results info */}
                  <View style={styles.resultsInfo}>
                    <Text style={styles.resultsText}>
                      Showing {currentPageEvents.length} of {filteredClusterEvents.length} events
                      {totalPages > 1 && ` (Page ${clusterPageIndex + 1} of ${totalPages})`}
                    </Text>
                  </View>
                  
                  {/* Event list */}
                  <ScrollView style={styles.eventList} showsVerticalScrollIndicator={false}>
                    {currentPageEvents.map((event, index) => (
                      <TouchableOpacity
                        key={`${event.id}-${index}`}
                        style={styles.clusterEventItem}
                        onPress={() => {
                          setSelectedEvent(event)
                          setShowClusterModal(false)
                          setShowEventDetailsModal(true)
                        }}
                      >
                        <View style={styles.clusterEventHeader}>
                          <View style={styles.clusterEventTitleContainer}>
                            <Text style={styles.clusterEventTitle}>{event.name || 'Untitled Event'}</Text>
                            <View style={styles.clusterEventCategoryBadge}>
                              <Text style={styles.clusterEventCategoryIcon}>
                                {getMarkerIcon(event.category || determineCategory(event.name, event.description))}
                              </Text>
                              <Text style={styles.clusterEventCategoryText}>
                                {event.category || determineCategory(event.name, event.description)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.clusterEventActions}>
                            <TouchableOpacity
                              style={styles.clusterEventShareButton}
                              onPress={(e) => {
                                e.stopPropagation()
                                handleShareEvent(event)
                              }}
                            >
                              <Text style={styles.clusterEventShareButtonText}>📤</Text>
                            </TouchableOpacity>
                            {(() => {
                              console.log('🔐 Cluster event permission check:', event.name, 'permission:', eventPermissions[event.id]);
                              return eventPermissions[event.id];
                            })() && (
                              <TouchableOpacity
                                style={styles.clusterEventEditButton}
                                onPress={(e) => {
                                  e.stopPropagation()
                                  setSelectedEvent(event)
                                  setShowClusterModal(false)
                                  setShowEventEditor(true)
                                }}
                              >
                                <Text style={styles.clusterEventEditButtonText}>✏️</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        {event.description && (
                          <Text style={styles.clusterEventDescription} numberOfLines={2}>
                            {event.description}
                          </Text>
                        )}
                        <View style={styles.clusterEventFooter}>
                          <Text style={styles.clusterEventTime}>
                            {new Date(event.startsAt).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                          <Text style={styles.clusterEventTimeDetail}>
                            {new Date(event.startsAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[styles.paginationButton, clusterPageIndex === 0 && styles.paginationButtonDisabled]}
                        onPress={() => setClusterPageIndex(Math.max(0, clusterPageIndex - 1))}
                        disabled={clusterPageIndex === 0}
                      >
                        <Text style={[styles.paginationButtonText, clusterPageIndex === 0 && styles.paginationButtonTextDisabled]}>
                          Previous
                        </Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.paginationInfo}>
                        {clusterPageIndex + 1} / {totalPages}
                      </Text>
                      
                      <TouchableOpacity
                        style={[styles.paginationButton, clusterPageIndex === totalPages - 1 && styles.paginationButtonDisabled]}
                        onPress={() => setClusterPageIndex(Math.min(totalPages - 1, clusterPageIndex + 1))}
                        disabled={clusterPageIndex === totalPages - 1}
                      >
                        <Text style={[styles.paginationButtonText, clusterPageIndex === totalPages - 1 && styles.paginationButtonTextDisabled]}>
                          Next
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })()}
          </View>
        </Modal>

        {/* User Group Manager Modal */}
        <UserGroupManager
          visible={showUserGroupManager}
          onClose={() => setShowUserGroupManager(false)}
        />

        {/* User Profile Modal */}
        <UserProfile
          visible={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />

        {/* Event Rating Modal - Removed, using Alert-based rating instead */}

        {/* Error Display */}
        <ErrorDisplay
          error={currentError}
          onRetry={() => {
            setCurrentError(null);
            // Retry the last action - this could be enhanced to store the last action
          }}
          onDismiss={() => setCurrentError(null)}
          autoHide={true}
          autoHideDelay={5000}
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
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  clusterMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  clusterIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  clusterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  clusterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 60,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  eventHeader: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTitleContainer: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 34,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  ratingSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventDetailsSection: {
    marginBottom: 20,
  },
  detailItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  eventVenue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eventAddress: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  eventDateTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  eventOrganizer: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  urlText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  urlIcon: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  syncStatus: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  syncStatusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  syncErrorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 5,
    fontWeight: '600',
  },

                 createEventButton: {
     backgroundColor: '#007AFF',
     paddingHorizontal: 20,
     paddingVertical: 12,
     borderRadius: 25,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.3,
     shadowRadius: 4,
     elevation: 5,
   },
  createEventButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clusterEventItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  clusterEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clusterEventTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  clusterEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clusterEventCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  clusterEventCategoryIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  clusterEventCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textTransform: 'capitalize',
  },
  clusterEventActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterEventShareButton: {
    marginRight: 8,
    padding: 5,
  },
  clusterEventShareButtonText: {
    fontSize: 16,
    color: '#28a745',
  },
  clusterEventEditButton: {
    marginLeft: 10,
    padding: 5,
  },
  clusterEventEditButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  clusterEventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  clusterEventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clusterEventTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  clusterEventTimeDetail: {
    fontSize: 12,
    color: '#999',
  },
  calloutContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  calloutActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  calloutShareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  calloutShareButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  calloutViewButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  calloutViewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resultsInfo: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  eventList: {
    flex: 1,
    padding: 15,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  paginationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  paginationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
     paginationInfo: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#333',
   },
         backgroundLoadingContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 50, // Increased top margin for iPhone
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
   backgroundLoadingText: {
     marginLeft: 8,
     fontSize: 14,
     color: '#666',
     fontWeight: '500',
   },
         
          profileButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    profileButtonText: {
      fontSize: 20,
      color: '#007AFF',
    },
    bottomButtonContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 100 : 100,
      left: 20,
      right: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    },
    filterButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    filterButtonText: {
      fontSize: 20,
      color: '#007AFF',
    },
    // Location picker overlay styles
    locationPickerMapOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    locationPickerHeaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
      zIndex: 1001,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    locationPickerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
    },
    locationPickerCloseButton: {
      padding: 8,
    },
    locationPickerCloseButtonText: {
      fontSize: 20,
      color: '#666',
    },
    locationPickerContentOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      padding: 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1001,
    },
    locationPickerSubtitle: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 20,
    },
    locationPickerInfo: {
      backgroundColor: '#f8f9fa',
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
    },
    locationPickerCoords: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
      marginBottom: 8,
    },
    locationPickerAddress: {
      fontSize: 14,
      color: '#666',
      lineHeight: 20,
    },
    locationPickerButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    locationPickerCancelButton: {
      flex: 1,
      backgroundColor: '#f8f9fa',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#dee2e6',
    },
    locationPickerCancelText: {
      fontSize: 16,
      color: '#6c757d',
      fontWeight: '600',
      textAlign: 'center',
    },
    locationPickerConfirmButton: {
      flex: 2,
      backgroundColor: '#007AFF',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    locationPickerConfirmButtonDisabled: {
      backgroundColor: '#ccc',
    },
    locationPickerConfirmText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
      textAlign: 'center',
    },
    locationPickerConfirmTextDisabled: {
      color: '#999',
    },
    ratingContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: '#f8f9fa',
      borderRadius: 8,
    },
    rateButton: {
      backgroundColor: '#FFD700',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 20,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    rateButtonIcon: {
      fontSize: 18,
      color: '#333',
    },
              authIndicator: {
        fontSize: 10,
        marginLeft: 4,
      },
     permissionLoadingContainer: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'center',
       padding: 15,
     },
     radiusInfoContainer: {
       position: 'absolute',
       top: 100,
       left: 16,
       right: 16,
       backgroundColor: 'rgba(255, 255, 255, 0.95)',
       padding: 12,
       borderRadius: 8,
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.1,
       shadowRadius: 4,
       elevation: 3,
       zIndex: 1000,
     },
     radiusInfoText: {
       fontSize: 14,
       fontWeight: '600',
       color: '#333',
       textAlign: 'center',
     },
     radiusInfoSubtext: {
       fontSize: 12,
       color: '#666',
       textAlign: 'center',
       marginTop: 4,
     },
     permissionLoadingText: {
       fontSize: 14,
       color: '#666',
       marginLeft: 8,
     },
   })
export default MapViewNative

