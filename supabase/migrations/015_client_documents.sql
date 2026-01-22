-- Migration: 015_client_documents.sql
-- Purpose: Create client_documents table for document management
-- Stores contracts, warranties, manuals, and other client documents

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT CHECK(document_type IN ('contract', 'warranty', 'manual', 'schedule', 'photos', 'other')) DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  is_visible_to_client BOOLEAN DEFAULT TRUE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_project ON client_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents(document_type);

-- Add comments for documentation
COMMENT ON TABLE client_documents IS 'Stores documents for clients and projects';
COMMENT ON COLUMN client_documents.document_type IS 'Type of document: contract, warranty, manual, schedule, photos, or other';
COMMENT ON COLUMN client_documents.file_url IS 'URL to file in Supabase Storage or external storage';
COMMENT ON COLUMN client_documents.is_visible_to_client IS 'Whether document should be shown in client portal';

-- Record migration execution
INSERT INTO schema_migrations (version, description) VALUES
  ('015', 'Client document library')
ON CONFLICT (version) DO NOTHING;
