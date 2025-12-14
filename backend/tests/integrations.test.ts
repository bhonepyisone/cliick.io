/**
 * OAuth Integrations Endpoints Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;

describe('Integration Endpoints', () => {
  beforeAll(async () => {
    // Setup: Login and create a shop
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'integration-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data?.token || 'test-token';

    const shopResponse = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Integration Test Shop',
        currency: 'USD'
      });

    shopId = shopResponse.body.data?.id || 'test-shop-id';
  });

  afterAll(async () => {
    server.close();
  });

  describe('GET /api/shops/:shopId/integrations', () => {
    it('should list all integrations', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/integrations`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/shops/:shopId/integrations/:platform', () => {
    it('should get integration status', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/integrations/facebook`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('facebook');
    });

    it('should handle invalid platform', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/integrations/invalid`);

      // May return 404 or handle gracefully
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/shops/:shopId/integrations/:platform/connect', () => {
    it('should connect OAuth provider with code', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/integrations/facebook/connect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'mock_auth_code_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('facebook');
      expect(response.body.data.status).toBe('active');
    });

    it('should handle different platforms', async () => {
      const platforms = ['instagram', 'tiktok', 'telegram', 'viber'];

      for (const platform of platforms) {
        const response = await request(app)
          .post(`/api/shops/${shopId}/integrations/${platform}/connect`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            code: `mock_${platform}_code_123`
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.platform).toBe(platform);
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/integrations/facebook/connect`)
        .send({
          code: 'auth_code'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require authorization code', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/integrations/facebook/connect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/shops/:shopId/integrations/:platform/disconnect', () => {
    it('should disconnect OAuth provider', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/integrations/facebook/disconnect`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('facebook');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/integrations/facebook/disconnect`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
