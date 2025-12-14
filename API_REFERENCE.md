# API Reference - Complete Endpoints

## Base URL
```
http://localhost:8080/api  (development)
https://your-production-domain.com/api  (production)
```

## Authentication
All endpoints (except register/login) require:
```
Authorization: Bearer <JWT_TOKEN>
```

Get JWT token from login/register endpoints.

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "username"
}

Response 201:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    },
    "token": "jwt_token"
  }
}
```

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    },
    "token": "jwt_token"
  }
}
```

### Ensure Profile Exists
```http
POST /auth/ensure-profile
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Profile verified/created"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

---

## Shop Management Endpoints

### List User's Shops
```http
GET /shops
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "shop-uuid",
      "name": "My Shop",
      "owner_id": "user-uuid",
      "subscription_plan": "Trial",
      "subscription_status": "trialing"
    }
  ]
}
```

### Get Shop Details
```http
GET /shops/:shopId

Response 200:
{
  "success": true,
  "data": {
    "id": "shop-uuid",
    "name": "My Shop",
    "description": "Shop description",
    "currency": "USD",
    "owner_id": "user-uuid",
    "subscription_plan": "Trial"
  }
}
```

### Create Shop
```http
POST /shops
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "My New Shop",
  "description": "Shop description",
  "currency": "USD",
  "assistant_model": "default"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "new-shop-uuid",
    "name": "My New Shop",
    "subscription_plan": "Trial"
  }
}
```

### Update Shop
```http
PUT /shops/:shopId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Updated Shop Name",
  "description": "New description",
  "currency": "EUR"
}

Response 200:
{
  "success": true,
  "data": { /* updated shop */ }
}
```

### Upgrade Subscription
```http
POST /shops/:shopId/upgrade
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "subscription_plan": "Starter",
  "subscription_status": "active"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "shop-uuid",
    "subscription_plan": "Starter",
    "subscription_status": "active"
  }
}
```

### Delete Shop
```http
DELETE /shops/:shopId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Shop deleted successfully"
}
```

---

## Product Endpoints

### List Products
```http
GET /shops/:shopId/products

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "product-uuid",
      "name": "Product Name",
      "retail_price": 29.99,
      "stock": 10,
      "category": "Electronics"
    }
  ]
}
```

### Create Product
```http
POST /shops/:shopId/products
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "retail_price": 29.99,
  "stock": 5,
  "category": "Electronics"
}

Response 201:
{
  "success": true,
  "data": { /* created product */ }
}
```

### Get Product
```http
GET /shops/:shopId/products/:productId

Response 200:
{
  "success": true,
  "data": { /* product details */ }
}
```

### Update Product
```http
PUT /shops/:shopId/products/:productId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Updated Name",
  "retail_price": 39.99,
  "stock": 15
}

Response 200:
{
  "success": true,
  "data": { /* updated product */ }
}
```

### Update Stock
```http
PUT /shops/:shopId/products/:productId/stock
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "adjustment": 5,
  "reason": "Restock from supplier"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "product-uuid",
    "stock": 20,
    "newStock": 20,
    "previousStock": 15
  }
}
```

### Delete Product
```http
DELETE /shops/:shopId/products/:productId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Product deleted"
}
```

---

## Order Endpoints

### List Orders
```http
GET /shops/:shopId/orders

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "form_submission_id": "submission-uuid",
      "status": "Pending",
      "created_at": "2025-12-12T10:00:00Z"
    }
  ]
}
```

### Create Order
```http
POST /shops/:shopId/orders
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "form_submission_id": "submission-uuid",
  "items": [
    {
      "product_id": "product-uuid",
      "quantity": 2
    }
  ],
  "status": "Pending"
}

Note: Items array is optional. If provided, inventory is auto-deducted.

Response 201:
{
  "success": true,
  "data": { /* created order */ }
}
```

### Get Order
```http
GET /shops/:shopId/orders/:orderId

