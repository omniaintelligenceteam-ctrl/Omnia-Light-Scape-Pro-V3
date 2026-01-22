-- Migration: 014_client_messages.sql
-- Purpose: Create client_messages table for bidirectional messaging
-- Enables communication between clients and company

CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  sender_type TEXT CHECK(sender_type IN ('client', 'company')) NOT NULL,
  sender_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_client_messages_project ON client_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_created ON client_messages(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE client_messages IS 'Stores messages between clients and company';
COMMENT ON COLUMN client_messages.sender_type IS 'Whether message is from client or company';
COMMENT ON COLUMN client_messages.read_at IS 'Timestamp when message was read (null if unread)';

-- Record migration execution
INSERT INTO schema_migrations (version, description) VALUES
  ('014', 'Client messaging system')
ON CONFLICT (version) DO NOTHING;
