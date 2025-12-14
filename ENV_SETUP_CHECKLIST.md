# 🔐 Environment Variables Setup Checklist

**Status:** Ready for Configuration  
**Date:** December 10, 2025  
**Priority:** CRITICAL - Must complete before running app

---

## 📋 Quick Setup (5 minutes)

### **Step 1: Copy the Example File**

Run this command in your project root:

```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# Or Linux/Mac
cp .env.example .env.local
```

### **Step 2: Get Your Gemini API Key (Required)**

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)
5. Add to `.env.local`:

```env
VITE_GEMINI_API_KEY=AIzaSyD...your_actual_key_here
```

### **Step 3: Get Supabase Credentials (Required for Production)**

1. Go to: https://supabase.com/dashboard
2. Create a new project (or use existing)
3. Go to Settings → API
4. Copy **Project URL** and **anon public key**
5. Add to `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### **Step 4: Update Backend Environment**

Create/update `backend/.env`:

```bash
Copy-Item backend\.env.example backend\.env  # Windows
# or
cp backend/.env.example backend/.env  # Linux/Mac
```

---

## ✅ REQUIRED Variables (Before Running)

### **Frontend (.env.local)**

```env
# Google Gemini AI - REQUIRED
VITE_GEMINI_API_KEY=AIzaSyD...your_actual_key

# Supabase - REQUIRED for backend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### **Backend (backend/.env)**

```env
# Node Configuration
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:3000

# JWT Secrets - Change in production!
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d

# Gemini API
GEMINI_API_KEY=AIzaSyD...your_actual_key

# Logging
LOG_LEVEL=debug
```

---

## 🎯 Optional Variables (For Features)

### **Payments - Stripe**

```env
# .env.local
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_PAYMENTS=true

# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Social Auth - Facebook**

```env
# .env.local
VITE_FACEBOOK_APP_ID=your_app_id
VITE_ENABLE_SOCIAL_AUTH=true

# backend/.env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

### **Telegram Bot**

```env
# .env.local & backend/.env
TELEGRAM_BOT_TOKEN=your_token_here
```

---

## 🚀 Verification Steps

### **Check Frontend**

1. Open `.env.local`
2. Verify it has:
   - ✅ `VITE_GEMINI_API_KEY` (starts with `AIza`)
   - ✅ `VITE_SUPABASE_URL` (ends with `.supabase.co`)
   - ✅ `VITE_SUPABASE_ANON_KEY` (long string)

3. Run:
   ```bash
   npm run dev
   ```

4. Check browser console for errors
5. Test Gemini AI features work

### **Check Backend**

1. Open `backend/.env`
2. Verify it has:
   - ✅ `JWT_SECRET` (not placeholder)
   - ✅ `GEMINI_API_KEY` (same as frontend)
   - ✅ `PORT=8080`

3. Run:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. Check backend logs for errors
5. Verify: http://localhost:8080 is accessible

---

## 🔒 Security Rules

### **DO:**
- ✅ Keep `.env.local` in `.gitignore` (already done)
- ✅ Use test/sandbox keys for development
- ✅ Store secret keys ONLY in `backend/.env`
- ✅ Never commit `.env.local` to git
- ✅ Rotate keys regularly in production

### **DON'T:**
- ❌ Commit `.env.local` to git
- ❌ Share API keys publicly
- ❌ Use production keys in development
- ❌ Put secret keys in frontend code
- ❌ Copy keys in chat or email

---

## 📝 Variable Reference

| Variable | Location | Required | Type | Example |
|----------|----------|----------|------|---------|
| `VITE_GEMINI_API_KEY` | `.env.local` | ✅ Yes | String | `AIzaSyD...` |
| `VITE_SUPABASE_URL` | `.env.local` | ✅ Yes | String | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | ✅ Yes | String | `eyJhbG...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `.env.local` | ❌ No | String | `pk_test_...` |
| `VITE_FACEBOOK_APP_ID` | `.env.local` | ❌ No | String | `123456789` |
| `JWT_SECRET` | `backend/.env` | ✅ Yes | String | (long random) |
| `GEMINI_API_KEY` | `backend/.env` | ✅ Yes | String | `AIzaSyD...` |
| `STRIPE_SECRET_KEY` | `backend/.env` | ❌ No | String | `sk_test_...` |
| `FACEBOOK_APP_SECRET` | `backend/.env` | ❌ No | String | (long string) |

---

## 🆘 Troubleshooting

### **"GEMINI_API_KEY is invalid"**
- Make sure key starts with `AIza`
- No extra spaces before/after
- Key is full length (not truncated)

### **"Cannot connect to Supabase"**
- Verify URL ends with `.supabase.co`
- Check anon key is correct
- Make sure project is active in Supabase Dashboard

### **"Backend won't start"**
- Check `backend/.env` exists
- Verify `PORT=8080`
- Check `JWT_SECRET` is set
- Run `npm install` in backend folder

### **"Environment variables not loading"**
- Restart dev server after changes
- Clear browser cache
- Check `.env.local` file exists in root
- Verify no typos in variable names

---

## ✨ Next Steps After Setup

1. ✅ Run migrations: `supabase db push`
2. ✅ Deploy Edge Functions: `supabase functions deploy`
3. ✅ Create admin user (see SUPER_ADMIN_SETUP_GUIDE.md)
4. ✅ Test all features work
5. ✅ Run E2E tests

---

**Need help?** Check:
- [SETUP_KEYS_GUIDE.md](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/SETUP_KEYS_GUIDE.md) - Detailed API key setup
- [SUPER_ADMIN_SETUP_GUIDE.md](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/SUPER_ADMIN_SETUP_GUIDE.md) - Admin user creation
- [backend/README.md](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/backend/README.md) - Backend setup
