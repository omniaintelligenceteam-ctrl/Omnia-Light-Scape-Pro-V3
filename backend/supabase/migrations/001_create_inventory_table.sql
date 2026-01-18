-- Omnia Light Scape Pro: Inventory Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  on_hand INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 10,
  supplier_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast SKU lookups
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);

-- Sample data for testing
INSERT INTO inventory (sku, name, description, on_hand, reserved, reorder_point) VALUES
  ('BRASS-UP-3000K', 'Solid Cast Brass Up Light (3000K)', 'Ground-mounted up light', 50, 0, 20),
  ('BRASS-PATH-3000K', 'Cast Brass Path Light (3000K)', 'Post-mounted walkway light', 30, 0, 15),
  ('CORE-DRILL-SS', 'Core Drill In-Grade Light', 'Stainless steel flush-mount', 20, 0, 10),
  ('GUTTER-UP-3000K', 'Gutter Mounted Up Light', 'Roofline accent light', 25, 0, 10),
  ('SOFFIT-DOWN', 'Recessed Soffit Downlight', 'Eave-mounted downlight', 40, 0, 15),
  ('HARDSCAPE-LINEAR', 'Hardscape Linear Light', 'Under-cap wall/step light', 35, 0, 15),
  ('TRANSFORMER-300W', 'Low Voltage Transformer', '300W stainless steel', 10, 0, 5)
ON CONFLICT (sku) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
