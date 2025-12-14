# Facebook AI Chatbot - Complete Setup & Testing Guide

## ✅ What's Now Working

Your chatbot now has **complete Facebook integration** with the following components:

### 1. **AI Core** ✅
- Gemini API integration (already implemented)
- Message processing and response generation
- Knowledge base integration
- Multi-language support

### 2. **Facebook OAuth** ✅
- User authentication with Facebook
- Token exchange and storage
- Permission management

### 3. **Facebook Webhook Handler** ✅ [NEWLY ADDED]
- Incoming message reception from Facebook Messenger
- Message verification and parsing
- Auto-response with AI
- Conversation tracking

---

## 📋 Setup Checklist

### Step 1: Configure Environment Variables

**Add to `backend/.env`:**

```env
# Facebook OAuth (you should already have these)
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Facebook Messaging (NEW - required for incoming messages)
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_WEBHOOK_VERIFY_TOKEN=cliick_webhook_verify_token

# Backend URL (for webhook callback)
BACKEND_URL=https://your-backend.com
# or for local testing:
# BACKEND_URL=http://localhost:8080
```

### Step 2: Facebook App Configuration

#### Get Page Access Token:
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Select your app
3. Go to **Messenger** → **Settings**
4. Under **Access Tokens**, click **Generate Token** for your Facebook page
5. Copy the token and add to `.env` as `FACEBOOK_PAGE_ACCESS_TOKEN`

#### Configure Webhook URL:
1. In Facebook Developer Dashboard, go to **Messenger** → **Settings**
2. Under **Webhooks**, click **Add Subscription**
3. Fill in:
   - **Callback URL**: `https://your-backend.com/webhook/facebook`
   - **Verify Token**: `cliick_webhook_verify_token` (or your custom token)
4. Select **Messages** in the subscription fields
5. Click **Verify and Save**

#### Subscribe to Page:
1. Go back to **Webhooks** settings
2. Select your Facebook page in the dropdown
3. Click **Subscribe**

### Step 3: Database Setup

**Ensure tables exist (run in Supabase SQL):**

```sql
-- Add Facebook page ID column to shops table (if not exists)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;

-- Create live conversations table (if not exists)
CREATE TABLE IF NOT EXISTS live_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  customer_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'facebook', 'web', etc.
  customer_name TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'pending', 'closed'
  is_ai_active BOOLEAN DEFAULT true,
  messages_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create live messages table (if not exists)
CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES live_conversations(id),
  sender TEXT NOT NULL, -- 'user', 'ai', 'seller'
  sender_id TEXT,
  text TEXT,
  channel TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🧪 Testing Guide

### Test 1: Webhook Verification (Manual)

**Verify your webhook endpoint responds correctly:**

```bash
# Get request (Facebook verification)
curl -X GET "http://localhost:8080/webhook/facebook?hub.mode=subscribe&hub.verify_token=cliick_webhook_verify_token&hub.challenge=test_challenge"

# Expected response: test_challenge
```

### Test 2: Send Test Message via Facebook

**Use Facebook's webhook testing tool:**

1. Go to Facebook Developer Dashboard
2. Select your app
3. Go to **Messenger** → **Settings**
4. Scroll to **Webhooks**
5. Click **Test Subscription** next to your webhook

**Or test manually with cURL:**

```bash
curl -X POST http://localhost:8080/webhook/facebook \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=SIGNATURE_HERE" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "YOUR_PAGE_ID",
      "time": 1234567890,
      "messaging": [{
        "sender": {"id": "USER_FACEBOOK_ID"},
        "recipient": {"id": "YOUR_PAGE_ID"},
        "timestamp": 1234567890,
        "message": {
          "mid": "mid.1234",
          "text": "Hello bot, what products do you have?"
        }
      }]
    }]
  }'

# Expected response: { "success": true }
```

### Test 3: Real Facebook Messenger Test

**From your actual Facebook Page:**

1. Go to your Facebook page
2. Open Messenger
3. Click "Start Conversation" or send a message
4. Your AI chatbot should respond automatically!

**Check the logs:**

```bash
# Watch backend logs for incoming messages
tail -f backend.log | grep "Facebook"
```

**Expected output:**
```
[INFO] Facebook webhook verified
[INFO] Received Facebook message from 123456789: Hello bot
[INFO] Facebook message sent to 123456789
```

### Test 4: Conversation Tracking

**Check that conversations are saved:**

```sql
-- In Supabase SQL Editor
SELECT * FROM live_conversations WHERE channel = 'facebook';
SELECT * FROM live_messages WHERE channel = 'facebook';
```

**Expected**: Messages from Facebook users appear in the database

### Test 5: Dashboard Integration

**In your dashboard:**

1. Go to **Settings** → **Integrations**
2. Facebook should show as "Connected"
3. Go to **Live Chat Panel**
4. You should see Facebook conversations appearing in real-time

---

## 🔍 Troubleshooting

### Issue: Webhook not receiving messages

**Check:**
1. ✓ Facebook app is live (not in development)
2. ✓ Webhook URL is public and accessible
3. ✓ Verify token matches exactly
4. ✓ Page access token is correct
5. ✓ Backend is running: `curl http://localhost:8080/health`

