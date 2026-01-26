// Demo Data Generators
// Exports all demo data generation functions for use in data hooks

export { generateDemoClients, getDemoClientById, DEMO_CLIENT_IDS } from './demoClients';
export { generateDemoLocations, DEMO_LOCATION_IDS } from './demoLocations';
export { generateDemoTechnicians, DEMO_TECHNICIAN_IDS } from './demoTechnicians';
export { generateDemoProjects, DEMO_PROJECT_IDS } from './demoProjects';
export { generateDemoCalendarEvents, DEMO_EVENT_IDS } from './demoCalendarEvents';
export { generateDemoGoals, DEMO_GOAL_IDS } from './demoGoals';

// Re-export utilities
export * from './utils';

// Combined demo data generator (generates all data at once)
import { generateDemoClients } from './demoClients';
import { generateDemoLocations } from './demoLocations';
import { generateDemoTechnicians } from './demoTechnicians';
import { generateDemoProjects } from './demoProjects';
import { generateDemoCalendarEvents } from './demoCalendarEvents';
import { generateDemoGoals } from './demoGoals';

import type { Client, Location, Technician, SavedProject, CalendarEvent, BusinessGoal } from '../../types';

export interface DemoData {
  clients: Client[];
  locations: Location[];
  technicians: Technician[];
  projects: SavedProject[];
  events: CalendarEvent[];
  goals: BusinessGoal[];
}

// Generate all demo data at once
export function generateAllDemoData(): DemoData {
  return {
    clients: generateDemoClients(),
    locations: generateDemoLocations(),
    technicians: generateDemoTechnicians(),
    projects: generateDemoProjects(),
    events: generateDemoCalendarEvents(),
    goals: generateDemoGoals(),
  };
}

// Singleton pattern to ensure consistent demo data across the app
let cachedDemoData: DemoData | null = null;

export function getDemoData(): DemoData {
  if (!cachedDemoData) {
    cachedDemoData = generateAllDemoData();
  }
  return cachedDemoData;
}

// Clear cached demo data (useful for testing or refresh)
export function clearDemoDataCache(): void {
  cachedDemoData = null;
}
