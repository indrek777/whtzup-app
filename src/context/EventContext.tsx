import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loadAllEvents } from '../utils/eventDataImporter'
import { saveEventsToFile, loadEventsFromStorage } from '../utils/eventStorage'
import { autoFixVenueCoordinates, addVenue } from '../utils/venueStorage'
import { Event } from '../data/events'

// Helper function to determine category
const determineCategory = (name: string, description: string): 'music' | 'food' | 'sports' | 'art' | 'business' | 'other' => {
  const text = (name + ' ' + description).toLowerCase()
  
  if (text.includes('kontsert') || text.includes('muusika') || text.includes('jazz') || text.includes('rock')) {
    return 'music'
  }
  if (text.includes('söök') || text.includes('restoran') || text.includes('vein') || text.includes('toit')) {
    return 'food'
  }
  if (text.includes('jalgpall') || text.includes('spordi') || text.includes('võistlus')) {
    return 'sports'
  }
  if (text.includes('näitus') || text.includes('galerii') || text.includes('kunst') || text.includes('muuseum')) {
    return 'art'
  }
  if (text.includes('konverents') || text.includes('seminar') || text.includes('workshop')) {
    return 'business'
  }
  
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
