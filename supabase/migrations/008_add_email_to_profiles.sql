-- ============================================
-- Add email column to profiles table
-- ============================================
-- This migration adds the missing email column to the profiles table
-- Required for user profile initialization during registration

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique constraint on email to prevent duplicates
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- ============================================
-- Migration Complete
-- ============================================
