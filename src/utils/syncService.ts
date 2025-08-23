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
const API_BASE_URL = 'https://olympio.ee';
const SYNC_INTERVAL = 30000; // 30 seconds
const UPDATE_CHECK_INTERVAL = 60000; // 60 seconds for checking updates (reduced frequency)
const MAX_RETRY_COUNT = 3;
const MAX_UPDATE_CHECK_FAILURES = 5; // Maximum consecutive failures before backing off
const ENABLE_AUTOMATIC_UPDATES = true; // Set to false to disable automatic update checking

class SyncService {
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private isOnline: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private pendingOperations: SyncOperation[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private lastUpdateCheck: string | null = null;
  private updateCheckFailures: number = 0;
  private isUpdateCheckInProgress: boolean = false;

  constructor() {
    this.initializeDeviceId();
    this.setupNetworkListener();
    this.setupSocketConnection();
    this.loadPendingOperations();
    this.loadLastUpdateCheck();
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

  // Load last update check timestamp
  private async loadLastUpdateCheck(): Promise<void> {
    try {
      this.lastUpdateCheck = await AsyncStorage.getItem('lastUpdateCheck');
      if (this.lastUpdateCheck) {
        console.log('📅 Loaded last update check:', this.lastUpdateCheck);
      }
    } catch (error) {
      console.error('Error loading last update check:', error);
      this.lastUpdateCheck = null;
    }
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
      // Provide more specific error messages for different types of failures
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Add context about the endpoint that failed
      const endpointName = endpoint.split('/').pop() || 'unknown';
      const contextMessage = `API call to ${endpointName} failed: ${errorMessage}`;
      
      console.log(`⚠️ ${contextMessage}`);
      
      // Re-throw with enhanced message
      throw new Error(contextMessage);
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

  public async fetchEvents(userLocation?: { latitude: number; longitude: number }, radius?: number, limit?: number, dateFilter?: { from?: string; to?: string }): Promise<Event[]> {
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
        console.log(`🎯 Fetching events within ${radius}km of user location`);
      }
      
      // Add date filtering if provided
      if (dateFilter) {
        if (dateFilter.from) {
          params.append('from', dateFilter.from);
          console.log(`📅 Date filter from: ${dateFilter.from}`);
        }
        if (dateFilter.to) {
          params.append('to', dateFilter.to);
          console.log(`📅 Date filter to: ${dateFilter.to}`);
        }
      }
      
      // Add limit for progressive loading
      if (limit) {
        params.append('limit', limit.toString());
        console.log(`📦 Limiting to ${limit} events for faster loading`);
      }
      
      // Build URL with all parameters
      if (params.toString()) {
        url += `?${params.toString()}`;
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

  // New method for progressive loading - fetch initial batch quickly
  public async fetchEventsProgressive(userLocation?: { latitude: number; longitude: number }, radius?: number, dateFilter?: { from?: string; to?: string }): Promise<{ initial: Event[], total: number }> {
    console.log('🚀 Starting progressive event loading...');
    
    try {
      // First, try to get cached events immediately for instant display
      const cachedEvents = await this.getCachedEvents();
      let initialEvents: Event[] = [];
      
      if (cachedEvents.length > 0) {
        console.log(`📦 Using ${cachedEvents.length} cached events for instant display`);
        initialEvents = cachedEvents;
      }
      
      // Then fetch fresh data in background (limited to 100 events initially)
      const freshEvents = await this.fetchEvents(userLocation, radius, 100, dateFilter);
      
      return {
        initial: initialEvents.length > 0 ? initialEvents : freshEvents,
        total: freshEvents.length
      };
    } catch (error) {
      console.error('❌ Progressive loading failed:', error);
      const cachedEvents = await this.getCachedEvents();
      return {
        initial: cachedEvents,
        total: cachedEvents.length
      };
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

  // Update checking methods
  public async checkForUpdates(): Promise<void> {
    // Prevent concurrent update checks
    if (this.isUpdateCheckInProgress) {
      console.log('🔄 Update check already in progress, skipping');
      return;
    }

    // Check if we should back off due to too many failures
    if (this.updateCheckFailures >= MAX_UPDATE_CHECK_FAILURES) {
      console.log(`🔄 Too many update check failures (${this.updateCheckFailures}), backing off`);
      return;
    }

    if (!this.isOnline) {
      console.log('🔄 Offline - skipping update check');
      return;
    }

    this.isUpdateCheckInProgress = true;

    try {
      console.log('🔄 Checking for updates from backend...');
      const cachedEvents = await this.getCachedEvents();
      
      if (cachedEvents.length === 0) {
        console.log('🔄 No cached events, skipping update check');
        this.updateCheckFailures = 0; // Reset failures on successful check
        return;
      }

      // Get the latest update timestamp from cached events
      const latestCachedUpdate = cachedEvents.reduce((latest, event) => {
        const eventUpdate = event.updatedAt || event.createdAt;
        return eventUpdate && eventUpdate > latest ? eventUpdate : latest;
      }, this.lastUpdateCheck || '1970-01-01T00:00:00.000Z');

      // Check for updates since the last check
      const response = await this.makeApiCall(`/events/updates?since=${encodeURIComponent(latestCachedUpdate)}&deviceId=${this.deviceId}`);
      
      if (response.success && response.data) {
        const { updates, deletions } = response.data;
        console.log(`🔄 Found ${updates?.length || 0} updates and ${deletions?.length || 0} deletions`);
        
        if (updates && updates.length > 0) {
          await this.processEventUpdates(updates);
        }
        
        if (deletions && deletions.length > 0) {
          await this.processEventDeletions(deletions);
        }
        
        this.lastUpdateCheck = new Date().toISOString();
        await AsyncStorage.setItem('lastUpdateCheck', this.lastUpdateCheck);
        
        // Reset failure count on success
        this.updateCheckFailures = 0;
        
        // Notify listeners about the update check completion
        this.notifyListeners('updateCheckCompleted', { 
          updates: updates?.length || 0, 
          deletions: deletions?.length || 0,
          timestamp: this.lastUpdateCheck
        });
      } else {
        throw new Error('Invalid response from update check');
      }
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.log(`⚠️ Update check failed (${this.updateCheckFailures + 1}/${MAX_UPDATE_CHECK_FAILURES}): ${errorMessage}`);
      this.updateCheckFailures++;
      
      // Create a more informative error object
      const syncError = {
        message: `Update check failed: ${errorMessage}`,
        failureCount: this.updateCheckFailures,
        maxFailures: MAX_UPDATE_CHECK_FAILURES,
        timestamp: new Date().toISOString()
      };
      
      this.notifyListeners('updateCheckError', syncError);
      
      // If we have too many failures, increase the check interval temporarily
      if (this.updateCheckFailures >= MAX_UPDATE_CHECK_FAILURES) {
        console.log(`🔄 Too many failures (${this.updateCheckFailures}), temporarily disabling automatic update checks for 5 minutes`);
        this.stopUpdateCheckInterval();
        
        // Restart with longer interval after 5 minutes
        setTimeout(() => {
          console.log('🔄 Re-enabling automatic update checks after backoff period');
          this.updateCheckFailures = 0;
          this.startUpdateCheckInterval();
        }, 5 * 60 * 1000); // 5 minutes
      }
    } finally {
      this.isUpdateCheckInProgress = false;
    }
  }

  private async processEventUpdates(updates: any[]): Promise<void> {
    try {
      const cachedEvents = await this.getCachedEvents();
      let hasChanges = false;

      for (const serverEvent of updates) {
        const cachedIndex = cachedEvents.findIndex(e => e.id === serverEvent.id);
        
        if (cachedIndex !== -1) {
          // Event exists in cache, check if it needs updating
          const cachedEvent = cachedEvents[cachedIndex];
          const serverUpdatedAt = serverEvent.updated_at || serverEvent.updatedAt;
          const cachedUpdatedAt = cachedEvent.updatedAt;
          
          if (serverUpdatedAt > (cachedUpdatedAt || '1970-01-01T00:00:00.000Z')) {
            console.log(`🔄 Updating cached event: ${serverEvent.name}`);
            
            // Transform server event to match frontend format
            const updatedEvent = {
              ...serverEvent,
              latitude: Number(serverEvent.latitude) || 0,
              longitude: Number(serverEvent.longitude) || 0,
              startsAt: serverEvent.starts_at || serverEvent.startsAt || '',
              venue: serverEvent.venue || '',
              address: serverEvent.address || '',
              category: serverEvent.category || 'other',
              createdBy: serverEvent.created_by || serverEvent.createdBy || 'Event Organizer',
              updatedAt: serverEvent.updated_at || serverEvent.updatedAt || new Date().toISOString()
            };
            
            cachedEvents[cachedIndex] = updatedEvent;
            hasChanges = true;
            
            // Notify listeners about the specific event update
            this.notifyListeners('eventUpdated', updatedEvent);
          }
        } else {
          // New event from server
          console.log(`🆕 Adding new event from server: ${serverEvent.name}`);
          
          const newEvent = {
            ...serverEvent,
            latitude: Number(serverEvent.latitude) || 0,
            longitude: Number(serverEvent.longitude) || 0,
            startsAt: serverEvent.starts_at || serverEvent.startsAt || '',
            venue: serverEvent.venue || '',
            address: serverEvent.address || '',
            category: serverEvent.category || 'other',
            createdBy: serverEvent.created_by || serverEvent.createdBy || 'Event Organizer',
            updatedAt: serverEvent.updated_at || serverEvent.updatedAt || new Date().toISOString()
          };
          
          cachedEvents.push(newEvent);
          hasChanges = true;
          
          // Notify listeners about the new event
          this.notifyListeners('eventCreated', newEvent);
        }
      }

      if (hasChanges) {
        await this.setCachedEvents(cachedEvents);
        console.log(`✅ Updated cache with ${updates.length} events`);
      }
    } catch (error) {
      console.error('❌ Error processing event updates:', error);
    }
  }

  private async processEventDeletions(deletions: string[]): Promise<void> {
    try {
      const cachedEvents = await this.getCachedEvents();
      let hasChanges = false;

      for (const eventId of deletions) {
        const eventIndex = cachedEvents.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
          console.log(`🗑️ Removing deleted event: ${cachedEvents[eventIndex].name}`);
          cachedEvents.splice(eventIndex, 1);
          hasChanges = true;
          
          // Notify listeners about the event deletion
          this.notifyListeners('eventDeleted', { eventId });
        }
      }

      if (hasChanges) {
        await this.setCachedEvents(cachedEvents);
        console.log(`✅ Removed ${deletions.length} deleted events from cache`);
      }
    } catch (error) {
      console.error('❌ Error processing event deletions:', error);
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
    // Reset failure count when connection is restored
    this.updateCheckFailures = 0;
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
    
    // Start pending operations sync interval
    this.syncInterval = setInterval(() => {
      this.syncPendingOperations();
    }, SYNC_INTERVAL * 2); // Double the interval (60 seconds instead of 30)
    
    // Start update checking interval
    this.startUpdateCheckInterval();
    
    console.log('🔄 Started sync intervals - Pending ops: 60s, Update checks: 60s');
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.stopUpdateCheckInterval();
    console.log('🔄 Stopped sync intervals');
  }

  private startUpdateCheckInterval(): void {
    if (!ENABLE_AUTOMATIC_UPDATES) {
      console.log('🔄 Automatic updates disabled, skipping update check interval');
      return;
    }

    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
    
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, UPDATE_CHECK_INTERVAL);
    
    console.log(`🔄 Started update check interval: ${UPDATE_CHECK_INTERVAL / 1000}s`);
  }

  private stopUpdateCheckInterval(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
    console.log('🔄 Stopped update check interval');
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

  // Public method to manually trigger update check
  public async forceUpdateCheck(): Promise<void> {
    console.log('🔄 Manual update check triggered');
    // Reset failure count for manual checks
    this.updateCheckFailures = 0;
    await this.checkForUpdates();
  }

  // Public method to clear sync errors and reset failure count
  public clearSyncErrors(): void {
    console.log('🔄 Clearing sync errors and resetting failure count');
    this.updateCheckFailures = 0;
    this.notifyListeners('syncErrorsCleared', { timestamp: new Date().toISOString() });
  }

  // Public method to get current sync health status
  public getSyncHealth(): {
    isHealthy: boolean;
    failureCount: number;
    maxFailures: number;
    isBackingOff: boolean;
    lastUpdateCheck: string | null;
  } {
    return {
      isHealthy: this.updateCheckFailures < MAX_UPDATE_CHECK_FAILURES,
      failureCount: this.updateCheckFailures,
      maxFailures: MAX_UPDATE_CHECK_FAILURES,
      isBackingOff: this.updateCheckFailures >= MAX_UPDATE_CHECK_FAILURES,
      lastUpdateCheck: this.lastUpdateCheck
    };
  }

  public async getSyncStatusAsync(): Promise<SyncStatus> {
    try {
      // Only try to get server sync status if we're online
      if (this.isOnline) {
        try {
          const response = await this.makeApiCall('/sync/status');
          if (response.success) {
            return {
              isOnline: this.isOnline,
              lastSyncAt: response.lastSync || this.lastUpdateCheck,
              pendingOperations: response.queue?.pending || this.pendingOperations.length,
              errors: response.queue?.errors > 0 ? ['Some operations failed'] : []
            };
          }
        } catch (serverError) {
          console.log('⚠️ Server sync status unavailable, using local status:', serverError instanceof Error ? serverError.message : String(serverError));
          // Don't throw, fall back to local status
        }
      }
    } catch (error) {
      console.log('⚠️ Error getting sync status, using local status:', error instanceof Error ? error.message : String(error));
    }

    // Return local sync status as fallback
    return {
      isOnline: this.isOnline,
      lastSyncAt: this.lastUpdateCheck,
      pendingOperations: this.pendingOperations.length,
      errors: this.updateCheckFailures > 0 ? [`${this.updateCheckFailures} consecutive update failures`] : []
    };
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
