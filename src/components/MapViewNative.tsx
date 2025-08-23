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
  ActivityIndicator
} from 'react-native'
import MapView, { Marker, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { loadEventsPartially } from '../utils/eventLoader'
import { Event } from '../data/events'
import EventEditor from './EventEditor'
import { useEvents } from '../context/EventContext'

// Clustering interfaces
interface EventCluster {
  id: string
  latitude: number
  longitude: number
  events: Event[]
  count: number
  categories: Set<string>
}

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
    'nature & environment': '🌿',
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
      id: `location-cluster-${centerEvent.latitude.toFixed(6)}-${centerEvent.longitude.toFixed(6)}-${locationEvents.length}`,
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
  onPress 
}: {
  cluster: EventCluster
  onPress: () => void
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
  onPress 
}: {
  event: Event
  onPress: () => void
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
    </Marker>
  )
})

const MapViewNative: React.FC = () => {
  const { events, updateEvent, deleteEvent, isLoading, isBackgroundLoading, syncStatus, userLocation, locationPermissionGranted, currentRadius, setCurrentRadius, dateFilter, setDateFilter, forceUpdateCheck } = useEvents()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [showEventEditor, setShowEventEditor] = useState(false)
  const [showClusterModal, setShowClusterModal] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<EventCluster | null>(null)
  const [clusterSearchQuery, setClusterSearchQuery] = useState('')
  const [clusterPageIndex, setClusterPageIndex] = useState(0)
  
  // Map reference
  const mapRef = useRef<MapView>(null)
  
  // Map state - initialize with user location or default to Estonia
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 58.3776252,
    longitude: 26.7290063,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  })

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
    setFilteredEvents(events)
  }, [events])

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
    
    // Reset search and pagination state for new cluster
    setClusterSearchQuery('')
    setClusterPageIndex(0)
    setSelectedCluster(cluster)
    setShowClusterModal(true)
  }, [])

  // Create clusters and markers with performance optimization
  const markers = useMemo(() => {
    console.log('🎯 Creating markers from', filteredEvents.length, 'events')
    
    // Limit events for performance - start with smaller limit for faster initial render
    const maxEvents = Math.min(filteredEvents.length, 500) // Reduced from 1000 to 500
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
      {/* Map */}
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
      >
        {/* Render simple markers */}
        {markers}
      </MapView>

             {/* Location and Radius Info */}
       {userLocation && (
         <View style={styles.locationInfoContainer}>
                       <Text style={styles.locationInfoText}>
              📍 {currentRadius}km radius • 📅 {dateFilter.from} to {dateFilter.to} • {events.length} events
              {isLoading && ' • Loading...'}
            </Text>
                       <View style={styles.filterButtonsContainer}>
              <TouchableOpacity
                style={styles.radiusAdjustButton}
                onPress={() => {
                  Alert.alert(
                    'Adjust Search Radius',
                    'Choose your search radius:',
                    [
                      { text: '50km (Local)', onPress: () => {
                        console.log('🎯 User changed radius to 50km')
                        setCurrentRadius(50)
                      }},
                      { text: '100km (Regional)', onPress: () => {
                        console.log('🎯 User changed radius to 100km')
                        setCurrentRadius(100)
                      }},
                      { text: '200km (Wide)', onPress: () => {
                        console.log('🎯 User changed radius to 200km')
                        setCurrentRadius(200)
                      }},
                      { text: '300km (Very Wide)', onPress: () => {
                        console.log('🎯 User changed radius to 300km')
                        setCurrentRadius(300)
                      }},
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  )
                }}
              >
                <Text style={styles.radiusAdjustButtonText}>⚙️</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateFilterButton}
                onPress={() => {
                  Alert.alert(
                    'Adjust Date Range',
                    'Choose your date range:',
                    [
                      { text: 'Today', onPress: () => {
                        const today = new Date().toISOString().split('T')[0]
                        console.log('📅 User changed date filter to today')
                        setDateFilter({ from: today, to: today })
                      }},
                      { text: 'This Week', onPress: () => {
                        const now = new Date()
                        const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                        console.log('📅 User changed date filter to this week')
                        setDateFilter({ 
                          from: now.toISOString().split('T')[0], 
                          to: endOfWeek.toISOString().split('T')[0] 
                        })
                      }},
                      { text: 'Next 2 Weeks', onPress: () => {
                        const now = new Date()
                        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
                        console.log('📅 User changed date filter to next 2 weeks')
                        setDateFilter({ 
                          from: now.toISOString().split('T')[0], 
                          to: twoWeeksFromNow.toISOString().split('T')[0] 
                        })
                      }},
                      { text: 'This Month', onPress: () => {
                        const now = new Date()
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                        console.log('📅 User changed date filter to this month')
                        setDateFilter({ 
                          from: now.toISOString().split('T')[0], 
                          to: endOfMonth.toISOString().split('T')[0] 
                        })
                      }},
                      { text: 'All Events', onPress: () => {
                        const today = new Date().toISOString().split('T')[0]
                        console.log('📅 User changed date filter to all events (from today onwards)')
                        setDateFilter({ from: today, to: '' })
                      }},
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  )
                }}
              >
                <Text style={styles.dateFilterButtonText}>📅</Text>
              </TouchableOpacity>
            </View>
         </View>
       )}

       {/* Background Loading Indicator */}
       {isBackgroundLoading && (
         <View style={styles.backgroundLoadingContainer}>
           <ActivityIndicator size="small" color="#007AFF" />
           <Text style={styles.backgroundLoadingText}>Loading more events...</Text>
         </View>
       )}

       {/* Create New Event Button */}
       <TouchableOpacity
         style={styles.createEventButton}
         onPress={() => {
           setSelectedEvent(null)
           setShowEventEditor(true)
         }}
       >
         <Text style={styles.createEventButtonText}>+ Create Event</Text>
       </TouchableOpacity>

      {/* Event Details Modal */}
       <Modal
         visible={showEventDetailsModal}
         animationType="slide"
         presentationStyle="pageSheet"
         onRequestClose={() => setShowEventDetailsModal(false)}
       >
         <View style={styles.modalContainer}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Event Details</Text>
             <TouchableOpacity 
               onPress={() => setShowEventDetailsModal(false)}
               style={styles.closeButton}
             >
               <Text style={styles.closeButtonText}>Close</Text>
             </TouchableOpacity>
           </View>
           
           {selectedEvent && (
             <ScrollView style={styles.modalContent}>
               <Text style={styles.eventTitle}>{selectedEvent.name}</Text>
               <Text style={styles.eventCategory}>Category: {selectedEvent.category || 'other'}</Text>
               <Text style={styles.eventDescription}>{selectedEvent.description}</Text>
               <Text style={styles.eventVenue}>Venue: {selectedEvent.venue}</Text>
               <Text style={styles.eventAddress}>Address: {selectedEvent.address}</Text>
               
               {/* Edit and Delete Buttons */}
               <View style={styles.actionButtons}>
                 <TouchableOpacity 
                   style={[styles.actionButton, styles.editButton]}
                   onPress={() => {
                     setShowEventDetailsModal(false)
                     setShowEventEditor(true)
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
                               Alert.alert('Success', 'Event deleted successfully! Changes are synced to all users.')
                             } catch (error) {
                               console.error('Error deleting event:', error)
                               Alert.alert('Error', 'Failed to delete event. Please try again.')
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
                 <TouchableOpacity
                   style={styles.forceUpdateButton}
                   onPress={() => {
                     console.log('🔄 Manual update check requested from UI')
                     forceUpdateCheck()
                   }}
                 >
                   <Text style={styles.forceUpdateButtonText}>🔄 Check Updates</Text>
                 </TouchableOpacity>
               </View>
             </ScrollView>
           )}
         </View>
       </Modal>

       {/* Event Editor Modal */}
       <EventEditor
         visible={showEventEditor}
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
              <TouchableOpacity 
                onPress={() => {
                  setShowClusterModal(false)
                  setClusterSearchQuery('')
                  setClusterPageIndex(0)
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            {selectedCluster && (() => {
              // Filter events based on search query
              const filteredClusterEvents = selectedCluster.events.filter(event =>
                clusterSearchQuery === '' || 
                event.name.toLowerCase().includes(clusterSearchQuery.toLowerCase()) ||
                event.description.toLowerCase().includes(clusterSearchQuery.toLowerCase())
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
                  <ScrollView style={styles.eventList}>
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
                          <Text style={styles.clusterEventTitle}>{event.name}</Text>
                          <View style={styles.clusterEventHeaderRight}>
                            <Text style={styles.clusterEventCategory}>
                              {event.category || determineCategory(event.name, event.description)}
                            </Text>
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
                          </View>
                        </View>
                        <Text style={styles.clusterEventDescription} numberOfLines={2}>
                          {event.description}
                        </Text>
                        <Text style={styles.clusterEventTime}>
                          {new Date(event.startsAt).toLocaleString()}
                        </Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  eventCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  eventDescription: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 24,
  },
  eventVenue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  eventAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
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
  forceUpdateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  forceUpdateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createEventButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  clusterEventHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterEventEditButton: {
    marginLeft: 10,
    padding: 5,
  },
  clusterEventEditButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  clusterEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  clusterEventCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clusterEventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  clusterEventTime: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
     top: 20,
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
   locationInfoContainer: {
     position: 'absolute',
     top: 60,
     left: 20,
     right: 20,
     backgroundColor: 'rgba(255, 255, 255, 0.95)',
     padding: 12,
     borderRadius: 8,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
   locationInfoText: {
     fontSize: 14,
     color: '#333',
     fontWeight: '500',
     flex: 1,
   },
   radiusAdjustButton: {
     padding: 8,
     backgroundColor: '#007AFF',
     borderRadius: 6,
     marginLeft: 10,
   },
       radiusAdjustButtonText: {
      fontSize: 16,
      color: 'white',
    },
    filterButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateFilterButton: {
      padding: 8,
      backgroundColor: '#28a745',
      borderRadius: 6,
      marginLeft: 8,
    },
    dateFilterButtonText: {
      fontSize: 16,
      color: 'white',
    },
  })

export default MapViewNative
