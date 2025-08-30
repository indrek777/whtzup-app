-- Add receipt validation fields to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS original_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS receipt_data TEXT,
ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS is_trial_period BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_intro_offer_period BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_transaction_id ON user_subscriptions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_original_transaction_id ON user_subscriptions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_updated_at ON user_subscriptions(updated_at);

-- Update existing records to have updated_at timestamp
UPDATE user_subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
