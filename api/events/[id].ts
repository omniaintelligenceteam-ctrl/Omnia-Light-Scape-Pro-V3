import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, userId: clerkUserId } = req.query;

  if (!id || typeof id !== 'string' || !clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing id or userId parameter' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
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
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PATCH') {
      const { title, event_type, date, time_slot, custom_time, duration,
              location, notes, client_name, client_phone, color } = req.body;

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updateData.title = title;
      if (event_type !== undefined) updateData.event_type = event_type;
      if (date !== undefined) updateData.date = date;
      if (time_slot !== undefined) updateData.time_slot = time_slot;
      if (custom_time !== undefined) updateData.custom_time = custom_time;
      if (duration !== undefined) updateData.duration = duration;
      if (location !== undefined) updateData.location = location;
      if (notes !== undefined) updateData.notes = notes;
      if (client_name !== undefined) updateData.client_name = client_name;
      if (client_phone !== undefined) updateData.client_phone = client_phone;
      if (color !== undefined) updateData.color = color;

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', supabaseUserId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', supabaseUserId);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Event deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Event API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
