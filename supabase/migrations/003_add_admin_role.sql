-- ============================================
-- Migration: Add Platform Admin Role System
-- ============================================
-- This migration adds the is_admin column to profiles table
-- to enable platform-wide administrative access control.
--
-- Created: December 8, 2025
-- Purpose: Implement Super Admin role for platform settings management

-- ============================================
-- 1. ADD ADMIN COLUMN TO PROFILES
-- ============================================

-- Add is_admin boolean column with default false
ALTER TABLE profiles 
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.is_admin IS 
'Platform admin flag. When true, user has access to platform-wide settings, metrics, and admin operations via Edge Functions.';

-- ============================================
-- 2. CREATE INDEX FOR PERFORMANCE
-- ============================================

-- Partial index only on admin users for fast lookups
-- This is efficient because very few users will be admins
CREATE INDEX idx_profiles_is_admin 
ON profiles(is_admin) 
WHERE is_admin = true;

-- Add comment on index
COMMENT ON INDEX idx_profiles_is_admin IS 
'Partial index for fast admin user lookups. Only indexes rows where is_admin = true.';

-- ============================================
-- 3. ADD RLS POLICY FOR ADMIN COLUMN
-- ============================================

-- Users can view their own admin status
-- This policy allows users to check if they're an admin
CREATE POLICY "Users can view own admin status" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Only service role can modify admin status
-- This prevents users from making themselves admins
CREATE POLICY "Only service role can modify admin status" 
ON profiles 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- ============================================
-- 4. CREATE ADMIN AUDIT LOG TABLE (OPTIONAL)
-- ============================================

-- Table to track admin actions for security auditing
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'update_platform_settings', 'create_backup'
    resource TEXT, -- e.g., 'platform_settings_global', 'backup_snapshot_123'
    details JSONB, -- Additional context about the action
    ip_address INET, -- IP address of the admin
    user_agent TEXT, -- Browser/client information
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role can access audit logs" 
ON admin_audit_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Index for fast lookups by admin user
CREATE INDEX idx_admin_audit_log_user 
ON admin_audit_log(admin_user_id, created_at DESC);

-- Index for fast lookups by action type
CREATE INDEX idx_admin_audit_log_action 
ON admin_audit_log(action, created_at DESC);

-- Add comments
COMMENT ON TABLE admin_audit_log IS 
'Audit trail for all platform admin actions. Provides security and accountability for administrative operations.';

COMMENT ON COLUMN admin_audit_log.action IS 
'Type of admin action performed (e.g., update_platform_settings, create_backup, generate_metrics)';

COMMENT ON COLUMN admin_audit_log.details IS 
'JSON object containing additional context about the action, such as changed fields or parameters';

-- ============================================
-- 5. CREATE HELPER FUNCTION TO CHECK ADMIN
-- ============================================

-- Function to check if a user is an admin
-- This can be called from other database functions or triggers
CREATE OR REPLACE FUNCTION is_platform_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin_flag BOOLEAN;
BEGIN
    SELECT is_admin INTO is_admin_flag
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(is_admin_flag, false);
END;
$$;

-- Add comment
COMMENT ON FUNCTION is_platform_admin IS 
'Helper function to check if a user has platform admin privileges. Returns true if user is admin, false otherwise.';

-- ============================================
-- 6. GRANT FIRST USER ADMIN (MANUAL STEP)
-- ============================================

-- NOTE: After running this migration, you MUST manually grant admin
-- to your first user by running ONE of these commands:

-- Option A: Grant admin by username
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE username = 'your_first_username';

-- Option B: Grant admin by user ID
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE id = 'your-user-uuid-here';

-- Option C: Grant admin to the first created user
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- To verify the migration worked, run these queries:

-- 1. Check if column was added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'is_admin';

-- 2. Check if index was created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'profiles' AND indexname = 'idx_profiles_is_admin';

-- 3. Check if audit log table was created
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_name = 'admin_audit_log';

-- 4. List all admin users (should be empty initially)
-- SELECT id, username, is_admin, created_at
-- FROM profiles
-- WHERE is_admin = true;

-- ============================================
-- ROLLBACK SCRIPT (IF NEEDED)
-- ============================================

-- If you need to rollback this migration, run:
-- DROP FUNCTION IF EXISTS is_platform_admin(UUID);
-- DROP TABLE IF EXISTS admin_audit_log;
-- DROP INDEX IF EXISTS idx_profiles_is_admin;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;
