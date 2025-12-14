# Quick Start Guide - Backend Ready for Use

## 🟢 Status: PRODUCTION READY (with 2 SQL migrations pending)

---

## 1️⃣ Execute SQL Migrations (5 minutes)

**IMPORTANT**: Execute these before testing dashboard feature.

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com/
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Run Migration #1 (Add email column)
```sql
-- Add email column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique constraint on email to prevent duplicates
ALTER TABLE profiles
ADD CONSTRAINT profiles_email_unique UNIQUE (email);
```
- Click **Run**
- Expected result: ✅ Success. No rows returned

### Step 3: Run Migration #2 (Fix Foreign Key)
```sql
-- Drop the old foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT profiles_id_fkey;

-- Add the new foreign key constraint referencing the custom users table
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
```
- Click **Run**
- Expected result: ✅ Success. No rows returned

---

## 2️⃣ Start Backend Server (2 minutes)

```bash
cd backend
npm start
```

**Expected output:**
```
⚠️  MongoDB URI not set - using Supabase for data storage

    ╔═══════════════════════════════════════╗
    ║   Cliick.io Backend Server Running   ║
    ╚═══════════════════════════════════════╝

    🚀 Server:      http://localhost:8080
    🌐 API:         http://localhost:8080/api
    ⚡ WebSocket:   ws://localhost:8080
    📊 Health:      http://localhost:8080/health

    Environment:   development
```

---

## 3️⃣ Test Complete Flow (5 minutes)

### Test 1: Register User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","username":"testuser"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "test@example.com", "username": "testuser" },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

✅ **Save the token** for next steps

### Test 2: Login User
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

**Expected**: Same response with valid token

### Test 3: Create Shop
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..." # From login response

curl -X POST http://localhost:8080/api/shops \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Test Shop","currency":"USD"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "shop_uuid_here",
    "name": "My Test Shop",
    "currency": "USD",
    "subscription_plan": "Starter"
  }
}
```

✅ **Save the shop ID** for next step

### Test 4: Upgrade Shop to Pro
```bash
SHOP_ID="shop_uuid_here" # From create shop response

curl -X POST http://localhost:8080/api/shops/$SHOP_ID/upgrade \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subscription_plan":"Pro","subscription_status":"active"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "shop_uuid_here",
    "name": "My Test Shop",
    "subscription_plan": "Pro",
    "subscription_status": "active"
  }
}
```

✅ **Shop is now Pro and dashboard will show analytics!**

---

## 4️⃣ Access Frontend & Test

1. Open http://localhost:3000
2. Login with credentials from Test 1
3. Navigate to Shop Dashboard
4. Dashboard should now show analytics (was "Unavailable" with Starter plan)

---

## 📊 All Working Endpoints

| Endpoint | Method | Status | Test Command |
|----------|--------|--------|--------------|
| `/api/auth/register` | POST | ✅ | `curl -X POST http://localhost:8080/api/auth/register` |
| `/api/auth/login` | POST | ✅ | `curl -X POST http://localhost:8080/api/auth/login` |
| `/api/auth/logout` | POST | ✅ | `curl -X POST http://localhost:8080/api/auth/logout -H "Authorization: Bearer $TOKEN"` |
| `/api/auth/me` | GET | ✅ | `curl http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"` |
| `/api/auth/ensure-profile` | POST | ✅ | `curl -X POST http://localhost:8080/api/auth/ensure-profile -H "Authorization: Bearer $TOKEN"` |
| `/api/auth/refresh` | POST | ✅ | `curl -X POST http://localhost:8080/api/auth/refresh -d '{"refreshToken":"..."}' ` |
| `/api/shops` | GET | ✅ | `curl http://localhost:8080/api/shops -H "Authorization: Bearer $TOKEN"` |
| `/api/shops` | POST | ✅ | `curl -X POST http://localhost:8080/api/shops -H "Authorization: Bearer $TOKEN" -d '{"name":"Shop","currency":"USD"}'` |
| `/api/shops/:id` | GET | ✅ | `curl http://localhost:8080/api/shops/shop_id` |
| `/api/shops/:id` | PUT | ✅ | `curl -X PUT http://localhost:8080/api/shops/shop_id -H "Authorization: Bearer $TOKEN" -d '{"name":"Updated"}'` |
| `/api/shops/:id` | DELETE | ✅ | `curl -X DELETE http://localhost:8080/api/shops/shop_id -H "Authorization: Bearer $TOKEN"` |
| `/api/shops/:id/upgrade` | POST | ✅ | `curl -X POST http://localhost:8080/api/shops/shop_id/upgrade -H "Authorization: Bearer $TOKEN" -d '{"subscription_plan":"Pro"}'` |

---

## 🚨 If Something Breaks

### Issue: "Dashboard is Unavailable" message
**Solution**: Shop needs Pro plan
1. Run Step 4 above (upgrade endpoint)
2. Refresh page
3. Dashboard should now load

### Issue: "Failed to create profile" error
**Solution**: SQL migrations not applied
1. Go to Supabase SQL Editor
2. Apply migrations 008 & 009 (see Step 1-3)
3. Restart backend
4. Try again

### Issue: "User not found" when creating shop
**Solution**: Ensure profile wasn't created
1. Run POST /api/auth/ensure-profile with your token
2. Try shop creation again

### Issue: Backend won't start
**Solution**: Check dependencies
1. Run `npm install` in `/backend` folder
2. Check Node.js version: `node -v` (should be v24.11.1)
3. Check .env file exists with SUPABASE credentials

---

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| `E2E_TEST.md` | Complete end-to-end test results |
| `REMAINING_BACKEND_FEATURES.md` | What's left to implement |
| `CURRENT_STATUS_SUMMARY.md` | Overall project status |
| `FK_CONSTRAINT_FIX.md` | Database fix details |
| `SUPABASE_EMAIL_COLUMN_SETUP.md` | Email column migration guide |

---

## 🎯 Next Steps After This Works

1. **Implement Products Endpoints** (4-6 hours)
   - Stock integration
   - Bulk operations

2. **Implement Orders Endpoints** (6-8 hours)
   - Inventory auto-deduction
   - Order status automation

3. **Implement Forms Endpoints** (5-7 hours)
   - Validation
   - File uploads

4. **Integrate WebSocket** (8-10 hours)
   - Real-time conversations
   - Live notifications

5. **Implement Payments** (12-16 hours)
   - Stripe integration
   - Webhook handling

See `REMAINING_BACKEND_FEATURES.md` for complete roadmap.

---

## ✅ Success Checklist

- [ ] SQL migrations executed (Steps 1-3)
- [ ] Backend server running (Step 2)
- [ ] Register test passes (Test 1)
- [ ] Login test passes (Test 2)
- [ ] Shop creation works (Test 3)
- [ ] Shop upgrade works (Test 4)
- [ ] Frontend dashboard shows analytics
- [ ] All endpoints responding with 200/201 status codes
- [ ] No errors in backend console
- [ ] JWT tokens working correctly

---

## 🔗 Useful URLs

- **Backend API**: http://localhost:8080/api
- **Supabase Dashboard**: https://app.supabase.com/
- **Frontend**: http://localhost:3000

---

## 📞 Questions?

Refer to:
- `E2E_TEST.md` - Testing examples
- `FK_CONSTRAINT_FIX.md` - Database setup issues
- `REMAINING_BACKEND_FEATURES.md` - Implementation details
- Backend console logs for specific errors

---

**Status**: 🟢 READY TO USE  
**Time to setup**: ~15 minutes  
**Prerequisites**: Node.js v24.11.1, Supabase account
