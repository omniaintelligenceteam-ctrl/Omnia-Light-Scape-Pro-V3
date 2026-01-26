import type { Technician, TechnicianRole } from '../../types';
import { formatISODateTime, getDaysFromNow } from './utils';
import { DEMO_LOCATION_IDS } from './demoLocations';

// Pre-defined demo technicians
const DEMO_TECHNICIANS_DATA: Array<{
  name: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  locationIndex: number; // 0 = Austin, 1 = Round Rock
  homeAddress: string;
  homeLatitude: number;
  homeLongitude: number;
  hourlyRate: number;
  skills?: string[];
  notes?: string;
}> = [
  {
    name: 'Marcus Johnson',
    email: 'marcus@lightscape.com',
    phone: '(512) 555-0201',
    role: 'lead',
    locationIndex: 0,
    homeAddress: '4521 Mesa Drive, Austin, TX 78731',
    homeLatitude: 30.3421,
    homeLongitude: -97.7512,
    hourlyRate: 45,
    skills: ['Tree uplighting', 'Transformer sizing', 'Design consultation'],
    notes: 'Lead technician for Austin. 8 years experience.',
  },
  {
    name: 'David Chen',
    email: 'david@lightscape.com',
    phone: '(512) 555-0202',
    role: 'technician',
    locationIndex: 1,
    homeAddress: '2890 Gattis School Rd, Round Rock, TX 78664',
    homeLatitude: 30.4892,
    homeLongitude: -97.6621,
    hourlyRate: 35,
    skills: ['LED installations', 'Hardscape lighting', 'Troubleshooting'],
    notes: 'Specializes in hardscape and pathway lighting.',
  },
  {
    name: 'Carlos Rodriguez',
    email: 'carlos@lightscape.com',
    phone: '(512) 555-0203',
    role: 'technician',
    locationIndex: 0,
    homeAddress: '7845 Burnet Rd, Austin, TX 78757',
    homeLatitude: 30.3789,
    homeLongitude: -97.7234,
    hourlyRate: 35,
    skills: ['Wiring', 'Transformer installation', 'Holiday lighting'],
    notes: 'Experienced with holiday lighting installations.',
  },
  {
    name: 'James Wilson',
    email: 'james@lightscape.com',
    phone: '(512) 555-0204',
    role: 'apprentice',
    locationIndex: 0,
    homeAddress: '1234 Research Blvd, Austin, TX 78759',
    homeLatitude: 30.3912,
    homeLongitude: -97.7456,
    hourlyRate: 22,
    skills: ['Basic wiring', 'Fixture placement'],
    notes: 'New apprentice, learning quickly. Started 3 months ago.',
  },
  {
    name: 'Ryan Mitchell',
    email: 'ryan@lightscape.com',
    phone: '(512) 555-0205',
    role: 'apprentice',
    locationIndex: 1,
    homeAddress: '5678 A.W. Grimes Blvd, Round Rock, TX 78665',
    homeLatitude: 30.5234,
    homeLongitude: -97.6512,
    hourlyRate: 22,
    skills: ['Basic installation', 'Customer service'],
    notes: 'Apprentice at Round Rock branch. Good communication skills.',
  },
];

export function generateDemoTechnicians(): Technician[] {
  const createdAt = getDaysFromNow(-120); // Created 4 months ago

  return DEMO_TECHNICIANS_DATA.map((techData, index) => ({
    id: `demo_tech_${index + 1}`,
    locationId: DEMO_LOCATION_IDS[techData.locationIndex],
    name: techData.name,
    email: techData.email,
    phone: techData.phone,
    role: techData.role,
    isActive: true,
    createdAt: formatISODateTime(createdAt),
    updatedAt: formatISODateTime(createdAt),
    skills: techData.skills,
    notes: techData.notes,
    hourlyRate: techData.hourlyRate,
    homeAddress: techData.homeAddress,
    homeLatitude: techData.homeLatitude,
    homeLongitude: techData.homeLongitude,
  }));
}

// Export technician IDs for reference
export const DEMO_TECHNICIAN_IDS = DEMO_TECHNICIANS_DATA.map((_, index) => `demo_tech_${index + 1}`);

export default generateDemoTechnicians;
