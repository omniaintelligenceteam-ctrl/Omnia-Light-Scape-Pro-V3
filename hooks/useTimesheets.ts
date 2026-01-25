import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';

export interface TimesheetEntry {
  id: string;
  user_id: string;
  technician_id: string;
  technician_name?: string;
  project_id?: string;
  project_name?: string;
  entry_type: 'driving' | 'working' | 'break' | 'meeting' | 'pto' | 'other';
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  notes?: string;
  is_billable: boolean;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimesheetDaily {
  id: string;
  user_id: string;
  technician_id: string;
  technician_name?: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  total_hours: number;
  driving_hours: number;
  working_hours: number;
  break_hours: number;
  idle_hours: number;
  jobs_completed: number;
  status: 'open' | 'submitted' | 'approved' | 'disputed';
  dispute_notes?: string;
}

export interface TimesheetEntryFormData {
  technician_id: string;
  project_id?: string;
  entry_type: 'driving' | 'working' | 'break' | 'meeting' | 'pto' | 'other';
  start_time: string;
  end_time?: string;
  notes?: string;
  is_billable?: boolean;
  start_lat?: number;
  start_lng?: number;
}

export interface TimesheetSummary {
  totalHours: number;
  drivingHours: number;
  workingHours: number;
  breakHours: number;
  jobsCompleted: number;
  pendingApproval: number;
}

export function useTimesheets(technicianId?: string) {
  const { user } = useUser();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [dailySummaries, setDailySummaries] = useState<TimesheetDaily[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimesheetEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch timesheet entries
  const fetchEntries = useCallback(async (startDate?: string, endDate?: string) => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/timesheets?userId=${user.id}`;
      if (technicianId) url += `&technicianId=${technicianId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setEntries(data.entries || []);
        setDailySummaries(data.dailySummaries || []);

        // Find active entry (no end_time)
        const active = (data.entries || []).find((e: TimesheetEntry) => !e.end_time);
        setActiveEntry(active || null);
      } else {
        setError(data.error || 'Failed to fetch timesheets');
      }
    } catch (err) {
      console.error('Error fetching timesheets:', err);
      setError('Failed to fetch timesheets');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, technicianId]);

  // Clock in
  const clockIn = useCallback(async (techId: string): Promise<{ success: boolean; entry?: TimesheetEntry; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/timesheets?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock_in',
          technician_id: techId,
        }),
      });
      const result = await res.json();

      if (result.success && result.entry) {
        setActiveEntry(result.entry);
        setEntries(prev => [result.entry, ...prev]);
        return { success: true, entry: result.entry };
      }
      return { success: false, error: result.error || 'Failed to clock in' };
    } catch (err) {
      console.error('Error clocking in:', err);
      return { success: false, error: 'Failed to clock in' };
    }
  }, [user?.id]);

  // Clock out
  const clockOut = useCallback(async (): Promise<{ success: boolean; entry?: TimesheetEntry; error?: string }> => {
    if (!user?.id || !activeEntry) return { success: false, error: 'No active entry' };

    try {
      const res = await fetch(`/api/timesheets?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock_out',
          entry_id: activeEntry.id,
        }),
      });
      const result = await res.json();

      if (result.success && result.entry) {
        setActiveEntry(null);
        setEntries(prev => prev.map(e => e.id === result.entry.id ? result.entry : e));
        return { success: true, entry: result.entry };
      }
      return { success: false, error: result.error || 'Failed to clock out' };
    } catch (err) {
      console.error('Error clocking out:', err);
      return { success: false, error: 'Failed to clock out' };
    }
  }, [user?.id, activeEntry]);

  // Start an entry (driving, working, break, etc.)
  const startEntry = useCallback(async (data: TimesheetEntryFormData): Promise<{ success: boolean; entry?: TimesheetEntry; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    // End current active entry if exists
    if (activeEntry) {
      await endEntry(activeEntry.id);
    }

    try {
      const res = await fetch(`/api/timesheets?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_entry',
          ...data,
        }),
      });
      const result = await res.json();

      if (result.success && result.entry) {
        setActiveEntry(result.entry);
        setEntries(prev => [result.entry, ...prev]);
        return { success: true, entry: result.entry };
      }
      return { success: false, error: result.error || 'Failed to start entry' };
    } catch (err) {
      console.error('Error starting entry:', err);
      return { success: false, error: 'Failed to start entry' };
    }
  }, [user?.id, activeEntry]);

  // End an entry
  const endEntry = useCallback(async (entryId: string, endLat?: number, endLng?: number): Promise<{ success: boolean; entry?: TimesheetEntry; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/timesheets?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_entry',
          entry_id: entryId,
          end_lat: endLat,
          end_lng: endLng,
        }),
      });
      const result = await res.json();

      if (result.success && result.entry) {
        if (activeEntry?.id === entryId) {
          setActiveEntry(null);
        }
        setEntries(prev => prev.map(e => e.id === result.entry.id ? result.entry : e));
        return { success: true, entry: result.entry };
      }
      return { success: false, error: result.error || 'Failed to end entry' };
    } catch (err) {
      console.error('Error ending entry:', err);
      return { success: false, error: 'Failed to end entry' };
    }
  }, [user?.id, activeEntry]);

  // Approve timesheet(s)
  const approveTimesheets = useCallback(async (entryIds: string[]): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/timesheets/approve?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: entryIds }),
      });
      const result = await res.json();

      if (result.success) {
        setEntries(prev => prev.map(e =>
          entryIds.includes(e.id) ? { ...e, is_approved: true, approved_at: new Date().toISOString() } : e
        ));
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to approve timesheets' };
    } catch (err) {
      console.error('Error approving timesheets:', err);
      return { success: false, error: 'Failed to approve timesheets' };
    }
  }, [user?.id]);

  // Calculate summary
  const summary = useMemo((): TimesheetSummary => {
    let totalHours = 0;
    let drivingHours = 0;
    let workingHours = 0;
    let breakHours = 0;
    let jobsCompleted = 0;
    let pendingApproval = 0;

    entries.forEach(entry => {
      const hours = (entry.duration_minutes || 0) / 60;
      totalHours += hours;

      switch (entry.entry_type) {
        case 'driving':
          drivingHours += hours;
          break;
        case 'working':
          workingHours += hours;
          jobsCompleted += entry.project_id ? 1 : 0;
          break;
        case 'break':
          breakHours += hours;
          break;
      }

      if (!entry.is_approved && entry.end_time) {
        pendingApproval++;
      }
    });

    return {
      totalHours,
      drivingHours,
      workingHours,
      breakHours,
      jobsCompleted,
      pendingApproval,
    };
  }, [entries]);

  // Get entries grouped by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, TimesheetEntry[]> = {};
    entries.forEach(entry => {
      const date = entry.start_time.split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(entry);
    });
    return grouped;
  }, [entries]);

  // Fetch on mount
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    dailySummaries,
    activeEntry,
    isLoading,
    error,
    summary,
    entriesByDate,
    fetchEntries,
    clockIn,
    clockOut,
    startEntry,
    endEntry,
    approveTimesheets,
  };
}

export default useTimesheets;
