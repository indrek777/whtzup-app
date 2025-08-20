-- Initialize the database schema for WhtzUp Events

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'free', -- 'free', 'premium', 'expired'
    plan VARCHAR(50), -- 'monthly', 'yearly'
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notifications BOOLEAN DEFAULT TRUE,
    email_updates BOOLEAN DEFAULT TRUE,
    default_radius INTEGER DEFAULT 10,
    favorite_categories JSONB DEFAULT '[]',
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    events_created INTEGER DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    ratings_given INTEGER DEFAULT 0,
    reviews_written INTEGER DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    favorite_venues JSONB DEFAULT '[]',
    last_event_created_date DATE,
    events_created_today INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh tokens table for JWT refresh functionality
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Create indexes for user_subscriptions table
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Create indexes for user_preferences table
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create indexes for user_stats table
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Create indexes for refresh_tokens table
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

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
    IF TG_TABLE_NAME = 'events' THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for user_preferences
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for user_stats
CREATE TRIGGER update_user_stats_updated_at 
    BEFORE UPDATE ON user_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for events
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
