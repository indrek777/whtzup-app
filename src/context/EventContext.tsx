import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loadEventsFromFile } from '../utils/eventDataImporter'

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

  // Load events from imported data
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const importedEvents = await loadEventsFromFile()
        setEvents(importedEvents)
        console.log('Loaded', importedEvents.length, 'events from imported data')
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
    setEvents(prev => [...prev, event])
  }

  const updateEvent = (eventId: string, updatedEvent: Event) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? updatedEvent : event
    ))
  }

  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
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

  const value: EventContextType = {
    events,
    selectedEvent,
    userLocation,
    setSelectedEvent,
    setUserLocation,
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
