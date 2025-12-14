# 🔐 Super Admin Setup Guide

**Created:** December 8, 2025  
**Purpose:** Step-by-step guide to implement and configure Platform Super Admin role

---

## ✅ What Was Implemented

### **Files Created/Modified:**

1. ✅ **SQL Migration:** `supabase/migrations/003_add_admin_role.sql` (180 lines)
   - Adds `is_admin` column to `profiles` table
   - Creates partial index for fast admin lookups
   - Creates `admin_audit_log` table for security tracking
   - Adds RLS policies for admin column
   - Creates `is_platform_admin()` helper function

2. ✅ **Edge Function Updated:** `supabase/functions/admin-platform-settings/index.ts`
   - Added admin role verification
   - Added 403 Forbidden response for non-admins
   - Added audit logging for all settings updates
   - Added console logging for security monitoring

3. ✅ **Edge Function Updated:** `supabase/functions/admin-operations/index.ts`
   - Added admin role verification
   - Added 403 Forbidden response for non-admins
   - Added audit logging for all admin operations (metrics, backups, cleanup)
   - Added console logging for security monitoring

---

## 📋 Step-by-Step Setup Instructions

### **STEP 1: Configure Supabase** ✅ (Should already be done)

Make sure `.env.local` has Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

If not configured, follow these steps:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy "Project URL" and "anon public" key
5. Update `.env.local`
6. Restart dev server: `npm run dev`

---

### **STEP 2: Run the Database Migration**

#### **Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if not installed
# npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Verify migration
supabase db diff
```

#### **Option B: Using Supabase Dashboard (Manual)**

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to:** SQL Editor (left sidebar)
4. **Click:** "New Query"
5. **Copy and paste** the entire contents of:
   - `supabase/migrations/003_add_admin_role.sql`
6. **Click:** "Run" button
7. **Verify:** Check for success message

#### **Verification:**

Run these queries in SQL Editor to confirm:

```sql
-- 1. Check if is_admin column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';
-- Expected: Should show is_admin column with type boolean

-- 2. Check if index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles' AND indexname = 'idx_profiles_is_admin';
-- Expected: Should show the partial index

-- 3. Check if audit log table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'admin_audit_log';
-- Expected: Should return admin_audit_log

-- 4. List all admin users (should be empty)
SELECT id, username, is_admin, created_at
FROM profiles
WHERE is_admin = true;
-- Expected: Empty result (no admins yet)
```

---

### **STEP 3: Create Your First User Account**

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open the app:** Click the preview button or navigate to http://localhost:3001

3. **Sign up** with your admin credentials:
   - Username: `your_admin_username`
   - Password: `your_secure_password`
   - **IMPORTANT:** Remember these credentials!

4. **Verify signup successful:**
   - You should be logged in
   - Dashboard should appear

---

### **STEP 4: Grant Admin Privileges to Your User**

Now you need to manually set your user as a Platform Admin.

#### **Option A: Grant Admin by Username (Easiest)**

1. Go to **Supabase Dashboard → SQL Editor**
2. Run this query:

```sql
-- Replace 'your_admin_username' with your actual username
UPDATE profiles 
SET is_admin = true 
WHERE username = 'your_admin_username';

-- Verify it worked
SELECT id, username, is_admin 
FROM profiles 
WHERE username = 'your_admin_username';
```

#### **Option B: Grant Admin by User ID**

1. First, find your user ID:

```sql
-- Find your user ID
SELECT id, username, email, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;
```

2. Copy your user ID, then run:

```sql
-- Replace with your actual user ID
UPDATE profiles 
SET is_admin = true 
WHERE id = 'your-user-uuid-here';

