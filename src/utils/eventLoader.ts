import { Region } from 'react-native-maps'
import { Event } from '../data/events'

// Interface for partial loading options
interface LoadOptions {
  region?: Region
  userLocation?: { latitude: number; longitude: number }
  maxDistance?: number // in kilometers
  category?: string
  source?: string
}

// Calculate distance between two points in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}





       // Load events partially based on region and filters
export const loadEventsPartially = async (options: LoadOptions = {}): Promise<Event[]> => {
  const {
    region,
    userLocation,
    maxDistance = 50, // Default 50km radius
    category,
    source
  } = options

  try {
    // Import the data dynamically to avoid loading everything at startup
    const { default: allEvents } = await import('../data/events-data.json')
    
    let filteredEvents: Event[] = allEvents

    // Filter by source if specified
    if (source) {
      filteredEvents = filteredEvents.filter(event => event.source === source)
    }

    // Filter by category if specified
    if (category) {
      filteredEvents = filteredEvents.filter(event => 
        event.category?.toLowerCase() === category.toLowerCase()
      )
    }

    // Filter out past events - never show events that have already happened
    const now = new Date()
    filteredEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.startsAt)
      return eventDate > now
    })

    // Filter by distance if user location is provided
    if (userLocation) {
      filteredEvents = filteredEvents.filter(event => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          event.latitude,
          event.longitude
        )
        return distance <= maxDistance
      })
    }

    // Filter by region if provided
    if (region) {
      filteredEvents = filteredEvents.filter(event => {
        return event.latitude >= region.latitude - region.latitudeDelta &&
               event.latitude <= region.latitude + region.latitudeDelta &&
               event.longitude >= region.longitude - region.longitudeDelta &&
               event.longitude <= region.longitude + region.longitudeDelta
      })
    }

    // Sort by distance if user location is provided
    if (userLocation) {
      filteredEvents.sort((a, b) => {
        const distanceA = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          a.latitude,
          a.longitude
        )
        const distanceB = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          b.latitude,
          b.longitude
        )
        return distanceA - distanceB
      })
    }

    return filteredEvents

  } catch (error) {
    console.error('Error loading events partially:', error)
    return []
  }
}

// Get total count of events (for display purposes)
export const getTotalEventsCount = async (): Promise<number> => {
  try {
    const { default: allEvents } = await import('../data/events-data.json')
    return allEvents.length
  } catch (error) {
    console.error('Error getting total events count:', error)
    return 0
  }
}


