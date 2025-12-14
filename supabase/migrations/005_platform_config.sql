-- ============================================
-- Migration: Platform Configuration Table
-- Purpose: Store platform-wide settings in database
-- ============================================

-- Create platform_config table
CREATE TABLE IF NOT EXISTS platform_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_platform_config_updated_at
    BEFORE UPDATE ON platform_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage platform config
CREATE POLICY "Only admins can view platform config"
    ON platform_config FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Only admins can insert platform config"
    ON platform_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Only admins can update platform config"
    ON platform_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Only admins can delete platform config"
    ON platform_config FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Create index for key lookups
CREATE INDEX idx_platform_config_key ON platform_config(key);

-- Insert default platform settings (optional, can be managed via admin UI)
-- Example:
-- INSERT INTO platform_config (key, value) VALUES 
-- ('ai_config', '{"temperature": 0.7, "topP": 0.95, "topK": 40}'::jsonb)
-- ON CONFLICT (key) DO NOTHING;
