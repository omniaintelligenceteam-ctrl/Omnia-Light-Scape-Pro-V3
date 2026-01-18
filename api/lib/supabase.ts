import { createClient } from '@supabase/supabase-js';

// Try both VITE_ prefixed (for local dev) and non-prefixed (for Vercel)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Available:', Object.keys(process.env).filter(k => k.includes('SUPA')));
  throw new Error('Missing Supabase environment variables');
}

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
