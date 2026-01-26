import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CalendarEvent, EventType, TimeSlot, RecurrencePattern } from '../types';
import { useDemoMode } from './useDemoMode';
import { generateDemoCalendarEvents } from './useDemoData';

export function useCalendarEvents() {
  const { user } = useUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { shouldInjectDemoData, dismissDemoData } = useDemoMode();

  // Load events from API
  useEffect(() => {
    async function loadEvents() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/events?userId=${user.id}`);

        if (!response.ok) throw new Error('Failed to load events');

        const data = await response.json();
        if (data.success && data.data) {
          const loadedEvents: CalendarEvent[] = data.data.map((e: any) => ({
            id: e.id,
            title: e.title,
            eventType: e.event_type as EventType,
            date: e.event_date,
            timeSlot: e.time_slot as TimeSlot,
            customTime: e.custom_time,
            duration: Number(e.duration),
            location: e.location,
            notes: e.notes,
            clientName: e.client_name,
            clientPhone: e.client_phone,
            clientId: e.client_id,
            projectId: e.project_id,
            color: e.color,
            recurrence: e.recurrence as RecurrencePattern | undefined,
            recurrenceEndDate: e.recurrence_end_date,
            recurrenceCount: e.recurrence_count ? Number(e.recurrence_count) : undefined,
            parentEventId: e.parent_event_id,
            isRecurringInstance: e.is_recurring_instance,
            createdAt: e.created_at
          }));
          setEvents(loadedEvents);
        }
      } catch (err: any) {
        console.error('Error loading events:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvents();
  }, [user]);

  // Create event
  const createEvent = useCallback(async (
    eventData: Omit<CalendarEvent, 'id' | 'createdAt'>
  ): Promise<CalendarEvent | null> => {
    if (!user) return null;

    try {
      const response = await fetch(`/api/events?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventData.title,
          event_type: eventData.eventType,
          date: eventData.date,
          time_slot: eventData.timeSlot,
          custom_time: eventData.customTime,
          duration: eventData.duration,
          location: eventData.location,
          notes: eventData.notes,
          client_name: eventData.clientName,
          client_phone: eventData.clientPhone,
          client_id: eventData.clientId,
          project_id: eventData.projectId,
          color: eventData.color,
          recurrence: eventData.recurrence,
          recurrence_end_date: eventData.recurrenceEndDate,
          recurrence_count: eventData.recurrenceCount
        })
      });

      if (!response.ok) throw new Error('Failed to create event');

      const data = await response.json();
      if (data.success && data.data) {
        const newEvent: CalendarEvent = {
          id: data.data.id,
          title: data.data.title,
          eventType: data.data.event_type as EventType,
          date: data.data.event_date,
          timeSlot: data.data.time_slot as TimeSlot,
          customTime: data.data.custom_time,
          duration: Number(data.data.duration),
          location: data.data.location,
          notes: data.data.notes,
          clientName: data.data.client_name,
          clientPhone: data.data.client_phone,
          clientId: data.data.client_id,
          projectId: data.data.project_id,
          color: data.data.color,
          recurrence: data.data.recurrence as RecurrencePattern | undefined,
          recurrenceEndDate: data.data.recurrence_end_date,
          recurrenceCount: data.data.recurrence_count ? Number(data.data.recurrence_count) : undefined,
          parentEventId: data.data.parent_event_id,
          isRecurringInstance: data.data.is_recurring_instance,
          createdAt: data.data.created_at
        };
        setEvents(prev => [...prev, newEvent]);
        return newEvent;
      }
      return null;
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Update event
  const updateEvent = useCallback(async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch(`/api/events/${eventId}?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updates.title,
          event_type: updates.eventType,
          date: updates.date,
          time_slot: updates.timeSlot,
          custom_time: updates.customTime,
          duration: updates.duration,
          location: updates.location,
          notes: updates.notes,
          client_name: updates.clientName,
          client_phone: updates.clientPhone,
          client_id: updates.clientId,
          project_id: updates.projectId,
          color: updates.color,
          recurrence: updates.recurrence,
          recurrence_end_date: updates.recurrenceEndDate,
          recurrence_count: updates.recurrenceCount
        })
      });

      if (!response.ok) throw new Error('Failed to update event');

      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, ...updates } : e
      ));
      return true;
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch(`/api/events/${eventId}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete event');

      setEvents(prev => prev.filter(e => e.id !== eventId));
      return true;
    } catch (err: any) {
      console.error('Error deleting event:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Determine if we should show demo data
  const isDemo = useMemo(() => {
    return !isLoading && shouldInjectDemoData(events.length);
  }, [isLoading, events.length, shouldInjectDemoData]);

  // Get effective events (real or demo)
  const effectiveEvents = useMemo(() => {
    if (isDemo) {
      return generateDemoCalendarEvents();
    }
    return events;
  }, [isDemo, events]);

  // Wrapped create that dismisses demo mode
  const createEventWithDemoCheck = useCallback(async (
    eventData: Omit<CalendarEvent, 'id' | 'createdAt'>
  ): Promise<CalendarEvent | null> => {
    if (isDemo) {
      dismissDemoData();
    }
    return createEvent(eventData);
  }, [createEvent, isDemo, dismissDemoData]);

  return {
    events: effectiveEvents,
    isLoading,
    error,
    isDemo,
    createEvent: createEventWithDemoCheck,
    updateEvent,
    deleteEvent,
    setEvents
  };
}
