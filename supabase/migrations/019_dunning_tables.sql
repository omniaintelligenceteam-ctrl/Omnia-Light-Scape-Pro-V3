-- Dunning (Payment Reminders) System Tables
-- Creates tables for automated payment reminder schedules and tracking

-- Dunning schedules configuration
CREATE TABLE IF NOT EXISTS dunning_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Schedule',
  is_default BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice reminder tracking
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT,
  client_name TEXT,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_to TEXT NOT NULL,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dunning_schedules_user ON dunning_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_dunning_schedules_active ON dunning_schedules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_user ON invoice_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_project ON invoice_reminders(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_at ON invoice_reminders(sent_at);

-- Enable Row Level Security
ALTER TABLE dunning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dunning_schedules
CREATE POLICY "Users can view their own dunning schedules"
  ON dunning_schedules FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own dunning schedules"
  ON dunning_schedules FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own dunning schedules"
  ON dunning_schedules FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own dunning schedules"
  ON dunning_schedules FOR DELETE
  USING (user_id = auth.uid()::text);

-- RLS Policies for invoice_reminders
CREATE POLICY "Users can view their own invoice reminders"
  ON invoice_reminders FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own invoice reminders"
  ON invoice_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own invoice reminders"
  ON invoice_reminders FOR UPDATE
  USING (user_id = auth.uid()::text);

-- Service role policy for cron jobs
CREATE POLICY "Service role can access all dunning schedules"
  ON dunning_schedules FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all invoice reminders"
  ON invoice_reminders FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE dunning_schedules IS 'Stores user-configurable payment reminder schedules with escalating steps';
COMMENT ON TABLE invoice_reminders IS 'Tracks all payment reminders sent for invoices';
COMMENT ON COLUMN dunning_schedules.steps IS 'JSONB array of reminder steps: [{days_after_due, template, subject, channel}]';
