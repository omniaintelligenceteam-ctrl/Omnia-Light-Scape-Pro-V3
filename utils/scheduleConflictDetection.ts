import { SavedProject, CalendarEvent, TimeSlot } from '../types';

export interface ScheduledItem {
  id: string;
  date: string;
  timeSlot: TimeSlot;
  customTime?: string;
  duration: number;
  name: string;
  type: 'project' | 'event';
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: ScheduledItem[];
  warnings: string[];
}

/**
 * Convert a time slot to start and end hours (24-hour format)
 */
export function getTimeSlotRange(
  slot: TimeSlot,
  customTime?: string,
  duration: number = 2
): { start: number; end: number } {
  switch (slot) {
    case 'morning':
      return { start: 8, end: 12 };
    case 'afternoon':
      return { start: 12, end: 17 };
    case 'evening':
      return { start: 17, end: 20 };
    case 'custom':
      if (customTime) {
        const [hours, minutes] = customTime.split(':').map(Number);
        const startHour = hours + (minutes || 0) / 60;
        return { start: startHour, end: startHour + duration };
      }
      // Default to 9am if no custom time provided
      return { start: 9, end: 9 + duration };
    default:
      return { start: 8, end: 12 };
  }
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number }
): boolean {
  return range1.start < range2.end && range2.start < range1.end;
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(slot: TimeSlot, customTime?: string): string {
  switch (slot) {
    case 'morning':
      return 'Morning (8am-12pm)';
    case 'afternoon':
      return 'Afternoon (12pm-5pm)';
    case 'evening':
      return 'Evening (5pm-8pm)';
    case 'custom':
      if (customTime) {
        const [hours, minutes] = customTime.split(':').map(Number);
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHour}:${(minutes || 0).toString().padStart(2, '0')}${period}`;
      }
      return 'Custom time';
    default:
      return slot;
  }
}

/**
 * Main conflict detection function
 *
 * @param proposedDate - ISO date string (YYYY-MM-DD)
 * @param proposedTimeSlot - Time slot for the proposed schedule
 * @param proposedCustomTime - Custom time if using custom slot
 * @param proposedDuration - Duration in hours
 * @param existingProjects - All saved projects
 * @param existingEvents - All calendar events
 * @param excludeId - ID to exclude (for rescheduling an existing item)
 */
export function detectConflicts(
  proposedDate: string,
  proposedTimeSlot: TimeSlot,
  proposedCustomTime: string | undefined,
  proposedDuration: number,
  existingProjects: SavedProject[],
  existingEvents: CalendarEvent[],
  excludeId?: string
): ConflictResult {
  const conflicts: ScheduledItem[] = [];
  const warnings: string[] = [];

  // Get the time range for the proposed schedule
  const proposedRange = getTimeSlotRange(proposedTimeSlot, proposedCustomTime, proposedDuration);

  // Check scheduled projects
  existingProjects.forEach(project => {
    // Skip if not scheduled or if this is the item being rescheduled
    if (!project.schedule?.scheduledDate || project.id === excludeId) return;

    // Skip if different date
    if (project.schedule.scheduledDate !== proposedDate) return;

    // Get the time range for this project
    const projectRange = getTimeSlotRange(
      project.schedule.timeSlot,
      project.schedule.customTime,
      project.schedule.estimatedDuration || 2
    );

    // Check for overlap
    if (timeRangesOverlap(proposedRange, projectRange)) {
      conflicts.push({
        id: project.id,
        date: project.schedule.scheduledDate,
        timeSlot: project.schedule.timeSlot,
        customTime: project.schedule.customTime,
        duration: project.schedule.estimatedDuration || 2,
        name: project.name,
        type: 'project'
      });
    }
  });

  // Check calendar events
  existingEvents.forEach(event => {
    // Skip if this is the item being rescheduled
    if (event.id === excludeId) return;

    // Skip if different date
    if (event.date !== proposedDate) return;

    // Get the time range for this event
    const eventRange = getTimeSlotRange(
      event.timeSlot,
      event.customTime,
      event.duration || 1
    );

    // Check for overlap
    if (timeRangesOverlap(proposedRange, eventRange)) {
      conflicts.push({
        id: event.id,
        date: event.date,
        timeSlot: event.timeSlot,
        customTime: event.customTime,
        duration: event.duration || 1,
        name: event.title,
        type: 'event'
      });
    }
  });

  // Generate warnings
  if (conflicts.length > 0) {
    const projectConflicts = conflicts.filter(c => c.type === 'project');
    const eventConflicts = conflicts.filter(c => c.type === 'event');

    if (projectConflicts.length > 0) {
      warnings.push(`${projectConflicts.length} installation${projectConflicts.length > 1 ? 's' : ''} already scheduled`);
    }
    if (eventConflicts.length > 0) {
      warnings.push(`${eventConflicts.length} event${eventConflicts.length > 1 ? 's' : ''} scheduled`);
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    warnings
  };
}

/**
 * Get all scheduled items for a specific date
 */
export function getScheduledItemsForDate(
  date: string,
  projects: SavedProject[],
  events: CalendarEvent[]
): ScheduledItem[] {
  const items: ScheduledItem[] = [];

  // Add scheduled projects
  projects.forEach(project => {
    if (project.schedule?.scheduledDate === date) {
      items.push({
        id: project.id,
        date: project.schedule.scheduledDate,
        timeSlot: project.schedule.timeSlot,
        customTime: project.schedule.customTime,
        duration: project.schedule.estimatedDuration || 2,
        name: project.name,
        type: 'project'
      });
    }
  });

  // Add calendar events
  events.forEach(event => {
    if (event.date === date) {
      items.push({
        id: event.id,
        date: event.date,
        timeSlot: event.timeSlot,
        customTime: event.customTime,
        duration: event.duration || 1,
        name: event.title,
        type: 'event'
      });
    }
  });

  // Sort by time slot
  const slotOrder: Record<TimeSlot, number> = {
    morning: 0,
    afternoon: 1,
    evening: 2,
    custom: 3
  };

  items.sort((a, b) => {
    const orderDiff = slotOrder[a.timeSlot] - slotOrder[b.timeSlot];
    if (orderDiff !== 0) return orderDiff;

    // For custom times, sort by actual time
    if (a.timeSlot === 'custom' && b.timeSlot === 'custom') {
      return (a.customTime || '').localeCompare(b.customTime || '');
    }
    return 0;
  });

  return items;
}
