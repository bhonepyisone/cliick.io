import { defineConfig } from 'vitest/config';
import path from 'path';

// Set environment variables for tests
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

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    alias: {
      '@/config/supabase': './config/supabase.mock.ts'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/index.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/config/supabase': path.resolve(__dirname, './config/supabase.mock.ts')
    },
  },
});