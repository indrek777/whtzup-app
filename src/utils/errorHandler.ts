import { Alert } from 'react-native'
// Type import guard for AlertButton (may not exist on older RN types)
type RNAlertButton = { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error context for better user messages
export interface ErrorContext {
  action?: string
  entity?: string
  field?: string
  value?: any
  userId?: string
  timestamp?: string
}

// Enhanced error interface
export interface AppError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  context?: ErrorContext
  originalError?: any
  retryable?: boolean
}

// User-friendly error messages
const USER_MESSAGES = {
  [ErrorType.NETWORK]: {
    default: 'Network connection issue. Please check your internet connection and try again.',
    timeout: 'Request timed out. Please try again.',
    offline: 'You appear to be offline. Please check your internet connection.',
    serverUnreachable: 'Unable to reach the server. Please try again later.'
  },
  [ErrorType.AUTHENTICATION]: {
    default: 'Please sign in to perform this action.',
    expired: 'Your session has expired. Please sign in again.',
    invalid: 'Invalid credentials. Please check your email and password.',
    required: 'Authentication is required for this action.'
  },
  [ErrorType.PERMISSION]: {
    default: 'You do not have permission to perform this action.',
    eventEdit: 'You can only edit events you created.',
    eventDelete: 'You can only delete events you created.',
    premium: 'This feature requires a premium subscription.'
  },
  [ErrorType.VALIDATION]: {
    default: 'Please check your input and try again.',
    required: 'This field is required.',
    email: 'Please enter a valid email address.',
    password: 'Password must be at least 6 characters long.',
    eventName: 'Event name is required and must be less than 500 characters.',
    venue: 'Venue is required and must be less than 500 characters.',
    coordinates: 'Please provide valid coordinates.',
    date: 'Please select a valid date and time.'
  },
  [ErrorType.SERVER]: {
    default: 'Server error. Please try again later.',
    maintenance: 'Server is under maintenance. Please try again later.',
    rateLimit: 'Too many requests. Please wait a moment and try again.',
    database: 'Database error. Please try again later.'
  },
  [ErrorType.UNKNOWN]: {
    default: 'An unexpected error occurred. Please try again.'
  }
}

