import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing location id' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUserId = userData.id;

    // Verify location belongs to user
    const { data: locationCheck, error: checkError } = await supabase
      .from('locations')
      .select('id')
      .eq('id', id)
      .eq('user_id', supabaseUserId)
      .single();

    if (checkError || !locationCheck) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // GET: Get single location
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // PATCH: Update location
    if (req.method === 'PATCH') {
      const { name, address, manager_name, manager_email, is_active } = req.body;

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (address !== undefined) updates.address = address;
      if (manager_name !== undefined) updates.manager_name = manager_name;
      if (manager_email !== undefined) updates.manager_email = manager_email;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // DELETE: Delete location
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Location API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
