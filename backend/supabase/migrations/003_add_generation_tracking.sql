-- Omnia Light Scape Pro: Generation Tracking for Free Trial
-- Run this in Supabase SQL Editor

-- Add generation_count to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS generation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN DEFAULT FALSE;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_generation_count ON users(generation_count);

-- Function to increment generation count
CREATE OR REPLACE FUNCTION increment_generation_count(user_clerk_id TEXT)
RETURNS TABLE(new_count INTEGER, has_subscription BOOLEAN) AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
    v_has_sub BOOLEAN;
BEGIN
    -- Get user and increment count
    UPDATE users
    SET generation_count = generation_count + 1,
        updated_at = NOW()
    WHERE clerk_user_id = user_clerk_id
    RETURNING id, generation_count INTO v_user_id, v_count;

    -- Check if user has active subscription
    SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE user_id = v_user_id
        AND status = 'active'
    ) INTO v_has_sub;

    RETURN QUERY SELECT v_count, v_has_sub;
END;
$$ LANGUAGE plpgsql;
