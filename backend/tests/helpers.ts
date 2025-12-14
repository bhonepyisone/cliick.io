/**
 * Test Helper Utilities
 */

import request from 'supertest';

interface TestUser {
  email: string;
  password: string;
  username?: string;
}

interface TestShop {
  name: string;
  description?: string;
  currency: string;
  assistant_model?: string;
}

/**
 * Create and authenticate a test user
 */
export async function authenticateTestUser(app: any, user: TestUser): Promise<string> {
  // Register
  await request(app)
    .post('/api/auth/register')
    .send({
      username: user.username || user.email.split('@')[0],
      email: user.email,
      password: user.password
    });

  // Login
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: user.password
    });

  return response.body.data?.token || '';
}

/**
 * Create a test shop
 */
export async function createTestShop(
  app: any,
  authToken: string,
  shop: TestShop
): Promise<string> {
  const response = await request(app)
    .post('/api/shops')
    .set('Authorization', `Bearer ${authToken}`)
    .send(shop);

  return response.body.data?.id || '';
}

/**
 * Create a test product
 */
export async function createTestProduct(
  app: any,
  authToken: string,
  shopId: string,
  product: any
): Promise<string> {
  const response = await request(app)
    .post(`/api/shops/${shopId}/products`)
    .set('Authorization', `Bearer ${authToken}`)
    .send(product);

  return response.body.data?.id || '';
}

/**
 * Create a test conversation
 */
export async function createTestConversation(
  app: any,
  authToken: string,
  shopId: string,
  conversation: any
): Promise<string> {
  const response = await request(app)
    .post(`/api/shops/${shopId}/conversations`)
    .set('Authorization', `Bearer ${authToken}`)
    .send(conversation);

  return response.body.data?.id || '';
}

/**
 * Create a test form
 */
export async function createTestForm(
  app: any,
  authToken: string,
  shopId: string,
  form: any
): Promise<string> {
  const response = await request(app)
    .post(`/api/shops/${shopId}/forms`)
    .set('Authorization', `Bearer ${authToken}`)
    .send(form);

  return response.body.data?.id || '';
}

/**
 * Create a test order
 */
export async function createTestOrder(
  app: any,
  authToken: string,
  shopId: string,
  order: any
): Promise<string> {
  const response = await request(app)
    .post(`/api/shops/${shopId}/orders`)
    .set('Authorization', `Bearer ${authToken}`)
    .send(order);

  return response.body.data?.id || '';
}

/**
 * Helper to validate standard response structure
 * Note: Import { expect } from 'vitest' in test files to use this
 */
export function validateResponse(response: any, expectedStatus: number = 200, shouldSucceed: boolean = true) {
  // This helper returns assertion checks that should be used like:
  // validateResponse(response).status.toBe(200);
  return {
    hasSuccessField: () => response.body.hasOwnProperty('success'),
    hasData: () => response.body.hasOwnProperty('data'),
    hasError: () => response.body.hasOwnProperty('error'),
    statusIs: (status: number) => response.status === status,
    successIs: (success: boolean) => response.body.success === success
  };
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
}

/**
 * Generate unique test username
 */
export function generateTestUsername(): string {
  return `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique test shop name
 */
export function generateTestShopName(): string {
  return `Test Shop ${Date.now()}`;
}

/**
 * Wait for async operations
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry logic for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxAttempts - 1) {
        await wait(delayMs * (i + 1));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Mock response builder
 */
export function mockResponse(status: number = 200, data: any = null, error: string | null = null) {
  return {
    status,
    body: {
      success: !error,
      ...(data && { data }),
      ...(error && { error })
    }
  };
}

/**
 * Create batch test data
 */
export async function createBatchTestData(
  app: any,
  authToken: string,
  shopId: string
): Promise<any> {
  // Create multiple products
  const products = [];
  for (let i = 0; i < 3; i++) {
    const productId = await createTestProduct(app, authToken, shopId, {
      name: `Product ${i + 1}`,
      description: `Test product ${i + 1}`,
      retail_price: 99.99 + i * 10,
      stock: 50 - i * 5,
      category: 'Electronics'
    });
    products.push(productId);
  }

  // Create multiple conversations
  const conversations = [];
  for (let i = 0; i < 2; i++) {
    const conversationId = await createTestConversation(app, authToken, shopId, {
      customer_name: `Customer ${i + 1}`,
      platform: 'web',
      status: 'open'
    });
    conversations.push(conversationId);
  }

  // Create multiple forms
  const forms = [];
  for (let i = 0; i < 2; i++) {
    const formId = await createTestForm(app, authToken, shopId, {
      name: `Form ${i + 1}`,
      fields: [
        {
          id: `field_${i}_1`,
          label: 'Name',
          type: 'text',
          required: true
        },
        {
          id: `field_${i}_2`,
          label: 'Email',
          type: 'email',
          required: true
        }
      ]
    });
    forms.push(formId);
  }

  return { products, conversations, forms };
}
