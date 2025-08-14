import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents, Event } from '../context/EventContext'
import { X, MapPin, Clock, Users, Calendar } from 'lucide-react'
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
      music: 'bg-red-100 text-red-800',
      food: 'bg-orange-100 text-orange-800',
      sports: 'bg-green-100 text-green-800',
      art: 'bg-purple-100 text-purple-800',
      business: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[80vh] overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Events Nearby
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {events.length} events found
          </p>
        </div>
        
        {/* Events List */}
        <div className="overflow-y-auto max-h-[60vh] px-6 py-4">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No events found
              </h3>
              <p className="text-gray-500">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`event-card cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${
                    selectedEvent?.id === event.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(event.category)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800 line-clamp-2">
                          {event.title}
                        </h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
      
                    </div>
                  </div>
                  
                  {/* Event Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} />
                      <span className="line-clamp-1">{event.location.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{format(new Date(event.date), 'MMM dd')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{event.attendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
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
