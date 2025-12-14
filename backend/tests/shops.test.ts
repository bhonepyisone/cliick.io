/**
 * Shop Endpoints Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;

describe('Shop Endpoints', () => {
  beforeAll(async () => {
    const testEmail = `shop-test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testUsername = `shoptest_${Date.now()}`;

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
  });

  afterAll(async () => {
    server.close();
  });

  describe('POST /api/shops', () => {
    it('should create a new shop', async () => {
      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Shop',
          description: 'A test shop',
          currency: 'USD',
          assistant_model: 'STANDARD'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Shop');
      expect(response.body.data.id).toBeDefined();

      shopId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/shops')
        .send({
          name: 'Unauthorized Shop',
          currency: 'USD'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing name'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/shops/:shopId', () => {
    it('should get shop details', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(shopId);
    });

    it('should return 404 for non-existent shop', async () => {
      const response = await request(app)
        .get('/api/shops/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/shops/:shopId', () => {
    it('should update shop', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Shop Name',
          description: 'Updated description',
          currency: 'EUR'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Shop Name');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '' // Empty name
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
