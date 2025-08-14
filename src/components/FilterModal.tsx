import React, { useState, useEffect } from 'react'
import { X, Check, Search, Filter, MapPin, Calendar, Clock } from 'lucide-react'

interface FilterModalProps {
  onClose: () => void
  onApplyFilters: (filters: FilterOptions) => void
  totalEvents: number
  currentFilters: FilterOptions
}

interface FilterOptions {
  categories: string[]
  dateRange: string | null
  radius: number
  searchTerm: string
  sortBy: 'date' | 'distance' | 'name'
}

const FilterModal: React.FC<FilterModalProps> = ({ onClose, onApplyFilters, totalEvents, currentFilters }) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters)

  // Update internal state when currentFilters change (e.g., when cleared from status bar)
  useEffect(() => {
    setFilters(currentFilters)
  }, [currentFilters])

  const categories = [
    { id: 'music', name: 'Music', icon: '🎵', color: 'bg-red-50 border-red-200 text-red-800' },
    { id: 'food', name: 'Food & Drink', icon: '🍕', color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { id: 'sports', name: 'Sports', icon: '⚽', color: 'bg-green-50 border-green-200 text-green-800' },
    { id: 'art', name: 'Art & Culture', icon: '🎨', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { id: 'business', name: 'Business', icon: '💼', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'other', name: 'Other', icon: '📅', color: 'bg-gray-50 border-gray-200 text-gray-800' }
  ]

  const dateRanges = [
    { value: 'today', label: 'Today', icon: '📅' },
    { value: 'tomorrow', label: 'Tomorrow', icon: '📅' },
    { value: 'week', label: 'This Week', icon: '📅' },
    { value: 'month', label: 'This Month', icon: '📅' },
    { value: 'next3months', label: 'Next 3 Months', icon: '📅' },
    { value: 'next6months', label: 'Next 6 Months', icon: '📅' },
    { value: 'all', label: 'All Events', icon: '📅' }
  ]

  const sortOptions = [
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'distance', label: 'Distance', icon: MapPin },
    { value: 'name', label: 'Name', icon: Search }
  ]

  const handleCategoryToggle = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }))
  }

  const handleDateRangeChange = (value: string | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: value
    }))
  }

  const handleRadiusChange = (value: number) => {
    setFilters(prev => ({
      ...prev,
      radius: value
    }))
  }

  const handleApply = () => {
    onApplyFilters(filters)
  }

  const handleReset = () => {
    const resetFilters = {
      categories: [],
      dateRange: null,
      radius: 10,
      searchTerm: '',
      sortBy: 'date' as const
    }
    setFilters(resetFilters)
    // Also apply the reset immediately
    onApplyFilters(resetFilters)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* iOS-style Modal */}
      <div className="relative w-full ios-bottom-sheet animate-slide-up max-h-[90vh] overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">
                Filters
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">
                  {totalEvents} total events available
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-blue-600">
                  Customize your search
                </span>
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
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh] px-6 py-4 space-y-6">
          {/* Show All Events Button */}
          <div>
            <button
              onClick={() => {
                setFilters({
                  categories: [],
                  dateRange: 'all',
                  radius: 999,
                  searchTerm: '',
                  sortBy: 'date'
                })
              }}
              className="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              <div className="flex items-center justify-center gap-2">
                <Filter size={20} />
                <span>Show All Events</span>
              </div>
            </button>
          </div>

          {/* Search */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              Search Events
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by event name, venue, or description..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full p-4 pl-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
              />
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={20} className="text-gray-400" />
              Sort By
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {sortOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, sortBy: option.value as any }))}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all touch-target ${
                      filters.sortBy === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent size={20} className="text-gray-400" />
                      <span className="font-medium text-gray-800">{option.label}</span>
                    </div>
                    {filters.sortBy === option.value && (
                      <Check size={20} className="text-blue-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              Categories
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all touch-target ${
                    filters.categories.includes(category.id)
                      ? `border-blue-500 bg-blue-50`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-2xl">{category.icon}</span>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-gray-800 block">{category.name}</span>
                    {filters.categories.includes(category.id) && (
                      <span className="text-xs text-blue-600">Selected</span>
                    )}
                  </div>
                  {filters.categories.includes(category.id) && (
                    <Check size={20} className="text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Calendar size={20} className="text-gray-400" />
              Date Range
            </h3>
            <div className="space-y-2">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value === filters.dateRange ? null : range.value)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all touch-target ${
                    filters.dateRange === range.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{range.icon}</span>
                    <span className="font-medium text-gray-800">{range.label}</span>
                  </div>
                  {filters.dateRange === range.value && (
                    <Check size={20} className="text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={20} className="text-gray-400" />
              Search Radius: {filters.radius === 999 ? 'No Limit' : `${filters.radius} km`}
            </h3>
            <div className="mb-4">
              <button
                onClick={() => handleRadiusChange(999)}
                className={`w-full py-4 px-4 rounded-2xl border-2 transition-all touch-target ${
                  filters.radius === 999
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">No Distance Limit</span>
                  {filters.radius === 999 && (
                    <Check size={20} className="text-blue-500" />
                  )}
                </div>
              </button>
            </div>
            <div className="px-2">
              <input
                type="range"
                min="1"
                max="100"
                value={filters.radius === 999 ? 100 : filters.radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>1 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200/50 safe-area-bottom">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-4 px-4 border border-gray-300 rounded-2xl font-medium text-gray-700 hover:bg-gray-50 transition-all touch-target"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-4 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg touch-target"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterModal
