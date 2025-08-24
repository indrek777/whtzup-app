# Error Handling System Guide

## Overview

The WhtzUp app now features a comprehensive error handling system that provides user-friendly error messages and better error management throughout the application.

## 🎯 **Key Features**

### ✅ **User-Friendly Error Messages**
- Clear, actionable error messages
- Context-aware error descriptions
- Appropriate error severity levels
- Retry options for recoverable errors

### ✅ **Centralized Error Management**
- Single error handler utility
- Consistent error handling across components
- Error logging and statistics
- Error categorization by type and severity

### ✅ **Enhanced User Experience**
- Animated error displays
- Auto-hiding error notifications
- Retry functionality for network errors
- Graceful degradation for offline scenarios

## 📁 **File Structure**

```
src/
├── utils/
│   ├── errorHandler.ts          # Main error handling utility
│   └── syncService.ts           # Updated with new error handling
├── components/
│   ├── ErrorDisplay.tsx         # Reusable error display component
│   ├── MapViewNative.tsx        # Updated with error handling
│   └── UserProfile.tsx          # Updated with error handling
```

## 🔧 **Error Types**

### **Network Errors** 📡
- Connection issues
- Timeout errors
- Server unreachable
- Offline scenarios

**User Message Examples:**
- "Network connection issue. Please check your internet connection and try again."
- "Request timed out. Please try again."
- "You appear to be offline. Please check your internet connection."

### **Authentication Errors** 🔐
- Sign in required
- Invalid credentials
- Expired sessions
- Missing authentication

**User Message Examples:**
- "Please sign in to perform this action."
- "Your session has expired. Please sign in again."
- "Invalid credentials. Please check your email and password."

### **Permission Errors** 🚫
- Access denied
- Event ownership restrictions
- Premium feature requirements

**User Message Examples:**
- "You do not have permission to perform this action."
- "You can only edit events you created."
- "This feature requires a premium subscription."

### **Validation Errors** ⚠️
- Invalid input data
- Required field missing
- Format validation failures

**User Message Examples:**
- "Please check your input and try again."
- "Event name is required and must be less than 500 characters."
- "Please enter a valid email address."

### **Server Errors** 🖥️
- Internal server errors
- Database issues
- Rate limiting
- Maintenance mode

**User Message Examples:**
- "Server error. Please try again later."
- "Too many requests. Please wait a moment and try again."
- "Server is under maintenance. Please try again later."

## 🎨 **Error Display Component**

### **Features**
- **Animated Entry/Exit**: Smooth slide and fade animations
- **Color-Coded Severity**: Different colors for different error levels
- **Retry Buttons**: For recoverable errors
- **Auto-Hide**: Automatic dismissal after configurable delay
- **Manual Dismiss**: User can close errors manually

### **Usage Example**
```tsx
import ErrorDisplay from './ErrorDisplay'

<ErrorDisplay
  error={currentError}
  onRetry={() => {
    // Retry the failed operation
    retryLastAction()
  }}
  onDismiss={() => setCurrentError(null)}
  autoHide={true}
  autoHideDelay={5000}
/>
```

## 🛠️ **Error Handler Utility**

### **Main Functions**

#### **handleApiError(error, context)**
Handles API-related errors with proper categorization.

```typescript
const appError = errorHandler.handleApiError(error, {
  action: 'create_event',
  entity: 'event',
  value: eventId
});
```

#### **handleSyncError(error, context)**
Handles synchronization errors with retry capabilities.

```typescript
const appError = errorHandler.handleSyncError(error, {
  action: 'sync_events'
});
```

#### **handleValidationError(error, context)**
Handles validation errors with field-specific messages.

```typescript
const appError = errorHandler.handleValidationError(error, {
  field: 'email',
  value: userInput
});
```

#### **showUserError(message, type)**
Shows a simple user error message.

```typescript
showUserError('Something went wrong', ErrorType.UNKNOWN);
```

### **Error Context Interface**
```typescript
interface ErrorContext {
  action?: string        // What action was being performed
  entity?: string        // What entity was involved
  field?: string         // Which field had an issue
  value?: any           // The value that caused the error
  userId?: string       // User ID if relevant
  timestamp?: string    // When the error occurred
}
```

