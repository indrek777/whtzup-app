import { Event } from '../context/EventContext'

// Function to save events to the JSON file
export const saveEventsToFile = async (events: Event[]): Promise<void> => {
  try {
    // Convert events to the format expected by the JSON file
    const eventsForStorage = events.map(event => ({
      id: event.id,
      name: event.title,
      description: event.description,
      latitude: event.location.coordinates[0],
      longitude: event.location.coordinates[1],
      startsAt: `${event.date} ${event.time}`,
      url: '',
      venue: event.location.name,
      address: event.location.address,
      source: event.id.startsWith('imported-') ? 'csv' : 'app'
    }))

    // Save to localStorage for current user
    localStorage.setItem('whtzup-events', JSON.stringify(eventsForStorage))
    
    // Also update the server's JSON file for all users
    await updateServerJSONFile(eventsForStorage)
    
    console.log(`Saved ${events.length} events to storage and updated server file for all users`)
  } catch (error) {
    console.error('Error saving events:', error)
    throw error
  }
}

// Function to update the server's JSON file
const updateServerJSONFile = async (events: any[]): Promise<void> => {
  try {
    // Create a FormData object to send the updated JSON
    const formData = new FormData()
    const jsonBlob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
    formData.append('events', jsonBlob, 'events-user.json')
    
    // Send the updated JSON to the server
    const response = await fetch('/api/update-events', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Server update failed: ${response.status}`)
    }
    
    console.log('Server JSON file updated successfully')
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
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `events-user-updated-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log('Updated JSON file downloaded for manual sharing')
  } catch (error) {
    console.error('Error downloading JSON file:', error)
  }
}

// Function to clear all stored events
export const clearStoredEvents = (): void => {
  try {
    localStorage.removeItem('whtzup-events')
    console.log('Cleared all stored events')
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
      name: event.title,
      description: event.description,
      latitude: event.location.coordinates[0],
      longitude: event.location.coordinates[1],
      startsAt: `${event.date} ${event.time}`,
      url: '',
      venue: event.location.name,
      address: event.location.address,
      source: event.id.startsWith('imported-') ? 'csv' : 'app'
    }))

    downloadUpdatedJSONFile(eventsForSharing)
  } catch (error) {
    console.error('Error downloading events as JSON:', error)
  }
}

// Function to load events from storage (localStorage fallback)
export const loadEventsFromStorage = async (): Promise<Event[]> => {
  try {
    const stored = localStorage.getItem('whtzup-events')
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

    return events
  } catch (error) {
    console.error('Error loading events from storage:', error)
    return []
  }
}

// Helper function to determine category
const determineCategory = (name: string, description: string): Event['category'] => {
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
