import { Event } from '../context/EventContext'

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
      text.includes('ooper') || text.includes('sümfoonia')) {
    return 'music'
  }
  
  // Food events
  if (text.includes('söök') || text.includes('restoran') || text.includes('kohvik') ||
      text.includes('vein') || text.includes('kokteili') || text.includes('õhtusöök') ||
      text.includes('pakett') || text.includes('dinner')) {
    return 'food'
  }
  
  // Sports events
  if (text.includes('jalgpall') || text.includes('spordi') || text.includes('jää') ||
      text.includes('võistlus') || text.includes('mäng') || text.includes('liiga') ||
      text.includes('staadion') || text.includes('arena') || text.includes('kardisõit')) {
    return 'sports'
  }
  
  // Art events
  if (text.includes('näitus') || text.includes('galerii') || text.includes('kunst') ||
      text.includes('muuseum') || text.includes('arhitektuur') || text.includes('keraamika') ||
      text.includes('fotograafia') || text.includes('skulptuur')) {
    return 'art'
  }
  
  // Business events
  if (text.includes('konverents') || text.includes('festival') || text.includes('konverents') ||
      text.includes('seminar') || text.includes('workshop') || text.includes('töötuba') ||
      text.includes('networking') || text.includes('konverents')) {
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
      dateStr = parts[0]
      const timeStr = parts[1] || '12:00'
      return { date: dateStr, time: timeStr }
    }
    
    // If it's just a date, use default time
    return { date: dateStr, time: '12:00' }
  } catch (error) {
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
  console.log(`Starting transformation of ${importedData.length} imported events`)
  
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
        title: item.name,
        description: item.description || `Event at ${item.address || item.venue || 'various locations'}`,
        category: determineCategory(item.name, item.description),
        location: {
          name: item.venue || item.address || 'Various locations',
          address: item.address || item.venue || 'Location TBD',
          coordinates: [Number(item.latitude), Number(item.longitude)] as [number, number]
        },
        date,
        time,
        organizer: item.source === 'csv' ? 'Local Organizer' : 'Event Organizer',
        attendees,
        maxAttendees
      }
    })
    // Removed the 100 event limit to show all events
  
  console.log(`Transformed ${importedData.length} imported events to ${result.length} valid events`)
  console.log(`Filtered out: ${invalidCoordinates} invalid coordinates, ${invalidNames} invalid names, ${oldEvents} old events`)
  return result
}

// Function to fetch and load events from the JSON file
export const loadEventsFromFile = async (): Promise<Event[]> => {
  try {
    console.log('Starting to load events from file...')
    const response = await fetch('/events-user.json')
    console.log('Fetch response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Raw data loaded:', data)
    console.log('Data type:', typeof data)
    console.log('Data length:', Array.isArray(data) ? data.length : 'Not an array')
    
    if (!Array.isArray(data)) {
      console.error('Data is not an array:', data)
      throw new Error('Data is not an array')
    }
    
    const transformedEvents = transformImportedEvents(data)
    console.log('Transformation completed, returning', transformedEvents.length, 'events')
    return transformedEvents
  } catch (error) {
    console.error('Error in loadEventsFromFile:', error)
    throw error
  }
}
