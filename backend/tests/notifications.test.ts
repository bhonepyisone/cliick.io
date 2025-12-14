/**
 * Notification Endpoints Integration Tests
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

describe('Notification Endpoints', () => {
  afterAll(async () => {
    server.close();
  });

  describe('POST /api/notifications/subscribe', () => {
    it('should subscribe to push notifications', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          userId: 'user_123',
          subscription: {
            endpoint: 'https://fcm.googleapis.com/...',
            keys: {
              p256dh: 'base64_encoded_key',
              auth: 'base64_encoded_auth'
            }
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscriptionId).toBeDefined();
    });

    it('should fail without user id', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          subscription: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/unsubscribe', () => {
    it('should unsubscribe from notifications', async () => {
      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .send({
          userId: 'user_123',
          subscription: {
            endpoint: 'https://fcm.googleapis.com/...'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/notifications/email', () => {
    it('should send email notification', async () => {
      const response = await request(app)
        .post('/api/notifications/email')
        .send({
          email: 'test@example.com',
          subject: 'Test Email',
          message: 'This is a test email',
          userId: 'user_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emailId).toBeDefined();
      expect(response.body.data.status).toBe('sent');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/notifications/email')
        .send({
          email: 'invalid-email',
          subject: 'Test',
          message: 'Test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/sms', () => {
    it('should send SMS notification', async () => {
      const response = await request(app)
        .post('/api/notifications/sms')
        .send({
          phone: '+1234567890',
          message: 'Test SMS',
          userId: 'user_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.smsId).toBeDefined();
      expect(response.body.data.status).toBe('sent');
    });

    it('should fail without phone', async () => {
      const response = await request(app)
        .post('/api/notifications/sms')
        .send({
          message: 'Test SMS'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notifications/in-app', () => {
    it('should send in-app notification', async () => {
      const response = await request(app)
        .post('/api/notifications/in-app')
        .send({
          userId: 'user_123',
          title: 'New Order',
          message: 'You have a new order',
          type: 'info'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationId).toBeDefined();
      expect(response.body.data.read).toBe(false);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/notifications/in-app')
        .send({
          userId: 'user_123'
          // Missing title and message
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/user/:userId', () => {
    it('should get user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/user/user_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/notifications/user/user_123?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('PUT /api/notifications/:notificationId/read', () => {
    it('should mark notification as read', async () => {
      const response = await request(app)
        .put('/api/notifications/notif_123/read');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.read).toBe(true);
    });
  });

  describe('DELETE /api/notifications/:notificationId', () => {
    it('should delete notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/notif_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
