import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView
} from 'react-native';
import { userService } from '../utils/userService';
import SubscriptionTerms from './SubscriptionTerms';
import { useEvents } from '../context/EventContext';

interface SubscriptionManagerProps {
  visible: boolean;
  onClose: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ visible, onClose }) => {
  const { refreshUserGroupLimits } = useEvents();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSubscriptionStatus();
    }
  }, [visible]);

  const loadSubscriptionStatus = async () => {
    setIsLoading(true);
    try {
      const status = await userService.getDetailedSubscriptionStatus();
      setSubscriptionStatus(status);
      
      // Refresh user group limits after subscription status change
      await refreshUserGroupLimits();
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    try {
      const result = await userService.restorePurchases();
      if (result.success) {
        Alert.alert('Success', 'Your purchases have been restored successfully!');
        await loadSubscriptionStatus();
        
        // Refresh user group limits after restore
        await refreshUserGroupLimits();
      } else {
        Alert.alert('Restore Failed', result.error || 'No purchases found to restore.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'An unexpected error occurred while restoring purchases.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'To cancel your subscription, you need to do it through your device settings:\n\n1. Open Settings\n2. Tap your Apple ID\n3. Tap "Subscriptions"\n4. Find "Event Discovery"\n5. Tap "Cancel Subscription"\n\nWould you like to open Settings now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openURL('App-Prefs:root=General&path=ManagedConfigurationList');
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'For subscription support, please email us at support@eventdiscovery.app',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: () => {
            Linking.openURL('mailto:support@eventdiscovery.app?subject=Subscription Support');
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'premium':
        return '#4CAF50';
      case 'expired':
        return '#FF9800';
      case 'free':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'premium':
        return 'Premium Active';
      case 'expired':
        return 'Expired';
      case 'free':
        return 'Free Plan';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscription Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading subscription status...</Text>
            </View>
          ) : subscriptionStatus ? (
            <>
              {/* Current Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscriptionStatus.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(subscriptionStatus.status)}</Text>
                  </View>
                  {subscriptionStatus.plan && (
                    <Text style={styles.planText}>
                      {subscriptionStatus.plan.charAt(0).toUpperCase() + subscriptionStatus.plan.slice(1)} Plan
                    </Text>
                  )}
                </View>
              </View>

              {/* Subscription Details */}
              {subscriptionStatus.status === 'premium' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subscription Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Start Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(subscriptionStatus.startDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>End Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(subscriptionStatus.endDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Auto-Renew:</Text>
                    <Text style={styles.detailValue}>
                      {subscriptionStatus.autoRenew ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  {subscriptionStatus.daysRemaining !== null && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Days Remaining:</Text>
                      <Text style={styles.detailValue}>
                        {subscriptionStatus.daysRemaining} days
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Premium Features */}
              {subscriptionStatus.status === 'premium' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Premium Features</Text>
                  {subscriptionStatus.features.map((feature: string, index: number) => (
                    <View key={index} style={styles.featureRow}>
                      <Text style={styles.featureIcon}>✓</Text>
                      <Text style={styles.featureText}>
                        {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                
                {/* Restore Purchases */}
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleRestorePurchases}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>🔄 Restore Purchases</Text>
                </TouchableOpacity>

                {/* Cancel Subscription */}
                {subscriptionStatus.status === 'premium' && subscriptionStatus.canCancel && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]} 
                    onPress={handleCancelSubscription}
                  >
                    <Text style={styles.cancelButtonText}>❌ Cancel Subscription</Text>
                  </TouchableOpacity>
                )}

                {/* Contact Support */}
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleContactSupport}
                >
                  <Text style={styles.actionButtonText}>📞 Contact Support</Text>
                </TouchableOpacity>

                {/* View Terms */}
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowTerms(true)}
                >
                  <Text style={styles.actionButtonText}>📋 View Subscription Terms</Text>
                </TouchableOpacity>
              </View>

              {/* Upgrade Prompt */}
              {subscriptionStatus.status === 'free' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Upgrade to Premium</Text>
                  <Text style={styles.upgradeText}>
                    Get access to unlimited events, advanced search, extended radius (500km), and more premium features! Currently limited to 1 event/day, 15km radius, and 1 week event filter.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.upgradeButton]} 
                    onPress={() => {
                      onClose();
                      // This would typically open the subscription modal
                    }}
                  >
                    <Text style={styles.upgradeButtonText}>⭐ Upgrade Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load subscription status</Text>
              <TouchableOpacity style={styles.actionButton} onPress={loadSubscriptionStatus}>
                <Text style={styles.actionButtonText}>🔄 Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Subscription Terms Modal */}
      <SubscriptionTerms 
        visible={showTerms} 
        onClose={() => setShowTerms(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planText: {
    fontSize: 16,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 10,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  upgradeButton: {
    backgroundColor: '#FF9500',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubscriptionManager;
