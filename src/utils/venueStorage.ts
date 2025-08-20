// Venue storage utility for managing venue coordinates
// This helps maintain consistency and reduces repeated geocoding

import AsyncStorage from '@react-native-async-storage/async-storage'

export interface VenueData {
  name: string
  address: string
  coordinates: [number, number]
  lastUsed: number // timestamp
  usageCount: number
}

const VENUE_STORAGE_KEY = 'event_venues'
const DEFAULT_COORDINATES: [number, number] = [59.436962, 24.753574] // Tallinn

// Load venues from AsyncStorage
export const loadVenues = async (): Promise<Map<string, VenueData>> => {
  try {
    const stored = await AsyncStorage.getItem(VENUE_STORAGE_KEY)
    if (!stored) return new Map()
    
    const venuesArray = JSON.parse(stored)
    const venuesMap = new Map<string, VenueData>()
    
    venuesArray.forEach(([key, venue]: [string, VenueData]) => {
      venuesMap.set(key, venue)
    })
    
    return venuesMap
  } catch (error) {
    console.error('Error loading venues:', error)
    return new Map()
  }
}

// Save venues to AsyncStorage
export const saveVenues = async (venues: Map<string, VenueData>): Promise<void> => {
  try {
    const venuesArray = Array.from(venues.entries())
    await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(venuesArray))
  } catch (error) {
    console.error('Error saving venues:', error)
  }
}

// Get venue key (normalized name for consistent lookup)
export const getVenueKey = (name: string): string => {
  return name.toLowerCase().trim()
}

// Check if coordinates are default/unknown
export const isDefaultCoordinates = (coordinates: [number, number]): boolean => {
  const [lat, lng] = coordinates
  return (
    (lat === DEFAULT_COORDINATES[0] && lng === DEFAULT_COORDINATES[1]) ||
    isNaN(lat) || isNaN(lng) ||
    lat === 0 || lng === 0
  )
}

// Add or update a venue in storage
export const addVenue = async (name: string, address: string, coordinates: [number, number]): Promise<void> => {
  if (!name.trim()) return
  
  const venues = await loadVenues()
  const key = getVenueKey(name)
  const now = Date.now()
  
  const existingVenue = venues.get(key)
  
  if (existingVenue) {
    // Update existing venue
    venues.set(key, {
      ...existingVenue,
      address: address || existingVenue.address,
      coordinates: isDefaultCoordinates(existingVenue.coordinates) ? coordinates : existingVenue.coordinates,
      lastUsed: now,
      usageCount: existingVenue.usageCount + 1
    })
  } else {
    // Add new venue
    venues.set(key, {
      name: name.trim(),
      address: address || '',
      coordinates,
      lastUsed: now,
      usageCount: 1
    })
  }
  
  await saveVenues(venues)
}

// Find a venue by name
export const findVenue = async (name: string): Promise<VenueData | null> => {
  if (!name.trim()) return null
  
  const venues = await loadVenues()
  const key = getVenueKey(name)
  return venues.get(key) || null
}

// Get venue coordinates, returning null if not found or has default coordinates
export const getVenueCoordinates = (name: string): [number, number] | null => {
  const venue = findVenue(name)
  if (!venue || isDefaultCoordinates(venue.coordinates)) {
    return null
  }
  return venue.coordinates
}

// Auto-fix venue coordinates if they're default/unknown
export const autoFixVenueCoordinates = (name: string, currentCoordinates: [number, number]): [number, number] => {
  if (!isDefaultCoordinates(currentCoordinates)) {
    return currentCoordinates
  }
  
  const storedCoordinates = getVenueCoordinates(name)
  if (storedCoordinates) {
    return storedCoordinates
  }
  
  return currentCoordinates
}

// Get all venues sorted by usage (most used first)
export const getAllVenues = async (): Promise<VenueData[]> => {
  const venues = await loadVenues()
  return Array.from(venues.values())
    .sort((a, b) => b.usageCount - a.usageCount)
}

