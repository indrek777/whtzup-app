import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { ratingService, EventRating as EventRatingType, EventRatingStats } from '../utils/ratingService';
import { userService } from '../utils/userService';

interface EventRatingProps {
  eventId: string;
  eventName: string;
  visible: boolean;
  onClose: () => void;
}

const EventRating: React.FC<EventRatingProps> = ({
  eventId,
  eventName,
  visible,
  onClose
}) => {
  const [userRating, setUserRating] = useState<EventRatingType | null>(null);
  const [stats, setStats] = useState<EventRatingStats | null>(null);
  const [ratings, setRatings] = useState<EventRatingType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [review, setReview] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);

  useEffect(() => {
    if (visible) {
      loadRatings();
    }
  }, [visible, eventId]);

  const loadRatings = async () => {
    setIsLoading(true);
    try {
      const ratingsData = await ratingService.getEventRatings(eventId);
      setStats(ratingsData.stats);
      setRatings(ratingsData.ratings);

      // Get user's rating if authenticated
      const user = await userService.getCurrentUser();
      if (user) {
        const userRatingData = await ratingService.getUserRatingForEvent(eventId);
        setUserRating(userRatingData);
        if (userRatingData) {
          setSelectedRating(userRatingData.rating);
          setReview(userRatingData.review || '');
        }
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      Alert.alert('Error', 'Failed to load ratings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (selectedRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await ratingService.rateEvent(eventId, selectedRating, review.trim() || undefined);
      setUserRating(result.rating);
      setStats(result.stats);
      
      // Refresh ratings list
      await loadRatings();
      
      Alert.alert('Success', 'Rating submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!userRating) return;

    Alert.alert(
      'Delete Rating',
      'Are you sure you want to delete your rating?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ratingService.deleteRating(userRating.id);
              setUserRating(null);
              setSelectedRating(0);
              setReview('');
              await loadRatings();
              Alert.alert('Success', 'Rating deleted successfully!');
            } catch (error) {
              console.error('Error deleting rating:', error);
              Alert.alert('Error', 'Failed to delete rating');
            }
          }
        }
      ]
    );
  };

  const renderStars = (rating: number, size: 'small' | 'medium' | 'large' = 'medium', interactive = false) => {
    // Ensure rating is a valid number
    if (typeof rating !== 'number' || isNaN(rating)) {
      rating = 0;
    }
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const starStyle = {
        small: styles.starSmall,
        medium: styles.starMedium,
        large: styles.starLarge
      }[size];

      const starColor = i <= rating ? '#FFD700' : '#E0E0E0';
      
      stars.push(
        <TouchableOpacity
          key={i}
          style={starStyle}
          onPress={interactive ? () => setSelectedRating(i) : undefined}
          disabled={!interactive}
        >
          <Text style={[starStyle, { color: starColor }]}>⭐</Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderRatingBar = (rating: number, count: number, total: number) => {
    // Ensure all parameters are valid numbers
    if (typeof rating !== 'number' || isNaN(rating)) rating = 0;
    if (typeof count !== 'number' || isNaN(count)) count = 0;
    if (typeof total !== 'number' || isNaN(total)) total = 0;
    
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.ratingBarContainer}>
        <Text style={styles.ratingBarLabel}>{rating} ⭐</Text>
        <View style={styles.ratingBarBackground}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  if (!visible) return null;

  // Don't render if we don't have a valid eventId
  if (!eventId || eventId.trim() === '') {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rate "{eventName}"</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading ratings...</Text>
            </View>
          ) : (
            <>
              {/* Overall Stats */}
              {stats && typeof stats === 'object' && (
                <View style={styles.statsContainer}>
                  <View style={styles.overallRating}>
                    <Text style={styles.averageRating}>
                      {(() => {
                        try {
                          return ratingService.formatRating(stats.averageRating || 0);
                        } catch (error) {
                          console.error('Error formatting rating:', error);
                          return '0.0';
                        }
                      })()}
                    </Text>
                    <View style={styles.starsContainer}>
                      {renderStars(stats.averageRating || 0, 'large')}
                    </View>
                    <Text style={styles.totalRatings}>{stats.totalRatings || 0} ratings</Text>
                  </View>

                  {/* Rating Distribution */}
                  <View style={styles.distributionContainer}>
                    <Text style={styles.distributionTitle}>Rating Distribution</Text>
                    {renderRatingBar(5, stats.rating5Count || 0, stats.totalRatings || 0)}
                    {renderRatingBar(4, stats.rating4Count || 0, stats.totalRatings || 0)}
                    {renderRatingBar(3, stats.rating3Count || 0, stats.totalRatings || 0)}
                    {renderRatingBar(2, stats.rating2Count || 0, stats.totalRatings || 0)}
                    {renderRatingBar(1, stats.rating1Count || 0, stats.totalRatings || 0)}
                  </View>
                </View>
              )}

              {/* User Rating Section */}
              <View style={styles.userRatingSection}>
                <Text style={styles.sectionTitle}>
                  {userRating ? 'Your Rating' : 'Rate this Event'}
                </Text>
                
                <View style={styles.ratingInputContainer}>
                  <View style={styles.starsContainer}>
                    {renderStars(selectedRating, 'large', true)}
                  </View>
                  <Text style={styles.ratingText}>
                    {selectedRating > 0 ? `${selectedRating} out of 5 stars` : 'Tap to rate'}
                  </Text>
                </View>

                {selectedRating > 0 && (
                  <View style={styles.reviewSection}>
                    <TouchableOpacity
                      style={styles.addReviewButton}
                      onPress={() => setShowReviewInput(!showReviewInput)}
                    >
                      <Text style={styles.addReviewButtonText}>
                        {showReviewInput ? 'Hide Review' : 'Add Review (Optional)'}
                      </Text>
                    </TouchableOpacity>

                    {showReviewInput && (
                      <TextInput
                        style={styles.reviewInput}
                        placeholder="Share your experience with this event..."
                        value={review}
                        onChangeText={setReview}
                        multiline
                        numberOfLines={4}
                        maxLength={1000}
                      />
                    )}
                  </View>
                )}

                <View style={styles.actionButtons}>
                  {userRating ? (
                    <>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.updateButton]}
                        onPress={handleRatingSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.submitButtonText}>Update Rating</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.deleteButton]}
                        onPress={handleDeleteRating}
                      >
                        <Text style={styles.deleteButtonText}>Delete Rating</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleRatingSubmit}
                      disabled={isSubmitting || selectedRating === 0}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Rating</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Recent Ratings */}
              {ratings && Array.isArray(ratings) && ratings.length > 0 && (
                <View style={styles.recentRatingsSection}>
                  <Text style={styles.sectionTitle}>Recent Ratings</Text>
                  {ratings.slice(0, 5).map((rating) => (
                    <View key={rating.id} style={styles.ratingItem}>
                      <View style={styles.ratingItemHeader}>
                        <Text style={styles.userName}>
                          {rating.userName || 'Anonymous User'}
                        </Text>
                        <View style={styles.ratingItemStars}>
                          {renderStars(rating.rating || 0, 'small')}
                        </View>
                      </View>
                      {rating.review && (
                        <Text style={styles.ratingReview}>{rating.review}</Text>
                      )}
                      <Text style={styles.ratingDate}>
                        {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : 'Unknown date'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallRating: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  totalRatings: {
    fontSize: 14,
    color: '#666',
  },
  distributionContainer: {
    marginTop: 16,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBarLabel: {
    width: 30,
    fontSize: 12,
    color: '#666',
  },
  ratingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingBarCount: {
    width: 30,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  userRatingSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  ratingInputContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  reviewSection: {
    marginBottom: 16,
  },
  addReviewButton: {
    paddingVertical: 8,
  },
  addReviewButtonText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  updateButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recentRatingsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  ratingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingItemStars: {
    flexDirection: 'row',
  },
  ratingReview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingDate: {
    fontSize: 12,
    color: '#999',
  },
  starSmall: {
    fontSize: 12,
    marginHorizontal: 1,
  },
  starMedium: {
    fontSize: 16,
    marginHorizontal: 2,
  },
  starLarge: {
    fontSize: 24,
    marginHorizontal: 3,
  },
});

export default EventRating;
