// Demo data utility functions

// Generate a deterministic demo ID with prefix
let idCounter = 0;
export function generateDemoId(prefix: string): string {
  idCounter++;
  return `demo_${prefix}_${idCounter}`;
}

// Reset ID counter (useful for testing)
export function resetIdCounter(): void {
  idCounter = 0;
}

// Get today's date at midnight
export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Get date N days from today (positive = future, negative = past)
export function getDaysFromNow(days: number): Date {
  const date = getToday();
  date.setDate(date.getDate() + days);
  return date;
}

// Format date as ISO string (YYYY-MM-DD)
export function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Format date as full ISO datetime string
export function formatISODateTime(date: Date): string {
  return date.toISOString();
}

// Get a random integer between min and max (inclusive)
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get a random item from an array
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get N random items from an array (no duplicates)
export function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// Get a random date between two dates
export function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get current year
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Get current month (1-12)
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

// Get current quarter (1-4)
export function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

// Time slot helpers
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'custom';

export function getRandomTimeSlot(): TimeSlot {
  const slots: TimeSlot[] = ['morning', 'afternoon', 'evening'];
  return pickRandom(slots);
}

// Set time on a date based on time slot
export function setTimeSlotOnDate(date: Date, timeSlot: TimeSlot, customTime?: string): Date {
  const result = new Date(date);

  switch (timeSlot) {
    case 'morning':
      result.setHours(8, 0, 0, 0);
      break;
    case 'afternoon':
      result.setHours(13, 0, 0, 0);
      break;
    case 'evening':
      result.setHours(17, 0, 0, 0);
      break;
    case 'custom':
      if (customTime) {
        const [hours, minutes] = customTime.split(':').map(Number);
        result.setHours(hours, minutes, 0, 0);
      }
      break;
  }

  return result;
}

// Texas area codes for realistic phone numbers
const TEXAS_AREA_CODES = ['512', '737', '254', '361', '210', '830', '956'];

// Generate a realistic phone number
export function generatePhoneNumber(): string {
  const areaCode = pickRandom(TEXAS_AREA_CODES);
  const exchange = randomInt(200, 999);
  const subscriber = randomInt(1000, 9999);
  return `(${areaCode}) ${exchange}-${subscriber}`;
}

// Austin area street names for realistic addresses
const STREET_NAMES = [
  'Oak Valley Drive',
  'Lakeside Boulevard',
  'Cedar Ridge Lane',
  'Willow Creek Court',
  'Maple Grove Road',
  'Pine Forest Way',
  'Sunset Hills Drive',
  'Mountain View Trail',
  'River Bend Circle',
  'Hidden Canyon Road',
  'Bluebonnet Lane',
  'Pecan Valley Court',
  'Cypress Point Drive',
  'Stone Oak Parkway',
  'Ridgewood Terrace',
];

const AUSTIN_CITIES = [
  { city: 'Austin', zip: '78731' },
  { city: 'Austin', zip: '78732' },
  { city: 'Austin', zip: '78746' },
  { city: 'Austin', zip: '78757' },
  { city: 'Round Rock', zip: '78664' },
  { city: 'Round Rock', zip: '78681' },
  { city: 'Cedar Park', zip: '78613' },
  { city: 'Lakeway', zip: '78734' },
  { city: 'Bee Cave', zip: '78738' },
  { city: 'Westlake', zip: '78746' },
];

// Generate a realistic Austin-area address
export function generateAddress(): string {
  const streetNumber = randomInt(100, 15000);
  const street = pickRandom(STREET_NAMES);
  const location = pickRandom(AUSTIN_CITIES);
  return `${streetNumber} ${street}, ${location.city}, TX ${location.zip}`;
}

// Generate a realistic email from a name
export function generateEmail(name: string): string {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .filter(Boolean);

  const domains = ['email.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
  const domain = pickRandom(domains);

  const formats = [
    () => `${cleanName[0]}.${cleanName[cleanName.length - 1]}@${domain}`,
    () => `${cleanName[0]}${cleanName[cleanName.length - 1]}@${domain}`,
    () => `${cleanName[cleanName.length - 1]}${randomInt(10, 99)}@${domain}`,
  ];

  return pickRandom(formats)();
}

// Common first and last names
export const FIRST_NAMES = [
  'Robert', 'Sarah', 'Michael', 'Jennifer', 'James', 'Lisa',
  'David', 'Maria', 'Carlos', 'Emily', 'Thomas', 'Amanda',
  'William', 'Jessica', 'Richard', 'Ashley', 'Joseph', 'Nicole',
  'Daniel', 'Elizabeth', 'Christopher', 'Stephanie', 'Andrew', 'Laura',
];

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller',
  'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
  'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
  'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker',
  'Chen', 'Patel', 'Kim', 'Nguyen', 'Santos', 'Mueller',
];

// Generate a random full name
export function generateName(): string {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
}

// Generate a couple name (e.g., "Robert & Sarah Smith")
export function generateCoupleName(): string {
  const lastName = pickRandom(LAST_NAMES);
  const firstName1 = pickRandom(FIRST_NAMES);
  const firstName2 = pickRandom(FIRST_NAMES.filter(n => n !== firstName1));
  return `${firstName1} & ${firstName2} ${lastName}`;
}
