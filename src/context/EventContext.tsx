import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loadEventsFromFile } from '../utils/eventDataImporter'
import { saveEventsToFile, loadEventsFromStorage } from '../utils/eventStorage'
import { autoFixVenueCoordinates, addVenue } from '../utils/venueStorage'

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

export interface Event {
  id: string
  title: string
  description: string
  category: 'music' | 'food' | 'sports' | 'art' | 'business' | 'other'
  location: {
    name: string
    address: string
    coordinates: [number, number] // [latitude, longitude]
  }
  date: string
  time: string
  organizer: string
  image?: string
  attendees: number
  maxAttendees?: number
  rating?: {
    average: number
    count: number
  }
  userRating?: number // User's personal rating (1-5)
}

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
        const response = await fetch('/api/events')
        if (response.ok) {
          const serverEvents = await response.json()
          if (Array.isArray(serverEvents) && serverEvents.length > 0) {
            // Convert server format to Event format
            const events: Event[] = serverEvents.map((item: any) => ({
              id: item.id,
              title: item.name,
              description: item.description,
              category: determineCategory(item.name, item.description),
              location: {
                name: item.venue || item.address || 'Various locations',
                address: item.address || item.venue || 'Location TBD',
                coordinates: [Number(item.latitude), Number(item.longitude)] as [number, number]
              },
              date: parseDate(item.startsAt),
              time: parseTime(item.startsAt),
              organizer: item.source === 'csv' ? 'Local Organizer' : 'Event Organizer',
              attendees: Math.floor(Math.random() * 200) + 10,
              maxAttendees: undefined
            }))
            
            // Process events with venue storage to auto-fix coordinates
            const processedEvents = processEventsWithVenueStorage(events)
            setEvents(processedEvents)
            console.log('Loaded', events.length, 'events from server')
            return
          }
        }
        
        // Fallback to localStorage
        const storedEvents = await loadEventsFromStorage()
        if (storedEvents.length > 0) {
          const processedEvents = processEventsWithVenueStorage(storedEvents)
          setEvents(processedEvents)
          console.log('Loaded', processedEvents.length, 'events from storage')
        } else {
          // Fallback to JSON file if no stored events
          const importedEvents = await loadEventsFromFile()
          const processedEvents = processEventsWithVenueStorage(importedEvents)
          setEvents(processedEvents)
          console.log('Loaded', processedEvents.length, 'events from imported data')
        }
      } catch (error) {
        console.error('Error loading events:', error)
        // Fallback to mock data if import fails
        const mockEvents: Event[] = [
          {
            id: '1',
            title: 'Jazz Night at Blue Note',
            description: 'Live jazz performance featuring local artists. Enjoy smooth melodies and great cocktails.',
            category: 'music',
            location: {
              name: 'Blue Note Jazz Club',
              address: '123 Music Street, Downtown',
              coordinates: [59.436962, 24.753574] // Tallinn coordinates
            },
            date: '2024-02-15',
            time: '20:00',
            organizer: 'Blue Note Club',
            attendees: 45,
            maxAttendees: 100,
            rating: {
              average: 4.2,
              count: 15
            }
          },
          {
            id: '2',
            title: 'Food Truck Festival',
            description: 'A celebration of local cuisine with over 20 food trucks serving delicious street food.',
            category: 'food',
            location: {
              name: 'Central Park',
              address: 'Central Park, Manhattan',
              coordinates: [59.436962, 24.753574] // Tallinn coordinates
            },
            date: '2024-02-16',
            time: '12:00',
            organizer: 'NYC Food Trucks',
            attendees: 120,
            maxAttendees: 500,
            rating: {
              average: 4.7,
              count: 28
            }
          }
        ]
        setEvents(mockEvents)
      }
    }
    
    loadEvents()
  }, [])

  const addEvent = (event: Event) => {
    setEvents(prev => {
      // Process the new event with venue storage
      const processedEvent = processEventsWithVenueStorage([event])[0]
      const updatedEvents = [...prev, processedEvent]
      
      // Save to storage
      saveEventsToFile(updatedEvents).catch(error => {
        console.error('Error saving events:', error)
      })
      return updatedEvents
    })
  }

  const updateEvent = (eventId: string, updatedEvent: Event) => {
    setEvents(prev => {
      // Process the updated event with venue storage
      const processedEvent = processEventsWithVenueStorage([updatedEvent])[0]
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

  const rateEvent = (eventId: string, rating: number) => {
    setEvents(prev => prev.map(event => {
      if (event.id === eventId) {
        const currentRating = event.rating || { average: 0, count: 0 }
        const userRating = event.userRating || 0
        
        // If user already rated, remove their previous rating
        const totalRating = currentRating.average * currentRating.count - userRating + rating
        const newCount = userRating > 0 ? currentRating.count : currentRating.count + 1
        const newAverage = newCount > 0 ? totalRating / newCount : 0
        
        return {
          ...event,
          rating: {
            average: Math.round(newAverage * 10) / 10, // Round to 1 decimal place
            count: newCount
          },
          userRating: rating
        }
      }
      return event
    }))
  }

  const getEventsNearby = (radius: number): Event[] => {
    if (!userLocation) return events
    
    return events.filter(event => {
      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        event.location.coordinates[0],
        event.location.coordinates[1]
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
  const processEventsWithVenueStorage = (eventsToProcess: Event[]): Event[] => {
    return eventsToProcess.map(event => {
      // Auto-fix coordinates if they're default/unknown
      const fixedCoordinates = autoFixVenueCoordinates(
        event.location.name,
        event.location.coordinates
      )
      
      // If coordinates were fixed, update the event
      if (fixedCoordinates !== event.location.coordinates) {
        const updatedEvent = {
          ...event,
          location: {
            ...event.location,
            coordinates: fixedCoordinates
          }
        }
        
        // Also save the venue to storage for future use
        addVenue(
          event.location.name,
          event.location.address,
          fixedCoordinates
        )
        
        return updatedEvent
      }
      
      // Always save venue to storage for tracking
      addVenue(
        event.location.name,
        event.location.address,
        event.location.coordinates
      )
      
      return event
    })
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
