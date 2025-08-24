import React, { useEffect } from 'react'
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

  return (
    <ErrorBoundary>
      <EventProvider>
        <MapViewNative />
      </EventProvider>
    </ErrorBoundary>
  )
}

module.exports = App
