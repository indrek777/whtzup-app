import AsyncStorage from '@react-native-async-storage/async-storage'

// Rating interfaces
export interface EventRating {
  eventId: string
  rating: number
  timestamp: number
  review?: string
  userId?: string // For backend tracking
}

export interface SharedRating {
  eventId: string
  averageRating: number
  totalRatings: number
  ratings: EventRating[]
}

// Backend API configuration
// Set to null to disable backend connection for now
const API_BASE_URL = null // 'https://your-backend-api.com/api' // Replace with your actual backend URL
const API_ENDPOINTS = {
  ratings: '/ratings',
  events: '/events',
  userRatings: '/user-ratings'
}

// Local storage keys
const STORAGE_KEYS = {
  userRatings: 'userEventRatings',
  sharedRatings: 'sharedEventRatings',
  lastSync: 'lastRatingSync'
}

class RatingService {
  // Save rating to both local storage and backend
  async saveRating(eventId: string, rating: number, review?: string): Promise<boolean> {
    try {
      const newRating: EventRating = {
        eventId,
        rating,
        timestamp: Date.now(),
        review,
        userId: await this.getUserId()
      }

      // Save to local storage immediately
      await this.saveToLocalStorage(eventId, newRating)

      // Try to save to backend (with fallback) - only if backend is configured
      if (API_BASE_URL) {
        try {
          await this.saveToBackend(newRating)
          console.log('Rating saved to backend successfully')
        } catch (backendError) {
          console.log('Backend save failed, rating saved locally only:', backendError)
          // Store for later sync
          await this.queueForSync(newRating)
        }
      } else {
        console.log('Backend not configured - rating saved locally only')
      }

      return true
    } catch (error) {
      console.error('Error saving rating:', error)
      return false
    }
  }

  // Get user's rating for a specific event
  async getUserRating(eventId: string): Promise<EventRating | null> {
    try {
      const ratings = await this.getLocalRatings()
      return ratings[eventId] || null
    } catch (error) {
      console.error('Error getting user rating:', error)
      return null
    }
  }

  // Get shared ratings for an event (from backend)
  async getSharedRatings(eventId: string): Promise<SharedRating | null> {
    try {
      // Try to get from backend first - only if backend is configured
      if (API_BASE_URL) {
        try {
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ratings}/${eventId}`)
          if (response.ok) {
            const data = await response.json()
            // Cache the result locally
            await this.cacheSharedRating(eventId, data)
            return data
          }
        } catch (backendError) {
          console.log('Backend fetch failed, using cached data:', backendError)
        }
      }

      // Fallback to cached data
      return await this.getCachedSharedRating(eventId)
    } catch (error) {
      console.error('Error getting shared ratings:', error)
      return null
    }
  }

  // Get all shared ratings (for offline use)
  async getAllSharedRatings(): Promise<{ [eventId: string]: SharedRating }> {
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.sharedRatings)
      return cachedData ? JSON.parse(cachedData) : {}
    } catch (error) {
      console.error('Error getting all shared ratings:', error)
      return {}
    }
  }

  // Sync local ratings with backend
  async syncRatings(): Promise<void> {
    // Skip sync if backend is not configured
    if (!API_BASE_URL) {
      console.log('Backend not configured - skipping sync')
      return
    }

    try {
      const pendingRatings = await this.getPendingSync()
      if (pendingRatings.length === 0) return

      console.log(`Syncing ${pendingRatings.length} ratings to backend...`)

      for (const rating of pendingRatings) {
        try {
          await this.saveToBackend(rating)
          await this.removeFromSyncQueue(rating)
        } catch (error) {
          console.error('Failed to sync rating:', error)
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(STORAGE_KEYS.lastSync, Date.now().toString())
    } catch (error) {
      console.error('Error syncing ratings:', error)
    }
  }

  // Private methods

  private async saveToLocalStorage(eventId: string, rating: EventRating): Promise<void> {
    const ratings = await this.getLocalRatings()
    ratings[eventId] = rating
    await AsyncStorage.setItem(STORAGE_KEYS.userRatings, JSON.stringify(ratings))
  }

  private async saveToBackend(rating: EventRating): Promise<void> {
    if (!API_BASE_URL) {
      throw new Error('Backend not configured')
    }

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ratings}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rating)
    })

    if (!response.ok) {
      throw new Error(`Backend save failed: ${response.status}`)
    }
  }

  private async queueForSync(rating: EventRating): Promise<void> {
    try {
      const pending = await this.getPendingSync()
      pending.push(rating)
      await AsyncStorage.setItem('pendingRatingSync', JSON.stringify(pending))
    } catch (error) {
      console.error('Error queuing for sync:', error)
    }
  }

  private async getPendingSync(): Promise<EventRating[]> {
    try {
      const pending = await AsyncStorage.getItem('pendingRatingSync')
      return pending ? JSON.parse(pending) : []
    } catch (error) {
      return []
    }
  }

  private async removeFromSyncQueue(rating: EventRating): Promise<void> {
    try {
      const pending = await this.getPendingSync()
      const filtered = pending.filter(r => 
        r.eventId !== rating.eventId || r.timestamp !== rating.timestamp
      )
      await AsyncStorage.setItem('pendingRatingSync', JSON.stringify(filtered))
    } catch (error) {
      console.error('Error removing from sync queue:', error)
    }
  }

  private async getLocalRatings(): Promise<{ [eventId: string]: EventRating }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.userRatings)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      return {}
    }
  }

  private async cacheSharedRating(eventId: string, data: SharedRating): Promise<void> {
    try {
      const cached = await this.getAllSharedRatings()
      cached[eventId] = data
      await AsyncStorage.setItem(STORAGE_KEYS.sharedRatings, JSON.stringify(cached))
    } catch (error) {
      console.error('Error caching shared rating:', error)
    }
  }

  private async getCachedSharedRating(eventId: string): Promise<SharedRating | null> {
    try {
      const cached = await this.getAllSharedRatings()
      return cached[eventId] || null
    } catch (error) {
      return null
    }
  }

  private async getUserId(): Promise<string> {
    // In a real app, this would come from authentication
    // For now, generate a unique device ID
    try {
      let userId = await AsyncStorage.getItem('deviceUserId')
      if (!userId) {
        userId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await AsyncStorage.setItem('deviceUserId', userId)
      }
      return userId
    } catch (error) {
      return `device_${Date.now()}`
    }
  }
}

export const ratingService = new RatingService()
