# Production Environment Variables Setup Guide

## 📋 Complete Checklist - What You Need For Deployment

### ✅ REQUIRED (Must have) - 5 Variables

#### 1. **SUPABASE_URL** (Backend)
- **What it is**: Your Supabase project URL
- **Where to get it**:
  1. Go to https://app.supabase.com/
  2. Select your project
  3. Go to Settings → API → Project URL
  4. Copy the URL (looks like: `https://YOUR-PROJECT-ID.supabase.co`)
- **Format**: `SUPABASE_URL=https://your-project-id.supabase.co`

#### 2. **SUPABASE_SERVICE_ROLE_KEY** (Backend)
- **What it is**: Supabase service role key for backend access
- **Where to get it**:
  1. Go to https://app.supabase.com/
  2. Select your project
  3. Go to Settings → API → Service Role Secret
  4. Copy the key (long string starting with `eyJ...`)
- **Format**: `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
- **⚠️ CRITICAL**: Never expose this publicly. Keep it secret!

#### 3. **JWT_SECRET** (Backend)
- **What it is**: Secret key for signing JWT tokens
- **How to generate it**:
  ```bash
  # Option 1: Use this command
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # Option 2: Use online generator (https://generate-random.org/encryption-key-generator)
  # Generate a 32-byte (256-bit) hex string
  ```
- **Format**: `JWT_SECRET=your_random_64_character_string_here`
- **Length**: At least 32 characters (64 recommended)
- **⚠️ CRITICAL**: Store safely. Use different value than development!

#### 4. **FRONTEND_URL** (Backend)
- **What it is**: URL of your deployed frontend (for CORS)
- **Format**: `FRONTEND_URL=https://yourdomain.com`
- **Examples**:
  - `FRONTEND_URL=https://app.example.com`
  - `FRONTEND_URL=https://example.vercel.app`
  - `FRONTEND_URL=https://mycompany.com`

#### 5. **VITE_SUPABASE_URL** (Frontend)
- **What it is**: Same as SUPABASE_URL (for frontend)
- **Format**: `VITE_SUPABASE_URL=https://your-project-id.supabase.co`
- **Note**: Must match backend's SUPABASE_URL

---

### ⚠️ OPTIONAL BUT RECOMMENDED - 2 Variables

#### 6. **VITE_SUPABASE_ANON_KEY** (Frontend)
- **What it is**: Supabase anonymous key for frontend
- **Where to get it**:
  1. Go to https://app.supabase.com/
  2. Select your project
  3. Go to Settings → API → Anon Public Key
  4. Copy the key
