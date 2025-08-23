import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loadAllEvents } from '../utils/eventDataImporter'
import { saveEventsToFile, loadEventsFromStorage } from '../utils/eventStorage'
import { autoFixVenueCoordinates, addVenue } from '../utils/venueStorage'
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
  setSelectedEvent: (event: Event | null) => void
  setUserLocation: (location: [number, number]) => void
  setEvents: (events: Event[]) => void
  addEvent: (event: Event) => void
  updateEvent: (eventId: string, updatedEvent: Event) => void
  deleteEvent: (eventId: string) => void
  getEventsNearby: (radius: number) => Event[]
  rateEvent: (eventId: string, rating: number) => void
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

  // Load events from imported data and storage
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // First try to load from server API
        const response = await fetch('http://localhost:4000/api/events')
        if (response.ok) {
          const serverEvents = await response.json()
          if (Array.isArray(serverEvents) && serverEvents.length > 0) {
            // Convert server format to Event format
            const events: Event[] = serverEvents.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              category: item.category || determineCategory(item.name, item.description),
              venue: item.venue || item.address || 'Various locations',
              address: item.address || item.venue || 'Location TBD',
              latitude: Number(item.latitude) || 0,
              longitude: Number(item.longitude) || 0,
              startsAt: item.startsAt || new Date().toISOString(),
              createdBy: item.createdBy || (item.source === 'csv' ? 'Local Organizer' : 'Event Organizer'),
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
              source: item.source || 'app',
              url: item.url || 'https://example.com/event'
            }))
            
            // Process events with venue storage to auto-fix coordinates
            const processedEvents = await processEventsWithVenueStorage(events)
            setEvents(processedEvents)
            return
          }
        }
        
        // Fallback to localStorage
        const storedEvents = await loadEventsFromStorage()
        if (storedEvents.length > 0) {
          const processedEvents = await processEventsWithVenueStorage(storedEvents)
          setEvents(processedEvents)
        } else {
          // Fallback to JSON file if no stored events
          const importedEvents = await loadAllEvents()
          const processedEvents = await processEventsWithVenueStorage(importedEvents)
          setEvents(processedEvents)
        }
      } catch (error) {
        console.error('Error loading events:', error)
        // Fallback to mock data if import fails
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
      }
    }
    
    loadEvents()
  }, [])

  const addEvent = async (event: Event) => {
    // Process the new event with venue storage
    const processedEvents = await processEventsWithVenueStorage([event])
    const processedEvent = processedEvents[0]
    
    setEvents(prev => {
      const updatedEvents = [...prev, processedEvent]
      
      // Save to storage
      saveEventsToFile(updatedEvents).catch(error => {
        console.error('Error saving events:', error)
      })
      return updatedEvents
    })
  }

  const updateEvent = async (eventId: string, updatedEvent: Event) => {
    // Process the updated event with venue storage
    const processedEvents = await processEventsWithVenueStorage([updatedEvent])
    const processedEvent = processedEvents[0]
    
    setEvents(prev => {
      const updatedEvents = prev.map(event => 
        event.id === eventId ? processedEvent : event
      )
      // Save to storage
      saveEventsToFile(updatedEvents).catch(error => {
        console.error('Error saving events:', error)
      })
      return updatedEvents
    })
  }

  const deleteEvent = (eventId: string) => {
    setEvents(prev => {
      const updatedEvents = prev.filter(event => event.id !== eventId)
      // Save to storage
      saveEventsToFile(updatedEvents).catch(error => {
        console.error('Error saving events:', error)
      })
      return updatedEvents
    })
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

  // Process events to auto-fix venue coordinates
  const processEventsWithVenueStorage = async (eventsToProcess: Event[]): Promise<Event[]> => {
    const processedEvents: Event[] = []
    
    for (const event of eventsToProcess) {
      // Auto-fix coordinates if they're default/unknown
      const fixedCoordinates = await autoFixVenueCoordinates(
        event.venue,
        [event.latitude, event.longitude]
      )
      
      // If coordinates were fixed, update the event
      if (fixedCoordinates[0] !== event.latitude || fixedCoordinates[1] !== event.longitude) {
        const updatedEvent = {
          ...event,
          latitude: fixedCoordinates[0],
          longitude: fixedCoordinates[1]
        }
        
        // Also save the venue to storage for future use
        addVenue(
          event.venue,
          event.address,
          fixedCoordinates
        )
        
        processedEvents.push(updatedEvent)
      } else {
        // Always save venue to storage for tracking
        addVenue(
          event.venue,
          event.address,
          [event.latitude, event.longitude]
        )
        
        processedEvents.push(event)
      }
    }
    
    return processedEvents
  }

  const value: EventContextType = {
    events,
    selectedEvent,
    userLocation,
    setSelectedEvent,
    setUserLocation,
    setEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsNearby,
    rateEvent
  }

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  )
}
