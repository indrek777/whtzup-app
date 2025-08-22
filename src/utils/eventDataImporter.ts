import { Event } from '../data/events'

// Interface for the imported JSON data structure
interface ImportedEvent {
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

// Function to determine event category based on name and description
const determineCategory = (name: string, description: string): Event['category'] => {
  const text = (name + ' ' + description).toLowerCase()
  
  // Music events
  if (text.includes('kontsert') || text.includes('muusika') || text.includes('festival') || 
      text.includes('orkester') || text.includes('koor') || text.includes('kitarr') ||
      text.includes('klaver') || text.includes('jazz') || text.includes('rock') ||
      text.includes('ooper') || text.includes('sümfoonia') || text.includes('concert') ||
      text.includes('music') || text.includes('orchestra') || text.includes('choir') ||
      text.includes('guitar') || text.includes('piano') || text.includes('opera') ||
      text.includes('symphony')) {
    return 'music'
  }
  
  // Food events
  if (text.includes('söök') || text.includes('restoran') || text.includes('kohvik') ||
      text.includes('vein') || text.includes('kokteili') || text.includes('õhtusöök') ||
      text.includes('pakett') || text.includes('dinner') || text.includes('food') ||
      text.includes('restaurant') || text.includes('cafe') || text.includes('wine') ||
      text.includes('cocktail') || text.includes('dining') || text.includes('cuisine') ||
      text.includes('tasting') || text.includes('gastronomy')) {
    return 'food'
  }
  
  // Sports events
  if (text.includes('jalgpall') || text.includes('spordi') || text.includes('jää') ||
      text.includes('võistlus') || text.includes('mäng') || text.includes('liiga') ||
      text.includes('staadion') || text.includes('arena') || text.includes('kardisõit') ||
      text.includes('football') || text.includes('sport') || text.includes('ice') ||
      text.includes('competition') || text.includes('game') || text.includes('league') ||
      text.includes('stadium') || text.includes('race') || text.includes('marathon') ||
      text.includes('tournament') || text.includes('championship')) {
    return 'sports'
  }
  
  // Art events
  if (text.includes('näitus') || text.includes('galerii') || text.includes('kunst') ||
      text.includes('muuseum') || text.includes('arhitektuur') || text.includes('keraamika') ||
      text.includes('fotograafia') || text.includes('skulptuur') || text.includes('exhibition') ||
      text.includes('gallery') || text.includes('art') || text.includes('museum') ||
      text.includes('architecture') || text.includes('ceramics') || text.includes('photography') ||
      text.includes('sculpture') || text.includes('painting') || text.includes('drawing') ||
      text.includes('workshop') || text.includes('creative')) {
    return 'art'
  }
  
  // Business events
  if (text.includes('konverents') || text.includes('festival') || text.includes('konverents') ||
      text.includes('seminar') || text.includes('workshop') || text.includes('töötuba') ||
      text.includes('networking') || text.includes('konverents') || text.includes('conference') ||
      text.includes('seminar') || text.includes('business') || text.includes('meeting') ||
      text.includes('summit') || text.includes('forum') || text.includes('presentation') ||
      text.includes('lecture') || text.includes('training')) {
    return 'business'
  }
  
  // Default to other
  return 'other'
}



// Function to generate random attendee count
const generateAttendees = (): number => {
  return Math.floor(Math.random() * 200) + 10
}

// Function to generate max attendees
const generateMaxAttendees = (attendees: number): number => {
  return attendees + Math.floor(Math.random() * 100) + 20
}

// Function to parse date and time from startsAt
const parseDateTime = (startsAt: string): { date: string, time: string } => {
  try {
    // Handle different date formats
    let dateStr = startsAt
    
    // If it's a full datetime string
    if (startsAt.includes(' ')) {
      const parts = startsAt.split(' ')
      // Find the part that looks like a date (YYYY-MM-DD format)
      const datePart = parts.find(part => /^\d{4}-\d{2}-\d{2}$/.test(part))
      const timePart = parts.find(part => /^\d{2}:\d{2}$/.test(part))
      
      if (datePart) {
        dateStr = datePart
        return { date: dateStr, time: timePart || '12:00' }
      }
    }
    
    // If it's just a date, use default time
    if (/^\d{4}-\d{2}-\d{2}$/.test(startsAt)) {
      return { date: startsAt, time: '12:00' }
    }
    
    // If we can't parse it, try to extract a date from the string
    const dateMatch = startsAt.match(/(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      return { date: dateMatch[1], time: '12:00' }
    }
    
    // Fallback to current date
    const now = new Date()
    return {
      date: now.toISOString().split('T')[0],
      time: '12:00'
    }
  } catch (error) {
    console.warn('Error parsing date:', startsAt, error)
    // Fallback to current date
    const now = new Date()
    return {
      date: now.toISOString().split('T')[0],
      time: '12:00'
    }
  }
}

// Function to clean and validate coordinates
const validateCoordinates = (lat: number, lng: number): boolean => {
  // More permissive validation - allow coordinates that are close to 0 but not exactly 0
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && 
         (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001) && // Allow coordinates close to 0
         !isNaN(lat) && !isNaN(lng)
}

// Main function to transform imported data
export const transformImportedEvents = (importedData: ImportedEvent[]): Event[] => {

  
  let invalidCoordinates = 0
  let invalidNames = 0
  let oldEvents = 0
  
  const result = importedData
    .filter(item => {
      // Filter out invalid coordinates
      if (!validateCoordinates(item.latitude, item.longitude)) {
        invalidCoordinates++
        return false
      }
      
      // Filter out events without names
      if (!item.name || item.name.trim() === '') {
        invalidNames++
        return false
      }
      
      // Filter out events that are too far in the past (older than 2015)
      const eventDate = new Date(item.startsAt)
      const cutoffDate = new Date('2015-01-01')
      if (eventDate < cutoffDate) {
        oldEvents++
        return false
      }
      
      return true
    })
    .map((item, index) => {
      const { date, time } = parseDateTime(item.startsAt)
      const attendees = generateAttendees()
      const maxAttendees = generateMaxAttendees(attendees)
      
      return {
        id: item.id || `imported-${index}`,
        name: item.name,
        description: item.description || `Event at ${item.address || item.venue || 'various locations'}`,
        category: determineCategory(item.name, item.description),
        venue: item.venue || item.address || 'Various locations',
        address: item.address || item.venue || 'Location TBD',
        latitude: Number(item.latitude) || 0,
        longitude: Number(item.longitude) || 0,
        startsAt: item.startsAt || new Date().toISOString(),
        createdBy: item.source === 'csv' ? 'Local Organizer' : 
                  item.source === 'ai' ? 'AI Generated' : 'Event Organizer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: item.source || 'app',
        url: item.url || 'https://example.com/event'
      }
    })
    // Removed the 100 event limit to show all events
  

  return result
}

// Function to fetch and load events from the JSON file
export const loadEventsFromFile = async (): Promise<Event[]> => {
  try {
    const response = await fetch('/events-user.json')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array')
    }
    
    const transformedEvents = transformImportedEvents(data)
    return transformedEvents
  } catch (error) {
    console.error('Error in loadEventsFromFile:', error)
    throw error
  }
}

// New function to load AI events from external file
export const loadAIEventsFromFile = async (): Promise<Event[]> => {
  try {
    // For React Native/Expo, we need to use a different approach
    // We'll copy the file to the public directory first
    const response = await fetch('/ai-events.json')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!Array.isArray(data)) {
      throw new Error('AI events data is not an array')
    }
    
    // Mark all events as AI source
    const aiEvents = data.map((event: ImportedEvent) => ({
      ...event,
      source: 'ai'
    }))
    
    const transformedEvents = transformImportedEvents(aiEvents)
    return transformedEvents
  } catch (error) {
    console.error('Error in loadAIEventsFromFile:', error)
    throw error
  }
}

// Function to combine all event sources
export const loadAllEvents = async (): Promise<Event[]> => {
  try {
    // Load regular events
    const regularEvents = await loadEventsFromFile()
    
    // Load AI events
    let aiEvents: Event[] = []
    try {
      aiEvents = await loadAIEventsFromFile()
    } catch (error) {
      // Continue without AI events if they're not available
    }
    
    // Combine all events
    const allEvents = [...regularEvents, ...aiEvents]
    
    return allEvents
  } catch (error) {
    console.error('Error in loadAllEvents:', error)
    throw error
  }
}
