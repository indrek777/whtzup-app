import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  Modal,
  Switch,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator
} from 'react-native'
import { userService, User, Subscription, UserPreferences } from '../utils/userService'
import { errorHandler, ErrorType } from '../utils/errorHandler'
import { iapService, SUBSCRIPTION_PRODUCTS } from '../utils/iapServiceMock'
import SubscriptionManager from './SubscriptionManager'
import SubscriptionTerms from './SubscriptionTerms'

interface UserProfileProps {
  visible: boolean
  onClose: () => void
}

const UserProfile: React.FC<UserProfileProps> = ({ visible, onClose }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false)
  const [showBenefitsModal, setShowBenefitsModal] = useState(false)
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false)
  const [showSubscriptionTerms, setShowSubscriptionTerms] = useState(false)
  
  // Auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  
  // Subscription states
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [subscriptionUsage, setSubscriptionUsage] = useState<any>(null)
  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [subscriptionFeatures, setSubscriptionFeatures] = useState<any>(null)
  const [subscriptionBenefits, setSubscriptionBenefits] = useState<any>(null)
  const [detailedSubscription, setDetailedSubscription] = useState<any>(null)
  
  // Preferences states
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    emailUpdates: true,
    defaultRadius: 10,
    favoriteCategories: [],
    language: 'en',
    theme: 'auto'
  })

  useEffect(() => {
    if (visible) {
      loadUserData()
      initializeIAP()
    }
  }, [visible])

  const initializeIAP = async () => {
    try {
      console.log('🔌 Initializing IAP in UserProfile...');
      await userService.initializeIAP();
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
    }
  }

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      const user = await userService.getCurrentUser()
      const authenticated = await userService.isAuthenticated()
      
      setCurrentUser(user)
      setIsAuthenticated(authenticated)
      
      // Always load subscription data (methods now handle authentication internally)
      try {
        const usage = await userService.getSubscriptionUsage()
        setSubscriptionUsage(usage)
      } catch (error) {
        console.error('Error loading usage:', error)
        setSubscriptionUsage(null)
      }
      
      try {
        const billing = await userService.getBillingHistory()
        setBillingHistory(billing)
      } catch (error) {
        console.error('Error loading billing:', error)
        setBillingHistory([])
      }
      
      try {
        const features = await userService.getSubscriptionFeatures()
        setSubscriptionFeatures(features)
      } catch (error) {
        console.error('Error loading features:', error)
        setSubscriptionFeatures(null)
      }
      
      try {
        const benefits = await userService.getSubscriptionBenefits()
        setSubscriptionBenefits(benefits)
      } catch (error) {
        console.error('Error loading benefits:', error)
        setSubscriptionBenefits(null)
      }
      
      try {
        const detailed = await userService.getDetailedSubscriptionStatus()
        setDetailedSubscription(detailed)
      } catch (error) {
        console.error('Error loading detailed subscription:', error)
        setDetailedSubscription(null)
      }

      if (user && authenticated) {
        
        setPreferences(user.preferences || {
          notifications: true,
          emailUpdates: true,
          defaultRadius: 10,
          favoriteCategories: [],
          language: 'en',
          theme: 'auto'
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    if (authMode === 'signup' && !authName.trim()) {
      Alert.alert('Error', 'Please enter your name')
      return
    }

    setIsAuthLoading(true)

    try {
      let result
      if (authMode === 'signup') {
        result = await userService.signUp(authEmail, authPassword, authName)
      } else {
        result = await userService.signIn(authEmail, authPassword)
      }

      if (result.success) {
        Alert.alert(
          'Success', 
          authMode === 'signup' ? 'Account created successfully!' : 'Welcome back!',
          [{ text: 'OK', onPress: () => setShowAuthModal(false) }]
        )
        loadUserData()
        resetAuthForm()
      } else {
        let errorMessage = result.error || (authMode === 'signup' 
          ? 'Failed to create account. Please try again.' 
          : 'Sign in failed. Please check your credentials and try again.')
        
        if (result.error === 'Validation failed' && result.details) {
          const fieldErrors = result.details.map((detail: any) => detail.msg).join('\n• ')
          errorMessage = `Please fix the following:\n• ${fieldErrors}`
        }
        
        Alert.alert('Authentication Error', errorMessage)
      }
    } catch (error) {
      const appError = errorHandler.handleApiError(error, {
        action: authMode === 'signup' ? 'sign_up' : 'sign_in',
        entity: 'user'
      });
      errorHandler.showError(appError);
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await userService.signOut()
            loadUserData()
          }
        }
      ]
    )
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in to subscribe')
      return
    }

    const pricing = userService.getSubscriptionPricing()
    const planPrice = selectedPlan === 'monthly' 
      ? `$${pricing.monthly.price}/${pricing.monthly.currency}` 
      : `$${pricing.yearly.price}/${pricing.yearly.currency}`
    const planName = selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'

    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${planName} Premium plan for ${planPrice}?\n\nThis will use Apple's In-App Purchase system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            try {
              setIsAuthLoading(true)
              const result = await userService.upgradeSubscription(selectedPlan, true)
              
              if (result.success) {
                Alert.alert(
                  'Success!',
                  `You've successfully subscribed to the ${planName} Premium plan! Welcome to premium features.`,
                  [{ text: 'OK', onPress: () => {
                    setShowSubscriptionModal(false)
                    loadUserData()
                  }}]
                )
              } else {
                Alert.alert('Subscription Failed', result.error || 'Failed to process subscription. Please try again.')
              }
            } catch (error) {
              console.error('Subscription error:', error)
              Alert.alert('Error', 'An unexpected error occurred. Please try again.')
            } finally {
              setIsAuthLoading(false)
            }
          }
        }
      ]
    )
  }

  const handleRestorePurchases = async () => {
    try {
      setIsAuthLoading(true)
      console.log('🔄 Restoring purchases...')
      
      const result = await userService.restorePurchases()
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your purchases have been restored successfully!',
          [{ text: 'OK', onPress: () => {
            setShowSubscriptionModal(false)
            loadUserData()
          }}]
        )
      } else {
        Alert.alert('Restore Failed', result.error || 'No purchases found to restore.')
      }
    } catch (error) {
      console.error('Restore error:', error)
      Alert.alert('Error', 'An unexpected error occurred while restoring purchases.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will lose access to premium features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsAuthLoading(true)
              const result = await userService.cancelSubscription()
              
              if (result.success) {
                Alert.alert(
                  'Subscription Cancelled',
                  'Your premium subscription has been cancelled. You will retain access to premium features until the end of your current billing period.',
                  [{ text: 'OK', onPress: () => loadUserData() }]
                )
              } else {
                Alert.alert('Cancellation Failed', result.error || 'Failed to cancel subscription. Please try again.')
              }
            } catch (error) {
              console.error('Cancellation error:', error)
              Alert.alert('Error', 'An unexpected error occurred. Please try again.')
            } finally {
              setIsAuthLoading(false)
            }
          }
        }
      ]
    )
  }

  const handleReactivateSubscription = async () => {
    Alert.alert(
      'Reactivate Subscription',
      'Reactivate your premium subscription with the same plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              setIsAuthLoading(true)
              const currentPlan = currentUser?.subscription?.plan || 'monthly'
              const result = await userService.reactivateSubscription(currentPlan as 'monthly' | 'yearly', true)
              
              if (result.success) {
                Alert.alert(
                  'Subscription Reactivated!',
                  'Your premium subscription has been reactivated. Welcome back to premium features!',
                  [{ text: 'OK', onPress: () => loadUserData() }]
                )
              } else {
                Alert.alert('Reactivation Failed', result.error || 'Failed to reactivate subscription. Please try again.')
              }
            } catch (error) {
              console.error('Reactivation error:', error)
              Alert.alert('Error', 'An unexpected error occurred. Please try again.')
            } finally {
              setIsAuthLoading(false)
            }
          }
        }
      ]
    )
  }

  const handleChangePlan = async () => {
    try {
      setIsAuthLoading(true)
      const result = await userService.changeSubscriptionPlan(selectedPlan, true)
      
      if (result.success) {
        Alert.alert(
          'Plan Changed Successfully!',
          `Your subscription plan has been changed to ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}.`,
          [{ text: 'OK', onPress: () => {
            setShowPlanChangeModal(false)
            loadUserData()
          }}]
        )
      } else {
        Alert.alert('Plan Change Failed', result.error || 'Failed to change plan. Please try again.')
      }
    } catch (error) {
      console.error('Plan change error:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const resetAuthForm = () => {
    setAuthEmail('')
    setAuthPassword('')
    setAuthName('')
  }

  const getSubscriptionStatusText = (subscription?: Subscription): string => {
    if (!subscription) return 'Free'
    if (subscription.status === 'premium') {
      if (subscription.endDate) {
        const endDate = new Date(subscription.endDate)
        const now = new Date()
        if (endDate > now) {
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (!subscription.autoRenew) {
            return `Premium (${daysLeft} days left, cancelled)`
          }
          return `Premium (${daysLeft} days left)`
        }
      }
      if (!subscription.autoRenew) {
        return 'Premium (cancelled)'
      }
      return 'Premium'
    }
    if (subscription.status === 'expired') {
      return 'Expired'
    }
    return 'Free'
  }

  const getSubscriptionColor = (subscription?: Subscription): string => {
    if (!subscription) return '#666'
    if (subscription.status === 'premium') {
      return '#FFD700'
    }
    return '#666'
  }

  // Modal render functions
  const renderAuthModal = () => (
    <Modal visible={showAuthModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
          <TouchableOpacity onPress={() => setShowAuthModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {authMode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name"
                value={authName}
                onChangeText={setAuthName}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your password"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isAuthLoading && styles.submitButtonDisabled]}
            onPress={handleAuth}
            disabled={isAuthLoading}
          >
            <Text style={styles.submitButtonText}>
              {isAuthLoading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchModeButton}
            onPress={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
              resetAuthForm()
            }}
          >
            <Text style={styles.switchModeText}>
              {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  const renderSubscriptionModal = () => {
    const pricing = userService.getSubscriptionPricing()
    
    return (
      <Modal visible={showSubscriptionModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Premium Subscription</Text>
            <TouchableOpacity onPress={() => setShowSubscriptionModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.planSelector}>
              <TouchableOpacity
                style={[
                  styles.planOption,
                  selectedPlan === 'monthly' && styles.planOptionActive
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={styles.planTitle}>Monthly</Text>
                <Text style={styles.planPrice}>${pricing.monthly.price}/{pricing.monthly.currency}</Text>
                <Text style={styles.planDescription}>Perfect for trying out premium features</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planOption,
                  selectedPlan === 'yearly' && styles.planOptionActive
                ]}
                onPress={() => setSelectedPlan('yearly')}
              >
                <Text style={styles.planTitle}>Yearly</Text>
                <Text style={styles.planPrice}>${pricing.yearly.price}/{pricing.yearly.currency}</Text>
                <Text style={styles.planSavings}>{pricing.yearly.savings}</Text>
                <Text style={styles.planDescription}>Best value for long-term users</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featuresList}>
              <Text style={styles.featuresTitle}>Premium Features:</Text>
              {[
                '✨ Unlimited event creation (vs 1/day for free users)',
                '🔍 Advanced search & filtering',
                '📊 Analytics & insights',
                '🎨 Custom categories',
                '📤 Export your data',
                '🚫 No advertisements',
                '⚡ Early access to new features',
                '🎯 Priority support',
                '🌍 Extended radius (500km vs 15km for free users)',
                '📅 Extended event filter (1 year vs 1 week for free users)'
              ].map((feature, index) => (
                <Text key={index} style={styles.featureItem}>{feature}</Text>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isAuthLoading && styles.submitButtonDisabled]} 
              onPress={handleSubscribe}
              disabled={isAuthLoading}
            >
              <Text style={styles.submitButtonText}>
                {isAuthLoading ? 'Processing...' : 'Subscribe'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.restoreButton} 
              onPress={handleRestorePurchases}
            >
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  const renderPreferencesModal = () => (
    <Modal visible={showPreferencesModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Preferences</Text>
          <TouchableOpacity onPress={() => setShowPreferencesModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Push Notifications</Text>
            <Switch
              value={preferences?.notifications ?? true}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, notifications: value }))}
            />
          </View>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Email Updates</Text>
            <Switch
              value={preferences?.emailUpdates ?? true}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, emailUpdates: value }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Default Search Radius (km)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="10"
              value={(preferences?.defaultRadius || 10).toString()}
              onChangeText={(text) => setPreferences(prev => ({ ...prev, defaultRadius: parseInt(text) || 10 }))}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  const renderUsageModal = () => (
    <Modal visible={showUsageModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Usage & Limits</Text>
          <TouchableOpacity onPress={() => setShowUsageModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {subscriptionUsage && (
            <>
              <View style={styles.usageDetailSection}>
                <Text style={styles.usageDetailTitle}>Daily Usage</Text>
                <View style={styles.usageDetailItem}>
                  <Text style={styles.usageDetailLabel}>Events Created Today:</Text>
                  <Text style={styles.usageDetailValue}>
                    {subscriptionUsage.daily.used} / {subscriptionUsage.daily.limit}
                  </Text>
                </View>
                <View style={styles.usageProgressBar}>
                  <View 
                    style={[
                      styles.usageProgressFill, 
                      { width: `${Math.min(100, (subscriptionUsage.daily.used / subscriptionUsage.daily.limit) * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.usageRemaining}>
                  {subscriptionUsage.daily.remaining} events remaining today
                </Text>
              </View>

              <View style={styles.usageDetailSection}>
                <Text style={styles.usageDetailTitle}>Monthly Usage</Text>
                <View style={styles.usageDetailItem}>
                  <Text style={styles.usageDetailLabel}>Events Created This Month:</Text>
                  <Text style={styles.usageDetailValue}>
                    {subscriptionUsage.monthly.used} / {subscriptionUsage.monthly.limit}
                  </Text>
                </View>
                <View style={styles.usageProgressBar}>
                  <View 
                    style={[
                      styles.usageProgressFill, 
                      { width: `${Math.min(100, (subscriptionUsage.monthly.used / subscriptionUsage.monthly.limit) * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.usageRemaining}>
                  {subscriptionUsage.monthly.remaining} events remaining this month
                </Text>
              </View>

              <View style={styles.usageDetailSection}>
                <Text style={styles.usageDetailTitle}>Total Statistics</Text>
                <View style={styles.usageDetailItem}>
                  <Text style={styles.usageDetailLabel}>Total Events Created:</Text>
                  <Text style={styles.usageDetailValue}>{subscriptionUsage.total.eventsCreated}</Text>
                </View>
                <View style={styles.usageDetailItem}>
                  <Text style={styles.usageDetailLabel}>Events Attended:</Text>
                  <Text style={styles.usageDetailValue}>{subscriptionUsage.total.eventsAttended}</Text>
                </View>
                <View style={styles.usageDetailItem}>
                  <Text style={styles.usageDetailLabel}>Ratings Given:</Text>
                  <Text style={styles.usageDetailValue}>{subscriptionUsage.total.ratingsGiven}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )

  const renderBillingModal = () => (
    <Modal visible={showBillingModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Billing History</Text>
          <TouchableOpacity onPress={() => setShowBillingModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {billingHistory.length > 0 ? (
            billingHistory.map((bill, index) => (
              <View key={bill.id} style={styles.billingItem}>
                <View style={styles.billingHeader}>
                  <Text style={styles.billingDate}>
                    {new Date(bill.date).toLocaleDateString()}
                  </Text>
                  <Text style={[
                    styles.billingStatus,
                    { color: bill.status === 'paid' ? '#28a745' : '#ffc107' }
                  ]}>
                    {bill.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.billingDescription}>{bill.description}</Text>
                <Text style={styles.billingAmount}>
                  ${bill.amount} {bill.currency}
                </Text>
                <Text style={styles.billingPlan}>{bill.plan} Plan</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No billing history available</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )

  const renderPlanChangeModal = () => {
    const pricing = userService.getSubscriptionPricing()
    
    return (
      <Modal visible={showPlanChangeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Plan</Text>
            <TouchableOpacity onPress={() => setShowPlanChangeModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.planChangeDescription}>
              Choose your preferred billing cycle. Your current subscription will be adjusted accordingly.
            </Text>

            <View style={styles.planSelector}>
              <TouchableOpacity
                style={[
                  styles.planOption,
                  selectedPlan === 'monthly' && styles.planOptionActive
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={styles.planTitle}>Monthly</Text>
                <Text style={styles.planPrice}>${pricing.monthly.price}/{pricing.monthly.currency}</Text>
                <Text style={styles.planDescription}>Billed monthly</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planOption,
                  selectedPlan === 'yearly' && styles.planOptionActive
                ]}
                onPress={() => setSelectedPlan('yearly')}
              >
                <Text style={styles.planTitle}>Yearly</Text>
                <Text style={styles.planPrice}>${pricing.yearly.price}/{pricing.yearly.currency}</Text>
                <Text style={styles.planSavings}>{pricing.yearly.savings}</Text>
                <Text style={styles.planDescription}>Billed annually</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isAuthLoading && styles.submitButtonDisabled]} 
              onPress={handleChangePlan}
              disabled={isAuthLoading}
            >
              <Text style={styles.submitButtonText}>
                {isAuthLoading ? 'Processing...' : 'Change Plan'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  const renderBenefitsModal = () => (
    <Modal visible={showBenefitsModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Subscription Benefits</Text>
          <TouchableOpacity onPress={() => setShowBenefitsModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {subscriptionBenefits && (
            <>
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsSectionTitle}>Free Plan</Text>
                <View style={styles.benefitsFeatures}>
                  {subscriptionBenefits.free.features.map((feature: string, index: number) => (
                    <Text key={index} style={styles.benefitFeature}>✓ {feature}</Text>
                  ))}
                </View>
                <View style={styles.benefitsLimitations}>
                  {subscriptionBenefits.free.limitations.map((limitation: string, index: number) => (
                    <Text key={index} style={styles.benefitLimitation}>• {limitation}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsSectionTitle}>Registered Plan</Text>
                <View style={styles.benefitsFeatures}>
                  {subscriptionBenefits.registered.features.map((feature: string, index: number) => (
                    <Text key={index} style={styles.benefitFeature}>✓ {feature}</Text>
                  ))}
                </View>
                <View style={styles.benefitsLimitations}>
                  {subscriptionBenefits.registered.limitations.map((limitation: string, index: number) => (
                    <Text key={index} style={styles.benefitLimitation}>• {limitation}</Text>
                  ))}
                </View>
              </View>

              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsSectionTitle}>Premium Plan</Text>
                <View style={styles.benefitsFeatures}>
                  {subscriptionBenefits.premium.features.map((feature: string, index: number) => (
                    <Text key={index} style={styles.benefitFeature}>✓ {feature}</Text>
                  ))}
                </View>
                <View style={styles.benefitsLimitations}>
                  {subscriptionBenefits.premium.limitations.map((limitation: string, index: number) => (
                    <Text key={index} style={styles.benefitLimitation}>• {limitation}</Text>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )

  if (isLoading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {!isAuthenticated ? (
            <View style={styles.authPrompt}>
              <Text style={styles.authPromptTitle}>Welcome to Event App</Text>
              <Text style={styles.authPromptText}>
                Sign in to sync your events, ratings, and preferences across devices
              </Text>
              <TouchableOpacity 
                style={styles.authButton}
                onPress={() => setShowAuthModal(true)}
              >
                <Text style={styles.authButtonText}>Sign In / Sign Up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* User Info */}
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {currentUser?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{currentUser?.name}</Text>
                  <Text style={styles.userEmail}>{currentUser?.email}</Text>
                  <Text style={[
                    styles.subscriptionStatus,
                    { color: getSubscriptionColor(currentUser?.subscription) }
                  ]}>
                    {currentUser?.subscription ? getSubscriptionStatusText(currentUser.subscription) : 'Free'}
                  </Text>
                </View>
              </View>

              {/* Usage Statistics */}
              {subscriptionUsage && subscriptionUsage.daily && (
                <View style={styles.usageSection}>
                  <Text style={styles.sectionTitle}>Usage Statistics</Text>
                  <View style={styles.usageGrid}>
                    <View style={styles.usageItem}>
                      <Text style={styles.usageNumber}>{subscriptionUsage.daily.used}</Text>
                      <Text style={styles.usageLabel}>Today</Text>
                      <Text style={styles.usageLimit}>/ {subscriptionUsage.daily.limit}</Text>
                    </View>
                    <View style={styles.usageItem}>
                      <Text style={styles.usageNumber}>{subscriptionUsage.monthly.used}</Text>
                      <Text style={styles.usageLabel}>This Month</Text>
                      <Text style={styles.usageLimit}>/ {subscriptionUsage.monthly.limit}</Text>
                    </View>
                    <View style={styles.usageItem}>
                      <Text style={styles.usageNumber}>{subscriptionUsage.total.eventsCreated}</Text>
                      <Text style={styles.usageLabel}>Total Created</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => setShowUsageModal(true)}
                  >
                    <Text style={styles.viewDetailsText}>View Detailed Usage</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subscription Details */}
              {detailedSubscription && detailedSubscription.status && detailedSubscription.status === 'premium' && (
                <View style={styles.subscriptionSection}>
                  <Text style={styles.sectionTitle}>Premium Subscription</Text>
                  <View style={styles.subscriptionDetails}>
                    <View style={styles.subscriptionDetailItem}>
                      <Text style={styles.subscriptionDetailLabel}>Plan:</Text>
                      <Text style={styles.subscriptionDetailValue}>
                        {detailedSubscription.plan === 'monthly' ? 'Monthly ($9.99/month)' : 'Yearly ($99.99/year)'}
                      </Text>
                    </View>
                    
                    {detailedSubscription.daysRemaining !== null && (
                      <View style={styles.subscriptionDetailItem}>
                        <Text style={styles.subscriptionDetailLabel}>
                          {detailedSubscription.autoRenew ? 'Renews:' : 'Expires:'}
                        </Text>
                        <Text style={styles.subscriptionDetailValue}>
                          {detailedSubscription.daysRemaining} days
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.subscriptionDetailItem}>
                      <Text style={styles.subscriptionDetailLabel}>Status:</Text>
                      <Text style={[
                        styles.subscriptionDetailValue,
                        { color: detailedSubscription.autoRenew ? '#28a745' : '#ffc107' }
                      ]}>
                        {detailedSubscription.autoRenew ? 'Active (Auto-renew)' : 'Active (Cancelled)'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Account</Text>
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => setShowPreferencesModal(true)}
                >
                  <Text style={styles.actionIcon}>⚙️</Text>
                  <Text style={styles.actionText}>Preferences</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => setShowUsageModal(true)}
                >
                  <Text style={styles.actionIcon}>📊</Text>
                  <Text style={styles.actionText}>Usage & Limits</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>

                {detailedSubscription?.status === 'premium' && (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => setShowBillingModal(true)}
                  >
                    <Text style={styles.actionIcon}>💳</Text>
                    <Text style={styles.actionText}>Billing History</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                )}

                {detailedSubscription?.status === 'premium' && detailedSubscription.plan && (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => setShowPlanChangeModal(true)}
                  >
                    <Text style={styles.actionIcon}>🔄</Text>
                    <Text style={styles.actionText}>Change Plan</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => setShowBenefitsModal(true)}
                >
                  <Text style={styles.actionIcon}>⭐</Text>
                  <Text style={styles.actionText}>Subscription Benefits</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => setShowSubscriptionManager(true)}
                >
                  <Text style={styles.actionIcon}>📋</Text>
                  <Text style={styles.actionText}>Manage Subscription</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => setShowSubscriptionTerms(true)}
                >
                  <Text style={styles.actionIcon}>📄</Text>
                  <Text style={styles.actionText}>Subscription Terms</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>

                {detailedSubscription?.canUpgrade ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => setShowSubscriptionModal(true)}
                  >
                    <Text style={styles.actionIcon}>⭐</Text>
                    <Text style={styles.actionText}>Upgrade</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                ) : detailedSubscription?.canCancel ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={handleCancelSubscription}
                  >
                    <Text style={styles.actionIcon}>❌</Text>
                    <Text style={styles.actionText}>Cancel</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                ) : detailedSubscription?.canReactivate ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={handleReactivateSubscription}
                  >
                    <Text style={styles.actionIcon}>🔄</Text>
                    <Text style={styles.actionText}>Reactivate</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={handleSignOut}
                >
                  <Text style={styles.actionIcon}>🚪</Text>
                  <Text style={styles.actionText}>Sign Out</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Render all modals */}
        {renderAuthModal()}
        {renderSubscriptionModal()}
        {renderPreferencesModal()}
        {renderUsageModal()}
        {renderBillingModal()}
        {renderPlanChangeModal()}
        {renderBenefitsModal()}
        
        {/* Subscription Management Modals */}
        <SubscriptionManager 
          visible={showSubscriptionManager} 
          onClose={() => setShowSubscriptionManager(false)} 
        />
        
        <SubscriptionTerms 
          visible={showSubscriptionTerms} 
          onClose={() => setShowSubscriptionTerms(false)} 
        />
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 10 : 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  authPrompt: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  authPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  authPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subscriptionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dailyLimitText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionArrow: {
    fontSize: 18,
    color: '#ccc',
  },
  premiumSection: {
    marginBottom: 30,
  },
  featuresList: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 10 : 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 14,
  },
  planSelector: {
    marginBottom: 30,
  },
  planOption: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  planOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  planSavings: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 5,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#333',
  },
  limitationsSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  limitationsList: {
    marginBottom: 20,
  },
  limitationItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionSection: {
    marginBottom: 30,
  },
  subscriptionDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  subscriptionDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  subscriptionDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  subscriptionDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  usageSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  usageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  usageItem: {
    alignItems: 'center',
  },
  usageNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  usageLimit: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  usageDetailSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  usageDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  usageDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  usageDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  usageDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  usageProgressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 10,
  },
  usageProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  usageRemaining: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  billingItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  billingDate: {
    fontSize: 14,
    color: '#666',
  },
  billingStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  billingDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  billingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  billingPlan: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
  benefitsSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  benefitsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  benefitsFeatures: {
    marginBottom: 10,
  },
  benefitFeature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  benefitsLimitations: {
    marginTop: 10,
  },
  benefitLimitation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  restoreButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  planChangeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
})

export default UserProfile
