import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native'
import { userService, UserGroup } from '../utils/userService'

interface UserGroupBannerProps {
  onUpgradePress?: () => void
  showUpgradeButton?: boolean
}

export const UserGroupBanner: React.FC<UserGroupBannerProps> = ({ 
  onUpgradePress,
  showUpgradeButton = true 
}) => {
  const [currentGroup, setCurrentGroup] = useState<UserGroup>('unregistered')
  const [loading, setLoading] = useState(true)
  const [upgradeBenefits, setUpgradeBenefits] = useState<string[]>([])

  useEffect(() => {
    loadUserGroupData()
  }, [])

  const loadUserGroupData = async () => {
    try {
      setLoading(true)
      const [userGroup, benefits] = await Promise.all([
        userService.getUserGroup(),
        userService.getUpgradeBenefits()
      ])
      
      setCurrentGroup(userGroup)
      setUpgradeBenefits(benefits.benefits)
    } catch (error) {
      console.error('Error loading user group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradePress = () => {
    if (onUpgradePress) {
      onUpgradePress()
      return
    }

    // Default upgrade behavior
    if (currentGroup === 'unregistered') {
      Alert.alert(
        'Sign Up Required',
        'Please sign up to access registered user features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => {
            // Navigate to sign up screen
            console.log('Navigate to sign up')
          }}
        ]
      )
    } else if (currentGroup === 'registered') {
      Alert.alert(
        'Premium Subscription',
        'Upgrade to premium to unlock all features including unlimited events, premium categories, and priority support.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Subscribe', onPress: () => {
            // Navigate to subscription screen
            console.log('Navigate to subscription')
          }}
        ]
      )
    }
  }

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

  const getGroupIcon = (group: UserGroup) => {
    switch (group) {
      case 'unregistered': return '👤'
      case 'registered': return '✅'
      case 'premium': return '👑'
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading user status...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { borderColor: getGroupColor(currentGroup) }]}>
      <View style={styles.content}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupIcon}>{getGroupIcon(currentGroup)}</Text>
          <View style={styles.textContainer}>
            <Text style={[styles.groupTitle, { color: getGroupColor(currentGroup) }]}>
              {getGroupTitle(currentGroup)}
            </Text>
            <Text style={styles.groupDescription}>
              {currentGroup === 'unregistered' && 'Sign up to create and manage events (currently: 5km radius, 1 day filter)'}
              {currentGroup === 'registered' && 'Upgrade to premium for unlimited features (currently: 1 event/day, 15km radius, 1 week filter)'}
              {currentGroup === 'premium' && 'You have access to all premium features'}
            </Text>
          </View>
        </View>
        
        {showUpgradeButton && currentGroup !== 'premium' && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: getGroupColor(currentGroup) }]}
            onPress={handleUpgradePress}
          >
            <Text style={styles.upgradeButtonText}>
              {currentGroup === 'unregistered' ? 'Sign Up' : 'Upgrade'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {currentGroup !== 'premium' && upgradeBenefits.length > 0 && (
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Upgrade to get:</Text>
          {upgradeBenefits.slice(0, 3).map((benefit, index) => (
            <Text key={index} style={styles.benefitText}>
              • {benefit}
            </Text>
          ))}
          {upgradeBenefits.length > 3 && (
            <Text style={styles.moreBenefitsText}>
              +{upgradeBenefits.length - 3} more benefits
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    margin: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 18,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  benefitsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
    lineHeight: 16,
  },
  moreBenefitsText: {
    fontSize: 12,
    color: '#3B82F6',
    fontStyle: 'italic',
    marginTop: 4,
  },
})

export default UserGroupBanner
