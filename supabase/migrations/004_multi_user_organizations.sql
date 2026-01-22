-- Multi-User Organization System Migration
-- This migration adds support for team-based accounts with role-based access control

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES users(id),
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'salesperson', 'technician', 'lead_technician')),
    location_id UUID REFERENCES locations(id), -- NULL = all locations access
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_location ON organization_members(location_id);

-- ============================================
-- ORGANIZATION INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'salesperson', 'technician', 'lead_technician')),
    location_id UUID REFERENCES locations(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(token);

-- ============================================
-- PROJECT ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'salesperson', 'technician')),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_role ON project_assignments(role);

-- ============================================
-- CLIENT ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_user ON client_assignments(user_id);

-- ============================================
-- MODIFY EXISTING TABLES FOR ORGANIZATION SUPPORT
-- ============================================

-- Add organization_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add organization_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_salesperson_id UUID REFERENCES users(id);

-- Add organization_id to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_salesperson_id UUID REFERENCES users(id);

-- Add organization_id to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Link technicians to user accounts
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add organization_id to calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_tech ON projects(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_sales ON projects(assigned_salesperson_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_sales ON clients(assigned_salesperson_id);
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_technicians_user ON technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned ON calendar_events(assigned_to);

-- ============================================
-- MIGRATION FOR EXISTING DATA
-- Create organization for each existing user
-- ============================================

-- This function will be called to migrate existing users to the org model
-- Run this manually after the migration to ensure smooth transition
/*
DO $$
DECLARE
    user_record RECORD;
    new_org_id UUID;
BEGIN
    FOR user_record IN SELECT id, email FROM users WHERE organization_id IS NULL LOOP
        -- Create organization for user
        INSERT INTO organizations (name, owner_user_id)
        VALUES (user_record.email || '''s Organization', user_record.id)
        RETURNING id INTO new_org_id;

        -- Update user with organization_id
        UPDATE users SET organization_id = new_org_id WHERE id = user_record.id;

        -- Add user as owner member
        INSERT INTO organization_members (organization_id, user_id, role, invited_by, accepted_at, is_active)
        VALUES (new_org_id, user_record.id, 'owner', user_record.id, NOW(), true);

        -- Update user's projects
        UPDATE projects SET organization_id = new_org_id, created_by = user_record.id
        WHERE user_id = user_record.id AND organization_id IS NULL;

        -- Update user's clients
        UPDATE clients SET organization_id = new_org_id
        WHERE user_id = user_record.id AND organization_id IS NULL;

        -- Update user's locations
        UPDATE locations SET organization_id = new_org_id
        WHERE user_id = user_record.id AND organization_id IS NULL;

        -- Update user's calendar events
        UPDATE calendar_events SET organization_id = new_org_id
        WHERE user_id = user_record.id AND organization_id IS NULL;
    END LOOP;
END $$;
*/

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        owner_user_id = auth.uid() OR
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "Owners can update their organization" ON organizations
    FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- Organization members policies
CREATE POLICY "Members can view org members" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Owners can manage members" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_user_id = auth.uid()
        )
    );

-- Organization invites policies
CREATE POLICY "Owners can view invites" ON organization_invites
    FOR SELECT USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can create invites" ON organization_invites
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can delete invites" ON organization_invites
    FOR DELETE USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_user_id = auth.uid()
        )
    );

-- Project assignments policies
CREATE POLICY "Org members can view project assignments" ON project_assignments
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE organization_id IN (
                SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "Owners and admins can manage project assignments" ON project_assignments
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true AND om.role IN ('owner', 'admin')
        )
    );

-- Client assignments policies
CREATE POLICY "Org members can view client assignments" ON client_assignments
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM clients WHERE organization_id IN (
                SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "Owners and admins can manage client assignments" ON client_assignments
    FOR ALL USING (
        client_id IN (
            SELECT c.id FROM clients c
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = p_user_id AND role = p_role AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM organization_members
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view project
CREATE OR REPLACE FUNCTION user_can_view_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_org_id UUID;
    project_org_id UUID;
BEGIN
    -- Get user's organization and role
    SELECT om.organization_id, om.role INTO user_org_id, user_role
    FROM organization_members om
    WHERE om.user_id = p_user_id AND om.is_active = true;

    -- Get project's organization
    SELECT organization_id INTO project_org_id FROM projects WHERE id = p_project_id;

    -- Must be in same org
    IF user_org_id IS NULL OR user_org_id != project_org_id THEN
        RETURN FALSE;
    END IF;

    -- Owners and admins can see all projects
    IF user_role IN ('owner', 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Salespeople and technicians can only see assigned projects
    RETURN EXISTS (
        SELECT 1 FROM project_assignments
        WHERE project_id = p_project_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
