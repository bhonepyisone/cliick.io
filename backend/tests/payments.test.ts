/**
 * Payment Endpoints Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;
let paymentIntentId: string;

describe('Payment Endpoints', () => {
  beforeAll(async () => {
    // Setup: Login and create a shop
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'payment-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data?.token || 'test-token';

    const shopResponse = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Payment Test Shop',
        currency: 'USD'
      });

    shopId = shopResponse.body.data?.id || 'test-shop-id';
  });

  afterAll(async () => {
    server.close();
  });

  describe('POST /api/shops/:shopId/payments/intent', () => {
    it('should create payment intent', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/intent`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'order_123',
          amount: 9999
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.clientSecret).toBeDefined();
      expect(response.body.data.amount).toBe(9999);

      paymentIntentId = response.body.data.paymentIntentId;
    });

    it('should validate amount', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/intent`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'order_124',
          amount: -100 // Invalid negative amount
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/intent`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'order_125'
          // Missing amount
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/shops/:shopId/payments/confirm', () => {
    it('should confirm payment', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('succeeded');
    });

    it('should fail without payment intent id', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/shops/:shopId/payments/:paymentId', () => {
    it('should get payment status', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/payments/${paymentIntentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/payments/nonexistent`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/shops/:shopId/payments/:paymentId/refund', () => {
    it('should process refund', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/${paymentIntentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          reason: 'Customer request'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('succeeded');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/payments/${paymentIntentId}/refund`)
        .send({
          amount: 5000,
          reason: 'Customer request'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
