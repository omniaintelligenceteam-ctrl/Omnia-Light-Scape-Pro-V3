import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing goal id' });
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

    // Verify goal belongs to user
    const { data: goalCheck, error: checkError } = await supabase
      .from('business_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', supabaseUserId)
      .single();

    if (checkError || !goalCheck) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // GET: Get single goal
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('business_goals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    // PATCH: Update goal
    if (req.method === 'PATCH') {
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
    }

    // DELETE: Delete goal
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('business_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Goal API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
