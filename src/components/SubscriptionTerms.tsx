import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking
} from 'react-native';

interface SubscriptionTermsProps {
  visible: boolean;
  onClose: () => void;
}

const SubscriptionTerms: React.FC<SubscriptionTermsProps> = ({ visible, onClose }) => {
  const openAppStoreSettings = () => {
    Alert.alert(
      'Manage Subscription',
      'To manage your subscription, go to your device Settings > Apple ID > Subscriptions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // Open iOS Settings app
            Linking.openURL('App-Prefs:root=General&path=ManagedConfigurationList');
          }
        }
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://eventdiscovery.app/privacy');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://eventdiscovery.app/terms');
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscription Terms</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Pricing Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Pricing</Text>
            <Text style={styles.text}>
              • <Text style={styles.bold}>Premium Monthly:</Text> $4.99 USD per month
            </Text>
            <Text style={styles.text}>
              • <Text style={styles.bold}>Premium Yearly:</Text> $39.99 USD per year (33% savings)
            </Text>
            <Text style={styles.note}>
              Prices may vary by location and are subject to change.
            </Text>
          </View>

          {/* Auto-Renewal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Auto-Renewal</Text>
            <Text style={styles.text}>
              • Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period
            </Text>
            <Text style={styles.text}>
              • Your account will be charged for renewal within 24 hours prior to the end of the current period
            </Text>
            <Text style={styles.text}>
              • You can manage and turn off auto-renewal at any time after purchase
            </Text>
          </View>

          {/* Cancellation Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>❌ Cancellation</Text>
            <Text style={styles.text}>
              To cancel your subscription:
            </Text>
            <Text style={styles.text}>
              1. Open your device Settings
            </Text>
            <Text style={styles.text}>
              2. Tap your Apple ID at the top
            </Text>
            <Text style={styles.text}>
              3. Tap "Subscriptions"
            </Text>
            <Text style={styles.text}>
              4. Find "Event Discovery" and tap it
            </Text>
            <Text style={styles.text}>
              5. Tap "Cancel Subscription"
            </Text>
            <TouchableOpacity onPress={openAppStoreSettings} style={styles.linkButton}>
              <Text style={styles.linkText}>Open Settings Now</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Premium Features</Text>
            <Text style={styles.text}>
              • Unlimited event creation and editing
            </Text>
            <Text style={styles.text}>
              • Advanced search and filtering options
            </Text>
            <Text style={styles.text}>
              • Extended event radius (up to 500km)
            </Text>
            <Text style={styles.text}>
              • Priority customer support
            </Text>
            <Text style={styles.text}>
              • Analytics and insights
            </Text>
            <Text style={styles.text}>
              • Custom categories and tags
            </Text>
            <Text style={styles.text}>
              • Export event data
            </Text>
            <Text style={styles.text}>
              • Ad-free experience
            </Text>
            <Text style={styles.text}>
              • Early access to new features
            </Text>
          </View>

          {/* Payment Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Payment Terms</Text>
            <Text style={styles.text}>
              • Payment will be charged to your Apple ID account at confirmation of purchase
            </Text>
            <Text style={styles.text}>
              • All fees are non-refundable except as required by law
            </Text>
            <Text style={styles.text}>
              • We may change subscription prices with 30 days notice
            </Text>
            <Text style={styles.text}>
              • No refunds for partial billing periods
            </Text>
          </View>

          {/* Free Trial Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Free Trial</Text>
            <Text style={styles.text}>
              • New subscribers get a 7-day free trial
            </Text>
            <Text style={styles.text}>
              • Free trial automatically converts to paid subscription unless cancelled
            </Text>
            <Text style={styles.text}>
              • You can cancel during the trial period to avoid charges
            </Text>
            <Text style={styles.note}>
              Free trial is only available for new subscribers.
            </Text>
          </View>

          {/* Restore Purchases */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Restore Purchases</Text>
            <Text style={styles.text}>
              • If you've previously purchased a subscription, you can restore it
            </Text>
            <Text style={styles.text}>
              • Tap "Restore Purchases" in the app to restore your subscription
            </Text>
            <Text style={styles.text}>
              • This will restore your subscription across all your devices
            </Text>
          </View>

          {/* Legal Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Legal</Text>
            <TouchableOpacity onPress={openPrivacyPolicy} style={styles.linkButton}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openTermsOfService} style={styles.linkButton}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Contact</Text>
            <Text style={styles.text}>
              For subscription support, contact us at:
            </Text>
            <Text style={styles.text}>
              support@eventdiscovery.app
            </Text>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </View>
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  note: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  linkButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});

export default SubscriptionTerms;
