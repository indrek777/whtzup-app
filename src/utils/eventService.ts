import AsyncStorage from '@react-native-async-storage/async-storage'

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

export interface EventResponse {
  success: boolean
  event?: Event
  events?: Event[]
  total?: number
  message?: string
  error?: string
}

// Set to null to disable backend connection for now
const API_BASE_URL = null // 'http://localhost:3002/api' // Replace with your actual backend URL
const API_ENDPOINTS = {
  events: '/events',
  stats: '/events/stats',
  health: '/health'
}

const STORAGE_KEYS = {
  userEvents: 'userCreatedEvents',
  sharedEvents: 'sharedEvents',
  lastSync: 'lastEventSync'
}

class EventService {
  // Generate recurring event instances
  private generateRecurringInstances(parentEvent: Event): Event[] {
    if (!parentEvent.isRecurring || !parentEvent.startsAt) {
      return [parentEvent]
    }

    const instances: Event[] = []
    const startDate = new Date(parentEvent.startsAt)
    const timeString = parentEvent.startsAt.split(' ')[1] || '00:00'
    
    let currentDate = new Date(startDate)
    let occurrenceCount = 0
    const maxOccurrences = parentEvent.recurringOccurrences || 10 // Default to 10 if not specified
    const endDate = parentEvent.recurringEndDate ? new Date(parentEvent.recurringEndDate) : null

    while (occurrenceCount < maxOccurrences) {
      // Check if we've reached the end date
      if (endDate && currentDate > endDate) {
        break
      }

      // Create instance
      const instance: Event = {
        ...parentEvent,
        id: `${parentEvent.id}_instance_${occurrenceCount}`,
        startsAt: `${currentDate.toISOString().slice(0, 10)} ${timeString}`,
        parentEventId: parentEvent.id
      }
      
      instances.push(instance)
      occurrenceCount++

      // Calculate next date based on pattern
      if (parentEvent.recurringPattern === 'daily') {
        currentDate.setDate(currentDate.getDate() + (parentEvent.recurringInterval || 1))
      } else if (parentEvent.recurringPattern === 'weekly') {
        if (parentEvent.recurringDays && parentEvent.recurringDays.length > 0) {
          // Find next occurrence based on selected days
          let nextDate = new Date(currentDate)
          let daysAdded = 0
          const interval = parentEvent.recurringInterval || 1
          
          while (daysAdded < 7 * interval) {
            nextDate.setDate(nextDate.getDate() + 1)
            daysAdded++
            
            if (parentEvent.recurringDays.includes(nextDate.getDay())) {
              currentDate = new Date(nextDate)
              break
            }
          }
          
          // If no next occurrence found in this interval, move to next interval
          if (daysAdded >= 7 * interval) {
            currentDate.setDate(currentDate.getDate() + (7 * interval))
          }
        } else {
          currentDate.setDate(currentDate.getDate() + (7 * (parentEvent.recurringInterval || 1)))
        }
      } else if (parentEvent.recurringPattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + (parentEvent.recurringInterval || 1))
      } else {
        // Custom pattern - just increment by days
        currentDate.setDate(currentDate.getDate() + (parentEvent.recurringInterval || 1))
      }
    }

