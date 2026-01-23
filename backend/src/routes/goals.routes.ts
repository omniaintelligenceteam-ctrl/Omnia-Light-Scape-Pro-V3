import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/goals - List all goals for user
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
      .from('business_goals')
      .select('*')
      .eq('user_id', userData.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Goals GET error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/goals - Create new goal (or update if exists for same period)
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

    const { goal_type, period_type, target_value, year, month, quarter } = req.body;

    if (!goal_type || !period_type || target_value === undefined || !year) {
      return res.status(400).json({ error: 'Missing required fields: goal_type, period_type, target_value, year' });
    }

    // Check if goal already exists for this period
    let query = supabase
      .from('business_goals')
      .select('id')
      .eq('user_id', userData.id)
      .eq('goal_type', goal_type)
      .eq('period_type', period_type)
      .eq('year', year);

    if (period_type === 'monthly' && month) {
      query = query.eq('month', month);
    }
    if (period_type === 'quarterly' && quarter) {
      query = query.eq('quarter', quarter);
    }

    const { data: existingGoal } = await query.single();

    if (existingGoal) {
      // Update existing goal
      const { data, error } = await supabase
        .from('business_goals')
        .update({
          target_value,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingGoal.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data, updated: true });
    }

    // Create new goal
    const { data, error } = await supabase
      .from('business_goals')
      .insert({
        user_id: userData.id,
        goal_type,
        period_type,
        target_value,
        year,
        month: month || null,
        quarter: quarter || null
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Goals POST error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/goals/:id - Get single goal
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
      .from('business_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userData.id)
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Goals GET/:id error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// PATCH /api/goals/:id - Update goal
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

    // Verify goal belongs to user
    const { data: goalCheck, error: checkError } = await supabase
      .from('business_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', userData.id)
      .single();

    if (checkError || !goalCheck) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const { goal_type, period_type, target_value, year, month, quarter } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (goal_type !== undefined) updates.goal_type = goal_type;
    if (period_type !== undefined) updates.period_type = period_type;
    if (target_value !== undefined) updates.target_value = target_value;
    if (year !== undefined) updates.year = year;
    if (month !== undefined) updates.month = month;
    if (quarter !== undefined) updates.quarter = quarter;

    const { data, error } = await supabase
      .from('business_goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Goals PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// DELETE /api/goals/:id - Delete goal
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
      .from('business_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.id);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Goals DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;
