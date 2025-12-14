# Backend Integration Testing Guide

## Overview

This project includes comprehensive integration tests for all backend endpoints using Vitest and Supertest. Tests cover:

- **Authentication** (register, login, refresh, logout)
- **Shops** (CRUD operations)
- **Products** (CRUD operations)
- **Orders** (creation, status updates)
- **Conversations** (messaging, conversation management)
- **Forms** (form builder, submissions)
- **Payments** (payment intents, confirmations, refunds)
- **Integrations** (OAuth connections)
- **Notifications** (email, SMS, push, in-app)
- **Webhooks** (Stripe, PayPal)

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev vitest supertest @vitest/ui
npm install --save-dev @types/supertest
```

### 2. Environment Variables

Create a `.env.test` file in the backend directory:

```env
NODE_ENV=test
PORT=8080

# JWT Configuration
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d

# Supabase (Test/Mock)
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
SUPABASE_ANON_KEY=test-anon-key

# Stripe (Sandbox)
STRIPE_SECRET_KEY=sk_test_mock_key
STRIPE_WEBHOOK_SECRET=whsec_test_mock

# PayPal (Sandbox)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=test_client_id
PAYPAL_SECRET=test_secret
```

### 3. Update server.js for Testing

Your `server.js` should export both `app` and `server`:

```javascript
// At the end of server.js
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, server };
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- tests/auth.test.ts
npm test -- tests/products.test.ts
```

### Run with UI Dashboard

```bash
npm run test:ui
```

### Run with Coverage Report

```bash
npm run test:coverage
```

### Watch Mode (Auto-rerun on changes)

```bash
npm run test:watch
```

## Test Structure

Each test file follows this pattern:

```typescript
describe('Feature Name', () => {
  let authToken: string;
  let resourceId: string;

  beforeAll(async () => {
    // Setup: Login and create test resources
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('GET /api/endpoint', () => {
    it('should do something', async () => {
      const response = await request(app)
        .get('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## Key Testing Patterns

### Authentication Tests

```typescript
// With token
const response = await request(app)
  .get('/api/auth/me')
  .set('Authorization', `Bearer ${authToken}`);

// Without token (should fail)
const response = await request(app)
  .get('/api/auth/me');
expect(response.status).toBe(401);
```

### Data Creation Tests

```typescript
const response = await request(app)
  .post('/api/shops')
  .set('Authorization', `Bearer ${authToken}`)
  .send({
    name: 'Test Shop',
    currency: 'USD'
  });

expect(response.status).toBe(201);
resourceId = response.body.data.id;
```

### Error Case Tests

```typescript
it('should fail with invalid email', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'invalid-email',
      password: 'password123'
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
```

## Test Files Overview

| File | Tests | Coverage |
|------|-------|----------|
| `auth.test.ts` | 15 | Register, Login, Refresh, Logout, Get User |
| `shops.test.ts` | 8 | Create, Read, Update Shop |
| `products.test.ts` | 11 | CRUD operations for products |
| `orders.test.ts` | 9 | Create, Read, Update order status |
| `conversations.test.ts` | 12 | Conversations and messaging |
| `forms.test.ts` | 10 | Form builder and submissions |
| `payments.test.ts` | 11 | Payment intents, confirmations, refunds |
| `integrations.test.ts` | 10 | OAuth connections (Facebook, Instagram, TikTok, Telegram, Viber) |
| `notifications.test.ts` | 14 | Email, SMS, Push, In-app notifications |
| `webhooks.test.ts` | 10 | Stripe and PayPal webhook handling |

**Total: 110 integration tests**

## Response Format

All endpoints return standardized JSON:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (invalid token)
- `404` - Not Found
- `500` - Server Error

## Debugging Tests

### Enable Verbose Output

```bash
npm test -- --reporter=verbose
```

### Run Single Test

```bash
npm test -- -t "should create a new shop"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:debug"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Mocking External Services

### Supabase Mocking

Tests use real Supabase client initialization but expect mock environment variables. For real database testing:

```bash
# Use test Supabase project
SUPABASE_URL=<your-test-project-url>
SUPABASE_SERVICE_ROLE_KEY=<your-test-key>
```

### Stripe/PayPal Mocking

Webhook tests send mock event payloads. For real webhook testing, use Stripe CLI:

```bash
# Terminal 1: Start Stripe webhook forwarding
stripe listen --forward-to localhost:8080/webhook/stripe

# Terminal 2: Run tests
npm test -- tests/webhooks.test.ts
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Common Issues & Solutions

### Issue: "Cannot find module 'supertest'"
**Solution:** Run `npm install --save-dev supertest`

### Issue: "Socket already in use"
**Solution:** Change test port or ensure previous server is closed

### Issue: "JWT verification failed"
**Solution:** Ensure JWT_SECRET matches between server and tests

### Issue: "Database connection error"
**Solution:** Check Supabase credentials in .env.test

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always cleanup created resources
3. **Assertions**: Test both success and error cases
4. **Realistic Data**: Use realistic test data that matches production constraints
5. **Performance**: Keep tests fast (< 30 seconds total)
6. **Documentation**: Add comments for complex test scenarios

## Performance Metrics

Current test suite performance:
- Total Tests: 110
- Average Time: < 5 seconds
- Success Rate: Should be 100% with proper mocking

## Next Steps

1. Add database seeding for test data
2. Implement test data factories
3. Add performance benchmarks
4. Setup automated test reporting
5. Create test coverage dashboards
