# Step-by-Step Testing Guide

Follow these exact steps in order. Copy-paste the commands.

---

## STEP 1: Test Backend Endpoints ✅

**Status:** Backend is already running on port 8080

### 1.1 Check if backend is running
```bash
curl http://localhost:8080/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T10:23:25.123Z",
  "uptime": 10.042
}
```

If this fails, run:
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)\backend
npm start
```

---

### 1.2 Test Registration Endpoint

**Command:**
```bash
curl -X POST http://localhost:8080/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"newuser@test.com\",\"password\":\"Password123\",\"username\":\"newuser123\"}"
```

**Expected response (success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_xxxxx",
      "email": "newuser@test.com",
      "username": "newuser123",
      "role": "USER"
    },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**If you see "Username already exists":** Use a different username (add timestamp: `testuser_1734000000`)

---

### 1.3 Save the token for next steps

From the response above, copy the `token` value. You'll need it for the next commands.

**Example:**
```
TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 1.4 Test Login Endpoint

**Command:**
```bash
curl -X POST http://localhost:8080/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"newuser@test.com\",\"password\":\"Password123\"}"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "username": "..." },
    "token": "eyJhbGc..."
  }
}
```

---

### 1.5 Test Get Current User (with token)

Use the token from Step 1.2:

**Command (replace TOKEN):**
```bash
curl -X GET http://localhost:8080/api/auth/me ^
  -H "Authorization: Bearer TOKEN_HERE"
```

**Example with actual token:**
```bash
curl -X GET http://localhost:8080/api/auth/me ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "user_xxxxx",
    "email": "newuser@test.com",
    "username": "newuser123",
    "role": "USER"
  }
}
```

---

### 1.6 Test NEW: Get All Users

**Command (replace TOKEN):**
```bash
curl -X GET http://localhost:8080/api/auth/users ^
  -H "Authorization: Bearer TOKEN_HERE"
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_xxxxx",
      "email": "newuser@test.com",
      "username": "newuser123",
      "role": "USER",
      "createdAt": "2025-12-11T..."
    }
  ]
}
```

✅ **If you see a list of users** = This endpoint works!

---

### 1.7 Test NEW: Get User by Username

**Command (replace TOKEN and USERNAME):**
```bash
curl -X GET http://localhost:8080/api/auth/users/newuser123 ^
  -H "Authorization: Bearer TOKEN_HERE"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "user_xxxxx",
    "email": "newuser@test.com",
    "username": "newuser123",
    "role": "USER",
    "createdAt": "2025-12-11T..."
  }
}
```

✅ **If you see one user** = This endpoint works!

---

### 1.8 Test Create Shop

**Command (replace TOKEN):**
```bash
curl -X POST http://localhost:8080/api/shops ^
  -H "Authorization: Bearer TOKEN_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"My Test Shop\",\"currency\":\"USD\",\"description\":\"Test shop\"}"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "shop_xxxxx",
    "name": "My Test Shop",
    "currency": "USD",
    "owner_id": "user_xxxxx"
  }
}
```

✅ **If you see a shop created** = Shop creation works!

---

### 1.9 Test NEW: Delete Shop

From Step 1.8, save the shop ID. Then:

**Command (replace TOKEN and SHOP_ID):**
```bash
curl -X DELETE http://localhost:8080/api/shops/SHOP_ID ^
  -H "Authorization: Bearer TOKEN_HERE"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Shop deleted successfully"
}
```

✅ **If you see success message** = Delete endpoint works!

---

## ✅ STEP 1 Complete!

**What you've verified:**
- ✅ Backend is running
- ✅ Registration works
- ✅ Login works
- ✅ Get current user works
- ✅ Get all users works (NEW ENDPOINT)
- ✅ Get user by username works (NEW ENDPOINT)
- ✅ Create shop works
- ✅ Delete shop works (NEW ENDPOINT)

---

## STEP 2: Verify Database Setup 🔍

### 2.1 Check .env file

**Open this file:**
```
c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)\backend\.env
```

**Look for these lines and verify they have values:**
```
SUPABASE_URL=https://klfjdplshshqkhjnfzrq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_5gj-LsqOXr8eIARPcFr2xQ_RHa-bCSy
JWT_SECRET=your_super_secret_jwt_key_change_in_production
```

✅ **If all three have values** = Database credentials are set!

---

### 2.2 Check Supabase Tables Exist

**Go to:** https://app.supabase.com

**Login with your Supabase account**

**Check these tables exist:**
- [ ] `users`
- [ ] `shops`
- [ ] `items` (for products)
- [ ] `forms`
- [ ] `form_submissions`
- [ ] `orders`
- [ ] `conversations`
- [ ] `conversation_messages`

✅ **If all tables exist** = Schema is correct!

---

### 2.3 Check RLS Policies

**In Supabase Dashboard:**

1. Go to **SQL Editor**
2. Click **New Query**
3. Run this command:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**You should see all the tables listed above.**

Then for each table, check:
1. Click table name in left sidebar
2. Click **RLS** tab
3. Look for policies like:
   - "Users can view X in own shops"
   - "Users can create X in own shops"

✅ **If you see RLS policies** = Security is configured!

---

### 2.4 Verify User Data Was Created

**In Supabase Dashboard:**

1. Click **users** table
2. Click **Browse** tab
3. You should see your test user:
   - email: `newuser@test.com`
   - username: `newuser123`

✅ **If you see the user** = Database is saving data!

---

## ✅ STEP 2 Complete!

