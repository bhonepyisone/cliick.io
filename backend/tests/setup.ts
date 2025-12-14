/**
 * Test Setup and Global Configuration
 */

// Set test environment variables FIRST, before any module imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRE = '7d';
process.env.REFRESH_TOKEN_EXPIRE = '30d';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
process.env.PAYPAL_MODE = 'sandbox';
process.env.PAYPAL_CLIENT_ID = 'test_client_id';
process.env.PAYPAL_SECRET = 'test_secret';

import { vi } from 'vitest';
import path from 'path';

// Mock fetch globally to prevent real HTTP requests
(global as any).fetch = vi.fn(async (url: string, options?: any) => {
  // Allow localhost and test endpoints to work
  if (typeof url === 'string' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return new Response('Not Found', { status: 404 });
  }
  // Block all external requests (especially to Supabase)
  const error = new Error(`Network request blocked in test: ${url}`);
  (error as any).code = 'ENOTFOUND';
  throw error;
});

// Mock module loader to intercept supabase config import
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  // Intercept supabase config and return mock instead
  if (id === '../config/supabase' || id.endsWith('/config/supabase')) {
    return originalRequire.call(this, '../config/supabase.mock');
  }
  return originalRequire.apply(this, arguments as any);
};

// Also mock for ES modules using vitest
vi.mock('../config/supabase', async () => {
  const mockModule = await import('../config/supabase.mock');
  return {
    supabase: mockModule.supabase,
    createSupabaseClient: async () => mockModule.supabase
  };
});

export {};
