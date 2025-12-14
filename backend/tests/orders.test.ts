/**
 * Order Endpoints Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;
let orderId: string;

describe('Order Endpoints', () => {
  beforeAll(async () => {
    // Setup: Login and create a shop
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'order-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data?.token || 'test-token';

    const shopResponse = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Order Test Shop',
        currency: 'USD'
      });

    shopId = shopResponse.body.data?.id || 'test-shop-id';
  });

  afterAll(async () => {
    server.close();
  });

  describe('GET /api/shops/:shopId/orders', () => {
    it('should list all orders', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/orders`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/shops/:shopId/orders', () => {
    it('should create an order', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          form_id: 'form_123',
          form_name: 'Test Form',
          ordered_products: [
            {
              id: 'prod_1',
              name: 'Product 1',
              quantity: 2,
              price: 99.99
            }
          ],
          payment_method: 'credit_card',
          status: 'pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');

      orderId = response.body.data.id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          form_id: 'form_123'
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/shops/:shopId/orders/:orderId', () => {
    it('should get order details', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/orders/${orderId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(orderId);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/orders/nonexistent`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/shops/:shopId/orders/:orderId/status', () => {
    it('should update order status', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'confirmed'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}/orders/${orderId}/status`)
        .send({
          status: 'completed'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/shops/:shopId/orders/:orderId', () => {
    it('should update full order', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          form_id: 'form_123',
          form_name: 'Updated Form',
          status: 'completed',
          ordered_products: [
            {
              id: 'prod_1',
              name: 'Product 1',
              quantity: 3,
              price: 99.99
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
