import React from 'react'
import MapViewNative from './src/components/MapViewNative'
import ErrorBoundary from './src/components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <MapViewNative />
    </ErrorBoundary>
  )
}

module.exports = App
