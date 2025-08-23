import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import * as Location from 'expo-location'
import { loadAllEvents } from '../utils/eventDataImporter'
import { saveEventsToFile, loadEventsFromStorage } from '../utils/eventStorage'
import { autoFixVenueCoordinates, addVenue } from '../utils/venueStorage'
import { syncService } from '../utils/syncService'
import { Event } from '../data/events'

// Helper function to determine category - comprehensive version
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

// Helper function to parse date from startsAt
const parseDate = (startsAt: string): string => {
  try {
    if (startsAt.includes(' ')) {
      const parts = startsAt.split(' ')
      const datePart = parts.find(part => /^\d{4}-\d{2}-\d{2}$/.test(part))
      if (datePart) return datePart
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(startsAt)) {
      return startsAt
    }
    
    const dateMatch = startsAt.match(/(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) return dateMatch[1]
    
    return new Date().toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

// Helper function to parse time from startsAt
const parseTime = (startsAt: string): string => {
  try {
    if (startsAt.includes(' ')) {
      const parts = startsAt.split(' ')
      const timePart = parts.find(part => /^\d{2}:\d{2}$/.test(part))
      if (timePart) return timePart
    }
    
    return '12:00'
  } catch {
    return '12:00'
  }
}

// Use the Event interface from data/events.ts instead of defining our own

interface EventContextType {
  events: Event[]
  selectedEvent: Event | null
  userLocation: [number, number] | null
  isLoading: boolean
  isBackgroundLoading: boolean
  locationPermissionGranted: boolean | undefined
  currentRadius: number
  dateFilter: { from: string; to: string }
  syncStatus: {
    isOnline: boolean
    lastSyncAt: string | null
    pendingOperations: number
    errors: string[]
  }
  setSelectedEvent: (event: Event | null) => void
  setUserLocation: (location: [number, number]) => void
  setEvents: (events: Event[]) => void
  setCurrentRadius: (radius: number) => void
  setDateFilter: (filter: { from: string; to: string }) => void
  addEvent: (event: Event) => void
  updateEvent: (eventId: string, updatedEvent: Event) => void
  deleteEvent: (eventId: string) => void
  getEventsNearby: (radius: number) => Event[]
  rateEvent: (eventId: string, rating: number) => void
  forceUpdateCheck: () => Promise<void>
  clearSyncErrors: () => void
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export const useEvents = () => {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider')
  }
  return context
}

interface EventProviderProps {
  children: ReactNode
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false)
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | undefined>(undefined)
  const [currentRadius, setCurrentRadius] = useState(150) // Default radius
  
  // Default date filter: 1 week ahead from now
  const getDefaultDateFilter = () => {
    const now = new Date()
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return {
      from: now.toISOString().split('T')[0], // Today
      to: oneWeekFromNow.toISOString().split('T')[0] // 1 week from now
    }
  }
  
  const [dateFilter, setDateFilter] = useState(getDefaultDateFilter())
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    lastSyncAt: null as string | null,
    pendingOperations: 0,
    errors: [] as string[]
  })

  // Get user location for radius filtering
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        console.log('📍 Requesting location permission...')
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          console.log('❌ Location permission denied, loading all events without filtering')
          setLocationPermissionGranted(false)
          return
        }
        
        console.log('✅ Location permission granted, getting user location...')
        setLocationPermissionGranted(true)
        const location = await Location.getCurrentPositionAsync({})
        const userCoords: [number, number] = [location.coords.latitude, location.coords.longitude]
        setUserLocation(userCoords)
        console.log('📍 User location obtained:', userCoords)
      } catch (error) {
        console.error('❌ Error getting user location:', error)
        setLocationPermissionGranted(false)
      }
    }
    
    getUserLocation()
  }, [])

  // Load events with smart location-based progressive loading
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true)
        console.log('🚀 Starting smart location-based event loading...')
        
        // Get sync status
        const status = await syncService.getSyncStatusAsync()
        setSyncStatus(status)
        
        // Use smart progressive loading for better performance
        try {
          let result: { initial: Event[], total: number }
          
          // Check if we have location permission and user location
          if (locationPermissionGranted === true && userLocation) {
            // Use user's preferred radius or calculate smart radius
            const radiusToUse = currentRadius !== 150 ? currentRadius : calculateSmartRadius(userLocation)
            console.log(`🎯 Loading events: Using ${radiusToUse}km radius for user at ${userLocation[0]}, ${userLocation[1]}`)
            
            result = await syncService.fetchEventsProgressive(
              { latitude: userLocation[0], longitude: userLocation[1] }, 
              radiusToUse,
              dateFilter
            )
          } else if (locationPermissionGranted === false) {
            // Location permission was explicitly denied, load events around Estonia center
            console.log('📍 Location permission denied, loading events around Estonia center')
            const estoniaCenter = { latitude: 58.3776252, longitude: 26.7290063 }
            result = await syncService.fetchEventsProgressive(estoniaCenter, 100, dateFilter)
          } else {
            // Location permission check is still pending, wait for it to complete
            console.log('⏳ Location permission check pending, skipping event load')
            setIsLoading(false)
            return
          }
          
          console.log(`✅ Smart loading: ${result.initial.length} initial events, ${result.total} total available`)
          
          if (result.initial.length > 0) {
            // For initial load, skip venue processing if there are too many events to prevent crashes
            let processedEvents: Event[]
            if (result.initial.length > 500) {
              console.log(`📦 Large dataset (${result.initial.length} events), skipping venue processing for initial load`)
              processedEvents = result.initial.map(normalizeEventData)
            } else {
              // Process events with venue storage to auto-fix coordinates
              processedEvents = await processEventsWithVenueStorage(result.initial)
            }
            setEvents(processedEvents)
            setIsLoading(false)
            
            // Smart background loading based on event density
            if (result.total > result.initial.length) {
              const loadMoreRadius = calculateLoadMoreRadius(result.initial.length, result.total)
              console.log(`🔄 Smart background loading: ${result.total - result.initial.length} more events with ${loadMoreRadius}km radius`)
              setIsBackgroundLoading(true)
              
              setTimeout(async () => {
                try {
                  const additionalEvents = await syncService.fetchEvents(
                    locationPermissionGranted === true && userLocation 
                      ? { latitude: userLocation[0], longitude: userLocation[1] }
                      : { latitude: 58.3776252, longitude: 26.7290063 },
                    loadMoreRadius,
                    undefined,
                    dateFilter
                  )
                  const processedAdditional = await processEventsWithVenueStorage(additionalEvents)
                  setEvents(processedAdditional)
                  console.log(`✅ Smart background loading complete: ${processedAdditional.length} total events`)
                } catch (error) {
                  console.log('⚠️ Smart background loading failed:', error)
                } finally {
                  setIsBackgroundLoading(false)
                }
              }, 1500) // Reduced wait time for better UX
            }
            return
          }
        } catch (syncError) {
          console.log('⚠️ Smart loading failed, falling back to cached events:', syncError)
        }
        
        // Fallback to cached events from sync service
        try {
          const cachedEvents = await syncService.getCachedEventsImmediate()
          console.log(`📦 Loaded ${cachedEvents.length} cached events`)
          
          if (cachedEvents.length > 0) {
            // For large cached datasets, skip venue processing to prevent crashes
            let processedEvents: Event[]
            if (cachedEvents.length > 500) {
              console.log(`📦 Large cached dataset (${cachedEvents.length} events), skipping venue processing`)
              processedEvents = cachedEvents.map(normalizeEventData)
            } else {
              processedEvents = await processEventsWithVenueStorage(cachedEvents)
            }
            setEvents(processedEvents)
            setIsLoading(false)
            return
          }
        } catch (cacheError) {
          console.log('⚠️ Cache failed, falling back to local storage:', cacheError)
        }
        
        // Fallback to localStorage
        const storedEvents = await loadEventsFromStorage()
        if (storedEvents.length > 0) {
          console.log(`💾 Loaded ${storedEvents.length} events from local storage`)
          // For large stored datasets, skip venue processing to prevent crashes
          let processedEvents: Event[]
          if (storedEvents.length > 500) {
            console.log(`💾 Large stored dataset (${storedEvents.length} events), skipping venue processing`)
            processedEvents = storedEvents.map(normalizeEventData)
          } else {
            processedEvents = await processEventsWithVenueStorage(storedEvents)
          }
          setEvents(processedEvents)
        } else {
          // Final fallback to JSON file if no stored events
          const importedEvents = await loadAllEvents()
          console.log(`📄 Loaded ${importedEvents.length} events from JSON file`)
          // For large imported datasets, skip venue processing to prevent crashes
          let processedEvents: Event[]
          if (importedEvents.length > 500) {
            console.log(`📄 Large imported dataset (${importedEvents.length} events), skipping venue processing`)
            processedEvents = importedEvents.map(normalizeEventData)
          } else {
            processedEvents = await processEventsWithVenueStorage(importedEvents)
          }
          setEvents(processedEvents)
        }
      } catch (error) {
        console.error('❌ Error loading events:', error)
        // Fallback to mock data if everything fails
        const mockEvents: Event[] = [
          {
            id: '1',
            name: 'Jazz Night at Blue Note',
            description: 'Live jazz performance featuring local artists. Enjoy smooth melodies and great cocktails.',
            category: 'music',
            venue: 'Blue Note Jazz Club',
            address: '123 Music Street, Downtown',
            latitude: 59.436962,
            longitude: 24.753574,
            startsAt: '2024-02-15T20:00:00.000Z',
            createdBy: 'Blue Note Club',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'app',
            url: 'https://example.com/jazz-night'
          },
          {
            id: '2',
            name: 'Food Truck Festival',
            description: 'A celebration of local cuisine with over 20 food trucks serving delicious street food.',
            category: 'food',
            venue: 'Central Park',
            address: 'Central Park, Manhattan',
            latitude: 59.436962,
            longitude: 24.753574,
            startsAt: '2024-02-16T12:00:00.000Z',
            createdBy: 'NYC Food Trucks',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'app',
            url: 'https://example.com/food-truck-festival'
          }
        ]
        setEvents(mockEvents)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Only load events after location permission check is complete
    if (locationPermissionGranted !== undefined) {
      loadEvents()
    }
  }, [locationPermissionGranted, userLocation, currentRadius, dateFilter])

  // Smart radius calculation based on user location and preferences
  const calculateSmartRadius = (userLocation: [number, number]): number => {
    // Use user's preferred radius if set, otherwise calculate smart radius
    if (currentRadius !== 150) {
      console.log(`🎯 Using user's preferred radius: ${currentRadius}km`)
      return currentRadius
    }
    
    // Adjust radius based on location (urban vs rural areas)
    const [lat, lng] = userLocation
    
    // Major cities in Estonia - smaller radius for dense areas
    const majorCities = [
      { lat: 59.436962, lng: 24.753574, name: 'Tallinn', radius: 80 },
      { lat: 58.3776252, lng: 26.7290063, name: 'Tartu', radius: 60 },
      { lat: 58.385807, lng: 24.496577, name: 'Pärnu', radius: 70 },
      { lat: 59.377222, lng: 28.190278, name: 'Narva', radius: 80 },
      { lat: 58.924444, lng: 25.318889, name: 'Võru', radius: 90 },
      { lat: 58.363889, lng: 26.722778, name: 'Viljandi', radius: 85 }
    ]
    
    // Check if user is near a major city
    for (const city of majorCities) {
      const distance = calculateDistance(lat, lng, city.lat, city.lng)
      if (distance < 50) { // Within 50km of a major city
        console.log(`🏙️ User near ${city.name}, using ${city.radius}km radius`)
        // Only set currentRadius if it's still the default (150)
        if (currentRadius === 150) {
          setCurrentRadius(city.radius)
        }
        return city.radius
      }
    }
    
    // Rural areas - larger radius to find more events
    const ruralRadius = 150
    console.log(`🌲 User in rural area, using ${ruralRadius}km radius`)
    // Only set currentRadius if it's still the default (150)
    if (currentRadius === 150) {
      setCurrentRadius(ruralRadius)
    }
    return ruralRadius
  }

  // Calculate radius for loading more events based on current event density
  const calculateLoadMoreRadius = (currentEvents: number, totalAvailable: number): number => {
    // If we have few events, expand radius to find more
    if (currentEvents < 50) {
      return 300 // Larger radius to find more events
    } else if (currentEvents < 100) {
      return 250 // Medium expansion
    } else {
      return 200 // Standard radius
    }
  }

  // Setup sync service listeners
  useEffect(() => {
    // Listen for real-time updates
    const handleEventCreated = (newEvent: Event) => {
      console.log('🆕 Received event created via sync:', newEvent.name)
      const normalizedEvent = normalizeEventData(newEvent)
      setEvents(prev => {
        const updatedEvents = [...prev, normalizedEvent]
        // Save to local storage as backup
        saveEventsToFile(updatedEvents).catch(error => {
          console.error('Error saving events:', error)
        })
        return updatedEvents
      })
    }

    const handleEventUpdated = (updatedEvent: Event) => {
      console.log('🔄 Received event updated via sync:', updatedEvent.name)
      const normalizedEvent = normalizeEventData(updatedEvent)
      setEvents(prev => {
        const updatedEvents = prev.map(event => 
          event.id === updatedEvent.id ? normalizedEvent : event
        )
        // Save to local storage as backup
        saveEventsToFile(updatedEvents).catch(error => {
          console.error('Error saving events:', error)
        })
        return updatedEvents
      })
    }

    const handleEventDeleted = (data: { eventId: string }) => {
      console.log('🗑️ Received event deleted via sync:', data.eventId)
      setEvents(prev => {
        const updatedEvents = prev.filter(event => event.id !== data.eventId)
        // Save to local storage as backup
        saveEventsToFile(updatedEvents).catch(error => {
          console.error('Error saving events:', error)
        })
        return updatedEvents
      })
    }

    const handleSyncStatus = (status: any) => {
      setSyncStatus(prev => ({ ...prev, ...status }))
    }

    const handleUpdateCheckCompleted = (data: any) => {
      console.log('📊 Update check completed:', data)
      setSyncStatus(prev => ({ 
        ...prev, 
        lastSyncAt: data.timestamp,
        errors: data.updates > 0 || data.deletions > 0 ? 
          [...prev.errors, `Updated ${data.updates} events, deleted ${data.deletions} events`] : prev.errors
      }))
    }

    const handleUpdateCheckError = (error: any) => {
      console.error('❌ Update check error:', error)
      setSyncStatus(prev => ({ 
        ...prev, 
        errors: [...prev.errors, `Update check failed: ${error.message || 'Unknown error'}`]
      }))
    }

    const handleSyncErrorsCleared = (data: any) => {
      console.log('✅ Sync errors cleared:', data)
      setSyncStatus(prev => ({ ...prev, errors: [] }))
    }

    // Add listeners
    syncService.addListener('eventCreated', handleEventCreated)
    syncService.addListener('eventUpdated', handleEventUpdated)
    syncService.addListener('eventDeleted', handleEventDeleted)
    syncService.addListener('networkStatus', handleSyncStatus)
    syncService.addListener('updateCheckCompleted', handleUpdateCheckCompleted)
    syncService.addListener('updateCheckError', handleUpdateCheckError)
    syncService.addListener('syncErrorsCleared', handleSyncErrorsCleared)
    syncService.addListener('pendingOperations', (operations: any[]) => {
      setSyncStatus(prev => ({ ...prev, pendingOperations: operations.length }))
    })

    // Cleanup listeners on unmount
    return () => {
      syncService.removeListener('eventCreated', handleEventCreated)
      syncService.removeListener('eventUpdated', handleEventUpdated)
      syncService.removeListener('eventDeleted', handleEventDeleted)
      syncService.removeListener('networkStatus', handleSyncStatus)
      syncService.removeListener('updateCheckCompleted', handleUpdateCheckCompleted)
      syncService.removeListener('updateCheckError', handleUpdateCheckError)
      syncService.removeListener('syncErrorsCleared', handleSyncErrorsCleared)
      syncService.removeListener('pendingOperations', () => {})
    }
  }, [])

  const addEvent = async (event: Event) => {
    try {
      console.log('➕ Adding event via sync service:', event.name)
      
      // Process the new event with venue storage
      const processedEvents = await processEventsWithVenueStorage([event])
      const processedEvent = processedEvents[0]
      
      // Use sync service to create event
      const createdEvent = await syncService.createEvent(processedEvent)
      
      // Normalize the created event
      const normalizedEvent = normalizeEventData(createdEvent)
      
      // Update local state
      setEvents(prev => {
        const updatedEvents = [...prev, normalizedEvent]
        // Save to local storage as backup
        saveEventsToFile(updatedEvents).catch(error => {
          console.error('Error saving events:', error)
        })
        return updatedEvents
      })
      
      console.log('✅ Event created successfully:', normalizedEvent.name)
    } catch (error) {
      console.error('❌ Error creating event:', error)
      throw error
    }
  }

  const updateEvent = async (eventId: string, updatedEvent: Event) => {
    try {
      console.log('🔄 Updating event via sync service:', updatedEvent.name)
      
      // Process the updated event with venue storage
      const processedEvents = await processEventsWithVenueStorage([updatedEvent])
      const processedEvent = processedEvents[0]
      
      // Use sync service to update event
      const result = await syncService.updateEvent(processedEvent)
      
      // Normalize the result
      const normalizedResult = normalizeEventData(result)
      
      // Update local state
      setEvents(prev => {
        const updatedEvents = prev.map(event => 
          event.id === eventId ? normalizedResult : event
        )
        // Save to local storage as backup
        saveEventsToFile(updatedEvents).catch(error => {
          console.error('Error saving events:', error)
        })
        return updatedEvents
      })
      
      console.log('✅ Event updated successfully:', normalizedResult.name)
    } catch (error) {
      console.error('❌ Error updating event:', error)
      throw error
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      console.log('🗑️ Deleting event via sync service:', eventId)
      
      // Use sync service to delete event
      await syncService.deleteEvent(eventId)
      
      // Update local state
      setEvents(prev => {
        const updatedEvents = prev.filter(event => event.id !== eventId)
        // Save to local storage as backup
        saveEventsToFile(updatedEvents).catch(error => {
          console.error('Error saving events:', error)
        })
        return updatedEvents
      })
      
      console.log('✅ Event deleted successfully:', eventId)
    } catch (error) {
      console.error('❌ Error deleting event:', error)
      throw error
    }
  }

  // Rating functionality removed as it's not part of the Event interface from data/events.ts
  const rateEvent = (eventId: string, rating: number) => {
    // Rating functionality not implemented for this Event structure
    console.log('Rating functionality not available for this Event structure')
  }

  const getEventsNearby = (radius: number): Event[] => {
    if (!userLocation) return events
    
    return events.filter(event => {
      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        event.latitude,
        event.longitude
      )
      return distance <= radius
    })
  }

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

  // Normalize event data to ensure proper types
  const normalizeEventData = (event: any): Event => {
    return {
      ...event,
      // Ensure coordinates are numbers
      latitude: typeof event.latitude === 'string' ? parseFloat(event.latitude) : event.latitude,
      longitude: typeof event.longitude === 'string' ? parseFloat(event.longitude) : event.longitude,
      // Ensure other numeric fields are numbers
      startsAt: event.startsAt || event.starts_at,
      createdAt: event.createdAt || event.created_at,
      updatedAt: event.updatedAt || event.updated_at,
      createdBy: event.createdBy || event.created_by,
    }
  }

  // Process events to auto-fix venue coordinates (optimized for performance)
  const processEventsWithVenueStorage = async (eventsToProcess: Event[]): Promise<Event[]> => {
    console.log(`🔄 Processing ${eventsToProcess.length} events with venue storage...`)
    
    // Limit processing to prevent crashes on large datasets
    const maxEventsToProcess = 1000
    const eventsToProcessLimited = eventsToProcess.slice(0, maxEventsToProcess)
    
    if (eventsToProcess.length > maxEventsToProcess) {
      console.log(`⚠️ Limiting processing to ${maxEventsToProcess} events to prevent crashes`)
    }
    
    const processedEvents: Event[] = []
    
    // Process events in batches to prevent memory issues
    const batchSize = 50
    for (let i = 0; i < eventsToProcessLimited.length; i += batchSize) {
      const batch = eventsToProcessLimited.slice(i, i + batchSize)
      
      // Process batch in parallel for better performance
      const batchPromises = batch.map(async (event) => {
        try {
          // First normalize the event data
          const normalizedEvent = normalizeEventData(event)
          
          // Only auto-fix coordinates if they're default/unknown (0,0 or null)
          const needsFixing = normalizedEvent.latitude === 0 || normalizedEvent.longitude === 0 || 
                             normalizedEvent.latitude === null || normalizedEvent.longitude === null
          
          if (needsFixing) {
            const fixedCoordinates = await autoFixVenueCoordinates(
              normalizedEvent.venue,
              [normalizedEvent.latitude, normalizedEvent.longitude]
            )
            
            // If coordinates were fixed, update the event
            if (fixedCoordinates[0] !== normalizedEvent.latitude || fixedCoordinates[1] !== normalizedEvent.longitude) {
              const updatedEvent = {
                ...normalizedEvent,
                latitude: fixedCoordinates[0],
                longitude: fixedCoordinates[1]
              }
              
              // Also save the venue to storage for future use
              addVenue(
                normalizedEvent.venue,
                normalizedEvent.address,
                fixedCoordinates
              )
              
              return updatedEvent
            }
          }
          
          // Always save venue to storage for tracking
          addVenue(
            normalizedEvent.venue,
            normalizedEvent.address,
            [normalizedEvent.latitude, normalizedEvent.longitude]
          )
          
          return normalizedEvent
        } catch (error) {
          console.error('❌ Error processing event:', error)
          // Return the original event if processing fails
          return normalizeEventData(event)
        }
      })
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      processedEvents.push(...batchResults)
      
      // Small delay between batches to prevent UI freezing
      if (i + batchSize < eventsToProcessLimited.length) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    console.log(`✅ Processed ${processedEvents.length} events successfully`)
    return processedEvents
  }

  const forceUpdateCheck = async () => {
    try {
      console.log('🔄 Manual update check requested from EventContext')
      await syncService.forceUpdateCheck()
    } catch (error) {
      console.error('❌ Error in manual update check:', error)
    }
  }

  const clearSyncErrors = () => {
    try {
      console.log('🔄 Clearing sync errors requested from EventContext')
      syncService.clearSyncErrors()
      // Clear errors from local state
      setSyncStatus(prev => ({ ...prev, errors: [] }))
    } catch (error) {
      console.error('❌ Error clearing sync errors:', error)
    }
  }

  const value: EventContextType = {
    events,
    selectedEvent,
    userLocation,
    isLoading,
    isBackgroundLoading,
    locationPermissionGranted,
    currentRadius,
    dateFilter,
    syncStatus,
    setSelectedEvent,
    setUserLocation,
    setEvents,
    setCurrentRadius,
    setDateFilter,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsNearby,
    rateEvent,
    forceUpdateCheck,
    clearSyncErrors
  }

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  )
}
