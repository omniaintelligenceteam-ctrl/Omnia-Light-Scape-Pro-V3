import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, userId: clerkUserId } = req.query;

  if (!id || typeof id !== 'string' || !clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing id or userId parameter' });
  }

  try {
    // Look up the Supabase user ID from the Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUserId = userData.id;

    if (req.method === 'GET') {
      // Get single project
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PATCH') {
      // Update project
      const { name, prompt_config } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (prompt_config !== undefined) updateData.prompt_config = prompt_config;

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', supabaseUserId);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Project deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Project API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