// Get venues that need geocoding (have default coordinates)
export const getVenuesNeedingGeocoding = async (): Promise<VenueData[]> => {
  const venues = await loadVenues()
  return Array.from(venues.values())
    .filter(venue => isDefaultCoordinates(venue.coordinates))
    .sort((a, b) => b.usageCount - a.usageCount)
}

// Update venue coordinates (for geocoding results)
export const updateVenueCoordinates = async (name: string, coordinates: [number, number]): Promise<boolean> => {
  if (!name.trim() || isDefaultCoordinates(coordinates)) {
    return false
  }
  
  const venues = await loadVenues()
  const key = getVenueKey(name)
  const venue = venues.get(key)
  
  if (venue) {
    venues.set(key, {
      ...venue,
      coordinates,
      lastUsed: Date.now()
    })
    await saveVenues(venues)
    return true
  }
  
  return false
}

// Clear old/unused venues (older than 30 days and used less than 2 times)
export const cleanupOldVenues = async (): Promise<number> => {
  const venues = await loadVenues()
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  let removedCount = 0
  
  for (const [key, venue] of venues.entries()) {
    if (venue.lastUsed < thirtyDaysAgo && venue.usageCount < 2) {
      venues.delete(key)
      removedCount++
    }
  }
  
  if (removedCount > 0) {
    await saveVenues(venues)
  }
  
  return removedCount
}

// Export venues as CSV for backup/sharing
export const exportVenuesCSV = async (): Promise<string> => {
  const venues = await getAllVenues()
  
  const headers = ['name', 'address', 'lat', 'lon', 'usage_count', 'last_used']
  const csvContent = [
    headers.join(','),
    ...venues.map(venue => [
      `"${venue.name.replace(/"/g, '""')}"`,
      `"${venue.address.replace(/"/g, '""')}"`,
      venue.coordinates[0],
      venue.coordinates[1],
      venue.usageCount,
      new Date(venue.lastUsed).toISOString()
    ].join(','))
  ].join('\n')
  
  return csvContent
}

// Import venues from CSV
export const importVenuesCSV = async (csvText: string): Promise<{ success: number, errors: string[] }> => {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    return { success: 0, errors: ['CSV file is empty or has no data rows'] }
  }
  
  const headers = lines[0].split(',').map(h => h.trim())
  const requiredHeaders = ['name', 'lat', 'lon']
  
  // Check for required headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      return { success: 0, errors: [`Missing required column: ${required}`] }
    }
  }
  
  const errors: string[] = []
  let successCount = 0
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    try {
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
        errors.push(`Line ${i + 1}: insufficient columns`)
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
        errors.push(`Line ${i + 1}: invalid coordinates (${row.lat}, ${row.lon})`)
        continue
      }
      
      // Validate coordinates are within Estonia
      if (lat < 57.5 || lat > 59.7 || lon < 21.5 || lon > 28.2) {
        errors.push(`Line ${i + 1}: coordinates outside Estonia (${lat}, ${lon})`)
        continue
      }
      
      // Add venue
      await addVenue(
        row.name,
        row.address || '',
        [lat, lon]
      )
      
      successCount++
      
    } catch (error) {
      errors.push(`Line ${i + 1}: parsing error`)
    }
  }
  
  return { success: successCount, errors }
}

// Get venue statistics
export const getVenueStats = async (): Promise<{
  totalVenues: number
  venuesWithCoordinates: number
  venuesNeedingGeocoding: number
  mostUsedVenue: VenueData | null
}> => {
  const venues = await getAllVenues()
  const venuesWithCoordinates = venues.filter(v => !isDefaultCoordinates(v.coordinates)).length
  const venuesNeedingGeocoding = venues.filter(v => isDefaultCoordinates(v.coordinates)).length
  const mostUsedVenue = venues.length > 0 ? venues[0] : null
  
  return {
    totalVenues: venues.length,
    venuesWithCoordinates,
    venuesNeedingGeocoding,
    mostUsedVenue
  }
}
