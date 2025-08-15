import React, { useState, useEffect } from 'react'
import { MapPin, CheckCircle, AlertCircle, X, RefreshCw, Info, Download } from 'lucide-react'
import { useEvents, Event } from '../context/EventContext'
import { getCoordinates, formatDisplayName } from '../utils/geocoding'

interface GeocodingToolProps {
  onClose: () => void
}

interface GeocodingResult {
  event: Event
  success: boolean
  newCoordinates?: [number, number]
  error?: string
}

const GeocodingTool: React.FC<GeocodingToolProps> = ({ onClose }) => {
  const { events, updateEvent } = useEvents()
  const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [showResults, setShowResults] = useState(false)

  // Events that need geocoding (have default coordinates or no coordinates)
  const eventsNeedingGeocoding = events.filter(event => {
    const [lat, lng] = event.location.coordinates
    // Check if coordinates are default Tallinn coordinates or invalid
    return (
      (lat === 59.436962 && lng === 24.753574) ||
      isNaN(lat) || isNaN(lng) ||
      lat === 0 || lng === 0
    )
  })

  useEffect(() => {
    setTotalCount(eventsNeedingGeocoding.length)
  }, [eventsNeedingGeocoding])

  // Function to geocode a single event
  const geocodeEvent = async (event: Event): Promise<GeocodingResult> => {
    try {
      // Try venue name first, then address
      const searchTerms = [
        event.location.name,
        event.location.address,
        `${event.location.name} ${event.location.address}`.trim()
      ].filter(term => term && term.trim())

      for (const searchTerm of searchTerms) {
        if (searchTerm.trim()) {
          const coordinates = await getCoordinates(searchTerm)
          if (coordinates) {
            return {
              event,
              success: true,
              newCoordinates: coordinates
            }
          }
        }
      }

      return {
        event,
        success: false,
        error: 'No coordinates found for this location'
      }
    } catch (error) {
      return {
        event,
        success: false,
        error: error instanceof Error ? error.message : 'Geocoding failed'
      }
    }
  }

  // Function to process all events
  const processAllEvents = async () => {
    setIsProcessing(true)
    setProcessedCount(0)
    setGeocodingResults([])
    setShowResults(false)

    const results: GeocodingResult[] = []

    for (let i = 0; i < eventsNeedingGeocoding.length; i++) {
      const event = eventsNeedingGeocoding[i]
      const result = await geocodeEvent(event)
      results.push(result)
      setProcessedCount(i + 1)

      // Small delay to avoid overwhelming the Nominatim server
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setGeocodingResults(results)
    setShowResults(true)
    setIsProcessing(false)
  }

  // Function to apply geocoding results
  const applyGeocodingResults = () => {
    const successfulResults = geocodingResults.filter(result => result.success)
    
    successfulResults.forEach(result => {
      if (result.newCoordinates) {
        const updatedEvent = {
          ...result.event,
          location: {
            ...result.event.location,
            coordinates: result.newCoordinates
          }
        }
        updateEvent(result.event.id, updatedEvent)
      }
    })

    alert(`Successfully updated ${successfulResults.length} events with new coordinates!`)
    onClose()
  }

  // Function to download geocoding report
  const downloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      totalEvents: totalCount,
      successfulGeocoding: geocodingResults.filter(r => r.success).length,
      failedGeocoding: geocodingResults.filter(r => !r.success).length,
      results: geocodingResults.map(result => ({
        eventTitle: result.event.title,
        originalLocation: result.event.location.name,
        originalCoordinates: result.event.location.coordinates,
        newCoordinates: result.newCoordinates,
        success: result.success,
        error: result.error
      }))
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `geocoding-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="ios-card-elevated w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Geocode Existing Events</h2>
            <button
              onClick={onClose}
              className="ios-floating-button touch-target"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!showResults ? (
            /* Initial View */
            <div className="space-y-6">
              {/* Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <h3 className="font-semibold mb-2">Geocoding Tool Information</h3>
                    <p className="mb-2">This tool will find coordinates for events that currently have default or missing coordinates.</p>
                    <p className="mb-2">It uses your local Nominatim server to search for locations based on venue names and addresses.</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Events with default Tallinn coordinates (59.436962, 24.753574) will be processed</li>
                      <li>Events with invalid coordinates (0,0) will be processed</li>
                      <li>Each event will be searched using venue name and address</li>
                      <li>Results will be shown before applying changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-800">{totalCount}</div>
                  <div className="text-sm text-gray-600">Events Need Geocoding</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-800">{events.length - totalCount}</div>
                  <div className="text-sm text-gray-600">Events Already Geocoded</div>
                </div>
              </div>

              {/* Events List */}
              {totalCount > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Events That Need Geocoding ({totalCount})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {eventsNeedingGeocoding.map((event, index) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{event.title}</h4>
                            <p className="text-sm text-gray-600">{event.location.name}</p>
                            <p className="text-xs text-gray-500">
                              Current: {event.location.coordinates[0].toFixed(6)}, {event.location.coordinates[1].toFixed(6)}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            Needs geocoding
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="flex-1 ios-floating-button"
                >
                  Cancel
                </button>
                <button
                  onClick={processAllEvents}
                  disabled={isProcessing || totalCount === 0}
                  className="flex-1 ios-floating-button primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Processing... ({processedCount}/{totalCount})
                    </>
                  ) : (
                    <>
                      <MapPin size={16} />
                      Start Geocoding ({totalCount} events)
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Geocoding Results</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{totalCount}</div>
                    <div className="text-sm text-gray-600">Total Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {geocodingResults.filter(r => r.success).length}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {geocodingResults.filter(r => !r.success).length}
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Detailed Results</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {geocodingResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{result.event.title}</h4>
                          <p className="text-sm text-gray-600">{result.event.location.name}</p>
                          <p className="text-xs text-gray-500">
                            From: {result.event.location.coordinates[0].toFixed(6)}, {result.event.location.coordinates[1].toFixed(6)}
                          </p>
                          {result.success && result.newCoordinates && (
                            <p className="text-xs text-green-600">
                              To: {result.newCoordinates[0].toFixed(6)}, {result.newCoordinates[1].toFixed(6)}
                            </p>
                          )}
                          {!result.success && result.error && (
                            <p className="text-xs text-red-600">Error: {result.error}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <AlertCircle size={16} className="text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowResults(false)}
                  className="flex-1 ios-floating-button"
                >
                  Back
                </button>
                <button
                  onClick={downloadReport}
                  className="flex-1 ios-floating-button"
                >
                  <Download size={16} />
                  Download Report
                </button>
                <button
                  onClick={applyGeocodingResults}
                  disabled={geocodingResults.filter(r => r.success).length === 0}
                  className="flex-1 ios-floating-button primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={16} />
                  Apply Changes ({geocodingResults.filter(r => r.success).length} events)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GeocodingTool
