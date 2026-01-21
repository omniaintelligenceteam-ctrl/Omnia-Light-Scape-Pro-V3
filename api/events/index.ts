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

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('date', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { title, event_type, date, time_slot, custom_time, duration,
              location, notes, client_name, client_phone, color } = req.body;

      if (!title || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: supabaseUserId,
          title,
          event_type: event_type || 'other',
          date,
          time_slot: time_slot || 'morning',
          custom_time,
          duration: duration || 1,
          location,
          notes,
          client_name,
          client_phone,
          color
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Events API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
