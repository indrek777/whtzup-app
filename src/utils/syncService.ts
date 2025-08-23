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
const API_BASE_URL = 'http://olympio.ee:4000';
const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_COUNT = 3;

class SyncService {
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private isOnline: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingOperations: SyncOperation[] = [];
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDeviceId();
    this.setupNetworkListener();
    this.setupSocketConnection();
    this.loadPendingOperations();
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
    if (!this.deviceId) {
      console.log('❌ No device ID available for Socket.IO connection');
      return;
    }

    console.log('🔌 Setting up Socket.IO connection...');
    console.log(`📡 Connecting to: ${API_BASE_URL}`);
    console.log(`🆔 Device ID: ${this.deviceId}`);

    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to sync server');
      console.log(`🆔 Socket ID: ${this.socket?.id}`);
      this.socket?.emit('join-device', this.deviceId);
      this.notifyListeners('socketStatus', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from sync server');
      this.notifyListeners('socketStatus', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.notifyListeners('error', error);
    });

    this.socket.on('event-created', (data) => {
      console.log('🆕 Received event-created via Socket.IO:', data.eventId);
      this.handleRemoteEventCreated(data);
    });

    this.socket.on('event-updated', (data) => {
      console.log('🔄 Received event-updated via Socket.IO:', data.eventId);
      this.handleRemoteEventUpdated(data);
    });

