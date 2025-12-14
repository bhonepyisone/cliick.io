# 📋 Production Deployment Checklist

## Phase 1: Pre-Deployment ✅ (Already Done)

- [x] Backend code complete (50+ endpoints)
- [x] Frontend code complete (React 19, Vite)
- [x] Database schema ready (Supabase)
- [x] Migrations applied (#008, #009)
- [x] Environment variables collected
- [x] Dockerfile created
- [x] Deployment scripts created (PowerShell & Bash)

---

## Phase 2: Google Cloud Setup (5 minutes)

- [ ] Create Google Cloud account: https://console.cloud.google.com/
- [ ] Create new project (or use existing)
- [ ] Enable APIs:
  - [ ] Cloud Run API
  - [ ] Cloud Build API
  - [ ] Artifact Registry API
- [ ] Install gcloud CLI: https://cloud.google.com/sdk/docs/install
- [ ] Run `gcloud auth login`
- [ ] Run `gcloud config set project YOUR-PROJECT-ID`

**Verify:**
```powershell
gcloud config get-value project
# Should output: your-project-id
```

---

## Phase 3: Deploy Backend (10 minutes)

- [ ] Open PowerShell in project root
- [ ] Run: `.\deploy.ps1`
- [ ] Wait for deployment to complete (~10 minutes)
- [ ] Copy backend URL from output
  - Format: `https://cliick-backend-xxxxx.run.app`

**Verify:**
```bash
curl https://cliick-backend-xxxxx.run.app/health
# Should return: {"status":"healthy","timestamp":"...","uptime":...}
```

---

## Phase 4: Update Vercel Frontend (3 minutes)

- [ ] Go to https://vercel.com/dashboard
- [ ] Select project: `cliickio`
- [ ] Go to Settings → Environment Variables
- [ ] Add/Update:
  ```
  Name: VITE_API_BASE_URL
  Value: https://cliick-backend-xxxxx.run.app/api
  Environment: Production
  ```
- [ ] Click Save
- [ ] Redeploy frontend (automatic or manual)

**Wait for:**
- [ ] Deployment to complete
- [ ] Vercel shows "Ready"

---

## Phase 5: Integration Testing (5 minutes)

### Frontend Connectivity
- [ ] Visit https://cliickio.vercel.app
- [ ] Open browser console (F12)
- [ ] Check for errors
- [ ] Verify no CORS errors

### User Registration Flow
- [ ] Register new account
  - [ ] Email field accepts input
  - [ ] Password validation works
  - [ ] Submit succeeds
  - [ ] Redirects to login

### User Login
- [ ] Login with registered credentials
- [ ] Verify JWT token received
- [ ] Check localStorage has token
- [ ] Redirects to dashboard

### Create Shop
- [ ] Click "New Shop"
- [ ] Enter shop name
- [ ] Submit succeeds
- [ ] Shop appears in list
- [ ] Can view shop detail

### Upgrade Subscription
- [ ] Select shop
- [ ] Click upgrade
- [ ] Choose subscription plan
- [ ] Submit succeeds
- [ ] Plan updates

### Dashboard Access
- [ ] View dashboard
- [ ] See products, orders, forms
- [ ] Analytics loading
- [ ] No 401/403 errors

---

## Phase 6: Backend Verification (5 minutes)

### API Endpoints
- [ ] `/health` returns status ✅
- [ ] `/api/auth/register` works
- [ ] `/api/auth/login` works
- [ ] `/api/shops` returns user's shops
- [ ] `/api/shops/:id` returns shop detail
- [ ] JWT authentication required

**Test:**
```powershell
# Register
curl -X POST https://cliick-backend-xxxxx.run.app/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test123!","username":"testuser"}'

# Should return: {"success":true,"data":{...}}
```

### Database Connection
- [ ] Supabase connection verified in logs
- [ ] RLS policies working
- [ ] Data persists across requests
- [ ] No PGRST errors

**Check logs:**
```powershell
gcloud run logs read cliick-backend --region us-central1 --limit 50
```

### Environment Variables
- [ ] All required env vars set:
  - [ ] SUPABASE_URL ✅
  - [ ] SUPABASE_SERVICE_ROLE_KEY ✅
  - [ ] JWT_SECRET ✅
  - [ ] FRONTEND_URL ✅
  - [ ] NODE_ENV=production ✅

---

## Phase 7: Security Verification (10 minutes)

### Authentication
- [ ] JWT validation working
- [ ] Expired tokens rejected
- [ ] Invalid tokens rejected
- [ ] Refresh tokens work

### Authorization
- [ ] Users can only access own shops
- [ ] Users can only access own data
- [ ] Admin checks working
- [ ] Rate limiting active

### Data Security
- [ ] Passwords hashed
- [ ] Sensitive data not exposed
- [ ] No SQL injection vulnerabilities
- [ ] CORS properly configured

### Infrastructure
- [ ] HTTPS enabled (automatic)
- [ ] Secrets not in logs
- [ ] No debug info exposed
- [ ] Error messages generic

---

## Phase 8: Performance Verification (5 minutes)

### Backend Performance
- [ ] Startup time < 10 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks
- [ ] Database queries optimized

**Check:**
```powershell
gcloud run logs read cliick-backend --region us-central1 --limit 20
# Look for startup time and request times
```

### Frontend Performance
- [ ] Page load < 3 seconds
- [ ] No console errors
- [ ] No network waterfall issues
- [ ] WebSocket connects quickly

---

## Phase 9: Monitoring Setup (5 minutes)

### Cloud Run Monitoring
- [ ] Set up error alerts:
  - [ ] Error rate > 5%
  - [ ] Response time > 1000ms
- [ ] View dashboard: https://console.cloud.google.com/run

### Application Logs
- [ ] Logs accessible and readable
- [ ] Recent entries show requests
- [ ] Error logs captured

**View logs:**
```powershell
gcloud run logs read cliick-backend --region us-central1 --tail
```

---

## Phase 10: Production Readiness (Final Check)

### System Status
- [ ] Frontend: ✅ Deployed
- [ ] Backend: ✅ Deployed
- [ ] Database: ✅ Connected
- [ ] Migrations: ✅ Applied

### User Experience
- [ ] Complete flow tested
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Dashboard loads properly

### Operations
- [ ] Logs accessible
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Rollback plan exists

### Documentation
- [ ] Deployment guide complete
- [ ] Architecture documented
- [ ] API documented
- [ ] Troubleshooting guide created

---

## Final Checklist Before Going Live

- [ ] All Phase 1-10 items completed
- [ ] No blocking issues
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Team approved
- [ ] Backup plan ready
- [ ] Support contact assigned

---

## 🎉 Deployment Complete!

**Your system is now:**
- ✅ Deployed to production
- ✅ Monitoring active
- ✅ Secure and authenticated
- ✅ Ready for users

---

## Post-Deployment

### Day 1
- [ ] Monitor logs for errors
- [ ] Check user feedback
- [ ] Verify all features working
- [ ] Test on multiple devices

### Week 1
- [ ] Monitor performance metrics
- [ ] Check for any issues
- [ ] Gather user feedback
- [ ] Plan improvements

### Monthly
- [ ] Review logs and errors
- [ ] Update dependencies
- [ ] Optimize performance
- [ ] Add requested features

---

## URLs & References

| Component | URL |
|-----------|-----|
| Frontend | https://cliickio.vercel.app |
| Backend | https://cliick-backend-xxxxx.run.app |
| Cloud Console | https://console.cloud.google.com/run |
| Supabase | https://app.supabase.com/ |
| Vercel | https://vercel.com/dashboard |

---

## Support & Troubleshooting

**Something wrong?**

1. Check backend logs:
   ```powershell
   gcloud run logs read cliick-backend --region us-central1 --limit 100
   ```

2. Check frontend console:
   - Open https://cliickio.vercel.app
   - Press F12
   - Check Console and Network tabs

3. Test API directly:
   ```bash
   curl https://cliick-backend-xxxxx.run.app/health
   ```

4. Check environment variables:
   ```powershell
   gcloud run services describe cliick-backend --region us-central1
   ```

---

**Status: READY FOR PRODUCTION** ✅

