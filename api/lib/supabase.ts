import { createClient } from '@supabase/supabase-js';

// Vercel serverless functions require non-VITE prefixed env vars
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
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
