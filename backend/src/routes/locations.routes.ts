import { Router, Request, Response } from 'express';
import { getSupabase } from '../lib/supabase.js';

const router = Router();

// GET /api/locations - List all locations
router.get('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const supabase = getSupabase();

    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Locations GET error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/locations - Create new location
router.post('/', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const { name, address, manager_name, manager_email, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Location name is required' });
  }

  try {
    const supabase = getSupabase();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        user_id: userData.id,
        name,
        address: address || null,
        manager_name: manager_name || null,
        manager_email: manager_email || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Locations POST error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PATCH /api/locations/:id - Update location
router.patch('/:id', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { id } = req.params;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const supabase = getSupabase();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, address, manager_name, manager_email, is_active } = req.body;

    const { data, error } = await supabase
      .from('locations')
      .update({
        name,
        address,
        manager_name,
        manager_email,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userData.id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Locations PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/locations/:id - Delete location
router.delete('/:id', async (req: Request, res: Response) => {
  const { userId: clerkUserId } = req.query;
  const { id } = req.params;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const supabase = getSupabase();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.id);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Locations DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;
