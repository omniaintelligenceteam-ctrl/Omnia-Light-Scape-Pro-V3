-- Native Accounting Features Migration
-- Expense tracking and Chart of Accounts for landscape lighting contractors

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  vendor TEXT,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  receipt_url TEXT,
  payment_method TEXT DEFAULT 'card',
  is_billable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);

-- RLS policies for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

-- ============================================
-- CHART OF ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'cogs', 'expense', 'asset', 'liability')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_user ON chart_of_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(type);

-- RLS policies for chart_of_accounts
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and system accounts"
  ON chart_of_accounts FOR SELECT
  USING (user_id IS NULL OR auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can create own accounts"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own accounts"
  ON chart_of_accounts FOR UPDATE
  USING (auth.uid()::text = user_id::text OR user_id IN (
    SELECT u.id FROM users u WHERE u.clerk_user_id = auth.uid()::text
  ));

-- ============================================
-- DEFAULT CHART OF ACCOUNTS
-- Landscape lighting specific categories
-- ============================================
INSERT INTO chart_of_accounts (user_id, code, name, type, description) VALUES
  -- Income accounts (4xxx)
  (NULL, '4000', 'Installation Income', 'income', 'Revenue from new lighting installations'),
  (NULL, '4100', 'Service/Repair Income', 'income', 'Revenue from repairs and service calls'),
  (NULL, '4200', 'Maintenance Contracts', 'income', 'Recurring maintenance revenue'),
  (NULL, '4300', 'Holiday Lighting', 'income', 'Seasonal holiday lighting revenue'),

  -- Cost of Goods Sold (5xxx)
  (NULL, '5000', 'Fixtures & Materials', 'cogs', 'Cost of lighting fixtures purchased'),
  (NULL, '5100', 'Wire & Electrical', 'cogs', 'Wire, connectors, electrical supplies'),
  (NULL, '5200', 'Transformers', 'cogs', 'Transformer costs'),
  (NULL, '5300', 'Subcontractor Labor', 'cogs', 'Outsourced labor costs'),

  -- Operating Expenses (6xxx)
  (NULL, '6000', 'Technician Wages', 'expense', 'Employee wages and salaries'),
  (NULL, '6100', 'Vehicle Expenses', 'expense', 'Fuel, maintenance, insurance'),
  (NULL, '6200', 'Tools & Equipment', 'expense', 'Tools and equipment purchases'),
  (NULL, '6300', 'Insurance', 'expense', 'Business insurance premiums'),
  (NULL, '6400', 'Marketing', 'expense', 'Advertising and marketing costs'),
  (NULL, '6500', 'Office Supplies', 'expense', 'Office and administrative supplies'),
  (NULL, '6600', 'Professional Services', 'expense', 'Accounting, legal, consulting fees'),
  (NULL, '6900', 'Other Expenses', 'expense', 'Miscellaneous business expenses')
ON CONFLICT DO NOTHING;

-- ============================================
-- EXPENSE CATEGORIES VIEW
-- Combines system defaults with user custom accounts
-- ============================================
CREATE OR REPLACE VIEW expense_categories AS
SELECT
  id,
  code,
  name,
  type,
  description,
  user_id
FROM chart_of_accounts
WHERE type IN ('cogs', 'expense')
  AND is_active = true
ORDER BY code;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();
