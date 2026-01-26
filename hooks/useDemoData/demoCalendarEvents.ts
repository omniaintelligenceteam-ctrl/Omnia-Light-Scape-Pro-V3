import type { CalendarEvent, EventType, TimeSlot } from '../../types';
import { formatISODate, formatISODateTime, getDaysFromNow, randomInt } from './utils';
import { DEMO_CLIENT_IDS } from './demoClients';
import { DEMO_PROJECT_IDS } from './demoProjects';

// Client details for events
const CLIENT_NAMES = [
  'Robert Smith', 'Michael Thompson', 'Jennifer Martinez', 'David Johnson',
  'Carlos Williams', 'Emily Chen', 'Thomas Anderson', 'Amanda Taylor',
  'William Brown', 'Jessica Davis', 'Richard Garcia', 'Nicole Miller',
];

const CLIENT_PHONES = [
  '(512) 555-0142', '(512) 555-0187', '(737) 555-0234', '(512) 555-0356',
  '(512) 555-0478', '(737) 555-0512', '(512) 555-0623', '(254) 555-0734',
  '(512) 555-0845', '(737) 555-0956', '(512) 555-1067', '(512) 555-1178',
];

// Pre-defined calendar events
interface DemoEventData {
  title: string;
  eventType: EventType;
  daysFromNow: number;
  timeSlot: TimeSlot;
  customTime?: string;
  duration: number;
  clientIndex?: number;
  projectIndex?: number;
  location?: string;
  notes?: string;
}