-- Verify
SELECT id, username, is_admin 
FROM profiles 
WHERE id = 'your-user-uuid-here';
```

#### **Option C: Grant Admin to First Created User**

```sql
-- Automatically grant admin to the very first user
UPDATE profiles 
SET is_admin = true 
WHERE id = (
    SELECT id 
    FROM profiles 
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Verify
SELECT id, username, is_admin, created_at 
FROM profiles 
WHERE is_admin = true;
```

---

### **STEP 5: Deploy Updated Edge Functions**

The Edge Functions need to be deployed to Supabase to use the new admin checking code.

#### **Using Supabase CLI:**

```bash
# Deploy admin-platform-settings function
supabase functions deploy admin-platform-settings

# Deploy admin-operations function
supabase functions deploy admin-operations

# Verify deployment
supabase functions list
```

#### **Using Supabase Dashboard:**

1. Go to **Edge Functions** in Supabase Dashboard
2. For each function (`admin-platform-settings` and `admin-operations`):
   - Click on the function
   - Click "Deploy new version"
   - Copy the code from the respective `.ts` file
   - Paste and deploy

---

### **STEP 6: Test Admin Access**

#### **Test 1: Admin User Can Access Platform Settings**

1. **Login** as your admin user
2. **Navigate** to Platform Settings (if accessible via UI)
3. **Try to update** a platform setting
4. **Expected:** ✅ Success - Settings update works

#### **Test 2: Non-Admin User Gets Blocked**

1. **Create a second user** (sign up with different username)
2. **Try to access** platform settings via Edge Function
3. **Expected:** ❌ Error - "Admin access required" (403 Forbidden)

#### **Test Using SQL:**

```sql
-- Check audit log for your admin actions
SELECT 
    admin_user_id,
    action,
    resource,
    details,
    created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 10;
```

#### **Test Using Browser DevTools:**

1. Open **Browser DevTools** (F12)
2. Go to **Console** tab
3. Look for admin log messages:
   - ✅ `Admin access granted to user: [user-id] ([username])`
   - ✅ `📝 Platform settings updated by admin: [user-id]`

---

## 🔒 Security Features Implemented

### **1. Admin Role Verification**

```typescript
// Edge Functions now check:
if (!profile.is_admin) {
  return 403 Forbidden Error
}
```

**Protection:** Non-admin users CANNOT access platform settings or admin operations.

### **2. Audit Logging**

All admin actions are logged in `admin_audit_log` table:

| Field | Description |
|-------|-------------|
| `admin_user_id` | Who performed the action |
| `action` | What action was performed |
| `resource` | What was modified |
| `details` | Additional context (JSON) |
| `ip_address` | IP address of admin |
| `user_agent` | Browser/client info |
| `created_at` | When action occurred |

**Actions Logged:**
- `update_platform_settings`
- `generate_platform_metrics`
- `create_backup`
- `cleanup_snapshots`

### **3. Row Level Security (RLS)**

```sql
-- Users can view their own admin status
CREATE POLICY "Users can view own admin status" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Only service role can modify admin status
CREATE POLICY "Only service role can modify admin status" ON profiles
FOR UPDATE USING (auth.role() = 'service_role');
```

**Protection:** Users cannot make themselves admins.

### **4. Console Logging**

All admin access is logged to Supabase Function logs:
- ✅ Successful admin access
- ❌ Unauthorized access attempts

---

## 📊 Admin Management

### **View All Platform Admins:**

```sql
SELECT 
    id,
    username,
    email,
    is_admin,
    created_at
FROM profiles
WHERE is_admin = true
ORDER BY created_at ASC;
```

### **Grant Admin to Another User:**

```sql
-- By username
UPDATE profiles 
SET is_admin = true 
WHERE username = 'new_admin_username';

-- By user ID
UPDATE profiles 
SET is_admin = true 
WHERE id = 'user-uuid-here';
```

### **Revoke Admin from User:**

```sql
-- By username
UPDATE profiles 
SET is_admin = false 
WHERE username = 'username_to_revoke';

-- By user ID
UPDATE profiles 
SET is_admin = false 
WHERE id = 'user-uuid-here';
```

### **View Admin Activity:**

```sql
-- Recent admin actions
SELECT 
    p.username,
    aal.action,
    aal.resource,
    aal.details,
    aal.created_at
FROM admin_audit_log aal
JOIN profiles p ON p.id = aal.admin_user_id
ORDER BY aal.created_at DESC
LIMIT 50;

-- Admin actions by specific user
SELECT 
    action,
    resource,
    details,
    created_at
FROM admin_audit_log
WHERE admin_user_id = 'user-uuid-here'
ORDER BY created_at DESC;

-- Count actions by type
SELECT 
    action,
    COUNT(*) as count
FROM admin_audit_log
GROUP BY action
ORDER BY count DESC;
```

---

## ⚠️ Important Security Notes

### **DO:**
- ✅ Grant admin only to trusted users
- ✅ Use strong passwords for admin accounts
- ✅ Regularly review audit logs
- ✅ Revoke admin access immediately when no longer needed
- ✅ Monitor for unauthorized access attempts

### **DON'T:**
- ❌ Share admin credentials
- ❌ Grant admin to untrusted users
- ❌ Ignore audit log warnings
- ❌ Delete audit log records (for accountability)

### **Best Practices:**
1. **Minimum number of admins** - Only grant admin to essential personnel
2. **Regular audits** - Review admin_audit_log weekly
3. **Strong passwords** - Enforce complex passwords for admin accounts
4. **Activity monitoring** - Set up alerts for suspicious admin activity
5. **Documentation** - Document why each user was granted admin

---

## 🐛 Troubleshooting

### **Problem: "Admin access required" error for admin user**

**Solution 1:** Verify admin status
```sql
SELECT id, username, is_admin 
FROM profiles 
WHERE username = 'your_username';
```
If `is_admin` is `false`, run the UPDATE query again.

**Solution 2:** Clear browser cache and re-login

**Solution 3:** Check Edge Function deployment
```bash
supabase functions list
```

---

### **Problem: Migration failed to run**

**Solution 1:** Check for syntax errors
- Copy migration file contents carefully
- Ensure no missing semicolons

**Solution 2:** Check if already applied
```sql
SELECT version FROM supabase_migrations;
```

**Solution 3:** Run individual sections
- Run the ALTER TABLE command separately
- Run the CREATE INDEX command separately
- etc.

---

### **Problem: Audit log not recording actions**

**Solution 1:** Verify table exists
```sql
SELECT * FROM admin_audit_log LIMIT 1;
```

**Solution 2:** Check Edge Function code
- Ensure audit log insert code is present
- Check for errors in function logs

**Solution 3:** Check RLS policies
```sql
-- Service role should have access
SELECT * FROM admin_audit_log 
WHERE admin_user_id = 'your-user-id';
```

---

## 📝 Migration Rollback (If Needed)

If you need to rollback the admin role system:

```sql
-- WARNING: This removes all admin functionality!

-- 1. Remove helper function
DROP FUNCTION IF EXISTS is_platform_admin(UUID);

-- 2. Remove audit log table
DROP TABLE IF EXISTS admin_audit_log;

-- 3. Remove index
DROP INDEX IF EXISTS idx_profiles_is_admin;

-- 4. Remove admin column
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- Note: You'll also need to revert the Edge Functions to their previous versions
```

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Migration applied successfully
- [ ] `is_admin` column exists in `profiles` table
- [ ] `admin_audit_log` table created
- [ ] First user has `is_admin = true`
- [ ] Edge Functions deployed with new code
- [ ] Admin user can access platform settings
- [ ] Non-admin user gets 403 error
- [ ] Audit log records admin actions
- [ ] Console logs show admin access messages

---

## 🎯 Summary

**What you've implemented:**
- ✅ Platform Super Admin role system
- ✅ Admin role verification in Edge Functions
- ✅ Security audit logging
- ✅ RLS policies for admin column
- ✅ Helper function for admin checking

**Security improvements:**
- 🔒 Only admins can access platform settings
- 🔒 Only admins can perform admin operations
- 🔒 All admin actions are logged
- 🔒 Users cannot make themselves admins

**Next steps:**
1. Regular audit log reviews
2. Consider adding admin UI panel
3. Add email notifications for admin actions
4. Implement admin activity dashboard

---

*Setup completed on: December 8, 2025*  
*Last updated: December 8, 2025*
