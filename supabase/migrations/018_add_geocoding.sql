-- Migration: Add geocoding columns for route optimization
-- This enables lat/lng storage for addresses to support route planning

-- Add lat/lng to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Add lat/lng to locations table (for office/home bases)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add home location to technicians for route start points
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8);
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8);
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS home_address TEXT;

-- Create index for geospatial queries (helps with distance calculations)
CREATE INDEX IF NOT EXISTS idx_clients_geocode ON clients (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_geocode ON locations (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_home_geocode ON technicians (home_latitude, home_longitude) WHERE home_latitude IS NOT NULL;

-- Add table for cached optimized routes (optional - for performance)
CREATE TABLE IF NOT EXISTS route_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    start_location_lat DECIMAL(10, 8),
    start_location_lng DECIMAL(11, 8),
    optimized_order JSONB NOT NULL,  -- Array of project IDs in optimal order
    total_distance_meters INTEGER,
    total_duration_seconds INTEGER,
    total_driving_seconds INTEGER,
    polyline TEXT,                    -- Encoded route for map display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, technician_id, plan_date)
);

-- Index for route plan lookups
CREATE INDEX IF NOT EXISTS idx_route_plans_date ON route_plans (user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_route_plans_technician ON route_plans (technician_id, plan_date);

-- Add RLS policies for route_plans
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route plans"
    ON route_plans FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own route plans"
    ON route_plans FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own route plans"
    ON route_plans FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own route plans"
    ON route_plans FOR DELETE
    USING (user_id = auth.uid());
