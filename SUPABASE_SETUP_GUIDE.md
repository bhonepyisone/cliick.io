# Supabase Database Setup Guide

## Quick Start - 3 Steps

### Step 1: Go to Supabase Dashboard

1. Open https://app.supabase.com
2. Login with your account
3. Select your project: **klfjdplshshqkhjnfzrq**
4. Go to **SQL Editor** (left sidebar)

### Step 2: Run Database Schema

1. Click **"New Query"** button
2. Copy entire content from: `backend/database-schema.sql`
3. Paste into the SQL editor
4. Click **"Run"** button (green play icon)
5. Wait for completion (should complete in seconds)

**What gets created:**
- ✅ users table
- ✅ shops table  
- ✅ items table (products)
- ✅ forms table
- ✅ form_submissions table
- ✅ conversations table
- ✅ conversation_messages table
- ✅ orders table
- ✅ notifications table
- ✅ Row Level Security (RLS) policies on all tables
- ✅ Performance indexes

### Step 3: Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see all 9 tables listed
3. Click on each table to verify it has data (should be empty, that's correct)

---

## What the Schema Does

### Row Level Security (RLS)
Every table has RLS enabled. This means:
- **Users can ONLY see their own shops**
- **Users can ONLY see conversations/orders/forms from their shops**
- **Data is isolated at the database level** (not just the app)
- **Backend cannot accidentally expose other users' data**

### Example: How RLS Works for Items

When a user requests items for their shop:
```sql
SELECT * FROM items WHERE shop_id = 'user-shop-id'
```

The RLS policy automatically ensures the backend can only access items where the shop is owned by that user.

---

## Troubleshooting

### Error: "Table already exists"
**Solution:** The tables are already created. This is fine. Just close the query.

### Error: "Permission denied"
**Solution:** Make sure you're running the query as a **Service Role** authenticated user (which the backend is).

### Tables not showing up
**Solution:** 
1. Refresh the page (F5)
2. Go to **Table Editor**
3. Click **"Refresh"** icon

### Can't find Project Ref
**Solution:** Your project ref is in the `.env` file: `klfjdplshshqkhjnfzrq`

---

## Verify Connection from Backend

After tables are created, test the connection:

```bash
cd backend
npm start
```

You should see:
```
⚠️  MongoDB URI not set - using Supabase for data storage
🚀 Server:      http://localhost:8080
🌐 API:         http://localhost:8080/api
```

Test an endpoint:
```bash
curl http://localhost:8080/health
```

Response should be:
```json
{"status":"healthy","timestamp":"2025-12-10T18:30:00Z","uptime":5.234}
```

---

## Test Data Creation (Optional)

You can manually insert test data in Supabase:

### 1. Create a Test User

Go to **SQL Editor** and run:
```sql
INSERT INTO users (email, username, password_hash, role)
VALUES (
  'test@example.com',
  'testuser',
  '$2a$10$...hashedpassword...',
  'USER'
);
```

### 2. Create a Test Shop

```sql
INSERT INTO shops (name, description, owner_id, currency)
VALUES (
  'Test Shop',
  'My first shop',
  (SELECT id FROM users WHERE email = 'test@example.com'),
  'USD'
);
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Run database-schema.sql in Supabase
- [ ] Verify all 9 tables exist
- [ ] Verify RLS policies are enabled
- [ ] Test backend can connect: `npm start`
- [ ] Test API endpoints with curl
- [ ] Update JWT_SECRET in backend/.env (generate strong key)
- [ ] Update SUPABASE_SERVICE_ROLE_KEY (verify it's correct)
- [ ] Test user registration and login flow
- [ ] Test shop creation and data isolation

---

## Need Help?

1. Check Supabase logs: **Logs** → **Recent Events**
2. Test query: Run `SELECT * FROM users;` to see current data
3. Check RLS: Go to **Authentication** → **Policies** to view RLS rules

---

## Next Steps

1. ✅ Run the database schema (database-schema.sql)
2. ✅ Start backend: `npm run dev`
3. ✅ Start frontend: `npm run dev` 
4. ✅ Test registration at http://localhost:3000
5. ✅ Deploy to production!
