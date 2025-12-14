-- Add super admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Grant super admin to the two specified users
UPDATE profiles SET is_admin = TRUE 
WHERE id = '27446426-0afa-43dd-942c-bffde36ab7fa' 
   OR id = 'd89c0671-8aa2-4306-bec1-704e7aecb0c6';

-- Create admin_users table for audit trail
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Insert the two admins into admin_users table
INSERT INTO admin_users (user_id, notes) 
VALUES 
    ('27446426-0afa-43dd-942c-bffde36ab7fa', 'Super Admin - yvsa'),
    ('d89c0671-8aa2-4306-bec1-704e7aecb0c6', 'Super Admin - vozz')
ON CONFLICT (user_id) DO NOTHING;

-- RLS Policies for super admin access
CREATE POLICY "Users can view their own admin status" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can modify admin status" ON profiles
FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view all profiles" ON profiles
FOR SELECT USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE is_admin = TRUE
    )
);
