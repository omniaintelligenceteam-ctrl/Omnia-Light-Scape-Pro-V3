import type { SavedProject, ProjectStatus, QuoteData, LineItem, ScheduleData, TimeSlot, BOMData } from '../../types';
import { formatISODate, formatISODateTime, getDaysFromNow, randomInt, pickRandom } from './utils';
import { DEMO_CLIENT_IDS } from './demoClients';
import { DEMO_TECHNICIAN_IDS } from './demoTechnicians';
import { DEMO_LOCATION_IDS } from './demoLocations';

// Sample project images (using placeholder or local sample)
const SAMPLE_IMAGES = [
  '/samples/house1.jpg.webp',
  '/samples/house2.jpg.webp',
  '/samples/house3.jpg.webp',
];

// Pre-defined demo projects
interface DemoProjectData {
  name: string;
  clientIndex: number;
  status: ProjectStatus;
  scheduleDaysFromNow?: number; // positive = future, negative = past
  timeSlot?: TimeSlot;
  estimatedDuration?: number;
  quoteTotal?: number;
  invoicePaid?: boolean;
  technicianIndex?: number;
  locationIndex?: number;
  notes?: string;
  installationNotes?: string;
}

const DEMO_PROJECTS_DATA: DemoProjectData[] = [
  // Completed projects (3)
  {
    name: 'Smith Residence - Front Yard Lighting',
    clientIndex: 0,
    status: 'completed',
    scheduleDaysFromNow: -15,
    timeSlot: 'morning',
    estimatedDuration: 6,
    quoteTotal: 8750,
    invoicePaid: true,
    technicianIndex: 0,
    locationIndex: 0,
    notes: 'Beautiful oak tree uplighting project',
    installationNotes: 'Gate code: 1234. Park in driveway.',
  },
  {
    name: 'Williams House - Architectural Accent',
    clientIndex: 4,
    status: 'completed',
    scheduleDaysFromNow: -22,
    timeSlot: 'morning',
    estimatedDuration: 4,
    quoteTotal: 6400,
    invoicePaid: true,
    technicianIndex: 1,
    locationIndex: 0,
    notes: 'Modern architectural accent lighting',
  },
  {
    name: 'Miller House - Patio Lighting',
    clientIndex: 11,
    status: 'completed',
    scheduleDaysFromNow: -8,
    timeSlot: 'afternoon',
    estimatedDuration: 3,
    quoteTotal: 4200,
    invoicePaid: false, // Invoice sent but not paid yet
    technicianIndex: 2,
    locationIndex: 1,
    notes: 'Budget-friendly patio and pathway combo',
  },

  // Scheduled projects (5)
  {
    name: 'Thompson Estate - Backyard Entertainment',
    clientIndex: 1,
    status: 'scheduled',
    scheduleDaysFromNow: 3,
    timeSlot: 'morning',
    estimatedDuration: 10,
    quoteTotal: 18500,
    technicianIndex: 0,
    locationIndex: 0,
    notes: 'Large estate, full backyard entertainment area',
    installationNotes: 'Check in at main gate. Contact: 512-555-0187',
  },
  {
    name: 'Chen Residence - Complete Landscape Package',
    clientIndex: 5,
    status: 'scheduled',
    scheduleDaysFromNow: 8,
    timeSlot: 'morning',
    estimatedDuration: 8,
    quoteTotal: 15200,
    technicianIndex: 0,
    locationIndex: 0,
    notes: 'Modern home, contemporary design',
    installationNotes: 'Homeowner works from home. Ring doorbell on arrival.',
  },
  {
    name: 'Brown Residence - Pathway Lighting',
    clientIndex: 8,
    status: 'scheduled',
    scheduleDaysFromNow: 12,
    timeSlot: 'afternoon',
    estimatedDuration: 4,
    quoteTotal: 3800,
    technicianIndex: 1,
    locationIndex: 0,
    notes: 'Commercial property pathway lighting',
  },
  {
    name: 'Wilson Estate - Full Property',
    clientIndex: 4,
    status: 'scheduled',
    scheduleDaysFromNow: 18,
    timeSlot: 'morning',
    estimatedDuration: 12,
    quoteTotal: 22400,
    technicianIndex: 0,
    locationIndex: 0,
    notes: 'Comprehensive lighting for entire property',
    installationNotes: 'Two-day installation. Coordinate with landscaping crew.',
  },
  {
    name: 'Harris Property - Landscape Accent',
    clientIndex: 9,
    status: 'scheduled',
    scheduleDaysFromNow: 25,
    timeSlot: 'morning',
    estimatedDuration: 6,
    quoteTotal: 11500,
    technicianIndex: 2,
    locationIndex: 1,
    notes: 'High-end property, premium fixtures',
  },

  // Approved projects (3)
  {
    name: 'Johnson Property - Tree Uplighting',
    clientIndex: 3,
    status: 'approved',
    quoteTotal: 4800,
    locationIndex: 0,
    notes: 'Similar to Smith project, neighbor referral',
  },
  {
    name: 'Davis Home - Architectural Focus',
    clientIndex: 9,
    status: 'approved',
    quoteTotal: 9600,
    locationIndex: 0,
    notes: 'Premium fixtures only, high-end client',
  },
  {
    name: 'White Home - Facade Lighting',
    clientIndex: 4,
    status: 'approved',
    quoteTotal: 8100,
    locationIndex: 1,
    notes: 'Focus on front facade and entry',
  },

  // Quoted projects (4)
  {
    name: 'Martinez Home - Driveway & Pathway',
    clientIndex: 2,
    status: 'quoted',
    quoteTotal: 5200,
    locationIndex: 1,
    notes: 'Angi lead, waiting for approval',
  },
  {
    name: 'Taylor Home - Security & Accent',
    clientIndex: 7,
    status: 'quoted',
    quoteTotal: 7900,
    locationIndex: 0,
    notes: 'Security lighting priority with accent features',
  },
  {
    name: 'Garcia Villa - Pool Area',
    clientIndex: 10,
    status: 'quoted',
    quoteTotal: 12300,
    locationIndex: 0,
    notes: 'Pool area and outdoor kitchen lighting',
  },
  {
    name: 'Jackson Residence - Garden Lighting',
    clientIndex: 3,
    status: 'quoted',
    quoteTotal: 6800,
    locationIndex: 1,
    notes: 'Extensive garden with water features',
  },

  // Draft projects (3)
  {
    name: 'Anderson Manor - Holiday Prep',
    clientIndex: 6,
    status: 'draft',
    locationIndex: 0,
    notes: 'Holiday lighting consultation scheduled',
  },
  {
    name: 'Moore Home - Entry Design',
    clientIndex: 4,
    status: 'draft',
    locationIndex: 1,
    notes: 'Initial consultation completed, designing',
  },
  {
    name: 'Clark Residence - Accent Design',
    clientIndex: 8,
    status: 'draft',
    locationIndex: 0,
    notes: 'New lead, site visit scheduled',
  },
];

