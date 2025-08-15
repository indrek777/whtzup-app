// Geocoding utility using local Nominatim server
// Configured for Estonia-wide coverage (57.5°N to 59.7°N, 21.5°E to 28.2°E)
// Covers all of Estonia including: Tallinn, Tartu, Pärnu, Narva, Kohtla-Järve, Viljandi, Rakvere, Maardu, Kuressaare, Sillamäe, Valga, Võru, Jõhvi, Haapsalu, Keila, Paide, Tapa, Põlva, Jõgeva, Türi, Elva, Saue, Põltsamaa, Paldiski, Sindi, Kunda, Kärdla, Loksa, Tõrva, Kiviõli, Antsla, Mustvee, Lihula, Otepää, Kehra, Abja-Paluoja, Suure-Jaani, Kallaste, Mõisaküla, Võhma, and all rural areas
const NOMINATIM_BASE_URL = 'http://localhost:7070'

export interface GeocodingResult {
  lat: string
  lon: string
  display_name: string
  type: string
}

export interface GeocodingSearchResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  boundingbox: string[]
  lat: string
  lon: string
  display_name: string
  class: string
  type: string
  importance: number
  icon?: string
}

// Search for addresses/places using Nominatim - Estonia-wide
export const searchAddress = async (query: string): Promise<GeocodingSearchResult[]> => {
  try {
    const encodedQuery = encodeURIComponent(query)
    
    // Estonia bounding box: [min_lat, max_lat, min_lon, max_lon]
    // Estonia coordinates: approximately 57.5°N to 59.7°N, 21.5°E to 28.2°E
    const estoniaBounds = '57.5,59.7,21.5,28.2'
    
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodedQuery}&format=json&limit=10&addressdetails=1&countrycodes=ee&viewbox=${estoniaBounds}&bounded=1`
    )
    
    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`)
    }
    
    const results = await response.json()
    
    // Filter results to ensure they're within Estonia
    const estoniaResults = results.filter((result: GeocodingSearchResult) => {
      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)
      return lat >= 57.5 && lat <= 59.7 && lon >= 21.5 && lon <= 28.2
    })
    
    return estoniaResults.slice(0, 5) // Return top 5 results
  } catch (error) {
    console.error('Error searching address:', error)
    return []
  }
}

// Reverse geocode coordinates to get address
export const reverseGeocode = async (lat: number, lon: number): Promise<GeocodingResult | null> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
    )
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding request failed: ${response.status}`)
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

// Get coordinates for a specific address - Estonia-wide
export const getCoordinates = async (address: string): Promise<[number, number] | null> => {
  try {
    const results = await searchAddress(address)
    
    if (results.length > 0) {
      const firstResult = results[0]
      const lat = parseFloat(firstResult.lat)
      const lon = parseFloat(firstResult.lon)
      
      // Double-check that coordinates are within Estonia
      if (lat >= 57.5 && lat <= 59.7 && lon >= 21.5 && lon <= 28.2) {
        return [lat, lon]
      }
    }
    
    // If no Estonia results found, try a broader search but still prioritize Estonia
    const encodedQuery = encodeURIComponent(`${address}, Estonia`)
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodedQuery}&format=json&limit=3&addressdetails=1&countrycodes=ee`
    )
    
    if (response.ok) {
      const fallbackResults = await response.json()
      if (fallbackResults.length > 0) {
        const result = fallbackResults[0]
        const lat = parseFloat(result.lat)
        const lon = parseFloat(result.lon)
        return [lat, lon]
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting coordinates:', error)
    return null
  }
}

// Format display name for better readability
export const formatDisplayName = (displayName: string): string => {
  // Remove country and postal code for cleaner display
  const parts = displayName.split(', ')
  if (parts.length > 3) {
    return parts.slice(0, -2).join(', ')
  }
  return displayName
}

