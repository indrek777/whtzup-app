import AsyncStorage from '@react-native-async-storage/async-storage'
import { iapService, SUBSCRIPTION_PRODUCTS } from './iapServiceMock'

// User Group Types
export type UserGroup = 'unregistered' | 'registered' | 'premium'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  lastLogin: string
  subscription?: Subscription
  preferences?: UserPreferences
  stats?: UserStats
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
const API_BASE_URL = 'http://olympio.ee:4000/api' // Update this to your actual backend URL
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
    console.log('🚀 Initializing UserService...')
    this.initializationPromise = this.loadUserFromStorage()
  }

  // Initialize user from storage
  private async loadUserFromStorage() {
    try {
      console.log('🔄 Loading user data from storage...')
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.user)
      const tokenData = await AsyncStorage.getItem(STORAGE_KEYS.authToken)
      const refreshTokenData = await AsyncStorage.getItem('refresh_token')
      
      if (userData) {
        this.currentUser = JSON.parse(userData)
        console.log('✅ User data loaded from storage')
      } else {
        console.log('📝 No user data found in storage')
      }
      
      if (tokenData) {
        this.authToken = tokenData
        console.log('✅ Auth token loaded from storage')
      } else {
        console.log('📝 No auth token found in storage')
      }
      
      if (refreshTokenData) {
        this.refreshToken = refreshTokenData
        console.log('✅ Refresh token loaded from storage')
      } else {
        console.log('📝 No refresh token found in storage')
      }
      
      console.log('📊 Final state - User:', !!this.currentUser, 'AuthToken:', !!this.authToken, 'RefreshToken:', !!this.refreshToken)
    } catch (error) {
      console.error('❌ Error loading user from storage:', error)
    }
  }

  // Wait for initialization to complete
  private async ensureInitialized() {
    if (this.initializationPromise) {
      console.log('⏳ Waiting for user service initialization...')
      await this.initializationPromise
      this.initializationPromise = null
      console.log('✅ User service initialization complete')
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
    const isAuth = this.currentUser !== null && this.authToken !== null
    console.log('🔐 Authentication check:', isAuth, 'User:', !!this.currentUser, 'Token:', !!this.authToken)
    return isAuth
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
    if (!subscription || subscription.status !== 'premium') return false
    
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
    
    console.log('🔐 canEditEvent check:', {
      eventCreatedBy: event.createdBy,
      currentUserId: this.currentUser?.id,
      currentUserName: this.currentUser?.name,
      eventSource: event.source
    })
    
    // Check if user can edit events based on their group
    if (!(await this.canPerformAction('canEditEvents'))) {
      console.log('🔐 User cannot edit events based on group')
      return false
    }
    
    // If not authenticated, cannot edit any events
    if (!this.currentUser) {
      console.log('🔐 No current user')
      return false
    }
    
    // Note: Premium users can edit any event - if you want to restrict this, comment out this block
    // if (await this.hasPremiumSubscription()) {
    //   console.log('🔐 User has premium subscription, can edit any event')
    //   return true
    // }
    
    // For registered users, they can only edit events they created
    // Check if the event was created by the current user
    if (event.createdBy === this.currentUser.id) {
      console.log('🔐 Event created by current user, can edit')
      return true
    }
    
    // Legacy check: if event has source 'user' but no createdBy, allow edit
    // This is for backward compatibility with old events
    if (event.source === 'user' && !event.createdBy) {
      console.log('🔐 Legacy event with user source, can edit')
      return true
    }
    
    console.log('🔐 User cannot edit this event')
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
    const lastCreatedDate = this.currentUser?.stats?.lastEventCreatedDate
    
    if (lastCreatedDate === today) {
      const createdToday = this.currentUser?.stats?.eventsCreatedToday || 0
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
    if (!this.currentUser || !this.currentUser.subscription) return false
    return !this.currentUser.subscription.autoRenew
  }

  // Get subscription status
  async getSubscriptionStatus(): Promise<Subscription> {
    await this.ensureInitialized()
    if (!this.currentUser || !this.currentUser.subscription) {
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
    
    // Initialize stats if not present
    if (!this.currentUser.stats) {
      this.currentUser.stats = {
        eventsCreated: 0,
        eventsAttended: 0,
        ratingsGiven: 0,
        reviewsWritten: 0,
        totalEvents: 0,
        favoriteVenues: [],
        lastEventCreatedDate: undefined,
        eventsCreatedToday: 0
      }
    }
    
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

  // Get authentication headers with automatic token refresh
  async getAuthHeaders(): Promise<Record<string, string>> {
    console.log('🔐 Getting auth headers...')
    await this.ensureInitialized()
    
    if (!this.authToken) {
      console.log('❌ No auth token available')
      return {}
    }
    
    // Check if token is expired and try to refresh it
    if (this.isTokenExpired()) {
      console.log('🔄 Token expired, attempting refresh...')
      const refreshed = await this.refreshAuthToken()
      if (!refreshed) {
        console.log('❌ Token refresh failed, returning empty headers')
        return {}
      }
      console.log('✅ Token refreshed successfully')
    }
    
    if (!this.authToken) {
      console.log('❌ Still no auth token after refresh attempt')
      return {}
    }
    
    const headers = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    }
    console.log('✅ Auth headers ready:', !!headers.Authorization)
    return headers
  }

  // Check if token is expired by decoding JWT
  private isTokenExpired(): boolean {
    console.log('🕐 Checking token expiration...')
    if (!this.authToken) {
      console.log('❌ No auth token to check')
      return true
    }
    
    try {
      // Decode JWT token to check expiration
      const base64Url = this.authToken.split('.')[1]
      if (!base64Url) {
        console.log('❌ Invalid token format - missing payload')
        return true
      }
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      
      const payload = JSON.parse(jsonPayload)
      const currentTime = Math.floor(Date.now() / 1000)
      console.log('🔍 Token payload:', { exp: payload.exp, currentTime })
      
      // Check if token is expired (with 30 second buffer)
      if (payload.exp && payload.exp < (currentTime + 30)) {
        console.log('🕐 Token expired at:', new Date(payload.exp * 1000), 'Current time:', new Date())
        return true
      }
      
      console.log('✅ Token is still valid')
      return false
    } catch (error) {
      console.log('❌ Error checking token expiration:', error)
      console.log('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
      
      // If we can't decode the token, consider it expired
      return true
    }
  }

  // Handle 401 responses by attempting token refresh
  async handleUnauthorizedResponse(): Promise<boolean> {
    console.log('🔄 Handling 401 response, attempting token refresh...')
    const refreshed = await this.refreshAuthToken()
    if (!refreshed) {
      console.log('❌ Token refresh failed, but keeping user logged in for limited functionality')
      // Don't automatically sign out - let user continue with limited functionality
      // They can manually sign out if needed
      return false
    }
    return true
  }

  // Sign in user
  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string; details?: any[] }> {
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
        
        console.log('💾 User data saved to storage successfully')

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
  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string; details?: any[] }> {
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
        
        console.log('💾 User data saved to storage successfully')

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
    console.log('🚪 User signing out...')
    console.log('📊 Current state before signout - User:', !!this.currentUser, 'AuthToken:', !!this.authToken, 'RefreshToken:', !!this.refreshToken)
    console.log('🔍 SignOut called from:', new Error().stack?.split('\n')[2] || 'unknown location')
    
    this.currentUser = null
    this.authToken = null
    this.refreshToken = null

    await AsyncStorage.removeItem(STORAGE_KEYS.user)
    await AsyncStorage.removeItem(STORAGE_KEYS.authToken)
    await AsyncStorage.removeItem('refresh_token')
    console.log('✅ User signed out successfully')
    
    // Verify that data was removed
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.user)
    const tokenData = await AsyncStorage.getItem(STORAGE_KEYS.authToken)
    const refreshTokenData = await AsyncStorage.getItem('refresh_token')
    console.log('📊 After signout - User:', !!userData, 'AuthToken:', !!tokenData, 'RefreshToken:', !!refreshTokenData)
  }

  // Refresh authentication token
  async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) {
      console.log('❌ No refresh token available')
      return false
    }

    try {
      console.log('🔄 Attempting to refresh token...')
      console.log('🌐 Making request to:', `${API_BASE_URL}/auth/refresh`)
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      })

      const result = await response.json()
      console.log('📡 Token refresh response status:', response.status)
      console.log('📄 Token refresh response:', JSON.stringify(result, null, 2))

      if (result.success && result.data) {
        this.authToken = result.data.accessToken
        if (result.data.refreshToken) {
          this.refreshToken = result.data.refreshToken
          await AsyncStorage.setItem('refresh_token', this.refreshToken)
        }
        await AsyncStorage.setItem(STORAGE_KEYS.authToken, this.authToken!)
        console.log('✅ Token refreshed successfully')
        console.log('💾 New tokens saved to storage')
        return true
      } else {
        console.log('❌ Token refresh failed:', result.error || 'Unknown error')
        
        // If refresh token is invalid or revoked, sign out the user
        if (result.error && (result.error.includes('Invalid') || result.error.includes('revoked'))) {
          console.log('🔐 Invalid refresh token detected, signing out user')
          await this.signOut()
        }
        
        return false
      }
    } catch (error) {
      console.error('❌ Token refresh network error:', error)
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
      
      // On network errors, don't sign out immediately, just return false
      return false
    }
  }

  // Subscription management methods
  async upgradeSubscription(plan: 'monthly' | 'yearly', autoRenew: boolean = true): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      await this.ensureInitialized()
      
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated' }
      }

      // Determine product ID based on plan
      const productId = plan === 'monthly' ? SUBSCRIPTION_PRODUCTS.MONTHLY : SUBSCRIPTION_PRODUCTS.YEARLY;
      
      console.log('🛒 Starting IAP purchase for:', productId);
      
      // Purchase through Apple IAP
      const purchaseResult = await iapService.purchaseSubscription(productId);
      
      if (purchaseResult.success && purchaseResult.purchase) {
        console.log('✅ IAP purchase successful');
        
        // Update local user data with IAP purchase info
        const purchase = purchaseResult.purchase;
        const startDate = new Date();
        const endDate = new Date();
        
        if (plan === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        this.currentUser.subscription = {
          status: 'premium',
          plan,
          startDate: startDate.toISOString(),
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
            'early_access',
            'extended_event_radius',
            'advanced_filtering',
            'premium_categories',
            'create_groups'
          ]
        }

        // Update user group to premium
        this.currentUser.userGroup = 'premium'

        // Save to storage
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))

        // Also sync with backend (optional - for analytics)
        try {
          const headers = await this.getAuthHeaders()
          await fetch(`${API_BASE_URL}/subscription/upgrade`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              plan, 
              autoRenew,
              transactionId: purchase.transactionId,
              purchaseDate: purchase.purchaseDate
            })
          })
        } catch (backendError) {
          console.warn('⚠️ Backend sync failed, but IAP purchase was successful:', backendError)
        }

        return { 
          success: true, 
          data: {
            status: 'premium',
            plan,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            autoRenew: true,
            features: this.currentUser.subscription.features,
            transactionId: purchase.transactionId
          }
        }
      }

      return { success: false, error: purchaseResult.error || 'Failed to complete purchase' }
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

  // Get subscription usage statistics
  async getSubscriptionUsage(): Promise<{
    daily: { used: number; limit: number; remaining: number };
    monthly: { used: number; limit: number; remaining: number };
    total: { eventsCreated: number; eventsAttended: number; ratingsGiven: number };
  }> {
    // Check if user is authenticated before making API calls
    if (!this.currentUser || !this.authToken) {
      console.log('User not authenticated, using default usage data')
      return this.getDefaultUsageData()
    }

    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/usage`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return result.data
        }
      } else if (response.status === 401) {
        console.log('🔄 Token expired, attempting refresh...')
        const refreshed = await this.handleUnauthorizedResponse()
        if (refreshed) {
          // Retry the request with new token
          const newHeaders = await this.getAuthHeaders()
          const retryResponse = await fetch(`${API_BASE_URL}/subscription/usage`, {
            method: 'GET',
            headers: newHeaders
          })
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json()
            if (retryResult.success) {
              return retryResult.data
            }
          }
        }
        console.log('Using default usage data after token refresh failure')
        return this.getDefaultUsageData()
      }
    } catch (error) {
      console.error('Error getting subscription usage:', error)
    }

    return this.getDefaultUsageData()
  }

  private async getDefaultUsageData() {
    // Fallback to local data
    const stats = this.currentUser?.stats || { eventsCreated: 0, eventsCreatedToday: 0 }
    const features = await this.getUserGroupFeatures()
    
    return {
      daily: {
        used: stats.eventsCreatedToday || 0,
        limit: features.maxEventsPerDay,
        remaining: Math.max(0, features.maxEventsPerDay - (stats.eventsCreatedToday || 0))
      },
      monthly: {
        used: stats.eventsCreated || 0,
        limit: features.maxEventsPerDay * 30,
        remaining: Math.max(0, (features.maxEventsPerDay * 30) - (stats.eventsCreated || 0))
      },
      total: {
        eventsCreated: stats.eventsCreated || 0,
        eventsAttended: stats.eventsAttended || 0,
        ratingsGiven: stats.ratingsGiven || 0
      }
    }
  }

  // Get billing history
  async getBillingHistory(): Promise<Array<{
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    plan: string;
  }>> {
    // Check if user is authenticated before making API calls
    if (!this.currentUser || !this.authToken) {
      console.log('User not authenticated, no billing history available')
      return []
    }

    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/billing`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return result.data
        }
      } else if (response.status === 401) {
        console.log('🔄 Token expired, attempting refresh...')
        const refreshed = await this.handleUnauthorizedResponse()
        if (refreshed) {
          // Retry the request with new token
          const newHeaders = await this.getAuthHeaders()
          const retryResponse = await fetch(`${API_BASE_URL}/subscription/billing`, {
            method: 'GET',
            headers: newHeaders
          })
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json()
            if (retryResult.success) {
              return retryResult.data
            }
          }
        }
        console.log('No billing history available after token refresh failure')
        return []
      }
    } catch (error) {
      console.error('Error getting billing history:', error)
    }

    return []
  }

  // Change subscription plan
  async changeSubscriptionPlan(plan: 'monthly' | 'yearly', autoRenew: boolean = true): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      await this.ensureInitialized()
      
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated' }
      }

      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/change-plan`, {
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
        if (this.currentUser.subscription) {
          this.currentUser.subscription.plan = result.data.plan
          this.currentUser.subscription.endDate = result.data.endDate
          this.currentUser.subscription.autoRenew = result.data.autoRenew
        }

        // Save to storage
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser))

        return { success: true, data: result.data }
      }

      return { success: false, error: result.error || 'Failed to change subscription plan' }
    } catch (error) {
      console.error('Change subscription plan error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  // Get subscription features
  async getSubscriptionFeatures(): Promise<{
    status: string;
    currentFeatures: string[];
    availableFeatures: { basic: string[]; premium: string[] };
    upgradeBenefits: string[];
  }> {
    // Check if user is authenticated before making API calls
    if (!this.currentUser || !this.authToken) {
      console.log('User not authenticated, using default features')
      return this.getDefaultFeatures()
    }

    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/subscription/features`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return result.data
        }
      } else if (response.status === 401) {
        console.log('🔄 Token expired, attempting refresh...')
        const refreshed = await this.handleUnauthorizedResponse()
        if (refreshed) {
          // Retry the request with new token
          const newHeaders = await this.getAuthHeaders()
          const retryResponse = await fetch(`${API_BASE_URL}/subscription/features`, {
            method: 'GET',
            headers: newHeaders
          })
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json()
            if (retryResult.success) {
              return retryResult.data
            }
          }
        }
        console.log('Using default features after token refresh failure')
        return this.getDefaultFeatures()
      }
    } catch (error) {
      console.error('Error getting subscription features:', error)
    }

    return this.getDefaultFeatures()
  }

  private async getDefaultFeatures() {
    // Fallback to local data
    const userGroup = await this.getUserGroup()
    const features = await this.getUserGroupFeatures()
    
    return {
      status: userGroup === 'premium' ? 'premium' : userGroup === 'registered' ? 'registered' : 'free',
      currentFeatures: features.features,
      availableFeatures: {
        basic: ['basic_search', 'basic_filtering', 'view_events', 'create_events', 'rate_events'],
        premium: [
          'unlimited_events',
          'advanced_search',
          'priority_support',
          'analytics',
          'custom_categories',
          'export_data',
          'no_ads',
          'early_access',
          'extended_event_radius',
          'advanced_filtering',
          'premium_categories',
          'create_groups',
          'priority_support'
        ]
      },
      upgradeBenefits: userGroup === 'free' ? [
        'unlimited_events',
        'advanced_search',
        'priority_support',
        'analytics',
        'custom_categories',
        'export_data',
        'no_ads',
        'early_access',
        'extended_event_radius',
        'advanced_filtering',
        'premium_categories',
        'create_groups',
        'priority_support'
      ] : []
    }
  }

  // Get subscription benefits comparison
  async getSubscriptionBenefits(): Promise<{
    free: { features: string[]; limitations: string[] };
    registered: { features: string[]; limitations: string[] };
    premium: { features: string[]; limitations: string[] };
  }> {
    return {
      free: {
        features: [
          'View events',
          'Basic search',
          'Basic filtering',
          'Local ratings'
        ],
        limitations: [
          'Cannot create events',
          'Limited search radius (50km)',
          'No advanced features',
          'No priority support'
        ]
      },
      registered: {
        features: [
          'Create events (5/day)',
          'Edit your events',
          'Rate and review events',
          'Advanced filtering',
          'Invite friends',
          'Larger search radius (150km)'
        ],
        limitations: [
          'Limited to 5 events per day',
          'No premium categories',
          'No analytics',
          'No export features',
          'No priority support'
        ]
      },
      premium: {
        features: [
          'Unlimited event creation (50/day)',
          'Premium event categories',
          'Advanced analytics',
          'Export events to calendar',
          'Create event groups',
          'Priority customer support',
          'Largest search radius (500km)',
          'No advertisements',
          'Early access to new features',
          'Custom categories'
        ],
        limitations: [
          'No limitations'
        ]
      }
    }
  }

  // Check if user can access a specific premium feature
  async canAccessPremiumFeature(feature: string): Promise<boolean> {
    const subscription = await this.getSubscriptionStatus()
    if (subscription.status !== 'premium') return false
    
    return subscription.features.includes(feature)
  }

  // Get subscription plan pricing
  getSubscriptionPricing(): {
    monthly: { price: number; currency: string; savings?: string };
    yearly: { price: number; currency: string; savings: string };
  } {
    return {
      monthly: {
        price: 9.99,
        currency: 'USD'
      },
      yearly: {
        price: 99.99,
        currency: 'USD',
        savings: 'Save $19.89 (17% off)'
      }
    }
  }

  // Initialize IAP service
  async initializeIAP(): Promise<boolean> {
    try {
      console.log('🔌 Initializing IAP service...');
      const success = await iapService.initialize();
      
      if (success) {
        // Try to restore any existing purchases
        await this.restorePurchases();
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      return false;
    }
  }

  // Restore purchases from Apple
  async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Restoring purchases...');
      const result = await iapService.restorePurchases();
      
      if (result.success && result.restoredPurchases && result.restoredPurchases.length > 0) {
        console.log('✅ Purchases restored successfully');
        
        // Update local user data if we have a current user
        if (this.currentUser) {
          const hasActiveSubscription = await iapService.hasActiveSubscription();
          if (hasActiveSubscription) {
            this.currentUser.userGroup = 'premium';
            await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser));
          }
        }
        
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return { success: false, error: 'Failed to restore purchases' };
    }
  }

  // Get subscription status with detailed information
  async getDetailedSubscriptionStatus(): Promise<{
    status: string;
    plan: string | null;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
    features: string[];
    daysRemaining: number | null;
    isExpired: boolean;
    canUpgrade: boolean;
    canCancel: boolean;
    canReactivate: boolean;
  }> {
    try {
      const subscription = await this.getSubscriptionStatus()
      const now = new Date()
      
      let daysRemaining: number | null = null
      let isExpired = false
      
      if (subscription.endDate) {
        const endDate = new Date(subscription.endDate)
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        isExpired = endDate < now
      }
      
      return {
        ...subscription,
        daysRemaining,
        isExpired,
        canUpgrade: subscription.status === 'free' || subscription.status === 'expired',
        canCancel: subscription.status === 'premium' && subscription.autoRenew,
        canReactivate: subscription.status === 'expired'
      }
    } catch (error) {
      console.error('Error getting detailed subscription status:', error)
      // Return default status for unauthenticated users
      return {
        status: 'free',
        plan: null,
        startDate: null,
        endDate: null,
        autoRenew: false,
        features: ['basic_search', 'basic_filtering', 'view_events'],
        daysRemaining: null,
        isExpired: false,
        canUpgrade: true,
        canCancel: false,
        canReactivate: false
      }
    }
  }
}

// Export singleton instance
export const userService = new UserService()
export default userService
