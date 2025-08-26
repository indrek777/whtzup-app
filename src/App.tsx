import React, { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { EventProvider } from './context/EventContext'
import { userService } from './utils/userService'
const MapViewNative = require('./components/MapViewNative')

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">The app encountered an error and couldn't load properly.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  useEffect(() => {
    // Initialize IAP service when app starts
    const initializeIAP = async () => {
      try {
        console.log('🚀 Initializing IAP service on app start...');
        await userService.initializeIAP();
      } catch (error) {
        console.error('❌ Failed to initialize IAP on app start:', error);
      }
    };

    initializeIAP();
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground
        console.log('🔄 App became active, checking authentication...');
        try {
          // Check if user is authenticated
          const isAuthenticated = await userService.isAuthenticated();
          console.log('🔐 Authentication status:', isAuthenticated);
          
          if (isAuthenticated) {
            // Check if token needs refresh, but don't force it
            const headers = await userService.getAuthHeaders();
            if (!headers.Authorization) {
              console.log('🔄 Token expired, but allowing user to continue without refresh');
              console.log('💡 User can still view events but may need to sign in for full features');
            }
          }
        } catch (error) {
          console.error('❌ Error checking authentication on app resume:', error);
        }
      } else if (nextAppState === 'background') {
        // App went to background
        console.log('📱 App went to background');
        // Optionally save any pending data or cleanup
      }
    };

    // Add AppState listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <EventProvider>
        <MapViewNative />
      </EventProvider>
    </ErrorBoundary>
  )
}

module.exports = App
