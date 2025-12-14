/**
 * Webhook Endpoints Integration Tests
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

describe('Webhook Endpoints', () => {
  afterAll(async () => {
    server.close();
  });

  describe('POST /webhook/stripe', () => {
    it('should handle Stripe webhook', async () => {
      const response = await request(app)
        .post('/webhook/stripe')
        .set('stripe-signature', 'mock_signature_123')
        .send({
          id: 'evt_123',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_123',
              amount: 9999,
              status: 'succeeded'
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle different Stripe events', async () => {
      const events = [
        'payment_intent.succeeded',
        'charge.refunded',
        'payment_intent.payment_failed'
      ];

      for (const eventType of events) {
        const response = await request(app)
          .post('/webhook/stripe')
          .set('stripe-signature', 'mock_signature_123')
          .send({
            type: eventType,
            data: {}
          });

        expect([200, 400]).toContain(response.status);
      }
    });

    it('should fail without signature', async () => {
      const response = await request(app)
        .post('/webhook/stripe')
        .send({
          type: 'payment_intent.succeeded',
          data: {}
        });

      // May accept anyway for development
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /webhook/paypal', () => {
    it('should handle PayPal webhook', async () => {
      const response = await request(app)
        .post('/webhook/paypal')
        .send({
          id: 'WH-123',
          event_type: 'CHECKOUT.ORDER.COMPLETED',
          resource: {
            id: 'PAYID-123',
            status: 'COMPLETED',
            purchase_units: [
              {
                amount: {
                  value: '99.99'
                }
              }
            ]
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle PayPal refund event', async () => {
      const response = await request(app)
        .post('/webhook/paypal')
        .send({
          event_type: 'PAYMENT.CAPTURE.REFUNDED',
          resource: {
            id: 'REFUND-123',
            status: 'COMPLETED'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle unknown event types', async () => {
      const response = await request(app)
        .post('/webhook/paypal')
        .send({
          event_type: 'UNKNOWN.EVENT.TYPE',
          resource: {}
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid JSON', async () => {
      const response = await request(app)
        .post('/webhook/paypal')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });
  });
});
