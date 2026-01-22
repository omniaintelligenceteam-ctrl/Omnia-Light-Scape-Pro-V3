import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, locationId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
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

    // GET: List all technicians (optionally filter by location)
    if (req.method === 'GET') {
      let query = supabase
        .from('technicians')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('created_at', { ascending: true });

      if (locationId && typeof locationId === 'string') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return res.status(200).json({ success: true, data: data || [] });
    }

    // POST: Create new technician
    if (req.method === 'POST') {
      const { name, location_id, email, phone, role, is_active } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Technician name is required' });
      }

      const { data, error } = await supabase
        .from('technicians')
        .insert({
          user_id: supabaseUserId,
          location_id: location_id || null,
          name,
          email: email || null,
          phone: phone || null,
          role: role || 'technician',
          is_active: is_active !== undefined ? is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Technicians API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