// Search specifically for Estonian cities and regions
export const searchEstonianPlaces = async (query: string): Promise<GeocodingSearchResult[]> => {
  try {
    const encodedQuery = encodeURIComponent(query)
    
    // Estonia bounding box with broader search
    const estoniaBounds = '57.5,59.7,21.5,28.2'
    
    // Search with Estonia-specific parameters
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodedQuery}&format=json&limit=15&addressdetails=1&countrycodes=ee&viewbox=${estoniaBounds}&bounded=1&featuretype=city,town,village,suburb,neighbourhood`
    )
    
    if (!response.ok) {
      throw new Error(`Estonian places search failed: ${response.status}`)
    }
    
    const results = await response.json()
    
    // Filter and prioritize results
    const estoniaResults = results.filter((result: GeocodingSearchResult) => {
      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)
      return lat >= 57.5 && lat <= 59.7 && lon >= 21.5 && lon <= 28.2
    })
    
    // Sort by importance (higher importance first)
    estoniaResults.sort((a: GeocodingSearchResult, b: GeocodingSearchResult) => b.importance - a.importance)
    
    return estoniaResults.slice(0, 10)
  } catch (error) {
    console.error('Error searching Estonian places:', error)
    return []
  }
}

// Interface for events that need geocoding
export interface EventNeedingGeocoding {
  id: string
  title: string
  description: string
  category: string
  location_name: string
  location_address: string
  current_lat: number
  current_lon: number
  date: string
  time: string
  organizer: string
  attendees: number
  maxAttendees?: number
  needs_geocoding: boolean
}

// Interface for geocoded event data from CSV
export interface GeocodedEventData {
  id: string
  title: string
  description: string
  category: string
  location_name: string
  location_address: string
  lat: number
  lon: number
  date: string
  time: string
  organizer: string
  attendees: number
  maxAttendees?: number
}

// Download events that need geocoding as CSV
export const downloadEventsForGeocoding = (events: any[]): void => {
  // Filter events that need geocoding
  const eventsNeedingGeocoding = events.filter(event => {
    const [lat, lng] = event.location.coordinates
    return (
      (lat === 59.436962 && lng === 24.753574) || // Default Tallinn coordinates
      isNaN(lat) || isNaN(lng) ||
      lat === 0 || lng === 0
    )
  })

  if (eventsNeedingGeocoding.length === 0) {
    alert('No events need geocoding! All events already have proper coordinates.')
    return
  }

  // Convert to CSV format
  const csvData = eventsNeedingGeocoding.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    location_name: event.location.name,
    location_address: event.location.address,
    current_lat: event.location.coordinates[0],
    current_lon: event.location.coordinates[1],
    date: event.date,
    time: event.time,
    organizer: event.organizer,
    attendees: event.attendees,
    maxAttendees: event.maxAttendees || '',
    needs_geocoding: 'TRUE'
  } as Record<string, any>))

  // Create CSV content
  const headers = [
    'id', 'title', 'description', 'category', 'location_name', 'location_address',
    'current_lat', 'current_lon', 'lat', 'lon', 'date', 'time', 'organizer',
    'attendees', 'maxAttendees', 'needs_geocoding'
  ]

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => 
      headers.map(header => {
        const value = row[header] || ''
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `events-needing-geocoding-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  alert(`Downloaded ${eventsNeedingGeocoding.length} events that need geocoding. Please add 'lat' and 'lon' columns with proper coordinates.`)
}

// Parse and validate geocoded CSV data
export const parseGeocodedCSV = (csvText: string): GeocodedEventData[] => {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const requiredHeaders = ['id', 'lat', 'lon']
  
  // Check for required headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required column: ${required}`)
    }
  }

  const results: GeocodedEventData[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV line (handle quoted values)
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"'
          j++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Add last value

    if (values.length < headers.length) {
      console.warn(`Skipping line ${i + 1}: insufficient columns`)
      continue
    }

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    // Validate coordinates
    const lat = parseFloat(row.lat)
    const lon = parseFloat(row.lon)
    
    if (isNaN(lat) || isNaN(lon)) {
      console.warn(`Skipping line ${i + 1}: invalid coordinates (${row.lat}, ${row.lon})`)
      continue
    }

    // Validate coordinates are valid (accept worldwide coordinates)
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn(`Skipping line ${i + 1}: invalid coordinates (${lat}, ${lon})`)
      continue
    }

    results.push({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      category: row.category || 'other',
      location_name: row.location_name || '',
      location_address: row.location_address || '',
      lat,
      lon,
      date: row.date || '',
      time: row.time || '',
      organizer: row.organizer || '',
      attendees: parseInt(row.attendees) || 0,
      maxAttendees: row.maxAttendees ? parseInt(row.maxAttendees) : undefined
    })
  }

  return results
}

// Merge geocoded data with existing events
export const mergeGeocodedData = (existingEvents: any[], geocodedData: GeocodedEventData[]): { events: any[], updatedCount: number, newEventsCount: number } => {
  const updatedEvents = [...existingEvents]
  const updatedIds = new Set<string>()

  geocodedData.forEach(geocodedEvent => {
    const existingIndex = updatedEvents.findIndex(event => event.id === geocodedEvent.id)
    
    if (existingIndex !== -1) {
      // Update existing event with new coordinates
      updatedEvents[existingIndex] = {
        ...updatedEvents[existingIndex],
        location: {
          ...updatedEvents[existingIndex].location,
          coordinates: [geocodedEvent.lat, geocodedEvent.lon]
        }
      }
      updatedIds.add(geocodedEvent.id)
    } else {
      // Create new event if it doesn't exist
      const newEvent = {
        id: geocodedEvent.id,
        title: geocodedEvent.title,
        description: geocodedEvent.description,
        category: geocodedEvent.category,
        location: {
          name: geocodedEvent.location_name,
          address: geocodedEvent.location_address,
          coordinates: [geocodedEvent.lat, geocodedEvent.lon]
        },
        date: geocodedEvent.date,
        time: geocodedEvent.time,
        organizer: geocodedEvent.organizer,
        attendees: geocodedEvent.attendees,
        maxAttendees: geocodedEvent.maxAttendees,
        rating: undefined,
        userRating: undefined
      }
      updatedEvents.push(newEvent)
      updatedIds.add(geocodedEvent.id)
    }
  })

  return {
    events: updatedEvents,
    updatedCount: updatedIds.size,
    newEventsCount: geocodedData.length - updatedEvents.filter(e => existingEvents.some(existing => existing.id === e.id)).length
  }
}
