import { userService } from './userService';

const API_BASE_URL = 'https://165.22.90.180:4001/api';

export interface EventRating {
  id: number;
  eventId: string;
  userId: string;
  rating: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userAvatar?: string;
}

export interface EventRatingStats {
  eventId: string;
  averageRating: number;
  totalRatings: number;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  lastUpdated: string;
}

export interface EventRatingsResponse {
  stats: EventRatingStats;
  ratings: EventRating[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserRating {
  id: number;
  rating: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
  eventId: string;
  eventName: string;
  eventVenue: string;
  eventStartsAt: string;
}

class RatingService {
  // Helper function to convert snake_case to camelCase
  private transformRatingData(data: any): any {
    if (data.rating) {
      data.rating = {
        id: data.rating.id,
        eventId: data.rating.event_id,
        userId: data.rating.user_id,
        rating: data.rating.rating,
        review: data.rating.review,
        createdAt: data.rating.created_at,
        updatedAt: data.rating.updated_at,
        userName: data.rating.user_name,
        userAvatar: data.rating.user_avatar
      };
    }
    
    if (data.stats) {
      data.stats = {
        eventId: data.stats.event_id,
        averageRating: parseFloat(data.stats.average_rating) || 0,
        totalRatings: data.stats.total_ratings || 0,
        rating1Count: data.stats.rating_1_count || 0,
        rating2Count: data.stats.rating_2_count || 0,
        rating3Count: data.stats.rating_3_count || 0,
        rating4Count: data.stats.rating_4_count || 0,
        rating5Count: data.stats.rating_5_count || 0,
        lastUpdated: data.stats.last_updated
      };
    }
    
    return data;
  }

  // Rate an event
  async rateEvent(eventId: string, rating: number, review?: string): Promise<{ rating: EventRating; stats: EventRatingStats }> {
    try {
      const headers = await userService.getAuthHeaders();
      
      if (!headers.Authorization) {
        throw new Error('Authentication required to rate events');
      }

      const response = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          rating,
          review
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit rating');
      }

      const result = await response.json();
      return this.transformRatingData(result.data);
    } catch (error) {
      console.error('Error rating event:', error);
      throw error;
    }
  }

  // Get ratings for an event
  async getEventRatings(eventId: string, page: number = 1, limit: number = 10): Promise<EventRatingsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/ratings/event/${eventId}?page=${page}&limit=${limit}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch ratings');
      }

      const result = await response.json();
      const transformedData = {
        ...result.data,
        stats: {
          eventId: result.data.stats.event_id,
          averageRating: parseFloat(result.data.stats.average_rating) || 0,
          totalRatings: result.data.stats.total_ratings || 0,
          rating1Count: result.data.stats.rating_1_count || 0,
          rating2Count: result.data.stats.rating_2_count || 0,
          rating3Count: result.data.stats.rating_3_count || 0,
          rating4Count: result.data.stats.rating_4_count || 0,
          rating5Count: result.data.stats.rating_5_count || 0,
          lastUpdated: result.data.stats.last_updated
        },
        ratings: result.data.ratings.map((rating: any) => ({
          id: rating.id,
          eventId: rating.event_id,
          userId: rating.user_id,
          rating: rating.rating,
          review: rating.review,
          createdAt: rating.created_at,
          updatedAt: rating.updated_at,
          userName: rating.user_name,
          userAvatar: rating.user_avatar
        }))
      };
      return transformedData;
    } catch (error) {
      console.error('Error fetching event ratings:', error);
      throw error;
    }
  }

  // Get user's ratings
  async getUserRatings(userId: string, page: number = 1, limit: number = 10): Promise<{ ratings: UserRating[]; pagination: any }> {
    try {
      const headers = await userService.getAuthHeaders();
      
      if (!headers.Authorization) {
        throw new Error('Authentication required to view user ratings');
      }

      const response = await fetch(`${API_BASE_URL}/ratings/user/${userId}?page=${page}&limit=${limit}`, {
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch user ratings');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching user ratings:', error);
      throw error;
    }
  }

  // Delete a rating
  async deleteRating(ratingId: number): Promise<void> {
    try {
      const headers = await userService.getAuthHeaders();
      
      if (!headers.Authorization) {
        throw new Error('Authentication required to delete ratings');
      }

      const response = await fetch(`${API_BASE_URL}/ratings/${ratingId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete rating');
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw error;
    }
  }

  // Get top rated events
  async getTopRatedEvents(limit: number = 10, minRatings: number = 1): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/ratings/top-rated?limit=${limit}&minRatings=${minRatings}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch top rated events');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching top rated events:', error);
      throw error;
    }
  }

  // Get user's rating for a specific event
  async getUserRatingForEvent(eventId: string): Promise<EventRating | null> {
    try {
      const headers = await userService.getAuthHeaders();
      
      if (!headers.Authorization) {
        return null; // User not authenticated
      }

      // Get all ratings for the event and find user's rating
      const ratings = await this.getEventRatings(eventId, 1, 100);
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        return null;
      }

      // Find user's rating in the list
      const userRating = ratings.ratings.find(rating => 
        rating.userId === currentUser.id
      );

      return userRating || null;
    } catch (error) {
      console.error('Error getting user rating for event:', error);
      return null;
    }
  }

  // Format rating display
  formatRating(rating: number): string {
    if (typeof rating !== 'number' || isNaN(rating)) {
      return '0.0';
    }
    return rating.toFixed(1);
  }

  // Get star display for rating
  getStarDisplay(rating: number, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (typeof rating !== 'number' || isNaN(rating)) {
      rating = 0;
    }
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    const starSize = {
      small: '⭐',
      medium: '⭐',
      large: '⭐'
    }[size];
    
    const halfStar = '⭐';
    const emptyStar = '☆';
    
    return starSize.repeat(fullStars) + (hasHalfStar ? halfStar : '') + emptyStar.repeat(emptyStars);
  }

  // Get rating color based on rating value
  getRatingColor(rating: number): string {
    if (typeof rating !== 'number' || isNaN(rating)) {
      rating = 0;
    }
    if (rating >= 4.5) return '#4CAF50'; // Green
    if (rating >= 3.5) return '#8BC34A'; // Light green
    if (rating >= 2.5) return '#FFC107'; // Yellow
    if (rating >= 1.5) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }
}

// Export singleton instance
export const ratingService = new RatingService();
export default ratingService;
