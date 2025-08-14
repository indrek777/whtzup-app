import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvents } from '../context/EventContext'
import { ArrowLeft, MapPin, Clock, Users, Calendar, Share2, Heart, Phone, Globe } from 'lucide-react'
import { format } from 'date-fns'

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, selectedEvent } = useEvents()
  
  const event = selectedEvent || events.find(e => e.id === id)
  
  if (!event) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Event not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-primary-500 hover:text-primary-600"
          >
            Go back to map
          </button>
        </div>
      </div>
    )
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
    <div className="h-screen bg-white overflow-y-auto">
      {/* Header */}
      <div className="relative">
        {/* Background Image or Placeholder */}
        <div className="h-64 bg-gradient-to-br from-primary-500 to-primary-600 relative">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-0 left-0 right-0 p-4 safe-area-top">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex gap-2">
                <button className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                  <Heart size={20} />
                </button>
                <button className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Event Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{getCategoryIcon(event.category)}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(event.category)}`}>
                {event.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{event.title}</h1>
            <p className="text-white/90 text-sm">{event.organizer}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Price and Attendees */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
    
            <p className="text-sm text-gray-500">Entry fee</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-800">
              {event.attendees}{event.maxAttendees ? `/${event.maxAttendees}` : ''}
            </p>
            <p className="text-sm text-gray-500">Attendees</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">About this event</h3>
          <p className="text-gray-600 leading-relaxed">{event.description}</p>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Event Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="text-primary-500" size={20} />
              <div>
                <p className="font-medium text-gray-800">
                  {(() => {
                    try {
                      const date = new Date(event.date)
                      if (isNaN(date.getTime())) {
                        return 'Date TBD'
                      }
                      return format(date, 'EEEE, MMMM dd, yyyy')
                    } catch (error) {
                      console.warn('Error formatting date:', event.date, error)
                      return 'Date TBD'
                    }
                  })()}
                </p>
                <p className="text-sm text-gray-500">Date</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Clock className="text-primary-500" size={20} />
              <div>
                <p className="font-medium text-gray-800">{event.time}</p>
                <p className="text-sm text-gray-500">Time</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin className="text-primary-500" size={20} />
              <div>
                <p className="font-medium text-gray-800">{event.location.name}</p>
                <p className="text-sm text-gray-500">{event.location.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Users className="text-primary-500" size={20} />
              <div>
                <p className="font-medium text-gray-800">{event.organizer}</p>
                <p className="text-sm text-gray-500">Organizer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <button className="w-full py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors">
            Get Tickets
          </button>
          
          <div className="flex gap-3">
            <button className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Phone size={16} />
              Contact
            </button>
            <button className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Globe size={16} />
              Website
            </button>
          </div>
        </div>

        {/* Map Preview */}
        <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Map preview</p>
            <button 
              onClick={() => navigate('/')}
              className="text-primary-500 hover:text-primary-600 text-sm mt-1"
            >
              View on map
            </button>
          </div>
        </div>
      </div>

      {/* Safe Area Bottom */}
      <div className="safe-area-bottom" />
    </div>
  )
}

export default EventDetail
