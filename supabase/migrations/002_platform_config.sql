-- Migration: Add platform_config table for platform-wide settings
-- This table stores a single JSON document with all platform configuration

CREATE TABLE IF NOT EXISTS platform_config (
    id TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Add RLS policies
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access (via Edge Functions)
CREATE POLICY "Service role can manage platform config" ON platform_config
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_platform_config_id ON platform_config(id);

-- Insert default settings row
INSERT INTO platform_config (id, settings)
VALUES ('platform_settings_global', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE platform_config IS 'Stores platform-wide configuration as JSON documents. Access controlled via Edge Functions.';
