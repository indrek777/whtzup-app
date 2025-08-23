import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, ScrollView, Modal, Image, Switch, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Share, AppState, Pressable } from 'react-native'
import MapView, { Marker, Circle, Region, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import * as Sharing from 'expo-sharing'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Event } from '../data/events'
import { loadEventsPartially } from '../utils/eventLoader'

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

// Simple marker color function
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
    'other': '#9E9E9E'
  }
  return colors[category.toLowerCase()] || '#9E9E9E'
}

// Simple marker icon function
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
    const categories = new Set(locationEvents.map(e => e.category || determineCategory(e.name, e.description)))
    
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
    const category = event.category || determineCategory(event.name, event.description)
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

// Simple category determination function
const determineCategory = (name: string, description: string): string => {
  const text = (name + ' ' + description).toLowerCase()
  
  // Music events (check first to avoid conflicts)
  if (text.includes('music') || text.includes('concert') || text.includes('jazz') || 
      text.includes('band') || text.includes('orchestra') || text.includes('opera') ||
      text.includes('festival') && (text.includes('music') || text.includes('concert'))) {
    return 'music'
  }
  
  // Sports events
  if (text.includes('sport') || text.includes('football') || text.includes('basketball') ||
      text.includes('volleyball') || text.includes('tennis') || text.includes('running') ||
      text.includes('fitness') || text.includes('training') || text.includes('hiking') ||
      text.includes('climbing') || text.includes('cycling') || text.includes('swimming')) {
    return 'sports'
  }
  
  // Health & Wellness
  if (text.includes('yoga') || text.includes('pilates') || text.includes('wellness') ||
      text.includes('health') || text.includes('meditation')) {
    return 'health & wellness'
  }
  
  // Art events
  if (text.includes('art') || text.includes('gallery') || text.includes('exhibition') ||
      text.includes('photography') || text.includes('painting') || text.includes('sketching')) {
    return 'art'
  }
  
  // Food events
  if (text.includes('food') || text.includes('restaurant') || text.includes('dining') ||
      text.includes('market') && text.includes('food')) {
    return 'food'
  }
  
  // Cultural events
  if (text.includes('cultural') || text.includes('culture') || text.includes('heritage') ||
      text.includes('festival') || text.includes('traditional')) {
    return 'cultural'
  }
  
  // Theater events
  if (text.includes('theater') || text.includes('theatre') || text.includes('play') ||
      text.includes('drama') || text.includes('performance')) {
    return 'theater'
  }
  
  // Education events
  if (text.includes('education') || text.includes('workshop') || text.includes('seminar') ||
      text.includes('class') || text.includes('learning') || text.includes('gardening')) {
    return 'education'
  }
  
  // Nature & Environment
  if (text.includes('nature') || text.includes('environment') || text.includes('park') ||
      text.includes('outdoor') || text.includes('bird') || text.includes('cleanup')) {
    return 'nature & environment'
  }
  
  // Entertainment
  if (text.includes('entertainment') || text.includes('chess') || text.includes('sketching') ||
      text.includes('reading') || text.includes('picnic')) {
    return 'entertainment'
  }
  
  // Family & Kids
  if (text.includes('family') || text.includes('kids') || text.includes('children') ||
      text.includes('historical') || text.includes('tour')) {
    return 'family & kids'
  }
  
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
  const category = event.category || determineCategory(event.name, event.description)
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
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [showClusterModal, setShowClusterModal] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<EventCluster | null>(null)
  const [clusterSearchQuery, setClusterSearchQuery] = useState('')
  const [clusterPageIndex, setClusterPageIndex] = useState(0)
  
  // Map reference
  const mapRef = useRef<MapView>(null)
  
  // Simple map state - initialize with Estonia
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 58.3776252,
    longitude: 26.7290063,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  })

  // Load events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        console.log('🎯 Loading events...')
        const importedEvents = await loadEventsPartially()
        console.log(`🎯 Loaded ${importedEvents.length} events`)
        setEvents(importedEvents)
        setFilteredEvents(importedEvents)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading events:', error)
        setIsLoading(false)
      }
    }
    
    loadEvents()
  }, [])

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

  // Create clusters and markers
  const markers = useMemo(() => {
    // Limit events for performance
    const maxEvents = 1000
    const eventsToShow = filteredEvents.slice(0, maxEvents)
    
    // Create clusters
    const clusters = createClusters(eventsToShow, 0.01) // 0.01 degrees ≈ 1km
    
    // Debug clustering results
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
      console.log(`🎯 Largest cluster events:`, sortedClusters[0].events.slice(0, 5).map(e => e.name.substring(0, 30)))
      if (sortedClusters[0].events.length > 5) {
        console.log(`🎯 ... and ${sortedClusters[0].events.length - 5} more events`)
      }
    }
    
    // Verify no duplicate locations (should be 0 now)
    const locationCounts = new Map<string, number>()
    clusters.forEach(cluster => {
      const locationKey = `${cluster.latitude.toFixed(6)},${cluster.longitude.toFixed(6)}`
      locationCounts.set(locationKey, (locationCounts.get(locationKey) || 0) + 1)
    })
    
    const duplicateLocations = Array.from(locationCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicateLocations.length > 0) {
      console.log(`🎯 ❌ ERROR: Found ${duplicateLocations.length} locations with multiple clusters`)
      duplicateLocations.forEach(([location, count]) => {
        console.log(`🎯 ❌ Location ${location} has ${count} clusters`)
      })
    } else {
      console.log(`🎯 ✅ Perfect clustering: Each location has exactly one cluster`)
    }
    
    return clusters.map(cluster => (
      <ClusterMarker
        key={cluster.id}
        cluster={cluster}
        onPress={() => handleClusterPress(cluster)}
      />
    ))
  }, [filteredEvents, handleClusterPress])

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
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      })
    })()
  }, [])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading events...</Text>
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
             </ScrollView>
           )}
         </View>
       </Modal>

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
                          <Text style={styles.clusterEventCategory}>
                            {event.category || determineCategory(event.name, event.description)}
                          </Text>
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
})

export default MapViewNative