Response 200:
{
  "success": true,
  "data": { /* order details */ }
}
```

### Update Order Status
```http
PUT /shops/:shopId/orders/:orderId/status
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "status": "Processing"
}

Response 200:
{
  "success": true,
  "data": { /* updated order */ }
}
```

### Delete Order
```http
DELETE /shops/:shopId/orders/:orderId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Order deleted successfully"
}
```

---

## Form Endpoints

### List Forms
```http
GET /shops/:shopId/forms

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "form-uuid",
      "name": "Contact Form",
      "fields": [
        {
          "name": "email",
          "type": "email",
          "required": true
        }
      ]
    }
  ]
}
```

### Create Form
```http
POST /shops/:shopId/forms
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Contact Form",
  "description": "Get in touch",
  "fields": [
    {
      "name": "email",
      "type": "email",
      "required": true
    },
    {
      "name": "message",
      "type": "textarea",
      "required": true
    }
  ]
}

Field Types: text, email, number, date, checkbox, select, textarea

Response 201:
{
  "success": true,
  "data": { /* created form */ }
}
```

### Update Form
```http
PUT /shops/:shopId/forms/:formId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Updated Form Name",
  "description": "Updated description"
}

Response 200:
{
  "success": true,
  "data": { /* updated form */ }
}
```

### Submit Form
```http
POST /shops/:shopId/forms/:formId/submissions
Content-Type: application/json

{
  "data": {
    "email": "user@example.com",
    "message": "Hello!"
  },
  "status": "Pending"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "form_id": "form-uuid",
    "data": { /* form data */ },
    "status": "Pending"
  }
}
```

### Delete Form
```http
DELETE /shops/:shopId/forms/:formId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Form deleted successfully"
}
```

---

## Conversation Endpoints

### List Conversations
```http
GET /shops/:shopId/conversations

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "conversation-uuid",
      "customer_name": "John Doe",
      "channel": "chat",
      "status": "Open"
    }
  ]
}
```

### Create Conversation
```http
POST /shops/:shopId/conversations
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "customer_name": "John Doe",
  "channel": "chat",
  "status": "Open"
}

Channels: email, chat, phone, social
Statuses: Open, Closed, Waiting

Response 201:
{
  "success": true,
  "data": { /* created conversation */ }
}
```

### Get Conversation
```http
GET /shops/:shopId/conversations/:conversationId

Response 200:
{
  "success": true,
  "data": {
    "id": "conversation-uuid",
    "customer_name": "John Doe",
    "messageCount": 5
  }
}
```

### Update Conversation
```http
PUT /shops/:shopId/conversations/:conversationId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "status": "Closed"
}

Response 200:
{
  "success": true,
  "data": { /* updated conversation */ }
}
```

### Send Message
```http
POST /shops/:shopId/conversations/:conversationId/messages
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "text": "Hello! How can I help?",
  "sender": "agent",
  "sender_id": "optional-user-id"
}

Sender: customer or agent

Response 201:
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "text": "Hello! How can I help?",
    "sender": "agent",
    "created_at": "2025-12-12T10:00:00Z"
  }
}
```

### Get Messages
```http
GET /shops/:shopId/conversations/:conversationId/messages?limit=50&offset=0

