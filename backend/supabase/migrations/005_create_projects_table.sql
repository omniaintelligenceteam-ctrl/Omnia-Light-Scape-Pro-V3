-- Omnia Light Scape Pro: Projects Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generated_image_url TEXT,
  prompt_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own projects
CREATE POLICY projects_user_policy ON projects
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
