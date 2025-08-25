import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native'
import { userService, UserGroup, UserGroupFeatures } from '../utils/userService'

interface UserGroupManagerProps {
  visible: boolean
  onClose: () => void
}

interface UserGroupCardProps {
  group: UserGroup
  features: UserGroupFeatures
  isCurrent: boolean
  onUpgrade?: () => void
}

const UserGroupCard: React.FC<UserGroupCardProps> = ({ group, features, isCurrent, onUpgrade }) => {
  const getGroupColor = (group: UserGroup) => {
    switch (group) {
      case 'unregistered': return '#6B7280'
      case 'registered': return '#3B82F6'
      case 'premium': return '#F59E0B'
    }
  }

  const getGroupTitle = (group: UserGroup) => {
    switch (group) {
      case 'unregistered': return 'Unregistered User'
      case 'registered': return 'Registered User'
      case 'premium': return 'Premium Subscriber'
    }
  }

  const getGroupDescription = (group: UserGroup) => {
    switch (group) {
      case 'unregistered': return 'Basic access to view events (5km radius, 1 day filter)'
      case 'registered': return 'Create events with limits (1/day, 15km radius, 1 week filter)'
      case 'premium': return 'Unlimited access to all features'
    }
  }

  return (
    <View style={[styles.card, { borderColor: getGroupColor(group) }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: getGroupColor(group) }]}>
          {getGroupTitle(group)}
        </Text>
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: getGroupColor(group) }]}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.cardDescription}>{getGroupDescription(group)}</Text>
      
      <View style={styles.featuresList}>
        <Text style={styles.featuresTitle}>Features:</Text>
        {features.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>{feature.replace(/_/g, ' ')}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.limitsContainer}>
        <Text style={styles.limitsTitle}>Limits:</Text>
        <Text style={styles.limitText}>Events per day: {features.maxEventsPerDay}</Text>
        <Text style={styles.limitText}>Max radius: {features.maxRadiusKm}km</Text>
        <Text style={styles.limitText}>Event filter: {features.maxEventFilterDays > 0 ? `${features.maxEventFilterDays} days` : 'No limit'}</Text>
      </View>
      
      {onUpgrade && !isCurrent && (
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: getGroupColor(group) }]}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export const UserGroupManager: React.FC<UserGroupManagerProps> = ({ visible, onClose }) => {
  const [currentGroup, setCurrentGroup] = useState<UserGroup>('unregistered')
  const [groupComparison, setGroupComparison] = useState<{
    unregistered: UserGroupFeatures
    registered: UserGroupFeatures
    premium: UserGroupFeatures
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadUserGroupData()
    }
  }, [visible])

  const loadUserGroupData = async () => {
    try {
      setLoading(true)
      const [userGroup, comparison] = await Promise.all([
        userService.getUserGroup(),
        userService.getUserGroupComparison()
      ])
      
      setCurrentGroup(userGroup)
      setGroupComparison(comparison)
    } catch (error) {
      console.error('Error loading user group data:', error)
      Alert.alert('Error', 'Failed to load user group information')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (targetGroup: UserGroup) => {
    try {
      setUpgradeLoading(true)
      
      if (targetGroup === 'registered') {
        // Show sign up modal or navigate to sign up
        Alert.alert(
          'Sign Up Required',
          'Please sign up to access registered user features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => {
              // Navigate to sign up screen
              onClose()
            }}
          ]
        )
      } else if (targetGroup === 'premium') {
        // Show subscription modal
        Alert.alert(
          'Premium Subscription',
          'Upgrade to premium to unlock all features including unlimited events, premium categories, and priority support.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Subscribe', onPress: () => {
              // Navigate to subscription screen
              onClose()
            }}
          ]
        )
      }
    } catch (error) {
      console.error('Error handling upgrade:', error)
      Alert.alert('Error', 'Failed to process upgrade request')
    } finally {
      setUpgradeLoading(false)
    }
  }

  const getUpgradeAction = (group: UserGroup) => {
    if (group === currentGroup) return undefined
    
    switch (group) {
      case 'registered':
        return () => handleUpgrade('registered')
      case 'premium':
        return () => handleUpgrade('premium')
      default:
        return undefined
    }
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>User Groups</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading user group information...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.currentGroupContainer}>
              <Text style={styles.currentGroupTitle}>Your Current Plan</Text>
              <View style={styles.currentGroupBadge}>
                <Text style={styles.currentGroupText}>
                  {currentGroup.charAt(0).toUpperCase() + currentGroup.slice(1)} User
                </Text>
              </View>
            </View>

            {groupComparison && (
              <View style={styles.comparisonContainer}>
                <Text style={styles.comparisonTitle}>Available Plans</Text>
                
                <UserGroupCard
                  group="unregistered"
                  features={groupComparison.unregistered}
                  isCurrent={currentGroup === 'unregistered'}
                  onUpgrade={getUpgradeAction('unregistered')}
                />
                
                <UserGroupCard
                  group="registered"
                  features={groupComparison.registered}
                  isCurrent={currentGroup === 'registered'}
                  onUpgrade={getUpgradeAction('registered')}
                />
                
                <UserGroupCard
                  group="premium"
                  features={groupComparison.premium}
                  isCurrent={currentGroup === 'premium'}
                  onUpgrade={getUpgradeAction('premium')}
                />
              </View>
            )}

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>About User Groups</Text>
              <Text style={styles.infoText}>
                • Unregistered users can browse events with basic filtering (5km radius, 1 day filter)
              </Text>
              <Text style={styles.infoText}>
                • Registered users can create events (1/day), rate, and review (15km radius, 1 week filter)
              </Text>
              <Text style={styles.infoText}>
                • Premium subscribers get unlimited access to all features
              </Text>
            </View>
          </ScrollView>
        )}

        {upgradeLoading && (
          <View style={styles.upgradeLoadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.upgradeLoadingText}>Processing upgrade...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentGroupContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  currentGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  currentGroupBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  currentGroupText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  comparisonContainer: {
    marginBottom: 30,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  currentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 15,
  },
  featuresList: {
    marginBottom: 15,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  featureBullet: {
    fontSize: 14,
    color: '#3B82F6',
    marginRight: 8,
    marginTop: 1,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  limitsContainer: {
    marginBottom: 15,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  upgradeLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeLoadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
})

export default UserGroupManager
