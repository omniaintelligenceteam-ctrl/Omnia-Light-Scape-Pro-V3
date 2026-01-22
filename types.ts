
export interface ColorTemperature {
  id: string;
  kelvin: string;
  color: string;
  description: string;
  prompt?: string;
}

export interface FixturePricing {
  id: string;
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'transformer' | 'coredrill';
  name: string;
  description: string;
  unitPrice: number;
}

export interface QuickPrompt {
  label: string;
  text: string;
}

export interface Project {
  name: string;
  selectedPrompt: string;
}

export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ClientDetails {
    name: string;
    email: string;
    phone: string;
    address: string;
}

export interface CompanyProfile {
    name: string;
    email: string;
    phone?: string;
    address: string;
    logo: string | null;
}

export interface CustomPricingItem {
  id: string;
  name: string;
  unitPrice: number;
  description?: string;
}

export interface QuoteData {
  lineItems: LineItem[];
  taxRate: number;
  discount?: number;
  clientDetails: ClientDetails;
  total: number;
}

export type ProjectStatus = 'draft' | 'quoted' | 'approved' | 'scheduled' | 'completed';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'custom';

export interface ScheduleData {
  scheduledDate: string;       // ISO date "2024-01-15"
  timeSlot: TimeSlot;
  customTime?: string;         // "09:00" if timeSlot is 'custom'
  estimatedDuration: number;   // Hours (default: 2)
  installationNotes?: string;  // Gate codes, parking, access info
  completionNotes?: string;    // Notes added when marking complete
}

export interface ProjectImage {
  id: string;
  url: string;
  label?: string;        // e.g., "Front Yard", "Backyard", "Patio"
  createdAt: string;
}

export interface SavedProject {
  id: string;
  name: string;
  date: string;
  image: string | null;           // Primary image (backwards compatible)
  images?: ProjectImage[];        // Multiple images support
  quote: QuoteData | null;
  bom: BOMData | null;
  status: ProjectStatus;
  schedule?: ScheduleData;
}

export type SubscriptionPlan = 'pro_monthly' | 'pro_yearly';

// BOM (Bill of Materials) Types
export interface BOMFixture {
  id: string;
  category: string;           // 'up', 'path', 'gutter', etc.
  name: string;               // Display name
  quantity: number;
  wattage: number;            // Per fixture wattage
  totalWattage: number;       // quantity * wattage
  sku?: string;               // Optional brand SKU
  brand?: string;             // e.g., 'FX Luminaire', 'Kichler'
}

export interface BOMData {
  fixtures: BOMFixture[];
  totalWattage: number;
  totalFixtures: number;
  recommendedTransformer: {
    name: string;             // e.g., '300W Transformer'
    watts: number;            // e.g., 300
    loadPercentage: number;   // e.g., 40 (meaning 40% capacity used)
  };
  wireEstimate: {
    gauge: string;            // '12/2', '10/2'
    footage: number;
    runsNeeded: number;
  };
  generatedAt: string;
}

export interface FixtureCatalogItem {
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'coredrill';
  brand: string;              // User's preferred brand
  sku: string;                // User's SKU
  wattage: number;            // Actual wattage of their fixture
}

// Invoice Types
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  id: string;
  projectId: string;
  projectName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientDetails: ClientDetails;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  paidDate?: string;
}

// === THEME TYPES ===
export type AccentColor = 'gold' | 'blue' | 'purple' | 'green' | 'red';

export type FontSize = 'compact' | 'normal' | 'comfortable';

export interface ThemePreferences {
  theme: 'light' | 'dark';
  accentColor: AccentColor;
  fontSize: FontSize;
  highContrast: boolean;
}

// === NOTIFICATION TYPES ===
export interface NotificationPreferences {
  emailProjectUpdates: boolean;
  emailQuoteReminders: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  soundEffects: boolean;
}

// === CALENDAR EVENT TYPES ===
export type EventType = 'consultation' | 'meeting' | 'site-visit' | 'follow-up' | 'personal' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: EventType;
  date: string;              // ISO date "2024-01-15"
  timeSlot: TimeSlot;
  customTime?: string;       // "09:00" if timeSlot is 'custom'
  duration: number;          // Hours
  location?: string;
  notes?: string;
  clientName?: string;
  clientPhone?: string;
  color?: string;            // Custom color for the event
  createdAt: string;
}

// === USER PREFERENCES TYPES (AI Learning) ===
export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_fixture_ratio: Record<string, number>;
  preferred_color_temp: string;
  preferred_intensity_range: { min: number; max: number };
  preferred_beam_angle_range: { min: number; max: number };
  style_keywords: string[];
  avoid_keywords: string[];
  total_liked: number;
  total_disliked: number;
  total_saved: number;
  created_at: string;
  updated_at: string;
}

export interface SettingsSnapshot {
  selectedFixtures?: string[];
  fixtureSubOptions?: Record<string, string[]>;
  colorTemperature?: string;
  lightIntensity?: number;
  beamAngle?: number;
  userPrompt?: string;
}

export interface GenerationFeedback {
  id: string;
  user_id: string;
  project_id?: string;
  rating: 'liked' | 'disliked' | 'saved';
  feedback_text?: string;
  settings_snapshot: SettingsSnapshot;
  generated_image_url?: string;
  created_at: string;
}

// === CLIENT MANAGEMENT TYPES ===
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  projectCount?: number;
  totalRevenue?: number;
  createdAt: string;
  updatedAt: string;
}

// === INVOICE TRACKING TYPES ===
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceTracking {
  id: string;
  projectId: string;
  projectName: string;
  clientId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  paidDate?: string;
  sentAt?: string;
  clientDetails: ClientDetails;
  createdAt: string;
}
