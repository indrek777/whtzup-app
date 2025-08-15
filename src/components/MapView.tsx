import React from 'react'
import { Platform } from 'react-native'
import MapViewNative from './MapViewNative'

const MapView: React.FC = () => {
  // For React Native, use the native component
  if (Platform.OS !== 'web') {
    return <MapViewNative />
  }

  // For web, show a simple message since we removed web dependencies
  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>📱 Mobile App</h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          This app is optimized for mobile devices.<br/>
          Please use Expo Go on your phone to view the full experience.
        </p>
      </div>
    </div>
  )
}

export default MapView
