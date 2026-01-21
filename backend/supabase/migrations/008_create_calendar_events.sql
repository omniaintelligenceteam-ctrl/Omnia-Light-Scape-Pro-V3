-- Omnia Light Scape Pro: Calendar Events Table
-- Run this in Supabase SQL Editor
-- Stores calendar events for the Schedule tab

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other',
  event_date DATE NOT NULL,
  time_slot TEXT NOT NULL DEFAULT 'morning',
  custom_time TEXT,
  duration NUMERIC DEFAULT 1,
  location TEXT,
  notes TEXT,
  client_name TEXT,
  client_phone TEXT,
  color TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
