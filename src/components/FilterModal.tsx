import React, { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'

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
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'food', name: 'Food & Drink', icon: '🍕' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'art', name: 'Art & Culture', icon: '🎨' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'other', name: 'Other', icon: '📅' }
  ]



  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'next3months', label: 'Next 3 Months' },
    { value: 'next6months', label: 'Next 6 Months' },
    { value: 'all', label: 'All Events' }
  ]

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'distance', label: 'Distance' },
    { value: 'name', label: 'Name' }
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
                         <h2 className="text-xl font-semibold text-gray-800">
               Filters
             </h2>
             <div className="text-sm text-gray-500">
               {totalEvents} total events available
             </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
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
               className="w-full py-3 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
             >
               Show All Events
             </button>
           </div>

           {/* Search */}
           <div>
             <h3 className="text-lg font-medium text-gray-800 mb-3">Search Events</h3>
            <input
              type="text"
              placeholder="Search by event name, venue, or description..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Sort By */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Sort By</h3>
            <div className="grid grid-cols-2 gap-3">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: option.value as any }))}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    filters.sortBy === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-800">{option.label}</span>
                  {filters.sortBy === option.value && (
                    <Check size={16} className="text-primary-500 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Categories</h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    filters.categories.includes(category.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium text-gray-800">{category.name}</span>
                  {filters.categories.includes(category.id) && (
                    <Check size={16} className="text-primary-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>



          {/* Date Range */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Date Range</h3>
            <div className="space-y-2">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value === filters.dateRange ? null : range.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    filters.dateRange === range.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-800">{range.label}</span>
                  {filters.dateRange === range.value && (
                    <Check size={16} className="text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

                     {/* Radius */}
           <div>
             <h3 className="text-lg font-medium text-gray-800 mb-3">
               Search Radius: {filters.radius === 999 ? 'No Limit' : `${filters.radius} km`}
             </h3>
             <div className="mb-3">
               <button
                 onClick={() => handleRadiusChange(999)}
                 className={`w-full py-2 px-3 rounded-lg border-2 transition-all ${
                   filters.radius === 999
                     ? 'border-primary-500 bg-primary-50'
                     : 'border-gray-200 hover:border-gray-300'
                 }`}
               >
                 <span className="font-medium text-gray-800">No Distance Limit</span>
                 {filters.radius === 999 && (
                   <Check size={16} className="text-primary-500 ml-2 inline" />
                 )}
               </button>
             </div>
                         <input
               type="range"
               min="1"
               max="100"
               value={filters.radius === 999 ? 100 : filters.radius}
               onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
             />
             <div className="flex justify-between text-sm text-gray-500 mt-1">
               <span>1 km</span>
               <span>100 km</span>
             </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 safe-area-bottom">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
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
