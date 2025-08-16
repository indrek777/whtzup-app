import AsyncStorage from '@react-native-async-storage/async-storage'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  lastLogin: string
  subscription: Subscription
  preferences: UserPreferences
  stats: UserStats
}

export interface Subscription {
  status: 'free' | 'premium' | 'expired'
  plan: 'monthly' | 'yearly' | null
  startDate: string | null
  endDate: string | null
  autoRenew: boolean
  features: string[]
}

export interface UserPreferences {
  notifications: boolean
  emailUpdates: boolean
  defaultRadius: number
  favoriteCategories: string[]
  language: string
  theme: 'light' | 'dark' | 'auto'
}

export interface UserStats {
  eventsCreated: number
  eventsAttended: number
  ratingsGiven: number
  reviewsWritten: number
  totalEvents: number
  favoriteVenues: string[]
  // Add daily event tracking
  lastEventCreatedDate?: string
  eventsCreatedToday?: number
}

// Set to null to disable backend connection for now
const API_BASE_URL = null // 'http://localhost:3003/api' // Replace with your actual backend URL
const API_ENDPOINTS = {
  auth: '/auth',
  profile: '/profile',
  subscription: '/subscription',
  stats: '/stats'
}

const STORAGE_KEYS = {
  user: 'user_profile',
  authToken: 'auth_token',
  preferences: 'user_preferences',
  subscription: 'user_subscription'
}

class UserService {
  private currentUser: User | null = null
  private authToken: string | null = null

  constructor() {
    this.loadUserFromStorage()
  }

