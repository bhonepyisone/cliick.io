# Cliick.io Backend Server

Production-ready backend API server for the Cliick.io e-commerce platform with live chat, AI automation, and social media integrations.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **MongoDB** 5.0+ or **PostgreSQL** 14+
- **Redis** 6.0+ (for sessions/caching)

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file (see Configuration section)

# Start development server
npm run dev
```

The server will start on `http://localhost:8080`

---

## 📂 Project Structure

```
backend/
├── config/
│   └── database.js          # Database connection
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── shops.js            # Shop management
│   ├── products.js         # Product CRUD
│   ├── conversations.js    # Live chat
│   ├── orders.js           # Order management
│   ├── forms.js            # Form builder
│   ├── integrations.js     # OAuth & social media
│   ├── payments.js         # Payment processing
│   └── notifications.js    # Push notifications
├── models/
│   ├── User.js             # User schema
│   ├── Shop.js             # Shop schema
│   ├── Product.js          # Product schema
│   ├── Conversation.js     # Conversation schema
│   └── Order.js            # Order schema
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── validation.js       # Input validation
│   └── errorHandler.js     # Error handling
├── services/
│   ├── oauth.js            # OAuth handlers
│   ├── payment.js          # Payment integration
│   └── notification.js     # Push notifications
├── websocket.js            # WebSocket handlers
├── server.js               # Main server file
├── .env.example            # Environment template
└── package.json            # Dependencies
```

---

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### **Required:**
```env
# Server
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/cliick

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
```

#### **Optional (for full features):**
```env
# Social Media
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Payments
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Redis
REDIS_URL=redis://localhost:6379
```

See [`.env.example`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/backend/.env.example) for all options.

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Shops
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops/:shopId` | Get shop details |
| PUT | `/api/shops/:shopId` | Update shop |
| POST | `/api/shops` | Create shop |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops/:shopId/products` | List products |
| POST | `/api/shops/:shopId/products` | Create product |
| PUT | `/api/shops/:shopId/products/:id` | Update product |
| DELETE | `/api/shops/:shopId/products/:id` | Delete product |

### Conversations (Live Chat)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops/:shopId/conversations` | List conversations |
| GET | `/api/shops/:shopId/conversations/:id` | Get conversation |
| PUT | `/api/shops/:shopId/conversations/:id` | Update conversation |
| POST | `/api/shops/:shopId/conversations/:id/messages` | Send message |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops/:shopId/orders` | List orders |
| GET | `/api/shops/:shopId/orders/:id` | Get order |
| PUT | `/api/shops/:shopId/orders/:id/status` | Update status |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shops/:shopId/payments/intent` | Create payment |
| POST | `/api/shops/:shopId/payments/confirm` | Confirm payment |
| GET | `/api/shops/:shopId/payments/:id` | Get status |

### OAuth Integrations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shops/:shopId/integrations/:platform/connect` | Connect OAuth |
| POST | `/api/shops/:shopId/integrations/:platform/disconnect` | Disconnect |

---

## 🔄 WebSocket Events

### Client → Server
```javascript
{
  "event": "shop:join",
  "data": { "shopId": "shop_123" }
}
```

### Server → Client
```javascript
// New message
{
  "event": "message:new",
  "data": { /* message object */ }
}

// Order update
{
  "event": "order:update",
  "data": { /* order object */ }
}

// Notification
{
  "event": "notification",
  "data": {
    "title": "New Order",
    "message": "Order #12345 received"
  }
}
```

---

## 💳 Payment Integration

### Stripe Setup

1. **Get API Keys** from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. **Add to `.env`:**
   ```env
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   ```
3. **Set up webhook:**
   ```bash
   # Install Stripe CLI
   stripe listen --forward-to localhost:8080/webhook/stripe
   ```

### PayPal Setup

1. **Get credentials** from [PayPal Developer](https://developer.paypal.com/)
2. **Add to `.env`:**
   ```env
   PAYPAL_CLIENT_ID=your_client_id
   PAYPAL_SECRET=your_secret
   PAYPAL_MODE=sandbox
   ```

---

## 🔐 OAuth Setup

### Facebook & Instagram

1. **Create Facebook App** at [developers.facebook.com](https://developers.facebook.com)
2. **Add Facebook Login** product
3. **Set redirect URI:** `http://localhost:8080/oauth/facebook/callback`
4. **Add to `.env`:**
   ```env
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```

### TikTok

1. **Create TikTok Developer App** at [developers.tiktok.com](https://developers.tiktok.com)
2. **Set redirect URI:** `http://localhost:8080/oauth/tiktok/callback`
3. **Add to `.env`:**
   ```env
   TIKTOK_CLIENT_KEY=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   ```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test WebSocket
wscat -c ws://localhost:8080/ws?token=YOUR_JWT_TOKEN
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up Redis for sessions
- [ ] Configure payment webhook URLs
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Enable rate limiting
- [ ] Configure backup strategy
- [ ] Set up SSL certificates

### Docker Deployment

```bash
# Build image
docker build -t cliick-backend .

# Run container
docker run -p 8080:8080 --env-file .env cliick-backend
```

### Cloud Deployment

**Recommended platforms:**
- **Railway** - easiest deployment
- **Heroku** - with Redis add-on
- **DigitalOcean App Platform**
- **AWS Elastic Beanstalk**

---

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-08T15:00:00.000Z",
  "uptime": 3600
}
```

---

## 🔧 Development

### Add New Endpoint

1. Create route in `routes/yourFeature.js`
2. Add to `server.js`:
   ```javascript
   app.use('/api/your-feature', yourFeatureRoutes);
   ```

### Add Database Model

1. Create model in `models/YourModel.js`
2. Use Mongoose schema:
   ```javascript
   const mongoose = require('mongoose');
   
   const schema = new mongoose.Schema({
     name: String,
     createdAt: { type: Date, default: Date.now }
   });
   
   module.exports = mongoose.model('YourModel', schema);
   ```

---

## 🆘 Troubleshooting

### MongoDB Connection Error
```bash
# Ensure MongoDB is running
mongod --dbpath /data/db

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### CORS Issues
- Verify `FRONTEND_URL` in `.env` matches your frontend
- Check CORS middleware in `server.js`

### WebSocket Connection Fails
- Ensure WebSocket port is not blocked
- Check JWT token is being sent
- Verify `VITE_WS_URL` in frontend `.env`

---

## 📚 Resources

- [Frontend Services](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/) - API client, WebSocket, OAuth, Payment services
- [Implementation Guide](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/BACKEND_IMPLEMENTATION.md) - Detailed integration guide
- [Environment Example](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/.env.example) - Frontend environment variables

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Built with ❤️ for Cliick.io - Making e-commerce conversational** 🚀
