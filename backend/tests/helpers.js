"use strict";
/**
 * Test Helper Utilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTestUser = authenticateTestUser;
exports.createTestShop = createTestShop;
exports.createTestProduct = createTestProduct;
exports.createTestConversation = createTestConversation;
exports.createTestForm = createTestForm;
exports.createTestOrder = createTestOrder;
exports.validateResponse = validateResponse;
exports.generateTestEmail = generateTestEmail;
exports.generateTestUsername = generateTestUsername;
exports.generateTestShopName = generateTestShopName;
exports.wait = wait;
exports.retry = retry;
exports.mockResponse = mockResponse;
exports.createBatchTestData = createBatchTestData;
const supertest_1 = __importDefault(require("supertest"));
/**
 * Create and authenticate a test user
 */
async function authenticateTestUser(app, user) {
    // Register
    await (0, supertest_1.default)(app)
        .post('/api/auth/register')
        .send({
        username: user.username || user.email.split('@')[0],
        email: user.email,
        password: user.password
    });
    // Login
    const response = await (0, supertest_1.default)(app)
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
async function createTestShop(app, authToken, shop) {
    const response = await (0, supertest_1.default)(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shop);
    return response.body.data?.id || '';
}
/**
 * Create a test product
 */
async function createTestProduct(app, authToken, shopId, product) {
    const response = await (0, supertest_1.default)(app)
        .post(`/api/shops/${shopId}/products`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(product);
    return response.body.data?.id || '';
}
/**
 * Create a test conversation
 */
async function createTestConversation(app, authToken, shopId, conversation) {
    const response = await (0, supertest_1.default)(app)
        .post(`/api/shops/${shopId}/conversations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversation);
    return response.body.data?.id || '';
}
/**
 * Create a test form
 */
async function createTestForm(app, authToken, shopId, form) {
    const response = await (0, supertest_1.default)(app)
        .post(`/api/shops/${shopId}/forms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(form);
    return response.body.data?.id || '';
}
/**
 * Create a test order
 */
async function createTestOrder(app, authToken, shopId, order) {
    const response = await (0, supertest_1.default)(app)
        .post(`/api/shops/${shopId}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(order);
    return response.body.data?.id || '';
}
/**
 * Helper to validate standard response structure
 * Note: Import { expect } from 'vitest' in test files to use this
 */
function validateResponse(response, expectedStatus = 200, shouldSucceed = true) {
    // This helper returns assertion checks that should be used like:
    // validateResponse(response).status.toBe(200);
    return {
        hasSuccessField: () => response.body.hasOwnProperty('success'),
        hasData: () => response.body.hasOwnProperty('data'),
        hasError: () => response.body.hasOwnProperty('error'),
        statusIs: (status) => response.status === status,
        successIs: (success) => response.body.success === success
    };
}
/**
 * Generate unique test email
 */
function generateTestEmail() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
}
/**
 * Generate unique test username
 */
function generateTestUsername() {
    return `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Generate unique test shop name
 */
function generateTestShopName() {
    return `Test Shop ${Date.now()}`;
}
/**
 * Wait for async operations
 */
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry logic for flaky tests
 */
async function retry(fn, maxAttempts = 3, delayMs = 100) {
    let lastError = null;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
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
function mockResponse(status = 200, data = null, error = null) {
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
async function createBatchTestData(app, authToken, shopId) {
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
