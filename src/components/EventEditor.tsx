import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  Switch,
  FlatList,
  ActivityIndicator
} from 'react-native'
import { Event } from '../data/events'
import { saveEventsToFile, updateEventForAllUsers, deleteEventForAllUsers } from '../utils/eventStorage'
import { searchAddress, reverseGeocode } from '../utils/geocoding'
import { syncService } from '../utils/syncService'

interface EventEditorProps {
  visible: boolean
  onClose: () => void
  selectedEvent?: Event | null
  onEventUpdated?: (event: Event) => void
  events: Event[]
  onUpdateEvent: (eventId: string, updatedEvent: Event) => void
  onDeleteEvent: (eventId: string) => void
}

interface BulkEditGroup {
  venue: string
  events: Event[]
  coordinates: [number, number]
}

const EventEditor: React.FC<EventEditorProps> = ({
  visible,
  onClose,
  selectedEvent,
  onEventUpdated,
  events,
  onUpdateEvent,
  onDeleteEvent
}) => {
  
  // Editor state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditGroups, setBulkEditGroups] = useState<BulkEditGroup[]>([])
  const [selectedBulkGroup, setSelectedBulkGroup] = useState<BulkEditGroup | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSingleEventEditor, setShowSingleEventEditor] = useState(false)
  const [showCoordinateAssignmentEditor, setShowCoordinateAssignmentEditor] = useState(false)
  const [eventsToAssignCoordinates, setEventsToAssignCoordinates] = useState<Event[]>([])
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  
  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [venue, setVenue] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [attendees, setAttendees] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  
  // Location editing
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0])
  
  // Helper function to ensure coordinates are always valid numbers
  const safeCoordinates = (coords: [number, number]): [number, number] => {
    return [
      typeof coords[0] === 'number' && !isNaN(coords[0]) ? coords[0] : 0,
      typeof coords[1] === 'number' && !isNaN(coords[1]) ? coords[1] : 0
    ]
  }
  
  // Bulk edit fields
  const [bulkTitle, setBulkTitle] = useState('')
  const [bulkCategory, setBulkCategory] = useState<string>('other')
  const [bulkVenue, setBulkVenue] = useState('')
  const [bulkAddress, setBulkAddress] = useState('')
  const [bulkCoordinates, setBulkCoordinates] = useState<[number, number]>([0, 0])
  const [selectedEventsForBulkEdit, setSelectedEventsForBulkEdit] = useState<Set<string>>(new Set())
  const [groupByCoordinates, setGroupByCoordinates] = useState(false)

    // Initialize editor when modal opens
  useEffect(() => {
    if (visible) {
      if (selectedEvent) {
        // Single event edit mode
        setEditingEvent(selectedEvent)
        setIsBulkEditMode(false)
        populateForm(selectedEvent)
      } else {
        // Bulk edit mode - group events by venue or coordinates
        setIsBulkEditMode(true)
        if (groupByCoordinates) {
          groupEventsByCoordinates()
        } else {
          groupEventsByVenue()
        }
      }
    } else {
      // When main modal closes, also close coordinate assignment modal
      setShowCoordinateAssignmentEditor(false)
      setShowSingleEventEditor(false)
    }
  }, [visible, selectedEvent])

     // Debug coordinate assignment modal state
  useEffect(() => {
    console.log('showCoordinateAssignmentEditor changed to:', showCoordinateAssignmentEditor)
    if (showCoordinateAssignmentEditor) {
      console.log('Coordinate assignment modal should now be visible!')
    }
  }, [showCoordinateAssignmentEditor])

  // Group events by venue for bulk editing
  const groupEventsByVenue = useCallback(() => {
    const venueGroups = new Map<string, Event[]>()
    
    events.forEach(event => {
      const venueKey = event.venue.toLowerCase().trim()
      if (!venueGroups.has(venueKey)) {
        venueGroups.set(venueKey, [])
      }
      venueGroups.get(venueKey)!.push(event)
    })
    
    const groups: BulkEditGroup[] = Array.from(venueGroups.entries())
      .filter(([_, events]) => events.length > 1) // Only groups with multiple events
      .map(([venue, events]) => {
        // Sort events by coordinates (latitude first, then longitude)
        const sortedEvents = events.sort((a, b) => {
          // First sort by latitude
          if (Math.abs(a.latitude - b.latitude) > 0.0001) {
            return a.latitude - b.latitude
          }
          // If latitude is very close, sort by longitude
          return a.longitude - b.longitude
        })
        
        // Check if all events have default coordinates
        const hasDefaultCoordinates = sortedEvents.every(e => e.latitude === 0 && e.longitude === 0)
        const venueDisplay = hasDefaultCoordinates ? `${venue} ⚠️ (NO coordinates)` : venue
        
        return {
          venue: venueDisplay,
          events: sortedEvents,
          coordinates: [sortedEvents[0].latitude, sortedEvents[0].longitude]
        }
      })
      .sort((a, b) => {
        // Sort by priority: events with no coordinates first, then by number of events
        const aHasNoCoords = a.venue.includes('NO coordinates')
        const bHasNoCoords = b.venue.includes('NO coordinates')
        if (aHasNoCoords && !bHasNoCoords) return -1
        if (!aHasNoCoords && bHasNoCoords) return 1
        return b.events.length - a.events.length
      })
    
    setBulkEditGroups(groups)
  }, [events])

  // Group events by similar coordinates for coordinate-based editing
  const groupEventsByCoordinates = useCallback(() => {
    const coordinateGroups = new Map<string, Event[]>()
    const coordinateThreshold = 0.0001 // About 10 meters
    
    events.forEach(event => {
      // Check if coordinates are default/zero values
      const isDefaultCoordinates = event.latitude === 0 && event.longitude === 0
      
      if (isDefaultCoordinates) {
        // Group all events with default coordinates together
        const coordinateKey = 'default_coordinates'
        if (!coordinateGroups.has(coordinateKey)) {
          coordinateGroups.set(coordinateKey, [])
        }
        coordinateGroups.get(coordinateKey)!.push(event)
      } else {
        // Round coordinates to threshold to group similar coordinates
        const roundedLat = Math.round(event.latitude / coordinateThreshold) * coordinateThreshold
        const roundedLng = Math.round(event.longitude / coordinateThreshold) * coordinateThreshold
        const coordinateKey = `${roundedLat.toFixed(6)},${roundedLng.toFixed(6)}`
        
        if (!coordinateGroups.has(coordinateKey)) {
          coordinateGroups.set(coordinateKey, [])
        }
        coordinateGroups.get(coordinateKey)!.push(event)
      }
    })
    
    const groups: BulkEditGroup[] = Array.from(coordinateGroups.entries())
      .filter(([_, events]) => events.length > 1) // Only groups with multiple events
      .map(([coordinateKey, events]) => {
        // Sort events by name for better organization
        const sortedEvents = events.sort((a, b) => a.name.localeCompare(b.name))
        
        if (coordinateKey === 'default_coordinates') {
          return {
            venue: `⚠️ ${events.length} events with NO coordinates (0,0)`,
            events: sortedEvents,
            coordinates: [0, 0]
          }
        } else {
          // Safely handle coordinateKey which might be undefined
          if (coordinateKey && coordinateKey.includes(',')) {
            const [lat, lng] = coordinateKey.split(',').map(Number)
            return {
              venue: `📍 ${events.length} events at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              events: sortedEvents,
              coordinates: [lat, lng]
            }
          } else {
            // Fallback for invalid coordinate format
            return {
              venue: `⚠️ ${events.length} events with invalid coordinates`,
              events: sortedEvents,
              coordinates: [0, 0]
            }
          }
        }
      })
      .sort((a, b) => {
        // Sort by priority: default coordinates first, then by number of events
        if (a.venue.includes('NO coordinates')) return -1
        if (b.venue.includes('NO coordinates')) return 1
        return b.events.length - a.events.length
      })
    
    setBulkEditGroups(groups)
  }, [events])

  // Populate form with event data
  const populateForm = (event: Event) => {
    setTitle(event.name)
    setDescription(event.description)
    setCategory(event.category || 'other')
    setVenue(event.venue)
    setAddress(event.address)
    // Safely handle startsAt which might be undefined
    if (event.startsAt) {
      const parts = event.startsAt.split(' ')
      setDate(parts[0] || '')
      setTime(parts[1] || '12:00')
    } else {
      setDate('')
      setTime('12:00')
    }
    setOrganizer(event.createdBy || 'Event Organizer')
    setAttendees('0') // Default value since this field doesn't exist in the Event type
    setMaxAttendees('')
            setCoordinates([event.latitude, event.longitude])
  }

  // Populate bulk edit form
  const populateBulkForm = (group: BulkEditGroup) => {
    console.log('Populating bulk form for group:', group.venue, 'with', group.events.length, 'events')
    setSelectedBulkGroup(group)
    setBulkVenue(group.venue)
    setBulkAddress(group.events[0].address)
    setBulkCoordinates(group.coordinates)
    setSelectedEventsForBulkEdit(new Set()) // Start with no events selected
    
    // Pre-populate form fields with common values or leave empty for user to fill
    setBulkTitle('') // Leave empty so user can choose to update or keep original
    setBulkCategory(group.events[0].category || 'other') // Use first event's category as default
    
    // Check if all events have the same coordinates (data quality issue)
    const uniqueCoordinates = new Set(group.events.map(e => `${e.latitude},${e.longitude}`))
    if (uniqueCoordinates.size === 1) {
      console.log('⚠️ Data quality issue: All events have the same coordinates')
    }
  }

  // Open single event editor for a specific event
  const openSingleEventEditor = (event: Event) => {
    setEditingEvent(event)
    populateForm(event)
    setShowSingleEventEditor(true)
  }

  // Close single event editor and return to bulk view
  const closeSingleEventEditor = () => {
    setShowSingleEventEditor(false)
    setEditingEvent(null)
  }

  // Open coordinate assignment editor for multiple events
  const openCoordinateAssignmentEditor = (events: Event[]) => {
    console.log('openCoordinateAssignmentEditor called with', events.length, 'events')
    setEventsToAssignCoordinates(events)
    setCurrentEventIndex(0)
    setShowCoordinateAssignmentEditor(true)
    // Populate form with first event
    if (events.length > 0) {
      console.log('Populating form with first event:', events[0].name)
      populateForm(events[0])
    }
    console.log('Modal state set to true, showCoordinateAssignmentEditor should be:', true)
  }

  // Close coordinate assignment editor
  const closeCoordinateAssignmentEditor = () => {
    setShowCoordinateAssignmentEditor(false)
    setEventsToAssignCoordinates([])
    setCurrentEventIndex(0)
  }

  // Get current event being edited in coordinate assignment
  const getCurrentEvent = () => {
    return eventsToAssignCoordinates[currentEventIndex]
  }

  // Move to next event in coordinate assignment
  const nextEvent = () => {
    if (currentEventIndex < eventsToAssignCoordinates.length - 1) {
      const newIndex = currentEventIndex + 1
      setCurrentEventIndex(newIndex)
      // Populate form with next event
      const nextEventData = eventsToAssignCoordinates[newIndex]
      populateForm(nextEventData)
    }
  }

  // Move to previous event in coordinate assignment
  const previousEvent = () => {
    if (currentEventIndex > 0) {
      const newIndex = currentEventIndex - 1
      setCurrentEventIndex(newIndex)
      // Populate form with previous event
      const previousEventData = eventsToAssignCoordinates[newIndex]
      populateForm(previousEventData)
    }
  }

  // Save current event coordinates and move to next
  const saveCurrentEventCoordinates = async () => {
    const currentEvent = getCurrentEvent()
    if (!currentEvent) return

    const updatedEvent: Event = {
      ...currentEvent,
      latitude: safeCoordinates(coordinates)[0],
      longitude: safeCoordinates(coordinates)[1],
      address: address,
      venue: venue,
      updatedAt: new Date().toISOString()
    }

    try {
      setIsLoading(true)
      await updateEventForAllUsers(currentEvent.id, updatedEvent, events)
      onUpdateEvent(currentEvent.id, updatedEvent)
      
      // Move to next event or close if done
      if (currentEventIndex < eventsToAssignCoordinates.length - 1) {
        nextEvent()
      } else {
        // All events processed
        closeCoordinateAssignmentEditor()
        Alert.alert('Success', `All ${eventsToAssignCoordinates.length} events have been updated with new coordinates! Changes are saved locally.`)
      }
    } catch (error) {
      console.error('Error saving event coordinates:', error)
      Alert.alert('Error', 'Failed to save event coordinates. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Search for location
  const handleLocationSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }
    
    setIsLoading(true)
    try {
      const results = await searchAddress(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Location search error:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Select location from search results
  const selectLocation = async (result: any) => {
    try {
      const coords = await reverseGeocode(result.display_name)
      
      if (isBulkEditMode && selectedBulkGroup) {
        // Update bulk edit coordinates
        setBulkCoordinates(coords)
        setBulkAddress(result.display_name)
        setBulkVenue(result.name || (result.display_name ? result.display_name.split(',')[0] : ''))
      } else {
        // Update single event coordinates
        setCoordinates(coords)
        setAddress(result.display_name)
        setVenue(result.name || (result.display_name ? result.display_name.split(',')[0] : ''))
      }
      
      setIsEditingLocation(false)
      setSearchResults([])
      setLocationSearch('')
    } catch (error) {
      console.error('Error selecting location:', error)
      Alert.alert('Error', 'Failed to get location coordinates')
    }
  }

  // Save single event
  const saveEvent = async () => {
    if (!editingEvent) return
    
    if (!title.trim() || !venue.trim()) {
      Alert.alert('Validation Error', 'Title and venue are required')
      return
    }

    const updatedEvent: Event = {
      ...editingEvent,
      name: title.trim(),
      description: description.trim(),
      category,
      venue: venue.trim(),
      address: address.trim(),
      latitude: safeCoordinates(coordinates)[0],
      longitude: safeCoordinates(coordinates)[1],
      startsAt: date && time ? new Date(`${date}T${time}:00`).toISOString() : new Date().toISOString(),
      createdBy: organizer.trim(),
      updatedAt: new Date().toISOString()
    }

    try {
      setIsLoading(true)
      // Save to backend via sync service
      const savedEvent = await syncService.updateEvent(updatedEvent)
      // Update local state
      onUpdateEvent(editingEvent.id, savedEvent)
      onEventUpdated?.(savedEvent)
      
      if (showSingleEventEditor) {
        // If we're in single event editor mode from bulk view, close it and return to bulk view
        closeSingleEventEditor()
        Alert.alert('Success', 'Event updated successfully! Changes are synced to all users.')
      } else {
        // If we're in standalone single event editor mode, close the main modal
        onClose()
        Alert.alert('Success', 'Event updated successfully! Changes are synced to all users.')
      }
    } catch (error) {
      console.error('Error saving event:', error)
      Alert.alert('Error', 'Failed to save event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Save bulk edit
  const saveBulkEdit = async () => {
    if (!selectedBulkGroup || selectedEventsForBulkEdit.size === 0) {
      Alert.alert('Validation Error', 'Please select events to edit')
      return
    }

    const eventsToUpdate = selectedBulkGroup.events.filter(
      event => selectedEventsForBulkEdit.has(event.id)
    )

    try {
      setIsLoading(true)
      const updatedEvents = eventsToUpdate.map(event => ({
        ...event,
        name: bulkTitle || event.name,
        category: bulkCategory,
        venue: bulkVenue || event.venue,
        address: bulkAddress || event.address,
        latitude: bulkCoordinates[0] || 0,
        longitude: bulkCoordinates[1] || 0,
        updatedAt: new Date().toISOString()
      }))

      // Update each event via sync service
      for (const event of updatedEvents) {
        const savedEvent = await syncService.updateEvent(event)
        onUpdateEvent(event.id, savedEvent)
      }

      onClose()
      Alert.alert('Success', `${updatedEvents.length} events updated successfully! Changes are saved locally.`)
    } catch (error) {
      console.error('Error saving bulk edit:', error)
      Alert.alert('Error', 'Failed to save changes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete event
  const deleteEventHandler = () => {
    if (!editingEvent) return
    
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${editingEvent.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true)
              // Delete via sync service
              await syncService.deleteEvent(editingEvent.id)
              // Update local state
              onDeleteEvent(editingEvent.id)
              
              if (showSingleEventEditor) {
                // If we're in single event editor mode from bulk view, close it and return to bulk view
                closeSingleEventEditor()
                Alert.alert('Success', 'Event deleted successfully! Changes are synced to all users.')
              } else {
                // If we're in standalone single event editor mode, close the main modal
                onClose()
                Alert.alert('Success', 'Event deleted successfully! Changes are synced to all users.')
              }
            } catch (error) {
              console.error('Error deleting event:', error)
              Alert.alert('Error', 'Failed to delete event. Please try again.')
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }

  // Toggle event selection for bulk edit
  const toggleEventSelection = (eventId: string) => {
    setSelectedEventsForBulkEdit(prevSelection => {
      const newSelection = new Set(prevSelection)
      if (newSelection.has(eventId)) {
        newSelection.delete(eventId)
      } else {
        newSelection.add(eventId)
      }
      console.log('Toggling event:', eventId, 'New selection size:', newSelection.size)
      return newSelection
    })
  }

  // Select all events in the current group
  const selectAllEvents = () => {
    if (selectedBulkGroup) {
      setSelectedEventsForBulkEdit(new Set(selectedBulkGroup.events.map(e => e.id)))
      console.log('Selected all events:', selectedBulkGroup.events.length)
    }
  }

  // Deselect all events
  const deselectAllEvents = () => {
    setSelectedEventsForBulkEdit(new Set())
    console.log('Deselected all events')
  }

  // Spread out events that are at the same coordinate
  const spreadOutEvents = () => {
    if (!selectedBulkGroup || selectedEventsForBulkEdit.size === 0) {
      Alert.alert('Error', 'Please select events to spread out')
      return
    }

    const selectedEvents = selectedBulkGroup.events.filter(e => selectedEventsForBulkEdit.has(e.id))
    if (selectedEvents.length < 2) {
      Alert.alert('Error', 'Need at least 2 events to spread out')
      return
    }

    // Calculate spread radius (in degrees) - adjust as needed
    const baseLat = selectedEvents[0].latitude
    const baseLng = selectedEvents[0].longitude
    const radius = 0.001 // About 100 meters
    const angleStep = (2 * Math.PI) / selectedEvents.length

    const updatedEvents = selectedEvents.map((event, index) => {
      const angle = angleStep * index
      const latOffset = radius * Math.cos(angle)
      const lngOffset = radius * Math.sin(angle)
      
      return {
        ...event,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        updatedAt: new Date().toISOString()
      }
    })

    // Update the coordinates in the form
    setBulkCoordinates([baseLat, baseLng])
    
    Alert.alert(
      'Spread Events',
      `Spread ${selectedEvents.length} events in a circle around the base coordinate. Each event will be moved by ~100 meters.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              setIsLoading(true)
              for (const event of updatedEvents) {
                await updateEventForAllUsers(event.id, event, events)
                onUpdateEvent(event.id, event)
              }
              Alert.alert('Success', `${updatedEvents.length} events spread out successfully!`)
            } catch (error) {
              console.error('Error spreading events:', error)
              Alert.alert('Error', 'Failed to spread events. Please try again.')
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }

  // Assign random coordinates within a radius
  const assignRandomCoordinates = () => {
    if (!selectedBulkGroup || selectedEventsForBulkEdit.size === 0) {
      Alert.alert('Error', 'Please select events to assign coordinates')
      return
    }

    const selectedEvents = selectedBulkGroup.events.filter(e => selectedEventsForBulkEdit.has(e.id))
    const baseLat = selectedEvents[0].latitude
    const baseLng = selectedEvents[0].longitude
    const radius = 0.002 // About 200 meters

    const updatedEvents = selectedEvents.map((event) => {
      // Generate random angle and distance
      const angle = Math.random() * 2 * Math.PI
      const distance = Math.random() * radius
      
      const latOffset = distance * Math.cos(angle)
      const lngOffset = distance * Math.sin(angle)
      
      return {
        ...event,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        updatedAt: new Date().toISOString()
      }
    })

    Alert.alert(
      'Assign Random Coordinates',
      `Assign random coordinates to ${selectedEvents.length} events within ~200 meters of the base location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              setIsLoading(true)
              for (const event of updatedEvents) {
                await updateEventForAllUsers(event.id, event, events)
                onUpdateEvent(event.id, event)
              }
              Alert.alert('Success', `${updatedEvents.length} events assigned random coordinates!`)
            } catch (error) {
              console.error('Error assigning coordinates:', error)
              Alert.alert('Error', 'Failed to assign coordinates. Please try again.')
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }

  // Set new base coordinate for all selected events
  const setNewBaseCoordinate = () => {
    if (!selectedBulkGroup || selectedEventsForBulkEdit.size === 0) {
      Alert.alert('Error', 'Please select events to update coordinates')
      return
    }

    const selectedEvents = selectedBulkGroup.events.filter(e => selectedEventsForBulkEdit.has(e.id))
    
    Alert.alert(
      'Set New Base Coordinate',
      `Move all ${selectedEvents.length} selected events to the new coordinate: ${bulkCoordinates[0]?.toFixed(6) || '0.000000'}, ${bulkCoordinates[1]?.toFixed(6) || '0.000000'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              setIsLoading(true)
              const updatedEvents = selectedEvents.map(event => ({
                ...event,
                latitude: bulkCoordinates[0] || 0,
                longitude: bulkCoordinates[1] || 0,
                updatedAt: new Date().toISOString()
              }))

              for (const event of updatedEvents) {
                await updateEventForAllUsers(event.id, event, events)
                onUpdateEvent(event.id, event)
              }
              Alert.alert('Success', `${updatedEvents.length} events moved to new coordinate!`)
            } catch (error) {
              console.error('Error updating coordinates:', error)
              Alert.alert('Error', 'Failed to update coordinates. Please try again.')
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }

  // Assign sequential coordinates in a grid pattern
  const assignGridCoordinates = () => {
    if (!selectedBulkGroup || selectedEventsForBulkEdit.size === 0) {
      Alert.alert('Error', 'Please select events to assign coordinates')
      return
    }

    const selectedEvents = selectedBulkGroup.events.filter(e => selectedEventsForBulkEdit.has(e.id))
    const baseLat = selectedEvents[0].latitude
    const baseLng = selectedEvents[0].longitude
    const spacing = 0.0005 // About 50 meters between events
    const eventsPerRow = Math.ceil(Math.sqrt(selectedEvents.length))

    const updatedEvents = selectedEvents.map((event, index) => {
      const row = Math.floor(index / eventsPerRow)
      const col = index % eventsPerRow
      
      const latOffset = row * spacing
      const lngOffset = col * spacing
      
      return {
        ...event,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        updatedAt: new Date().toISOString()
      }
    })

    Alert.alert(
      'Assign Grid Coordinates',
      `Arrange ${selectedEvents.length} events in a grid pattern starting from the base location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              setIsLoading(true)
              for (const event of updatedEvents) {
                await updateEventForAllUsers(event.id, event, events)
                onUpdateEvent(event.id, event)
              }
              Alert.alert('Success', `${selectedEvents.length} events arranged in a grid!`)
            } catch (error) {
              console.error('Error assigning grid coordinates:', error)
              Alert.alert('Error', 'Failed to assign grid coordinates. Please try again.')
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }

  // Export events to JSON
  const exportEvents = () => {
    try {
      const eventsToExport = selectedBulkGroup 
        ? selectedBulkGroup.events.filter(e => selectedEventsForBulkEdit.has(e.id))
        : editingEvent 
        ? [editingEvent] 
        : events

      const jsonString = JSON.stringify(eventsToExport, null, 2)
      // In a real app, you'd use a file system API or share API
      console.log('Events to export:', jsonString)
      Alert.alert('Export', 'Events exported to console (implement file export)')
    } catch (error) {
      console.error('Export error:', error)
      Alert.alert('Error', 'Failed to export events')
    }
  }

  const categories: string[] = ['music', 'food', 'sports', 'art', 'business', 'other']

  if (!visible) return null

     return (
     <>
       <Modal
         visible={visible}
         animationType="slide"
         presentationStyle="pageSheet"
         onRequestClose={onClose}
       >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isBulkEditMode ? 'Bulk Event Editor' : 'Event Editor'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {isBulkEditMode ? (
            // Bulk Edit Mode
            <>
              {!selectedBulkGroup ? (
                // Show groups list when no group is selected
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modeToggle}>
                    <Text style={styles.modeLabel}>Bulk Edit Mode</Text>
                    <Switch
                      value={isBulkEditMode}
                      onValueChange={setIsBulkEditMode}
                    />
                  </View>
                  
                  <View style={styles.groupingToggle}>
                    <Text style={styles.groupingLabel}>
                      {groupByCoordinates ? 'Group by Coordinates' : 'Group by Venue'}
                    </Text>
                    <Switch
                      value={groupByCoordinates}
                      onValueChange={(value) => {
                        setGroupByCoordinates(value)
                        if (value) {
                          groupEventsByCoordinates()
                        } else {
                          groupEventsByVenue()
                        }
                      }}
                    />
                  </View>

                  {bulkEditGroups.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No events with duplicate venues found
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.sectionTitle}>
                        {groupByCoordinates ? 'Events by Coordinates' : 'Events by Venue'}
                      </Text>
                      {bulkEditGroups.map((group, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.venueGroup,
                            selectedBulkGroup?.venue === group.venue && styles.selectedVenueGroup
                          ]}
                          onPress={() => populateBulkForm(group)}
                        >
                          <Text style={styles.venueName}>{group.venue}</Text>
                          <Text style={styles.eventCount}>
                            {group.events.length} events
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
              ) : (
                // Show event list when a group is selected
                <View style={styles.bulkEventListContainer}>
                  <View style={styles.eventListHeader}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => setSelectedBulkGroup(null)}
                    >
                      <Text style={styles.backButtonText}>← Back to Groups</Text>
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>
                      Events in "{selectedBulkGroup.venue}" ({selectedBulkGroup.events.length} events)
                    </Text>
                  </View>
                    
                    {/* Data Quality Warning */}
                    {(() => {
                      const uniqueCoordinates = new Set(selectedBulkGroup.events.map(e => `${e.latitude},${e.longitude}`))
                      const hasDefaultCoordinates = selectedBulkGroup.events.every(e => e.latitude === 0 && e.longitude === 0)
                      
                      if (hasDefaultCoordinates) {
                        return (
                          <View style={styles.warningContainer}>
                            <Text style={styles.warningText}>
                              ⚠️ All events have NO coordinates (0,0)! Use location search or coordinate tools below to fix this.
                            </Text>
                          </View>
                        )
                      } else if (uniqueCoordinates.size === 1) {
                        return (
                          <View style={styles.warningContainer}>
                            <Text style={styles.warningText}>
                              ⚠️ All events have the same coordinates! Use coordinate tools below to fix this.
                            </Text>
                          </View>
                        )
                      }
                      return null
                    })()}
                    
                                         {/* Quick Action Buttons */}
                     <View style={styles.quickActionsContainer}>
                       <Text style={styles.quickActionsTitle}>Quick Coordinate Actions:</Text>
                       
                       <View style={styles.coordinateButtonsRow}>
                         <TouchableOpacity
                           style={styles.coordinateButton}
                           onPress={spreadOutEvents}
                         >
                           <Text style={styles.coordinateButtonText}>🔄 Circle</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity
                           style={styles.coordinateButton}
                           onPress={assignRandomCoordinates}
                         >
                           <Text style={styles.coordinateButtonText}>🎲 Random</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity
                           style={styles.coordinateButton}
                           onPress={assignGridCoordinates}
                         >
                           <Text style={styles.coordinateButtonText}>📐 Grid</Text>
                         </TouchableOpacity>
                       </View>
                       
                       <TouchableOpacity
                         style={styles.moveToCoordinateButton}
                         onPress={setNewBaseCoordinate}
                       >
                         <Text style={styles.moveToCoordinateButtonText}>📍 Move All to New Coordinate</Text>
                       </TouchableOpacity>

                                               {/* Individual Coordinate Assignment Button */}
                        {(() => {
                          const uniqueCoordinates = new Set(selectedBulkGroup.events.map(e => `${e.latitude},${e.longitude}`))
                          const hasDefaultCoordinates = selectedBulkGroup.events.every(e => e.latitude === 0 && e.longitude === 0)
                          
                          console.log('Checking individual coordinate button:', {
                            uniqueCoordinates: uniqueCoordinates.size,
                            hasDefaultCoordinates,
                            events: selectedBulkGroup.events.length
                          })
                          
                          // Show button for any group of events (not just when they all have same coordinates)
                          console.log('Rendering individual coordinate button for', selectedBulkGroup.events.length, 'events')
                          return (
                            <TouchableOpacity
                              style={styles.individualCoordinateButton}
                              onPress={() => {
                                console.log('Button pressed! Opening coordinate assignment editor for', selectedBulkGroup.events.length, 'events')
                                console.log('Current showCoordinateAssignmentEditor state:', showCoordinateAssignmentEditor)
                                openCoordinateAssignmentEditor(selectedBulkGroup.events)
                                console.log('After calling openCoordinateAssignmentEditor, showCoordinateAssignmentEditor should be true')
                              }}
                            >
                              <Text style={styles.individualCoordinateButtonText}>
                                🎯 Assign Individual Coordinates ({selectedBulkGroup.events.length} events)
                              </Text>
                            </TouchableOpacity>
                          )
                        })()}
                     </View>
                    
                    {/* Event List */}
                    <FlatList
                      data={selectedBulkGroup.events}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.bulkEventItem}
                          onPress={() => openSingleEventEditor(item)}
                        >
                          <View style={styles.bulkEventInfo}>
                            <Text style={styles.bulkEventTitle}>{item.name}</Text>
                            <Text style={styles.bulkEventDate}>{item.startsAt}</Text>
                            <Text style={styles.bulkEventCoordinates}>
                              {item.latitude === 0 && item.longitude === 0 ? (
                                '⚠️ NO coordinates (0,0)'
                              ) : (
                                `📍 ${item.latitude?.toFixed(6) || '0.000000'}, ${item.longitude?.toFixed(6) || '0.000000'}`
                              )}
                            </Text>
                            {groupByCoordinates && (
                              <Text style={styles.bulkEventVenue}>
                                🏢 {item.venue}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.editIcon}>✏️</Text>
                        </TouchableOpacity>
                      )}
                      style={styles.bulkEventList}
                    />
                  </View>
                )}
             </>
          ) : (
            // Single Event Edit Mode
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modeToggle}>
                <Text style={styles.modeLabel}>Single Event Mode</Text>
                <Switch
                  value={isBulkEditMode}
                  onValueChange={setIsBulkEditMode}
                />
              </View>

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Event description"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryButtons}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.selectedCategory
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat && styles.selectedCategoryText
                    ]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Venue *</Text>
              <TextInput
                style={styles.input}
                value={venue}
                onChangeText={setVenue}
                placeholder="Venue name"
              />

              <Text style={styles.fieldLabel}>Address</Text>
              <TouchableOpacity
                style={styles.locationInput}
                onPress={() => setIsEditingLocation(true)}
              >
                <Text style={styles.locationText}>
                  {address || 'Tap to set location'}
                </Text>
                <Text style={styles.locationIcon}>📍</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Coordinates</Text>
              <Text style={styles.helpText}>
                Current: {safeCoordinates(coordinates)[0].toFixed(6)}, {safeCoordinates(coordinates)[1].toFixed(6)}
              </Text>
              <View style={styles.coordinateRow}>
                <View style={styles.coordinateInput}>
                  <Text style={styles.coordinateLabel}>Latitude:</Text>
                  <TextInput
                    style={styles.input}
                    value={safeCoordinates(coordinates)[0].toString()}
                    onChangeText={(text) => {
                      const lat = parseFloat(text) || 0
                      setCoordinates([lat, safeCoordinates(coordinates)[1]])
                    }}
                    placeholder="Latitude"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.coordinateInput}>
                  <Text style={styles.coordinateLabel}>Longitude:</Text>
                  <TextInput
                    style={styles.input}
                    value={safeCoordinates(coordinates)[1].toString()}
                    onChangeText={(text) => {
                      const lng = parseFloat(text) || 0
                      setCoordinates([safeCoordinates(coordinates)[0], lng])
                    }}
                    placeholder="Longitude"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
              />

              <Text style={styles.fieldLabel}>Organizer</Text>
              <TextInput
                style={styles.input}
                value={organizer}
                onChangeText={setOrganizer}
                placeholder="Event organizer"
              />

              <Text style={styles.fieldLabel}>Attendees</Text>
              <TextInput
                style={styles.input}
                value={attendees}
                onChangeText={setAttendees}
                placeholder="Number of attendees"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Max Attendees</Text>
              <TextInput
                style={styles.input}
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                placeholder="Maximum attendees (optional)"
                keyboardType="numeric"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={deleteEventHandler}
                  disabled={isLoading}
                >
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={saveEvent}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={styles.loadingButtonContent}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.primaryButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>

                 {/* Location Search Modal */}
         <Modal
           visible={isEditingLocation}
           animationType="slide"
           presentationStyle="pageSheet"
         >
           <View style={styles.locationModal}>
             <View style={styles.locationHeader}>
               <Text style={styles.locationTitle}>Search Location</Text>
               <TouchableOpacity
                 onPress={() => setIsEditingLocation(false)}
                 style={styles.closeButton}
               >
                 <Text style={styles.closeButtonText}>✕</Text>
               </TouchableOpacity>
             </View>

             <TextInput
               style={styles.searchInput}
               value={locationSearch}
               onChangeText={(text) => {
                 setLocationSearch(text)
                 handleLocationSearch(text)
               }}
               placeholder="Search for location..."
             />

             {isLoading && (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator size="large" color="#007AFF" />
                 <Text style={styles.loadingText}>Searching...</Text>
               </View>
             )}

             <FlatList
               data={searchResults}
               keyExtractor={(item, index) => index.toString()}
               renderItem={({ item }) => (
                 <TouchableOpacity
                   style={styles.searchResult}
                   onPress={() => selectLocation(item)}
                 >
                   <Text style={styles.searchResultTitle}>
                     {item.name || (item.display_name ? item.display_name.split(',')[0] : 'Unknown Location')}
                   </Text>
                   <Text style={styles.searchResultAddress}>
                     {item.display_name}
                   </Text>
                 </TouchableOpacity>
               )}
               style={styles.searchResults}
             />
           </View>
         </Modal>

                   {/* Single Event Editor Modal (from bulk view) */}
          <Modal
            visible={showSingleEventEditor}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Edit Event</Text>
                <TouchableOpacity onPress={closeSingleEventEditor} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Single Event Edit Form */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Event title"
                />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Event description"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryButtons}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.selectedCategory
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        category === cat && styles.selectedCategoryText
                      ]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Venue *</Text>
                <TextInput
                  style={styles.input}
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="Venue name"
                />

                                 <Text style={styles.fieldLabel}>Address</Text>
                 <TouchableOpacity
                   style={styles.locationInput}
                   onPress={() => setIsEditingLocation(true)}
                 >
                   <Text style={styles.locationText}>
                     {address || 'Tap to set location'}
                   </Text>
                   <Text style={styles.locationIcon}>📍</Text>
                 </TouchableOpacity>

                 <Text style={styles.fieldLabel}>Coordinates</Text>
                 <Text style={styles.helpText}>
                   Current: {safeCoordinates(coordinates)[0].toFixed(6)}, {safeCoordinates(coordinates)[1].toFixed(6)}
                 </Text>
                 <View style={styles.coordinateRow}>
                   <View style={styles.coordinateInput}>
                     <Text style={styles.coordinateLabel}>Latitude:</Text>
                     <TextInput
                       style={styles.input}
                       value={safeCoordinates(coordinates)[0].toString()}
                       onChangeText={(text) => {
                         const lat = parseFloat(text) || 0
                         setCoordinates([lat, safeCoordinates(coordinates)[1]])
                       }}
                       placeholder="Latitude"
                       keyboardType="numeric"
                     />
                   </View>
                   <View style={styles.coordinateInput}>
                     <Text style={styles.coordinateLabel}>Longitude:</Text>
                     <TextInput
                       style={styles.input}
                       value={safeCoordinates(coordinates)[1].toString()}
                       onChangeText={(text) => {
                         const lng = parseFloat(text) || 0
                         setCoordinates([safeCoordinates(coordinates)[0], lng])
                       }}
                       placeholder="Longitude"
                       keyboardType="numeric"
                     />
                   </View>
                 </View>

                 <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.fieldLabel}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                />

                <Text style={styles.fieldLabel}>Organizer</Text>
                <TextInput
                  style={styles.input}
                  value={organizer}
                  onChangeText={setOrganizer}
                  placeholder="Event organizer"
                />

                <Text style={styles.fieldLabel}>Attendees</Text>
                <TextInput
                  style={styles.input}
                  value={attendees}
                  onChangeText={setAttendees}
                  placeholder="Number of attendees"
                  keyboardType="numeric"
                />

                <Text style={styles.fieldLabel}>Max Attendees</Text>
                <TextInput
                  style={styles.input}
                  value={maxAttendees}
                  onChangeText={setMaxAttendees}
                  placeholder="Maximum attendees (optional)"
                  keyboardType="numeric"
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.dangerButton]}
                    onPress={deleteEventHandler}
                    disabled={isLoading}
                  >
                    <Text style={styles.dangerButtonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={saveEvent}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingButtonContent}>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.primaryButtonText}>Saving...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>

                     
             </View>
     </Modal>

     {/* Coordinate Assignment Editor Modal - Outside main modal to avoid nesting issues */}
     <Modal
       visible={showCoordinateAssignmentEditor}
       animationType="slide"
       presentationStyle="pageSheet"
               onShow={() => {
          console.log('Coordinate assignment modal shown, current event:', getCurrentEvent()?.name)
          console.log('Modal is now visible!')
        }}
     >
       <View style={styles.container}>
         {/* Header */}
         <View style={styles.header}>
           <Text style={styles.headerTitle}>
             Assign Coordinates ({currentEventIndex + 1} of {eventsToAssignCoordinates.length})
           </Text>
           <TouchableOpacity onPress={closeCoordinateAssignmentEditor} style={styles.closeButton}>
             <Text style={styles.closeButtonText}>✕</Text>
           </TouchableOpacity>
         </View>

         {/* Current Event Info */}
         <View style={styles.currentEventInfo}>
           <Text style={styles.currentEventTitle}>
             {getCurrentEvent()?.name}
           </Text>
           <Text style={styles.currentEventVenue}>
             Venue: {getCurrentEvent()?.venue}
           </Text>
           <Text style={styles.currentEventDate}>
             Date: {getCurrentEvent()?.startsAt}
           </Text>
         </View>

         {/* Events List Preview */}
         <View style={styles.eventsPreviewContainer}>
           <Text style={styles.eventsPreviewTitle}>
             Events to Edit ({eventsToAssignCoordinates.length} total):
           </Text>
           <ScrollView style={styles.eventsPreviewList} horizontal showsHorizontalScrollIndicator={false}>
             {eventsToAssignCoordinates.map((event, index) => (
               <TouchableOpacity
                 key={event.id} 
                 style={[
                   styles.eventPreviewItem,
                   index === currentEventIndex && styles.currentEventPreviewItem
                 ]}
                 onPress={() => {
                   setCurrentEventIndex(index)
                   populateForm(event)
                 }}
               >
                 <Text style={styles.eventPreviewNumber}>{index + 1}</Text>
                 <Text style={styles.eventPreviewName} numberOfLines={1}>
                   {event.name}
                 </Text>
                 <Text style={styles.eventPreviewCoordinates}>
                   {event.latitude === 0 && event.longitude === 0 ? (
                     '⚠️ (0,0)'
                   ) : (
                     `${event.latitude?.toFixed(4) || '0.0000'}, ${event.longitude?.toFixed(4) || '0.0000'}`
                   )}
                 </Text>
               </TouchableOpacity>
             ))}
           </ScrollView>
         </View>

         {/* Coordinate Assignment Form */}
         <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
           <Text style={styles.fieldLabel}>Venue</Text>
           <TextInput
             style={styles.input}
             value={venue}
             onChangeText={setVenue}
             placeholder="Venue name"
           />

           <Text style={styles.fieldLabel}>Address</Text>
           <TouchableOpacity
             style={styles.locationInput}
             onPress={() => setIsEditingLocation(true)}
           >
             <Text style={styles.locationText}>
               {address || 'Tap to set location'}
             </Text>
             <Text style={styles.locationIcon}>📍</Text>
           </TouchableOpacity>

           <Text style={styles.fieldLabel}>Coordinates</Text>
           <Text style={styles.helpText}>
             Current: {safeCoordinates(coordinates)[0].toFixed(6)}, {safeCoordinates(coordinates)[1].toFixed(6)}
           </Text>
           <View style={styles.coordinateRow}>
             <View style={styles.coordinateInput}>
               <Text style={styles.coordinateLabel}>Latitude:</Text>
               <TextInput
                 style={styles.input}
                 value={safeCoordinates(coordinates)[0].toString()}
                 onChangeText={(text) => {
                   const lat = parseFloat(text) || 0
                   setCoordinates([lat, safeCoordinates(coordinates)[1]])
                 }}
                 placeholder="Latitude"
                 keyboardType="numeric"
               />
             </View>
             <View style={styles.coordinateInput}>
               <Text style={styles.coordinateLabel}>Longitude:</Text>
               <TextInput
                 style={styles.input}
                 value={safeCoordinates(coordinates)[1].toString()}
                 onChangeText={(text) => {
                   const lng = parseFloat(text) || 0
                   setCoordinates([safeCoordinates(coordinates)[0], lng])
                 }}
                 placeholder="Longitude"
                 keyboardType="numeric"
               />
             </View>
           </View>

           {/* Navigation Buttons */}
           <View style={styles.navigationButtons}>
             <TouchableOpacity
               style={[styles.navButton, styles.previousButton]}
               onPress={previousEvent}
               disabled={currentEventIndex === 0}
             >
               <Text style={styles.navButtonText}>← Previous</Text>
             </TouchableOpacity>
             
             <TouchableOpacity
               style={[styles.navButton, styles.nextButton]}
               onPress={saveCurrentEventCoordinates}
               disabled={isLoading}
             >
               {isLoading ? (
                 <View style={styles.loadingButtonContent}>
                   <ActivityIndicator size="small" color="white" />
                   <Text style={styles.navButtonText}>Saving...</Text>
                 </View>
               ) : currentEventIndex === eventsToAssignCoordinates.length - 1 ? (
                 <Text style={styles.navButtonText}>Finish</Text>
               ) : (
                 <Text style={styles.navButtonText}>Save & Next →</Text>
               )}
             </TouchableOpacity>
           </View>
         </ScrollView>
       </View>
     </Modal>
   </>
 )
 }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  groupingToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  groupingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  venueGroup: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedVenueGroup: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  eventCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bulkEditForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  selectionCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  locationInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  locationIcon: {
    fontSize: 20,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  eventSelectionList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  eventSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedEventItem: {
    backgroundColor: '#f0f8ff',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckbox: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedEventTitle: {
    color: '#007AFF',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  eventCoordinates: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  eventVenue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationModal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  searchResults: {
    flex: 1,
    marginHorizontal: 16,
  },
  searchResult: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventSelectionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 8,
    flexDirection: 'row',
  },
  eventListContainer: {
    flex: 1,
    marginRight: 8,
  },
  fixedActionButtons: {
    width: 100,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    marginBottom: 2,
  },
  actionButtonLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  bulkEditFormFields: {
    padding: 16,
  },
  selectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  spreadButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  spreadButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  randomButton: {
    backgroundColor: '#8E44AD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  randomButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  gridButton: {
    backgroundColor: '#E67E22',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  gridButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  baseCoordinateButton: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  baseCoordinateButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coordinateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '600',
  },
  locationButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  locationButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  quickActionsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  coordinateButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  coordinateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  coordinateButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  moveToCoordinateButton: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  moveToCoordinateButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  bulkEventListContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  bulkEventList: {
    flex: 1,
  },
  bulkEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  bulkEventInfo: {
    flex: 1,
  },
  bulkEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bulkEventDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bulkEventCoordinates: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  bulkEventVenue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  editIcon: {
    fontSize: 20,
    marginLeft: 12,
  },
  individualCoordinateButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  individualCoordinateButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  currentEventInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  currentEventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentEventVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  currentEventDate: {
    fontSize: 14,
    color: '#666',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  previousButton: {
    backgroundColor: '#6c757d',
  },
  nextButton: {
    backgroundColor: '#28a745',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsPreviewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  eventsPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  eventsPreviewList: {
    flexDirection: 'row',
  },
  eventPreviewItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 120,
    alignItems: 'center',
  },
  currentEventPreviewItem: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  eventPreviewNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  eventPreviewName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  eventPreviewCoordinates: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  eventListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
})

export default EventEditor
