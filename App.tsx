import React from 'react'
import { View, StyleSheet } from 'react-native'
import MapViewNative from './src/components/MapViewNative'
import ErrorBoundary from './src/components/ErrorBoundary'
import { EventProvider } from './src/context/EventContext'

function App() {
  return (
    <ErrorBoundary>
      <EventProvider>
        <View style={styles.container}>
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
