import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId } = req.query;

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

    // GET: List all clients for user
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, data: data || [] });
    }

    // POST: Create new client
    if (req.method === 'POST') {
      const { name, email, phone, address, notes } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Client name is required' });
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: supabaseUserId,
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Clients API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