// Error mapping from HTTP status codes
const HTTP_ERROR_MAPPING: { [key: number]: { type: ErrorType; severity: ErrorSeverity; message: string } } = {
  400: { type: ErrorType.VALIDATION, severity: ErrorSeverity.MEDIUM, message: 'Bad Request' },
  401: { type: ErrorType.AUTHENTICATION, severity: ErrorSeverity.MEDIUM, message: 'Unauthorized' },
  403: { type: ErrorType.PERMISSION, severity: ErrorSeverity.MEDIUM, message: 'Forbidden' },
  404: { type: ErrorType.VALIDATION, severity: ErrorSeverity.LOW, message: 'Not Found' },
  408: { type: ErrorType.NETWORK, severity: ErrorSeverity.MEDIUM, message: 'Request Timeout' },
  409: { type: ErrorType.VALIDATION, severity: ErrorSeverity.MEDIUM, message: 'Conflict' },
  429: { type: ErrorType.SERVER, severity: ErrorSeverity.MEDIUM, message: 'Too Many Requests' },
  500: { type: ErrorType.SERVER, severity: ErrorSeverity.HIGH, message: 'Internal Server Error' },
  502: { type: ErrorType.NETWORK, severity: ErrorSeverity.HIGH, message: 'Bad Gateway' },
  503: { type: ErrorType.SERVER, severity: ErrorSeverity.HIGH, message: 'Service Unavailable' },
  504: { type: ErrorType.NETWORK, severity: ErrorSeverity.HIGH, message: 'Gateway Timeout' }
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: AppError[] = []

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // Create an AppError from various error sources
  createError(
    error: any,
    context?: ErrorContext,
    type?: ErrorType,
    severity?: ErrorSeverity
  ): AppError {
    let appError: AppError

    // Handle HTTP errors
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode
      const mapping = HTTP_ERROR_MAPPING[status] || HTTP_ERROR_MAPPING[500]
      
      appError = {
        type: type || mapping.type,
        severity: severity || mapping.severity,
        message: error.message || mapping.message,
        userMessage: this.getUserMessage(mapping.type, error.message, context),
        context,
        originalError: error,
        retryable: status >= 500 || status === 408 || status === 429
      }
    }
    // Handle network errors
    else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      appError = {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: error.message,
        userMessage: USER_MESSAGES[ErrorType.NETWORK].default,
        context,
        originalError: error,
        retryable: true
      }
    }
    // Handle validation errors
    else if (error.name === 'ValidationError' || error.type === 'validation') {
      appError = {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: this.getUserMessage(ErrorType.VALIDATION, error.message, context),
        context,
        originalError: error,
        retryable: false
      }
    }
    // Handle authentication errors
    else if (error.name === 'AuthenticationError' || error.type === 'authentication') {
      appError = {
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: this.getUserMessage(ErrorType.AUTHENTICATION, error.message, context),
        context,
        originalError: error,
        retryable: false
      }
    }
    // Handle permission errors
    else if (error.name === 'PermissionError' || error.type === 'permission') {
      appError = {
        type: ErrorType.PERMISSION,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: this.getUserMessage(ErrorType.PERMISSION, error.message, context),
        context,
        originalError: error,
        retryable: false
      }
    }
    // Default error
    else {
      appError = {
        type: type || ErrorType.UNKNOWN,
        severity: severity || ErrorSeverity.MEDIUM,
        message: error.message || 'Unknown error',
        userMessage: USER_MESSAGES[ErrorType.UNKNOWN].default,
        context,
        originalError: error,
        retryable: false
      }
    }

    // Add timestamp
    appError.context = {
      ...appError.context,
      timestamp: new Date().toISOString()
    }

    return appError
  }

  // Get user-friendly message based on error type and context
  private getUserMessage(type: ErrorType, originalMessage: string, context?: ErrorContext): string {
    const messages = USER_MESSAGES[type]
    
    // Handle specific error messages
    if (originalMessage) {
      const lowerMessage = originalMessage.toLowerCase()
      
      // Network errors
      if (type === ErrorType.NETWORK) {
        if (lowerMessage.includes('timeout')) return (messages as any).timeout || messages.default
        if (lowerMessage.includes('offline')) return (messages as any).offline || messages.default
        if (lowerMessage.includes('unreachable')) return (messages as any).serverUnreachable || messages.default
      }
      
      // Authentication errors
      if (type === ErrorType.AUTHENTICATION) {
        if (lowerMessage.includes('expired')) return (messages as any).expired || messages.default
        if (lowerMessage.includes('invalid')) return (messages as any).invalid || messages.default
        if (lowerMessage.includes('required')) return (messages as any).required || messages.default
      }
      
      // Permission errors
      if (type === ErrorType.PERMISSION) {
        if (lowerMessage.includes('edit')) return (messages as any).eventEdit || messages.default
        if (lowerMessage.includes('delete')) return (messages as any).eventDelete || messages.default
        if (lowerMessage.includes('premium')) return (messages as any).premium || messages.default
      }
      
      // Validation errors
      if (type === ErrorType.VALIDATION) {
        if (lowerMessage.includes('email')) return (messages as any).email || messages.default
        if (lowerMessage.includes('password')) return (messages as any).password || messages.default
        if (lowerMessage.includes('name')) return (messages as any).eventName || messages.default
        if (lowerMessage.includes('venue')) return (messages as any).venue || messages.default
        if (lowerMessage.includes('coordinates')) return (messages as any).coordinates || messages.default
        if (lowerMessage.includes('date')) return (messages as any).date || messages.default
        if (lowerMessage.includes('required')) return (messages as any).required || messages.default
      }
    }
    
    // Handle context-specific messages
    if (context?.action) {
      const actionMessages: { [key: string]: string } = {
        'create_event': 'Failed to create event. Please check your input and try again.',
        'update_event': 'Failed to update event. Please try again.',
        'delete_event': 'Failed to delete event. Please try again.',
        'rate_event': 'Failed to submit rating. Please try again.',
        'sign_in': 'Sign in failed. Please check your credentials.',
        'sign_up': 'Failed to create account. Please try again.',
        'load_events': 'Failed to load events. Please check your connection.',
        'sync_events': 'Failed to sync events. Please try again.'
      }
      
      if (actionMessages[context.action]) {
        return actionMessages[context.action]
      }
    }
    
    return messages.default
  }

  // Show error to user with appropriate UI
  showError(error: AppError, options?: {
    showAlert?: boolean
    logToConsole?: boolean
    retryCallback?: () => void
  }): void {
    const {
      showAlert = true,
      logToConsole = true,
      retryCallback
    } = options || {}

    // Log error
    if (logToConsole) {
      console.error(`[${error.type.toUpperCase()}] ${error.message}`, {
        severity: error.severity,
        context: error.context,
        originalError: error.originalError
      })
    }

    // Add to error log
    this.errorLog.push(error)

    // Show alert to user
    if (showAlert) {
      const buttons: RNAlertButton[] = [{ text: 'OK', style: 'default' }]
      
      // Add retry button for retryable errors
      if (error.retryable && retryCallback) {
        buttons.unshift({
          text: 'Retry',
          style: 'default',
          onPress: retryCallback
        })
      }

      Alert.alert(
        this.getAlertTitle(error),
        error.userMessage,
        buttons as any
      )
    }
  }

  // Get appropriate alert title based on error type
  private getAlertTitle(error: AppError): string {
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

  // Handle API errors specifically
  handleApiError(error: any, context?: ErrorContext): AppError {
    const appError = this.createError(error, context)
    
    // Log API errors with more detail
    console.error('API Error:', {
      status: error.status || error.statusCode,
      message: error.message,
      response: error.response,
      context
    })
    
    return appError
  }

  // Handle sync errors specifically
  handleSyncError(error: any, context?: ErrorContext): AppError {
    const appError = this.createError(error, {
      ...context,
      action: 'sync_events'
    })
    
    // Sync errors are usually retryable
    appError.retryable = true
    
    return appError
  }

  // Handle validation errors specifically
  handleValidationError(error: any, context?: ErrorContext): AppError {
    return this.createError(error, context, ErrorType.VALIDATION, ErrorSeverity.MEDIUM)
  }

  // Get error statistics
  getErrorStats(): {
    total: number
    byType: { [key in ErrorType]: number }
    bySeverity: { [key in ErrorSeverity]: number }
    recent: AppError[]
  } {
    const byType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = 0
      return acc
    }, {} as { [key in ErrorType]: number })

    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = 0
      return acc
    }, {} as { [key in ErrorSeverity]: number })

    this.errorLog.forEach(error => {
      byType[error.type]++
      bySeverity[error.severity]++
    })

    return {
      total: this.errorLog.length,
      byType,
      bySeverity,
      recent: this.errorLog.slice(-10) // Last 10 errors
    }
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }

  // Get recent errors
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count)
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()

// Convenience functions for common error scenarios
export const handleApiError = (error: any, context?: ErrorContext) => {
  const appError = errorHandler.handleApiError(error, context)
  errorHandler.showError(appError)
  return appError
}

export const handleSyncError = (error: any, context?: ErrorContext) => {
  const appError = errorHandler.handleSyncError(error, context)
  errorHandler.showError(appError)
  return appError
}

export const handleValidationError = (error: any, context?: ErrorContext) => {
  const appError = errorHandler.handleValidationError(error, context)
  errorHandler.showError(appError)
  return appError
}

export const showUserError = (message: string, type: ErrorType = ErrorType.UNKNOWN) => {
  const appError = errorHandler.createError(
    new Error(message),
    undefined,
    type,
    ErrorSeverity.MEDIUM
  )
  errorHandler.showError(appError)
  return appError
}
