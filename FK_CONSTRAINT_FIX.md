# Fix Foreign Key Constraint Error

## Problem
When trying to create a user profile, you get error:
```
insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"
```

## Root Cause
The `profiles` table's foreign key references `auth.users(id)`, but the backend creates users in the custom `users` table. These are **two completely different tables**:

- `auth.users` - Supabase's built-in authentication table
- `users` - Custom application table for business logic

When you register via the backend:
1. User is created in custom `users` table ✅
2. Profile tries to reference `auth.users` ❌ (doesn't exist there)
3. Foreign key constraint violation

## Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop the old foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT profiles_id_fkey;

-- Add the new foreign key constraint referencing the custom users table
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
```

## Steps

1. Go to: https://app.supabase.com/
2. Select your project
3. **SQL Editor** (left sidebar)
4. **New Query**
5. Copy-paste the SQL above
6. Click **Run**
7. Expected output: **Success. No rows returned**

## After Applying the Fix

The complete flow will work:

```
1. Register (POST /api/auth/register)
   ↓ Creates user in custom 'users' table ✅
2. Login (POST /api/auth/login)
   ↓ Returns JWT token ✅
3. Ensure Profile (POST /api/auth/ensure-profile)
   ↓ Creates profile referencing custom 'users' table ✅
4. Create Shop (POST /api/shops)
   ↓ Shop creation succeeds ✅
```

## Files Changed

- ✅ `supabase/migrations/001_initial_schema.sql` - Updated to reference custom `users` table
- ✅ `supabase/migrations/009_fix_profiles_fk.sql` - NEW migration to apply the fix
- ✅ `backend/routes/auth.ts` - Fixed registration to prioritize Supabase user creation
- ✅ `backend/routes/auth.js` - Updated compiled JavaScript

## Current Status

**Backend**: ✅ Ready to handle register → login → profile creation → shop creation flow

**Database**: ⏳ Waiting for you to apply the foreign key fix in Supabase SQL Editor

Once you apply the SQL, test with:

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"Password123","username":"newuser"}'

# 2. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"Password123"}'

# 3. Ensure Profile (use token from login)
curl -X POST http://localhost:8080/api/auth/ensure-profile \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_2>"

# 4. Create Shop (use token from login)
curl -X POST http://localhost:8080/api/shops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_2>" \
  -d '{"name":"My Shop","currency":"USD"}'
```

All four endpoints should now work end-to-end! ✅
