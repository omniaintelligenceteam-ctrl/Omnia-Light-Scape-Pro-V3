-- Migration: 010_project_gallery.sql
-- Purpose: Create project_photos table for photo gallery feature
-- Allows multiple photos per project with categorization and ordering

CREATE TABLE IF NOT EXISTS project_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  label TEXT,
  photo_type TEXT CHECK(photo_type IN ('before', 'after', 'progress', 'final', 'detail', 'other')) DEFAULT 'other',
  display_order INT DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  is_visible_to_client BOOLEAN DEFAULT TRUE
);

-- Create index for efficient project queries
CREATE INDEX IF NOT EXISTS idx_project_photos_project ON project_photos(project_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_project_photos_order ON project_photos(project_id, display_order);

-- Add comments for documentation
COMMENT ON TABLE project_photos IS 'Stores multiple photos for each project with categorization';
COMMENT ON COLUMN project_photos.photo_type IS 'Type of photo: before, after, progress, final, detail, or other';
COMMENT ON COLUMN project_photos.display_order IS 'Order for displaying photos (0 = first)';
COMMENT ON COLUMN project_photos.is_visible_to_client IS 'Whether photo should be shown in client portal';
