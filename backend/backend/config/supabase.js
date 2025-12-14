"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Create real or mock client based on environment
const createSupabaseClient = async () => {
    if (process.env.NODE_ENV === 'test') {
        // In test mode, dynamically import and return mock
        const { supabase: mockSupabase } = await Promise.resolve().then(() => require('./supabase.mock'));
        return mockSupabase;
    }
    // In production, create real Supabase client
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
};
exports.createSupabaseClient = createSupabaseClient;
// Initialize supabase client - will be set synchronously or asynchronously
let supabase = null;
exports.supabase = supabase;
// Try synchronous initialization first
if (process.env.NODE_ENV === 'test') {
    // For test mode, we need to handle this carefully
    // The actual mock will be injected via vitest mocking
    exports.supabase = supabase = {
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
            insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
            delete: () => ({ eq: () => ({ async: async () => ({ error: null }) }) }),
        })
    };
}
else {
    exports.supabase = supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
}
