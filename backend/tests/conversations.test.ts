/**
 * Conversation & Live Chat Endpoints Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;
let conversationId: string;

describe('Conversation Endpoints', () => {
  beforeAll(async () => {
    const testEmail = `conversation-test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testUsername = `convtest_${Date.now()}`;

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
        name: 'Conversation Test Shop',
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

  describe('POST /api/shops/:shopId/conversations', () => {
    it('should create a conversation', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/conversations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'John Doe',
          platform: 'web',
          status: 'open'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customer_name).toBe('John Doe');
      expect(response.body.data.status).toBe('open');

      conversationId = response.body.data.id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/conversations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'Jane Doe'
          // Missing platform
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate platform enum', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/conversations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'Invalid Platform',
          platform: 'invalid_platform'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/shops/:shopId/conversations', () => {
    it('should list all conversations', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/conversations`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/shops/:shopId/conversations/:conversationId', () => {
    it('should get conversation details', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/conversations/${conversationId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(conversationId);
    });
  });

  describe('PUT /api/shops/:shopId/conversations/:conversationId', () => {
    it('should update conversation', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'closed'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('closed');
    });
  });

  describe('POST /api/shops/:shopId/conversations/:conversationId/messages', () => {
    it('should add message to conversation', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Hello, how can I help?',
          sender: 'seller',
          senderId: 'seller_123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.text).toBe('Hello, how can I help?');
    });

    it('should fail with invalid sender', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/conversations/${conversationId}/messages`)
        .send({
          text: 'Invalid message',
          sender: 'invalid_sender',
          senderId: 'user_123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/conversations/${conversationId}/messages`)
        .send({
          text: 'Missing sender'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
