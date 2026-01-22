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

    // GET: List all goals for user
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('business_goals')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, data: data || [] });
    }

    // POST: Create new goal (or update if exists for same period)
    if (req.method === 'POST') {
      const { goal_type, period_type, target_value, year, month, quarter } = req.body;

      if (!goal_type || !period_type || target_value === undefined || !year) {
        return res.status(400).json({ error: 'Missing required fields: goal_type, period_type, target_value, year' });
      }

      // Check if goal already exists for this period
      let query = supabase
        .from('business_goals')
        .select('id')
        .eq('user_id', supabaseUserId)
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
          user_id: supabaseUserId,
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
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Goals API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
