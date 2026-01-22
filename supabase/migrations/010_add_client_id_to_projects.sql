-- Migration: Add client_id to projects table
-- This allows linking projects to clients

-- Add client_id column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for faster client-based lookups
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- Add original_image_url if it doesn't exist (needed for saving original photos)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_image_url TEXT;

-- Add total_price column for quick reference (can be computed from prompt_config but useful for queries)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2);
