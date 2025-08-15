import React, { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Info } from 'lucide-react'
import { useEvents } from '../context/EventContext'
import { Event } from '../context/EventContext'
import { getCoordinates } from '../utils/geocoding'

interface DataImporterProps {
  onClose: () => void
}

interface ImportedEvent {
  date: string
  startTime: string
  endTime: string
  title: string
  location: {
    name: string
    address: string
    coordinates: [number, number] | null
  }
  category: string
  description: string
  organizer: string
  attendees: number
  maxAttendees?: number
}

const DataImporter: React.FC<DataImporterProps> = ({ onClose }) => {
  const { addEvent } = useEvents()
  const [isDragging, setIsDragging] = useState(false)
  const [importedEvents, setImportedEvents] = useState<ImportedEvent[]>([])
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({
    'kontsert': 'music',
    'näitus': 'art',
    'teater': 'art',
    'spordi': 'sports',
    'toit': 'food',
    'festival': 'other',
    'konverents': 'business',
    'töötuba': 'other',
    'tuur': 'other',
    'pidu': 'other'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Function to detect category based on event title and description
  const detectCategory = (title: string, description: string = ''): Event['category'] => {
    const text = (title + ' ' + description).toLowerCase()
    
    for (const [keyword, category] of Object.entries(categoryMapping)) {
      if (text.includes(keyword)) {
        return category as Event['category']
      }
    }
    
    return 'other'
  }

  // Function to parse CSV content
  const parseCSV = (content: string): ImportedEvent[] => {
    const lines = content.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    
    // Expected headers: Kuupäev,Algusaeg,Lõpuaeg,Üritus,Asukoht,Laiuskraad,Pikkuskraad
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('kuupäev') || h.toLowerCase().includes('date'))
    const startTimeIndex = headers.findIndex(h => h.toLowerCase().includes('algusaeg') || h.toLowerCase().includes('start'))
    const endTimeIndex = headers.findIndex(h => h.toLowerCase().includes('lõpuaeg') || h.toLowerCase().includes('end'))
    const titleIndex = headers.findIndex(h => h.toLowerCase().includes('üritus') || h.toLowerCase().includes('event') || h.toLowerCase().includes('title'))
    const locationIndex = headers.findIndex(h => h.toLowerCase().includes('asukoht') || h.toLowerCase().includes('location'))
    const latIndex = headers.findIndex(h => h.toLowerCase().includes('laiuskraad') || h.toLowerCase().includes('latitude'))
    const lngIndex = headers.findIndex(h => h.toLowerCase().includes('pikkuskraad') || h.toLowerCase().includes('longitude'))

    if (dateIndex === -1 || titleIndex === -1) {
      throw new Error('Required columns (date and title) not found in CSV')
    }

    const events: ImportedEvent[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = parseCSVLine(line)
      
      if (values.length < Math.max(dateIndex, titleIndex) + 1) continue
      
      const date = values[dateIndex]?.trim() || ''
      const startTime = startTimeIndex >= 0 ? values[startTimeIndex]?.trim() || '' : ''
      const endTime = endTimeIndex >= 0 ? values[endTimeIndex]?.trim() || '' : ''
      const title = values[titleIndex]?.trim() || ''
      const locationName = locationIndex >= 0 ? values[locationIndex]?.trim() || '' : ''
      const lat = latIndex >= 0 ? parseFloat(values[latIndex]?.trim() || '') : null
      const lng = lngIndex >= 0 ? parseFloat(values[lngIndex]?.trim() || '') : null
      
      if (!date || !title) continue
      
      const coordinates: [number, number] | null = 
        lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null
      
      events.push({
        date,
        startTime,
        endTime,
        title,
        location: {
          name: locationName,
          address: locationName,
          coordinates: coordinates || [59.436962, 24.753574] // Default to Tallinn coordinates if null
        },
        category: detectCategory(title, locationName),
        description: `${locationName ? `Location: ${locationName}` : ''}`.trim(),
        organizer: 'Imported Event',
        attendees: 0
      })
    }
    
    return events
  }

  // Function to parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  }

  // Function to handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please select a CSV file')
      setImportStatus('error')
      return
    }

    setImportStatus('processing')
    setErrorMessage('')

    try {
      const content = await file.text()
      const events = parseCSV(content)
      
      if (events.length === 0) {
        throw new Error('No valid events found in CSV file')
      }
      
      setImportedEvents(events)
      setImportStatus('success')
      setPreviewMode(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV file')
      setImportStatus('error')
    }
  }

  // Function to handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

     // Function to import events to the app
   const importEvents = async () => {
     setImportStatus('processing')
     
     try {
       // Process events with geocoding for missing coordinates
       for (const event of importedEvents) {
         let coordinates = event.location.coordinates
         
         // If no coordinates and we have a location name, try to geocode it
         if (!coordinates && event.location.name.trim()) {
           try {
             const geocodedCoords = await getCoordinates(event.location.name)
             if (geocodedCoords) {
               coordinates = geocodedCoords
             }
           } catch (error) {
             console.warn('Failed to geocode location:', event.location.name, error)
           }
         }
         
         const newEvent: Event = {
           id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
           title: event.title,
           description: event.description,
           category: event.category as Event['category'],
           location: {
             name: event.location.name,
             address: event.location.address,
             coordinates: coordinates || [59.436962, 24.753574]
           },
           date: event.date,
           time: event.startTime,
           organizer: event.organizer,
           attendees: event.attendees,
           maxAttendees: event.maxAttendees,
           userRating: 0,
           rating: undefined
         }
         
         addEvent(newEvent)
       }
       
       setImportStatus('success')
       setTimeout(() => {
         onClose()
       }, 3000)
     } catch (error) {
       console.error('Error importing events:', error)
       setImportStatus('error')
       setErrorMessage('Failed to import events. Please try again.')
     }
   }

  // Function to update category mapping
  const updateCategoryMapping = (keyword: string, category: string) => {
    setCategoryMapping(prev => ({
      ...prev,
      [keyword]: category
    }))
  }

  // Function to download sample CSV
  const downloadSampleCSV = () => {
    const sampleData = `Kuupäev,Algusaeg,Lõpuaeg,Üritus,Asukoht,Laiuskraad,Pikkuskraad
12 July 2025,19:00,,Kontsert Kuressaares,Kuressaare Teater,58.2542245,22.489828
15 August 2025,18:00,,Näitus Saaremaal,Saaremaa Kunstistuudio,58.2519266,22.487101
20 August 2025,20:00,,Spordiüritus,Spordikeskus,58.2528145,22.4855218`
    
    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-events.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="ios-card-elevated w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Import Events from CSV</h2>
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
          {!previewMode ? (
            /* Upload Section */
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                                         <h3 className="font-semibold mb-2">CSV Import Information</h3>
                     <p className="mb-2 text-green-700 font-medium">✅ Imported events will be automatically shared with all users on the same server.</p>
                     <p className="mb-2 text-blue-700 font-medium">🚀 No manual file replacement needed - all users will see the new events immediately!</p>
                    <p className="mb-2">Your CSV file should include these columns:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>Kuupäev</strong> (Date) - Required</li>
                      <li><strong>Algusaeg</strong> (Start Time) - Optional</li>
                      <li><strong>Lõpuaeg</strong> (End Time) - Optional</li>
                      <li><strong>Üritus</strong> (Event Title) - Required</li>
                      <li><strong>Asukoht</strong> (Location) - Optional</li>
                      <li><strong>Laiuskraad</strong> (Latitude) - Optional</li>
                      <li><strong>Pikkuskraad</strong> (Longitude) - Optional</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sample Download */}
              <div className="text-center">
                <button
                  onClick={downloadSampleCSV}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Download size={16} />
                  Download Sample CSV
                </button>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  <Upload size={48} className="mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drop your CSV file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      or click to browse files
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="ios-floating-button primary"
                    >
                      <FileText size={16} />
                      Choose CSV File
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {importStatus === 'processing' && (
                <div className="flex items-center gap-3 text-blue-600">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing CSV file...</span>
                </div>
              )}

              {importStatus === 'error' && (
                <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={20} />
                  <span>{errorMessage}</span>
                </div>
              )}

                             {importStatus === 'success' && (
                 <div className="flex items-center gap-3 text-green-600 bg-green-50 p-3 rounded-lg">
                   <CheckCircle size={20} />
                   <div>
                     <span className="font-medium">Import successful!</span>
                     <p className="text-sm text-green-700 mt-1">Events have been added and automatically shared with all users on the server.</p>
                     <p className="text-xs text-blue-600 mt-1">🚀 All users will see the new events immediately - no manual steps required!</p>
                   </div>
                 </div>
               )}
            </div>
          ) : (
            /* Preview Section */
            <div className="space-y-6">
              {/* Category Mapping */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Category Mapping</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure how keywords in event titles should be categorized:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(categoryMapping).map(([keyword, category]) => (
                    <div key={keyword} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 min-w-[60px]">
                        {keyword}:
                      </span>
                      <select
                        value={category}
                        onChange={(e) => updateCategoryMapping(keyword, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="music">Music</option>
                        <option value="food">Food & Drink</option>
                        <option value="sports">Sports</option>
                        <option value="art">Art & Culture</option>
                        <option value="business">Business</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events Preview */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  Preview ({importedEvents.length} events)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {importedEvents.map((event, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{event.title}</h4>
                          <p className="text-sm text-gray-600">{event.date} {event.startTime && `at ${event.startTime}`}</p>
                          {event.location.name && (
                            <p className="text-sm text-gray-500">{event.location.name}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.category === 'music' ? 'bg-red-100 text-red-700' :
                          event.category === 'food' ? 'bg-orange-100 text-orange-700' :
                          event.category === 'sports' ? 'bg-green-100 text-green-700' :
                          event.category === 'art' ? 'bg-purple-100 text-purple-700' :
                          event.category === 'business' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setPreviewMode(false)}
                  className="flex-1 ios-floating-button"
                >
                  Back to Upload
                </button>
                                 <button
                   onClick={importEvents}
                   disabled={importStatus === 'processing'}
                   className="flex-1 ios-floating-button primary disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {importStatus === 'processing' ? (
                     <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       Importing...
                     </>
                   ) : (
                     <>
                       <CheckCircle size={16} />
                       Import {importedEvents.length} Events
                     </>
                   )}
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataImporter
