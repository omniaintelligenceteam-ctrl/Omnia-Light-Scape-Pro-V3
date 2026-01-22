-- Add lead source tracking to clients table
-- Migration: 009_client_lead_source.sql
-- Purpose: Track marketing channel and cost per client for ROI analysis

ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC DEFAULT 0;

-- Create index for efficient lead source queries
CREATE INDEX IF NOT EXISTS idx_clients_lead_source ON clients(lead_source);

-- Add comment for documentation
COMMENT ON COLUMN clients.lead_source IS 'Marketing channel that generated this lead (google, referral, angi, thumbtack, website, social, yard_sign, other)';
COMMENT ON COLUMN clients.marketing_cost IS 'Cost to acquire this lead (e.g., ad spend, referral fee)';
