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
  country?: string // Added country field for filtering
  category?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  // Recurring event properties
  isRecurring?: boolean
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'custom'
  recurringDays?: number[]
  recurringInterval?: number
  recurringEndDate?: string
  recurringOccurrences?: number
  parentEventId?: string // For recurring event instances
}

// Import events from JSON file
import eventsData from './events-data.json'

// Export the events
export { eventsData }

// Total count of events in your database
export const totalEventsCount = 13359
