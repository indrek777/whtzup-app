import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import { Icon } from 'leaflet'
import { useEvents, Event } from '../context/EventContext'
import { MapPin, Filter, Search, Menu, Navigation, AlertCircle, X, User } from 'lucide-react'
import EventList from './EventList'
import FilterModal from './FilterModal'

// Marker icon with count badge
const createMarkerIcon = (category: string, count: number = 1) => {
  const colors = {
    music: '#ef4444',
    food: '#f59e0b',
    sports: '#10b981',
    art: '#8b5cf6',
    business: '#3b82f6',
    other: '#6b7280'
  }
  
  const color = colors[category as keyof typeof colors] || '#6b7280'
  
  // If multiple events, show count badge
  if (count > 1) {
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
          <circle cx="24" cy="8" r="8" fill="#ef4444" stroke="white" stroke-width="2"/>
          <text x="24" y="12" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${count}</text>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
  }
  
  // Single event marker
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

// Map controller with click handling
const MapController: React.FC<{ 
  userLocation: [number, number] | null;
  onMapReady: (map: any) => void;
  preventCentering?: boolean;
  hasManuallySetLocation?: boolean;
  isInitialLoad?: boolean;
}> = ({ userLocation, onMapReady, preventCentering = false, hasManuallySetLocation = false, isInitialLoad = true }) => {
  const map = useMap()

  useEffect(() => {
    console.log('Map controller initialized')
    map.setView([59.436962, 24.753574], 10)
    
    // Notify parent component that map is ready
    onMapReady(map)
  }, [map, onMapReady])

  // Prevent initial centering if user is dragging
  useEffect(() => {
    if (preventCentering && userLocation) {
      console.log('Preventing centering due to drag operation')
      return
    }
  }, [preventCentering, userLocation])

  // Center map on user location when it changes
  useEffect(() => {
    // Only center if:
    // 1. We have a user location
    // 2. Not preventing centering (not dragging)
    // 3. User hasn't manually set location yet
    // 4. This is the initial load (not a subsequent location change)
    if (userLocation && !preventCentering && !hasManuallySetLocation && isInitialLoad) {
      console.log('Centering map on user location:', userLocation)
      map.flyTo(userLocation, 12, {
        duration: 1.5, // Animation duration in seconds
        easeLinearity: 0.25
      })
    } else if (preventCentering) {
      console.log('Centering prevented due to drag operation')
    } else if (hasManuallySetLocation) {
      console.log('Centering prevented - user has manually set location')
    } else if (!isInitialLoad) {
      console.log('Centering prevented - not initial load')
    }
  }, [map, userLocation, preventCentering, hasManuallySetLocation, isInitialLoad])

  return null
}

const MapView: React.FC = () => {
  const { events, userLocation, setUserLocation } = useEvents()
  const [showEventList, setShowEventList] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading')
  const [currentFilters, setCurrentFilters] = useState<{
    categories: string[]
    dateRange: string | null
    radius: number
    searchTerm: string
    sortBy: 'date' | 'distance' | 'name'
  }>({
    categories: [],
    dateRange: null,
    radius: 10,
    searchTerm: '',
    sortBy: 'date'
  })
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [isDraggingIcon, setIsDraggingIcon] = useState(false)
  const [dragIconPosition, setDragIconPosition] = useState<{ x: number; y: number } | null>(null)
  const [hasManuallySetLocation, setHasManuallySetLocation] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Simple location function
  const getUserLocation = () => {
    setLocationStatus('loading')
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', position.coords)
          setUserLocation([position.coords.latitude, position.coords.longitude])
          setLocationStatus('success')
        },
        (error) => {
          console.error('Error getting location:', error)
          setLocationStatus('error')
          setUserLocation([59.436962, 24.753574])
        }
      )
    } else {
      console.log('Geolocation not supported')
      setUserLocation([59.436962, 24.753574])
      setLocationStatus('error')
    }
  }

  // Get user location on component mount
  useEffect(() => {
    getUserLocation()
  }, [])



  // Update filtered events when events or filters change
  useEffect(() => {
    console.log(`Loading ${events.length} events into filtered view`)
    console.log('Sample events:', events.slice(0, 3).map(e => ({ 
      title: e.title, 
      coords: e.location.coordinates,
      coordsType: typeof e.location.coordinates,
      isArray: Array.isArray(e.location.coordinates),
      length: e.location.coordinates?.length
    })))
    
    // Apply filters and sorting
    const filtered = applyFiltersAndSorting(events, currentFilters)
    setFilteredEvents(filtered)
    
    console.log(`Applied filters: ${filtered.length} events match criteria`)
    console.log('Active filters:', {
      categories: currentFilters.categories,
      searchTerm: currentFilters.searchTerm,
      dateRange: currentFilters.dateRange,
      radius: currentFilters.radius,
      sortBy: currentFilters.sortBy
    })
    
    // Debug: Show events with same location
    const processedEvents = processEventsForDisplay(filtered)
    const multiLocationEvents = processedEvents.filter(p => p.count > 1 && p.isPrimary)
    if (multiLocationEvents.length > 0) {
      console.log(`Found ${multiLocationEvents.length} locations with multiple events:`)
      multiLocationEvents.forEach((processed, index) => {
        console.log(`Location ${index + 1}: ${processed.event.location.name} - ${processed.count} events`)
      })
    }
  }, [events, currentFilters, userLocation])

  // Function to process events and handle overlapping coordinates
  const processEventsForDisplay = (events: Event[]) => {
    const grouped = new Map<string, Event[]>()
    const processedEvents: Array<{
      event: Event
      displayPosition: [number, number]
      count: number
      isPrimary: boolean
    }> = []
    
    // Group events by coordinates
    events.forEach(event => {
      if (!event.location.coordinates || 
          !Array.isArray(event.location.coordinates) || 
          event.location.coordinates.length !== 2 ||
          typeof event.location.coordinates[0] !== 'number' ||
          typeof event.location.coordinates[1] !== 'number') {
        return
      }
      
      const coordKey = `${event.location.coordinates[0]},${event.location.coordinates[1]}`
      if (!grouped.has(coordKey)) {
        grouped.set(coordKey, [])
      }
      grouped.get(coordKey)!.push(event)
    })
    
    // Process each group
    grouped.forEach((locationEvents, coordKey) => {
      const [lat, lng] = coordKey.split(',').map(Number)
      const count = locationEvents.length
      
      if (count === 1) {
        // Single event - use original position
        processedEvents.push({
          event: locationEvents[0],
          displayPosition: [lat, lng],
          count: 1,
          isPrimary: true
        })
      } else {
        // Multiple events - create offset positions
        locationEvents.forEach((event, index) => {
          const offset = 0.0001 // Small offset in degrees
          const angle = (index / count) * 2 * Math.PI
          const offsetLat = lat + Math.cos(angle) * offset
          const offsetLng = lng + Math.sin(angle) * offset
          
          processedEvents.push({
            event,
            displayPosition: [offsetLat, offsetLng],
            count,
            isPrimary: index === 0 // First event is primary (shows count badge)
          })
        })
      }
    })
    
    return processedEvents
  }

  // Function to calculate distance between two coordinates
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

  // Function to check if event matches date range filter
  const matchesDateRange = (event: Event, dateRange: string | null): boolean => {
    if (!dateRange || dateRange === 'all') return true
    
    const eventDate = new Date(event.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (dateRange) {
      case 'today':
        return eventDate.toDateString() === today.toDateString()
      case 'tomorrow':
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return eventDate.toDateString() === tomorrow.toDateString()
      case 'week':
        const weekFromNow = new Date(today)
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        return eventDate >= today && eventDate <= weekFromNow
      case 'month':
        const monthFromNow = new Date(today)
        monthFromNow.setMonth(monthFromNow.getMonth() + 1)
        return eventDate >= today && eventDate <= monthFromNow
      case 'next3months':
        const threeMonthsFromNow = new Date(today)
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
        return eventDate >= today && eventDate <= threeMonthsFromNow
      case 'next6months':
        const sixMonthsFromNow = new Date(today)
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
        return eventDate >= today && eventDate <= sixMonthsFromNow
      default:
        return true
    }
  }

  // Function to apply filters and sorting
  const applyFiltersAndSorting = (events: Event[], filters: typeof currentFilters): Event[] => {
    let filtered = events.filter(event => {
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(event.category)) {
        return false
      }
      
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const matchesSearch = 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.location.name.toLowerCase().includes(searchLower) ||
          event.organizer.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }
      
      // Date range filter
      if (!matchesDateRange(event, filters.dateRange)) {
        return false
      }
      
      // Radius filter
      if (filters.radius !== 999 && userLocation) {
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          event.location.coordinates[0],
          event.location.coordinates[1]
        )
        if (distance > filters.radius) {
          return false
        }
      }
      
      return true
    })
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'distance':
          if (!userLocation) return 0
          const distanceA = calculateDistance(
            userLocation[0],
            userLocation[1],
            a.location.coordinates[0],
            a.location.coordinates[1]
          )
          const distanceB = calculateDistance(
            userLocation[0],
            userLocation[1],
            b.location.coordinates[0],
            b.location.coordinates[1]
          )
          return distanceA - distanceB
        case 'name':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })
    
    return filtered
  }

  const handleMarkerClick = (event: Event) => {
    console.log('Marker clicked:', event.title)
  }







  const handleIconDragStart = (e: React.DragEvent) => {
    console.log('Icon drag started')
    setIsDraggingIcon(true)
    setDragIconPosition({ x: e.clientX, y: e.clientY })
    
    // Set drag image
    const dragImage = new Image()
    dragImage.src = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="white"/>
        <path d="M8 28c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="white"/>
      </svg>
    `)
    e.dataTransfer.setDragImage(dragImage, 16, 16)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleIconDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return // Ignore invalid positions
    setDragIconPosition({ x: e.clientX, y: e.clientY })
  }

  const handleIconDragEnd = (e: React.DragEvent) => {
    console.log('Icon drag ended')
    setIsDraggingIcon(false)
    
    // Get the current mouse position
    const currentPosition = { x: e.clientX, y: e.clientY }
    setDragIconPosition(null)
    
    // Check if dropped on map
    const mapElement = document.querySelector('.leaflet-container')
    if (mapElement) {
      const mapRect = mapElement.getBoundingClientRect()
      
      // Check if the drop position is within the map bounds
      if (currentPosition.x >= mapRect.left && 
          currentPosition.x <= mapRect.right && 
          currentPosition.y >= mapRect.top && 
          currentPosition.y <= mapRect.bottom) {
        
        // Convert screen coordinates to map coordinates
        if (mapInstance) {
          const relativeX = currentPosition.x - mapRect.left
          const relativeY = currentPosition.y - mapRect.top
          
          try {
            const point = mapInstance.containerPointToLatLng([relativeX, relativeY])
            const newLocation: [number, number] = [point.lat, point.lng]
            
                         console.log('Location set by icon drop:', newLocation)
             setUserLocation(newLocation)
             setLocationStatus('success')
             setHasManuallySetLocation(true)
             setIsInitialLoad(false)
            
            // Show success notification
            const notification = document.createElement('div')
            notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg'
            notification.textContent = `Location updated to ${newLocation[0].toFixed(4)}, ${newLocation[1].toFixed(4)}`
            document.body.appendChild(notification)
            
            setTimeout(() => {
              notification.remove()
            }, 3000)
          } catch (error) {
            console.error('Error converting coordinates:', error)
          }
        }
      } else {
        console.log('Dropped outside map area')
      }
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      music: '🎵',
      food: '🍕',
      sports: '⚽',
      art: '🎨',
      business: '💼',
      other: '📅'
    }
    return icons[category as keyof typeof icons] || '📅'
  }

  console.log('MapView rendering with', filteredEvents.length, 'events')

  return (
    <div className="relative h-screen w-screen">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">
                 <MapContainer
           center={[59.436962, 24.753574]}
           zoom={10}
           className="h-full w-full"
           zoomControl={false}
         >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
                     <MapController 
             userLocation={userLocation} 
             onMapReady={setMapInstance}
             preventCentering={isDraggingIcon}
             hasManuallySetLocation={hasManuallySetLocation}
             isInitialLoad={isInitialLoad}
           />
          
                                 {/* User Location Marker */}
            {userLocation && locationStatus === 'success' && (
              <Marker
                position={userLocation}
                icon={new Icon({
                  iconUrl: `data:image/svg+xml;base64,${btoa(`
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="white" stroke-width="2"/>
                      <circle cx="16" cy="12" r="4" fill="white"/>
                      <path d="M8 28c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="white"/>
                    </svg>
                  `)}`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                  popupAnchor: [0, -16]
                })}
                draggable={true}
                                 eventHandlers={{
                   dragend: (e) => {
                     const marker = e.target
                     const newPosition = marker.getLatLng()
                     const newLocation: [number, number] = [newPosition.lat, newPosition.lng]
                     
                     console.log('User location moved to:', newLocation)
                     setUserLocation(newLocation)
                     setLocationStatus('success')
                     setHasManuallySetLocation(true)
                     setIsInitialLoad(false)
                   }
                 }}
                             />
            )}

                                   

                         {/* Drop Zone Indicator */}
             {isDraggingIcon && (
               <div className="absolute inset-0 z-30 pointer-events-none">
                 <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500/50" />
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border-2 border-blue-500">
                   <div className="text-center">
                     <User size={32} className="text-blue-500 mx-auto mb-2" />
                     <p className="font-semibold text-gray-800">Drop here to set location</p>
                     <p className="text-sm text-gray-600">Release to place your location</p>
                   </div>
                 </div>
               </div>
             )}

          {/* Processed Event Markers */}
          {processEventsForDisplay(filteredEvents).map((processed) => {
            return (
              <Marker
                key={processed.event.id}
                position={processed.displayPosition}
                icon={createMarkerIcon(processed.event.category, processed.isPrimary ? processed.count : 1)}
                eventHandlers={{
                  click: () => handleMarkerClick(processed.event)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(processed.event.category)}</span>
                      <h3 className="font-semibold text-sm">{processed.event.title}</h3>
                      {processed.count > 1 && (
                        <span className="text-xs bg-red-500 text-white px-1 py-0.5 rounded-full">
                          {processed.count} events
                        </span>
                      )}
                    </div>
                                         <p className="text-xs text-gray-600 mb-1">{processed.event.location.name}</p>
                     <p className="text-xs text-gray-500">{processed.event.date} at {processed.event.time}</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Simple Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                             <button
                 onClick={() => setShowFilters(true)}
                 className={`floating-button ${currentFilters.categories.length > 0 || currentFilters.searchTerm || currentFilters.dateRange || currentFilters.radius !== 10 ? 'bg-primary-500 text-white' : ''}`}
               >
                 <Filter size={20} />
                 {/* Active Filter Indicator */}
                 {(currentFilters.categories.length > 0 || currentFilters.searchTerm || currentFilters.dateRange || currentFilters.radius !== 10) && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                 )}
               </button>
               <h1 className="text-lg font-semibold text-gray-800">WhtzUp</h1>
               
               {/* Filter Status Bar - iPhone Style */}
               {(currentFilters.categories.length > 0 || currentFilters.searchTerm || currentFilters.dateRange || currentFilters.radius !== 10) && (
                 <div className="flex-1 mx-2">
                   <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Filter size={14} className="text-blue-600" />
                         <span className="text-xs font-medium text-blue-800">Filters Active</span>
                         <span className="text-xs text-blue-600">({filteredEvents.length} of {events.length})</span>
                       </div>
                       <button
                         onClick={() => {
                           setCurrentFilters({
                             categories: [],
                             dateRange: null,
                             radius: 10,
                             searchTerm: '',
                             sortBy: 'date'
                           })
                         }}
                         className="text-blue-600 hover:text-blue-800"
                         title="Clear all filters"
                       >
                         <X size={14} />
                       </button>
                     </div>
                     {/* Active Filter Details */}
                     <div className="flex flex-wrap gap-1 mt-1">
                       {currentFilters.categories.length > 0 && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           {currentFilters.categories.length} categories
                         </span>
                       )}
                       {currentFilters.searchTerm && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           "{currentFilters.searchTerm}"
                         </span>
                       )}
                       {currentFilters.dateRange && currentFilters.dateRange !== 'all' && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           {currentFilters.dateRange}
                         </span>
                       )}
                       {currentFilters.radius !== 10 && currentFilters.radius !== 999 && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           {currentFilters.radius}km radius
                         </span>
                       )}
                       {currentFilters.radius === 999 && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           No distance limit
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
               )}
               
               {/* Default Status - Only show when no filters */}
               {!(currentFilters.categories.length > 0 || currentFilters.searchTerm || currentFilters.dateRange || currentFilters.radius !== 10) && (
                 <div className="flex items-center gap-2 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                   <span>{filteredEvents.length} events</span>
                   {(() => {
                     const processedEvents = processEventsForDisplay(filteredEvents)
                     const multiLocationEvents = processedEvents.filter(p => p.count > 1 && p.isPrimary)
                     if (multiLocationEvents.length > 0) {
                       return (
                         <span className="text-orange-600">
                           • {multiLocationEvents.length} locations with multiple events
                         </span>
                       )
                     }
                     return null
                   })()}
                 </div>
               )}
              
                             {/* Location Status */}
               <div className="flex items-center gap-2">
                                   {isDraggingIcon && (
                    <div className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                      <User size={12} />
                      <span>Drop on map to set location</span>
                    </div>
                  )}
                                     
                                   {locationStatus === 'loading' && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Locating...</span>
                    </div>
                  )}
                  {locationStatus === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Navigation size={12} />
                      <span>Location found</span>
                    </div>
                  )}
                  {locationStatus === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertCircle size={12} />
                      <span>Using default location</span>
                    </div>
                  )}
               </div>
            </div>
            
                         <div className="flex items-center gap-2">
               <button 
                 onClick={getUserLocation}
                 className="floating-button"
                 title="Refresh location"
               >
                 <Navigation size={20} />
               </button>
               <button 
                 onClick={() => {
                   if (userLocation && mapInstance) {
                     console.log('Centering map on current location')
                     mapInstance.flyTo(userLocation, 12, {
                       duration: 1.5,
                       easeLinearity: 0.25
                     })
                   }
                 }}
                 className="floating-button"
                 title="Center on my location"
                 disabled={!userLocation || !mapInstance}
               >
                 <MapPin size={20} />
               </button>
                                                                                 <button 
                    draggable
                    onDragStart={handleIconDragStart}
                    onDrag={handleIconDrag}
                    onDragEnd={handleIconDragEnd}
                                         onClick={(e) => {
                       // Prevent click when dragging
                       if (isDraggingIcon) {
                         e.preventDefault()
                         return
                       }
                     }}
                     className={`floating-button ${isDraggingIcon ? 'opacity-50' : ''}`}
                    title="Drag to map to set location"
                  >
                    <User size={20} />
                  </button>
               <button className="floating-button">
                 <Menu size={20} />
               </button>
             </div>
          </div>
        </div>
      </div>

             {/* Filter Modal */}
       {showFilters && (
         <FilterModal
           onClose={() => setShowFilters(false)}
           totalEvents={events.length}
           currentFilters={currentFilters}
           onApplyFilters={(filters) => {
             console.log('Filters applied:', filters)
             setCurrentFilters(filters)
             setShowFilters(false)
           }}
         />
       )}

             {/* Floating Action Button */}
       <button
         onClick={() => setShowEventList(true)}
         className="absolute bottom-6 right-6 z-10 floating-button"
       >
         <MapPin size={24} />
       </button>

                               

             {/* Dragging Icon Indicator */}
       {isDraggingIcon && dragIconPosition && (
         <div 
           className="fixed pointer-events-none z-50"
           style={{
             left: dragIconPosition.x - 16,
             top: dragIconPosition.y - 16
           }}
         >
           <div className="w-8 h-8 bg-primary-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
             <User size={16} className="text-white" />
           </div>
         </div>
       )}

       {/* Map Legend */}
       <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-lg max-w-xs">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Map Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>Music Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span>Food & Drink</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Sports</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>Art & Culture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Business</span>
          </div>
                     <div className="border-t border-gray-200 pt-2 mt-2">
             <div className="flex items-center gap-2 text-gray-600">
               <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-red-700 relative">
                 <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">3</div>
               </div>
               <span>Markers with red badges show multiple events</span>
             </div>
             <p className="text-xs text-gray-500 mt-1">All events are visible - overlapping events are slightly offset</p>
           </div>
        </div>
      </div>

      {/* Event List */}
      {showEventList && (
        <EventList
          events={filteredEvents}
          onClose={() => setShowEventList(false)}
          selectedEvent={null}
        />
      )}
    </div>
  )
}

export default MapView
