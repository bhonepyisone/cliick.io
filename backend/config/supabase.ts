import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create real or mock client based on environment
const createSupabaseClient = async () => {
  if (process.env.NODE_ENV === 'test') {
    // In test mode, dynamically import and return mock
    const { supabase: mockSupabase } = await import('./supabase.mock');
    return mockSupabase;
  }
  // In production, create real Supabase client
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Initialize supabase client - will be set synchronously or asynchronously
let supabase: any = null;

// Try synchronous initialization first
if (process.env.NODE_ENV === 'test') {
  // For test mode, we need to handle this carefully
  // The actual mock will be injected via vitest mocking
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ async: async () => ({ error: null }) }) }),
    })
  };
} else if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
} else {
  // In development or if env vars not set, create a stub that logs errors
  console.warn('⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Supabase not configured') }) }) }) }),
      delete: () => ({ eq: () => ({ async: async () => ({ error: new Error('Supabase not configured') }) }) }),
    })
  };
}

export { supabase, createSupabaseClient };
