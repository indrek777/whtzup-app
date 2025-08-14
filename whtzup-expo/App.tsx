import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description: string;
  category: 'music' | 'food' | 'sports' | 'art' | 'business' | 'other';
  location: {
    name: string;
    address: string;
    coordinates: [number, number];
  };
  date: string;
  time: string;
  organizer: string;
  attendees: number;
  maxAttendees?: number;
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [showEventList, setShowEventList] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Sample events data
  const sampleEvents: Event[] = [
    {
      id: '1',
      title: 'Tallinn Music Festival',
      description: 'Amazing music festival in the heart of Tallinn',
      category: 'music',
      location: {
        name: 'Tallinn Music Hall',
        address: 'Tallinn, Estonia',
        coordinates: [59.436962, 24.753574]
      },
      date: '2024-01-15',
      time: '19:00',
      organizer: 'Music Organizer',
      attendees: 150,
      maxAttendees: 200
    },
    {
      id: '2',
      title: 'Food & Wine Festival',
      description: 'Taste the best Estonian cuisine',
      category: 'food',
      location: {
        name: 'Old Town Square',
        address: 'Tallinn Old Town',
        coordinates: [59.4370, 24.7536]
      },
      date: '2024-01-20',
      time: '18:00',
      organizer: 'Food Festival Org',
      attendees: 80,
      maxAttendees: 120
    },
    {
      id: '3',
      title: 'Football Match',
      description: 'Local football championship',
      category: 'sports',
      location: {
        name: 'Tallinn Stadium',
        address: 'Tallinn Sports Complex',
        coordinates: [59.4380, 24.7540]
      },
      date: '2024-01-25',
      time: '20:00',
      organizer: 'Sports Club',
      attendees: 200,
      maxAttendees: 500
    }
  ];

  // Get user location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show events near you.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  useEffect(() => {
    setEvents(sampleEvents);
    getUserLocation();
    setLoading(false);
  }, []);

  // Get category icon
  const getCategoryIcon = (category: Event['category']) => {
    const icons = {
      music: 'musical-notes',
      food: 'restaurant',
      sports: 'football',
      art: 'color-palette',
      business: 'briefcase',
      other: 'calendar'
    };
    return icons[category];
  };

  // Get category color
  const getCategoryColor = (category: Event['category']) => {
    const colors = {
      music: '#FF3B30',
      food: '#FF9500',
      sports: '#34C759',
      art: '#AF52DE',
      business: '#007AFF',
      other: '#8E8E93'
    };
    return colors[category];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading WhtzUp...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#5856D6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>WhtzUp</Text>
          <Text style={styles.headerSubtitle}>{events.length} events nearby</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowEventList(!showEventList)}
        >
          <Ionicons name="list" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: userLocation?.coords.latitude || 59.436962,
          longitude: userLocation?.coords.longitude || 24.753574,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.location.coordinates[0],
              longitude: event.location.coordinates[1],
            }}
            title={event.title}
            description={event.location.name}
            onPress={() => setSelectedEvent(event)}
          >
            <View style={[styles.marker, { backgroundColor: getCategoryColor(event.category) }]}>
              <Ionicons name={getCategoryIcon(event.category) as any} size={16} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Event List Modal */}
      {showEventList && (
        <View style={styles.eventListContainer}>
          <View style={styles.eventListHeader}>
            <Text style={styles.eventListTitle}>Events Nearby</Text>
            <TouchableOpacity onPress={() => setShowEventList(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.eventList}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => {
                  setSelectedEvent(event);
                  setShowEventList(false);
                }}
              >
                <View style={styles.eventCardHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(event.category) }]}>
                    <Ionicons name={getCategoryIcon(event.category) as any} size={16} color="white" />
                  </View>
                  <View style={styles.eventCardContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventLocation}>{event.location.name}</Text>
                    <Text style={styles.eventTime}>{event.date} at {event.time}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <View style={styles.eventDetailContainer}>
          <View style={styles.eventDetailHeader}>
            <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
            <TouchableOpacity onPress={() => setSelectedEvent(null)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.eventDetailContent}>
            <View style={styles.eventDetailSection}>
              <Text style={styles.eventDetailDescription}>{selectedEvent.description}</Text>
            </View>
            <View style={styles.eventDetailSection}>
              <View style={styles.eventDetailRow}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <Text style={styles.eventDetailText}>{selectedEvent.location.name}</Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Ionicons name="calendar" size={20} color="#007AFF" />
                <Text style={styles.eventDetailText}>{selectedEvent.date} at {selectedEvent.time}</Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Ionicons name="people" size={20} color="#007AFF" />
                <Text style={styles.eventDetailText}>
                  {selectedEvent.attendees}{selectedEvent.maxAttendees ? `/${selectedEvent.maxAttendees}` : ''} attendees
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.getTicketsButton}>
              <Text style={styles.getTicketsText}>Get Tickets</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#007AFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerButton: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  eventListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  eventListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  eventList: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventCardContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
  eventDetailContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
  },
  eventDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  eventDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 20,
  },
  eventDetailContent: {
    flex: 1,
    padding: 20,
  },
  eventDetailSection: {
    marginBottom: 24,
  },
  eventDetailDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventDetailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  getTicketsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  getTicketsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
