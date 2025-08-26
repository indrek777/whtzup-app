import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { eventRegistrationService, EventRegistration } from '../utils/eventRegistrationService';
import { userService } from '../utils/userService';

interface EventRegistrationProps {
  eventId: string;
  eventName: string;
  onRegistrationChange?: (registrationCount: number, isRegistered: boolean) => void;
}

export const EventRegistrationComponent: React.FC<EventRegistrationProps> = ({
  eventId,
  eventName,
  onRegistrationChange,
}) => {
  const [registrationInfo, setRegistrationInfo] = useState<EventRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Load registration info on component mount
  useEffect(() => {
    loadRegistrationInfo();
  }, [eventId]);

  const loadRegistrationInfo = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const result = await eventRegistrationService.getEventRegistrationInfo(eventId);
      if (result.success && result.data) {
        setRegistrationInfo(result.data);
        onRegistrationChange?.(result.data.registrationCount, result.data.isUserRegistered);
      } else {
        console.error('Failed to load registration info:', result.error);
        setHasError(true);
        // Set default state for failed requests
        setRegistrationInfo({
          eventId,
          registrationCount: 0,
          isUserRegistered: false,
        });
      }
    } catch (error) {
      console.error('Failed to load registration info:', error);
      setHasError(true);
      // Set default state for network errors
      setRegistrationInfo({
        eventId,
        registrationCount: 0,
        isUserRegistered: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRegistration = async () => {
    // Check if user is authenticated
    const isAuth = await userService.isAuthenticated();
    if (!isAuth) {
      Alert.alert(
        'Authentication Required',
        'You need to sign in to register for events. Would you like to sign in now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => {
            Alert.alert('Sign In', 'Please sign in through the app settings to register for events.');
          }}
        ]
      );
      return;
    }

    if (!registrationInfo) {
      Alert.alert('Error', 'Registration information not available. Please try again.');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await eventRegistrationService.toggleRegistration(
        eventId,
        registrationInfo.isUserRegistered
      );

      if (result.success) {
        // Update local state
        setRegistrationInfo({
          eventId,
          registrationCount: result.registrationCount,
          isUserRegistered: result.isRegistered,
        });

        // Notify parent component
        onRegistrationChange?.(result.registrationCount, result.isRegistered);

        // Show success message
        const action = result.isRegistered ? 'registered for' : 'unregistered from';
        Alert.alert(
          'Success',
          `You have successfully ${action} "${eventName}"`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update registration. Please try again.');
      }
    } catch (error) {
      console.error('Toggle registration error:', error);
      
      // Handle specific network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        Alert.alert('Network Error', 'Connection failed. Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading registration info...</Text>
      </View>
    );
  }

  if (!registrationInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.registrationInfo}>
          <Text style={styles.registrationCount}>
            👥 0 people registered
          </Text>
        </View>
        {hasError ? (
          <TouchableOpacity
            style={[styles.registrationButton, styles.errorButton]}
            onPress={loadRegistrationInfo}
          >
            <Text style={[styles.registrationButtonText, styles.errorButtonText]}>
              🔄 Retry
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.registrationButton, styles.unregisteredButton, styles.disabledButton]}
            disabled={true}
          >
            <Text style={[styles.registrationButtonText, styles.unregisteredButtonText]}>
              🔄 Loading...
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isRegistered = registrationInfo.isUserRegistered;
  const registrationCount = registrationInfo.registrationCount;

  return (
    <View style={styles.container}>
      <View style={styles.registrationInfo}>
        <Text style={styles.registrationCount}>
          👥 {registrationCount} {registrationCount === 1 ? 'person' : 'people'} registered
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.registrationButton,
          isRegistered ? styles.registeredButton : styles.unregisteredButton,
          isUpdating && styles.disabledButton,
        ]}
        onPress={handleToggleRegistration}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color={isRegistered ? "#FF3B30" : "white"} />
        ) : (
          <>
            <Text style={[
              styles.registrationButtonText,
              isRegistered ? styles.registeredButtonText : styles.unregisteredButtonText,
            ]}>
              {isRegistered ? '❌ Unregister' : '✅ Register'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  registrationInfo: {
    marginBottom: 12,
  },
  registrationCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  registrationButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  unregisteredButton: {
    backgroundColor: '#28a745',
  },
  registeredButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registrationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  unregisteredButtonText: {
    color: 'white',
  },
  registeredButtonText: {
    color: 'white',
  },
  errorButton: {
    backgroundColor: '#FF9500',
  },
  errorButtonText: {
    color: 'white',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
