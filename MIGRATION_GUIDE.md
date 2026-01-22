# Phase 3 Migration Guide

Execute Phase 3 database migrations (013-015) and configure Supabase Storage for client portal features.

## Prerequisites

- Access to Supabase Dashboard
- Migrations 003-010 already executed
- Service role key configured

## Migration Summary

| Migration | Description | Tables Created |
|-----------|-------------|----------------|
| 013 | Project photo gallery | `project_photos` |
| 014 | Client messaging system | `client_messages` |
| 015 | Client document library | `client_documents` |

## Step 1: Create Migration Tracking Table

Execute in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description) VALUES
  ('003', 'Client portal tokens'),
  ('004', 'Multi-user organizations'),
  ('005', 'Locations and technicians'),
  ('009', 'Client lead source tracking'),
  ('010', 'Add client_id to projects')
ON CONFLICT (version) DO NOTHING;
```

Verify:
```sql
SELECT * FROM schema_migrations ORDER BY version;
```

## Step 2: Execute Migration 013 - Project Gallery

```sql
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

CREATE INDEX IF NOT EXISTS idx_project_photos_project ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_order ON project_photos(project_id, display_order);

INSERT INTO schema_migrations (version, description) VALUES
  ('013', 'Project photo gallery')
ON CONFLICT (version) DO NOTHING;
```

## Step 3: Execute Migration 014 - Client Messages

```sql
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

CREATE INDEX IF NOT EXISTS idx_client_messages_project ON client_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_created ON client_messages(created_at DESC);

INSERT INTO schema_migrations (version, description) VALUES
  ('014', 'Client messaging system')
ON CONFLICT (version) DO NOTHING;
```

## Step 4: Execute Migration 015 - Client Documents

```sql
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

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_project ON client_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents(document_type);

INSERT INTO schema_migrations (version, description) VALUES
  ('015', 'Client document library')
ON CONFLICT (version) DO NOTHING;
```

## Step 5: Configure Supabase Storage

### Create Buckets (via Supabase Dashboard → Storage)

**Bucket 1: project-photos**
- Name: `project-photos`
- Public: Yes
- File size limit: 10 MB
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**Bucket 2: client-documents**
- Name: `client-documents`
- Public: No (private, access via signed URLs)
- File size limit: 10 MB
- Allowed MIME types: `application/pdf,image/jpeg,image/png`

### Configure RLS Policies

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- project-photos policies
CREATE POLICY "Authenticated users can upload project photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-photos');

CREATE POLICY "Public can view project photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'project-photos');

CREATE POLICY "Authenticated users can delete project photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-photos');

-- client-documents policies
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can access client documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-documents');
```

## Step 6: Verify

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('project_photos', 'client_messages', 'client_documents');

-- Check migrations
SELECT * FROM schema_migrations ORDER BY version;

-- Check buckets
SELECT id, name, public FROM storage.buckets;
```

## Rollback (If Needed)

```sql
DROP TABLE IF EXISTS client_documents CASCADE;
DROP TABLE IF EXISTS client_messages CASCADE;
DROP TABLE IF EXISTS project_photos CASCADE;
DELETE FROM schema_migrations WHERE version IN ('013', '014', '015');
```

## Success Checklist

- [ ] Migration tracking table created
- [ ] Migration 013 executed (project_photos table)
- [ ] Migration 014 executed (client_messages table)
- [ ] Migration 015 executed (client_documents table)
- [ ] project-photos bucket created with RLS policies
- [ ] client-documents bucket created with RLS policies
- [ ] All 3 tables have proper indexes
- [ ] schema_migrations shows versions 003-010, 013-015

## Next Steps

1. Deploy updated code to Vercel
2. Test client portal features
3. Verify file uploads work
4. Test document downloads with signed URLs
