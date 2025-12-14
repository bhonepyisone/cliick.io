# Cloud Run Deployment Guide

## Step 1: Set Up Google Cloud Project

### 1.1 Create/Select Project
```bash
# Go to https://console.cloud.google.com/
# Create new project or use existing one
# Project name: cliick-backend
```

### 1.2 Enable Required APIs
```bash
# In Cloud Console, enable these APIs:
# 1. Cloud Run API
# 2. Cloud Build API
# 3. Container Registry API (or Artifact Registry)

# Or use gcloud:
gcloud services enable run.googleapis.com build.googleapis.com artifactregistry.googleapis.com
```

### 1.3 Install Google Cloud CLI
```bash
# Download from: https://cloud.google.com/sdk/docs/install
# Or on Windows using Chocolatey:
choco install google-cloud-sdk

# Verify installation:
gcloud --version
```

---

## Step 2: Authenticate with Google Cloud

```bash
# Login to your Google account
gcloud auth login

# Set project ID
gcloud config set project YOUR-PROJECT-ID

# Verify:
gcloud config get-value project
```

---

## Step 3: Deploy Backend to Cloud Run

### Option A: Deploy from Local Machine (Easiest)

```bash
# Navigate to project root
cd c:\cliick.io-(backend-ready)-(nov-18_-2_30pm)

# Deploy using gcloud
gcloud run deploy cliick-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars \
    NODE_ENV=production,\
    SUPABASE_URL=https://klfjdplshshqkhjnfzrq.supabase.co,\
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZmpkcGxzaHNocWtoam5menJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIwNTA4NSwiZXhwIjoyMDgwNzgxMDg1fQ.xmcIIJT3Dwthr63Eyl23_cUblSfeQQrnt-tXhuOIfDw,\
    JWT_SECRET=5dddb6df6926d51e47aa3247f4f2c9b1b190d49f4112e105b4217fed6450f16c,\
    FRONTEND_URL=https://cliickio.vercel.app,\
    PORT=8080

# The deployment will:
# 1. Build Docker image
# 2. Push to Artifact Registry
# 3. Deploy to Cloud Run
# Takes ~5-10 minutes
```

### Option B: Deploy from GitHub (Recommended for CI/CD)

```bash
# Push code to GitHub repository first
git add .
git commit -m "Deploy to Cloud Run"
git push origin main

# Then in Cloud Console:
# 1. Go to Cloud Run
# 2. Click "Create Service"
# 3. Select "Deploy from source code"
# 4. Choose "GitHub" as source
# 5. Authorize GitHub
# 6. Select your repository
# 7. Configure deployment settings
```

---

## Step 4: Configure Environment Variables in Cloud Run

If deployment completes but you need to update env vars:

```bash
# Update specific service
gcloud run services update cliick-backend \
  --region us-central1 \
  --update-env-vars \
    SUPABASE_URL=https://klfjdplshshqkhjnfzrq.supabase.co,\
    SUPABASE_SERVICE_ROLE_KEY=your-key,\
    JWT_SECRET=your-secret,\
    FRONTEND_URL=https://cliickio.vercel.app
```

---

## Step 5: Get Your Backend URL

After successful deployment:

```bash
# Get service URL
gcloud run services describe cliick-backend --region us-central1

# Look for: Service URL: https://cliick-backend-xxxxx.run.app
```

**Your backend URL will be**: `https://cliick-backend-xxxxx.run.app`

---

## Step 6: Update Frontend with Backend URL

### 6.1 Update Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update/Add:
   ```
   VITE_API_BASE_URL=https://cliick-backend-xxxxx.run.app/api
   ```
5. Click "Save"
6. Redeploy frontend:
   ```bash
   git push origin main
   ```
   (Or manually trigger deployment in Vercel dashboard)

### 6.2 Verify Frontend Configuration

In your frontend code (`vite.config.ts` or API client):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
```

---

## Step 7: Test Deployment

### Test Backend Health
```bash
curl https://cliick-backend-xxxxx.run.app/health
# Should return: {"status":"healthy","timestamp":"...","uptime":...}
```

### Test API Endpoint
```bash
curl https://cliick-backend-xxxxx.run.app/api/shops \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Frontend
```bash
# Visit: https://cliickio.vercel.app
# Should load without CORS errors
# Try register → login → create shop flow
```

---

## Useful Commands

```bash
# View logs
gcloud run logs read cliick-backend --region us-central1 --limit 50

# View service details
gcloud run services describe cliick-backend --region us-central1

# Delete service (if needed)
gcloud run services delete cliick-backend --region us-central1

# List all services
gcloud run services list
```

---

## Monitoring & Troubleshooting

### View Logs in Cloud Console
1. Go to https://console.cloud.google.com/run
2. Click your service name
3. Go to **Logs** tab
4. View real-time logs

### Common Issues

**Issue: "Connection refused"**
- Check Supabase credentials are correct
- Verify SUPABASE_URL is accessible from Cloud Run

**Issue: "CORS error from frontend"**
- Update `FRONTEND_URL` env var to match actual domain
- Redeploy service

**Issue: "JWT verification failed"**
- Ensure `JWT_SECRET` matches exactly
- Redeploy with correct secret

**Issue: "Build failed"**
- Check Dockerfile exists in project root
- Verify Node.js version compatibility
- Check `npm ci` succeeds locally

---

## Cost Estimation

**Cloud Run Pricing** (as of 2024):
- **Free tier**: 
  - 2 million requests/month
  - 360,000 GB-seconds/month
  - Covers small to medium usage

- **After free tier**:
  - $0.40 per 1M requests
  - $0.000011111 per GB-second
  - Minimum cost: ~$0.25/month if under free tier limits

For a typical SaaS app with 1000 users:
- **Estimated cost**: $5-15/month (well under free tier for most cases)

---

## Production Checklist

- [ ] Dockerfile created and tested locally
- [ ] All environment variables set in Cloud Run
- [ ] Backend deployed and health check passes
- [ ] Frontend updated with backend URL
- [ ] CORS configured correctly
- [ ] SSL/TLS certificate (automatic via Cloud Run)
- [ ] Monitoring enabled in Cloud Console
- [ ] Logs configured and checked
- [ ] End-to-end user flow tested
- [ ] Database RLS policies verified
- [ ] Error handling tested

---

## Next Steps

1. **Run deployment command** (Option A above)
2. **Wait for completion** (~10 minutes)
3. **Get backend URL** from Cloud Console
4. **Update Vercel** with backend URL
5. **Test user flow** (register → login → create shop)
6. **Monitor logs** for any errors

**Questions?** Check logs in Cloud Console or run:
```bash
gcloud run logs read cliick-backend --region us-central1 --tail
```