// Client details for quotes (matching client data)
const CLIENT_DETAILS_MAP: Record<number, { name: string; email: string; phone: string; address: string }> = {
  0: { name: 'Robert & Sarah Smith', email: 'smith.family@email.com', phone: '(512) 555-0142', address: '4821 Oak Valley Drive, Austin, TX 78731' },
  1: { name: 'Michael Thompson', email: 'mthompson@business.com', phone: '(512) 555-0187', address: '12750 Lakeside Estate Blvd, Austin, TX 78732' },
  2: { name: 'Jennifer Martinez', email: 'jmartinez@gmail.com', phone: '(737) 555-0234', address: '8934 Cedar Ridge Lane, Round Rock, TX 78664' },
  3: { name: 'David & Lisa Johnson', email: 'johnson.family@outlook.com', phone: '(512) 555-0356', address: '2145 Willow Creek Court, Cedar Park, TX 78613' },
  4: { name: 'Carlos Williams', email: 'cwilliams@yahoo.com', phone: '(512) 555-0478', address: '6782 Pine Forest Way, Austin, TX 78746' },
  5: { name: 'Emily Chen', email: 'emily.chen@icloud.com', phone: '(737) 555-0512', address: '3456 Sunset Hills Drive, Lakeway, TX 78734' },
  6: { name: 'Thomas Anderson', email: 'tanderson@email.com', phone: '(512) 555-0623', address: '9012 Mountain View Trail, Bee Cave, TX 78738' },
  7: { name: 'Amanda Taylor', email: 'ataylor@gmail.com', phone: '(254) 555-0734', address: '5678 River Bend Circle, Round Rock, TX 78681' },
  8: { name: 'William Brown', email: 'wbrown@business.com', phone: '(512) 555-0845', address: '1234 Hidden Canyon Road, Austin, TX 78757' },
  9: { name: 'Jessica Davis', email: 'jdavis@outlook.com', phone: '(737) 555-0956', address: '7890 Bluebonnet Lane, Westlake, TX 78746' },
  10: { name: 'Richard Garcia', email: 'rgarcia@yahoo.com', phone: '(512) 555-1067', address: '4567 Pecan Valley Court, Austin, TX 78731' },
  11: { name: 'Nicole Miller', email: 'nmiller@gmail.com', phone: '(512) 555-1178', address: '8901 Cypress Point Drive, Cedar Park, TX 78613' },
};

