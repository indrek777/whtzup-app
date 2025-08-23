import AsyncStorage from '@react-native-async-storage/async-storage'

// User Group Types
export type UserGroup = 'unregistered' | 'registered' | 'premium'

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
  userGroup: UserGroup
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

// User Group Features and Permissions
export interface UserGroupFeatures {
  canCreateEvents: boolean
  canEditEvents: boolean
  canDeleteEvents: boolean
  canRateEvents: boolean
  canWriteReviews: boolean
  maxEventsPerDay: number
  maxRadiusKm: number
  canAccessPremiumCategories: boolean
  canUseAdvancedFilters: boolean
  canExportEvents: boolean
  canAccessAnalytics: boolean
  canInviteFriends: boolean
  canCreateGroups: boolean
  canAccessPrioritySupport: boolean
  features: string[]
}

// User Group Configuration
export const USER_GROUP_CONFIG: Record<UserGroup, UserGroupFeatures> = {
  unregistered: {
    canCreateEvents: false,
    canEditEvents: false,
    canDeleteEvents: false,
    canRateEvents: false,
    canWriteReviews: false,
    maxEventsPerDay: 0,
    maxRadiusKm: 50,
    canAccessPremiumCategories: false,
    canUseAdvancedFilters: false,
    canExportEvents: false,
    canAccessAnalytics: false,
    canInviteFriends: false,
    canCreateGroups: false,
    canAccessPrioritySupport: false,
    features: ['basic_search', 'basic_filtering', 'view_events']
  },
  registered: {
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,
    canRateEvents: true,
    canWriteReviews: true,
    maxEventsPerDay: 5,
    maxRadiusKm: 150,
    canAccessPremiumCategories: false,
    canUseAdvancedFilters: true,
    canExportEvents: false,
    canAccessAnalytics: false,
    canInviteFriends: true,
    canCreateGroups: false,
    canAccessPrioritySupport: false,
    features: ['basic_search', 'advanced_filtering', 'create_events', 'rate_events', 'write_reviews', 'invite_friends']
  },
  premium: {
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,
    canRateEvents: true,
    canWriteReviews: true,
    maxEventsPerDay: 50,
    maxRadiusKm: 500,
    canAccessPremiumCategories: true,
    canUseAdvancedFilters: true,
    canExportEvents: true,
    canAccessAnalytics: true,
    canInviteFriends: true,
    canCreateGroups: true,
    canAccessPrioritySupport: true,
    features: ['basic_search', 'advanced_filtering', 'create_events', 'rate_events', 'write_reviews', 'invite_friends', 'premium_categories', 'export_events', 'analytics', 'create_groups', 'priority_support', 'unlimited_radius']
  }
}

// Backend API URL - update this to match your backend server
const API_BASE_URL = 'https://olympio.ee/api' // Update this to your actual backend URL
const API_ENDPOINTS = {
  auth: '/auth',
  profile: '/profile',
  subscription: '/subscription',
  stats: '/stats',
  userGroup: '/user-group'
}

const STORAGE_KEYS = {
  user: 'user_profile',
  authToken: 'auth_token',
  preferences: 'user_preferences',
  subscription: 'user_subscription',
  userGroup: 'user_group'
}

class UserService {
  private currentUser: User | null = null
  private authToken: string | null = null
  private refreshToken: string | null = null
  private initializationPromise: Promise<void> | null = null

  constructor() {
    this.initializationPromise = this.loadUserFromStorage()
  }

