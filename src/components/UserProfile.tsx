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
  Switch
} from 'react-native'
import { userService, User, Subscription, UserPreferences } from '../utils/userService'

interface UserProfileProps {
  visible: boolean
  onClose: () => void
}

const UserProfile: React.FC<UserProfileProps> = ({ visible, onClose }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  
  // Auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  
  // Subscription states
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  
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
    loadUserData()
  }, [visible])

  const loadUserData = async () => {
    const user = await userService.getCurrentUser()
    const authenticated = await userService.isAuthenticated()
    
    setCurrentUser(user)
    setIsAuthenticated(authenticated)
    
    if (user) {
      setPreferences(user.preferences)
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
      let success = false
      
      if (authMode === 'signup') {
        success = await userService.signUp(authEmail, authPassword, authName)
      } else {
        success = await userService.signIn(authEmail, authPassword)
      }

      if (success) {
        Alert.alert(
          'Success', 
          authMode === 'signup' ? 'Account created successfully!' : 'Welcome back!',
          [{ text: 'OK', onPress: () => setShowAuthModal(false) }]
        )
        loadUserData()
        resetAuthForm()
      } else {
        Alert.alert(
          'Error', 
          authMode === 'signup' 
            ? 'Failed to create account. Please try again.' 
            : 'Sign in failed. Please check your credentials and try again.'
        )
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
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

    const price = userService.getSubscriptionPrice(selectedPlan)
    const savings = userService.getSubscriptionSavings()
    
    Alert.alert(
      'Subscribe to Premium',
      `Subscribe to ${selectedPlan} plan for $${price}${selectedPlan === 'yearly' ? ` (Save $${savings})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe', 
          onPress: async () => {
            const success = await userService.subscribeToPremium(selectedPlan)
            if (success) {
              Alert.alert('Success', 'Welcome to Premium! 🎉')
              loadUserData()
              setShowSubscriptionModal(false)
            } else {
              Alert.alert('Error', 'Failed to subscribe. Please try again.')
            }
          }
        }
      ]
    )
  }

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive',
          onPress: async () => {
            const success = await userService.cancelSubscription()
            if (success) {
              Alert.alert('Success', 'Subscription cancelled successfully')
              loadUserData()
            } else {
              Alert.alert('Error', 'Failed to cancel subscription')
            }
          }
        }
      ]
    )
  }

  const handleReactivateSubscription = async () => {
    Alert.alert(
      'Reactivate Subscription',
      'Would you like to reactivate your subscription?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reactivate', 
          onPress: async () => {
            const success = await userService.reactivateSubscription()
            if (success) {
              Alert.alert('Success', 'Subscription reactivated successfully')
              loadUserData()
            } else {
              Alert.alert('Error', 'Failed to reactivate subscription')
            }
          }
        }
      ]
    )
  }

  const handleUpdatePreferences = async () => {
    const success = await userService.updatePreferences(preferences)
    if (success) {
      Alert.alert('Success', 'Preferences updated successfully')
      setShowPreferencesModal(false)
      loadUserData()
    } else {
      Alert.alert('Error', 'Failed to update preferences')
    }
  }

  const resetAuthForm = () => {
    setAuthEmail('')
    setAuthPassword('')
    setAuthName('')
  }

  const getSubscriptionStatusText = (subscription: Subscription): string => {
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

  const getSubscriptionColor = (subscription: Subscription): string => {
    if (subscription.status === 'premium') {
      return '#FFD700'
    }
    return '#666'
  }

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
              {authMode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  const renderSubscriptionModal = () => (
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
              <Text style={styles.planPrice}>$9.99/month</Text>
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
              <Text style={styles.planPrice}>$99.99/year</Text>
              <Text style={styles.planSavings}>Save $19.89 (17% off)</Text>
              <Text style={styles.planDescription}>Best value for long-term users</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresList}>
            <Text style={styles.featuresTitle}>Premium Features:</Text>
            {[
              '✨ Unlimited event creation',
              '🔍 Advanced search & filtering',
              '📊 Analytics & insights',
              '🎨 Custom categories',
              '📤 Export your data',
              '🚫 No advertisements',
              '⚡ Early access to new features',
              '🎯 Priority support'
            ].map((feature, index) => (
              <Text key={index} style={styles.featureItem}>{feature}</Text>
            ))}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubscribe}>
            <Text style={styles.submitButtonText}>
              Subscribe to {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

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
              value={preferences.notifications}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, notifications: value }))}
            />
          </View>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Email Updates</Text>
            <Switch
              value={preferences.emailUpdates}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, emailUpdates: value }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Default Search Radius (km)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="10"
              value={preferences.defaultRadius.toString()}
              onChangeText={(text) => setPreferences(prev => ({ ...prev, defaultRadius: parseInt(text) || 10 }))}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleUpdatePreferences}>
            <Text style={styles.submitButtonText}>Save Preferences</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
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
                    { color: getSubscriptionColor(currentUser?.subscription!) }
                  ]}>
                    {currentUser ? getSubscriptionStatusText(currentUser.subscription) : 'Free'}
                  </Text>
                </View>
              </View>

              {/* Stats */}
              {currentUser && (
                <View style={styles.statsSection}>
                  <Text style={styles.sectionTitle}>Your Activity</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{currentUser.stats.eventsCreated}</Text>
                      <Text style={styles.statLabel}>Events Created</Text>
                      {currentUser.subscription.status === 'free' && (
                        <Text style={styles.dailyLimitText}>
                          {userService.canCreateEventToday() ? '1 event today' : '0 events today'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{currentUser.stats.ratingsGiven}</Text>
                      <Text style={styles.statLabel}>Ratings Given</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{currentUser.stats.totalEvents}</Text>
                      <Text style={styles.statLabel}>Total Events</Text>
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

                {currentUser?.subscription.status === 'free' ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => setShowSubscriptionModal(true)}
                  >
                    <Text style={styles.actionIcon}>⭐</Text>
                    <Text style={styles.actionText}>Upgrade to Premium</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                ) : currentUser?.subscription.status === 'premium' && currentUser?.subscription.autoRenew ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={handleCancelSubscription}
                  >
                    <Text style={styles.actionIcon}>❌</Text>
                    <Text style={styles.actionText}>Cancel Subscription</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                ) : currentUser?.subscription.status === 'premium' && !currentUser?.subscription.autoRenew ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={handleReactivateSubscription}
                  >
                    <Text style={styles.actionIcon}>🔄</Text>
                    <Text style={styles.actionText}>Reactivate Subscription</Text>
                    <Text style={styles.actionArrow}>›</Text>
                  </TouchableOpacity>
                ) : currentUser?.subscription.status === 'expired' ? (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => setShowSubscriptionModal(true)}
                  >
                    <Text style={styles.actionIcon}>⭐</Text>
                    <Text style={styles.actionText}>Renew Subscription</Text>
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

              {/* Free User Limitations */}
              {currentUser?.subscription.status === 'free' && (
                <View style={styles.limitationsSection}>
                  <Text style={styles.sectionTitle}>Free Plan Limitations</Text>
                  <View style={styles.limitationsList}>
                    <Text style={styles.limitationItem}>• 1 event per day</Text>
                    <Text style={styles.limitationItem}>• Events visible only 1 week ahead</Text>
                    <Text style={styles.limitationItem}>• Basic search and filtering</Text>
                    <Text style={styles.limitationItem}>• Local ratings only</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={() => setShowSubscriptionModal(true)}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Premium Features */}
              {currentUser?.subscription.status === 'premium' && currentUser?.subscription.autoRenew && (
                <View style={styles.premiumSection}>
                  <Text style={styles.sectionTitle}>Premium Features</Text>
                  <View style={styles.featuresList}>
                    {userService.getPremiumFeatures().map((feature, index) => (
                      <Text key={index} style={styles.featureItem}>✓ {feature.replace('_', ' ')}</Text>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {renderAuthModal()}
        {renderSubscriptionModal()}
        {renderPreferencesModal()}
      </View>
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
    paddingTop: 60,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
    paddingTop: 60,
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
})

module.exports = UserProfile
