import React, { useState, useRef } from 'react'
import { 
  Download, Upload, CheckCircle, AlertCircle, X, MapPin, 
  Database, TrendingUp, Clock, Search, Filter, Trash2 
} from 'lucide-react'
import { 
  getAllVenues, 
  getVenuesNeedingGeocoding, 
  getVenueStats,
  exportVenuesCSV,
  importVenuesCSV,
  cleanupOldVenues,
  updateVenueCoordinates,
  VenueData
} from '../utils/venueStorage'

interface VenueManagerProps {
  onClose: () => void
}

const VenueManager: React.FC<VenueManagerProps> = ({ onClose }) => {
  const [venues, setVenues] = useState<VenueData[]>(getAllVenues())
  const [venuesNeedingGeocoding, setVenuesNeedingGeocoding] = useState<VenueData[]>(getVenuesNeedingGeocoding())
  const [stats, setStats] = useState(getVenueStats())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'with-coordinates' | 'needs-geocoding'>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    successCount?: number
    errors?: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshData = () => {
    setVenues(getAllVenues())
    setVenuesNeedingGeocoding(getVenuesNeedingGeocoding())
    setStats(getVenueStats())
  }

  const handleExport = () => {
    const csvContent = exportVenuesCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `venues-backup-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    alert(`Exported ${venues.length} venues to CSV file.`)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setUploadResult(null)

    try {
      const text = await file.text()
      const result = importVenuesCSV(text)
      
      if (result.success > 0) {
        setUploadResult({
          success: true,
          message: `Successfully imported ${result.success} venues!`,
          successCount: result.success,
          errors: result.errors.length > 0 ? result.errors : undefined
        })
        refreshData()
      } else {
        setUploadResult({
          success: false,
          message: 'No venues were imported.',
          errors: result.errors
        })
      }

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

  const handleCleanup = () => {
    if (window.confirm('This will remove old venues that haven\'t been used recently. Continue?')) {
      const removedCount = cleanupOldVenues()
      refreshData()
      alert(`Cleaned up ${removedCount} old venues.`)
    }
  }

  const handleUpdateCoordinates = (venueName: string, coordinates: [number, number]) => {
    if (updateVenueCoordinates(venueName, coordinates)) {
      refreshData()
      alert(`Updated coordinates for "${venueName}"`)
    } else {
      alert('Failed to update coordinates. Please check the values.')
    }
  }

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.address.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'with-coordinates' && !isDefaultCoordinates(venue.coordinates)) ||
                         (filterType === 'needs-geocoding' && isDefaultCoordinates(venue.coordinates))
    
    return matchesSearch && matchesFilter
  })

  const isDefaultCoordinates = (coordinates: [number, number]): boolean => {
    const [lat, lng] = coordinates
    return (
      (lat === 59.436962 && lng === 24.753574) || // Default Tallinn coordinates
      isNaN(lat) || isNaN(lng) ||
      lat === 0 || lng === 0
    )
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="ios-card-elevated w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="ios-nav-bar px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Venue Manager</h2>
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
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Venues</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stats.totalVenues}</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">With Coordinates</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.venuesWithCoordinates}</div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Need Geocoding</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{stats.venuesNeedingGeocoding}</div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Most Used</span>
              </div>
              <div className="text-sm font-bold text-purple-600 mt-1 truncate">
                {stats.mostUsedVenue ? stats.mostUsedVenue.name : 'None'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={handleExport}
              className="ios-floating-button touch-target flex-shrink-0"
              title="Export venues to CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            
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
              className="ios-floating-button touch-target flex-shrink-0"
              title="Import venues from CSV"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">{isProcessing ? 'Processing...' : 'Import'}</span>
            </button>
            
            <button
              onClick={handleCleanup}
              className="ios-floating-button touch-target flex-shrink-0"
              title="Clean up old venues"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Cleanup</span>
            </button>
            
            <button
              onClick={refreshData}
              className="ios-floating-button touch-target flex-shrink-0"
              title="Refresh data"
            >
              <span className="text-lg">🔄</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-4 rounded-lg border mb-6 ${
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
                    {uploadResult.success ? 'Import Successful!' : 'Import Failed'}
                  </h4>
                  <p className={`text-sm ${
                    uploadResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.successCount !== undefined && (
                    <p className="text-sm text-green-700 mt-1">
                      • Imported {uploadResult.successCount} venues
                    </p>
                  )}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-red-700">Errors:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {uploadResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {uploadResult.errors.length > 5 && (
                          <li>... and {uploadResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="mb-6">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search venues by name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Venues', icon: '📋' },
                { value: 'with-coordinates', label: 'With Coordinates', icon: '✅' },
                { value: 'needs-geocoding', label: 'Need Geocoding', icon: '📍' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value as any)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                    filterType === filter.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Venues List */}
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              Showing {filteredVenues.length} of {venues.length} venues
            </div>
            
            {filteredVenues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database size={48} className="mx-auto mb-4 opacity-50" />
                <p>No venues found matching your criteria</p>
              </div>
            ) : (
              filteredVenues.map(venue => (
                <div
                  key={venue.name}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{venue.name}</h3>
                      {venue.address && (
                        <p className="text-sm text-gray-600 truncate">{venue.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isDefaultCoordinates(venue.coordinates)
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isDefaultCoordinates(venue.coordinates) ? 'Needs Geocoding' : 'Has Coordinates'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>
                        {venue.coordinates[0].toFixed(6)}, {venue.coordinates[1].toFixed(6)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} />
                      <span>Used {venue.usageCount} times</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Last: {formatDate(venue.lastUsed)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
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

export default VenueManager
