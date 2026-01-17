import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    if (req.method === 'GET') {
      // List all projects for user
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      // Create new project
      const { name, original_image_url, generated_image_url, prompt_config } = req.body;

      if (!generated_image_url || !prompt_config) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: name || 'Untitled Project',
          original_image_url,
          generated_image_url,
          prompt_config
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