### Issue: "Invalid Facebook webhook signature"

**Cause**: Signature verification failed

**Fix**: 
- Ensure `FACEBOOK_APP_SECRET` matches your app secret exactly
- The webhook body must not be modified before verification

### Issue: AI not responding

**Check**:
1. Gemini API key is set in environment
2. Shop is found in database with that Facebook page ID
3. Shop has valid `assistantConfig` and `knowledgeBase`
4. Check backend logs for errors

**Debug**:
```bash
# Test Gemini directly
curl -X POST http://localhost:8080/api/shops/SHOP_ID/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### Issue: Messages not saved to database

**Check**:
1. Facebook page ID is stored in shop: 
   ```sql
   SELECT facebook_page_id FROM shops WHERE id = 'YOUR_SHOP_ID';
   ```
2. Database tables exist:
   ```sql
   SELECT * FROM live_conversations LIMIT 1;
   ```
3. Check RLS policies allow inserts

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 Facebook Messenger User                      │
│              "Hello, what products do you have?"             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Facebook Graph API │
        │   Sends Webhook     │
        └─────────────┬───────┘
                      │
                      ▼
        ┌──────────────────────────────┐
        │   Your Backend               │
        │  /webhook/facebook (POST)    │
        │  ├─ Verify signature ✓       │
        │  ├─ Parse message ✓          │
        │  ├─ Find shop ✓              │
        │  └─ Create/get conversation  │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │     AI Engine (Gemini)       │
        │  ├─ Process message          │
        │  ├─ Check keywords           │
        │  ├─ Query knowledge base     │
        │  └─ Generate response        │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Facebook Graph API         │
        │   Send Response Message      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Facebook Messenger          │
        │  Shows: "Hi! I have..."      │
        └──────────────────────────────┘
```

---

## 📝 Monitoring

### Check Webhook Health

```bash
# Run this periodically to verify webhook is working
curl -X GET http://localhost:8080/health
# Expected: { "status": "healthy" }
```

### Monitor Message Throughput

```sql
-- Count messages per hour
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as message_count
FROM live_messages
WHERE channel = 'facebook'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Check AI Response Times

```sql
-- Query for slow responses
SELECT 
  m1.created_at as user_msg_time,
  m2.created_at as bot_msg_time,
  EXTRACT(EPOCH FROM (m2.created_at - m1.created_at)) as response_time_seconds
FROM live_messages m1
JOIN live_messages m2 ON m1.conversation_id = m2.conversation_id
WHERE m1.sender = 'user' AND m2.sender = 'ai'
  AND m2.created_at > m1.created_at
ORDER BY response_time_seconds DESC;
```

---

## 🚀 Next Steps

### Optional Enhancements:

1. **Add Image/Media Support**
   - Handle image messages from Facebook
   - Send image responses back

2. **Add Quick Replies**
   - Send interactive buttons
   - Handle postback payloads

3. **Add Typing Indicators**
   - Show "Bot is typing..."
   - Improve UX

4. **Analytics Dashboard**
   - Track conversation stats
   - Monitor AI performance

5. **Multi-Language Support**
   - Auto-detect customer language
   - Respond in their language

---

## ⚠️ Important Notes

1. **Webhook Security**
   - Always verify signatures (enabled by default)
   - Use strong verify tokens
   - Keep APP_SECRET secure

2. **Rate Limits**
   - Facebook has rate limits on message sending
   - Implement backoff if you hit limits

3. **Production Checklist**
   - Use `https://` for webhook URL
   - Set production Facebook app
   - Enable all required permissions
   - Test with real users before scaling

---

## 📚 File Changes Made

### New/Modified Files:
- ✅ `backend/routes/webhooks.ts` - Added Facebook webhook handler

### New Features:
- ✅ `/webhook/facebook` GET endpoint (verification)
- ✅ `/webhook/facebook` POST endpoint (message handling)
- ✅ Auto-response with Gemini AI
- ✅ Conversation tracking in database
- ✅ Signature verification for security

---

## 🎯 Success Criteria

Your Facebook chatbot is working when:

✅ Webhook receives verification from Facebook
✅ Messages sent to Facebook page appear in logs
✅ AI bot responds automatically
✅ Responses appear in Facebook Messenger
✅ Conversations tracked in database
✅ Dashboard shows Facebook channel as active

---

**Questions?** Check the logs and refer to the troubleshooting section above.

