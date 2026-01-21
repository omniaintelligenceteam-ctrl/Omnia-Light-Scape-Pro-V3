import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CalendarEvent, EventType, TimeSlot } from '../types';

export function useCalendarEvents() {
  const { user } = useUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            date: e.date,
            timeSlot: e.time_slot as TimeSlot,
            customTime: e.custom_time,
            duration: Number(e.duration),
            location: e.location,
            notes: e.notes,
            clientName: e.client_name,
            clientPhone: e.client_phone,
            color: e.color,
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
          color: eventData.color
        })
      });

      if (!response.ok) throw new Error('Failed to create event');

      const data = await response.json();
      if (data.success && data.data) {
        const newEvent: CalendarEvent = {
          id: data.data.id,
          title: data.data.title,
          eventType: data.data.event_type as EventType,
          date: data.data.date,
          timeSlot: data.data.time_slot as TimeSlot,
          customTime: data.data.custom_time,
          duration: Number(data.data.duration),
          location: data.data.location,
          notes: data.data.notes,
          clientName: data.data.client_name,
          clientPhone: data.data.client_phone,
          color: data.data.color,
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
          color: updates.color
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

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    setEvents
  };
}
