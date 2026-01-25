import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const { entry_ids, daily_ids } = req.body;

    // Approve individual entries
    if (entry_ids && Array.isArray(entry_ids) && entry_ids.length > 0) {
      const { error: updateError } = await supabase
        .from('timesheet_entries')
        .update({
          is_approved: true,
          approved_by: supabaseUserId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', supabaseUserId)
        .in('id', entry_ids);

      if (updateError) {
        console.error('Error approving entries:', updateError);
        return res.status(500).json({ error: 'Failed to approve entries' });
      }
    }

    // Approve daily summaries
    if (daily_ids && Array.isArray(daily_ids) && daily_ids.length > 0) {
      const { error: dailyError } = await supabase
        .from('timesheet_daily')
        .update({
          status: 'approved',
        })
        .eq('user_id', supabaseUserId)
        .in('id', daily_ids);

      if (dailyError) {
        console.error('Error approving daily summaries:', dailyError);
        return res.status(500).json({ error: 'Failed to approve daily summaries' });
      }
    }

    return res.status(200).json({ success: true });

  } catch (error: unknown) {
    console.error('Approve timesheets API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
