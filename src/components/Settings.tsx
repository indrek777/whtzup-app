import React, { useState, useEffect } from 'react'
import { useEvents, Event } from '../context/EventContext'
import { X, Edit, Trash2, Plus, Search, Filter, Calendar, MapPin, User, Clock, Users, Star, Save, ArrowLeft, Upload, Download, FileText, Database } from 'lucide-react'
import DataImporter from './DataImporter'
import GeocodingTool from './GeocodingTool'
import GeocodingCSVTool from './GeocodingCSVTool'
import VenueManager from './VenueManager'
import { createEventBackup } from '../utils/eventBackup'
import { clearStoredEvents, downloadCurrentEventsAsJSON } from '../utils/eventStorage'
import { searchAddress, getCoordinates, formatDisplayName, GeocodingSearchResult } from '../utils/geocoding'

interface SettingsProps {
  onClose: () => void
  selectedEvent?: Event | null
}

interface EventFormData {
  id: string
  title: string
  description: string
  category: 'music' | 'food' | 'sports' | 'art' | 'business' | 'other'
  location: {
    name: string
    address: string
    coordinates: [number, number]
  }
  date: string
  time: string
  organizer: string
  attendees: number
  maxAttendees?: number
}

const Settings: React.FC<SettingsProps> = ({ onClose, selectedEvent }) => {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const [activeTab, setActiveTab] = useState<'events' | 'add'>('events')
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false)
  const [showDataImporter, setShowDataImporter] = useState(false)
  const [showGeocodingTool, setShowGeocodingTool] = useState(false)
  const [showGeocodingCSVTool, setShowGeocodingCSVTool] = useState(false)
  const [showVenueManager, setShowVenueManager] = useState(false)
  const [geocodingResults, setGeocodingResults] = useState<GeocodingSearchResult[]>([])
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    id: '',
    title: '',
    description: '',
    category: 'other',
    location: {
      name: '',
      address: '',
      coordinates: [59.436962, 24.753574]
    },
    date: '',
    time: '',
    organizer: '',
    attendees: 0,
    maxAttendees: undefined
  })

  // Auto-switch to edit mode when selectedEvent is provided
  useEffect(() => {
    if (selectedEvent) {
      handleEditEvent(selectedEvent)
    }
  }, [selectedEvent])

  const categories = [
    { value: 'all', label: 'All Categories', icon: '📅' },
    { value: 'music', label: 'Music', icon: '🎵' },
    { value: 'food', label: 'Food & Drink', icon: '🍕' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'art', label: 'Art & Culture', icon: '🎨' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'other', label: 'Other', icon: '📅' }
  ]

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    // Sort by date (most recent first)
    try {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0
      if (isNaN(dateA.getTime())) return 1
      if (isNaN(dateB.getTime())) return -1
      return dateB.getTime() - dateA.getTime()
    } catch {
      return 0
    }
  })

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      location: event.location,
      date: event.date,
      time: event.time,
      organizer: event.organizer,
      attendees: event.attendees,
      maxAttendees: event.maxAttendees
    })
    setActiveTab('add')
  }

  const handleSaveEvent = () => {
    const missingFields = []
    if (!formData.title.trim()) missingFields.push('Event Title')
    if (!formData.description.trim()) missingFields.push('Description')
    if (!formData.location.name.trim()) missingFields.push('Venue Name')
    if (!formData.organizer.trim()) missingFields.push('Organizer')
    
    // Validate coordinates
    const [lat, lng] = formData.location.coordinates
    if (isNaN(lat) || isNaN(lng)) {
      missingFields.push('Valid Coordinates')
    } else if (lat < -90 || lat > 90) {
      missingFields.push('Valid Latitude (between -90 and 90)')
    } else if (lng < -180 || lng > 180) {
      missingFields.push('Valid Longitude (between -180 and 180)')
    }
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missingFields.join('\n• ')}`)
      return
    }

    const newEvent: Event = {
      ...formData,
      id: editingEvent?.id || Date.now().toString(),
      image: editingEvent?.image,
      rating: editingEvent?.rating,
      userRating: editingEvent?.userRating
    }

    if (editingEvent) {
      updateEvent(editingEvent.id, newEvent)
    } else {
      addEvent(newEvent)
    }
    
    // Reset form
    setFormData({
      id: '',
      title: '',
      description: '',
      category: 'other',
      location: {
        name: '',
        address: '',
        coordinates: [59.436962, 24.753574]
      },
      date: '',
      time: '',
      organizer: '',
      attendees: 0,
      maxAttendees: undefined
    })
    setEditingEvent(null)
    setActiveTab('events')
  }

  const handleDeleteEvent = (eventId: string) => {
    const password = prompt('Please enter the password to delete this event:')
    if (password === 'indrek') {
      if (window.confirm('Are you sure you want to delete this event?')) {
        deleteEvent(eventId)
      }
    } else if (password !== null) {
      alert('Incorrect password. Event deletion cancelled.')
    }
  }

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category)
    return categoryData?.icon || '📅'
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  // Get unique venues from existing events
  const getUniqueVenues = () => {
    const venues = new Map<string, { name: string, address: string, coordinates: [number, number] }>()
    events.forEach(event => {
      if (event.location.name.trim()) {
        venues.set(event.location.name.toLowerCase(), {
          name: event.location.name,
          address: event.location.address,
          coordinates: event.location.coordinates
        })
      }
    })
    return Array.from(venues.values())
  }

  // Filter venues based on input
  const getVenueSuggestions = (input: string) => {
    if (!input.trim()) return []
    const venues = getUniqueVenues()
    return venues.filter(venue => 
      venue.name.toLowerCase().includes(input.toLowerCase()) ||
      venue.address.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5) // Limit to 5 suggestions
  }

  const handleVenueSelect = (venue: { name: string, address: string, coordinates: [number, number] }) => {
    setFormData({
      ...formData,
      location: {
        name: venue.name,
        address: venue.address,
        coordinates: venue.coordinates
      }
    })
    setShowVenueSuggestions(false)
  }

  // Handle address search with Nominatim
  const handleAddressSearch = async (query: string) => {
    if (query.trim().length < 3) {
      setGeocodingResults([])
      return
    }

    setIsGeocoding(true)
    try {
      const results = await searchAddress(query)
      setGeocodingResults(results)
    } catch (error) {
      console.error('Error searching address:', error)
      setGeocodingResults([])
    } finally {
      setIsGeocoding(false)
    }
  }

  // Handle selecting a geocoding result
  const handleGeocodingSelect = (result: GeocodingSearchResult) => {
    setFormData({
      ...formData,
      location: {
        name: formatDisplayName(result.display_name),
        address: result.display_name,
        coordinates: [parseFloat(result.lat), parseFloat(result.lon)]
      }
    })
    setGeocodingResults([])
  }

  // Auto-geocode when address is entered
  const handleAddressInput = async (address: string) => {
    setFormData({
      ...formData,
      location: { ...formData.location, address }
    })
    
    // Search for coordinates if address is long enough
    if (address.trim().length >= 5) {
      const coords = await getCoordinates(address)
      if (coords) {
        setFormData(prev => ({
          ...prev,
          location: { ...prev.location, coordinates: coords }
        }))
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="ios-card-elevated w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="ios-nav-bar px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'add' && (
                <button
                  onClick={() => {
                    setActiveTab('events')
                    setEditingEvent(null)
                    setFormData({
                      id: '',
                      title: '',
                      description: '',
                      category: 'other',
                      location: {
                        name: '',
                        address: '',
                        coordinates: [59.436962, 24.753574]
                      },
                      date: '',
                      time: '',
                      organizer: '',
                      attendees: 0,
                      maxAttendees: undefined
                    })
                  }}
                  className="ios-floating-button touch-target"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
                             <h2 className="text-lg font-semibold text-gray-800">
                 {activeTab === 'events' ? 'Event Management' : (editingEvent ? 'Edit Event' : 'Add New Event')}
               </h2>
               
            </div>
            <button
              onClick={onClose}
              className="ios-floating-button touch-target"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'events' ? (
            <div className="h-full flex flex-col">
               

                {/* Search and Filter Bar */}
                <div className="flex-shrink-0 p-4 border-b border-gray-100">
                 <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                   <div className="flex-1 relative min-w-0">
                     <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                     <input
                       type="text"
                       placeholder="Search events by title, description, venue, or organizer..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                                       <button
                      onClick={() => {
                        const password = prompt('Please enter the password to access data import:')
                        if (password === 'indrek') {
                          setShowDataImporter(true)
                        } else if (password !== null) {
                          alert('Incorrect password. Data import access denied.')
                        }
                      }}
                      className="ios-floating-button touch-target flex-shrink-0"
                      title="Import events from CSV"
                    >
                      <Upload size={18} />
                    </button>
                                         <button
                       onClick={() => {
                         const password = prompt('Please enter the password to access geocoding tool:')
                         if (password === 'indrek') {
                           setShowGeocodingTool(true)
                         } else if (password !== null) {
                           alert('Incorrect password. Geocoding tool access denied.')
                         }
                       }}
                       className="ios-floating-button touch-target flex-shrink-0"
                       title="Geocode existing events"
                     >
                       <MapPin size={18} />
                     </button>
                                           <button
                        onClick={() => {
                          const password = prompt('Please enter the password to access CSV geocoding tool:')
                          if (password === 'indrek') {
                            setShowGeocodingCSVTool(true)
                          } else if (password !== null) {
                            alert('Incorrect password. CSV geocoding tool access denied.')
                          }
                        }}
                        className="ios-floating-button touch-target flex-shrink-0"
                        title="Download/Upload geocoded CSV"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const password = prompt('Please enter the password to access venue manager:')
                          if (password === 'indrek') {
                            setShowVenueManager(true)
                          } else if (password !== null) {
                            alert('Incorrect password. Venue manager access denied.')
                          }
                        }}
                        className="ios-floating-button touch-target flex-shrink-0"
                        title="Manage venue storage"
                      >
                        <Database size={18} />
                      </button>
                   <button
                     onClick={() => {
                       const password = prompt('Please enter the password to backup events:')
                       if (password === 'indrek') {
                         downloadCurrentEventsAsJSON(events)
                         alert('Events JSON file downloaded for sharing! Replace events-user.json with this file to share with all users.')
                       } else if (password !== null) {
                         alert('Incorrect password. Backup access denied.')
                       }
                     }}
                     className="ios-floating-button touch-target flex-shrink-0"
                     title="Download events for sharing"
                   >
                     <Download size={18} />
                   </button>
                   <button
                     onClick={() => {
                       const password = prompt('Please enter the password to clear all events:')
                       if (password === 'indrek') {
                         if (window.confirm('Are you sure you want to clear all events? This action cannot be undone.')) {
                           clearStoredEvents()
                           window.location.reload() // Reload to reset to original events
                         }
                       } else if (password !== null) {
                         alert('Incorrect password. Clear access denied.')
                       }
                     }}
                     className="ios-floating-button touch-target flex-shrink-0"
                     title="Clear all events"
                   >
                     <Trash2 size={18} />
                   </button>
                   <button
                     onClick={() => setActiveTab('add')}
                     className="ios-floating-button primary touch-target flex-shrink-0"
                   >
                     <Plus size={18} />
                   </button>
                 </div>
                 
                 {/* Category Filter */}
                 <div className="flex gap-2 overflow-x-auto pb-2">
                   {categories.map(category => (
                     <button
                       key={category.value}
                       onClick={() => setSelectedCategory(category.value)}
                       className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                         selectedCategory === category.value
                           ? 'bg-blue-500 text-white'
                           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                       }`}
                     >
                       <span>{category.icon}</span>
                       <span>{category.label}</span>
                     </button>
                   ))}
                 </div>
                 
                 {/* Filter Status */}
                 {(searchTerm || selectedCategory !== 'all') && (
                   <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Filter size={14} className="text-blue-600" />
                         <span className="text-xs font-medium text-blue-800">
                           Showing {filteredEvents.length} of {events.length} events
                         </span>
                       </div>
                       <button
                         onClick={() => {
                           setSearchTerm('')
                           setSelectedCategory('all')
                         }}
                         className="text-blue-600 hover:text-blue-800 touch-target"
                         title="Clear all filters"
                       >
                         <X size={14} />
                       </button>
                     </div>
                     <div className="flex flex-wrap gap-1 mt-1">
                       {searchTerm && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           Search: "{searchTerm}"
                         </span>
                       )}
                       {selectedCategory !== 'all' && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                           Category: {categories.find(c => c.value === selectedCategory)?.label}
                         </span>
                       )}
                     </div>
                   </div>
                 )}
               </div>
               
               

                             {/* Events List */}
               <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                 
                 {filteredEvents.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-gray-500">
                     <Calendar size={48} className="mb-4 opacity-50" />
                     <p className="text-lg font-medium mb-2">No events found</p>
                     <p className="text-sm text-center">
                       {searchTerm || selectedCategory !== 'all' 
                         ? 'Try adjusting your search or filters'
                         : 'Create your first event to get started'
                       }
                     </p>
                     {(searchTerm || selectedCategory !== 'all') && (
                       <button
                         onClick={() => {
                           setSearchTerm('')
                           setSelectedCategory('all')
                         }}
                         className="mt-4 ios-floating-button primary touch-target"
                       >
                         <X size={16} />
                         <span>Clear Filters</span>
                       </button>
                     )}
                   </div>
                 ) : (
                   <div className="p-4 space-y-3">
                     {/* Results Summary */}
                     <div className="text-xs text-gray-500 mb-2">
                       Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                       {searchTerm && ` matching "${searchTerm}"`}
                       {selectedCategory !== 'all' && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
                     </div>
                     
                     {filteredEvents.map(event => (
                       <div
                         key={event.id}
                         className="ios-card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => handleEditEvent(event)}
                       >
                         <div className="flex items-start justify-between mb-3">
                           <div className="flex items-center gap-3 flex-1 min-w-0">
                             <div className="text-2xl">{getCategoryIcon(event.category)}</div>
                             <div className="flex-1 min-w-0">
                               <h3 className="font-semibold text-gray-800 truncate">{event.title}</h3>
                               <p className="text-sm text-gray-600 truncate">{event.location.name}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-1">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 handleEditEvent(event)
                               }}
                               className="ios-floating-button touch-target"
                               title="Edit event"
                             >
                               <Edit size={16} />
                             </button>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 handleDeleteEvent(event.id)
                               }}
                               className="ios-floating-button touch-target text-red-500 hover:bg-red-50"
                               title="Delete event"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </div>
                         
                         <div className="space-y-2 text-sm text-gray-600">
                           <div className="flex items-center gap-2">
                             <Calendar size={14} />
                             <span>{formatDate(event.date)} at {event.time}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <User size={14} />
                             <span>{event.organizer}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <Users size={14} />
                             <span>{event.attendees}
                               {event.maxAttendees && ` / ${event.maxAttendees}`} attendees
                             </span>
                           </div>
                           {event.rating && (
                             <div className="flex items-center gap-2">
                               <Star size={14} className="text-yellow-500 fill-current" />
                               <span>{event.rating.average.toFixed(1)} ({event.rating.count} ratings)</span>
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          ) : (
            /* Add/Edit Event Form */
            <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your event"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.slice(1).map(category => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                                                   {/* Location Information */}
                                     <div className="relative">
                     <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name *</label>
                     <input
                       type="text"
                       value={formData.location.name}
                       onChange={(e) => {
                         setFormData({ 
                           ...formData, 
                           location: { ...formData.location, name: e.target.value }
                         })
                         setShowVenueSuggestions(e.target.value.trim().length > 0)
                       }}
                       onFocus={() => setShowVenueSuggestions(formData.location.name.trim().length > 0)}
                       onBlur={() => setTimeout(() => setShowVenueSuggestions(false), 200)}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Enter venue name"
                     />
                     
                     {/* Venue Suggestions */}
                     {showVenueSuggestions && (
                       <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                         {getVenueSuggestions(formData.location.name).map((venue, index) => (
                           <button
                             key={index}
                             type="button"
                             onClick={() => handleVenueSelect(venue)}
                             className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
                           >
                             <div className="font-medium text-gray-800">{venue.name}</div>
                             {venue.address && (
                               <div className="text-sm text-gray-600 truncate">{venue.address}</div>
                             )}
                           </button>
                         ))}
                         {getVenueSuggestions(formData.location.name).length === 0 && (
                           <div className="px-3 py-2 text-sm text-gray-500">
                             No matching venues found
                           </div>
                         )}
                       </div>
                     )}
                   </div>

                   <div className="relative">
                     <label className="block text-sm font-medium text-gray-700 mb-2">Address (with auto-geocoding)</label>
                     <div className="relative">
                       <input
                         type="text"
                         value={formData.location.address}
                         onChange={(e) => handleAddressInput(e.target.value)}
                         onFocus={() => handleAddressSearch(formData.location.address)}
                         className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter full address for automatic coordinate lookup"
                       />
                                               <MapPin size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                     </div>
                     
                     {/* Geocoding Results */}
                     {geocodingResults.length > 0 && (
                       <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                         {isGeocoding && (
                           <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                             Searching addresses...
                           </div>
                         )}
                         {geocodingResults.map((result, index) => (
                           <button
                             key={index}
                             type="button"
                             onClick={() => handleGeocodingSelect(result)}
                             className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
                           >
                             <div className="font-medium text-gray-800">{formatDisplayName(result.display_name)}</div>
                             <div className="text-xs text-gray-500">
                               {result.lat}, {result.lon} • {result.type}
                             </div>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>

                 

                 {/* Coordinates */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Coordinates</label>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Latitude</label>
                       <input
                         type="number"
                         step="any"
                         value={formData.location.coordinates[0]}
                         onChange={(e) => {
                           const lat = parseFloat(e.target.value)
                           if (!isNaN(lat)) {
                             setFormData({
                               ...formData,
                               location: {
                                 ...formData.location,
                                 coordinates: [lat, formData.location.coordinates[1]]
                               }
                             })
                           }
                         }}
                         className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="59.436962"
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Longitude</label>
                       <input
                         type="number"
                         step="any"
                         value={formData.location.coordinates[1]}
                         onChange={(e) => {
                           const lng = parseFloat(e.target.value)
                           if (!isNaN(lng)) {
                             setFormData({
                               ...formData,
                               location: {
                                 ...formData.location,
                                 coordinates: [formData.location.coordinates[0], lng]
                               }
                             })
                           }
                         }}
                         className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="24.753574"
                       />
                     </div>
                   </div>
                   <p className="text-xs text-gray-500 mt-1">
                     Current coordinates: {formData.location.coordinates[0].toFixed(6)}, {formData.location.coordinates[1].toFixed(6)}
                   </p>
                 </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Organizer and Attendees */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organizer *</label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter organizer name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Attendees</label>
                    <input
                      type="number"
                      value={formData.attendees}
                      onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Attendees (Optional)</label>
                    <input
                      type="number"
                      value={formData.maxAttendees || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        maxAttendees: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="No limit"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSaveEvent}
                    className="w-full ios-floating-button primary touch-target"
                  >
                    <Save size={18} />
                    <span>{editingEvent ? 'Update Event' : 'Create Event'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

             {/* Data Importer Modal */}
       {showDataImporter && (
         <DataImporter onClose={() => setShowDataImporter(false)} />
       )}

       {/* Geocoding Tool Modal */}
               {showGeocodingTool && (
          <GeocodingTool onClose={() => setShowGeocodingTool(false)} />
        )}
        {showGeocodingCSVTool && (
          <GeocodingCSVTool onClose={() => setShowGeocodingCSVTool(false)} />
        )}
        {showVenueManager && (
          <VenueManager onClose={() => setShowVenueManager(false)} />
        )}
     </div>
   )
 }

export default Settings
