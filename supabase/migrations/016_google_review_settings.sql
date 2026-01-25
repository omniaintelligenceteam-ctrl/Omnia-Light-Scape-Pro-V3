-- Migration: Google Review Request Settings
-- Adds settings for automated Google review request emails

-- Google Review URL for the business
ALTER TABLE settings ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- Enable/disable automated review request emails
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_enable_review_requests BOOLEAN DEFAULT true;

-- Number of days after job completion to send review request (default 7)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_review_request_days INTEGER DEFAULT 7;