    this.socket.on('event-deleted', (data) => {
      console.log('🗑️ Received event-deleted via Socket.IO:', data.eventId);
      this.handleRemoteEventDeleted(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
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
    
    // Get authentication headers if available
    let authHeaders = {};
    try {
      const { userService } = await import('./userService');
      authHeaders = await userService.getAuthHeaders();
    } catch (error) {
      // If userService is not available, continue without auth headers
      console.log('🔓 No authentication available for API call');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-ID': this.deviceId || '',
      ...authHeaders,
      ...options.headers
    };

    console.log('🌐 Making API call to:', url);
    console.log('📋 Headers:', headers);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ HTTP Error:', response.status, response.statusText);
        
        // Try to get error details from response
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          // If we can't parse JSON, use the status text
        }
        
        // Provide user-friendly error messages
        if (response.status === 401) {
          errorMessage = 'Please sign in to perform this action.';
        } else if (response.status === 403) {
          errorMessage = errorMessage || 'You do not have permission to perform this action.';
        } else if (response.status === 404) {
          errorMessage = 'The requested item was not found.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📄 Response data received');
      return data;
    } catch (error) {
      console.error('❌ API call failed:', error);
      // Re-throw with original message if it's already user-friendly
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
          // Handle duplicate event response
          if (response.isDuplicate) {
            console.log('Event already exists, returning existing event');
            const existingEvent = {
              ...response.data,
              latitude: Number(response.data.latitude) || 0,
              longitude: Number(response.data.longitude) || 0
            };
            return existingEvent;
          }

          this.socket?.emit('event-created', {
            eventId: response.data.id,
            eventData: response.data,
            deviceId: this.deviceId
          });
          // Ensure the returned event has properly typed coordinates
          const createdEvent = {
            ...response.data,
            latitude: Number(response.data.latitude) || 0,
            longitude: Number(response.data.longitude) || 0
          };
          return createdEvent;
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
        // For local events that were never synced, try to create them first
        if (event.id.startsWith('local_')) {
          console.log('🔄 Local event detected in syncService, attempting to create in backend first:', event.id)
          try {
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
              // Return the event with the new server ID
              const createdEvent = {
                ...event,
                ...response.data,
                id: response.data.id || event.id,
                latitude: response.data.latitude !== null && response.data.latitude !== undefined ? Number(response.data.latitude) : (event.latitude !== null && event.latitude !== undefined ? Number(event.latitude) : 0),
                longitude: response.data.longitude !== null && response.data.longitude !== undefined ? Number(response.data.longitude) : (event.longitude !== null && event.longitude !== undefined ? Number(event.longitude) : 0),
                updatedAt: response.data.updatedAt || new Date().toISOString()
              };
              console.log('✅ Local event successfully created in backend:', event.id, '->', createdEvent.id)
              return createdEvent;
            } else {
              throw new Error(response.error);
            }
          } catch (createError) {
            console.log('⚠️ Failed to create local event in backend, storing for offline sync:', createError)
            // Store offline operation for later sync
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
        } else {
          // For server events, try to update them
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
            // Ensure the returned event has all required fields
            const updatedEvent = {
              ...event, // Keep original fields as fallback
              ...response.data, // Override with server data
              // Ensure required fields are present and properly typed
              id: response.data.id || event.id,
              name: response.data.name || event.name,
              latitude: response.data.latitude !== null && response.data.latitude !== undefined ? Number(response.data.latitude) : (event.latitude !== null && event.latitude !== undefined ? Number(event.latitude) : 0),
              longitude: response.data.longitude !== null && response.data.longitude !== undefined ? Number(response.data.longitude) : (event.longitude !== null && event.longitude !== undefined ? Number(event.longitude) : 0),
              venue: response.data.venue || event.venue || '',
              address: response.data.address || event.address || '',
              startsAt: response.data.startsAt || event.startsAt,
              category: response.data.category || event.category || 'other',
              createdBy: response.data.createdBy || event.createdBy || 'Event Organizer',
              updatedAt: response.data.updatedAt || new Date().toISOString()
            };
            return updatedEvent;
          } else {
            throw new Error(response.error);
          }
        }
      } else {
        // Store offline operation
        const operation: SyncOperation = {
          id: this.generateOperationId(),
          operation: event.id.startsWith('local_') ? 'CREATE' : 'UPDATE',
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

  public async fetchEvents(userLocation?: { latitude: number; longitude: number }, radius?: number): Promise<Event[]> {
    console.log('🔄 Fetching events from:', `${API_BASE_URL}/api/events`);
    console.log('📱 Device ID:', this.deviceId);
    console.log('🌐 Online status:', this.isOnline);
    
    try {
      let url = '/events';
      const params = new URLSearchParams();
      
      // Add radius-based filtering if user location and radius are provided
      if (userLocation && radius) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
        params.append('radius', radius.toString());
        url += `?${params.toString()}`;
        console.log(`🎯 Fetching events within ${radius}km of user location`);
      }
      
      const response = await this.makeApiCall(url);
      console.log('✅ API Response:', response.success ? 'SUCCESS' : 'FAILED');
      if (response.success) {
        console.log(`📊 Received ${response.data?.length || 0} events from server`);
        // Ensure all events have properly typed coordinates and field mapping
        const typedEvents = response.data.map((event: any) => ({
          ...event,
          latitude: Number(event.latitude) || 0,
          longitude: Number(event.longitude) || 0,
          startsAt: event.startsAt || event.starts_at || '', // Map database field to interface field
          venue: event.venue || '',
          address: event.address || '',
          category: event.category || 'other',
          createdBy: event.createdBy || event.created_by || 'Event Organizer'
        }));
        // Cache the events for offline use
        await this.setCachedEvents(typedEvents);
        return typedEvents;
      } else {
        console.log('❌ API Error:', response.error);
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      // Return cached events if available
      const cachedEvents = await this.getCachedEvents();
      console.log(`📦 Returning ${cachedEvents.length} cached events for offline use`);
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
      const events = cached ? JSON.parse(cached) : [];
      // Ensure all cached events have properly typed coordinates and field mapping
      return events.map((event: any) => ({
        ...event,
        latitude: Number(event.latitude) || 0,
        longitude: Number(event.longitude) || 0,
        startsAt: event.startsAt || event.starts_at || '', // Map database field to interface field
        venue: event.venue || '',
        address: event.address || '',
        category: event.category || 'other',
        createdBy: event.createdBy || event.created_by || 'Event Organizer'
      }));
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
      // Ensure the created event has properly typed coordinates and field mapping
      const createdEvent = {
        ...data.eventData,
        latitude: Number(data.eventData.latitude) || 0,
        longitude: Number(data.eventData.longitude) || 0,
        startsAt: data.eventData.startsAt || data.eventData.starts_at || '', // Map database field to interface field
        venue: data.eventData.venue || '',
        address: data.eventData.address || '',
        category: data.eventData.category || 'other',
        createdBy: data.eventData.createdBy || data.eventData.created_by || 'Event Organizer'
      };
      events.push(createdEvent);
      await this.setCachedEvents(events);
      this.notifyListeners('eventCreated', createdEvent);
    } catch (error) {
      console.error('Error handling remote event created:', error);
    }
  }

  private async handleRemoteEventUpdated(data: any): Promise<void> {
    try {
      console.log('🔄 handleRemoteEventUpdated called with data:', {
        eventId: data.eventId,
        eventName: data.eventData?.name,
        category: data.eventData?.category,
        updatedAt: data.eventData?.updatedAt
      });
      
      const events = await this.getCachedEvents();
      console.log(`📦 Found ${events.length} cached events`);
      
      const index = events.findIndex(e => e.id === data.eventId);
      console.log(`🔍 Event found at index: ${index}`);
      
      if (index !== -1) {
        // Ensure the updated event has properly typed coordinates and field mapping
        const updatedEvent = {
          ...data.eventData,
          latitude: Number(data.eventData.latitude) || 0,
          longitude: Number(data.eventData.longitude) || 0,
          startsAt: data.eventData.startsAt || data.eventData.starts_at || '', // Map database field to interface field
          venue: data.eventData.venue || '',
          address: data.eventData.address || '',
          category: data.eventData.category || 'other',
          createdBy: data.eventData.createdBy || data.eventData.created_by || 'Event Organizer',
          updatedAt: data.eventData.updatedAt || new Date().toISOString()
        };
        
        console.log('🔄 Updating event in cache:', {
          oldCategory: events[index].category,
          newCategory: updatedEvent.category,
          oldUpdatedAt: events[index].updatedAt,
          newUpdatedAt: updatedEvent.updatedAt
        });
        
        events[index] = updatedEvent;
        await this.setCachedEvents(events);
        console.log('✅ Event updated in cache successfully');
        
        // Notify listeners with the updated event data
        this.notifyListeners('eventUpdated', updatedEvent);
        console.log('📢 Notified listeners of event update');
      } else {
        console.log('❌ Event not found in cache:', data.eventId);
        // Even if not in cache, notify listeners to trigger a refresh
        this.notifyListeners('eventUpdated', data.eventData);
        console.log('📢 Notified listeners to trigger refresh (event not in cache)');
      }
    } catch (error) {
      console.error('❌ Error handling remote event updated:', error);
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
    // Use longer interval to reduce performance impact
    this.syncInterval = setInterval(() => {
      this.syncPendingOperations();
    }, SYNC_INTERVAL * 2); // Double the interval (60 seconds instead of 30)
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

  // Get cached events immediately (for offline use)
  public async getCachedEventsImmediate(): Promise<Event[]> {
    console.log('📦 Getting cached events immediately...');
    const cachedEvents = await this.getCachedEvents();
    console.log(`📦 Found ${cachedEvents.length} cached events`);
    return cachedEvents;
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
