/**
 * Form Endpoints Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, server } from '../server-mock';

let authToken: string;
let shopId: string;
let formId: string;

describe('Form Endpoints', () => {
  beforeAll(async () => {
    const testEmail = `form-test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    const testUsername = `formtest_${Date.now()}`;

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
        name: 'Form Test Shop',
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

  describe('GET /api/shops/:shopId/forms', () => {
    it('should list all forms', async () => {
      const response = await request(app)
        .get(`/api/shops/${shopId}/forms`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/shops/:shopId/forms', () => {
    it('should create a form', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/forms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Order Form',
          fields: [
            {
              id: 'field_1',
              label: 'Name',
              type: 'text',
              required: true
            },
            {
              id: 'field_2',
              label: 'Email',
              type: 'email',
              required: true
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Order Form');
      expect(response.body.data.fields.length).toBe(2);

      formId = response.body.data.id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/forms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing name
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/shops/:shopId/forms/:formId', () => {
    it('should update form', async () => {
      const response = await request(app)
        .put(`/api/shops/${shopId}/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Order Form',
          fields: [
            {
              id: 'field_1',
              label: 'Full Name',
              type: 'text',
              required: true
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Order Form');
    });
  });

  describe('DELETE /api/shops/:shopId/forms/:formId', () => {
    it('should delete form', async () => {
      // Create a form to delete
      const createResponse = await request(app)
        .post(`/api/shops/${shopId}/forms`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Form to Delete',
          fields: []
        });

      const formToDeleteId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/shops/${shopId}/forms/${formToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('POST /api/shops/:shopId/forms/:formId/submissions', () => {
    it('should submit form', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/forms/${formId}/submissions`)
        .send({
          form_id: formId,
          form_name: 'Order Form',
          ordered_products: [
            {
              id: 'prod_1',
              name: 'Product 1',
              quantity: 1,
              price: 99.99
            }
          ],
          status: 'pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.form_id).toBe(formId);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post(`/api/shops/${shopId}/forms/${formId}/submissions`)
        .send({
          form_id: formId
          // Missing form_name and other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
