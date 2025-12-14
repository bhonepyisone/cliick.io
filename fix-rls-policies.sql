-- Fix RLS policies for profiles table to allow admin access
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily (IMMEDIATE FIX)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Once working, re-enable with proper policies
-- Uncomment the lines below after confirming admin access works:

-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- 
-- -- Drop all existing policies
-- DROP POLICY IF EXISTS "allow_all_authenticated_select" ON profiles;
-- DROP POLICY IF EXISTS "allow_own_insert" ON profiles;
-- DROP POLICY IF EXISTS "allow_own_update" ON profiles;
-- 
-- -- Create new policies that allow authenticated users to read all profiles
-- CREATE POLICY "allow_all_authenticated_select"
-- ON profiles FOR SELECT 
-- TO authenticated 
-- USING (true);
-- 
-- -- Allow users to insert their own profile
-- CREATE POLICY "allow_own_insert"
-- ON profiles FOR INSERT 
-- TO authenticated 
-- WITH CHECK (auth.uid() = id);
-- 
-- -- Allow users to update their own profile
-- CREATE POLICY "allow_own_update"
-- ON profiles FOR UPDATE 
-- TO authenticated 
-- USING (auth.uid() = id);
