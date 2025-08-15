import React from 'react'
import { Platform } from 'react-native'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MapView from './src/components/MapView'
import ErrorBoundary from './src/components/ErrorBoundary'
import './src/index.css'



function App() {
  // For React Native, render directly without Router
  if (Platform.OS !== 'web') {
    return (
      <ErrorBoundary>
        <MapView />
      </ErrorBoundary>
    )
  }

  // For web, use Router
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<MapView />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