// Generate realistic quote line items based on total
function generateLineItems(total: number): LineItem[] {
  const items: LineItem[] = [];

  // Calculate fixture counts based on budget
  const upLightCount = Math.floor(total / 2000);
  const pathLightCount = Math.floor(total / 3000);
  const laborHours = Math.floor(total / 800);

  items.push({
    id: 'li_1',
    name: 'Up Light Fixtures (LED)',
    description: 'FX Luminaire MR-16 LED uplights with adjustable beam',
    quantity: upLightCount || 4,
    unitPrice: 185,
  });

  if (pathLightCount > 0) {
    items.push({
      id: 'li_2',
      name: 'Path Light Fixtures',
      description: 'Low-voltage LED path lights with brass housing',
      quantity: pathLightCount || 3,
      unitPrice: 145,
    });
  }

  // Add transformer
  const transformerWatts = total > 10000 ? 600 : total > 5000 ? 300 : 150;
  items.push({
    id: 'li_3',
    name: `LED Transformer ${transformerWatts}W`,
    description: `Multi-tap transformer with timer and photocell`,
    quantity: 1,
    unitPrice: transformerWatts === 600 ? 525 : transformerWatts === 300 ? 425 : 325,
  });

  // Add wire and supplies
  items.push({
    id: 'li_4',
    name: 'Wire & Connectors',
    description: '12/2 direct burial wire with waterproof connectors',
    quantity: 1,
    unitPrice: Math.floor(total * 0.08),
  });

  // Add labor
  items.push({
    id: 'li_5',
    name: 'Installation Labor',
    description: 'Professional installation by certified technicians',
    quantity: laborHours || 8,
    unitPrice: 95,
  });

  return items;
}

// Generate quote data
function generateQuote(projectData: DemoProjectData): QuoteData | null {
  if (!projectData.quoteTotal) return null;

  const clientDetails = CLIENT_DETAILS_MAP[projectData.clientIndex];
  const lineItems = generateLineItems(projectData.quoteTotal);

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxRate = 0.0825;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return {
    lineItems,
    taxRate,
    discount: 0,
    clientDetails,
    total: Math.round(total),
  };
}

// Generate schedule data
function generateSchedule(projectData: DemoProjectData): ScheduleData | undefined {
  if (projectData.scheduleDaysFromNow === undefined) return undefined;

  const scheduledDate = getDaysFromNow(projectData.scheduleDaysFromNow);

  return {
    scheduledDate: formatISODate(scheduledDate),
    timeSlot: projectData.timeSlot || 'morning',
    estimatedDuration: projectData.estimatedDuration || 4,
    installationNotes: projectData.installationNotes,
  };
}