- **Format**: `VITE_SUPABASE_ANON_KEY=your-anon-key`
- **Note**: Safe to expose (it's public-facing)

#### 7. **VITE_GEMINI_API_KEY** (Frontend)
- **What it is**: Google Gemini API key for AI features
- **Where to get it**:
  1. Go to https://aistudio.google.com/app/apikey
  2. Click "Create API Key"
  3. Copy the key
- **Format**: `VITE_GEMINI_API_KEY=your-gemini-api-key`
- **Note**: Required if using AI features; optional for MVP

---

### ❌ OPTIONAL (Not needed yet) - Advanced Features

These can be added later when you need the features:
- `STRIPE_SECRET_KEY` - Payment processing
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - Facebook OAuth
- `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` - TikTok OAuth
- `SENDGRID_API_KEY` - Email notifications
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - SMS notifications
- `SENTRY_DSN` - Error tracking

---

## 🚀 Step-by-Step Setup

### For Backend (.env in `/backend`)

**Create file**: `/backend/.env`

```env
# REQUIRED
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-random-secret-key-here
FRONTEND_URL=https://yourdomain.com

# Optional
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d
```

### For Frontend (.env in project root)

**Create file**: `.env.production`

```env
# REQUIRED
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional but recommended
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# API Configuration
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

---

## 📝 Checklist Before Deployment

### Backend Variables
- [ ] `NODE_ENV` = `production`
- [ ] `SUPABASE_URL` = From Supabase Dashboard
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = From Supabase Dashboard
- [ ] `JWT_SECRET` = Generated random secret (32+ chars)
- [ ] `FRONTEND_URL` = Your production frontend URL
- [ ] `PORT` = 8080 (or your chosen port)

### Frontend Variables
- [ ] `VITE_SUPABASE_URL` = From Supabase Dashboard
- [ ] `VITE_SUPABASE_ANON_KEY` = From Supabase Dashboard (optional)
- [ ] `VITE_GEMINI_API_KEY` = From Google AI Studio (optional)
- [ ] `VITE_API_BASE_URL` = Your production backend URL

---

## 🔍 How to Verify Your Secrets Are Correct

### Test Backend Connection
```bash
# After setting env vars, run health check
curl https://your-backend-url/health
# Should return: {"status":"healthy","timestamp":"...","uptime":...}
```

### Test Frontend Build
```bash
npm run build
# Should complete without errors
# Check dist/ folder is created
```

### Test Supabase Connection
```bash
# Backend will automatically test on startup
# Look for connection confirmation in logs
```

---

## 🛡️ Security Best Practices

1. **Never commit `.env` files** to Git
   ```bash
   # These should already be gitignored:
   # .env
   # .env.local
   # .env.production
   ```

2. **Use different secrets for each environment**
   - Development: One JWT_SECRET
   - Production: Different JWT_SECRET
   - Staging: Different JWT_SECRET

3. **Rotate secrets regularly**
   - Change JWT_SECRET every 3-6 months
   - Re-generate Supabase service keys if exposed

4. **Store securely**
   - Use environment variable management (Vercel, Heroku, etc.)
   - Never share via email or chat
   - Use secret management tools (1Password, Vault, etc.)

5. **Audit access**
   - Limit who can view production secrets
   - Use role-based access control
   - Log all secret access

---

## 📦 Deployment Platform Specific Instructions

### Vercel (Recommended for Frontend)
1. Go to your project settings
2. Go to **Environment Variables**
3. Add each variable:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
   - `VITE_API_BASE_URL`
4. Select "Production" environment
5. Redeploy

### Cloud Run / Google Cloud (Backend)
1. Go to Cloud Run service
2. Go to **Edit & Deploy**
3. Expand **Runtime Settings**
4. Add **Environment Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `NODE_ENV=production`

### Heroku (Backend)
1. Go to app Settings
2. Find **Config Vars**
3. Click **Reveal Config Vars**
4. Add all backend variables

### Self-Hosted
1. Create `/backend/.env` with all variables
2. Create `.env.production` in root with frontend variables
3. Set `NODE_ENV=production` before running

---

## ✅ Final Verification Checklist

Before going live, verify:

- [ ] All 5 REQUIRED variables set
- [ ] Supabase migrations applied (email column + FK constraint)
- [ ] Backend can connect to Supabase (health check passes)
- [ ] Frontend can call backend API
- [ ] JWT authentication works
- [ ] Database RLS policies are enabled
- [ ] CORS configured correctly
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] Users can register → login → create shop → see dashboard

---

## 🆘 Troubleshooting

### "Cannot connect to Supabase"
- Check `SUPABASE_URL` is correct (no trailing slash)
- Check `SUPABASE_SERVICE_ROLE_KEY` is valid
- Verify network connectivity to `supabase.co`

### "Invalid JWT Secret"
- Check `JWT_SECRET` is set
- Check it's at least 32 characters
- Restart backend after changing

### "CORS error when calling API"
- Check `FRONTEND_URL` matches actual domain
- Check backend has correct CORS headers
- Test with `curl` from backend

### "Frontend can't find API"
- Check `VITE_API_BASE_URL` is set correctly
- Check it includes `/api` suffix
- Rebuild frontend after changing env vars

---

## 📞 Quick Reference

| Variable | Backend | Frontend | Required | Where to Get |
|----------|---------|----------|----------|--------------|
| SUPABASE_URL | ✅ | ✅* | YES | Supabase Dashboard |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | ❌ | YES | Supabase Dashboard |
| SUPABASE_ANON_KEY | ❌ | ✅* | Optional | Supabase Dashboard |
| JWT_SECRET | ✅ | ❌ | YES | Generate randomly |
| FRONTEND_URL | ✅ | ❌ | YES | Your domain |
| VITE_API_BASE_URL | ❌ | ✅ | Recommended | Your backend URL |
| VITE_GEMINI_API_KEY | ❌ | ✅ | Optional | Google AI Studio |

\* = VITE_ prefix for frontend access

---

**Ready to deploy? You have everything you need! 🚀**

