#!/bin/bash

# Script to update coordinates for all events in the database
# This should be run on the server with database access

echo "🔍 Connecting to database and updating event coordinates..."

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="whtzup_events"
DB_USER="postgres"

# Update coordinates for events based on location patterns
echo "📊 Updating coordinates for events..."

# Connect to PostgreSQL and run the update queries
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER << 'EOF'

-- Update coordinates for events with location patterns
UPDATE events 
SET 
  latitude = 59.436962,
  longitude = 24.753574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%tallinn%' OR 
    LOWER(address) LIKE '%tallinn%' OR 
    LOWER(venue) LIKE '%tallinna%' OR
    LOWER(address) LIKE '%tallinna%'
  );

UPDATE events 
SET 
  latitude = 58.377625,
  longitude = 26.729006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%tartu%' OR 
    LOWER(address) LIKE '%tartu%'
  );

UPDATE events 
SET 
  latitude = 58.385625,
  longitude = 24.497574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%pärnu%' OR 
    LOWER(address) LIKE '%pärnu%'
  );

UPDATE events 
SET 
  latitude = 58.363625,
  longitude = 25.590006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%viljandi%' OR 
    LOWER(address) LIKE '%viljandi%'
  );

UPDATE events 
SET 
  latitude = 59.352539,
  longitude = 26.360135,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%rakvere%' OR 
    LOWER(address) LIKE '%rakvere%'
  );

UPDATE events 
SET 
  latitude = 58.943625,
  longitude = 23.540006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%haapsalu%' OR 
    LOWER(address) LIKE '%haapsalu%'
  );

UPDATE events 
SET 
  latitude = 58.885625,
  longitude = 25.557574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%paide%' OR 
    LOWER(address) LIKE '%paide%'
  );

UPDATE events 
SET 
  latitude = 59.303625,
  longitude = 24.420006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%keila%' OR 
    LOWER(address) LIKE '%keila%'
  );

UPDATE events 
SET 
  latitude = 58.055625,
  longitude = 27.057574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%põlva%' OR 
    LOWER(address) LIKE '%põlva%'
  );

UPDATE events 
SET 
  latitude = 58.746625,
  longitude = 26.390006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%jõgeva%' OR 
    LOWER(address) LIKE '%jõgeva%'
  );

UPDATE events 
SET 
  latitude = 58.222625,
  longitude = 26.420006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%elva%' OR 
    LOWER(address) LIKE '%elva%'
  );

UPDATE events 
SET 
  latitude = 59.007625,
  longitude = 24.797574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%rapla%' OR 
    LOWER(address) LIKE '%rapla%'
  );

UPDATE events 
SET 
  latitude = 59.320625,
  longitude = 24.550006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%saue%' OR 
    LOWER(address) LIKE '%saue%'
  );

UPDATE events 
SET 
  latitude = 58.652625,
  longitude = 25.970006,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%põltsamaa%' OR 
    LOWER(address) LIKE '%põltsamaa%'
  );

UPDATE events 
SET 
  latitude = 59.356625,
  longitude = 24.053574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL)
  AND (
    LOWER(venue) LIKE '%paldiski%' OR 
    LOWER(address) LIKE '%paldiski%'
  );

-- Set default coordinates for any remaining events without coordinates
UPDATE events 
SET 
  latitude = 59.436962,
  longitude = 24.753574,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  deleted_at IS NULL 
  AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL);

-- Show summary
SELECT 
  'Updated events with coordinates' as status,
  COUNT(*) as count
FROM events 
WHERE deleted_at IS NULL AND latitude != 0 AND longitude != 0;

SELECT 
  'Events still without coordinates' as status,
  COUNT(*) as count
FROM events 
WHERE deleted_at IS NULL AND (latitude = 0 OR latitude IS NULL OR longitude = 0 OR longitude IS NULL);

EOF

echo "✅ Coordinate update completed!"
