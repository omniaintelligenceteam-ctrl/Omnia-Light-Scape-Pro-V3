-- Locations and Technicians Tables Migration
-- This migration creates the base tables for multi-location business support

-- ============================================
-- LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    address TEXT,
    manager_name TEXT,
    manager_email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_locations_user ON locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active);

-- ============================================
-- TECHNICIANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    location_id UUID REFERENCES locations(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'technician' CHECK (role IN ('lead', 'technician', 'apprentice')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_technicians_user ON technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_location ON technicians(location_id);
CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(is_active);

-- ============================================
-- BUSINESS GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    goal_type TEXT NOT NULL CHECK (goal_type IN ('revenue', 'projects_completed', 'new_clients')),
    period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    target_value NUMERIC NOT NULL,
    year INT NOT NULL,
    month INT,
    quarter INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_goals_user ON business_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_business_goals_type ON business_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_business_goals_period ON business_goals(period_type);
CREATE INDEX IF NOT EXISTS idx_business_goals_year ON business_goals(year);

-- ============================================
-- FOLLOW-UP LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS follow_up_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_log_user ON follow_up_log(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_log_project ON follow_up_log(project_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_log_client ON follow_up_log(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_log_type ON follow_up_log(type);

-- ============================================
-- ADD FOLLOW-UP SETTINGS TO SETTINGS TABLE
-- ============================================
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_quote_reminder_days INTEGER DEFAULT 3;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_quote_expiring_days INTEGER DEFAULT 2;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_invoice_reminder_days INTEGER DEFAULT 7;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_invoice_overdue_days INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_pre_installation_days INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_enable_quote_reminders BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_enable_invoice_reminders BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_enable_pre_install_reminders BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_sms_enabled BOOLEAN DEFAULT false;

-- ============================================
-- ADD LOCATION AND TECHNICIAN TRACKING TO PROJECTS
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES technicians(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS material_cost NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS labor_cost NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS marketing_cost NUMERIC DEFAULT 0;

-- Indexes for project tracking
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location_id);
CREATE INDEX IF NOT EXISTS idx_projects_technician ON projects(technician_id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_source ON projects(lead_source);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_log ENABLE ROW LEVEL SECURITY;

-- Locations policies
CREATE POLICY "Users can view their locations" ON locations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create locations" ON locations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their locations" ON locations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their locations" ON locations
    FOR DELETE USING (user_id = auth.uid());

-- Technicians policies
CREATE POLICY "Users can view their technicians" ON technicians
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create technicians" ON technicians
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their technicians" ON technicians
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their technicians" ON technicians
    FOR DELETE USING (user_id = auth.uid());

-- Business goals policies
CREATE POLICY "Users can view their goals" ON business_goals
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create goals" ON business_goals
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their goals" ON business_goals
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their goals" ON business_goals
    FOR DELETE USING (user_id = auth.uid());

-- Follow-up log policies
CREATE POLICY "Users can view their follow-up logs" ON follow_up_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create follow-up logs" ON follow_up_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technicians_updated_at
    BEFORE UPDATE ON technicians
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_goals_updated_at
    BEFORE UPDATE ON business_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