// Generate BOM data for projects with quotes
function generateBOM(projectData: DemoProjectData): BOMData | null {
  if (!projectData.quoteTotal) return null;

  const upLightCount = Math.floor(projectData.quoteTotal / 2000) || 4;
  const pathLightCount = Math.floor(projectData.quoteTotal / 3000) || 2;
  const totalFixtures = upLightCount + pathLightCount;
  const totalWattage = (upLightCount * 8) + (pathLightCount * 4);

  return {
    fixtures: [
      {
        id: 'bom_1',
        category: 'up',
        name: 'FX Luminaire MR-16 LED',
        quantity: upLightCount,
        wattage: 8,
        totalWattage: upLightCount * 8,
        brand: 'FX Luminaire',
        sku: 'MR-16-LED-8W',
      },
      {
        id: 'bom_2',
        category: 'path',
        name: 'Kichler LED Path Light',
        quantity: pathLightCount,
        wattage: 4,
        totalWattage: pathLightCount * 4,
        brand: 'Kichler',
        sku: 'PATH-LED-4W',
      },
    ],
    totalWattage,
    totalFixtures,
    recommendedTransformer: {
      name: totalWattage > 200 ? '600W Transformer' : totalWattage > 100 ? '300W Transformer' : '150W Transformer',
      watts: totalWattage > 200 ? 600 : totalWattage > 100 ? 300 : 150,
      loadPercentage: Math.round((totalWattage / (totalWattage > 200 ? 600 : totalWattage > 100 ? 300 : 150)) * 100),
    },
    wireEstimate: {
      gauge: '12/2',
      footage: totalFixtures * 50,
      runsNeeded: Math.ceil(totalFixtures / 4),
    },
    generatedAt: formatISODateTime(new Date()),
  };
}

export function generateDemoProjects(): SavedProject[] {
  return DEMO_PROJECTS_DATA.map((projectData, index) => {
    // Calculate creation date based on status
    let createdDaysAgo: number;
    switch (projectData.status) {
      case 'completed':
        createdDaysAgo = 30 + randomInt(0, 30);
        break;
      case 'scheduled':
        createdDaysAgo = 14 + randomInt(0, 14);
        break;
      case 'approved':
        createdDaysAgo = 7 + randomInt(0, 14);
        break;
      case 'quoted':
        createdDaysAgo = 3 + randomInt(0, 10);
        break;
      case 'draft':
      default:
        createdDaysAgo = randomInt(1, 7);
    }

    const createdAt = getDaysFromNow(-createdDaysAgo);
    const clientDetails = CLIENT_DETAILS_MAP[projectData.clientIndex];

    const project: SavedProject = {
      id: `demo_project_${index + 1}`,
      name: projectData.name,
      date: formatISODate(createdAt),
      image: pickRandom(SAMPLE_IMAGES),
      quote: generateQuote(projectData),
      bom: generateBOM(projectData),
      status: projectData.status,
      schedule: generateSchedule(projectData),
      clientId: DEMO_CLIENT_IDS[projectData.clientIndex],
      clientName: clientDetails.name,
      notes: projectData.notes,
      location_id: projectData.locationIndex !== undefined ? DEMO_LOCATION_IDS[projectData.locationIndex] : undefined,
    };

    // Add technician assignment for scheduled/completed projects
    if (projectData.technicianIndex !== undefined && (projectData.status === 'scheduled' || projectData.status === 'completed')) {
      project.assignedTechnicianId = DEMO_TECHNICIAN_IDS[projectData.technicianIndex];
      project.assignedTo = [DEMO_TECHNICIAN_IDS[projectData.technicianIndex]];
    }

    // Add invoice paid date for completed paid projects
    if (projectData.status === 'completed' && projectData.invoicePaid) {
      project.invoicePaidAt = formatISODateTime(getDaysFromNow(-randomInt(1, 10)));
      project.invoice_sent_at = formatISODateTime(getDaysFromNow(-randomInt(11, 15)));
    } else if (projectData.status === 'completed') {
      // Invoice sent but not paid
      project.invoice_sent_at = formatISODateTime(getDaysFromNow(-randomInt(1, 5)));
    }

    // Add actual hours for completed projects
    if (projectData.status === 'completed' && projectData.estimatedDuration) {
      project.actual_hours = projectData.estimatedDuration + randomInt(-1, 2);
    }

    return project;
  });
}

// Export project IDs for reference
export const DEMO_PROJECT_IDS = DEMO_PROJECTS_DATA.map((_, index) => `demo_project_${index + 1}`);

export default generateDemoProjects;
