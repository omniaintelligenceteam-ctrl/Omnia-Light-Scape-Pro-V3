import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing technician id' });
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

    // Verify technician belongs to user
    const { data: techCheck, error: checkError } = await supabase
      .from('technicians')
      .select('id')
      .eq('id', id)
      .eq('user_id', supabaseUserId)
      .single();

    if (checkError || !techCheck) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    // GET: Get single technician
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // PATCH: Update technician
    if (req.method === 'PATCH') {
      const { name, location_id, email, phone, role, is_active } = req.body;

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (location_id !== undefined) updates.location_id = location_id;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from('technicians')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // DELETE: Delete technician
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('technicians')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Technician API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
