import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native'
import { AppError, ErrorType } from '../utils/errorHandler'

interface ErrorDisplayProps {
  error: AppError | null
  onRetry?: () => void
  onDismiss?: () => void
  autoHide?: boolean
  autoHideDelay?: number
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(-100)).current

  React.useEffect(() => {
    if (error) {
      // Show error with animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start()

      // Auto-hide after delay
      if (autoHide) {
        const timer = setTimeout(() => {
          hideError()
        }, autoHideDelay)

        return () => clearTimeout(timer)
      }
    } else {
      hideError()
    }
  }, [error])

  const hideError = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      onDismiss?.()
    })
  }

  if (!error) return null

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.NETWORK:
        return '📡'
      case ErrorType.AUTHENTICATION:
        return '🔐'
      case ErrorType.PERMISSION:
        return '🚫'
      case ErrorType.VALIDATION:
        return '⚠️'
      case ErrorType.SERVER:
        return '🖥️'
      default:
        return '❌'
    }
  }

  const getErrorColor = () => {
    switch (error.severity) {
      case 'critical':
        return '#d32f2f'
      case 'high':
        return '#f57c00'
      case 'medium':
        return '#ff8f00'
      case 'low':
        return '#388e3c'
      default:
        return '#757575'
    }
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderLeftColor: getErrorColor()
        }
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getErrorIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{getErrorTitle(error)}</Text>
          <Text style={styles.message}>{error.userMessage}</Text>
        </View>
        <View style={styles.actions}>
          {error.retryable && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dismissButton} onPress={hideError}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const getErrorTitle = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Connection Error'
    case ErrorType.AUTHENTICATION:
      return 'Sign In Required'
    case ErrorType.PERMISSION:
      return 'Access Denied'
    case ErrorType.VALIDATION:
      return 'Invalid Input'
    case ErrorType.SERVER:
      return 'Server Error'
    default:
      return 'Error'
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  icon: {
    fontSize: 24,
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  dismissButton: {
    padding: 4
  },
  dismissText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold'
  }
})

export default ErrorDisplay
