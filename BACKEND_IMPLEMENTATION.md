# Backend Implementation Guide

This document provides a comprehensive guide for implementing the production backend for the Cliick.io platform.

## 🏗️ Architecture Overview

The frontend is now **fully prepared** for backend integration with the following services:

1. **API Client** ([`services/apiClient.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/apiClient.ts)) - RESTful API communication
2. **WebSocket Service** ([`services/websocketService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/websocketService.ts)) - Real-time bidirectional updates
3. **OAuth Service** ([`services/oauthService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/oauthService.ts)) - Social media integrations
4. **Payment Service** ([`services/paymentService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/paymentService.ts)) - Payment gateway integration
5. **Notification Service** ([`services/notificationService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/notificationService.ts)) - Push notifications

---

## 📋 Required Backend Endpoints

### **Authentication & Users**
```
POST   /api/auth/login              - User login
POST   /api/auth/logout             - User logout
GET    /api/auth/me                 - Get current user
POST   /api/auth/register           - User registration
POST   /api/auth/refresh            - Refresh JWT token
```

### **Shop Management**
```
GET    /api/shops/:shopId           - Get shop details
PUT    /api/shops/:shopId           - Update shop
POST   /api/shops                   - Create new shop
```

### **Products**
```
GET    /api/shops/:shopId/products              - List all products
POST   /api/shops/:shopId/products              - Create product
PUT    /api/shops/:shopId/products/:productId   - Update product
DELETE /api/shops/:shopId/products/:productId   - Delete product
```

### **Live Chat & Conversations**
```
GET    /api/shops/:shopId/conversations                           - List conversations
GET    /api/shops/:shopId/conversations/:conversationId           - Get conversation
PUT    /api/shops/:shopId/conversations/:conversationId           - Update conversation
POST   /api/shops/:shopId/conversations/:conversationId/messages  - Send message
```

### **Orders**
```
GET    /api/shops/:shopId/orders                  - List orders
GET    /api/shops/:shopId/orders/:orderId         - Get order
PUT    /api/shops/:shopId/orders/:orderId/status  - Update order status
```

### **Forms**
```
GET    /api/shops/:shopId/forms           - List forms
POST   /api/shops/:shopId/forms           - Create form
PUT    /api/shops/:shopId/forms/:formId   - Update form
```

### **Social Media Integrations**
```
POST   /api/shops/:shopId/integrations/:platform/connect     - Connect OAuth
POST   /api/shops/:shopId/integrations/:platform/disconnect  - Disconnect OAuth
```

### **Payments**
```
POST   /api/shops/:shopId/payments/intent   - Create payment intent
POST   /api/shops/:shopId/payments/confirm  - Confirm payment
POST   /api/shops/:shopId/payments/:id/refund  - Process refund
GET    /api/shops/:shopId/payments/:id      - Get payment status
```

### **Notifications**
```
POST   /api/notifications/subscribe     - Subscribe to push notifications
POST   /api/notifications/unsubscribe   - Unsubscribe from push
```

---

## 🔌 WebSocket Events

### **Client → Server**
```javascript
{
  "event": "shop:join",
  "data": { "shopId": "shop_123" }
}

{
  "event": "ping",
  "data": {}
}
```

### **Server → Client**
```javascript
// New message
{
  "event": "message:new",
  "data": { /* LiveChatMessage */ }
}

// Conversation update
{
  "event": "conversation:update",
  "data": { /* LiveChatConversation */ }
}

// Order update
{
  "event": "order:update",
  "data": { /* OrderSubmission */ }
}

// Notification
{
  "event": "notification",
  "data": {
    "title": "New Order",
    "message": "Order #12345 received",
    "type": "info"
  }
}
```

---

## 🔐 OAuth Callback Handlers

Each social media platform requires a callback URL handler:

### **Facebook/Instagram Callback**
```
GET /oauth/facebook/callback?code=AUTH_CODE&state=STATE
GET /oauth/instagram/callback?code=AUTH_CODE&state=STATE
```

**Handler must:**
1. Verify state parameter (CSRF protection)
2. Exchange code for access token
3. Store token securely in database
4. Send postMessage to opener window with result
5. Close popup window

### **TikTok Callback**
```
GET /oauth/tiktok/callback?code=AUTH_CODE&state=STATE
```

### **Telegram Callback**
```
GET /oauth/telegram/callback?code=AUTH_CODE&state=STATE
```

### **Viber Callback**
```
GET /oauth/viber/callback?code=AUTH_CODE&state=STATE
```

---

## 💳 Payment Provider Integration

### **Stripe Integration**
```javascript
// Backend
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'usd',
  metadata: { orderId: 'order_123' }
});

// Webhook handler for payment events
app.post('/webhook/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  // Handle event types
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Update order status
      break;
    case 'payment_intent.payment_failed':
      // Handle failure
      break;
  }
});
```

### **PayPal Integration**
```javascript
const paypal = require('@paypal/checkout-server-sdk');