  // Initialize user from storage
  private async loadUserFromStorage() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.user)
      const tokenData = await AsyncStorage.getItem(STORAGE_KEYS.authToken)
      const refreshTokenData = await AsyncStorage.getItem('refresh_token')
      
      if (userData) {
        this.currentUser = JSON.parse(userData)
      }
      if (tokenData) {
        this.authToken = tokenData
      }
      if (refreshTokenData) {
        this.refreshToken = refreshTokenData
      }
    } catch (error) {
      // Error loading user from storage
    }
  }

  // Wait for initialization to complete
  private async ensureInitialized() {
    if (this.initializationPromise) {
      await this.initializationPromise
      this.initializationPromise = null
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    await this.ensureInitialized()
    return this.currentUser
  }

  // Get current user group
  async getUserGroup(): Promise<UserGroup> {
    await this.ensureInitialized()
    
    if (!this.currentUser) {
      return 'unregistered'
    }
    
    // Check if user has premium subscription
    if (await this.hasPremiumSubscription()) {
      return 'premium'
    }
    
    // If user is authenticated but not premium, they are registered
    return 'registered'
  }

  // Get features for current user group
  async getUserGroupFeatures(): Promise<UserGroupFeatures> {
    const userGroup = await this.getUserGroup()
    return USER_GROUP_CONFIG[userGroup]
  }

  // Check if user can perform a specific action
  async canPerformAction(action: keyof UserGroupFeatures): Promise<boolean> {
    const features = await this.getUserGroupFeatures()
    const feature = features[action]
    return typeof feature === 'boolean' ? feature : false
  }

  // Check if user has a specific feature
  async hasFeature(feature: string): Promise<boolean> {
    const features = await this.getUserGroupFeatures()
    return features.features.includes(feature)
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    await this.ensureInitialized()
    return this.currentUser !== null && this.authToken !== null
  }

  // Check if user has premium subscription
  async hasPremiumSubscription(): Promise<boolean> {
    await this.ensureInitialized()
    if (!this.currentUser) return false
    
    try {
      // Check backend for most up-to-date subscription status
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/status`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Update local subscription data
          this.currentUser.subscription = result.data
          await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
          
          return result.data.status === 'premium'
        }
      }
    } catch (error) {
      console.log('Failed to check subscription status from backend, using local data')
    }
    
    // Fallback to local data if backend check fails
    const subscription = this.currentUser.subscription
    if (subscription.status !== 'premium') return false
    
    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate)
      const now = new Date()
      return endDate > now
    }
    
    return false
  }

  // Check if user can edit a specific event
  async canEditEvent(event: { createdBy?: string; source?: string }): Promise<boolean> {
    await this.ensureInitialized()
    
    // Check if user can edit events based on their group
    if (!(await this.canPerformAction('canEditEvents'))) {
      return false
    }
    
    // If not authenticated, cannot edit any events
    if (!this.currentUser) return false
    
    // If user has premium subscription, they can edit any event
    if (await this.hasPremiumSubscription()) return true
    
    // For registered users, they can only edit events they created
    // Check if the event was created by the current user
    if (event.createdBy === this.currentUser.id) return true
    
    // Legacy check: if event has source 'user' but no createdBy, allow edit
    // This is for backward compatibility with old events
    if (event.source === 'user' && !event.createdBy) return true
    
    return false
  }

  // Check if user can create events today
  async canCreateEventToday(): Promise<{ canCreate: boolean; remaining: number }> {
    const features = await this.getUserGroupFeatures()
    
    if (!features.canCreateEvents) {
      return { canCreate: false, remaining: 0 }
    }
    
    // Check daily limit
    const today = new Date().toISOString().split('T')[0]
    const lastCreatedDate = this.currentUser?.stats.lastEventCreatedDate
    
    if (lastCreatedDate === today) {
      const createdToday = this.currentUser?.stats.eventsCreatedToday || 0
      const remaining = Math.max(0, features.maxEventsPerDay - createdToday)
      return { canCreate: remaining > 0, remaining }
    }
    
    return { canCreate: true, remaining: features.maxEventsPerDay }
  }

  // Check if user can use a specific radius
  async canUseRadius(radius: number): Promise<boolean> {
    const features = await this.getUserGroupFeatures()
    return radius <= features.maxRadiusKm
  }

  // Get maximum allowed radius for current user
  async getMaxRadius(): Promise<number> {
    const features = await this.getUserGroupFeatures()
    return features.maxRadiusKm
  }

  // Check if subscription is cancelled (auto-renew disabled)
  async isSubscriptionCancelled(): Promise<boolean> {
    await this.ensureInitialized()
    if (!this.currentUser) return false
    return !this.currentUser.subscription.autoRenew
  }

  // Get subscription status
  async getSubscriptionStatus(): Promise<Subscription> {
    await this.ensureInitialized()
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
  async getPremiumFeatures(): Promise<string[]> {
    await this.ensureInitialized()
    const subscription = await this.getSubscriptionStatus()
    if (subscription.status === 'premium') {
      return subscription.features
    }
    return []
  }

  // Get user group upgrade benefits
  async getUpgradeBenefits(): Promise<{ current: UserGroup; benefits: string[] }> {
    const currentGroup = await this.getUserGroup()
    
    const benefits: string[] = []
    
    switch (currentGroup) {
      case 'unregistered':
        benefits.push(
          'Create and manage your own events',
          'Rate and review events',
          'Advanced filtering options',
          'Invite friends to events',
          'Larger search radius (150km)',
          'Up to 5 events per day'
        )
        break
      case 'registered':
        benefits.push(
          'Unlimited event creation (50/day)',
          'Premium event categories',
          'Export events to calendar',
          'Advanced analytics',
          'Create event groups',
          'Priority customer support',
          'Largest search radius (500km)'
        )
        break
      case 'premium':
        benefits.push('You already have all premium features!')
        break
    }
    
    return { current: currentGroup, benefits }
  }

  // Get user group comparison
  async getUserGroupComparison(): Promise<{
    unregistered: UserGroupFeatures
    registered: UserGroupFeatures
    premium: UserGroupFeatures
  }> {
    return {
      unregistered: USER_GROUP_CONFIG.unregistered,
      registered: USER_GROUP_CONFIG.registered,
      premium: USER_GROUP_CONFIG.premium
    }
  }

  // Update user group (for admin purposes)
  async updateUserGroup(userGroup: UserGroup): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/user-group`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ userGroup })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && this.currentUser) {
          this.currentUser.userGroup = userGroup
          await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
          return true
        }
      }
    } catch (error) {
      console.error('Error updating user group:', error)
    }
    return false
  }

  // Track event creation for daily limits
  async trackEventCreation(): Promise<void> {
    if (!this.currentUser) return
    
    const today = new Date().toISOString().split('T')[0]
    const lastCreatedDate = this.currentUser.stats.lastEventCreatedDate
    
    if (lastCreatedDate === today) {
      this.currentUser.stats.eventsCreatedToday = (this.currentUser.stats.eventsCreatedToday || 0) + 1
    } else {
      this.currentUser.stats.eventsCreatedToday = 1
    }
    
    this.currentUser.stats.lastEventCreatedDate = today
    this.currentUser.stats.eventsCreated += 1
    
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
  }

  // Get authentication headers
  async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureInitialized()
    
    if (!this.authToken) {
      return {}
    }
    
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    }
  }

  // Sign in user
  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Attempting sign in for:', email)
      
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()
      console.log('📡 Sign in response status:', response.status)
      console.log('📄 Sign in response:', JSON.stringify(result, null, 2))

      if (result.success) {
        console.log('✅ Sign in successful')
        this.currentUser = result.data.user
        this.authToken = result.data.accessToken
        this.refreshToken = result.data.refreshToken

        // Set user group based on subscription status (default to registered for new users)
        this.currentUser!.userGroup = 'registered'

        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, this.authToken!)
        await AsyncStorage.setItem('refresh_token', this.refreshToken!)

        return { success: true, user: this.currentUser || undefined }
      } else {
        console.log('❌ Sign in failed:', result.error)
        return { success: false, error: result.error || 'Sign in failed' }
      }
    } catch (error) {
      console.log('❌ Sign in network error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Sign up user
  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Attempting sign up for:', email)
      
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      })

      const result = await response.json()
      console.log('📡 Sign up response status:', response.status)
      console.log('📄 Sign up response:', JSON.stringify(result, null, 2))

      if (result.success) {
        console.log('✅ Sign up successful')
        this.currentUser = result.data.user
        this.authToken = result.data.accessToken
        this.refreshToken = result.data.refreshToken

        // Set user group to registered for new users
        this.currentUser!.userGroup = 'registered'

        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, this.authToken!)
        await AsyncStorage.setItem('refresh_token', this.refreshToken!)

        return { success: true, user: this.currentUser || undefined }
      } else {
        console.log('❌ Sign up failed:', result.error)
        return { success: false, error: result.error || 'Sign up failed' }
      }
    } catch (error) {
      console.log('❌ Sign up network error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    this.currentUser = null
    this.authToken = null
    this.refreshToken = null

    await AsyncStorage.removeItem(STORAGE_KEYS.user)
    await AsyncStorage.removeItem(STORAGE_KEYS.authToken)
    await AsyncStorage.removeItem('refresh_token')
  }

  // Refresh authentication token
  async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) return false

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      })

      const result = await response.json()

      if (result.success) {
        this.authToken = result.token
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, this.authToken!)
        return true
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
    }

    return false
  }

  // Subscription management methods
  async upgradeSubscription(plan: 'monthly' | 'yearly', autoRenew: boolean = true): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      await this.ensureInitialized()
      
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated' }
      }

      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan, autoRenew })
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Update local user data
        this.currentUser.subscription = {
          status: result.data.status,
          plan: result.data.plan,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          autoRenew: result.data.autoRenew,
          features: result.data.features
        }

        // Update user group to premium
        this.currentUser.userGroup = 'premium'

        // Save to storage
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))

        return { success: true, data: result.data }
      }

      return { success: false, error: result.error || 'Failed to upgrade subscription' }
    } catch (error) {
      console.error('Upgrade subscription error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      await this.ensureInitialized()
      
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated' }
      }

      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/cancel`, {
        method: 'POST',
        headers
      })

      const result = await response.json()

      if (result.success) {
        // Update local user data
        this.currentUser.subscription.status = 'expired'
        this.currentUser.subscription.autoRenew = false
        this.currentUser.userGroup = 'registered'

        // Save to storage
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))

        return { success: true, data: result.data }
      }

      return { success: false, error: result.error || 'Failed to cancel subscription' }
    } catch (error) {
      console.error('Cancel subscription error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  async reactivateSubscription(plan: 'monthly' | 'yearly', autoRenew: boolean = true): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      await this.ensureInitialized()
      
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated' }
      }

      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/reactivate`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan, autoRenew })
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Update local user data
        this.currentUser.subscription = {
          status: result.data.status,
          plan: result.data.plan,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          autoRenew: result.data.autoRenew,
          features: result.data.features
        }

        // Update user group to premium
        this.currentUser.userGroup = 'premium'

        // Save to storage
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))

        return { success: true, data: result.data }
      }

      return { success: false, error: result.error || 'Failed to reactivate subscription' }
    } catch (error) {
      console.error('Reactivate subscription error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }
}

// Export singleton instance
export const userService = new UserService()
export default userService
