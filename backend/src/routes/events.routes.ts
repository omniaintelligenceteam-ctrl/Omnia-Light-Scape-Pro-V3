import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/events - List all events for user
router.get('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
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

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userData.id)
      .order('event_date', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Events GET error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/events - Create new event
router.post('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
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

    const { title, event_type, date, time_slot, custom_time, duration,
            location, notes, client_name, client_phone, color } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Missing required fields (title, date)' });
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userData.id,
        title,
        event_type: event_type || 'other',
        event_date: date,
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
  } catch (error: any) {
    console.error('Events POST error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { id } = req.params;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
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

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', userData.id)
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Events GET/:id error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PATCH /api/events/:id - Update event
router.patch('/:id', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { id } = req.params;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
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

    const { title, event_type, date, time_slot, custom_time, duration,
            location, notes, client_name, client_phone, color } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (date !== undefined) updateData.event_date = date;
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
      .eq('user_id', userData.id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Events PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { id } = req.params;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!supabase) {
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

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    console.error('Events DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;
