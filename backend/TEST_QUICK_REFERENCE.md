# Test Quick Reference Guide

## Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.test file with test configuration
# Copy contents from TESTING.md Environment Variables section
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.ts

# Run tests matching pattern
npm test -- -t "should create a new shop"

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# Debug mode
npm run test:debug
```

## Test Files & Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `auth.test.ts` | 15 | Register, Login, Refresh, Logout, Me |
| `shops.test.ts` | 8 | Create, Read, Update |
| `products.test.ts` | 11 | CRUD operations |
| `orders.test.ts` | 9 | Create, Read, Update status |
| `conversations.test.ts` | 12 | Conversations & messaging |
| `forms.test.ts` | 10 | Form builder & submissions |
| `payments.test.ts` | 11 | Payments & refunds |
| `integrations.test.ts` | 10 | OAuth integrations |
| `notifications.test.ts` | 14 | All notification types |
| `webhooks.test.ts` | 10 | Stripe & PayPal webhooks |

**Total: 110 tests**

## Common Test Patterns

### Basic Request Test
```typescript
const response = await request(app)
  .get('/api/endpoint')
  .set('Authorization', `Bearer ${authToken}`);

expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
```

### POST with Data
```typescript
const response = await request(app)
  .post('/api/shops')
  .set('Authorization', `Bearer ${authToken}`)
  .send({
    name: 'Test Shop',
    currency: 'USD'
  });

expect(response.status).toBe(201);
shopId = response.body.data.id;
```

### Error Case
```typescript
const response = await request(app)
  .post('/api/auth/login')
  .send({
    email: 'wrong@example.com',
    password: 'wrong'
  });

expect(response.status).toBe(401);
expect(response.body.success).toBe(false);
```

## Using Test Helpers

All test files can import helpers from `tests/helpers.ts`:

```typescript
import {
  authenticateTestUser,
  createTestShop,
  createTestProduct,
  generateTestEmail,
  wait,
  retry
} from './helpers';

// Authenticate a user
const token = await authenticateTestUser(app, {
  email: 'test@example.com',
  password: 'password123'
});

// Create test shop
const shopId = await createTestShop(app, token, {
  name: 'Test Shop',
  currency: 'USD'
});
```

## Environment Variables for Tests

**Required in .env.test:**

```
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
STRIPE_SECRET_KEY=sk_test_mock_key
PAYPAL_MODE=sandbox
```

## Response Format

All endpoints return standardized JSON:

```typescript
// Success (201 Created)
{
  "success": true,
  "data": { /* resource data */ }
}

// Success (200 OK with list)
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100
  }
}

// Error
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET /api/shops/123 |
| 201 | Created | POST /api/shops |
| 400 | Bad Request | Invalid email format |
| 401 | Unauthorized | Missing token |
| 403 | Forbidden | Invalid token |
| 404 | Not Found | GET /api/shops/nonexistent |
| 500 | Server Error | Database error |

## Test Structure

Each test file follows:

```typescript
describe('Feature Name', () => {
  let authToken: string;
  let resourceId: string;

  beforeAll(async () => {
    // Setup: authenticate, create test data
  });

  afterAll(async () => {
    // Cleanup: close connections
  });

  describe('GET /api/endpoint', () => {
    it('should return success', async () => {
      const response = await request(app)
        .get('/api/endpoint');
      expect(response.status).toBe(200);
    });
  });
});
```

## Debugging Tips

### Check Request Details
```typescript
console.log(response.status);    // HTTP status
console.log(response.body);      // Response JSON
console.log(response.headers);   // Response headers
```

### Run Single Test
```bash
npm test -- -t "specific test name"
```

### Verbose Output
```bash
npm test -- --reporter=verbose
```

### See Test File Structure
```bash
npm test -- --reporter=verbose tests/auth.test.ts
```

## Common Issues

### Issue: "Cannot find module 'vitest'"
**Fix:** Run `npm install` first

### Issue: "Port already in use"
**Fix:** Change test port or kill existing process

### Issue: "JWT verification failed"
**Fix:** Ensure JWT_SECRET in .env.test matches server config

### Issue: "Connection timeout"
**Fix:** Increase timeout in vitest.config.ts

### Issue: "Test fails randomly"
**Fix:** Check for race conditions, use await properly, or increase timeout

## File Organization

```
backend/
├── tests/
│   ├── auth.test.ts            # Authentication endpoints
│   ├── shops.test.ts           # Shop management
│   ├── products.test.ts        # Product CRUD
│   ├── orders.test.ts          # Order management
│   ├── conversations.test.ts   # Messaging
│   ├── forms.test.ts           # Form builder
│   ├── payments.test.ts        # Payment processing
│   ├── integrations.test.ts    # OAuth integrations
│   ├── notifications.test.ts   # Notifications
│   ├── webhooks.test.ts        # Webhook handlers
│   ├── helpers.ts              # Shared utilities
│   └── setup.ts                # Global configuration
├── vitest.config.ts            # Vitest config
├── TESTING.md                  # Detailed guide
├── INTEGRATION_TESTS_SUMMARY.md # Full summary
├── TEST_QUICK_REFERENCE.md     # This file
└── package.json                # Updated scripts
```

## Expected Output

```
 ✓ tests/auth.test.ts (15)
   ✓ POST /api/auth/register (3)
   ✓ POST /api/auth/login (3)
   ✓ GET /api/auth/me (3)
   ✓ POST /api/auth/refresh (3)
   ✓ POST /api/auth/logout (2)

 ✓ tests/shops.test.ts (8)
   ✓ POST /api/shops (3)
   ✓ GET /api/shops/:shopId (2)
   ✓ PUT /api/shops/:shopId (3)

... (all 110 tests)

Test Files  10 passed (10)
     Tests  110 passed (110)
```

## Performance Targets

- ⏱️ Total test suite: < 30 seconds
- ⏱️ Per test average: 200-300ms
- 🎯 Coverage target: 80%
- 📊 Success rate: 100%

## CI/CD Integration

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

## Next Steps

1. Run `npm test` to verify setup
2. Check `TESTING.md` for detailed documentation
3. Review individual test files for patterns
4. Add tests for custom endpoints
5. Setup CI/CD integration
6. Monitor coverage reports

## Useful Links

- [Vitest Docs](https://vitest.dev)
- [Supertest Docs](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com)

---

**Ready to test! Run `npm test` to get started.**
