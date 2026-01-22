-- Migration: Client Portal Tables
-- Run this in your Supabase SQL Editor

-- Share tokens for public quote/invoice access
CREATE TABLE IF NOT EXISTS share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  token VARCHAR(32) UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('quote', 'invoice')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_project ON share_tokens(project_id);

-- Track quote approvals
CREATE TABLE IF NOT EXISTS quote_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  share_token_id UUID REFERENCES share_tokens(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  client_ip VARCHAR(45),
  client_signature TEXT
);

-- Index for approval lookups
CREATE INDEX IF NOT EXISTS idx_quote_approvals_project ON quote_approvals(project_id);

-- Track sent follow-ups (prevent spam)
CREATE TABLE IF NOT EXISTS follow_up_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'quote_reminder', 'quote_expiring', 'invoice_reminder', 'invoice_overdue', 'review_request', 'maintenance_reminder'
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for follow-up lookups
CREATE INDEX IF NOT EXISTS idx_follow_up_log_project ON follow_up_log(project_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_log_type ON follow_up_log(type);

-- Add new columns to projects for follow-up tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quote_approved_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_paid_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add invoice data storage (line items, totals, etc.)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_data JSONB;
-- invoice_data structure:
-- {
--   "invoiceNumber": "INV-001",
--   "invoiceDate": "2024-01-15",
--   "dueDate": "2024-02-15",
--   "lineItems": [{ "id": "...", "description": "...", "quantity": 1, "unitPrice": 100, "total": 100 }],
--   "subtotal": 1000,
--   "taxRate": 0.08,
--   "taxAmount": 80,
--   "discount": 0,
--   "total": 1080,
--   "notes": "Payment due within 30 days"
-- }

-- Add Stripe payment tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stripe_payment_status VARCHAR(50);

-- Add Stripe Connect account ID to settings for receiving payments
ALTER TABLE settings ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(50); -- 'pending', 'active', 'restricted'

-- Enable RLS on new tables
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_tokens
CREATE POLICY "Users can manage their own share tokens"
  ON share_tokens FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.user_id', true)));

-- RLS policies for quote_approvals (read-only for users)
CREATE POLICY "Users can view approvals for their projects"
  ON quote_approvals FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.user_id', true))));

-- RLS policies for follow_up_log
CREATE POLICY "Users can view their own follow-up logs"
  ON follow_up_log FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.user_id', true)));
