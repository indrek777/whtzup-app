import React, { useState, useRef } from 'react'
import { Download, Upload, CheckCircle, AlertCircle, X, FileText, MapPin } from 'lucide-react'
import { useEvents } from '../context/EventContext'
import { 
  downloadEventsForGeocoding, 
  parseGeocodedCSV, 
  mergeGeocodedData 
} from '../utils/geocoding'

interface GeocodingCSVToolProps {
  onClose: () => void
}

const GeocodingCSVTool: React.FC<GeocodingCSVToolProps> = ({ onClose }) => {
  const { events, setEvents } = useEvents()
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    updatedCount?: number
    newEventsCount?: number
    errors?: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Count events that need geocoding
  const eventsNeedingGeocoding = events.filter(event => {
    try {
      const [lat, lng] = event.location.coordinates
      return (
        (lat === 59.436962 && lng === 24.753574) || // Default Tallinn coordinates
        isNaN(lat) || isNaN(lng) ||
        lat === 0 || lng === 0
      )
    } catch (error) {
      console.error('Error filtering event:', error, event)
      return false
    }
  })

  const handleDownload = () => {
    try {
      downloadEventsForGeocoding(events)
    } catch (error) {
      console.error('Error downloading events for geocoding:', error)
      alert('Error downloading events. Please try again.')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setUploadResult(null)

    try {
      const text = await file.text()
      const geocodedData = parseGeocodedCSV(text)
      
      if (geocodedData.length === 0) {
        setUploadResult({
          success: false,
          message: 'No valid geocoded data found in the CSV file.',
          errors: ['CSV file is empty or contains no valid coordinates']
        })
        return
      }

      const mergeResult = mergeGeocodedData(events, geocodedData)
      
      // Update the events in the context
      setEvents(mergeResult.events)
      
      setUploadResult({
        success: true,
        message: `Successfully processed ${geocodedData.length} events!`,
        updatedCount: mergeResult.updatedCount,
        newEventsCount: mergeResult.newEventsCount
      })

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process CSV file',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="ios-card-elevated w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="ios-nav-bar px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Geocoding CSV Tool</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">How to use this tool:</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <strong>Download CSV:</strong> Click "Download Events for Geocoding" to get a CSV file with events that need coordinates.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <strong>Add Coordinates:</strong> Open the CSV in Excel/Google Sheets and add <code>lat</code> and <code>lon</code> columns with proper Estonia coordinates.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <strong>Upload & Merge:</strong> Save the CSV and upload it back to update the events with new coordinates.
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-800">Current Status</h4>
                <p className="text-sm text-gray-600">
                  {eventsNeedingGeocoding.length} of {events.length} events need geocoding
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{eventsNeedingGeocoding.length}</div>
                <div className="text-xs text-gray-500">need coordinates</div>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Step 1: Download Events for Geocoding</h4>
            <button
              onClick={handleDownload}
              disabled={eventsNeedingGeocoding.length === 0}
              className="w-full ios-floating-button primary touch-target flex items-center justify-center gap-2"
            >
              <Download size={18} />
              <span>Download Events for Geocoding ({eventsNeedingGeocoding.length} events)</span>
            </button>
            {eventsNeedingGeocoding.length === 0 && (
              <p className="text-sm text-green-600 mt-2 text-center">
                ✅ All events already have proper coordinates!
              </p>
            )}
          </div>

          {/* Upload Section */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Step 2: Upload Geocoded CSV</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="w-full ios-floating-button touch-target flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              <span>{isProcessing ? 'Processing...' : 'Upload Geocoded CSV'}</span>
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Upload a CSV file with <code>lat</code> and <code>lon</code> columns
            </p>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-4 rounded-lg border ${
              uploadResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {uploadResult.success ? (
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-semibold ${
                    uploadResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                  </h4>
                  <p className={`text-sm ${
                    uploadResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.success && uploadResult.updatedCount !== undefined && (
                    <div className="mt-2 text-sm text-green-700">
                      <p>• Updated {uploadResult.updatedCount} existing events</p>
                      {uploadResult.newEventsCount !== undefined && uploadResult.newEventsCount > 0 && (
                        <p>• Added {uploadResult.newEventsCount} new events</p>
                      )}
                    </div>
                  )}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-red-700">Errors:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">CSV Format Requirements</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Required columns:</strong> <code>id</code>, <code>lat</code>, <code>lon</code></p>
              <p><strong>Optional columns:</strong> <code>title</code>, <code>description</code>, <code>category</code>, etc.</p>
              <p><strong>Coordinate validation:</strong> Must be within Estonia (57.5°N-59.7°N, 21.5°E-28.2°E)</p>
              <p><strong>File format:</strong> UTF-8 CSV with comma separators</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full ios-floating-button touch-target"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default GeocodingCSVTool
