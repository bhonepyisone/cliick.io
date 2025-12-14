-- Migration: Analytics Features and Stock History (Migration 010)
-- Date: December 11, 2025
-- Description: Adds stock history tracking and ensures all required columns exist for analytics

-- Create stock_history table for tracking inventory changes
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason VARCHAR(255),
  changed_by UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_history_item ON stock_history(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_shop ON stock_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_timestamp ON stock_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_history_created ON stock_history(created_at);

-- Ensure forms table has fields column for validation
ALTER TABLE forms ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]';

-- Ensure all tables have required timestamp columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS on stock_history if not already enabled
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for stock_history (shop level isolation)
CREATE POLICY IF NOT EXISTS stock_history_select_by_shop ON stock_history
  FOR SELECT
  USING (shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS stock_history_insert_by_shop ON stock_history
  FOR INSERT
  WITH CHECK (shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  ));

-- Grant permissions
GRANT SELECT ON stock_history TO authenticated;
GRANT INSERT ON stock_history TO authenticated;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON orders(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_status ON form_submissions(form_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_shop_status ON conversations(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_shop_created ON conversations(shop_id, created_at);

-- Verify schema integrity
-- All required columns should now exist for analytics endpoints to function properly
