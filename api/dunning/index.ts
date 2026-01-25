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

    // GET: Fetch dunning schedule and reminders
    if (req.method === 'GET') {
      // Get user's dunning schedule
      const { data: schedule } = await supabase
        .from('dunning_schedules')
        .select('*')
        .eq('user_id', supabaseUserId)
        .single();

      // If no schedule exists, return default
      const defaultSchedule = {
        id: null,
        user_id: supabaseUserId,
        name: 'Default',
        is_default: true,
        is_active: false,
        steps: [
          { days_after_due: 1, template: 'friendly_reminder', subject: 'Friendly Reminder: Invoice Due', channel: 'email' },
          { days_after_due: 7, template: 'second_reminder', subject: 'Second Notice: Invoice Past Due', channel: 'email' },
          { days_after_due: 14, template: 'urgent_reminder', subject: 'Urgent: Invoice 2 Weeks Overdue', channel: 'email' },
          { days_after_due: 30, template: 'final_notice', subject: 'Final Notice: Payment Required', channel: 'email' },
        ],
      };

      // Get reminder history
      const { data: reminders } = await supabase
        .from('invoice_reminders')
        .select(`
          *,
          projects:project_id (name, clientName)
        `)
        .eq('user_id', supabaseUserId)
        .order('sent_at', { ascending: false })
        .limit(100);

      const transformedReminders = (reminders || []).map(r => ({
        ...r,
        project_name: r.projects?.name || null,
        client_name: r.projects?.clientName || null,
        projects: undefined,
      }));

      return res.status(200).json({
        success: true,
        schedule: schedule || defaultSchedule,
        reminders: transformedReminders,
      });
    }

    // POST: Save dunning schedule
    if (req.method === 'POST') {
      const { steps, is_active, name = 'Default' } = req.body;

      if (!steps || !Array.isArray(steps)) {
        return res.status(400).json({ error: 'steps array is required' });
      }

      // Upsert the schedule
      const { data: existingSchedule } = await supabase
        .from('dunning_schedules')
        .select('id')
        .eq('user_id', supabaseUserId)
        .single();

      let schedule;
      if (existingSchedule) {
        // Update existing
        const { data, error: updateError } = await supabase
          .from('dunning_schedules')
          .update({
            name,
            steps,
            is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSchedule.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating dunning schedule:', updateError);
          return res.status(500).json({ error: 'Failed to update schedule' });
        }
        schedule = data;
      } else {
        // Create new
        const { data, error: createError } = await supabase
          .from('dunning_schedules')
          .insert({
            user_id: supabaseUserId,
            name,
            is_default: true,
            is_active,
            steps,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating dunning schedule:', createError);
          return res.status(500).json({ error: 'Failed to create schedule' });
        }
        schedule = data;
      }

      return res.status(200).json({ success: true, schedule });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: unknown) {
    console.error('Dunning API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
