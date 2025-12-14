# Production Deployment Guide

## Pre-Deployment Checklist

### ✅ 1. Fix RLS Policy (CRITICAL - Do this first!)
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### ✅ 2. Environment Variables
You need to set these in your deployment platform:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

### ✅ 3. Build Test Locally
```bash
npm run build
npm run preview
```

---

## Option 1: Deploy to Vercel (Recommended) ⚡

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
vercel
```

### Step 4: Add Environment Variables
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add all three variables from above
4. Redeploy: `vercel --prod`

### Step 5: Custom Domain (Optional)
1. Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Option 2: Deploy to Netlify 🌐

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify
```bash
netlify login
```

### Step 3: Deploy
```bash
netlify deploy --prod
```

### Step 4: Add Environment Variables
```bash
netlify env:set VITE_SUPABASE_URL "your-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
netlify env:set VITE_GEMINI_API_KEY "your-key"
```

---

## Post-Deployment Checklist

### ✅ 1. Test Authentication
- Visit `/` - should show login
- Login with your admin account
- Verify redirect to shop selector

### ✅ 2. Test Admin Access
- Navigate to `/admin`
- Should see Admin Dashboard (not Access Denied)
- Verify all metrics load correctly

### ✅ 3. Configure Supabase URL Whitelist
1. Supabase Dashboard → Authentication → URL Configuration
2. Add your production URL to:
   - Site URL
   - Redirect URLs

### ✅ 4. Update CORS Settings (if needed)
1. Supabase Dashboard → Settings → API
2. Add your production domain to allowed origins

### ✅ 5. Monitor Performance
- Check Vercel/Netlify Analytics
- Monitor Supabase Dashboard for errors
- Test all major user flows

---

## Quick Deploy Commands

### Vercel (Production)
```bash
vercel --prod
```

### Netlify (Production)
```bash
netlify deploy --prod
```

### Local Preview
```bash
npm run build
npm run preview
```

---

## Troubleshooting

### Issue: "Access Denied" at /admin
**Solution**: Run the RLS policy fix in Supabase SQL Editor:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Issue: Environment variables not working
**Solution**: Make sure they start with `VITE_` prefix and redeploy

### Issue: Blank page after deployment
**Solution**: Check browser console for CORS errors, update Supabase URL whitelist

### Issue: Authentication not working
**Solution**: Add production URL to Supabase redirect URLs in Auth settings

---

## Important Notes

⚠️ **Before deploying**, make sure:
1. RLS policy is fixed (run the SQL above)
2. All environment variables are set
3. Local build succeeds (`npm run build`)
4. You've tested locally with `npm run preview`

🎉 **After deployment**:
1. Test login immediately
2. Test admin access at `/admin`
3. Monitor Supabase logs for any errors
4. Set up custom domain if needed

---

## Need Help?

If you encounter issues:
1. Check Vercel/Netlify deployment logs
2. Check browser console for errors
3. Check Supabase logs in dashboard
4. Verify environment variables are set correctly