// Create order
const request = new paypal.orders.OrdersCreateRequest();
request.prefer("return=representation");
request.requestBody({
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: 'USD',
      value: '20.00'
    }
  }]
});
```

---

## 🗄️ Database Schema (MongoDB Example)

### **Users Collection**
```javascript
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  username: String,
  role: String, // 'owner' | 'admin' | 'agent'
  createdAt: Date,
  lastLogin: Date
}
```

### **Shops Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  ownerId: ObjectId,
  team: [{
    userId: ObjectId,
    role: String,
    addedAt: Date
  }],
  integrations: {
    facebook: {
      isConnected: Boolean,
      accessToken: String (encrypted),
      pageId: String,
      expiresAt: Date
    },
    instagram: { /* similar */ },
    // ... other platforms
  },
  createdAt: Date,
  updatedAt: Date
}
```

### **Products Collection**
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,
  name: String,
  description: String,
  retailPrice: Number,
  stock: Number,
  imageUrl: String,
  category: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **Conversations Collection**
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,
  customerName: String,
  customerId: String,
  channel: String, // 'web' | 'facebook' | 'instagram' | etc
  status: String, // 'open' | 'pending' | 'closed'
  assigneeId: ObjectId,
  messages: [{
    id: String,
    sender: String, // 'user' | 'ai' | 'seller'
    senderId: ObjectId,
    text: String,
    timestamp: Number,
    attachment: Object
  }],
  tags: [String],
  notes: String,
  isAiActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### **Orders Collection**
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,
  orderId: String,
  customerId: ObjectId,
  items: [{
    productId: ObjectId,
    productName: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: Number,
  status: String, // 'pending' | 'processing' | 'completed' | 'cancelled'
  paymentIntentId: String,
  paymentStatus: String,
  submittedAt: Date,
  updatedAt: Date
}
```

---

## 🔒 Security Requirements

### **Authentication**
- Use JWT tokens with httpOnly cookies
- Implement refresh token rotation
- Set CORS properly for production domain

### **API Security**
- Rate limiting (express-rate-limit)
- Input validation (joi, express-validator)
- SQL/NoSQL injection prevention
- XSS protection (helmet.js)

### **OAuth**
- Validate state parameter on callbacks
- Store tokens encrypted at rest
- Use secure token storage (Redis recommended)
- Implement token refresh logic

### **Payments**
- **NEVER** store card details
- Use webhook verification
- Implement idempotency keys
- Log all payment events

---

## 🚀 Deployment Checklist

### **Environment Variables**
```bash
# Copy example and configure
cp .env.example .env.local

# Required for production:
- VITE_API_BASE_URL
- VITE_WS_URL
- GEMINI_API_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_FACEBOOK_APP_ID
- VITE_STRIPE_PUBLISHABLE_KEY (or PayPal)
- VITE_VAPID_PUBLIC_KEY
```

### **Backend Server**
1. Set up Node.js/Express server (see `backend/` folder)
2. Configure database (MongoDB/PostgreSQL)
3. Set up Redis for sessions/caching
4. Configure WebSocket server (Socket.io/ws)
5. Set up OAuth callback URLs in provider dashboards
6. Configure payment webhooks

### **Production**
1. Use HTTPS for all endpoints
2. Set up CDN for static assets
3. Configure CORS for your domain
4. Set up monitoring (Sentry, LogRocket)
5. Enable compression (gzip/brotli)
6. Set up SSL certificates
7. Configure reverse proxy (Nginx/Cloudflare)

---

## 📦 Recommended Tech Stack

### **Backend Framework**
- **Node.js + Express** (recommended)
- **NestJS** (TypeScript, more structured)
- **FastAPI** (Python alternative)

### **Database**
- **MongoDB** (NoSQL, flexible schema)
- **PostgreSQL** (SQL, relational)
- **Supabase** (already integrated!)

### **Real-time**
- **Socket.io** (WebSocket with fallbacks)
- **ws** (lightweight WebSocket)

### **Authentication**
- **Passport.js** (OAuth strategies)
- **JWT** (jsonwebtoken)

### **Payments**
- **Stripe SDK** (stripe npm package)
- **PayPal SDK** (@paypal/checkout-server-sdk)

---

## ✅ Testing

### **API Testing**
```bash
# Use Postman collection or
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### **WebSocket Testing**
```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    event: 'shop:join',
    data: { shopId: 'shop_123' }
  }));
};
```

---

## 📚 Next Steps

1. **Review the 5 service files** created in `services/`
2. **Copy `.env.example` to `.env.local`** and configure
3. **Implement backend server** (sample provided in `backend/` folder)
4. **Configure OAuth apps** on each platform
5. **Set up payment provider** (Stripe/PayPal)
6. **Test integration** end-to-end
7. **Deploy to production**

---

## 🆘 Support

All frontend integration code is **production-ready** and waiting for the backend! The services handle:
- ✅ Automatic reconnection
- ✅ Error handling & retry logic
- ✅ Type safety (TypeScript)
- ✅ Timeout handling
- ✅ CSRF protection
- ✅ WebSocket heartbeat

**Your platform is now 100% ready for backend integration!** 🎉