  // Initialize user from storage
  private async loadUserFromStorage() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.user)
      const tokenData = await AsyncStorage.getItem(STORAGE_KEYS.authToken)
      
      if (userData) {
        this.currentUser = JSON.parse(userData)
      }
      if (tokenData) {
        this.authToken = tokenData
      }
    } catch (error) {
      console.log('Error loading user from storage:', error)
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.authToken !== null
  }

  // Check if user has premium subscription
  hasPremiumSubscription(): boolean {
    if (!this.currentUser) return false
    
    const subscription = this.currentUser.subscription
    if (subscription.status !== 'premium') return false
    
    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate)
      const now = new Date()
      return endDate > now
    }
    
    return false
  }

  // Check if subscription is cancelled (auto-renew disabled)
  isSubscriptionCancelled(): boolean {
    if (!this.currentUser) return false
    return !this.currentUser.subscription.autoRenew
  }

  // Get subscription status
  getSubscriptionStatus(): Subscription {
    if (!this.currentUser) {
      return {
        status: 'free',
        plan: null,
        startDate: null,
        endDate: null,
        autoRenew: false,
        features: ['basic_search', 'basic_filtering', 'local_ratings']
      }
    }
    return this.currentUser.subscription
  }

  // Get premium features
  getPremiumFeatures(): string[] {
    const subscription = this.getSubscriptionStatus()
    if (subscription.status === 'premium') {
      return [
        'unlimited_events',
        'advanced_search',
        'priority_support',
        'analytics',
        'custom_categories',
        'export_data',
        'no_ads',
        'early_access'
      ]
    }
    return ['basic_search', 'basic_filtering', 'local_ratings']
  }

  // Sign up new user
  async signUp(email: string, password: string, name: string): Promise<boolean> {
    try {
      if (!API_BASE_URL) {
        // Create local user for demo
        const newUser: User = {
          id: `user_${Date.now()}`,
          email,
          name,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          subscription: {
            status: 'free',
            plan: null,
            startDate: null,
            endDate: null,
            autoRenew: false,
            features: ['basic_search', 'basic_filtering', 'local_ratings']
          },
          preferences: {
            notifications: true,
            emailUpdates: true,
            defaultRadius: 10,
            favoriteCategories: [],
            language: 'en',
            theme: 'auto'
          },
          stats: {
            eventsCreated: 0,
            eventsAttended: 0,
            ratingsGiven: 0,
            reviewsWritten: 0,
            totalEvents: 0,
            favoriteVenues: []
          }
        }

        this.currentUser = newUser
        this.authToken = `token_${Date.now()}`
        
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser))
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, this.authToken)
        
        console.log('User created locally:', newUser.email)
        return true
      }

      // Backend implementation would go here
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      if (response.ok) {
        const data = await response.json()
        this.currentUser = data.user
        this.authToken = data.token
        
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user))
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, data.token)
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error signing up:', error)
      return false
    }
  }

  // Sign in user
  async signIn(email: string, password: string): Promise<boolean> {
    try {
      if (!API_BASE_URL) {
        // Check if user exists locally
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.user)
        if (userData) {
          const user = JSON.parse(userData)
          if (user.email === email) {
            this.currentUser = user
            this.authToken = `token_${Date.now()}`
            await AsyncStorage.setItem(STORAGE_KEYS.authToken, this.authToken)
            
            // Update last login
            if (this.currentUser) {
              this.currentUser.lastLogin = new Date().toISOString()
            }
            await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
            
            console.log('User signed in locally:', email)
            return true
          }
        }
        return false
      }

      // Backend implementation would go here
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        this.currentUser = data.user
        this.authToken = data.token
        
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user))
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, data.token)
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error signing in:', error)
      return false
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    try {
      this.currentUser = null
      this.authToken = null
      
      await AsyncStorage.removeItem(STORAGE_KEYS.user)
      await AsyncStorage.removeItem(STORAGE_KEYS.authToken)
      
      console.log('User signed out')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<boolean> {
    try {
      if (!this.currentUser) return false

      const updatedUser = { ...this.currentUser, ...updates }
      this.currentUser = updatedUser
      
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser))
      
      if (API_BASE_URL) {
        // Backend sync would go here
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.profile}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`,
          },
          body: JSON.stringify(updates),
        })
        
        return response.ok
      }
      
      return true
    } catch (error) {
      console.error('Error updating profile:', error)
      return false
    }
  }

  // Update user preferences
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      if (!this.currentUser) return false

      const updatedPreferences = { ...this.currentUser.preferences, ...preferences }
      this.currentUser.preferences = updatedPreferences
      
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      return true
    } catch (error) {
      console.error('Error updating preferences:', error)
      return false
    }
  }

  // Subscribe to premium plan
  async subscribeToPremium(plan: 'monthly' | 'yearly'): Promise<boolean> {
    try {
      if (!this.currentUser) return false

      const now = new Date()
      const endDate = new Date()
      
      if (plan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }

      const subscription: Subscription = {
        status: 'premium',
        plan,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew: true,
        features: [
          'unlimited_events',
          'advanced_search',
          'priority_support',
          'analytics',
          'custom_categories',
          'export_data',
          'no_ads',
          'early_access'
        ]
      }

      this.currentUser.subscription = subscription
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      console.log(`User subscribed to ${plan} premium plan`)
      return true
    } catch (error) {
      console.error('Error subscribing to premium:', error)
      return false
    }
  }

  // Cancel subscription
  async cancelSubscription(): Promise<boolean> {
    try {
      if (!this.currentUser) {
        console.log('No current user found for subscription cancellation')
        return false
      }

      console.log('Cancelling subscription for user:', this.currentUser.email)
      console.log('Current subscription status:', this.currentUser.subscription.status)
      console.log('Current auto-renew status:', this.currentUser.subscription.autoRenew)

      // Set auto-renew to false
      this.currentUser.subscription.autoRenew = false
      
      // Check if subscription has already expired
      if (this.currentUser.subscription.endDate) {
        const endDate = new Date(this.currentUser.subscription.endDate)
        const now = new Date()
        
        console.log('Subscription end date:', endDate)
        console.log('Current date:', now)
        console.log('Is expired:', endDate <= now)
        
        if (endDate <= now) {
          // Subscription has already expired, downgrade to free immediately
          this.currentUser.subscription.status = 'expired'
          this.currentUser.subscription.features = ['basic_search', 'basic_filtering', 'local_ratings']
          console.log('Subscription marked as expired')
        } else {
          console.log('Subscription still active, auto-renew disabled')
        }
        // If subscription hasn't expired yet, keep premium status but disable auto-renew
        // User will lose access when endDate is reached
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      console.log('User cancelled subscription successfully')
      console.log('Final subscription status:', this.currentUser.subscription.status)
      console.log('Final auto-renew status:', this.currentUser.subscription.autoRenew)
      return true
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return false
    }
  }

  // Reactivate subscription
  async reactivateSubscription(): Promise<boolean> {
    try {
      if (!this.currentUser) return false

      // Re-enable auto-renew
      this.currentUser.subscription.autoRenew = true
      
      // If subscription was expired, reactivate it
      if (this.currentUser.subscription.status === 'expired') {
        const now = new Date()
        const endDate = new Date()
        
        // Set new end date based on current plan
        if (this.currentUser.subscription.plan === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1)
        } else if (this.currentUser.subscription.plan === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1)
        }
        
        this.currentUser.subscription.status = 'premium'
        this.currentUser.subscription.startDate = now.toISOString()
        this.currentUser.subscription.endDate = endDate.toISOString()
        this.currentUser.subscription.features = [
          'unlimited_events',
          'advanced_search',
          'priority_support',
          'analytics',
          'custom_categories',
          'export_data',
          'no_ads',
          'early_access'
        ]
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      console.log('User reactivated subscription')
      return true
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      return false
    }
  }

  // Update user stats
  async updateStats(updates: Partial<UserStats>): Promise<boolean> {
    try {
      if (!this.currentUser) return false

      const updatedStats = { ...this.currentUser.stats, ...updates }
      this.currentUser.stats = updatedStats
      
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      return true
    } catch (error) {
      console.error('Error updating stats:', error)
      return false
    }
  }

  // Get user stats
  getUserStats(): UserStats | null {
    return this.currentUser?.stats || null
  }

  // Check if feature is available
  hasFeature(feature: string): boolean {
    const subscription = this.getSubscriptionStatus()
    return subscription.features.includes(feature)
  }

  // Get subscription price
  getSubscriptionPrice(plan: 'monthly' | 'yearly'): number {
    const prices = {
      monthly: 9.99,
      yearly: 99.99
    }
    return prices[plan]
  }

  // Get subscription savings
  getSubscriptionSavings(): number {
    const monthlyPrice = this.getSubscriptionPrice('monthly')
    const yearlyPrice = this.getSubscriptionPrice('yearly')
    const yearlyMonthlyEquivalent = monthlyPrice * 12
    
    return Math.round((yearlyMonthlyEquivalent - yearlyPrice) * 100) / 100
  }

  // Helper method for testing - create a subscription that expires soon
  async createTestSubscription(plan: 'monthly' | 'yearly' = 'monthly'): Promise<boolean> {
    try {
      if (!this.currentUser) return false

      const now = new Date()
      const endDate = new Date()
      
      // Set end date to 1 minute from now for testing
      endDate.setMinutes(endDate.getMinutes() + 1)

      const subscription: Subscription = {
        status: 'premium',
        plan,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew: true,
        features: [
          'unlimited_events',
          'advanced_search',
          'priority_support',
          'analytics',
          'custom_categories',
          'export_data',
          'no_ads',
          'early_access'
        ]
      }

      this.currentUser.subscription = subscription
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      console.log(`Test subscription created for ${plan} plan, expires in 1 minute`)
      return true
    } catch (error) {
      console.error('Error creating test subscription:', error)
      return false
    }
  }

  // Check if user can create an event today (free users limited to 1 per day)
  canCreateEventToday(): boolean {
    if (!this.currentUser) return false
    
    // Premium users have unlimited events
    if (this.hasPremiumSubscription()) return true
    
    // Free users limited to 1 event per day
    const stats = this.getUserStats()
    if (!stats) return false
    
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const lastEventDate = stats.lastEventCreatedDate
    
    // If no events created today or last event was on a different day
    if (!lastEventDate || lastEventDate !== today) {
      return true
    }
    
    // Check if already created an event today
    return (stats.eventsCreatedToday || 0) < 1
  }

  // Increment daily event count
  async incrementDailyEventCount(): Promise<void> {
    if (!this.currentUser) return
    
    const stats = this.getUserStats()
    if (!stats) return
    
    const today = new Date().toISOString().split('T')[0]
    const lastEventDate = stats.lastEventCreatedDate
    
    let newEventsCreatedToday = 1
    
    // If last event was today, increment counter
    if (lastEventDate === today) {
      newEventsCreatedToday = (stats.eventsCreatedToday || 0) + 1
    }
    
    // Update stats
    await this.updateStats({
      eventsCreated: stats.eventsCreated + 1,
      totalEvents: stats.totalEvents + 1,
      lastEventCreatedDate: today,
      eventsCreatedToday: newEventsCreatedToday
    })
  }
}

export const userService = new UserService()
