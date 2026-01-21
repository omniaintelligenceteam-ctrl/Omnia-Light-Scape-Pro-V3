-- Omnia Light Scape Pro: Generation Feedback Table
-- Run this in Supabase SQL Editor
-- Stores individual feedback events with full generation context

CREATE TABLE IF NOT EXISTS generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Feedback data
  rating TEXT NOT NULL CHECK (rating IN ('liked', 'disliked', 'saved')),
  feedback_text TEXT,

  -- Settings snapshot for pattern analysis
  settings_snapshot JSONB NOT NULL DEFAULT '{}',
  -- Contains: {
  --   selectedFixtures: string[],
  --   fixtureSubOptions: object,
  --   colorTemperature: string,
  --   lightIntensity: number,
  --   beamAngle: number,
  --   userPrompt: string
  -- }

  -- Image reference (optional, for future ML)
  generated_image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_feedback_user ON generation_feedback(user_id);

-- Index for filtering by rating
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON generation_feedback(rating);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON generation_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE generation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own feedback
CREATE POLICY generation_feedback_user_policy ON generation_feedback
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
