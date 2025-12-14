# 🔑 API Keys Setup Guide

Complete step-by-step guide to get all API keys for your Cliick.io platform.

---

## 📋 **Quick Reference**

| Service | Required? | Time | Where to Get |
|---------|-----------|------|--------------|
| **Gemini AI** | ✅ **YES** | 2 min | [AI Studio](https://aistudio.google.com/app/apikey) |
| **Backend URLs** | ✅ **YES** | 0 min | Pre-configured (localhost) |
| **Supabase** | ⚠️ Optional | 5 min | [Supabase Dashboard](https://supabase.com/dashboard) |
| **Stripe** | ⚠️ Optional | 5 min | [Stripe Dashboard](https://dashboard.stripe.com) |
| **Facebook** | ⚠️ Optional | 10 min | [Facebook Developers](https://developers.facebook.com) |
| **TikTok** | ⚠️ Optional | 10 min | [TikTok Developers](https://developers.tiktok.com) |
| **Telegram** | ⚠️ Optional | 3 min | [@BotFather](https://t.me/botfather) |
| **Viber** | ⚠️ Optional | 10 min | [Viber Partners](https://partners.viber.com) |
| **PayPal** | ⚠️ Optional | 5 min | [PayPal Developer](https://developer.paypal.com) |

---

## ✅ **REQUIRED: Gemini AI API** (2 minutes)

### **Step 1: Get API Key**

1. **Go to:** [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. **Sign in** with your Google account
3. Click **"Create API Key"**
4. Select **"Create API key in new project"** (or use existing)
5. **Copy** the API key (starts with `AIza...`)

### **Step 2: Add to .env.local**

Open `.env.local` and replace:

```env
GEMINI_API_KEY=PLACEHOLDER_API_KEY
```

With your actual key:

```env
GEMINI_API_KEY=AIzaSyD...your_actual_key_here
```

### **Step 3: Test**

```bash
npm run dev
```

✅ Your app should now work with AI features!

---

## 🌐 **Backend Configuration** (Pre-configured)

Already set in `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

### **To Use:**

1. Start backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. Backend runs on `http://localhost:8080`

### **After Deploying to Production:**

Replace with your production URLs:

```env
VITE_API_BASE_URL=https://your-backend.railway.app/api
VITE_WS_URL=wss://your-backend.railway.app/ws
```

---

## 💳 **OPTIONAL: Stripe Payment** (5 minutes)

### **Step 1: Create Stripe Account**

1. **Go to:** [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up (free)
3. Activate your account

### **Step 2: Get Test API Keys**

1. Go to **Developers** → **API keys**
2. Switch to **Test mode** (toggle in sidebar)
3. Copy **"Publishable key"** (starts with `pk_test_`)

### **Step 3: Add to .env.local**

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_ENABLE_PAYMENTS=true
```

### **Step 4: Add Secret Key to Backend**

1. Copy **"Secret key"** (starts with `sk_test_`)
2. Add to `backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### **Step 5: Set Up Webhooks (For Production)**

1. Go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://your-backend.com/webhook/stripe`
4. **Events to send:** Select all checkout events
5. Copy **"Signing secret"** (starts with `whsec_`)
6. Add to `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## 📱 **OPTIONAL: Facebook & Instagram OAuth** (10 minutes)

### **Step 1: Create Facebook App**

1. **Go to:** [https://developers.facebook.com/apps/create/](https://developers.facebook.com/apps/create/)
2. Click **"Create App"**
3. Choose **"Business"** → Click **"Next"**
4. Enter **app name** (e.g., "Cliick.io")
5. Enter **contact email**
6. Click **"Create App"**

### **Step 2: Add Facebook Login**

1. In your app dashboard, click **"Add Product"**
2. Find **"Facebook Login"** → Click **"Set Up"**
3. Choose **"Web"** platform
4. Click **"Settings"** (left sidebar under Facebook Login)

### **Step 3: Configure OAuth Redirect**

Add these URLs to **"Valid OAuth Redirect URIs"**:

```
http://localhost:8080/oauth/facebook/callback
https://your-backend.com/oauth/facebook/callback
```

Click **"Save Changes"**

### **Step 4: Get App Credentials**

1. Go to **Settings** → **Basic**
2. Copy **"App ID"**
3. Click **"Show"** next to **"App Secret"** → Copy it

### **Step 5: Add to Configuration**

**Frontend (.env.local):**
```env
VITE_FACEBOOK_APP_ID=your_app_id_here
VITE_ENABLE_SOCIAL_AUTH=true
```

**Backend (backend/.env):**
```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
```

### **Step 6: Enable Instagram (Optional)**

1. In Facebook app dashboard, add **"Instagram Basic Display"** product
2. Use same App ID and Secret
3. Instagram will automatically work with Facebook OAuth

---

## 🎵 **OPTIONAL: TikTok for Business** (10 minutes)

### **Step 1: Create TikTok Developer Account**

1. **Go to:** [https://developers.tiktok.com/](https://developers.tiktok.com/)
2. **Sign in** with TikTok account
3. Complete developer registration

### **Step 2: Create App**

1. Go to **"My Apps"**
2. Click **"Create an App"**
3. Fill in app details
4. Select **"Login Kit"** permission

### **Step 3: Get Client Key**

1. In app dashboard, go to **"App Information"**
2. Copy **"Client Key"**

### **Step 4: Configure Redirect URL**

Add redirect URL:
```
http://localhost:8080/oauth/tiktok/callback
```

### **Step 5: Add to Configuration**

**Frontend (.env.local):**
```env
VITE_TIKTOK_CLIENT_KEY=your_client_key_here
```

**Backend (backend/.env):**
```env
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
```

---

## 💬 **OPTIONAL: Telegram Bot** (3 minutes)

### **Step 1: Talk to BotFather**

1. Open Telegram app
2. Search for **@BotFather**
3. Start a chat

### **Step 2: Create Bot**

1. Send: `/newbot`
2. **BotFather asks:** "Alright, a new bot. How are we going to call it?"
3. **You reply:** Your bot name (e.g., "Cliick.io Support")
4. **BotFather asks:** "Good. Now let's choose a username for your bot."
5. **You reply:** Username ending in "bot" (e.g., "cliickio_bot")
6. **BotFather replies** with your token

### **Step 3: Copy Token**

BotFather will send something like:
```
Done! Your token: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### **Step 4: Add to Configuration**

**Frontend (.env.local):**
```env
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Backend (backend/.env):**
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 💜 **OPTIONAL: Viber Bot** (10 minutes)

### **Step 1: Create Viber Bot**

1. **Go to:** [https://partners.viber.com/](https://partners.viber.com/)
2. **Sign in** with Viber account
3. Click **"Create Bot Account"**

### **Step 2: Fill Bot Details**

- **Bot Name:** Your bot name
- **Bot Icon:** Upload image (at least 720x720)
- **Description:** Bot description
- **Category:** Choose appropriate category

### **Step 3: Get Credentials**

After creation, you'll receive:
- **Auth Token** (long string)
- **Bot ID**

### **Step 4: Add to Configuration**

**Frontend (.env.local):**
```env
VITE_VIBER_BOT_ID=your_bot_id_here
VITE_VIBER_AUTH_TOKEN=your_auth_token_here
```

**Backend (backend/.env):**
```env
VIBER_BOT_ID=your_bot_id_here
VIBER_AUTH_TOKEN=your_auth_token_here
```

---

## 💰 **OPTIONAL: PayPal Payment** (5 minutes)

### **Step 1: Create PayPal Developer Account**

1. **Go to:** [https://developer.paypal.com/](https://developer.paypal.com/)
2. **Sign in** or create PayPal account
3. Go to **Dashboard**

### **Step 2: Create Sandbox App**

1. Go to **"My Apps & Credentials"**
2. Switch to **"Sandbox"** tab
3. Click **"Create App"**
4. Enter app name
5. Click **"Create App"**

### **Step 3: Get Client ID & Secret**

1. In app details, find **"Client ID"** → Copy
2. Show **"Secret"** → Copy

### **Step 4: Add to Configuration**

**Frontend (.env.local):**
```env
VITE_PAYMENT_PROVIDER=paypal
VITE_PAYPAL_CLIENT_ID=your_client_id_here
```

**Backend (backend/.env):**
```env
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_SECRET=your_secret_here
PAYPAL_MODE=sandbox
```

---

## 🔔 **OPTIONAL: Web Push Notifications** (2 minutes)

### **Generate VAPID Keys**

**Option 1: Using NPM**

```bash
npx web-push generate-vapid-keys
```

**Option 2: Online**

Visit: [https://vapidkeys.com/](https://vapidkeys.com/)

### **Add to Configuration**

**Frontend (.env.local):**
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
VITE_ENABLE_PUSH_NOTIFICATIONS=true
```

**Backend (backend/.env):**
```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

---

## 🗄️ **OPTIONAL: Supabase** (5 minutes)

### **Step 1: Create Supabase Project**

1. **Go to:** [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with GitHub
3. Click **"New project"**
4. Fill in:
   - **Name:** Your project name
   - **Database Password:** Create strong password
   - **Region:** Choose closest to you
5. Click **"Create new project"**
6. Wait ~2 minutes for setup

### **Step 2: Get API Credentials**

1. Go to **Settings** (gear icon)
2. Click **"API"**
3. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key (under "Project API keys")

### **Step 3: Add to Configuration**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🎯 **Quick Start Configurations**

### **Minimal Setup (Just to Run Locally):**

```env
# .env.local
GEMINI_API_KEY=AIzaSyD...your_actual_key
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

### **With Payments (Stripe):**

```env
# .env.local
GEMINI_API_KEY=AIzaSyD...
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_PAYMENTS=true
```

### **Full Featured (All Integrations):**

```env
# .env.local
GEMINI_API_KEY=AIzaSyD...
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
VITE_FACEBOOK_APP_ID=123456789
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABC...
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_SOCIAL_AUTH=true
```

---

## 🚨 **Security Reminders**

### **✅ DO:**
- Keep `.env.local` in `.gitignore`
- Use test/sandbox keys for development
- Store secret keys ONLY in `backend/.env`
- Use environment variables in production

### **❌ DON'T:**
- Commit `.env.local` to git
- Share API keys publicly
- Use production keys in development
- Put secret keys in frontend code

---

## 🆘 **Troubleshooting**

### **"API key is invalid"**
- Double-check you copied the entire key
- No extra spaces before/after
- Gemini key starts with `AIza`

### **"Cannot connect to backend"**
- Make sure backend is running: `cd backend && npm run dev`
- Check backend is on port 8080
- Verify `VITE_API_BASE_URL=http://localhost:8080/api`

### **"OAuth redirect mismatch"**
- Add `http://localhost:8080/oauth/{platform}/callback` to OAuth settings
- Replace `{platform}` with facebook, tiktok, etc.

### **"Stripe key not found"**
- Make sure key starts with `pk_test_` (not `sk_test_`)
- Secret key (`sk_test_`) goes in `backend/.env`

---

## 📚 **Next Steps**

After adding your keys:

1. **Test locally:**
   ```bash
   npm run dev
   ```

2. **Start backend:**
   ```bash
   cd backend && npm run dev
   ```

3. **Test features** you enabled

4. **Deploy** when ready (see [PRODUCTION_READY.md](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/PRODUCTION_READY.md))

---

**Need help?** Check the complete guides:
- [Backend Setup](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/backend/README.md)
- [Backend Implementation](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/BACKEND_IMPLEMENTATION.md)
- [Production Deployment](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/PRODUCTION_READY.md)
