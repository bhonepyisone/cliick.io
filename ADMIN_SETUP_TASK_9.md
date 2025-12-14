# 🔐 Task 9: Admin Dashboard Fix & TokenAnalyticsPanel Setup

**Status:** Ready for Implementation  
**Blocking Issue:** 401 Unauthorized on admin-platform-settings Edge Function  
**Root Cause:** User profile missing `is_admin = true` flag  
**Timeline:** 10-15 minutes to complete

---

## ✅ What's Already In Place

### **1. Database Migration** ✅
- File: `supabase/migrations/003_add_admin_role.sql`
- Adds `is_admin` column to `profiles` table
- Creates admin_audit_log table for security tracking
- Status: **Ready to apply**

### **2. Edge Functions** ✅
- File: `supabase/functions/admin-platform-settings/index.ts`
- File: `supabase/functions/admin-operations/index.ts`
- Both already have admin role checking (lines 40-65)
- Return 403 Forbidden for non-admins
- Status: **Already deployed**

### **3. Token Analytics Panel** ✅
- File: `components/TokenAnalyticsPanel.tsx`
- Full implementation with real-time cost display
- Status: **Ready but blocked by 401 error**

---

## 📋 Step-by-Step Fix

### **Step 1: Verify Migrations Are Applied** (2 minutes)

Go to **Supabase Dashboard → SQL Editor** and run this verification query:

```sql
-- Check if is_admin column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';
```

**Expected Result:** Should show `is_admin` as a BOOLEAN column with DEFAULT false

**If it returns empty:** The migration hasn't been applied. Run all migration files in order:
- `001_initial_schema.sql`
- `002_platform_config.sql`
- `003_add_admin_role.sql`

---

### **Step 2: Get Your User Information** (1 minute)

Run this query to find your user ID:

```sql
-- Find your profile
SELECT id, username, email, is_admin, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
```

**Note down:**
- Your **username** (e.g., "admin", "vozz", "yvsa")
- Your **user ID** (UUID format)
- Current **is_admin** value (should be FALSE)

---

### **Step 3: Grant Admin Privileges** (1 minute)

Choose **ONE** of the following options to grant yourself admin access:

#### **Option A: Grant by Username (Easiest)**

```sql
-- Replace 'your_username' with YOUR actual username from Step 2
UPDATE profiles 
SET is_admin = true 
WHERE username = 'your_username';

-- Verify it worked
SELECT id, username, is_admin 
FROM profiles 
WHERE username = 'your_username';
```

#### **Option B: Grant by User ID**

```sql
-- Replace 'your-user-uuid-here' with YOUR user ID from Step 2
UPDATE profiles 
SET is_admin = true 
WHERE id = 'your-user-uuid-here';

-- Verify it worked
SELECT id, username, is_admin 
FROM profiles 
WHERE id = 'your-user-uuid-here';
```

#### **Option C: Grant to First Created User**

```sql
-- Automatically grant admin to the first user created
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

**Expected Result:** `is_admin` column should now show `TRUE` ✅

---

### **Step 4: Clear Browser Cache & Re-Login** (2 minutes)

1. **In your browser:**
   - Press `F12` to open Developer Tools
   - Go to **Application** tab
   - Click **Storage** → **Local Storage**
   - Delete all entries (or clear cache)

2. **In the app:**
   - Log out (if logged in)
   - Close the browser tab
   - Open a new tab and navigate to http://localhost:3001
   - Log in again with your credentials

3. **Expected Result:**
   - ✅ Dashboard loads without errors
   - ✅ Admin icon appears in header (if implemented)
   - ✅ TokenAnalyticsPanel is accessible

---

### **Step 5: Verify Admin Access Works** (2 minutes)

**In Supabase Dashboard → SQL Editor**, check the admin audit log:

```sql
-- View recent admin access attempts
SELECT 
    admin_user_id,
    action,
    resource,
    details,
    ip_address,
    created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:** Should show your admin actions (if any)

---

## 🧪 Test Token Analytics Panel

Once admin access is confirmed:

1. **Navigate to Admin Dashboard**
   - URL: http://localhost:3001/admin (if routing is configured)
   - Or check Settings → Admin Panel

2. **Look for Token Analytics Panel**
   - Should display real-time token costs
   - Shows cost per operation type (chat, product, photo, suggestion)
   - Displays daily/monthly spending projections

3. **Expected Data:**
   - Summary cards with token metrics
   - Operation type breakdown
   - Cost analysis by message type
   - Profit margin calculator

---

## 🔒 Security Features Enabled

With the admin setup complete, you now have:

✅ **Admin Role Verification** - Only `is_admin = true` users can access:
   - Platform settings management
   - Admin dashboard
   - Token analytics
   - Backup operations

✅ **Audit Logging** - All admin actions logged to `admin_audit_log` table:
   - Admin access attempts
   - Settings updates
   - Backup operations
   - User grants/revokes

✅ **Row-Level Security (RLS)**
   - Users can view their own admin status
   - Only service role can modify admin status
   - Prevents unauthorized privilege escalation

---

## 🚨 Troubleshooting

### **Problem: Still Getting 401 Error**

**Solution 1:** Verify is_admin is TRUE

```sql
SELECT id, username, is_admin 
FROM profiles 
WHERE username = 'your_username';
-- Must show is_admin = TRUE
```

**Solution 2:** Clear browser cache completely

- DevTools → Application → Clear All
- Close all tabs with the app
- Open fresh tab and log in again

**Solution 3:** Check Edge Function deployment

```bash
# If you have Supabase CLI:
supabase functions list

# Should show:
# admin-platform-settings (deployed)
# admin-operations (deployed)
```

### **Problem: Migration Not Applied**

Run the complete migration sequence:

```sql
-- First, verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Then check for is_admin column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_admin';
```

If column doesn't exist, go to Supabase Dashboard → SQL Editor and paste the entire contents of:
`supabase/migrations/003_add_admin_role.sql`

---

## ✨ After Fix Verification Checklist

- [ ] `is_admin = true` set in profiles table
- [ ] Browser cache cleared
- [ ] Logged out and logged back in
- [ ] Admin Dashboard loads without 401 errors
- [ ] TokenAnalyticsPanel visible and displaying data
- [ ] Can view Token Analytics by operation type
- [ ] Cost calculations showing correctly

---

## 📊 Related Features Now Available

With admin access, you can now:

1. **View Token Analytics** - Real-time token consumption tracking
2. **Configure Token Limits** (TokenLimitsPanel) - Set per-message and budget limits
3. **Run Test Suite** - tokenConsumptionTestHarness utility available
4. **Manage Pricing** - Configure billing tiers and rates
5. **Monitor Costs** - Project monthly spending based on usage

---

## 🚀 Next Steps (Task 10)

After admin access is confirmed, proceed to **Task 10: Integration Testing**:
- Verify pricingService calls during API requests
- Test billing record generation
- Validate shop token limit enforcement
- Confirm cost calculations are accurate

---

**Questions?** Check SUPER_ADMIN_SETUP_GUIDE.md for additional detail
