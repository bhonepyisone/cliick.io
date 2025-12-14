/**
 * Product Endpoints Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;
let productId: string;

describe('Product Endpoints', () => {
  beforeAll(async () => {
    const testEmail = `product-test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testUsername = `producttest_${Date.now()}`;

    // Register a test user first
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        username: testUsername
      });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    authToken = loginResponse.body.data?.token || '';
    if (!authToken) {
      throw new Error('Failed to get auth token - login failed');
    }

    const shopResponse = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Product Test Shop',
        currency: 'USD'
      });

    shopId = shopResponse.body.data?.id || '';
    if (!shopId) {
      throw new Error('Failed to create test shop');
    }
  });

  afterAll(async () => {
    server.close();
  });

  describe('GET /api/shops/:shopId/products', () => {
    it('should list all products', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/products`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/shops/:shopId/products', () => {
    it('should create a product', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/products`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product',
          description: 'A test product',
          retail_price: 99.99,
          stock: 50,
          category: 'Electronics'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Product');
      expect(response.body.data.retail_price).toBe(99.99);

      productId = response.body.data.id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/products`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incomplete Product'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/shops/:shopId/products/:productId', () => {
    it('should get product details', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(productId);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/products/nonexistent`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/shops/:shopId/products/:productId', () => {
    it('should update product', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Product',
          retail_price: 149.99,
          stock: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Product');
      expect(response.body.data.retail_price).toBe(149.99);
    });
  });

  describe('DELETE /api/shops/:shopId/products/:productId', () => {
    it('should delete product', async () => {
      const response = await request(app)
        .delete(`/api/shops/${shopId}/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for already deleted product', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/products/${productId}`);

      expect(response.status).toBe(404);
    });
  });
});
