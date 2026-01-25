import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

export interface DunningSchedule {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  steps: DunningStep[];
  created_at: string;
}

export interface DunningStep {
  days_after_due: number;
  template: 'friendly_reminder' | 'second_reminder' | 'urgent_reminder' | 'final_notice';
  subject: string;
  channel: 'email' | 'sms' | 'both';
}

export interface InvoiceReminder {
  id: string;
  user_id: string;
  project_id: string;
  project_name?: string;
  client_name?: string;
  reminder_type: string;
  sent_at: string;
  sent_to: string;
  opened_at?: string;
  clicked_at?: string;
  paid_at?: string;
}

export const DEFAULT_DUNNING_STEPS: DunningStep[] = [
  { days_after_due: 1, template: 'friendly_reminder', subject: 'Friendly Reminder: Invoice Due', channel: 'email' },
  { days_after_due: 7, template: 'second_reminder', subject: 'Second Notice: Invoice Past Due', channel: 'email' },
  { days_after_due: 14, template: 'urgent_reminder', subject: 'Urgent: Invoice 2 Weeks Overdue', channel: 'email' },
  { days_after_due: 30, template: 'final_notice', subject: 'Final Notice: Payment Required', channel: 'email' },
];

export const REMINDER_TEMPLATES = {
  friendly_reminder: {
    label: 'Friendly Reminder',
    description: 'Gentle reminder about the invoice',
    tone: 'friendly',
  },
  second_reminder: {
    label: 'Second Notice',
    description: 'Polite follow-up on the overdue invoice',
    tone: 'professional',
  },
  urgent_reminder: {
    label: 'Urgent Reminder',
    description: 'More direct message about the delay',
    tone: 'urgent',
  },
  final_notice: {
    label: 'Final Notice',
    description: 'Last reminder before escalation',
    tone: 'serious',
  },
};

export function useDunning() {
  const { user } = useUser();
  const [schedule, setSchedule] = useState<DunningSchedule | null>(null);
  const [reminders, setReminders] = useState<InvoiceReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dunning schedule
  const fetchSchedule = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dunning?userId=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setSchedule(data.schedule || null);
        setReminders(data.reminders || []);
      } else {
        setError(data.error || 'Failed to fetch dunning settings');
      }
    } catch (err) {
      console.error('Error fetching dunning settings:', err);
      setError('Failed to fetch dunning settings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Save dunning schedule
  const saveSchedule = useCallback(async (steps: DunningStep[], isActive: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/dunning?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, is_active: isActive }),
      });
      const result = await res.json();

      if (result.success && result.schedule) {
        setSchedule(result.schedule);
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to save schedule' };
    } catch (err) {
      console.error('Error saving dunning schedule:', err);
      return { success: false, error: 'Failed to save schedule' };
    }
  }, [user?.id]);

  // Send manual reminder
  const sendManualReminder = useCallback(async (projectId: string, templateType: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/dunning/send?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, template: templateType }),
      });
      const result = await res.json();

      if (result.success) {
        // Refresh reminders
        await fetchSchedule();
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to send reminder' };
    } catch (err) {
      console.error('Error sending reminder:', err);
      return { success: false, error: 'Failed to send reminder' };
    }
  }, [user?.id, fetchSchedule]);

  // Get reminder history for a project
  const getProjectReminders = useCallback((projectId: string): InvoiceReminder[] => {
    return reminders.filter(r => r.project_id === projectId);
  }, [reminders]);

  // Fetch on mount
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    schedule,
    reminders,
    isLoading,
    error,
    fetchSchedule,
    saveSchedule,
    sendManualReminder,
    getProjectReminders,
    DEFAULT_DUNNING_STEPS,
    REMINDER_TEMPLATES,
  };
}

export default useDunning;
