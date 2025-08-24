import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ratingService } from '../utils/ratingService';

interface RatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  onPress?: () => void;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  averageRating,
  totalRatings,
  size = 'medium',
  showCount = true,
  onPress
}) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      let starColor = '#E0E0E0'; // Empty star
      
      if (i <= fullStars) {
        starColor = '#FFD700'; // Full star
      } else if (i === fullStars + 1 && hasHalfStar) {
        starColor = '#FFD700'; // Half star (simplified)
      }
      
      stars.push(
        <Text key={i} style={[styles.star, { color: starColor }]}>
          ⭐
        </Text>
      );
    }
    return stars;
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={styles.container} onPress={onPress}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {showCount && totalRatings > 0 && (
        <Text style={[styles.ratingText, styles[size]]}>
          {ratingService.formatRating(averageRating)} ({totalRatings})
        </Text>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  star: {
    fontSize: 12,
    marginHorizontal: 1,
  },
  ratingText: {
    color: '#666',
    fontWeight: '500',
  },
  small: {
    fontSize: 10,
  },
  medium: {
    fontSize: 12,
  },
  large: {
    fontSize: 14,
  },
});

export default RatingDisplay;
