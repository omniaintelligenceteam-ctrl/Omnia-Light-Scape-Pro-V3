import type { Location } from '../../types';
import { formatISODateTime, getDaysFromNow } from './utils';

// Pre-defined demo locations
const DEMO_LOCATIONS_DATA: Array<{
  name: string;
  address: string;
  managerName: string;
  managerEmail: string;
  latitude?: number;
  longitude?: number;
}> = [
  {
    name: 'Austin Main Office',
    address: '8500 Shoal Creek Blvd, Suite 200, Austin, TX 78757',
    managerName: 'Marcus Johnson',
    managerEmail: 'marcus@lightscape.com',
    latitude: 30.3566,
    longitude: -97.7394,
  },
  {
    name: 'Round Rock Branch',
    address: '1250 E Palm Valley Blvd, Round Rock, TX 78664',
    managerName: 'David Chen',
    managerEmail: 'david@lightscape.com',
    latitude: 30.5083,
    longitude: -97.6783,
  },
];

export function generateDemoLocations(): Location[] {
  const createdAt = getDaysFromNow(-180); // Created 6 months ago

  return DEMO_LOCATIONS_DATA.map((locationData, index) => ({
    id: `demo_location_${index + 1}`,
    name: locationData.name,
    address: locationData.address,
    managerName: locationData.managerName,
    managerEmail: locationData.managerEmail,
    isActive: true,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    createdAt: formatISODateTime(createdAt),
    updatedAt: formatISODateTime(createdAt),
  }));
}

// Export location IDs for reference
export const DEMO_LOCATION_IDS = DEMO_LOCATIONS_DATA.map((_, index) => `demo_location_${index + 1}`);

export default generateDemoLocations;
