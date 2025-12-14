-- ============================================
-- Migration: Add Missing Shop Columns
-- ============================================
-- Adds critical columns to shops table that were missing
-- These columns are required by supabaseShopService.ts
--
-- Created: December 10, 2025
-- Blocked Deployment Without These

-- ============================================
-- 1. ADD ASSISTANT CONFIG COLUMNS
-- ============================================

ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS assistant_model TEXT DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS response_delay INTEGER DEFAULT 0;

-- ============================================
-- 2. ADD INTEGRATION COLUMNS
-- ============================================

ALTER TABLE shops
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'MMK',
ADD COLUMN IF NOT EXISTS is_facebook_connected BOOLEAN DEFAULT false;

-- ============================================
-- 3. ADD CONSTRAINTS
-- ============================================

-- Constraint for assistant_model enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'shops' AND constraint_name = 'check_assistant_model'
    ) THEN
        ALTER TABLE shops 
        ADD CONSTRAINT check_assistant_model 
        CHECK (assistant_model IN ('STANDARD', 'ADVANCED', 'DEEP_THINKING'));
    END IF;
END $$;

-- Constraint for currency code (ISO 4217)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'shops' AND constraint_name = 'check_currency_code'
    ) THEN
        ALTER TABLE shops
        ADD CONSTRAINT check_currency_code
        CHECK (length(currency) = 3);
    END IF;
END $$;

-- Constraint for response_delay (0-30000 milliseconds max)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'shops' AND constraint_name = 'check_response_delay'
    ) THEN
        ALTER TABLE shops
        ADD CONSTRAINT check_response_delay
        CHECK (response_delay >= 0 AND response_delay <= 30000);
    END IF;
END $$;

-- ============================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shops_assistant_model ON shops(assistant_model);
CREATE INDEX IF NOT EXISTS idx_shops_currency ON shops(currency);
CREATE INDEX IF NOT EXISTS idx_shops_facebook_connected ON shops(is_facebook_connected);

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON COLUMN shops.assistant_model IS 'AI model selection: STANDARD, ADVANCED, or DEEP_THINKING';
COMMENT ON COLUMN shops.system_prompt IS 'Custom system prompt for AI assistant';
COMMENT ON COLUMN shops.response_delay IS 'Delay in milliseconds before AI responds (0-30000)';
COMMENT ON COLUMN shops.currency IS 'Shop currency code (ISO 4217)';
COMMENT ON COLUMN shops.is_facebook_connected IS 'Whether Facebook/Instagram integration is connected';

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Check columns exist
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'shops' 
-- AND column_name IN ('assistant_model', 'system_prompt', 'response_delay', 'currency', 'is_facebook_connected')
-- ORDER BY ordinal_position;

-- Check constraints
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'shops' 
-- AND constraint_name LIKE 'check_%';

-- Check indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'shops' AND indexname LIKE 'idx_shops_%';
