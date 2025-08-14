import React, { useState } from 'react'
import { Star } from 'lucide-react'

interface RatingProps {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  showCount?: boolean
  count?: number
}

const Rating: React.FC<RatingProps> = ({ 
  value, 
  onChange, 
  readonly = false, 
  size = 'md',
  showValue = false,
  showCount = false,
  count = 0
}) => {
  const [hoverValue, setHoverValue] = useState(0)
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const handleClick = (rating: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0)
    }
  }

  const displayValue = hoverValue || value

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={(e) => handleClick(star, e)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-all duration-200`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                star <= displayValue
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      
      {(showValue || showCount) && (
        <div className={`flex items-center gap-1 ${textSizes[size]} text-gray-600`}>
          {showValue && (
            <span className="font-medium">
              {value > 0 ? value.toFixed(1) : 'No ratings'}
            </span>
          )}
          {showCount && count > 0 && (
            <span className="text-gray-500">
              ({count} {count === 1 ? 'rating' : 'ratings'})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Rating
