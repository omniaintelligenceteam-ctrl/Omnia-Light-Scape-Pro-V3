-- Omnia Light Scape Pro: Add monthly_limit to subscriptions
-- Run this in Supabase SQL Editor

-- Add monthly_limit column to subscriptions table
-- -1 = unlimited, 0 = no limit set, positive = generation limit per month
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 0;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_monthly_limit ON subscriptions(monthly_limit);

-- Add comment for clarity
COMMENT ON COLUMN subscriptions.monthly_limit IS 'Monthly generation limit: -1 = unlimited, 0 = not set, positive = limit per month';
