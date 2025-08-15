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
      return endDate > new Date()
    }
    
    return false
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
      if (!this.currentUser) return false

      this.currentUser.subscription.autoRenew = false
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
      
      console.log('User cancelled subscription')
      return true
    } catch (error) {
      console.error('Error cancelling subscription:', error)
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
}

export const userService = new UserService()
