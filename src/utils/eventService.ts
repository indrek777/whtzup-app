import AsyncStorage from '@react-native-async-storage/async-storage'
import { Event } from '../data/events'

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
        startsAt: (() => {
          const year = currentDate.getFullYear()
          const month = String(currentDate.getMonth() + 1).padStart(2, '0')
          const day = String(currentDate.getDate()).padStart(2, '0')
          return `${year}-${month}-${day} ${timeString}`
        })(),
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
              // Update local events with server IDs
              for (const event of allEvents) {
                await this.updateLocalEvent(event.id, { ...result.event, id: event.id })
              }
              return true
            }
          }
        } catch (backendError) {
          // Store for later sync
          for (const event of allEvents) {
            await this.queueForSync(event)
          }
        }
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
          }
        } catch (backendError) {
          // Fallback to cached data
        }
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
      return
    }
    
    try {
      const pendingEvents = await this.getPendingSync()
      
      if (pendingEvents.length === 0) {
        return
      }
      
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
          }
        } catch (error) {
          // Continue with next event
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
          }
        } catch (backendError) {
          // Fallback to local stats
        }
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
  
  // Update an existing event
  async updateEvent(eventId: string, updatedData: Partial<Event>): Promise<boolean> {
    try {
      // Get all local events
      const localEvents = await this.getLocalEvents()
      
      // Find the event to update
      const eventIndex = localEvents.findIndex(event => event.id === eventId)
      if (eventIndex === -1) {
        console.error('Event not found for update:', eventId)
        return false
      }
      
      const originalEvent = localEvents[eventIndex]
      
      // Update the event with new data
      const updatedEvent: Event = {
        ...originalEvent,
        ...updatedData,
        id: eventId, // Preserve the original ID
        updatedAt: new Date().toISOString()
      }
      
      // If this is a recurring event, we need to handle all instances
      if (originalEvent.parentEventId || originalEvent.isRecurring) {
        // Find all related events (parent and instances)
        const relatedEvents = localEvents.filter(event => 
          event.id === eventId || 
          event.parentEventId === eventId || 
          event.id === originalEvent.parentEventId ||
          (originalEvent.parentEventId && event.parentEventId === originalEvent.parentEventId)
        )
        
        // Remove all related events
        const filteredEvents = localEvents.filter(event => 
          !relatedEvents.some(related => related.id === event.id)
        )
        
        // Generate new instances if needed
        let newEvents: Event[] = []
        if (updatedEvent.isRecurring) {
          newEvents = this.generateRecurringInstances(updatedEvent)
        } else {
          newEvents = [updatedEvent]
        }
        
        // Save all new events
        const allEvents = [...filteredEvents, ...newEvents]
        await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(allEvents))
      } else {
        // Simple update for non-recurring events
        localEvents[eventIndex] = updatedEvent
        await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(localEvents))
      }
      
      // Try to sync with backend (if configured)
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}/${eventId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData)
          })
          
          if (!response.ok) {
            // Queue for later sync if backend update fails
            await this.queueForSync(updatedEvent)
          }
        } catch (backendError) {
          // Queue for later sync if backend is unavailable
          await this.queueForSync(updatedEvent)
        }
      }
      
      return true
    } catch (error) {
      console.error('Error updating event:', error)
      return false
    }
  }
  
  // Delete an event
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // Get all local events
      const localEvents = await this.getLocalEvents()
      
      // Find the event to delete
      const eventToDelete = localEvents.find(event => event.id === eventId)
      if (!eventToDelete) {
        console.error('Event not found for deletion:', eventId)
        return false
      }
      
      // If this is a recurring event, delete all related instances
      let eventsToDelete: Event[] = []
      if (eventToDelete.parentEventId || eventToDelete.isRecurring) {
        eventsToDelete = localEvents.filter(event => 
          event.id === eventId || 
          event.parentEventId === eventId || 
          event.id === eventToDelete.parentEventId ||
          (eventToDelete.parentEventId && event.parentEventId === eventToDelete.parentEventId)
        )
      } else {
        eventsToDelete = [eventToDelete]
      }
      
      // Remove events from local storage
      const remainingEvents = localEvents.filter(event => 
        !eventsToDelete.some(toDelete => toDelete.id === event.id)
      )
      await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(remainingEvents))
      
      // Try to delete from backend (if configured)
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}/${eventId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (!response.ok) {
            console.warn('Backend deletion failed, but event removed locally')
          }
        } catch (backendError) {
          console.warn('Backend unavailable, but event removed locally')
        }
      }
      
      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      return false
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
