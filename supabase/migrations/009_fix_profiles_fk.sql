-- ============================================
-- Fix profiles foreign key constraint
-- ============================================
-- Change profiles table to reference the custom 'users' table instead of 'auth.users'
-- This aligns with the application's data model

-- Drop the old foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT profiles_id_fkey;

-- Add the new foreign key constraint referencing the custom users table
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- Migration Complete
-- ============================================
