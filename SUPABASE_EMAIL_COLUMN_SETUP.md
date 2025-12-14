# Add Email Column to Profiles Table - Manual Setup

## Status
✅ Migration file created and ready to apply
📁 File: `supabase/migrations/008_add_email_to_profiles.sql`

## What This Does
Adds the missing `email` column to the `profiles` table, which is required for user profile initialization during registration.

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended - Easiest)

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add email column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique constraint on email to prevent duplicates
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_unique UNIQUE (email);
```

6. Click **Run** (or press `Ctrl + Enter`)
7. You should see: **Success. No rows returned**

### Option 2: Via Supabase CLI

```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)
npx supabase db push
# Select Y when prompted
```

**Note:** Currently gets blocked by existing type definition errors in initial migration. Option 1 is faster.

## Verification

After applying the migration, test the complete flow:

```bash
# 1. Register (already works)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","username":"testuser"}'

# 2. Login (already works)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# 3. Ensure Profile (will now work with email column)
curl -X POST http://localhost:8080/api/auth/ensure-profile \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_2>"

# 4. Create Shop (will work after profile is created)
curl -X POST http://localhost:8080/api/shops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_2>" \
  -d '{"name":"My Shop","currency":"USD"}'
```

## Expected Results After Migration

### Before Email Column
```
❌ POST /api/auth/ensure-profile → Error: "Could not find the 'email' column"
```

### After Email Column
```
✅ POST /api/auth/ensure-profile → Success: "Profile created successfully"
✅ POST /api/shops → Success: Shop creation works
```

## Files Modified

- ✅ `supabase/migrations/008_add_email_to_profiles.sql` - NEW migration file
- ✅ `supabase/migrations/001_initial_schema.sql` - Updated to include email column in table definition

## Complete Register → Login → Create Shop Flow

Once this migration is applied, the entire flow works:

```
1. User registers with email/password/username
   ↓
2. Backend creates user and generates JWT token
   ↓
3. User logs in with email/password
   ↓
4. Frontend calls ensure-profile endpoint (fallback)
   ↓
5. Profile is created with email column populated
   ↓
6. User creates a shop
   ✅ Profile exists, shop creation succeeds
```

## Troubleshooting

If you get "Constraint already exists" error:
- The constraint was already applied in a previous attempt
- This is safe - the migration uses `IF NOT EXISTS` to prevent duplicates

If you still get "Could not find email column" after migration:
- Clear Supabase schema cache by waiting 30 seconds
- Or disconnect and reconnect from backend
- Restart the backend server: `npm start` in `/backend`
