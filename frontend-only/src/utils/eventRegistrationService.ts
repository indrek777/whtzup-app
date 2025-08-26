import { userService } from './userService';

const API_BASE_URL = 'http://165.22.90.180:4000/api';

export interface EventRegistration {
  eventId: string;
  registrationCount: number;
  isUserRegistered: boolean;
}

class EventRegistrationService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const authHeaders = await userService.getAuthHeaders();
    if (authHeaders) {
      Object.assign(headers, authHeaders);
    }

    return headers;
  }

  // Register user for an event
  async registerForEvent(eventId: string): Promise<{ success: boolean; registrationCount: number; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          registrationCount: result.registrationCount,
        };
      } else {
        return {
          success: false,
          registrationCount: 0,
          error: result.error || 'Failed to register for event',
        };
      }
    } catch (error) {
      console.error('Register for event error:', error);
      return {
        success: false,
        registrationCount: 0,
        error: 'Network error occurred',
      };
    }
  }

  // Unregister user from an event
  async unregisterFromEvent(eventId: string): Promise<{ success: boolean; registrationCount: number; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          registrationCount: result.registrationCount,
        };
      } else {
        return {
          success: false,
          registrationCount: 0,
          error: result.error || 'Failed to unregister from event',
        };
      }
    } catch (error) {
      console.error('Unregister from event error:', error);
      return {
        success: false,
        registrationCount: 0,
        error: 'Network error occurred',
      };
    }
  }

  // Get event registration info
  async getEventRegistrationInfo(eventId: string): Promise<{ success: boolean; data?: EventRegistration; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
        method: 'GET',
        headers,
      });

      // Handle different HTTP status codes
      if (response.status === 404) {
        console.log('Event registration info not found for event:', eventId);
        return {
          success: true,
          data: {
            eventId,
            registrationCount: 0,
            isUserRegistered: false,
          },
        };
      }

      if (response.status === 401) {
        console.log('Unauthorized access to event registration info');
        return {
          success: true,
          data: {
            eventId,
            registrationCount: 0,
            isUserRegistered: false,
          },
        };
      }

      if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        return {
          success: false,
          error: `Server error: ${response.status} ${response.statusText}`,
        };
      }

      const result = await response.json();

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        console.error('Invalid response format:', result);
        return {
          success: false,
          error: result.error || 'Invalid response from server',
        };
      }
    } catch (error) {
      console.error('Get event registration info error:', error);
      
      // Handle specific network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network connection failed. Please check your internet connection.',
        };
      }
      
      return {
        success: false,
        error: 'Network error occurred. Please try again later.',
      };
    }
  }

  // Toggle registration (register if not registered, unregister if registered)
  async toggleRegistration(eventId: string, isCurrentlyRegistered: boolean): Promise<{ success: boolean; registrationCount: number; isRegistered: boolean; error?: string }> {
    try {
      if (isCurrentlyRegistered) {
        const result = await this.unregisterFromEvent(eventId);
        return {
          success: result.success,
          registrationCount: result.registrationCount,
          isRegistered: false,
          error: result.error,
        };
      } else {
        const result = await this.registerForEvent(eventId);
        return {
          success: result.success,
          registrationCount: result.registrationCount,
          isRegistered: true,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('Toggle registration error:', error);
      return {
        success: false,
        registrationCount: 0,
        isRegistered: isCurrentlyRegistered,
        error: 'Network error occurred',
      };
    }
  }
}

export const eventRegistrationService = new EventRegistrationService();
