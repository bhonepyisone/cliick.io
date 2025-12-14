"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
// supabase/client.ts
const supabase_js_1 = require("@supabase/supabase-js");
// IMPORTANT: These should be set in your environment variables.
// You can find them in your Supabase project settings under "API".
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!');
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file');
}
// The 'Database' generic provides full TypeScript support for your schema.
// Generate it using the Supabase CLI:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > supabase/database.types.ts
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
