
export interface ColorTemperature {
  id: string;
  kelvin: string;
  color: string;
  description: string;
  prompt?: string;
}

export interface FixturePricing {
  id: string;
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'transformer' | 'coredrill' | 'well' | 'holiday';
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
  image: string | null;           // Generated/AI image (backwards compatible)
  originalImage?: string | null;  // Original uploaded photo before AI generation
  images?: ProjectImage[];        // Multiple images support
  quote: QuoteData | null;
  bom: BOMData | null;
  status: ProjectStatus;
  schedule?: ScheduleData;
  invoicePaidAt?: string;         // ISO date when invoice was paid via Stripe
  assignedTo?: string[];          // Array of user IDs assigned to this project
  assignedTechnicianId?: string;  // ID of technician assigned to this project
  location_id?: string;           // ID of location this project belongs to
  invoice_sent_at?: string;       // ISO date when invoice was sent
  actual_hours?: number;          // Actual hours spent on project (for technician tracking)
  clientId?: string;              // ID of client this project belongs to
  clientName?: string;            // Client name (denormalized for display)
  notes?: string;                 // Project notes
  internalNotes?: string;         // Internal team notes - NEVER shared with clients
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
  fixtureType: 'up' | 'path' | 'gutter' | 'soffit' | 'hardscape' | 'coredrill' | 'well' | 'holiday' | 'custom';
  brand: string;              // User's preferred brand
  sku: string;                // User's SKU
  wattage: number;            // Actual wattage of their fixture
  customName?: string;        // Custom fixture type name (for custom types)
  id?: string;                // Unique ID for custom entries
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
export type EventType = 'consultation' | 'meeting' | 'site-visit' | 'follow-up' | 'service-call' | 'personal' | 'other';

export type RecurrencePattern = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually';

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
  clientId?: string;         // Link to client for service calls
  projectId?: string;        // Link to project for service calls
  color?: string;            // Custom color for the event
  // Recurrence fields for service scheduling
  recurrence?: RecurrencePattern;
  recurrenceEndDate?: string;  // ISO date - when recurrence ends (optional, null = indefinite)
  recurrenceCount?: number;    // Number of occurrences (alternative to end date)
  parentEventId?: string;      // For recurring events, link to parent
  isRecurringInstance?: boolean; // True if this is a generated recurring instance
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

// === PROPERTY ANALYSIS TYPES (Auto-Prompt Feature) ===
export interface PropertyArchitecture {
  story_count: 1 | 2 | 3;
  wall_height_estimate: '8-12ft' | '18-25ft' | '25+ft';
  facade_materials: ('brick' | 'siding' | 'stone' | 'stucco' | 'wood' | 'vinyl')[];
  windows: {
    first_floor_count: number;
    second_floor_count: number;
    positions: string;
  };
  columns: { present: boolean; count: number };
  dormers: { present: boolean; count: number };
  gables: { present: boolean; count: number };
  entryway: {
    type: 'single' | 'double' | 'grand';
    has_overhang: boolean;
  };
}

export interface PropertyLandscaping {
  trees: {
    count: number;
    sizes: ('small' | 'medium' | 'large')[];
    positions?: string;  // Optional: description of tree locations
  };
  planting_beds: {
    present: boolean;
    locations: string[];
  };
}

export interface PropertyHardscape {
  driveway: {
    present: boolean;
    width_estimate: 'narrow' | 'standard' | 'wide';
    position?: 'left' | 'right' | 'center';  // Optional: driveway position
  };
  walkway: {
    present: boolean;
    length_estimate: 'short' | 'medium' | 'long';
    style: 'straight' | 'curved';
    description?: string;  // Optional: detailed walkway description
  };
  patio: { present: boolean };
  sidewalk: { present: boolean };
}

export interface PropertyRecommendations {
  optimal_intensity: 'subtle' | 'moderate' | 'bright' | 'high_power';
  optimal_beam_angle: 15 | 30 | 45 | 60;
  fixture_counts: Record<string, number>;
  fixture_positions?: Record<string, string[]>;  // Optional: AI-suggested positions
  priority_areas: string[];
  notes: string;
}

export interface PropertyAnalysis {
  architecture: PropertyArchitecture;
  landscaping: PropertyLandscaping;
  hardscape: PropertyHardscape;
  recommendations: PropertyRecommendations;
}

// === SPATIAL MAPPING TYPES (Smart Fixture Placement) ===
export interface FeatureLocation {
  id: string;                    // "window_1", "tree_left", "entry_door"
  type: 'window' | 'door' | 'column' | 'tree' | 'corner' | 'dormer' | 'gable' | 'garage';
  horizontalPosition: number;    // 0-100 (% from left edge of facade)
  width?: number;                // Feature width as % of facade
  label: string;                 // "First window from left"
}

export interface SpatialFixturePlacement {
  id: string;                    // "uplight_siding_1"
  fixtureType: string;           // "up", "path", "gutter"
  subOption: string;             // "siding", "windows", "dormers"
  horizontalPosition: number;    // 0-100 (% from left edge)
  anchor: string;                // "right_of corner_left" or "below window_1"
  description: string;           // Human-readable: "At far LEFT corner, in landscaping bed"
}

export interface SpatialMap {
  features: FeatureLocation[];
  placements: SpatialFixturePlacement[];
}

export interface OptimizedPromptData {
  intensity: number;
  beamAngle: number;
  userInstructions: string;
  analysisContext: string;
}

export interface FixtureSelections {
  fixtures: string[];
  subOptions: Record<string, string[]>;
  counts?: Record<string, number | null>;
  placementNotes?: Record<string, string>;
}

// === LIGHTING PLAN TYPES (Stage 2 of 4-Stage Pipeline) ===
export interface FixturePlacement {
  fixtureType: string;
  subOption: string;
  count: number;
  positions: string[];  // e.g., ["left of window 1", "between windows 2-3"]
  spacing: string;      // e.g., "6-8 feet apart"
  // Spatial coordinates from spatialMap for precise positioning
  spatialPositions?: Array<{
    horizontalPosition: number;  // 0-100 percentage from left
    anchor?: string;             // e.g., "below window_1", "right_of corner_left"
  }>;
}

export interface LightingSettings {
  intensity: number;
  beamAngle: number;
  reasoning: string;  // e.g., "65% intensity for 2-story walls"
}

export interface LightingPlan {
  placements: FixturePlacement[];
  settings: LightingSettings;
  priorityOrder: string[];  // Order of importance for lighting
}

export interface SettingsSnapshot {
  selectedFixtures?: string[];
  fixtureSubOptions?: Record<string, string[]>;
  colorTemperature?: string;
  lightIntensity?: number;
  beamAngle?: number;
  userPrompt?: string;
  /** Lighting style preset ID */
  lightingStyleId?: string;
  /** Lighting style overrides */
  lightingStyleOverrides?: {
    colorTemp?: number;
    intensity?: number;
    contrast?: 'low' | 'medium' | 'high';
  };
}

// === LIGHTING STYLE PRESET TYPES ===
export interface LightingStylePresetSummary {
  id: string;
  name: string;
  description: string;
  colorTemp: number;
  intensity: number;
  contrast: 'low' | 'medium' | 'high';
}

export interface UserLightingPreferences {
  defaultStyleId: string;
  savedOverrides: Record<string, {
    colorTemp?: number;
    intensity?: number;
    contrast?: 'low' | 'medium' | 'high';
  }>;
  favoriteStyles: string[];
  lastUsedStyleId?: string;
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
  leadSource?: LeadSource;
  marketingCost?: number;
  // Geocoding fields for route optimization
  latitude?: number;
  longitude?: number;
  geocodedAt?: string;
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

// === BUSINESS GOALS & ANALYTICS TYPES ===
export type GoalType = 'revenue' | 'projects_completed' | 'new_clients';
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';
export type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

export interface BusinessGoal {
  id: string;
  goalType: GoalType;
  periodType: PeriodType;
  targetValue: number;
  year: number;
  month?: number;      // 1-12 for monthly goals
  quarter?: number;    // 1-4 for quarterly goals
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goal: BusinessGoal;
  currentValue: number;
  progress: number;    // 0-100 percentage
  daysRemaining: number;
  onTrack: boolean;    // Green = on track, Yellow = behind, Red = at risk
}

export interface DailyMetrics {
  date: string;
  scheduledJobs: number;
  completedJobs: number;
  revenueCollected: number;
  followUpsDue: number;
  activeProjects: number;
}

export interface WeeklyMetrics {
  weekStart: string;
  weekEnd: string;
  jobsCompleted: number;
  revenueCollected: number;
  quotesSent: number;
  quotesApproved: number;
  newClients: number;
  comparisonToLastWeek: {
    revenue: number;      // percentage change
    jobs: number;
  };
}

export interface MonthlyMetrics {
  month: number;
  year: number;
  revenueActual: number;
  revenueTarget: number;
  revenueProgress: number;
  projectsCompleted: number;
  projectsTarget: number;
  avgProjectValue: number;
  newClients: number;
  newClientsTarget: number;
  conversionRate: number;
  outstandingReceivables: number;
}

export interface YearlyMetrics {
  year: number;
  revenueByMonth: { month: string; revenue: number; target?: number }[];
  yearToDateRevenue: number;
  yearToDateTarget: number;
  totalProjects: number;
  totalClients: number;
  avgMonthlyRevenue: number;
  bestMonth: { month: string; revenue: number };
  worstMonth: { month: string; revenue: number };
  growthRate?: number;
}

// ============================================
// MULTI-LOCATION & EXECUTIVE ANALYTICS TYPES
// ============================================

export interface Location {
  id: string;
  name: string;
  address?: string;
  managerName?: string;
  managerEmail?: string;
  isActive: boolean;
  // Geocoding fields for route optimization
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export type TechnicianRole = 'lead' | 'technician' | 'apprentice';

export interface TechnicianCertification {
  id: string;
  name: string;
  issuedBy?: string;
  issueDate: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface Technician {
  id: string;
  locationId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: TechnicianRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Phase 4: Skills and expertise tracking
  skills?: string[];
  certifications?: TechnicianCertification[];
  notes?: string;
  hourlyRate?: number;
  // Home location for route optimization (starting point)
  homeAddress?: string;
  homeLatitude?: number;
  homeLongitude?: number;
}

export type LeadSource = 'google' | 'referral' | 'angi' | 'thumbtack' | 'website' | 'social' | 'yard_sign' | 'other';

export interface LocationMetrics {
  locationId: string;
  locationName: string;
  revenue: number;
  revenueTarget?: number;
  revenueProgress: number;
  jobsCompleted: number;
  activeProjects: number;
  avgTicket: number;
  conversionRate: number;
  outstandingAR: number;
  trend: number; // % change vs previous period
  rank: number;
}

export interface TechnicianMetrics {
  technicianId: string;
  name: string;
  locationId?: string;
  locationName?: string;
  jobsCompleted: number;
  avgJobTime: number; // hours
  revenue: number;
  efficiency: number; // billable hours / total hours (0-100)
  potentialUtilization: number; // 1-100 score representing how much of their potential is being used
  callbacks: number;
  rank: number;
}

export interface ARAgingBuckets {
  current: number;    // 0-30 days
  days30: number;     // 31-60 days
  days60: number;     // 61-90 days
  days90Plus: number; // 90+ days
}

export interface CompanyMetrics {
  totalRevenue: number;
  totalRevenueYTD: number;
  yoyGrowth: number;
  totalJobsCompleted: number;
  totalActiveProjects: number;
  totalQuotesPending: number;
  totalOutstandingAR: number;
  arAgingBuckets: ARAgingBuckets;
  companyConversionRate: number;
  avgProjectValue: number;
  locationCount: number;
  technicianCount: number;
}

export type AlertType = 'warning' | 'success' | 'info' | 'danger';

export interface SmartAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  locationId?: string;
  locationName?: string;
  metric: string;
  value: number;
  threshold?: number;
  createdAt: string;
  isRead: boolean;
}

// ============================================
// MULTI-USER ORGANIZATION & ROLE TYPES
// ============================================

export type OrganizationRole = 'owner' | 'admin' | 'salesperson' | 'technician' | 'lead_technician';

export interface Organization {
  id: string;
  name: string;
  ownerUserId: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  locationId?: string;        // NULL = all locations access
  invitedBy?: string;
  invitedAt: string;
  acceptedAt?: string;
  isActive: boolean;
  createdAt: string;
  // Joined fields (from user)
  userName?: string;
  userEmail?: string;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: Exclude<OrganizationRole, 'owner'>; // Can't invite as owner
  locationId?: string;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  // Joined fields
  invitedByName?: string;
  organizationName?: string;
}

export type ProjectAssignmentRole = 'owner' | 'salesperson' | 'technician';

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectAssignmentRole;
  assignedBy?: string;
  assignedAt: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
}

export interface ClientAssignment {
  id: string;
  clientId: string;
  userId: string;
  isPrimary: boolean;
  assignedAt: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
}

// Role-based permission helpers
export interface RolePermissions {
  canViewAllProjects: boolean;
  canViewAllClients: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canViewPricing: boolean;
  canCreateQuotes: boolean;
  canEditQuotes: boolean;
  canViewInvoices: boolean;
  canCreateInvoices: boolean;
  canViewAnalytics: boolean;
  canViewExecutiveDashboard: boolean;
  canManageTeam: boolean;
  canManageBilling: boolean;
  canManageSettings: boolean;
  canManageLocations: boolean;
  canManageTechnicians: boolean;
  canAssignProjects: boolean;
  canAssignClients: boolean;
  canMarkJobsComplete: boolean;
  canViewOwnScheduleOnly: boolean;
}

// Define permissions per role
export const ROLE_PERMISSIONS: Record<OrganizationRole, RolePermissions> = {
  owner: {
    canViewAllProjects: true,
    canViewAllClients: true,
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canViewPricing: true,
    canCreateQuotes: true,
    canEditQuotes: true,
    canViewInvoices: true,
    canCreateInvoices: true,
    canViewAnalytics: true,
    canViewExecutiveDashboard: true,
    canManageTeam: true,
    canManageBilling: true,
    canManageSettings: true,
    canManageLocations: true,
    canManageTechnicians: true,
    canAssignProjects: true,
    canAssignClients: true,
    canMarkJobsComplete: true,
    canViewOwnScheduleOnly: false,
  },
  admin: {
    canViewAllProjects: true,
    canViewAllClients: true,
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canViewPricing: true,
    canCreateQuotes: true,
    canEditQuotes: true,
    canViewInvoices: true,
    canCreateInvoices: true,
    canViewAnalytics: true,
    canViewExecutiveDashboard: false,
    canManageTeam: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageLocations: false,
    canManageTechnicians: true,
    canAssignProjects: true,
    canAssignClients: true,
    canMarkJobsComplete: true,
    canViewOwnScheduleOnly: false,
  },
  salesperson: {
    canViewAllProjects: false,
    canViewAllClients: false,
    canCreateProjects: true,
    canEditProjects: true,  // Only their own
    canDeleteProjects: false,
    canViewPricing: true,
    canCreateQuotes: true,
    canEditQuotes: true,    // Only their own
    canViewInvoices: false, // View-only for their projects
    canCreateInvoices: false,
    canViewAnalytics: false,
    canViewExecutiveDashboard: false,
    canManageTeam: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageLocations: false,
    canManageTechnicians: false,
    canAssignProjects: false,
    canAssignClients: false,
    canMarkJobsComplete: false,
    canViewOwnScheduleOnly: true,
  },
  lead_technician: {
    canViewAllProjects: false,
    canViewAllClients: false,
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewPricing: false,
    canCreateQuotes: false,
    canEditQuotes: false,
    canViewInvoices: false,
    canCreateInvoices: false,
    canViewAnalytics: false,  // Location-level only
    canViewExecutiveDashboard: false,
    canManageTeam: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageLocations: false,
    canManageTechnicians: false,  // View only
    canAssignProjects: true,      // Can assign to their crew
    canAssignClients: false,
    canMarkJobsComplete: true,
    canViewOwnScheduleOnly: false, // Can see crew schedule
  },
  technician: {
    canViewAllProjects: false,
    canViewAllClients: false,
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewPricing: false,
    canCreateQuotes: false,
    canEditQuotes: false,
    canViewInvoices: false,
    canCreateInvoices: false,
    canViewAnalytics: false,
    canViewExecutiveDashboard: false,
    canManageTeam: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageLocations: false,
    canManageTechnicians: false,
    canAssignProjects: false,
    canAssignClients: false,
    canMarkJobsComplete: true,
    canViewOwnScheduleOnly: true,
  },
};

// Date Range Types for Analytics
export type DateRange = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

export interface DateRangeFilter {
  start: Date;
  end: Date;
  label: string;
}

// === CLIENT PORTAL TYPES ===
export interface ClientPortalSession {
  token: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  companyLogo: string | null;
  expires: string;
}

export interface ClientPortalProject {
  id: string;
  name: string;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  totalPrice: number | null;
  quote: {
    sentAt: string | null;
    approvedAt: string | null;
    token: string | null;
  };
  invoice: {
    sentAt: string | null;
    paidAt: string | null;
    token: string | null;
  };
}

export interface ClientPortalData {
  projects: ClientPortalProject[];
  summary: {
    totalProjects: number;
    pendingQuotes: number;
    approvedProjects: number;
    pendingInvoices: number;
    paidInvoices: number;
  };
}

// === LEAD SOURCE ROI TRACKING TYPES ===
export interface LeadSourceROI {
  source: LeadSource;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  totalMarketingCost: number;
  roi: number;
  averageProjectValue: number;
  costPerLead: number;
  costPerAcquisition: number;
}

export interface LeadSourceMetrics {
  bySource: LeadSourceROI[];
  topPerformingSource: LeadSource;
  lowestCostPerAcquisition: LeadSource;
  totalMarketingSpend: number;
  totalRevenueFromTracked: number;
  overallROI: number;
}

// === CASH FLOW FORECASTING TYPES ===
export interface CashFlowProjection {
  period: string;              // Week start date (ISO format)
  expectedInflow: number;
  expectedOutflow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DSOMetrics {
  currentDSO: number;          // Days Sales Outstanding
  averageDSO: number;
  trend: 'improving' | 'stable' | 'worsening';
  dsoByMonth: { month: string; dso: number }[];
}

export interface PaymentPatternAnalysis {
  averagePaymentDelay: number;
  medianPaymentDelay: number;
  percentPaidOnTime: number;     // ≤30 days
  percentPaid30Days: number;     // 31-60 days
  percentPaid60Days: number;     // 61-90 days
  percentPaid90Plus: number;     // 90+ days
}

export interface CashFlowForecast {
  projections30Day: CashFlowProjection[];
  projections60Day: CashFlowProjection[];
  projections90Day: CashFlowProjection[];
  dsoMetrics: DSOMetrics;
  paymentPatterns: PaymentPatternAnalysis;
  totalOutstandingAR: number;
  projectedCollections30Day: number;
  projectedCollections60Day: number;
  projectedCollections90Day: number;
}

// === ROUTE OPTIMIZATION TYPES ===
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface RouteJob {
  projectId: string;
  projectName: string;
  clientName: string;
  location: GeoCoordinates;
  address: string;
  timeWindow?: { start: string; end: string };
  duration: number; // Estimated job duration in minutes
  timeSlot?: TimeSlot;
  customTime?: string;
}

export interface RouteRequest {
  technicianId: string;
  technicianName: string;
  startLocation: GeoCoordinates;
  startAddress: string;
  jobs: RouteJob[];
  constraints?: {
    maxDrivingTime?: number; // Max driving time in minutes
    returnToStart?: boolean; // Return to home base at end
    avoidTolls?: boolean;
    workingHoursStart?: string; // "08:00"
    workingHoursEnd?: string;   // "17:00"
  };
}

export interface RouteStop {
  order: number;
  projectId: string;
  projectName: string;
  clientName: string;
  address: string;
  location: GeoCoordinates;
  arrivalTime: string;      // ISO datetime
  departureTime: string;    // ISO datetime
  jobDuration: number;      // minutes
  drivingTimeFromPrevious: number;  // seconds
  distanceFromPrevious: number;     // meters
}

export interface OptimizedRoute {
  id?: string;
  technicianId: string;
  technicianName: string;
  planDate: string;         // ISO date
  startLocation: GeoCoordinates;
  startAddress: string;
  totalDistance: number;    // meters
  totalDuration: number;    // seconds (includes driving + job time)
  totalDrivingTime: number; // seconds (driving only)
  totalJobTime: number;     // seconds (work time only)
  stops: RouteStop[];
  returnToStart: boolean;
  returnArrivalTime?: string;
  leaveTime?: string;       // ISO datetime - when to leave to arrive 15 min early
  polyline?: string;        // Encoded route for map display
  createdAt: string;
}

export interface RoutePlanSummary {
  technicianId: string;
  technicianName: string;
  planDate: string;
  jobCount: number;
  totalDrivingMinutes: number;
  totalWorkHours: number;
  firstJobTime: string;
  lastJobEndTime: string;
}