Response 200:
{
  "success": true,
  "data": [ /* message array */ ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 100
  }
}
```

### Delete Message
```http
DELETE /shops/:shopId/conversations/:conversationId/messages/:messageId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Message deleted"
}
```

### Delete Conversation
```http
DELETE /shops/:shopId/conversations/:conversationId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "message": "Conversation deleted"
}
```

---

## Analytics Endpoints

### Overview Dashboard
```http
GET /shops/:shopId/analytics/overview?period=30
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "period": 30,
    "metrics": {
      "totalOrders": 5,
      "totalRevenue": 150.00,
      "totalProducts": 10,
      "totalForms": 3,
      "totalConversations": 8,
      "averageOrderValue": 30.00
    }
  }
}
```

### Order Analytics
```http
GET /shops/:shopId/analytics/orders?period=30
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "period": 30,
    "byStatus": {
      "Pending": 2,
      "Processing": 1,
      "Completed": 2,
      "Cancelled": 0
    },
    "byDay": {
      "2025-12-12": 2,
      "2025-12-11": 3
    },
    "total": 5
  }
}
```

### Product Analytics
```http
GET /shops/:shopId/analytics/products
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "totalProducts": 10,
    "topProducts": [
      {
        "id": "product-uuid",
        "name": "Top Seller",
        "unitsSold": 15,
        "estimatedRevenue": 450.00
      }
    ]
  }
}
```

### Form Analytics
```http
GET /shops/:shopId/analytics/forms
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "totalForms": 3,
    "forms": [
      {
        "id": "form-uuid",
        "name": "Contact Form",
        "totalSubmissions": 25,
        "pendingSubmissions": 5,
        "completionRate": "80.0"
      }
    ]
  }
}
```

### Conversation Analytics
```http
GET /shops/:shopId/analytics/conversations?period=30
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "period": 30,
    "total": 8,
    "byStatus": {
      "Open": 3,
      "Closed": 4,
      "Waiting": 1
    },
    "byChannel": {
      "chat": 5,
      "email": 3
    },
    "averageResponseTime": "2h"
  }
}
```

### Revenue Analytics
```http
GET /shops/:shopId/analytics/revenue?period=30
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "period": 30,
    "totalRevenue": 450.00,
    "avgDailyRevenue": "15.00",
    "byDay": {
      "2025-12-12": 100.00,
      "2025-12-11": 150.00
    },
    "orderCount": 5
  }
}
```

---

## Error Response Format

All endpoints use consistent error responses:

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

### HTTP Status Codes
- 200 - Success
- 201 - Created
- 400 - Bad Request (validation error)
- 401 - Unauthorized (missing/invalid token)
- 403 - Forbidden (not authorized for resource)
- 404 - Not Found
- 500 - Server Error

---

## Rate Limiting

Auth endpoints have rate limiting:
- Register: 5 requests per hour per IP
- Login: 10 requests per hour per IP

Other endpoints: 100 requests per 15 minutes per IP

---

## Examples Using JavaScript

### Register and Login
```javascript
// Register
const registerResponse = await fetch('http://localhost:8080/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123',
    username: 'username'
  })
});

const { data: { token } } = await registerResponse.json();

// Login
const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'Password123'
  })
});

const { data: { token } } = await loginResponse.json();
```

### Create Shop (Authenticated)
```javascript
const createShopResponse = await fetch('http://localhost:8080/api/shops', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My Shop',
    currency: 'USD',
    description: 'My awesome shop'
  })
});

const { data: shop } = await createShopResponse.json();
console.log('Shop created:', shop.id);
```

### Create Product
```javascript
const createProductResponse = await fetch(`http://localhost:8080/api/shops/${shopId}/products`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Product Name',
    retail_price: 29.99,
    stock: 10,
    category: 'Electronics'
  })
});

const { data: product } = await createProductResponse.json();
console.log('Product created:', product.id);
```

---

## Frontend Usage

Use the provided `apiClient` singleton:

```javascript
import { apiClient } from './services/apiClient';

// Register
const result = await apiClient.register('email@example.com', 'password', 'username');

// Create shop
const shop = await apiClient.createShop({
  name: 'My Shop',
  currency: 'USD'
});

// Create product
const product = await apiClient.createProduct(shopId, {
  name: 'Product',
  retail_price: 29.99,
  stock: 10
});

// Upgrade subscription
const upgraded = await apiClient.upgradeSubscription(shopId, 'Starter', 'active');
```

---

For more details, check the backend route files in `backend/routes/` or contact support.

