import AsyncStorage from '@react-native-async-storage/async-storage'
import { Event } from '../data/events'

export interface EventResponse {
  success: boolean
  event?: Event
  events?: Event[]
  data?: Event[]
  total?: number
  message?: string
  error?: string
}

// Backend API URL
const API_BASE_URL = 'https://olympio.ee/api' // Backend URL
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
  async getAllEvents(forceRefresh: boolean = false): Promise<Event[]> {
    try {
      console.log(`🔄 getAllEvents called with forceRefresh: ${forceRefresh}`)
      const localEvents = await this.getLocalEvents()
      console.log(`📊 Local events: ${localEvents.length}`)
      console.log(`📋 Local event IDs:`, localEvents.map(e => `${e.id} (${e.name})`))
      const sharedEvents = forceRefresh ? await this.refreshSharedEvents() : await this.getSharedEvents()
      console.log(`📊 Shared events: ${sharedEvents.length}`)
      
      // Merge events, avoiding duplicates
      const allEvents = [...localEvents, ...sharedEvents]
      console.log(`📊 Total events before deduplication: ${allEvents.length}`)
      const uniqueEvents = this.removeDuplicates(allEvents)
      console.log(`📊 Unique events after deduplication: ${uniqueEvents.length}`)
      
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
  async getSharedEvents(forceRefresh: boolean = false): Promise<Event[]> {
    try {
      // Try to get from backend first (if configured)
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}`)
          if (response.ok) {
            const result: EventResponse = await response.json()
            if (result.success && result.data) {
              console.log(`📊 Received ${result.data.length} events from backend`)
              // Cache the result locally
              await this.cacheSharedEvents(result.data)
              return result.data
            }
          }
        } catch (backendError) {
          console.error('Error fetching from backend:', backendError)
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

  // Force refresh shared events from backend
  async refreshSharedEvents(): Promise<Event[]> {
    try {
      if (!API_BASE_URL) {
        return await this.getCachedSharedEvents()
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}`)
      if (response.ok) {
        const result: EventResponse = await response.json()
        if (result.success && result.data) {
          console.log(`📊 Refreshed ${result.data.length} events from backend`)
          // Cache the result locally
          await this.cacheSharedEvents(result.data)
          return result.data
        }
      }
      
      // If backend call fails, return cached data
      return await this.getCachedSharedEvents()
      
    } catch (error) {
      console.error('Error refreshing shared events:', error)
      return await this.getCachedSharedEvents()
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
  async updateEvent(eventId: string, updatedData: Partial<Event>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 updateEvent called for eventId: ${eventId}`)
      console.log(`📊 Update data:`, updatedData)
      
      // Get all local events
      const localEvents = await this.getLocalEvents()
      console.log(`📦 Found ${localEvents.length} local events`)
      console.log(`📋 Local event IDs:`, localEvents.map(e => e.id))
      
      // Find the event to update
      let eventIndex = localEvents.findIndex(event => event.id === eventId)
      let originalEvent: Event | null = null
      
      console.log(`🔍 Event index in local events: ${eventIndex}`)
      
      if (eventIndex === -1) {
        // Event not found locally, this might be a synchronization issue
        console.log('❌ Event not found locally, checking if it exists elsewhere:', eventId)
        
        // For local events (starting with 'local_'), they should be in local storage
        if (eventId.startsWith('local_')) {
          console.log('🔍 This is a local event, it should be in local storage but was not found')
          console.log('💡 This might be a race condition or storage issue')
          
          // Try to reload local events once more
          const reloadedLocalEvents = await this.getLocalEvents()
          console.log(`🔄 Reloaded ${reloadedLocalEvents.length} local events`)
          console.log(`📋 Reloaded event IDs:`, reloadedLocalEvents.map(e => e.id))
          
          const reloadedIndex = reloadedLocalEvents.findIndex(event => event.id === eventId)
          if (reloadedIndex !== -1) {
            console.log('✅ Event found after reload!')
            eventIndex = reloadedIndex
            originalEvent = reloadedLocalEvents[reloadedIndex]
            localEvents.splice(0, localEvents.length, ...reloadedLocalEvents) // Replace array contents
          } else {
            console.log('❌ Event still not found after reload, this is likely a data consistency issue')
            return { success: false, error: 'Event not found. This may be due to a synchronization issue. Please try refreshing the app.' }
          }
        } else if (API_BASE_URL) {
          // For server events, check backend
          try {
            const { userService } = await import('./userService')
            const headers = await userService.getAuthHeaders()
            
            // Check if event exists in backend
            const checkResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}/${eventId}`, {
              method: 'GET',
              headers
            })
            
            if (checkResponse.ok) {
              const eventData = await checkResponse.json()
              if (eventData.success) {
                // Event exists in backend, add it to local storage
                originalEvent = eventData.data
                if (originalEvent) {
                  localEvents.push(originalEvent)
                }
                eventIndex = localEvents.length - 1
                await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(localEvents))
                console.log('✅ Event found in backend and added to local storage:', eventId)
              } else {
                console.error('❌ Event not found in backend:', eventId)
                return { success: false, error: 'Event not found' }
              }
            } else {
              console.error('❌ Event not found in backend:', eventId)
              return { success: false, error: 'Event not found' }
            }
          } catch (backendError) {
            console.error('❌ Error checking backend for event:', backendError)
            return { success: false, error: 'Event not found' }
          }
        } else {
          console.error('❌ Event not found for update:', eventId)
          return { success: false, error: 'Event not found' }
        }
      } else {
        originalEvent = localEvents[eventIndex]
      }
      
      if (!originalEvent) {
        return { success: false, error: 'Event not found' }
      }
      
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
        // For local events that were never synced, try to create them in the backend first
        if (eventId.startsWith('local_')) {
          console.log('🔄 Local event detected, attempting to sync to backend first:', eventId)
          try {
            const { userService } = await import('./userService')
            const headers = await userService.getAuthHeaders()
            
            // Try to create the event in the backend
            const createResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(updatedEvent)
            })
            
            if (createResponse.ok) {
              const createResult = await createResponse.json()
              if (createResult.success) {
                console.log('✅ Local event successfully synced to backend:', eventId)
                // Update the local event with the server ID
                const serverEvent = createResult.data
                updatedEvent.id = serverEvent.id
                localEvents[eventIndex] = updatedEvent
                await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(localEvents))
                return { success: true }
              }
            }
            
            // If creation fails, queue for later sync
            console.log('⚠️ Failed to sync local event to backend, queuing for later sync:', eventId)
            await this.queueForSync(updatedEvent)
          } catch (syncError) {
            console.log('⚠️ Error syncing local event to backend, queuing for later sync:', syncError)
            await this.queueForSync(updatedEvent)
          }
        } else {
          // For server events, try to update them
          try {
            const { userService } = await import('./userService')
            const headers = await userService.getAuthHeaders()
            
            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}/${eventId}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(updatedData)
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              
              // Handle specific error cases
              if (response.status === 401) {
                throw new Error('Authentication required. Please sign in to edit events.')
              } else if (response.status === 403) {
                throw new Error(errorData.error || 'You do not have permission to edit this event. Upgrade to premium to edit any event.')
              } else if (response.status === 404) {
                throw new Error('Event not found.')
              } else {
                // Queue for later sync if backend update fails
                await this.queueForSync(updatedEvent)
              }
            }
          } catch (backendError) {
            if (backendError instanceof Error) {
              throw backendError // Re-throw specific error messages
            }
            // Queue for later sync if backend is unavailable
            await this.queueForSync(updatedEvent)
          }
        }
      }
      
      // Force refresh shared events to ensure cache is up to date
      try {
        await this.refreshSharedEvents()
      } catch (refreshError) {
        console.log('Failed to refresh shared events after update:', refreshError)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error updating event:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update event'
      return { success: false, error: errorMessage }
    }
  }
  
  // Delete an event
  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get all local events
      const localEvents = await this.getLocalEvents()
      
      // Find the event to delete
      let eventToDelete = localEvents.find(event => event.id === eventId)
      
      if (!eventToDelete) {
        // Event not found locally, check if it exists in backend
        console.log('Event not found locally for deletion, checking backend:', eventId)
        
        if (API_BASE_URL) {
          try {
            const { userService } = await import('./userService')
            const headers = await userService.getAuthHeaders()
            
            // Check if event exists in backend
            const checkResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}/${eventId}`, {
              method: 'GET',
              headers
            })
            
            if (checkResponse.ok) {
              const eventData = await checkResponse.json()
              if (eventData.success) {
                // Event exists in backend, add it to local storage temporarily for deletion
                eventToDelete = eventData.data
                if (eventToDelete) {
                  localEvents.push(eventToDelete)
                }
                await AsyncStorage.setItem(STORAGE_KEYS.userEvents, JSON.stringify(localEvents))
                console.log('Event found in backend and added to local storage for deletion:', eventId)
              } else {
                console.error('Event not found in backend for deletion:', eventId)
                return { success: false, error: 'Event not found' }
              }
            } else {
              console.error('Event not found in backend for deletion:', eventId)
              return { success: false, error: 'Event not found' }
            }
          } catch (backendError) {
            console.error('Error checking backend for event deletion:', backendError)
            return { success: false, error: 'Event not found' }
          }
        } else {
          console.error('Event not found for deletion:', eventId)
          return { success: false, error: 'Event not found' }
        }
      }
      
      if (!eventToDelete) {
        return { success: false, error: 'Event not found' }
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
          // Get authentication headers
          const { userService } = await import('./userService')
          const headers = await userService.getAuthHeaders()
          
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.events}/${eventId}`, {
            method: 'DELETE',
            headers
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            
            // Handle specific error cases
            if (response.status === 401) {
              throw new Error('Authentication required. Please sign in to delete events.')
            } else if (response.status === 403) {
              throw new Error(errorData.error || 'You do not have permission to delete this event. Upgrade to premium to delete any event.')
            } else if (response.status === 404) {
              throw new Error('Event not found.')
            } else {
              console.warn('Backend deletion failed, but event removed locally')
            }
          }
        } catch (backendError) {
          if (backendError instanceof Error) {
            throw backendError // Re-throw specific error messages
          }
          console.warn('Backend unavailable, but event removed locally')
        }
      }
      
      // Force refresh shared events to ensure cache is up to date
      try {
        await this.refreshSharedEvents()
      } catch (refreshError) {
        console.log('Failed to refresh shared events after deletion:', refreshError)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting event:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event'
      return { success: false, error: errorMessage }
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
    const eventMap = new Map()
    
    events.forEach(event => {
      const existingEvent = eventMap.get(event.id)
      if (!existingEvent) {
        eventMap.set(event.id, event)
      } else {
        // Keep the event with the most recent updatedAt timestamp
        const existingUpdatedAt = existingEvent.updatedAt || existingEvent.createdAt || '0'
        const newUpdatedAt = event.updatedAt || event.createdAt || '0'
        
        if (newUpdatedAt > existingUpdatedAt) {
          eventMap.set(event.id, event)
        }
      }
    })
    
    return Array.from(eventMap.values())
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
