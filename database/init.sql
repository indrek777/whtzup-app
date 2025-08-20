-- Initialize the database schema for WhtzUp Events

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'other',
    venue VARCHAR(500) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL DEFAULT 0,
    longitude DECIMAL(11, 8) NOT NULL DEFAULT 0,
    starts_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) DEFAULT 'Event Organizer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue);
CREATE INDEX IF NOT EXISTS idx_events_coordinates ON events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

-- Create unique constraint to prevent duplicates based on name and venue
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_name_venue_unique ON events(name, venue) WHERE deleted_at IS NULL;

-- Create sync_log table for tracking changes
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    device_id VARCHAR(255)
);

-- Create indexes for sync_log
CREATE INDEX IF NOT EXISTS idx_sync_log_event_id ON sync_log(event_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);

-- Create offline_queue table for handling offline operations
CREATE TABLE IF NOT EXISTS offline_queue (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_id VARCHAR(255) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- Create indexes for offline_queue
CREATE INDEX IF NOT EXISTS idx_offline_queue_device_id ON offline_queue(device_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_processed ON offline_queue(processed);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data if table is empty
INSERT INTO events (id, name, description, category, venue, address, latitude, longitude, starts_at, created_by)
SELECT 
    'sample-event-1',
    'Sample Music Event',
    'A sample music event for testing',
    'music',
    'Sample Venue',
    'Sample Address, City',
    59.437000,
    24.753600,
    '2024-01-15 19:00:00',
    'System'
WHERE NOT EXISTS (SELECT 1 FROM events LIMIT 1);

-- Create view for active events (not deleted)
CREATE OR REPLACE VIEW active_events AS
SELECT * FROM events WHERE deleted_at IS NULL;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO whtzup_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO whtzup_user;
