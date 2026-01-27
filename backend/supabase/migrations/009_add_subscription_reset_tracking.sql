-- Add last_reset_at column to track monthly generation credit resets
-- This enables monthly resets for yearly subscriptions (not just when invoice is paid)

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ;

-- Comment explaining the column
COMMENT ON COLUMN subscriptions.last_reset_at IS 'Tracks when generation credits were last reset. Used for monthly resets on yearly plans.';
