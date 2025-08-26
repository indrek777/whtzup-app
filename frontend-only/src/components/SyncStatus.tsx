import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useEvents } from '../context/EventContext';

interface SyncStatusProps {
  onRefresh?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ onRefresh }) => {
  const { syncStatus, isLoading } = useEvents();

  const getStatusColor = () => {
    if (isLoading) return '#FFA500'; // Orange for loading
    if (syncStatus.isOnline) return '#4CAF50'; // Green for online
    return '#F44336'; // Red for offline
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    if (syncStatus.isOnline) return 'Online';
    return 'Offline';
  };

  const getPendingText = () => {
    if (syncStatus.pendingOperations === 0) return 'All synced';
    return `${syncStatus.pendingOperations} pending`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.statusIndicator}>
          <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        
        {syncStatus.pendingOperations > 0 && (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingText}>{getPendingText()}</Text>
          </View>
        )}
      </View>

      {syncStatus.lastSyncAt && (
        <Text style={styles.lastSyncText}>
          Last sync: {new Date(syncStatus.lastSyncAt).toLocaleTimeString()}
        </Text>
      )}

      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      )}

      {syncStatus.errors.length > 0 && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {syncStatus.errors.length} sync error(s)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    margin: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pendingContainer: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  refreshText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8D7DA',
    borderRadius: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#721C24',
  },
});

export default SyncStatus;
