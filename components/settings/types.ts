import { CompanyProfile, FixturePricing, FixtureCatalogItem, AccentColor, FontSize, NotificationPreferences, CustomPricingItem, BusinessGoal, Location, Technician } from '../../types';

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  plan: string | null;
  remainingFreeGenerations: number;
  freeTrialLimit: number;
  generationCount: number;
  monthlyLimit?: number;
}

export interface FollowUpSettings {
  quoteReminderDays: number;       // Days after quote sent to send reminder
  quoteExpiringDays: number;       // Days before expiry to warn
  invoiceReminderDays: number;     // Days after invoice sent to remind
  invoiceOverdueDays: number;      // Days after due date to send overdue notice
  preInstallationDays: number;     // Days before scheduled date to remind
  enableQuoteReminders: boolean;
  enableInvoiceReminders: boolean;
  enablePreInstallReminders: boolean;
  enableSmsForOverdue: boolean;    // Send SMS for overdue invoices
  // Google Review settings
  googleReviewUrl: string;         // Business's Google Review URL
  enableReviewRequests: boolean;   // Enable/disable review request emails
  reviewRequestDays: number;       // Days after completion to send review request
}

export interface SettingsViewProps {
  profile?: CompanyProfile;
  onProfileChange?: (profile: CompanyProfile) => void;
  colorTemp?: string;
  onColorTempChange?: (tempId: string) => void;
  lightIntensity?: number;
  onLightIntensityChange?: (val: number) => void;
  darknessLevel?: number;
  onDarknessLevelChange?: (val: number) => void;
  beamAngle?: number;
  onBeamAngleChange?: (angle: number) => void;
  pricing?: FixturePricing[];
  onPricingChange?: (pricing: FixturePricing[]) => void;
  customPricing?: CustomPricingItem[];
  onCustomPricingChange?: (items: CustomPricingItem[]) => void;
  fixtureCatalog?: FixtureCatalogItem[];
  onFixtureCatalogChange?: (catalog: FixtureCatalogItem[]) => void;
  subscription?: SubscriptionInfo;
  userId?: string;
  onRequestUpgrade?: () => void;
  // Theme props
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  accentColor?: AccentColor;
  onAccentColorChange?: (color: AccentColor) => void;
  fontSize?: FontSize;
  onFontSizeChange?: (size: FontSize) => void;
  highContrast?: boolean;
  onHighContrastChange?: (enabled: boolean) => void;
  // Before/After comparison feature
  enableBeforeAfter?: boolean;
  onEnableBeforeAfterChange?: (enabled: boolean) => void;
  // Notification props
  notifications?: NotificationPreferences;
  onNotificationsChange?: (prefs: NotificationPreferences) => void;
  // Follow-up settings
  followUpSettings?: FollowUpSettings;
  onFollowUpSettingsChange?: (settings: FollowUpSettings) => void;
  // Business goals
  businessGoals?: BusinessGoal[];
  onBusinessGoalChange?: (goal: Omit<BusinessGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  // Sign out
  onSignOut?: () => void;
  // Save all settings
  onSaveSettings?: () => void;
  isSaving?: boolean;
  // Portal management
  onManageSubscription?: () => void;
  isLoadingPortal?: boolean;
  // Locations
  locations?: Location[];
  locationsLoading?: boolean;
  onCreateLocation?: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Location | null>;
  onUpdateLocation?: (id: string, updates: Partial<Location>) => Promise<Location | null>;
  onDeleteLocation?: (id: string) => Promise<boolean>;
  // Location switcher state
  selectedLocationId?: string | null;
  onLocationChange?: (locationId: string | null) => void;
  // Technicians
  technicians?: Technician[];
  techniciansLoading?: boolean;
  onCreateTechnician?: (technician: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Technician | null>;
  onUpdateTechnician?: (id: string, updates: Partial<Technician>) => Promise<Technician | null>;
  onDeleteTechnician?: (id: string) => Promise<boolean>;
  // Analytics data for goal progress
  currentMonthRevenue?: number;
  currentMonthProjects?: number;
  currentMonthClients?: number;
  currentQuarterRevenue?: number;
  currentQuarterProjects?: number;
  currentQuarterClients?: number;
  currentYearRevenue?: number;
  currentYearProjects?: number;
  currentYearClients?: number;
  // Analytics data
  analyticsMetrics?: any;
  leadSourceROI?: any;
  cashFlowForecast?: any;
  locationMetrics?: any;
  technicianMetrics?: any;
  companyMetrics?: any;
  // Analytics state
  analyticsDateRange?: { start: Date | null; end: Date | null };
  onAnalyticsDateRangeChange?: (range: { start: Date | null; end: Date | null }) => void;
  analyticsComparisonView?: boolean;
  onAnalyticsComparisonViewChange?: (enabled: boolean) => void;
  // Analytics actions
  onExportAnalytics?: (format: 'pdf' | 'csv') => void;
  // Advanced Analytics (formerly in Projects section)
  pipelineAnalytics?: {
    revenueThisMonth: number;
    pendingRevenue: number;
    overdueRevenue: number;
    avgQuoteValue: number;
    draftToQuotedRate: number;
    quotedToApprovedRate: number;
    approvedToCompletedRate: number;
  };
  businessHealthData?: any;
  pipelineForecastData?: any;
  teamPerformanceData?: any;
  capacityPlanningData?: any;
  onViewProject?: (projectId: string) => void;
}
