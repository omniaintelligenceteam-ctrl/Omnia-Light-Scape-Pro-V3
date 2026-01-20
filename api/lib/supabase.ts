import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vercel serverless functions require non-VITE prefixed env vars
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create supabase client only if env vars are available
// This prevents crashes during local development or when env vars are missing
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  // Server-side Supabase client with service role key
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('Supabase credentials not found. API will use mock data.');
}

export { supabase };

// Helper to set RLS context for user
export async function setUserContext(userId: string) {
  if (!supabase) {
    console.warn('Cannot set user context: Supabase client not initialized');
    return;
  }
  await supabase.rpc('set_config', {
    setting: 'app.user_id',
    value: userId
  });
}
