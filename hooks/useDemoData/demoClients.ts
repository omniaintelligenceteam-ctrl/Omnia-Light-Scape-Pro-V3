import type { Client, LeadSource } from '../../types';
import { formatISODateTime, getDaysFromNow } from './utils';

// Pre-defined demo clients for consistent experience
const DEMO_CLIENTS_DATA: Array<{
  name: string;
  email: string;
  phone: string;
  address: string;
  leadSource: LeadSource;
  marketingCost?: number;
  notes?: string;
}> = [
  {
    name: 'Robert & Sarah Smith',
    email: 'smith.family@email.com',
    phone: '(512) 555-0142',
    address: '4821 Oak Valley Drive, Austin, TX 78731',
    leadSource: 'referral',
    notes: 'Referred by the Thompson family. Very interested in accent lighting for their oak trees.',
  },
  {
    name: 'Michael Thompson',
    email: 'mthompson@business.com',
    phone: '(512) 555-0187',
    address: '12750 Lakeside Estate Blvd, Austin, TX 78732',
    leadSource: 'google',
    marketingCost: 45.00,
    notes: 'Large estate property. Interested in comprehensive lighting package.',
  },
  {
    name: 'Jennifer Martinez',
    email: 'jmartinez@gmail.com',
    phone: '(737) 555-0234',
    address: '8934 Cedar Ridge Lane, Round Rock, TX 78664',
    leadSource: 'angi',
    marketingCost: 89.00,
    notes: 'Found us on Angi. Primarily interested in pathway and driveway lighting.',
  },
  {
    name: 'David & Lisa Johnson',
    email: 'johnson.family@outlook.com',
    phone: '(512) 555-0356',
    address: '2145 Willow Creek Court, Cedar Park, TX 78613',
    leadSource: 'referral',
    notes: 'Neighbors of the Smiths. Want similar tree uplighting.',
  },
  {
    name: 'Carlos Williams',
    email: 'cwilliams@yahoo.com',
    phone: '(512) 555-0478',
    address: '6782 Pine Forest Way, Austin, TX 78746',
    leadSource: 'website',
    notes: 'Contacted via website form. Interested in architectural accent lighting.',
  },
  {
    name: 'Emily Chen',
    email: 'emily.chen@icloud.com',
    phone: '(737) 555-0512',
    address: '3456 Sunset Hills Drive, Lakeway, TX 78734',
    leadSource: 'google',
    marketingCost: 52.00,
    notes: 'Modern home, wants contemporary lighting design. Budget: $15K+',
  },
  {
    name: 'Thomas Anderson',
    email: 'tanderson@email.com',
    phone: '(512) 555-0623',
    address: '9012 Mountain View Trail, Bee Cave, TX 78738',
    leadSource: 'social',
    notes: 'Found us on Instagram. Interested in holiday lighting for the season.',
  },
  {
    name: 'Amanda Taylor',
    email: 'ataylor@gmail.com',
    phone: '(254) 555-0734',
    address: '5678 River Bend Circle, Round Rock, TX 78681',
    leadSource: 'thumbtack',
    marketingCost: 75.00,
    notes: 'Security lighting priority. Also wants accent lighting for curb appeal.',
  },
  {
    name: 'William Brown',
    email: 'wbrown@business.com',
    phone: '(512) 555-0845',
    address: '1234 Hidden Canyon Road, Austin, TX 78757',
    leadSource: 'referral',
    notes: 'Commercial property owner. Referred by business associate.',
  },
  {
    name: 'Jessica Davis',
    email: 'jdavis@outlook.com',
    phone: '(737) 555-0956',
    address: '7890 Bluebonnet Lane, Westlake, TX 78746',
    leadSource: 'google',
    marketingCost: 38.00,
    notes: 'High-end property. Wants premium fixtures only.',
  },
  {
    name: 'Richard Garcia',
    email: 'rgarcia@yahoo.com',
    phone: '(512) 555-1067',
    address: '4567 Pecan Valley Court, Austin, TX 78731',
    leadSource: 'yard_sign',
    notes: 'Saw our yard sign at a neighbor\'s property. Pool area lighting focus.',
  },
  {
    name: 'Nicole Miller',
    email: 'nmiller@gmail.com',
    phone: '(512) 555-1178',
    address: '8901 Cypress Point Drive, Cedar Park, TX 78613',
    leadSource: 'website',
    notes: 'First-time homeowner. Looking for budget-friendly options.',
  },
];

export function generateDemoClients(): Client[] {
  return DEMO_CLIENTS_DATA.map((clientData, index) => {
    const createdDaysAgo = 30 + (index * 15); // Spread over 6 months
    const createdAt = getDaysFromNow(-createdDaysAgo);

    return {
      id: `demo_client_${index + 1}`,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      address: clientData.address,
      notes: clientData.notes,
      leadSource: clientData.leadSource,
      marketingCost: clientData.marketingCost,
      projectCount: 0, // Will be updated when projects are assigned
      totalRevenue: 0, // Will be updated based on completed projects
      createdAt: formatISODateTime(createdAt),
      updatedAt: formatISODateTime(createdAt),
    };
  });
}

// Get a demo client by index (for linking to projects)
export function getDemoClientById(id: string): Client | undefined {
  const clients = generateDemoClients();
  return clients.find(c => c.id === id);
}

// Export client IDs for reference in other demo data
export const DEMO_CLIENT_IDS = DEMO_CLIENTS_DATA.map((_, index) => `demo_client_${index + 1}`);

export default generateDemoClients;
