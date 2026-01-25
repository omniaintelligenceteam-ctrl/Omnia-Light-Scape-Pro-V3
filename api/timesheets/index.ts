import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId: clerkUserId, technicianId, startDate, endDate } = req.query;

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

    // GET: Fetch timesheet entries
    if (req.method === 'GET') {
      let query = supabase
        .from('timesheet_entries')
        .select(`
          *,
          technicians:technician_id (name),
          projects:project_id (name)
        `)
        .eq('user_id', supabaseUserId)
        .order('start_time', { ascending: false });

      if (technicianId && typeof technicianId === 'string') {
        query = query.eq('technician_id', technicianId);
      }

      if (startDate && typeof startDate === 'string') {
        query = query.gte('start_time', startDate);
      }

      if (endDate && typeof endDate === 'string') {
        query = query.lte('start_time', endDate);
      }

      const { data: entries, error: entriesError } = await query;

      if (entriesError) {
        console.error('Error fetching timesheet entries:', entriesError);
        return res.status(500).json({ error: 'Failed to fetch timesheet entries' });
      }

      // Transform to include names
      const transformedEntries = (entries || []).map(e => ({
        ...e,
        technician_name: e.technicians?.name || null,
        project_name: e.projects?.name || null,
        technicians: undefined,
        projects: undefined,
      }));

      // Fetch daily summaries
      let dailyQuery = supabase
        .from('timesheet_daily')
        .select(`
          *,
          technicians:technician_id (name)
        `)
        .eq('user_id', supabaseUserId)
        .order('date', { ascending: false });

      if (technicianId && typeof technicianId === 'string') {
        dailyQuery = dailyQuery.eq('technician_id', technicianId);
      }

      const { data: dailySummaries } = await dailyQuery;

      const transformedDaily = (dailySummaries || []).map(d => ({
        ...d,
        technician_name: d.technicians?.name || null,
        technicians: undefined,
      }));

      return res.status(200).json({
        success: true,
        entries: transformedEntries,
        dailySummaries: transformedDaily,
      });
    }

    // POST: Create/update timesheet entries
    if (req.method === 'POST') {
      const { action, ...data } = req.body;

      switch (action) {
        case 'clock_in': {
          const { technician_id, start_lat, start_lng } = data;

          if (!technician_id) {
            return res.status(400).json({ error: 'technician_id is required' });
          }

          // Create a new timesheet entry
          const { data: entry, error: createError } = await supabase
            .from('timesheet_entries')
            .insert({
              user_id: supabaseUserId,
              technician_id,
              entry_type: 'working',
              start_time: new Date().toISOString(),
              start_lat: start_lat || null,
              start_lng: start_lng || null,
              is_billable: true,
              is_approved: false,
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating timesheet entry:', createError);
            return res.status(500).json({ error: 'Failed to clock in' });
          }

          // Update or create daily summary
          const today = new Date().toISOString().split('T')[0];
          await supabase
            .from('timesheet_daily')
            .upsert({
              user_id: supabaseUserId,
              technician_id,
              date: today,
              clock_in: new Date().toISOString(),
              status: 'open',
            }, { onConflict: 'technician_id,date' });

          return res.status(201).json({ success: true, entry });
        }

        case 'clock_out': {
          const { entry_id, end_lat, end_lng } = data;

          if (!entry_id) {
            return res.status(400).json({ error: 'entry_id is required' });
          }

          const endTime = new Date();

          // Get the entry to calculate duration
          const { data: existingEntry } = await supabase
            .from('timesheet_entries')
            .select('*')
            .eq('id', entry_id)
            .eq('user_id', supabaseUserId)
            .single();

          if (!existingEntry) {
            return res.status(404).json({ error: 'Entry not found' });
          }

          const startTime = new Date(existingEntry.start_time);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

          // Update the entry
          const { data: entry, error: updateError } = await supabase
            .from('timesheet_entries')
            .update({
              end_time: endTime.toISOString(),
              duration_minutes: durationMinutes,
              end_lat: end_lat || null,
              end_lng: end_lng || null,
              updated_at: endTime.toISOString(),
            })
            .eq('id', entry_id)
            .eq('user_id', supabaseUserId)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating timesheet entry:', updateError);
            return res.status(500).json({ error: 'Failed to clock out' });
          }

          // Update daily summary
          const today = new Date().toISOString().split('T')[0];
          const { data: dailySummary } = await supabase
            .from('timesheet_daily')
            .select('*')
            .eq('technician_id', existingEntry.technician_id)
            .eq('date', today)
            .single();

          if (dailySummary) {
            const workingHours = (dailySummary.working_hours || 0) + (durationMinutes / 60);
            const totalHours = (dailySummary.total_hours || 0) + (durationMinutes / 60);

            await supabase
              .from('timesheet_daily')
              .update({
                clock_out: endTime.toISOString(),
                working_hours: workingHours,
                total_hours: totalHours,
              })
              .eq('id', dailySummary.id);
          }

          return res.status(200).json({ success: true, entry });
        }

        case 'start_entry': {
          const {
            technician_id,
            project_id,
            entry_type,
            start_time,
            notes,
            is_billable = true,
            start_lat,
            start_lng,
          } = data;

          if (!technician_id || !entry_type) {
            return res.status(400).json({ error: 'technician_id and entry_type are required' });
          }

          const { data: entry, error: createError } = await supabase
            .from('timesheet_entries')
            .insert({
              user_id: supabaseUserId,
              technician_id,
              project_id: project_id || null,
              entry_type,
              start_time: start_time || new Date().toISOString(),
              notes: notes || null,
              is_billable,
              is_approved: false,
              start_lat: start_lat || null,
              start_lng: start_lng || null,
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating timesheet entry:', createError);
            return res.status(500).json({ error: 'Failed to start entry' });
          }

          return res.status(201).json({ success: true, entry });
        }

        case 'end_entry': {
          const { entry_id, end_lat, end_lng } = data;

          if (!entry_id) {
            return res.status(400).json({ error: 'entry_id is required' });
          }

          const endTime = new Date();

          // Get the entry to calculate duration
          const { data: existingEntry } = await supabase
            .from('timesheet_entries')
            .select('*')
            .eq('id', entry_id)
            .eq('user_id', supabaseUserId)
            .single();

          if (!existingEntry) {
            return res.status(404).json({ error: 'Entry not found' });
          }

          const startTime = new Date(existingEntry.start_time);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

          const { data: entry, error: updateError } = await supabase
            .from('timesheet_entries')
            .update({
              end_time: endTime.toISOString(),
              duration_minutes: durationMinutes,
              end_lat: end_lat || null,
              end_lng: end_lng || null,
              updated_at: endTime.toISOString(),
            })
            .eq('id', entry_id)
            .eq('user_id', supabaseUserId)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating timesheet entry:', updateError);
            return res.status(500).json({ error: 'Failed to end entry' });
          }

          return res.status(200).json({ success: true, entry });
        }

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: unknown) {
    console.error('Timesheets API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
