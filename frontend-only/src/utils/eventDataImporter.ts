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
  
  // Estonian language patterns
  const estonianPatterns = {
    'music': ['kontsert', 'muusika', 'laulmine', 'bänd', 'ansambel', 'ooper', 'sümfoonia', 'jazz', 'rokk', 'pop', 'klassikaline', 'orkester', 'koor', 'kitarr', 'klaver'],
    'theater': ['teater', 'lavastus', 'etendus', 'näidend', 'drama', 'komöödia', 'balet', 'tants'],
    'art': ['näitus', 'galerii', 'kunst', 'maal', 'skulptuur', 'foto', 'kunstnik', 'looming', 'arhitektuur', 'keraamika', 'fotograafia'],
    'sports': ['sport', 'võistlus', 'jooks', 'ujumine', 'jalgratas', 'tennis', 'korvpall', 'jalgpall', 'orienteerumine', 'triatlon', 'maastik', 'jää', 'mäng', 'liiga', 'staadion', 'arena', 'kardisõit', 'rattaõhtud'],
    'education': ['koolitus', 'seminar', 'loeng', 'õpituba', 'workshop', 'kursus', 'haridus'],
    'food': ['toit', 'restoran', 'kohvik', 'söök', 'jook', 'vein', 'õlu', 'kokandus', 'turg', 'kokteili', 'õhtusöök', 'pakett'],
    'cultural': ['kultuur', 'traditsioon', 'pärand', 'ajalugu', 'muuseum', 'festival', 'päev'],
    'nature & environment': ['loodus', 'keskkond', 'mets', 'park', 'õues', 'looduskaitse', 'öko'],
    'health & wellness': ['tervis', 'heaolu', 'jooga', 'meditatsion', 'massaaž', 'wellness', 'ravi', 'häälejooga', 'gongihüpnorännakute'],
    'family & kids': ['lapsed', 'pere', 'laste', 'mudilased', 'noored', 'mäng'],
    'business': ['äri', 'konverents', 'kohtumine', 'võrgustumine', 'ettevõtlus', 'töötuba', 'networking'],
    'technology': ['tehnoloogia', 'IT', 'programmeerimine', 'arvuti', 'digitaal']
  }
  
  // Check Estonian patterns first
  for (const [category, patterns] of Object.entries(estonianPatterns)) {
    if (patterns.some(pattern => text.includes(pattern))) {
      return category as Event['category']
    }
  }
  
  // Music categories (English + specific terms)
  if (text.includes('concert') || text.includes('music') || text.includes('symphony')) {
    return 'music'
  } else if (text.includes('jazz') || text.includes('rock') || text.includes('pop') || text.includes('classical')) {
    return 'music'
  } else if (text.includes('opera') || text.includes('orchestra') || text.includes('band')) {
    return 'music'
  } else if (text.includes('live') && (text.includes('music') || text.includes('performance'))) {
    return 'music'
  }
  
  // Sports categories
  else if (text.includes('football') || text.includes('soccer') || text.includes('match') || text.includes('game')) {
    return 'sports'
  } else if (text.includes('basketball') || text.includes('volleyball') || text.includes('tennis')) {
    return 'sports'
  } else if (text.includes('running') || text.includes('marathon') || text.includes('race')) {
    return 'sports'
  } else if (text.includes('swimming') || text.includes('gym') || text.includes('fitness')) {
    return 'sports'
  } else if (text.includes('cycling') || text.includes('bike')) {
    return 'sports'
  } else if (text.includes('hiking') || text.includes('climbing')) {
    return 'sports'
  }
  
  // Health & Wellness (check before generic outdoor activities)
  else if (text.includes('yoga') || text.includes('pilates') || text.includes('workout')) {
    return 'health & wellness'
  } else if (text.includes('beach yoga') || text.includes('outdoor yoga')) {
    return 'health & wellness'
  } else if (text.includes('meditation') || text.includes('mindfulness')) {
    return 'health & wellness'
  }
  
  // Outdoor activities
  else if (text.includes('outdoor music') || text.includes('outdoor meditation')) {
    return 'entertainment'
  } else if (text.includes('beach volleyball') || text.includes('beach running')) {
    return 'sports'
  } else if (text.includes('stand-up paddleboarding') || text.includes('paddleboarding')) {
    return 'sports'
  } else if (text.includes('kayaking') || text.includes('canoeing')) {
    return 'sports'
  } else if (text.includes('sailing') || text.includes('boating')) {
    return 'sports'
  } else if (text.includes('wildlife watching') || text.includes('bird watching')) {
    return 'nature & environment'
  } else if (text.includes('beach cleanup') || text.includes('environmental')) {
    return 'nature & environment'
  } else if (text.includes('urban sketching') || text.includes('outdoor chess')) {
    return 'entertainment'
  } else if (text.includes('tide pool exploration') || text.includes('tree climbing')) {
    return 'nature & environment'
  } else if (text.includes('rock climbing') || text.includes('bouldering')) {
    return 'sports'
  } else if (text.includes('sunset watching') || text.includes('park picnic')) {
    return 'entertainment'
  } else if (text.includes('mountaineering') || text.includes('wilderness camping')) {
    return 'sports'
  } else if (text.includes('surfing lessons') || text.includes('surfing')) {
    return 'sports'
  }
  
  // Theater & Performance
  else if (text.includes('theater') || text.includes('theatre') || text.includes('performance') || text.includes('ballet')) {
    return 'theater'
  } else if (text.includes('dance') || text.includes('play')) {
    return 'theater'
  } else if (text.includes('musical') || text.includes('drama') || text.includes('acting')) {
    return 'theater'
  }
  
  // Art & Culture
  else if (text.includes('museum') || text.includes('exhibition') || text.includes('näitus')) {
    return 'art'
  } else if (text.includes('gallery') || text.includes('painting') || text.includes('sculpture')) {
    return 'art'
  } else if (text.includes('photography') || text.includes('art') || text.includes('creative')) {
    return 'art'
  }
  
  // Entertainment (Cinema, etc.)
  else if (text.includes('cinema') || text.includes('movie') || text.includes('film')) {
    return 'entertainment'
  } else if (text.includes('magic') || text.includes('circus') || text.includes('variety')) {
    return 'entertainment'
  }
  
  // Comedy
  else if (text.includes('comedy') || text.includes('stand-up') || text.includes('humor')) {
    return 'comedy'
  }
  
  // Food & Drink
  else if (text.includes('food') || text.includes('restaurant') || text.includes('dining')) {
    return 'food'
  } else if (text.includes('wine') || text.includes('beer') || text.includes('cocktail')) {
    return 'food'
  } else if (text.includes('cooking') || text.includes('chef') || text.includes('culinary')) {
    return 'food'
  } else if (text.includes('tasting') || text.includes('market')) {
    return 'food'
  } else if (text.includes('festival') && (text.includes('food') || text.includes('culinary'))) {
    return 'food'
  }
  
  // Education & Learning
  else if (text.includes('workshop') || text.includes('seminar') || text.includes('course')) {
    return 'education'
  } else if (text.includes('training') || text.includes('education') || text.includes('learning')) {
    return 'education'
  } else if (text.includes('lecture') || text.includes('class') || text.includes('tutorial')) {
    return 'education'
  }
  
  // Business & Professional
  else if (text.includes('conference') || text.includes('meeting') || text.includes('networking')) {
    return 'business'
  } else if (text.includes('business') || text.includes('corporate') || text.includes('professional')) {
    return 'business'
  }
  
  // Technology
  else if (text.includes('tech') || text.includes('technology') || text.includes('digital')) {
    return 'technology'
  } else if (text.includes('startup') || text.includes('innovation') || text.includes('ai')) {
    return 'technology'
  } else if (text.includes('coding') || text.includes('programming') || text.includes('hackathon')) {
    return 'technology'
  }
  
  // Family & Kids
  else if (text.includes('kids') || text.includes('children') || text.includes('family')) {
    return 'family & kids'
  } else if (text.includes('playground') || text.includes('toy') || text.includes('story')) {
    return 'family & kids'
  }
  
  // Health & Wellness (additional patterns)
  else if (text.includes('health') || text.includes('wellness') || text.includes('medical')) {
    return 'health & wellness'
  } else if (text.includes('therapy') || text.includes('healing')) {
    return 'health & wellness'
  }
  
  // Cultural & Heritage
  else if (text.includes('cultural') || text.includes('heritage') || text.includes('traditional')) {
    return 'cultural'
  } else if (text.includes('ball') || text.includes('ceremony') || text.includes('celebration')) {
    return 'cultural'
  } else if (text.includes('festival') || text.includes('holiday') || text.includes('custom')) {
    return 'cultural'
  }
  
  // Nightlife
  else if (text.includes('club') || text.includes('party') || text.includes('nightlife')) {
    return 'nightlife'
  } else if (text.includes('bar') || text.includes('pub') || text.includes('dance')) {
    return 'nightlife'
  }
  
  // Charity & Community
  else if (text.includes('charity') || text.includes('volunteer') || text.includes('community')) {
    return 'charity & community'
  } else if (text.includes('fundraiser') || text.includes('donation') || text.includes('help')) {
    return 'charity & community'
  }
  
  // Fashion & Beauty
  else if (text.includes('fashion') || text.includes('beauty') || text.includes('style')) {
    return 'fashion & beauty'
  } else if (text.includes('makeup') || text.includes('cosmetic') || text.includes('design')) {
    return 'fashion & beauty'
  }
  
  // Science & Education
  else if (text.includes('science') || text.includes('research') || text.includes('lecture')) {
    return 'science & education'
  } else if (text.includes('university') || text.includes('academic') || text.includes('study')) {
    return 'science & education'
  }
  
  // Nature & Environment
  else if (text.includes('nature') || text.includes('environment') || text.includes('eco')) {
    return 'nature & environment'
  } else if (text.includes('park') || text.includes('garden') || text.includes('outdoor')) {
    return 'nature & environment'
  }
  
  // Gaming & Entertainment
  else if (text.includes('game') || text.includes('gaming') || text.includes('esports')) {
    return 'gaming & entertainment'
  } else if (text.includes('board') || text.includes('card') || text.includes('tournament')) {
    return 'gaming & entertainment'
  }
  
  // Default fallback
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
        category: (item as any).category || determineCategory(item.name, item.description),
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
    // For React Native/Expo, we need to use a different approach
    // We'll import the data directly or use a different method
    console.log('Loading events from file...')
    
    // For now, return empty array to avoid network request errors
    // TODO: Implement proper file loading for React Native
    console.log('Skipping local file load for React Native - using backend data only')
    return []
  } catch (error) {
    console.error('Error in loadEventsFromFile:', error)
    throw error
  }
}

// New function to load AI events from external file
export const loadAIEventsFromFile = async (): Promise<Event[]> => {
  try {
    // For React Native/Expo, we need to use a different approach
    // We'll import the data directly or use a different method
    console.log('Loading AI events from file...')
    
    // For now, return empty array to avoid network request errors
    // TODO: Implement proper file loading for React Native
    console.log('Skipping AI events file load for React Native - using backend data only')
    return []
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