    return instances
  }

  // Create and share a new event
  async createEvent(eventData: Omit<Event, 'id' | 'source'>): Promise<boolean> {
    try {
      // Create the parent event
      const parentEvent: Event = {
        ...eventData,
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: 'user',
        createdAt: new Date().toISOString()
      }
      
      // Generate recurring instances if needed
      const allEvents = this.generateRecurringInstances(parentEvent)
      
      // Save all events locally
      for (const event of allEvents) {
        await this.saveEventLocally(event)
      }
      
      // Try to share with backend (if configured)
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...eventData,
              userId: await this.getUserId(),
              recurringInstances: allEvents.length > 1 ? allEvents : undefined
            })
          })
          
          if (response.ok) {
            const result: EventResponse = await response.json()
            if (result.success && result.event) {
              console.log('Event shared with community successfully')
              // Update local events with server IDs
              for (const event of allEvents) {
                await this.updateLocalEvent(event.id, { ...result.event, id: event.id })
              }
              return true
            }
          } else {
            console.log('Backend responded with error:', response.status, response.statusText)
          }
        } catch (backendError) {
          console.log('Backend share failed, events saved locally only:', backendError)
          // Store for later sync
          for (const event of allEvents) {
            await this.queueForSync(event)
          }
        }
      } else {
        console.log('Backend not configured - events saved locally only')
      }
      
      return true // Success even if backend is not available
      
    } catch (error) {
      console.error('Error creating event:', error)
      return false
    }
  }
  
  // Get all events (local + shared)
  async getAllEvents(): Promise<Event[]> {
    try {
      const localEvents = await this.getLocalEvents()
      const sharedEvents = await this.getSharedEvents()
      
      // Merge events, avoiding duplicates
      const allEvents = [...localEvents, ...sharedEvents]
      const uniqueEvents = this.removeDuplicates(allEvents)
      
      return uniqueEvents
    } catch (error) {
      console.error('Error getting all events:', error)
      // Return local events only if there's an error
      try {
        return await this.getLocalEvents()
      } catch (localError) {
        console.error('Error getting local events:', localError)
        return []
      }
    }
  }
  
  // Get shared events from backend
  async getSharedEvents(): Promise<Event[]> {
    try {
      // Try to get from backend first (if configured)
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}`)
          if (response.ok) {
            const result: EventResponse = await response.json()
            if (result.success && result.events) {
              // Cache the result locally
              await this.cacheSharedEvents(result.events)
              return result.events
            }
          } else {
            console.log('Backend responded with error:', response.status, response.statusText)
          }
        } catch (backendError) {
          console.log('Backend fetch failed, using cached data:', backendError)
        }
      } else {
        console.log('Backend not configured - using cached data only')
      }
      
      // Fallback to cached data
      return await this.getCachedSharedEvents()
      
    } catch (error) {
      console.error('Error getting shared events:', error)
      return []
    }
  }
  
  // Sync pending events with backend
  async syncEvents(): Promise<void> {
    // Skip sync if backend is not configured
    if (!API_BASE_URL) {
      console.log('Backend not configured - skipping sync')
      return
    }
    
    try {
      const pendingEvents = await this.getPendingSync()
      
      if (pendingEvents.length === 0) {
        console.log('No pending events to sync')
        return
      }
      
      console.log(`Attempting to sync ${pendingEvents.length} pending events...`)
      
      for (const event of pendingEvents) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...event,
              userId: await this.getUserId()
            })
          })
          
          if (response.ok) {
            await this.removeFromSyncQueue(event)
            console.log(`Synced event: ${event.name}`)
          } else {
            console.log(`Failed to sync event ${event.name}: ${response.status} ${response.statusText}`)
          }
        } catch (error) {
          console.log(`Failed to sync event ${event.name}:`, error)
        }
      }
      
      // Update last sync timestamp
      await AsyncStorage.setItem(STORAGE_KEYS.lastSync, Date.now().toString())
      
    } catch (error) {
      console.error('Error syncing events:', error)
    }
  }
  
  // Get event statistics
  async getEventStats(): Promise<any> {
    try {
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.stats}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              return result.stats
            }
          } else {
            console.log('Backend stats failed:', response.status, response.statusText)
          }
        } catch (backendError) {
          console.log('Backend stats failed:', backendError)
        }
      } else {
        console.log('Backend not configured - using local stats only')
      }
      
      // Fallback to local stats
      const localEvents = await this.getLocalEvents()
      return {
        totalEvents: localEvents.length,
        userCreatedEvents: localEvents.filter(e => e.source === 'user').length,
        categories: {},
        recentEvents: localEvents.slice(0, 10)
      }
      
    } catch (error) {
      console.error('Error getting event stats:', error)
      return {
        totalEvents: 0,
        userCreatedEvents: 0,
        categories: {},
        recentEvents: []
      }
    }
  }
  
  // Check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    if (!API_BASE_URL) {
      return false
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.health}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      return response.ok
    } catch (error) {
      console.log('Backend health check failed:', error)
      return false
    }
  }
  
  // Get sync status
  async getSyncStatus(): Promise<{
    backendAvailable: boolean
    pendingEvents: number
    lastSync: string | null
  }> {
    try {
      const backendAvailable = await this.isBackendAvailable()
      const pendingEvents = await this.getPendingSync()
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.lastSync)
      
      return {
        backendAvailable,
        pendingEvents: pendingEvents.length,
        lastSync
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
      return {
        backendAvailable: false,
        pendingEvents: 0,
        lastSync: null
      }
    }
  }
  
  // Private helper methods
  
  private async saveEventLocally(event: Event): Promise<void> {
    try {
      const existingEvents = await this.getLocalEvents()
      const updatedEvents = [...existingEvents, event]
      await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(updatedEvents))
    } catch (error) {
      console.error('Error saving event locally:', error)
      throw error // Re-throw to handle in calling function
    }
  }
  
  private async updateLocalEvent(oldId: string, updatedEvent: Event): Promise<void> {
    try {
      const existingEvents = await this.getLocalEvents()
      const updatedEvents = existingEvents.map(event => 
        event.id === oldId ? updatedEvent : event
      )
      await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(updatedEvents))
    } catch (error) {
      console.error('Error updating local event:', error)
      throw error
    }
  }
  
  private async getLocalEvents(): Promise<Event[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.userEvents)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error getting local events:', error)
      return []
    }
  }
  
  private async queueForSync(event: Event): Promise<void> {
    try {
      const pendingEvents = await this.getPendingSync()
      pendingEvents.push(event)
      await AsyncStorage.setItem('pendingEventSync', JSON.stringify(pendingEvents))
    } catch (error) {
      console.error('Error queuing event for sync:', error)
      throw error
    }
  }
  
  private async getPendingSync(): Promise<Event[]> {
    try {
      const data = await AsyncStorage.getItem('pendingEventSync')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error getting pending sync:', error)
      return []
    }
  }
  
  private async removeFromSyncQueue(event: Event): Promise<void> {
    try {
      const pendingEvents = await this.getPendingSync()
      const filteredEvents = pendingEvents.filter(e => e.id !== event.id)
      await AsyncStorage.setItem('pendingEventSync', JSON.stringify(filteredEvents))
    } catch (error) {
      console.error('Error removing from sync queue:', error)
      throw error
    }
  }
  
  private async cacheSharedEvents(events: Event[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.sharedEvents, JSON.stringify(events))
    } catch (error) {
      console.error('Error caching shared events:', error)
      throw error
    }
  }
  
  private async getCachedSharedEvents(): Promise<Event[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.sharedEvents)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error getting cached shared events:', error)
      return []
    }
  }
  
  private removeDuplicates(events: Event[]): Event[] {
    const seen = new Set()
    return events.filter(event => {
      const duplicate = seen.has(event.id)
      seen.add(event.id)
      return !duplicate
    })
  }
  
  private async getUserId(): Promise<string> {
    try {
      const userId = await AsyncStorage.getItem('userId')
      if (userId) return userId
      
      // Generate a new user ID if none exists
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await AsyncStorage.setItem('userId', newUserId)
      return newUserId
    } catch (error) {
      console.error('Error getting user ID:', error)
      return 'anonymous'
    }
  }
}

export const eventService = new EventService()
