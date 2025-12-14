"use strict";
/**
 * Test Setup and Global Configuration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
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
const vitest_1 = require("vitest");
// Mock fetch globally to prevent real HTTP requests
global.fetch = vitest_1.vi.fn(async (url, options) => {
    // Allow localhost and test endpoints to work
    if (typeof url === 'string' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return new Response('Not Found', { status: 404 });
    }
    // Block all external requests (especially to Supabase)
    const error = new Error(`Network request blocked in test: ${url}`);
    error.code = 'ENOTFOUND';
    throw error;
});
// Mock module loader to intercept supabase config import
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    // Intercept supabase config and return mock instead
    if (id === '../config/supabase' || id.endsWith('/config/supabase')) {
        return originalRequire.call(this, '../config/supabase.mock');
    }
    return originalRequire.apply(this, arguments);
};
// Also mock for ES modules using vitest
vitest_1.vi.mock('../config/supabase', async () => {
    const mockModule = await Promise.resolve().then(() => __importStar(require('../config/supabase.mock')));
    return {
        supabase: mockModule.supabase,
        createSupabaseClient: async () => mockModule.supabase
    };
});
