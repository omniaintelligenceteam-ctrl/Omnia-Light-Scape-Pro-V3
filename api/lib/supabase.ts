import { createClient } from '@supabase/supabase-js';

// Log all env vars for debugging (will show in Vercel function logs)
console.log('Supabase init - checking env vars...');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);

// Try both VITE_ prefixed (for local dev) and non-prefixed (for Vercel)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!');
  console.error('supabaseUrl:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('supabaseServiceKey:', supabaseServiceKey ? 'SET' : 'MISSING');
  throw new Error('Missing Supabase environment variables');
}

console.log('Supabase URL:', supabaseUrl.substring(0, 30) + '...');

// Server-side Supabase client with service role key
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to set RLS context for user
export async function setUserContext(userId: string) {
  await supabase.rpc('set_config', {
    setting: 'app.user_id',
    value: userId
  });
}