## 📊 **Error Statistics**

The error handler tracks error statistics for monitoring and debugging:

```typescript
const stats = errorHandler.getErrorStats();
// Returns:
// {
//   total: number,
//   byType: { [ErrorType]: number },
//   bySeverity: { [ErrorSeverity]: number },
//   recent: AppError[]
// }
```

## 🔄 **Integration Examples**

### **API Calls**
```typescript
try {
  const response = await fetch('/api/events', {
    method: 'POST',
    body: JSON.stringify(eventData)
  });
  
  if (!response.ok) {
    throw { status: response.status, message: response.statusText };
  }
  
  return await response.json();
} catch (error) {
  const appError = errorHandler.handleApiError(error, {
    action: 'create_event',
    entity: 'event'
  });
  errorHandler.showError(appError);
  throw appError;
}
```

### **Component Error Handling**
```typescript
const [currentError, setCurrentError] = useState(null);

const handleEventCreation = async (eventData) => {
  try {
    await createEvent(eventData);
  } catch (error) {
    const appError = errorHandler.handleApiError(error, {
      action: 'create_event',
      entity: 'event'
    });
    setCurrentError(appError);
  }
};
```

### **Sync Service Integration**
```typescript
// In syncService.ts
private async makeApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw { status: response.status, message: response.statusText };
    }
    
    return await response.json();
  } catch (error) {
    const appError = errorHandler.handleApiError(error, {
      action: endpoint.split('/').pop() || 'api_call',
      entity: 'api'
    });
    throw appError;
  }
}
```

## 🎯 **Best Practices**

### **1. Always Provide Context**
```typescript
// Good
errorHandler.handleApiError(error, {
  action: 'update_event',
  entity: 'event',
  value: eventId
});

// Avoid
errorHandler.handleApiError(error);
```

### **2. Use Appropriate Error Types**
```typescript
// Network issues
ErrorType.NETWORK

// Authentication problems
ErrorType.AUTHENTICATION

// Permission denied
ErrorType.PERMISSION

// Invalid input
ErrorType.VALIDATION

// Server problems
ErrorType.SERVER
```

### **3. Handle Retryable Errors**
```typescript
if (appError.retryable) {
  // Show retry button
  // Implement retry logic
}
```

### **4. Log Errors Appropriately**
```typescript
// Development: Full error details
if (process.env.NODE_ENV === 'development') {
  console.error('Full error:', error);
}

// Production: Sanitized error messages
errorHandler.showError(appError, { logToConsole: false });
```

## 🚀 **Benefits**

### **For Users**
- ✅ Clear, actionable error messages
- ✅ Better understanding of what went wrong
- ✅ Retry options for recoverable errors
- ✅ Consistent error experience across the app

### **For Developers**
- ✅ Centralized error management
- ✅ Better error tracking and debugging
- ✅ Consistent error handling patterns
- ✅ Easy to maintain and extend

### **For Operations**
- ✅ Error statistics and monitoring
- ✅ Better error categorization
- ✅ Improved user support capabilities
- ✅ Reduced user confusion and support tickets

## 🔧 **Configuration**

### **Error Display Settings**
```typescript
// Auto-hide duration (default: 5000ms)
autoHideDelay={5000}

// Show retry button for retryable errors
retryable={true}

// Custom error messages
const customMessages = {
  [ErrorType.NETWORK]: {
    custom: 'Custom network error message'
  }
};
```

### **Error Logging**
```typescript
// Enable/disable console logging
errorHandler.showError(appError, { logToConsole: false });

// Get error statistics
const stats = errorHandler.getErrorStats();

// Clear error log
errorHandler.clearErrorLog();
```

## 📈 **Monitoring and Analytics**

The error handling system provides valuable insights:

- **Error Frequency**: Track how often different types of errors occur
- **User Impact**: Monitor which errors affect user experience most
- **Recovery Rates**: See how often users successfully retry operations
- **Error Patterns**: Identify common error scenarios and root causes

This comprehensive error handling system ensures that users always understand what went wrong and what they can do about it, leading to a much better user experience! 🎉
