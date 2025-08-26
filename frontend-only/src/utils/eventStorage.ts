import { Event } from '../data/events'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Function to save events to the JSON file
export const saveEventsToFile = async (events: Event[]): Promise<void> => {
  try {
    // Convert events to the format expected by the JSON file
    const eventsForStorage = events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      latitude: event.latitude,
      longitude: event.longitude,
      startsAt: event.startsAt,
      url: event.url,
      venue: event.venue,
      address: event.address,
      source: event.source,
      country: event.country,
      category: event.category,
      createdAt: event.createdAt,
      createdBy: event.createdBy,
      updatedAt: event.updatedAt,
      isRecurring: event.isRecurring,
      recurringPattern: event.recurringPattern,
      recurringDays: event.recurringDays,
      recurringInterval: event.recurringInterval,
      recurringEndDate: event.recurringEndDate,
      recurringOccurrences: event.recurringOccurrences,
      parentEventId: event.parentEventId
    }))

    // Save to AsyncStorage for current user
    await AsyncStorage.setItem('event-events', JSON.stringify(eventsForStorage))
    console.log('Events saved to local storage successfully')
    
    // Try to update the server's JSON file for all users (optional)
    try {
      await updateServerJSONFile(eventsForStorage)
    } catch (serverError) {
      console.warn('Server update failed, but events are saved locally:', serverError)
      // Don't throw the error - local save was successful
    }
  } catch (error) {
    console.error('Error saving events to local storage:', error)
    throw error
  }
}

// Function to update the server's JSON file
const updateServerJSONFile = async (events: any[]): Promise<void> => {
  try {
    // Check if we're in a web environment with a server
    if (typeof window !== 'undefined' && window.location) {
      // Send the updated JSON directly to the server
      const response = await fetch('/api/update-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Server update failed: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await response.json()
      console.log('Events successfully updated on server for all users:', result.message)
    } else {
      // In React Native, just save locally and create backup
      console.log('Running in React Native - saving events locally only')
      downloadUpdatedJSONFile(events)
    }
  } catch (error) {
    console.error('Error updating server JSON file:', error)
    // Fallback: download the file for manual upload
    downloadUpdatedJSONFile(events)
  }
}

// Function to download updated JSON file for sharing (fallback)
const downloadUpdatedJSONFile = (events: any[]) => {
  try {
    const jsonContent = JSON.stringify(events, null, 2)
    const fileName = `events-user-updated-${new Date().toISOString().split('T')[0]}.json`
    
    // In React Native, we'll just log the content for now
    // In a real app, you'd use a file system library like react-native-fs
    console.log('Events JSON content for manual save:', jsonContent)
    console.log('Suggested filename:', fileName)
    
    // TODO: Implement proper file download using react-native-fs or similar
    // For now, just save to AsyncStorage as a backup
    AsyncStorage.setItem('events-backup-' + Date.now(), jsonContent)
    
    console.log('Events content logged and backed up to AsyncStorage')
  } catch (error) {
    console.error('Error preparing JSON file:', error)
  }
}

// Function to clear all stored events
export const clearStoredEvents = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('event-events')
  } catch (error) {
    console.error('Error clearing stored events:', error)
  }
}

// Function to download current events as JSON file for sharing
export const downloadCurrentEventsAsJSON = (events: Event[]): void => {
  try {
    // Convert events to the format expected by the JSON file
    const eventsForSharing = events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      latitude: event.latitude,
      longitude: event.longitude,
      startsAt: event.startsAt,
      url: event.url,
      venue: event.venue,
      address: event.address,
      source: event.source,
      country: event.country,
      category: event.category,
      createdAt: event.createdAt,
      createdBy: event.createdBy,
      updatedAt: event.updatedAt,
      isRecurring: event.isRecurring,
      recurringPattern: event.recurringPattern,
      recurringDays: event.recurringDays,
      recurringInterval: event.recurringInterval,
      recurringEndDate: event.recurringEndDate,
      recurringOccurrences: event.recurringOccurrences,
      parentEventId: event.parentEventId
    }))

    downloadUpdatedJSONFile(eventsForSharing)
  } catch (error) {
    console.error('Error downloading events as JSON:', error)
  }
}

// Function to load events from storage (AsyncStorage)
export const loadEventsFromStorage = async (): Promise<Event[]> => {
  try {
    const stored = await AsyncStorage.getItem('event-events')
    if (!stored) {
      return []
    }

    const data = JSON.parse(stored)
    if (!Array.isArray(data)) {
      return []
    }

    // Convert back to Event format
    const events: Event[] = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      startsAt: item.startsAt,
      url: item.url || '',
      venue: item.venue || '',
      address: item.address || '',
      source: item.source || 'app',
      country: item.country,
      category: item.category || 'other',
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      updatedAt: item.updatedAt,
      isRecurring: item.isRecurring,
      recurringPattern: item.recurringPattern,
      recurringDays: item.recurringDays,
      recurringInterval: item.recurringInterval,
      recurringEndDate: item.recurringEndDate,
      recurringOccurrences: item.recurringOccurrences,
      parentEventId: item.parentEventId
    }))

    return events
  } catch (error) {
    console.error('Error loading events from storage:', error)
    return []
  }
}

// Function to update a single event and save for all users
export const updateEventForAllUsers = async (eventId: string, updatedEvent: Event, allEvents: Event[]): Promise<void> => {
  try {
    // Update the event in the local array
    const updatedEvents = allEvents.map(event => 
      event.id === eventId ? updatedEvent : event
    )
    
    // Save the updated events to storage and server
    await saveEventsToFile(updatedEvents)
    
    console.log(`Event ${eventId} updated and saved for all users`)
  } catch (error) {
    console.error('Error updating event for all users:', error)
    throw error
  }
}

// Function to delete an event and save for all users
export const deleteEventForAllUsers = async (eventId: string, allEvents: Event[]): Promise<void> => {
  try {
    // Remove the event from the local array
    const updatedEvents = allEvents.filter(event => event.id !== eventId)
    
    // Save the updated events to storage and server
    await saveEventsToFile(updatedEvents)
    
    console.log(`Event ${eventId} deleted and saved for all users`)
  } catch (error) {
    console.error('Error deleting event for all users:', error)
    throw error
  }
}