const DEMO_EVENTS_DATA: DemoEventData[] = [
  // Consultations (5)
  {
    title: 'Consultation - New Lead (Website)',
    eventType: 'consultation',
    daysFromNow: 2,
    timeSlot: 'morning',
    duration: 1.5,
    location: '4521 Riverside Dr, Austin, TX 78741',
    notes: 'New website inquiry. Interested in backyard lighting.',
  },
  {
    title: 'Consultation - Garcia Referral',
    eventType: 'consultation',
    daysFromNow: 5,
    timeSlot: 'afternoon',
    duration: 1.5,
    clientIndex: 10,
    location: '4567 Pecan Valley Court, Austin, TX 78731',
    notes: 'Pool area consultation. Referral from yard sign.',
  },
  {
    title: 'Design Consultation - Premium Client',
    eventType: 'consultation',
    daysFromNow: 9,
    timeSlot: 'morning',
    duration: 2,
    location: '8765 Westlake Dr, Austin, TX 78746',
    notes: 'High-end property. Bring premium fixture samples.',
  },
  {
    title: 'Consultation - Anderson Holiday',
    eventType: 'consultation',
    daysFromNow: 14,
    timeSlot: 'afternoon',
    duration: 1,
    clientIndex: 6,
    projectIndex: 15, // Anderson Manor - Holiday Prep (draft)
    location: '9012 Mountain View Trail, Bee Cave, TX 78738',
    notes: 'Holiday lighting discussion. Show portfolio.',
  },
  {
    title: 'New Client Consultation',
    eventType: 'consultation',
    daysFromNow: 21,
    timeSlot: 'morning',
    duration: 1.5,
    location: '3456 Lake Austin Blvd, Austin, TX 78703',
    notes: 'Waterfront property. May need marine-grade fixtures.',
  },

  // Site Visits (4)
  {
    title: 'Site Visit - Pre-Installation Check',
    eventType: 'site-visit',
    daysFromNow: 1,
    timeSlot: 'morning',
    duration: 1,
    clientIndex: 1,
    projectIndex: 3, // Thompson Estate
    location: '12750 Lakeside Estate Blvd, Austin, TX 78732',
    notes: 'Verify wire routes before installation.',
  },
  {
    title: 'Site Measurement - Davis Property',
    eventType: 'site-visit',
    daysFromNow: 6,
    timeSlot: 'afternoon',
    duration: 1.5,
    clientIndex: 9,
    projectIndex: 10, // Davis Home
    location: '7890 Bluebonnet Lane, Westlake, TX 78746',
    notes: 'Measure for final design. Premium fixtures.',
  },
  {
    title: 'Site Assessment - New Lead',
    eventType: 'site-visit',
    daysFromNow: 11,
    timeSlot: 'morning',
    duration: 1,
    location: '5678 Spicewood Springs, Austin, TX 78759',
    notes: 'Initial site assessment for quote.',
  },
  {
    title: 'Pre-Installation Walkthrough',
    eventType: 'site-visit',
    daysFromNow: 17,
    timeSlot: 'morning',
    duration: 1,
    clientIndex: 4,
    projectIndex: 6, // Wilson Estate
    location: '6782 Pine Forest Way, Austin, TX 78746',
    notes: 'Final walkthrough before two-day installation.',
  },

  // Follow-ups (4)
  {
    title: 'Follow-up Call - Martinez Quote',
    eventType: 'follow-up',
    daysFromNow: 3,
    timeSlot: 'afternoon',
    customTime: '14:00',
    duration: 0.5,
    clientIndex: 2,
    projectIndex: 11, // Martinez Home
    notes: 'Quote sent 5 days ago. Follow up on decision.',
  },
  {
    title: 'Post-Installation Check - Smith',
    eventType: 'follow-up',
    daysFromNow: 7,
    timeSlot: 'morning',
    duration: 0.5,
    clientIndex: 0,
    projectIndex: 0, // Smith Residence (completed)
    location: '4821 Oak Valley Drive, Austin, TX 78731',
    notes: '2-week post-install check. Ensure satisfaction.',
  },
  {
    title: 'Quote Follow-up - Taylor',
    eventType: 'follow-up',
    daysFromNow: 10,
    timeSlot: 'afternoon',
    duration: 0.5,
    clientIndex: 7,
    projectIndex: 12, // Taylor Home
    notes: 'Second follow-up. Offer 5% early booking discount.',
  },
  {
    title: 'Annual Checkup Reminder - Previous Client',
    eventType: 'follow-up',
    daysFromNow: 28,
    timeSlot: 'morning',
    duration: 0.5,
    notes: 'Annual maintenance check offer. Pull list of clients from last year.',
  },

  // Service Calls (3)
  {
    title: 'Service Call - Bulb Replacement',
    eventType: 'service-call',
    daysFromNow: 4,
    timeSlot: 'morning',
    duration: 1,
    location: '2345 Bee Caves Rd, Austin, TX 78746',
    notes: 'Warranty replacement. 3 LED bulbs failed.',
  },
  {
    title: 'Maintenance - Quarterly Check',
    eventType: 'service-call',
    daysFromNow: 15,
    timeSlot: 'afternoon',
    duration: 2,
    clientIndex: 4,
    location: '6782 Pine Forest Way, Austin, TX 78746',
    notes: 'Quarterly maintenance. Clean fixtures, check connections.',
  },
  {
    title: 'Warranty Service - Transformer',
    eventType: 'service-call',
    daysFromNow: 22,
    timeSlot: 'morning',
    duration: 1.5,
    location: '9876 Great Hills Trail, Austin, TX 78759',
    notes: 'Transformer showing error. Under warranty.',
  },

  // Meetings (1)
  {
    title: 'Team Meeting - Weekly Sync',
    eventType: 'meeting',
    daysFromNow: 0, // Today
    timeSlot: 'morning',
    customTime: '08:00',
    duration: 1,
    location: '8500 Shoal Creek Blvd, Suite 200, Austin, TX 78757',
    notes: 'Weekly team meeting. Review schedule and upcoming jobs.',
  },

  // More future events spread across next 2 months
  {
    title: 'Consultation - Commercial Property',
    eventType: 'consultation',
    daysFromNow: 32,
    timeSlot: 'morning',
    duration: 2,
    location: '1500 S Congress Ave, Austin, TX 78704',
    notes: 'Restaurant patio lighting. Commercial project.',
  },
  {
    title: 'Site Visit - Spring Installation',
    eventType: 'site-visit',
    daysFromNow: 45,
    timeSlot: 'afternoon',
    duration: 1.5,
    location: '7890 Lakeline Blvd, Cedar Park, TX 78613',
    notes: 'Spring project planning. Large property.',
  },
  {
    title: 'Service Call - Timer Adjustment',
    eventType: 'service-call',
    daysFromNow: 55,
    timeSlot: 'morning',
    duration: 0.5,
    clientIndex: 3,
    location: '2145 Willow Creek Court, Cedar Park, TX 78613',
    notes: 'Daylight savings time adjustment.',
  },
  {
    title: 'Follow-up - Seasonal Check-ins',
    eventType: 'follow-up',
    daysFromNow: 60,
    timeSlot: 'afternoon',
    duration: 2,
    notes: 'Quarterly client check-in calls. Block time for multiple calls.',
  },
];

export function generateDemoCalendarEvents(): CalendarEvent[] {
  return DEMO_EVENTS_DATA.map((eventData, index) => {
    const eventDate = getDaysFromNow(eventData.daysFromNow);

    const event: CalendarEvent = {
      id: `demo_event_${index + 1}`,
      title: eventData.title,
      eventType: eventData.eventType,
      date: formatISODate(eventDate),
      timeSlot: eventData.timeSlot,
      customTime: eventData.customTime,
      duration: eventData.duration,
      location: eventData.location,
      notes: eventData.notes,
      createdAt: formatISODateTime(getDaysFromNow(-randomInt(1, 14))),
    };

    // Add client info if specified
    if (eventData.clientIndex !== undefined) {
      event.clientId = DEMO_CLIENT_IDS[eventData.clientIndex];
      event.clientName = CLIENT_NAMES[eventData.clientIndex];
      event.clientPhone = CLIENT_PHONES[eventData.clientIndex];
    }

    // Add project link if specified
    if (eventData.projectIndex !== undefined) {
      event.projectId = DEMO_PROJECT_IDS[eventData.projectIndex];
    }

    return event;
  });
}

// Export event IDs for reference
export const DEMO_EVENT_IDS = DEMO_EVENTS_DATA.map((_, index) => `demo_event_${index + 1}`);

export default generateDemoCalendarEvents;