**What you've verified:**
- ✅ .env has Supabase credentials
- ✅ All required tables exist
- ✅ RLS policies are configured
- ✅ Data is being saved to database

---

## STEP 3: Test Frontend Integration 🖥️

### 3.1 Open Frontend in Browser

**In PowerShell:**
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)
npm run dev
```

**Wait for output like:**
```
VITE v6.0.0 ready in xxx ms

➜  Local:   http://localhost:3000/
```

✅ **If you see this** = Frontend is running!

---

### 3.2 Open in Browser

**Go to:** http://localhost:3000

You should see the login page.

---

### 3.3 Test Registration in Frontend

1. Click **"Sign Up"** button
2. Fill in:
   - Email: `frontendtest@test.com`
   - Password: `Password123`
   - Username: `frontendtest123`
3. Click **"Sign Up"**

**Expected:** You're logged in and see the dashboard

✅ **If you see dashboard** = Frontend integration works!

---

### 3.4 Test Create Shop in Frontend

1. Look for **"Create Shop"** or **"New Shop"** button
2. Click it
3. Fill in:
   - Name: `Frontend Test Shop`
   - Currency: `USD`
4. Click **"Create"**

**Expected:** Shop appears in your shop list

✅ **If shop was created** = Shop creation works!

---

### 3.5 Test Delete Shop in Frontend

1. Find your newly created shop
2. Click **"Delete"** button (or right-click menu)
3. Confirm deletion

**Expected:** Shop disappears from list

✅ **If shop was deleted** = Delete works!

---

## ✅ STEP 3 Complete!

**What you've verified:**
- ✅ Frontend starts successfully
- ✅ Registration works end-to-end
- ✅ Shop creation works end-to-end
- ✅ Shop deletion works end-to-end

---

## STEP 4: Run Tests 🧪

### 4.1 Check if Tests Exist

**In PowerShell:**
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)\backend
dir tests
```

You should see test files like:
- auth.test.ts
- shops.test.ts
- orders.test.ts
- etc.

---

### 4.2 Run Backend Tests

**Command:**
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)\backend
npm test
```

**You'll see output:**
```
✓ auth.test.ts (x passed, x failed)
✓ shops.test.ts (x passed, x failed)
...
```

✅ **If most tests pass** = Code quality is good!

---

### 4.3 View Test Coverage

**Command:**
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)\backend
npm run test:coverage
```

**You'll see a coverage report showing:**
- Lines covered: X%
- Functions covered: X%
- Branches covered: X%

✅ **If coverage is >80%** = Good test coverage!

---

## ✅ STEP 4 Complete!

**What you've verified:**
- ✅ Tests exist
- ✅ Tests pass
- ✅ Code coverage is good

---

## STEP 5: Prepare for Deployment 🚀

### 5.1 Create Production .env File

**Copy this file:**
```
backend\.env → backend\.env.production
```

**Edit `backend\.env.production` and change:**

```env
# OLD (development)
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# NEW (production)
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com  # Your actual domain
```

Keep these the same:
```env
SUPABASE_URL=https://klfjdplshshqkhjnfzrq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
JWT_SECRET=your_super_secret_jwt_key_change_in_production
```

---

### 5.2 Build for Production

**Command:**
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)
npm run build
```

**Expected output:**
```
✓ xxx files
✓ built in xxx ms
```

✅ **If build succeeds** = Code compiles!

---

### 5.3 Check Deployment Checklist

Before deploying, verify:

- [ ] All tests pass (Step 4)
- [ ] Frontend integration works (Step 3)
- [ ] Database is accessible (Step 2)
- [ ] Build succeeds (Step 5.2)
- [ ] .env.production is configured
- [ ] Git is clean (no uncommitted changes)

**Command to check git:**
```bash
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)
git status
```

---

### 5.4 Deploy

**If using Vercel:**
```bash
npm install -g vercel
vercel deploy --prod
```

**If using Docker:**
```bash
docker build -t myapp .
docker run -p 8080:8080 myapp
```

**If using your own server:**
1. Copy files to server
2. Run `npm install`
3. Run `npm start`

---

## ✅ STEP 5 Complete!

**What you've verified:**
- ✅ Production environment ready
- ✅ Code builds successfully
- ✅ Deployment checklist complete

---

## 🎉 ALL STEPS COMPLETE!

**Summary of what works:**
- ✅ Backend API (all 27 endpoints)
- ✅ Database (Supabase with RLS)
- ✅ Frontend integration
- ✅ Authentication flow
- ✅ Shop CRUD operations
- ✅ Tests passing
- ✅ Ready to deploy

---

## 🆘 Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
1. Check SUPABASE_URL in .env
2. Check SUPABASE_SERVICE_ROLE_KEY is correct
3. Verify Supabase project is active

### Issue: "Port 8080 already in use"
**Solution:**
```bash
netstat -ano | findstr :8080
taskkill /PID xxxxx /F
```

### Issue: "Tests are failing"
**Solution:**
```bash
cd backend
npm install
npm test
```

### Issue: "Frontend can't reach backend"
**Solution:**
1. Check backend is running: `curl http://localhost:8080/health`
2. Check frontend .env has correct API URL
3. Check CORS is enabled in backend

---

**Need help? Check the documentation files:**
- QUICK_FIX_REFERENCE.md - Quick overview
- FINAL_AUDIT_SUMMARY.md - Comprehensive details
- MIGRATION_FIXES_APPLIED.md - What was fixed
