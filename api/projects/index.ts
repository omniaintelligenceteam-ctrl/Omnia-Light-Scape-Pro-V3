import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Projects API called:', req.method, req.url);

  const { userId: clerkUserId } = req.query;
  console.log('Clerk User ID:', clerkUserId);

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    // Look up the Supabase user ID from the Clerk user ID
    console.log('Looking up user with clerk_user_id:', clerkUserId);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    console.log('User lookup result:', { userData, userError });

    if (userError || !userData) {
      console.error('User lookup failed:', userError);
      return res.status(404).json({ error: 'User not found. Please sign out and sign back in.', details: userError });
    }

    const supabaseUserId = userData.id;

    if (req.method === 'GET') {
      // List all projects for user
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      // Create new project
      const { name, original_image_url, generated_image_url, prompt_config } = req.body;

      if (!generated_image_url) {
        return res.status(400).json({ error: 'Missing generated_image_url' });
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: supabaseUserId,
          name: name || 'Untitled Project',
          original_image_url: original_image_url || null,
          generated_image_url,
          prompt_config: prompt_config || {}
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Projects API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
