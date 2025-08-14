import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents, Event } from '../context/EventContext'
import { X, MapPin, Clock, Users, Calendar, Filter, Search } from 'lucide-react'
import { format } from 'date-fns'

interface EventListProps {
  events: Event[]
  onClose: () => void
  selectedEvent: Event | null
}

const EventList: React.FC<EventListProps> = ({ events, onClose, selectedEvent }) => {
  const navigate = useNavigate()
  const { setSelectedEvent } = useEvents()

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    navigate(`/event/${event.id}`)
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      music: '🎵',
      food: '🍕',
      sports: '⚽',
      art: '🎨',
      business: '💼',
      other: '📅'
    }
    return icons[category as keyof typeof icons] || '📅'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      music: 'bg-red-100 text-red-800 border-red-200',
      food: 'bg-orange-100 text-orange-800 border-orange-200',
      sports: 'bg-green-100 text-green-800 border-green-200',
      art: 'bg-purple-100 text-purple-800 border-purple-200',
      business: 'bg-blue-100 text-blue-800 border-blue-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryBorderColor = (category: string) => {
    const colors = {
      music: 'border-l-red-500',
      food: 'border-l-orange-500',
      sports: 'border-l-green-500',
      art: 'border-l-purple-500',
      business: 'border-l-blue-500',
      other: 'border-l-gray-500'
    }
    return colors[category as keyof typeof colors] || 'border-l-gray-500'
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* iOS-style Bottom Sheet */}
      <div className="relative w-full ios-bottom-sheet animate-slide-up max-h-[85vh] overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">
                Events Nearby
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">
                  {events.length} events found
                </span>
                {events.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-blue-600">
                      Tap to view details
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ios-floating-button touch-target ml-4"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Events List */}
        <div className="overflow-y-auto max-h-[65vh] px-6 py-4">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No events found
              </h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your filters or check back later
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Filter size={16} />
                <span>Use filters to find events</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`ios-card cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border-l-4 ${getCategoryBorderColor(event.category)} ${
                    selectedEvent?.id === event.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  }`}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{getCategoryIcon(event.category)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 line-clamp-2 leading-tight">
                          {event.title}
                        </h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(event.category)} mt-1`}>
                          {event.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Event Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} className="flex-shrink-0 text-gray-400" />
                      <span className="line-clamp-1">{event.location.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} className="text-gray-400" />
                        <span>
                          {(() => {
                            try {
                              const date = new Date(event.date)
                              if (isNaN(date.getTime())) {
                                return 'Date TBD'
                              }
                              return format(date, 'MMM dd')
                            } catch (error) {
                              console.warn('Error formatting date:', event.date, error)
                              return 'Date TBD'
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} className="text-gray-400" />
                        <span>{event.time || 'Time TBD'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={16} className="text-gray-400" />
                        <span>{event.attendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Safe Area Bottom */}
        <div className="safe-area-bottom" />
      </div>
    </div>
  )
}

export default EventList
