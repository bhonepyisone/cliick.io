# 🚀 Quick Start: Deploy to Cloud Run (5 Minutes)

## Prerequisites
- Google Cloud account: https://console.cloud.google.com/
- gcloud CLI installed: https://cloud.google.com/sdk/docs/install

---

## Step 1: Authenticate with Google Cloud

```powershell
# Open PowerShell and run:
gcloud auth login

# Set your project
gcloud config set project YOUR-PROJECT-ID
```

**Don't have a project?**
1. Go to https://console.cloud.google.com/
2. Create new project
3. Copy project ID
4. Run: `gcloud config set project YOUR-PROJECT-ID`

---

## Step 2: Deploy Backend (One Command)

```powershell
# From project root, run deployment script:
.\deploy.ps1

# Script will:
# ✅ Check prerequisites
# ✅ Build Docker image
# ✅ Upload to Google Cloud
# ✅ Deploy to Cloud Run
# ⏱️ Takes ~10 minutes
```

**What script does:**
- Builds Docker image of your backend
- Uploads to Google Cloud Artifact Registry
- Deploys to Cloud Run
- Sets all environment variables automatically
- Outputs your backend URL

---

## Step 3: Update Frontend (2 Minutes)

```
Backend URL from script: https://cliick-backend-xxxxx.run.app
```

1. Go to https://vercel.com/dashboard
2. Select project: `cliickio`
3. Settings → Environment Variables
4. Add/Update:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://cliick-backend-xxxxx.run.app/api`
   - **Environment**: Production
5. Click Save
6. Redeploy (auto or manual trigger)

---

## Step 4: Test (1 Minute)

```bash
# Test backend health
curl https://cliick-backend-xxxxx.run.app/health

# Visit frontend
https://cliickio.vercel.app

# Try: Register → Login → Create Shop → Dashboard
```

---

## ✅ Done! You're Deployed

**Your system is now live:**
- Frontend: https://cliickio.vercel.app
- Backend: https://cliick-backend-xxxxx.run.app
- Database: Supabase (klfjdplshshqkhjnfzrq)

---

## 📊 Monitor Backend

```powershell
# View logs in real-time
gcloud run logs read cliick-backend --region us-central1 --tail

# View service details
gcloud run services describe cliick-backend --region us-central1

# View in Cloud Console
# https://console.cloud.google.com/run
```

---

## 🆘 Troubleshooting

**Deploy failed?**
```powershell
# View detailed logs
gcloud run logs read cliick-backend --region us-central1 --limit 100
```

**CORS error after deployment?**
- Check `FRONTEND_URL` env var is correct
- Verify Vercel URL matches exactly

**JWT error?**
- Verify `JWT_SECRET` is set (check in deploy.ps1)
- Ensure same secret used everywhere

**Can't reach backend?**
```powershell
# Check if service is running
gcloud run services list

# Check health endpoint
curl https://cliick-backend-xxxxx.run.app/health
```

---

## 💰 Costs

**Cloud Run pricing:**
- First 2M requests/month: FREE
- First 360K GB-seconds: FREE
- After: $0.40 per 1M requests

**Expected cost for MVP:** $0-5/month (usually within free tier)

---

## 📝 Your Deployment Summary

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://cliickio.vercel.app | ✅ Live |
| Backend | https://cliick-backend-xxxxx.run.app | ✅ Live (after deploy) |
| Database | Supabase | ✅ Live |
| Migrations | #008, #009 | ✅ Applied |

---

## 🎯 Verify Everything Works

**Complete user flow test:**
1. Register new account
2. Verify email (if configured)
3. Login
4. Create first shop
5. Upgrade subscription
6. Access dashboard
7. Create product
8. View analytics

All working? **You're production-ready!** 🎉

---

## Need Help?

**Script errors:**
```powershell
# Run with debug info
.\deploy.ps1 -Verbose
```

**Cloud Run logs:**
```powershell
gcloud run logs read cliick-backend --region us-central1
```

**Backend health:**
```bash
curl https://cliick-backend-xxxxx.run.app/health
```

**Frontend connection:**
Open browser console (F12) and check:
- No CORS errors
- API calls succeed
- WebSocket connects

---

**🚀 Ready? Run: `.\deploy.ps1`**

