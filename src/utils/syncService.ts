import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { io, Socket } from 'socket.io-client';
import { Event } from '../data/events';

// Types
interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingOperations: number;
  errors: string[];
}

interface SyncOperation {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  eventData: Event;
  timestamp: string;
  retryCount: number;
}

interface Conflict {
  eventId: string;
  localVersion: Event;
  serverVersion: Event;
  resolution: 'local' | 'server' | 'merge';
}

// Configuration
const API_BASE_URL = __DEV__ ? 'http://localhost:3000' : 'https://your-production-domain.com';
const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_COUNT = 3;

class SyncService {
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private isOnline: boolean = false;
  private syncInterval: NodeInterval | null = null;
  private pendingOperations: SyncOperation[] = [];
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDeviceId();
    this.setupNetworkListener();
    this.setupSocketConnection();
  }

  // Initialize device ID
  private async initializeDeviceId(): Promise<void> {
    try {
      this.deviceId = await AsyncStorage.getItem('deviceId');
      if (!this.deviceId) {
        this.deviceId = this.generateDeviceId();
        await AsyncStorage.setItem('deviceId', this.deviceId);
      }
    } catch (error) {
      console.error('Error initializing device ID:', error);
    }
  }

  private generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Network status monitoring
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        this.onConnectionRestored();
      } else if (wasOnline && !this.isOnline) {
        this.onConnectionLost();
      }
      
      this.notifyListeners('networkStatus', { isOnline: this.isOnline });
    });
  }

  // Socket.IO connection
  private setupSocketConnection(): void {
    if (!this.deviceId) return;

    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to sync server');
      this.socket?.emit('join-device', this.deviceId);
      this.notifyListeners('socketStatus', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from sync server');
      this.notifyListeners('socketStatus', { connected: false });
    });

    this.socket.on('event-created', (data) => {
      this.handleRemoteEventCreated(data);
    });

    this.socket.on('event-updated', (data) => {
      this.handleRemoteEventUpdated(data);
    });

    this.socket.on('event-deleted', (data) => {
      this.handleRemoteEventDeleted(data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.notifyListeners('error', error);
    });
  }

  // Event listeners
  public addListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public removeListener(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // API calls with offline support
  private async makeApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-ID': this.deviceId || '',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // Event operations with offline support
  public async createEvent(event: Event): Promise<Event> {
    try {
      if (this.isOnline) {
        const response = await this.makeApiCall('/events', {
          method: 'POST',
          body: JSON.stringify(event)
        });

        if (response.success) {
          this.socket?.emit('event-created', {
            eventId: response.data.id,
            eventData: response.data,
            deviceId: this.deviceId
          });
          return response.data;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Store offline operation
        const operation: SyncOperation = {
          id: this.generateOperationId(),
          operation: 'CREATE',
          eventData: event,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };

        await this.addPendingOperation(operation);
        return event;
      }
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  public async updateEvent(event: Event): Promise<Event> {
    try {
      if (this.isOnline) {
        const response = await this.makeApiCall(`/events/${event.id}`, {
          method: 'PUT',
          body: JSON.stringify(event)
        });

        if (response.success) {
          this.socket?.emit('event-updated', {
            eventId: response.data.id,
            eventData: response.data,
            deviceId: this.deviceId
          });
          return response.data;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Store offline operation
        const operation: SyncOperation = {
          id: this.generateOperationId(),
          operation: 'UPDATE',
          eventData: event,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };

        await this.addPendingOperation(operation);
        return event;
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  public async deleteEvent(eventId: string): Promise<void> {
    try {
      if (this.isOnline) {
        const response = await this.makeApiCall(`/events/${eventId}`, {
          method: 'DELETE'
        });

        if (response.success) {
          this.socket?.emit('event-deleted', {
            eventId,
            deviceId: this.deviceId
          });
        } else {
          throw new Error(response.error);
        }
      } else {
        // Store offline operation
        const operation: SyncOperation = {
          id: this.generateOperationId(),
          operation: 'DELETE',
          eventData: { id: eventId } as Event,
          timestamp: new Date().toISOString(),
          retryCount: 0
        };

        await this.addPendingOperation(operation);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  public async fetchEvents(): Promise<Event[]> {
    try {
      const response = await this.makeApiCall('/events');
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // Return cached events if available
      const cachedEvents = await this.getCachedEvents();
      return cachedEvents;
    }
  }

  // Offline queue management
  private async addPendingOperation(operation: SyncOperation): Promise<void> {
    this.pendingOperations.push(operation);
    await this.savePendingOperations();
    this.notifyListeners('pendingOperations', this.pendingOperations);
  }

  private async savePendingOperations(): Promise<void> {
    try {
      await AsyncStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  private async loadPendingOperations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('pendingOperations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }

  private generateOperationId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Sync operations
  public async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    try {
      const response = await this.makeApiCall('/sync/process', {
        method: 'POST',
        body: JSON.stringify({ deviceId: this.deviceId })
      });

      if (response.success) {
        // Remove processed operations
        this.pendingOperations = this.pendingOperations.filter(op => 
          !response.results.some((result: any) => result.queueId === op.id)
        );
        await this.savePendingOperations();
        this.notifyListeners('pendingOperations', this.pendingOperations);
      }
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  }

  // Cache management
  private async getCachedEvents(): Promise<Event[]> {
    try {
      const cached = await AsyncStorage.getItem('cachedEvents');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached events:', error);
      return [];
    }
  }

  private async setCachedEvents(events: Event[]): Promise<void> {
    try {
      await AsyncStorage.setItem('cachedEvents', JSON.stringify(events));
    } catch (error) {
      console.error('Error setting cached events:', error);
    }
  }

  // Remote event handlers
  private async handleRemoteEventCreated(data: any): Promise<void> {
    try {
      const events = await this.getCachedEvents();
      events.push(data.eventData);
      await this.setCachedEvents(events);
      this.notifyListeners('eventCreated', data.eventData);
    } catch (error) {
      console.error('Error handling remote event created:', error);
    }
  }

  private async handleRemoteEventUpdated(data: any): Promise<void> {
    try {
      const events = await this.getCachedEvents();
      const index = events.findIndex(e => e.id === data.eventId);
      if (index !== -1) {
        events[index] = data.eventData;
        await this.setCachedEvents(events);
        this.notifyListeners('eventUpdated', data.eventData);
      }
    } catch (error) {
      console.error('Error handling remote event updated:', error);
    }
  }

  private async handleRemoteEventDeleted(data: any): Promise<void> {
    try {
      const events = await this.getCachedEvents();
      const filteredEvents = events.filter(e => e.id !== data.eventId);
      await this.setCachedEvents(filteredEvents);
      this.notifyListeners('eventDeleted', { eventId: data.eventId });
    } catch (error) {
      console.error('Error handling remote event deleted:', error);
    }
  }

  // Connection event handlers
  private async onConnectionRestored(): Promise<void> {
    console.log('Connection restored, syncing...');
    await this.loadPendingOperations();
    await this.syncPendingOperations();
    this.startSyncInterval();
  }

  private onConnectionLost(): void {
    console.log('Connection lost');
    this.stopSyncInterval();
  }

  // Sync interval management
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => {
      this.syncPendingOperations();
    }, SYNC_INTERVAL);
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Public status methods
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncAt: null, // TODO: Implement last sync tracking
      pendingOperations: this.pendingOperations.length,
      errors: []
    };
  }

  public async getSyncStatusAsync(): Promise<SyncStatus> {
    try {
      const response = await this.makeApiCall('/sync/status');
      if (response.success) {
        return {
          isOnline: this.isOnline,
          lastSyncAt: response.lastSync,
          pendingOperations: response.queue.pending,
          errors: response.queue.errors > 0 ? ['Some operations failed'] : []
        };
      }
    } catch (error) {
      console.error('Error getting sync status:', error);
    }

    return this.getSyncStatus();
  }

  // Cleanup
  public destroy(): void {
    this.stopSyncInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
