// Events data imported from JSON for better performance
export interface Event {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  startsAt: string
  url: string
  venue: string
  address: string
  source: string
}

// Import events from JSON file
import eventsData from './events-data.json'

// Export the events
export { eventsData }

// Total count of events in your database
export const totalEventsCount = 1359
