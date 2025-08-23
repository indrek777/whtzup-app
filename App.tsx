import React from 'react'
import { View, StyleSheet } from 'react-native'
import MapViewNative from './src/components/MapViewNative'
import ErrorBoundary from './src/components/ErrorBoundary'
import { EventProvider } from './src/context/EventContext'
import SyncStatus from './src/components/SyncStatus'

function App() {
  return (
    <ErrorBoundary>
      <EventProvider>
        <View style={styles.container}>
          <SyncStatus />
          <MapViewNative />
        </View>
      </EventProvider>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

module.exports = App
