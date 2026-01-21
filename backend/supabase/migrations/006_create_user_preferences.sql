-- Omnia Light Scape Pro: User Preferences Table
-- Run this in Supabase SQL Editor
-- Stores aggregated user preference patterns for AI personalization

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Fixture preferences (learned from patterns)
  preferred_fixture_ratio JSONB DEFAULT '{}',
  preferred_color_temp TEXT DEFAULT '3000K',
  preferred_intensity_range JSONB DEFAULT '{"min": 35, "max": 55}',
  preferred_beam_angle_range JSONB DEFAULT '{"min": 25, "max": 40}',

  -- Style preferences (extracted from feedback)
  style_keywords TEXT[] DEFAULT '{}',
  avoid_keywords TEXT[] DEFAULT '{}',

  -- Statistics
  total_liked INT DEFAULT 0,
  total_disliked INT DEFAULT 0,
  total_saved INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger to update updated_at
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own preferences
CREATE POLICY user_preferences_user_policy ON user_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
