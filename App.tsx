import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { ImageUpload } from './components/ImageUpload';
import { QuoteView } from './components/QuoteView';
import { SettingsView } from './components/settings';
import AuthWrapper from './components/AuthWrapper';
import { InventoryView } from './components/InventoryView';
import { ScheduleView } from './components/ScheduleView';
import { BOMView } from './components/BOMView';
import { Pricing } from './components/Pricing';
import { BillingSuccess } from './components/BillingSuccess';
import { BillingCanceled } from './components/BillingCanceled';
import { ClientPortal } from './components/ClientPortal';
import { generateBOM } from './utils/bomCalculator';
import { detectConflicts, ConflictResult, formatTimeSlot } from './utils/scheduleConflictDetection';
import { useUserSync } from './hooks/useUserSync';
import { useProjects } from './hooks/useProjects';
import { useSubscription } from './hooks/useSubscription';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useClients, parseClientCSV, ParsedClientRow, ImportResult } from './hooks/useClients';
import { useBusinessGoals } from './hooks/useBusinessGoals';
import { useAnalytics } from './hooks/useAnalytics';
import { useLeadSourceROI } from './hooks/useLeadSourceROI';
import { useCashFlowForecast } from './hooks/useCashFlowForecast';
import { useBusinessHealthScore } from './hooks/useBusinessHealthScore';
import { usePipelineForecast } from './hooks/usePipelineForecast';
import { useTeamPerformance } from './hooks/useTeamPerformance';
import { useCapacityPlanning } from './hooks/useCapacityPlanning';
import { AnalyticsDashboard, ExecutiveDashboard, BusinessHealthScore, PipelineForecast, TeamPerformanceMatrix, CapacityDashboard } from './components/analytics';
import { LeadSourceROIDashboard } from './components/analytics/LeadSourceROIDashboard';
import { CashFlowDashboard } from './components/analytics/CashFlowDashboard';
import { ExportMenu } from './components/reports/ExportMenu';
import { DateRangePickerAdvanced, DateRangeValue } from './components/reports/DateRangePickerAdvanced';
import { ComparisonView, ComparisonData } from './components/reports/ComparisonView';
import { useLocations } from './hooks/useLocations';
import { useTechnicians } from './hooks/useTechnicians';
import { useLocationMetrics } from './hooks/useLocationMetrics';
import { useTechnicianMetrics } from './hooks/useTechnicianMetrics';
import { useCompanyMetrics } from './hooks/useCompanyMetrics';
import { useOrganization } from './hooks/useOrganization';
import { useTeamMembers } from './hooks/useTeamMembers';
import { TechnicianDashboard } from './components/TechnicianDashboard';
import { AssignmentDropdown } from './components/AssignmentDropdown';
import { SaveImageModal } from './components/SaveImageModal';
import { AcceptInvite } from './components/AcceptInvite';
import { KanbanBoard } from './components/pipeline';
import { useToast } from './components/Toast';
import { fileToBase64, getPreviewUrl } from './utils';
import { generateNightScene } from './services/geminiService';
import { Loader2, FolderPlus, FileText, Maximize2, Trash2, Search, ArrowUpRight, Sparkles, AlertCircle, AlertTriangle, Wand2, ThumbsUp, ThumbsDown, X, RefreshCw, Image as ImageIcon, Check, CheckCircle2, Receipt, Calendar, CalendarDays, Download, Plus, Minus, Undo2, ClipboardList, Package, Phone, MapPin, User, Clock, ChevronRight, ChevronLeft, ChevronDown, Sun, Settings2, Mail, Users, Edit, Edit3, Save, Upload, Share2, Link2, Copy, ExternalLink, LayoutGrid, Columns, Building2 } from 'lucide-react';
import { FIXTURE_TYPES, COLOR_TEMPERATURES, DEFAULT_PRICING, SYSTEM_PROMPT } from './constants';
import { SavedProject, QuoteData, CompanyProfile, FixturePricing, BOMData, FixtureCatalogItem, InvoiceData, InvoiceLineItem, LineItem, ProjectStatus, AccentColor, FontSize, NotificationPreferences, ScheduleData, TimeSlot, CalendarEvent, EventType, RecurrencePattern, CustomPricingItem, ProjectImage, UserPreferences, SettingsSnapshot, Client, LeadSource } from './types';

// Helper to parse fixture quantities from text (custom notes)
const parsePromptForQuantities = (text: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    const t = text.toLowerCase();

    // Mapping patterns to DEFAULT_PRICING IDs
    const patterns = [
       { id: 'default_up', regex: /(\d+)\s*(?:x\s*)?(?:up|accent)/ },
       { id: 'default_path', regex: /(\d+)\s*(?:x\s*)?(?:path|walk)/ },
       { id: 'default_gutter', regex: /(\d+)\s*(?:x\s*)?(?:gutter|roof)/ },
       { id: 'default_soffit', regex: /(\d+)\s*(?:x\s*)?(?:soffit|down|eave|can)/ },
       { id: 'default_hardscape', regex: /(\d+)\s*(?:x\s*)?(?:hardscape|wall|step|tread)/ },
       { id: 'default_coredrill', regex: /(\d+)\s*(?:x\s*)?(?:core|drill|in-grade|well)/ }
    ];

    patterns.forEach(p => {
       const match = t.match(p.regex);
       if (match) {
           counts[p.id] = parseInt(match[1], 10);
       }
    });

    return counts;
};

// Estimate fixture counts based on selected sub-options
// Each sub-option represents a specific placement area that typically requires a certain number of fixtures
const estimateCountsFromSubOptions = (
    selectedFixtures: string[],
    fixtureSubOptions: Record<string, string[]>
): Record<string, number> => {
    const estimates: Record<string, number> = {};

    // Sub-option multipliers - how many fixtures each sub-option typically requires
    const subOptionCounts: Record<string, Record<string, number>> = {
        'up': {
            'siding': 8,      // Wall piers between windows
            'windows': 6,     // First story windows
            'entryway': 2,    // Flanking entry door
            'columns': 4,     // Architectural columns
            'trees': 3        // Trees in landscape
        },
        'path': {
            'pathway': 6,     // Walkway lights
            'driveway': 8,    // Driveway edge lights
            'landscaping': 4  // Garden bed lights
        },
        'coredrill': {
            'garage_sides': 3,  // Piers flanking garage
            'garage_door': 2,   // Door face wash
            'sidewalks': 6,     // Embedded path markers
            'driveway': 8       // Driveway edge markers
        },
        'gutter': {
            'dormers': 2,     // Dormer faces
            'peaks': 2        // Gable peaks
        },
        'soffit': {
            'windows': 6,     // Above windows
            'columns': 4,     // Above columns
            'siding': 6,      // Above wall piers
            'peaks': 2        // At gable peaks
        },
        'hardscape': {
            'columns': 4,     // Pillar cap lights
            'walls': 6,       // Retaining wall lights
            'steps': 4        // Step riser lights
        }
    };

    // For each selected fixture type, sum up counts based on selected sub-options
    selectedFixtures.forEach(fixtureId => {
        const subOpts = fixtureSubOptions[fixtureId] || [];
        const optionCounts = subOptionCounts[fixtureId] || {};

        let totalCount = 0;
        if (subOpts.length > 0) {
            // Sum counts for each selected sub-option
            subOpts.forEach(optId => {
                totalCount += optionCounts[optId] || 2; // Default 2 if not found
            });
        } else {
            // No sub-options selected, use a reasonable default
            const defaultCounts: Record<string, number> = {
                'up': 10, 'path': 6, 'gutter': 4, 'soffit': 6, 'hardscape': 6, 'coredrill': 4
            };
            totalCount = defaultCounts[fixtureId] || 4;
        }

        // Map fixture ID to pricing ID
        const pricingId = `default_${fixtureId}`;
        estimates[pricingId] = totalCount;
    });

    return estimates;
};

const App: React.FC = () => {
  // Get Clerk user and sync to database
  const { user } = useUser();
  const { signOut } = useClerk();
  useUserSync(); // Automatically sync user to Supabase on sign-in

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  // Toast notifications
  const { showToast } = useToast();

  // Subscription and usage tracking
  const subscription = useSubscription();

  // Load/save projects from Supabase
  const { projects, isLoading: projectsLoading, saveProject, deleteProject, updateProject, updateProjectStatus, scheduleProject, completeProject, addImageToProject, removeImageFromProject } = useProjects();

  // Load/save clients from Supabase
  const { clients, isLoading: clientsLoading, createClient, updateClient, deleteClient, searchClients, importClients } = useClients();

  // Load/save business goals from Supabase
  const { goals: businessGoals, createGoal, isLoading: goalsLoading } = useBusinessGoals();

  // Analytics calculated from projects, clients, and goals
  const analytics = useAnalytics({ projects, clients, goals: businessGoals });

  // Lead Source ROI metrics
  const leadSourceMetrics = useLeadSourceROI({ clients, projects });

  // Cash Flow forecasting metrics
  const cashFlowForecast = useCashFlowForecast({ projects });

  // Multi-location and technician management for executive dashboard
  const {
    locations,
    isLoading: locationsLoading,
    createLocation,
    updateLocation,
    deleteLocation
  } = useLocations();

  const {
    technicians,
    isLoading: techniciansLoading,
    createTechnician,
    updateTechnician,
    deleteTechnician
  } = useTechnicians();

  // Selected location filter - null means "All Locations"
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Filter projects by selected location
  const filteredProjectsByLocation = useMemo(() => {
    if (!selectedLocationId) return projects;
    return projects.filter(p => p.location_id === selectedLocationId);
  }, [projects, selectedLocationId]);

  // Filter technicians by selected location
  const filteredTechniciansByLocation = useMemo(() => {
    if (!selectedLocationId) return technicians;
    return technicians.filter(t => t.locationId === selectedLocationId);
  }, [technicians, selectedLocationId]);

  // Date range for Executive Dashboard
  const [dashboardDateRange, setDashboardDateRange] = useState<'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year'>('this_month');

  // Calculate real metrics for Executive Dashboard - use filtered data when location is selected
  const locationMetrics = useLocationMetrics(filteredProjectsByLocation, locations, dashboardDateRange);
  const technicianMetrics = useTechnicianMetrics(filteredProjectsByLocation, filteredTechniciansByLocation, locations, dashboardDateRange);
  const companyMetrics = useCompanyMetrics(locationMetrics, technicianMetrics, filteredProjectsByLocation, dashboardDateRange);

  // New Advanced Analytics Hooks
  const businessHealthData = useBusinessHealthScore({ projects, goals: businessGoals });
  const pipelineForecastData = usePipelineForecast({ projects });
  const teamPerformanceData = useTeamPerformance({ projects, technicians });
  const capacityPlanningData = useCapacityPlanning({ projects, technicians });

  // Calculate current metrics for goal tracking in Settings
  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentQuarterNum = Math.floor(currentDate.getMonth() / 3) + 1;
  const currentYearNum = currentDate.getFullYear();

  // Current month metrics
  const currentMonthRevenue = analytics.thisMonthMetrics?.revenueActual || 0;
  const currentMonthProjects = projects.filter(p =>
    p.status === 'completed' &&
    new Date(p.schedule?.scheduledDate || p.date).getMonth() + 1 === currentMonthNum &&
    new Date(p.schedule?.scheduledDate || p.date).getFullYear() === currentYearNum
  ).length;
  const currentMonthClients = clients.filter(c => {
    const createdDate = new Date(c.createdAt);
    return createdDate.getMonth() + 1 === currentMonthNum && createdDate.getFullYear() === currentYearNum;
  }).length;

  // Current quarter metrics
  const quarterStartMonth = (currentQuarterNum - 1) * 3;
  const quarterEndMonth = currentQuarterNum * 3;
  const currentQuarterRevenue = projects.filter(p => {
    if (!p.invoicePaidAt) return false;
    const paidDate = new Date(p.invoicePaidAt);
    const paidMonth = paidDate.getMonth() + 1;
    return paidDate.getFullYear() === currentYearNum &&
           paidMonth > quarterStartMonth &&
           paidMonth <= quarterEndMonth;
  }).reduce((sum, p) => sum + (p.quote?.total || 0), 0);

  const currentQuarterProjects = projects.filter(p => {
    const projectDate = new Date(p.schedule?.scheduledDate || p.date);
    const projectMonth = projectDate.getMonth() + 1;
    return p.status === 'completed' &&
           projectDate.getFullYear() === currentYearNum &&
           projectMonth > quarterStartMonth &&
           projectMonth <= quarterEndMonth;
  }).length;

  const currentQuarterClients = clients.filter(c => {
    const createdDate = new Date(c.createdAt);
    const createdMonth = createdDate.getMonth() + 1;
    return createdDate.getFullYear() === currentYearNum &&
           createdMonth > quarterStartMonth &&
           createdMonth <= quarterEndMonth;
  }).length;

  // Current year metrics
  const currentYearRevenue = analytics.thisYearMetrics?.yearToDateRevenue || 0;
  const currentYearProjects = projects.filter(p =>
    p.status === 'completed' &&
    new Date(p.schedule?.scheduledDate || p.date).getFullYear() === currentYearNum
  ).length;
  const currentYearClients = clients.filter(c =>
    new Date(c.createdAt).getFullYear() === currentYearNum
  ).length;

  // Organization and role management
  const { role, hasPermission } = useOrganization();

  // Team members for assignment dropdown
  const { members: teamMembers } = useTeamMembers();

  // Client management UI state
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showSaveImageModal, setShowSaveImageModal] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    leadSource: undefined as LeadSource | undefined,
    marketingCost: undefined as number | undefined
  });
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientImportModal, setShowClientImportModal] = useState(false);
  const [clientImportData, setClientImportData] = useState<{ valid: ParsedClientRow[]; invalid: ParsedClientRow[] } | null>(null);
  const [clientImportProgress, setClientImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [clientImportResult, setClientImportResult] = useState<ImportResult | null>(null);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all');

  // Rate limiting for generate button (prevent double-clicks)
  const lastGenerateTime = useRef<number>(0);
  const GENERATE_COOLDOWN_MS = 3000; // 3 seconds between generations

  const [activeTab, setActiveTab] = useState<string>('editor');
  const [tabDirection, setTabDirection] = useState<number>(0); // -1 for left, 1 for right

  // Tab order for determining swipe direction
  const tabOrder = ['editor', 'projects', 'schedule', 'settings'];

  // Custom tab change handler that tracks direction
  const handleTabChange = (newTab: string) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    setTabDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(newTab);
  };

  // Editor State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  
  // Strategy State
  const [selectedFixtures, setSelectedFixtures] = useState<string[]>([]);
  // Sub-Options State
  const [fixtureSubOptions, setFixtureSubOptions] = useState<Record<string, string[]>>({});

  // Favorite Presets State
  interface FixturePreset {
    id: string;
    name: string;
    selectedFixtures: string[];
    fixtureSubOptions: Record<string, string[]>;
    colorTemp: string;
    lightIntensity: number;
    beamAngle: number;
    createdAt: number;
  }
  const [fixturePresets, setFixturePresets] = useState<FixturePreset[]>(() => {
    try {
      const saved = localStorage.getItem('omnia_fixture_presets');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Modal Configuration State
  const [activeConfigFixture, setActiveConfigFixture] = useState<string | null>(null); // 'up', 'path', 'coredrill', 'gutter', 'soffit', 'hardscape' or null
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);

  // Lifted Setting State
  const [colorTemp, setColorTemp] = useState<string>('3000k');
  const [lightIntensity, setLightIntensity] = useState<number>(45);
  const [darknessLevel, setDarknessLevel] = useState<number>(85); // 0-100, higher = darker night sky
  const [beamAngle, setBeamAngle] = useState<number>(30);

  // Lifted Pricing State
  const [pricing, setPricing] = useState<FixturePricing[]>(DEFAULT_PRICING);
  const [customPricing, setCustomPricing] = useState<CustomPricingItem[]>([]);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationComplete, setGenerationComplete] = useState<boolean>(false);
  const [showLoadingCelebration, setShowLoadingCelebration] = useState<boolean>(false);
  const [showRipple, setShowRipple] = useState<boolean>(false);
  const [statusMessageIndex, setStatusMessageIndex] = useState<number>(0);
  const [ripplePosition, setRipplePosition] = useState<{x: number, y: number}>({x: 50, y: 50});

  // Generation History for Undo with Settings
  interface GenerationHistoryEntry {
    id: string;
    image: string;
    timestamp: number;
    settings?: {
      selectedFixtures: string[];
      fixtureSubOptions: Record<string, string[]>;
      colorTemp: string;
      lightIntensity: number;
      beamAngle: number;
      prompt?: string;
    };
  }
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryEntry[]>([]);

  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Feedback State
  const [lastUsedPrompt, setLastUsedPrompt] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isLiked, setIsLiked] = useState<boolean>(false);

  // AI Preference Learning State
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  // Project State (projects loaded from useProjects hook above)
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null); // Track which project is being edited
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

  // PDF Generation State for Projects Tab
  const [pdfProject, setPdfProject] = useState<SavedProject | null>(null);

  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: 'Omnia Light Scape Pro',
    email: 'omniaintelligenceteam@gmail.com',
    address: '123 Landscape Lane\nDesign District, CA 90210',
    logo: null
  });

  // BOM State
  const [currentBOM, setCurrentBOM] = useState<BOMData | null>(null);
  const [fixtureCatalog, setFixtureCatalog] = useState<FixtureCatalogItem[]>([]);

  // Projects Sub-Tab State - Simplified to 2 main views
  const [projectsSubTab, setProjectsSubTab] = useState<'pipeline' | 'clients' | 'quotes' | 'invoicing'>('pipeline');
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<'all' | 'draft' | 'quoted' | 'approved' | 'scheduled' | 'completed'>('all');
  // Default to kanban on desktop/tablet, grid on mobile
  const [pipelineViewMode, setPipelineViewMode] = useState<'grid' | 'kanban'>(() => {
    // Check if we're on mobile (< 768px)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'grid';
    }
    return 'kanban';
  });

  // Advanced Analytics State
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    endDate: new Date(),
    label: 'Last 30 Days'
  });
  const [showComparison, setShowComparison] = useState(true);

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [inlineEditQuote, setInlineEditQuote] = useState<{ [key: string]: { clientName: string; total: number; notes: string } }>({});
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);
  const [showInvoiceEmailModal, setShowInvoiceEmailModal] = useState(false);
  const [isSendingInvoiceEmail, setIsSendingInvoiceEmail] = useState(false);
  const [invoiceEmailSent, setInvoiceEmailSent] = useState(false);
  const [invoiceEmailError, setInvoiceEmailError] = useState<string | null>(null);
  const [invoiceEmailMessage, setInvoiceEmailMessage] = useState('');

  // Invoice Share Modal State
  const [showInvoiceShareModal, setShowInvoiceShareModal] = useState(false);
  const [invoiceShareUrl, setInvoiceShareUrl] = useState<string | null>(null);
  const [isGeneratingInvoiceLink, setIsGeneratingInvoiceLink] = useState(false);
  const [invoiceLinkCopied, setInvoiceLinkCopied] = useState(false);
  const [invoiceShareError, setInvoiceShareError] = useState<string | null>(null);

  // Multi-Image Project State
  const [projectImageIndex, setProjectImageIndex] = useState<Record<string, number>>({});
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [addImageProjectId, setAddImageProjectId] = useState<string | null>(null);
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [addImageLabel, setAddImageLabel] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleProjectId, setScheduleProjectId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState<TimeSlot>('morning');
  const [scheduleCustomTime, setScheduleCustomTime] = useState<string>('09:00');
  const [scheduleDuration, setScheduleDuration] = useState<number>(2);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [scheduleConflicts, setScheduleConflicts] = useState<ConflictResult>({ hasConflict: false, conflicts: [], warnings: [] });

  // Completion Modal State
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionProjectId, setCompletionProjectId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(false);

  // Project Detail Modal State (for viewing from Schedule)
  const [showProjectDetailModal, setShowProjectDetailModal] = useState(false);
  const [viewProjectId, setViewProjectId] = useState<string | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientAddress, setEditClientAddress] = useState('');
  const [editProjectNotes, setEditProjectNotes] = useState('');
  const [editLineItems, setEditLineItems] = useState<LineItem[]>([]);
  const [editProjectLocationId, setEditProjectLocationId] = useState<string | null>(null);
  const [showAddItemDropdown, setShowAddItemDropdown] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  // Client Projects Modal State (for viewing all projects for a client)
  const [showClientProjectsModal, setShowClientProjectsModal] = useState(false);
  const [viewClientId, setViewClientId] = useState<string | null>(null);

  // Completed Jobs Modal State
  const [showCompletedJobsModal, setShowCompletedJobsModal] = useState(false);

  // Next Step Modal State (workflow prompts)
  const [showNextStepModal, setShowNextStepModal] = useState(false);
  const [nextStepType, setNextStepType] = useState<'quote' | 'schedule' | 'invoice' | 'payment' | null>(null);
  const [nextStepProjectId, setNextStepProjectId] = useState<string | null>(null);

  // Calendar Events State (from Supabase)
  const { events: calendarEvents, createEvent, updateEvent: updateCalendarEvent, deleteEvent } = useCalendarEvents();
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('consultation');
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [eventTimeSlot, setEventTimeSlot] = useState<TimeSlot>('morning');
  const [eventCustomTime, setEventCustomTime] = useState('09:00');
  const [eventDuration, setEventDuration] = useState(1);
  const [eventLocation, setEventLocation] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventClientName, setEventClientName] = useState('');
  const [eventClientPhone, setEventClientPhone] = useState('');
  // Service Call Recurrence State
  const [eventRecurrence, setEventRecurrence] = useState<RecurrencePattern>('none');
  const [eventRecurrenceEndDate, setEventRecurrenceEndDate] = useState<string>('');
  const [eventRecurrenceCount, setEventRecurrenceCount] = useState<number>(0);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [accentColor, setAccentColor] = useState<AccentColor>('gold');
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Notification Preferences State
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailProjectUpdates: true,
    emailQuoteReminders: true,
    smsNotifications: false,
    marketingEmails: false,
    soundEffects: true,
  });

  // Settings Save State
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Auth State (API Key)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Check for API key on mount
  useEffect(() => {
    const checkAuth = async () => {
      // 1. First check if we have an Environment Variable mapped to process.env.API_KEY
      if (process.env.API_KEY) {
        console.log("Omnia: Using Environment Variable Key");
        setIsAuthorized(true);
        setIsCheckingAuth(false);
        return;
      }

      // 2. If not, try the Google AI Studio shim (Project IDX Mode)
      if ((window as any).aistudio) {
        try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setIsAuthorized(hasKey);
        } catch (e) {
          console.error("Auth check failed", e);
          setIsAuthorized(false);
        }
      } else {
        // Fallback: No env var and no AI Studio shim -> Not Authorized
        setIsAuthorized(false);
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // Load theme preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('omnia_theme');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme) setTheme(prefs.theme);
        if (prefs.accentColor) setAccentColor(prefs.accentColor);
        if (prefs.fontSize) setFontSize(prefs.fontSize);
        if (typeof prefs.highContrast === 'boolean') setHighContrast(prefs.highContrast);
      }
      const savedNotifs = localStorage.getItem('omnia_notifications');
      if (savedNotifs) {
        setNotifications(JSON.parse(savedNotifs));
      }
    } catch (e) {
      console.error('Failed to load theme preferences', e);
    }
  }, []);

  // Apply theme data attributes and persist to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accentColor);
    document.documentElement.setAttribute('data-fontsize', fontSize);
    document.documentElement.setAttribute('data-high-contrast', String(highContrast));
    localStorage.setItem('omnia_theme', JSON.stringify({ theme, accentColor, fontSize, highContrast }));
  }, [theme, accentColor, fontSize, highContrast]);

  // Persist notification preferences
  useEffect(() => {
    localStorage.setItem('omnia_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Check for schedule conflicts when modal is open and parameters change
  useEffect(() => {
    if (!showScheduleModal || !scheduleProjectId) {
      setScheduleConflicts({ hasConflict: false, conflicts: [], warnings: [] });
      return;
    }

    const dateString = scheduleDate.toISOString().split('T')[0];
    const result = detectConflicts(
      dateString,
      scheduleTimeSlot,
      scheduleTimeSlot === 'custom' ? scheduleCustomTime : undefined,
      scheduleDuration,
      projects,
      calendarEvents,
      scheduleProjectId // Exclude the current project being rescheduled
    );
    setScheduleConflicts(result);
  }, [showScheduleModal, scheduleProjectId, scheduleDate, scheduleTimeSlot, scheduleCustomTime, scheduleDuration, projects, calendarEvents]);

  // Fetch user preferences for AI personalization on mount
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`/api/feedback?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setUserPreferences(data.preferences);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user preferences', e);
      }
    };
    fetchUserPreferences();
  }, [user?.id]);

  // Helper function to save feedback to the API
  const saveFeedback = async (
    rating: 'liked' | 'disliked' | 'saved',
    feedbackTextInput?: string,
    projectId?: string
  ) => {
    if (!user?.id) return;

    const settingsSnapshot: SettingsSnapshot = {
      selectedFixtures,
      fixtureSubOptions,
      colorTemperature: colorTemp,
      lightIntensity,
      beamAngle,
      userPrompt: prompt
    };

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          projectId,
          rating,
          feedbackText: feedbackTextInput,
          settingsSnapshot,
          generatedImageUrl: generatedImage
        })
      });

      if (response.ok) {
        // Refresh preferences after feedback is saved
        const prefsResponse = await fetch(`/api/feedback?userId=${user.id}`);
        if (prefsResponse.ok) {
          const data = await prefsResponse.json();
          if (data.preferences) {
            setUserPreferences(data.preferences);
          }
        }
      }
    } catch (e) {
      console.error('Failed to save feedback', e);
    }
  };

  // Status messages for loading screen - first 5 at 8s, last one at 30s
  const statusMessages = [
    "Processing Image",
    "Analyzing Geometry",
    "Generating Design",
    "Placing Lights",
    "Illuminating",
    "Final Touches"
  ];

  useEffect(() => {
    if (isLoading && !showLoadingCelebration) {
      // First 5 messages: 8 seconds each, last message: 30 seconds
      const duration = statusMessageIndex < 5 ? 8000 : 30000;
      const timeout = setTimeout(() => {
        setStatusMessageIndex(prev => (prev + 1) % statusMessages.length);
      }, duration);
      return () => clearTimeout(timeout);
    } else if (!isLoading) {
      setStatusMessageIndex(0); // Reset when not loading
    }
  }, [isLoading, showLoadingCelebration, statusMessageIndex, statusMessages.length]);

  // Load saved settings (company profile, pricing, catalog, lighting) on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('omnia_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.companyProfile) setCompanyProfile(settings.companyProfile);
        if (settings.pricing) setPricing(settings.pricing);
        if (settings.customPricing) setCustomPricing(settings.customPricing);
        if (settings.fixtureCatalog) setFixtureCatalog(settings.fixtureCatalog);
        if (settings.colorTemp) setColorTemp(settings.colorTemp);
        if (settings.lightIntensity !== undefined) setLightIntensity(settings.lightIntensity);
        if (settings.beamAngle !== undefined) setBeamAngle(settings.beamAngle);
      }
    } catch (e) {
      console.error('Failed to load saved settings', e);
    }
  }, []);

  // Save all settings to localStorage
  const handleSaveSettings = () => {
    setIsSavingSettings(true);
    try {
      const settings = {
        companyProfile,
        pricing,
        customPricing,
        fixtureCatalog,
        colorTemp,
        lightIntensity,
        beamAngle,
      };
      localStorage.setItem('omnia_settings', JSON.stringify(settings));
      showToast('success', 'Settings saved successfully!');
    } catch (e) {
      console.error('Failed to save settings', e);
      showToast('error', 'Failed to save settings');
    } finally {
      setTimeout(() => setIsSavingSettings(false), 500);
    }
  };

  // Effect to handle invisible PDF generation from Projects List
  useEffect(() => {
    if (pdfProject && pdfProject.quote) {
        const timer = setTimeout(async () => {
             const elementId = `quote-pdf-${pdfProject.id}`;
             const element = document.getElementById(elementId);
             
             if (element && (window as any).html2pdf) {
                 // Force light mode styles for PDF
                 element.classList.add('pdf-mode');
                 const opt = {
                    margin: [0.3, 0.3, 0.3, 0.3],
                    filename: `${pdfProject.name.replace(/\s+/g, '_')}_Quote.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                
                try {
                    await (window as any).html2pdf().set(opt).from(element).save();
                } catch (e) {
                    console.error("PDF Fail", e);
                } finally {
                    element.classList.remove('pdf-mode');
                    setPdfProject(null);
                }
             }
        }, 500); // Wait for render
        return () => clearTimeout(timer);
    }
  }, [pdfProject]);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('omnia_fixture_presets', JSON.stringify(fixturePresets));
  }, [fixturePresets]);

  // Preset handlers
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: FixturePreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      selectedFixtures: [...selectedFixtures],
      fixtureSubOptions: { ...fixtureSubOptions },
      colorTemp,
      lightIntensity,
      beamAngle,
      createdAt: Date.now()
    };
    setFixturePresets(prev => [...prev, newPreset]);
    setNewPresetName('');
    setShowSavePresetModal(false);
    showToast('success', `Preset "${newPreset.name}" saved!`);
  };

  const handleApplyPreset = (preset: FixturePreset) => {
    setSelectedFixtures(preset.selectedFixtures);
    setFixtureSubOptions(preset.fixtureSubOptions);
    setColorTemp(preset.colorTemp);
    setLightIntensity(preset.lightIntensity);
    setBeamAngle(preset.beamAngle);
    showToast('success', `Applied preset: ${preset.name}`);
  };

  const handleDeletePreset = (presetId: string) => {
    setFixturePresets(prev => prev.filter(p => p.id !== presetId));
    showToast('info', 'Preset deleted');
  };

  // Client management handlers
  const handleOpenClientModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        notes: client.notes || '',
        leadSource: client.leadSource,
        marketingCost: client.marketingCost
      });
    } else {
      setEditingClient(null);
      setClientFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        leadSource: undefined,
        marketingCost: undefined
      });
    }
    setShowClientModal(true);
  };

  const handleSaveClient = async () => {
    if (!clientFormData.name.trim()) {
      showToast('error', 'Client name is required');
      return;
    }

    if (editingClient) {
      const success = await updateClient(editingClient.id, clientFormData);
      if (success) {
        showToast('success', 'Client updated!');
        setShowClientModal(false);
      }
    } else {
      const newClient = await createClient(clientFormData);
      if (newClient) {
        showToast('success', 'Client created!');
        setShowClientModal(false);
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Delete this client? This cannot be undone.')) {
      const success = await deleteClient(clientId);
      if (success) {
        showToast('info', 'Client deleted');
      }
    }
  };

  // State for portal invite sending
  const [sendingPortalInvite, setSendingPortalInvite] = useState<string | null>(null);

  const handleSendPortalInvite = async (client: Client) => {
    if (!client.email) {
      showToast('error', 'Client has no email address');
      return;
    }

    setSendingPortalInvite(client.id);
    try {
      const response = await fetch('/api/client-portal/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          userId: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invite');
      }

      showToast('success', `Portal invite sent to ${client.email}`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send portal invite');
    } finally {
      setSendingPortalInvite(null);
    }
  };

  const filteredClients = clientSearchTerm
    ? searchClients(clientSearchTerm)
    : clients;

  // Helper to check if invoice is overdue
  const isInvoiceOverdue = (invoice: InvoiceData): boolean => {
    if (invoice.status === 'paid') return false;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Get effective status (including overdue detection)
  const getInvoiceStatus = (invoice: InvoiceData): 'draft' | 'sent' | 'paid' | 'overdue' => {
    if (invoice.status === 'paid') return 'paid';
    if (isInvoiceOverdue(invoice)) return 'overdue';
    return invoice.status;
  };

  // Filter invoices by search term and status
  const filteredInvoices = invoices.filter(invoice => {
    // Search filter
    const searchMatch = !invoiceSearchTerm ||
      invoice.projectName.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
      invoice.clientDetails.name?.toLowerCase().includes(invoiceSearchTerm.toLowerCase());

    // Status filter
    const effectiveStatus = getInvoiceStatus(invoice);
    const statusMatch = invoiceStatusFilter === 'all' || effectiveStatus === invoiceStatusFilter;

    return searchMatch && statusMatch;
  });

  // Invoice summary stats
  const invoiceStats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft' && !isInvoiceOverdue(i)).length,
    sent: invoices.filter(i => i.status === 'sent' && !isInvoiceOverdue(i)).length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => isInvoiceOverdue(i)).length,
    totalUnpaid: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0),
    totalOverdue: invoices.filter(i => isInvoiceOverdue(i)).reduce((sum, i) => sum + i.total, 0),
  };

  const requestApiKey = async () => {
    // Only try to use the window shim if we don't have an env var
    if (!process.env.API_KEY && (window as any).aistudio) {
        try {
            await (window as any).aistudio.openSelectKey();
            setIsAuthorized(true);
            setError(null);
        } catch (e) {
            console.error("Key selection cancelled or failed", e);
        }
    } else {
      // If we are on Vercel but the key is missing from settings
      setError("API Key missing in configuration. Please check Vercel Environment Variables (VITE_GEMINI_API_KEY).");
    }
  };

  const handleImageSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewUrl(getPreviewUrl(selectedFile));
    setGeneratedImage(null);
    setGenerationHistory([]); // Clear history on new photo
    setError(null);
    setShowFeedback(false);
    setIsLiked(false);
    setIsFullScreen(false);
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setGeneratedImage(null);
    setGenerationHistory([]); // Clear history on clear
    setPrompt('');
    setSelectedFixtures([]);
    setFixtureSubOptions({});
    setError(null);
    setShowFeedback(false);
    setFeedbackText('');
    setIsLiked(false);
    setCurrentProjectId(null); // Clear project ID for fresh start
    setCurrentQuote(null);
    setIsFullScreen(false);
  };

  const handleCloseResult = () => {
    setGeneratedImage(null);
    setShowFeedback(false);
    setFeedbackText('');
    setIsLiked(false);
    setIsFullScreen(false);
  }

  const toggleFixture = (fixtureId: string) => {
    // Fixtures that have sub-option configuration modals
    if (['up', 'path', 'coredrill', 'gutter', 'soffit', 'hardscape', 'well', 'holiday'].includes(fixtureId)) {
        if (selectedFixtures.includes(fixtureId)) {
            // Toggle OFF
            setSelectedFixtures(prev => prev.filter(id => id !== fixtureId));
        } else {
            // Toggle ON -> Open Config
            setPendingOptions(fixtureSubOptions[fixtureId] || []);
            setActiveConfigFixture(fixtureId);
        }
    } else {
        // Standard toggle
        setSelectedFixtures(prev => {
            if (prev.includes(fixtureId)) {
                return prev.filter(id => id !== fixtureId);
            } else {
                return [...prev, fixtureId];
            }
        });
    }
  };

  const togglePendingOption = (optId: string) => {
    setPendingOptions(prev => {
        if (prev.includes(optId)) {
            return prev.filter(id => id !== optId);
        } else {
            return [...prev, optId];
        }
    });
  };

  const confirmFixtureSelection = () => {
      if (activeConfigFixture) {
          setFixtureSubOptions(prev => ({ ...prev, [activeConfigFixture]: pendingOptions }));
          // Ensure fixture is in selectedFixtures
          if (!selectedFixtures.includes(activeConfigFixture)) {
              setSelectedFixtures(prev => [...prev, activeConfigFixture]);
          }
          setActiveConfigFixture(null);
      }
  };

  const getCurrentSubOptions = () => {
      const fixture = FIXTURE_TYPES.find(f => f.id === activeConfigFixture);
      return fixture?.subOptions || [];
  };

  const getActiveFixtureTitle = () => {
      if (activeConfigFixture === 'up') return 'Up Lights';
      if (activeConfigFixture === 'path') return 'Path Lights';
      if (activeConfigFixture === 'coredrill') return 'Core Drill Lights';
      if (activeConfigFixture === 'gutter') return 'Gutter Lights';
      if (activeConfigFixture === 'soffit') return 'Soffit Lights';
      if (activeConfigFixture === 'hardscape') return 'Hardscape Lights';
      if (activeConfigFixture === 'well') return 'Well Lights';
      if (activeConfigFixture === 'holiday') return 'Permanent Holiday';
      return 'Fixture';
  };

  const [showPricing, setShowPricing] = useState(false);

  // Billing page path detection
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Handle billing page navigation
  const handleBillingContinue = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleBillingRetry = () => {
    setShowPricing(true);
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleGenerate = async () => {
    if (!file || !previewUrl) return;

    // Rate limiting - prevent rapid clicks
    const now = Date.now();
    if (now - lastGenerateTime.current < GENERATE_COOLDOWN_MS) {
      showToast('warning', 'Please wait before generating again');
      return;
    }
    lastGenerateTime.current = now;

    // Show loading immediately for better UX
    setIsLoading(true);
    setError(null);

    // Check if user can generate (subscription or free trial)
    const { canGenerate, reason } = await subscription.checkCanGenerate();
    if (!canGenerate) {
      setIsLoading(false);
      if (reason === 'FREE_TRIAL_EXHAUSTED') {
        setShowPricing(true);
        showToast('info', 'Upgrade to continue generating');
      } else if (reason === 'MONTHLY_LIMIT_REACHED') {
        showToast('warning', 'Monthly generation limit reached. Resets next billing cycle.');
      } else {
        setError('Unable to generate. Please try again.');
        showToast('error', 'Unable to generate. Please try again.');
      }
      return;
    }

    // Construct Composite Prompt
    // Start with the master anti-hallucination instructions from constants.ts
    let activePrompt = SYSTEM_PROMPT.masterInstruction + "\n\n";

    // Step 1: Source Image Analysis (forces AI to catalog existing elements first)
    activePrompt += "## SOURCE IMAGE ANALYSIS (MANDATORY FIRST STEP)\n";
    activePrompt += "BEFORE making any changes, carefully analyze the input photograph:\n";
    activePrompt += "- Count the EXACT number of windows, doors, and architectural features\n";
    activePrompt += "- Note the EXACT position of all trees, bushes, and plants\n";
    activePrompt += "- Identify ALL hardscape (driveways, sidewalks, patios, walkways) OR note their COMPLETE ABSENCE\n";
    activePrompt += "- Many homes have NO front walkway - just grass leading to the door. THIS IS NORMAL.\n";
    activePrompt += "YOUR OUTPUT MUST MATCH THIS ANALYSIS EXACTLY. Only add requested lights.\n\n";

    activePrompt += "### CRITICAL GEOMETRY LOCK (ZERO ADDITIONS):\n";
    activePrompt += "You are strictly forbidden from adding ANY physical matter to this scene. You are a lighting engine only, not a builder.\n";
    activePrompt += "1. NO NEW TREES. NO NEW BUSHES. NO NEW PLANTS.\n";
    activePrompt += "2. NO NEW SIDEWALKS. NO NEW PATHWAYS. NO NEW DRIVEWAYS. NO NEW WALKWAYS.\n";
    activePrompt += "3. NO NEW ARCHITECTURE. Do not add wings to the house, do not add dormers, do not add windows.\n";
    activePrompt += "4. NO NEW DECORATIONS. Do not add furniture, pots, or statues.\n";
    activePrompt += "VERIFICATION: If the object does not exist in the original daylight photo, it MUST NOT exist in the night render. Only add PHOTONS (Light).\n\n";

    activePrompt += "### HARDSCAPE PRESERVATION RULE (CRITICAL):\n";
    activePrompt += "MANY homes do NOT have front walkways, sidewalks, or visible driveways. This is NORMAL and INTENTIONAL.\n";
    activePrompt += "- If source photo shows GRASS leading to the front door, output MUST show GRASS (no path).\n";
    activePrompt += "- If source photo has NO sidewalk, output has NO sidewalk.\n";
    activePrompt += "- If source photo has NO visible driveway, output has NO visible driveway.\n";
    activePrompt += "- Do NOT 'complete' or 'add' hardscape that seems missing. It is NOT missing.\n";
    activePrompt += "- NEVER add a walkway, path, or driveway that does not exist in the source.\n\n";

    activePrompt += "### CRITICAL COMPOSITION RULE:\n";
    activePrompt += "The WHOLE HOUSE must remain in the generated photo. Do NOT crop parts of the house out. Do NOT zoom in. You must preserve the full field of view of the original image.\n\n";

    activePrompt += "### GLOBAL EXCLUSION PROTOCOL (ZERO HALLUCINATION POLICY):\n";
    activePrompt += "1. ONLY generate light fixtures explicitly listed in the 'ACTIVE LIGHTING CONFIGURATION' section below.\n";
    activePrompt += "2. IF A SURFACE IS NOT LISTED AS ALLOWED, IT MUST REMAIN DARK.\n";
    activePrompt += "3. DO NOT assume standard lighting packages. If I only ask for 'Trees', the House must remain DARK. If I only ask for 'Path', the House and Trees must remain DARK.\n\n";

    // --- CRITICAL HARD RULE: SOFFIT LIGHTS DISABLED ---
    // If soffit lights are not selected, strictly forbid them and command retouching of existing ones.
    if (!selectedFixtures.includes('soffit')) {
        activePrompt += "### ABSOLUTE PROHIBITION - SOFFIT LIGHTS:\n";
        activePrompt += "Soffit lights (recessed can lights in the roof overhangs) are NOT selected. You must strictly enforce the following:\n";
        activePrompt += "1. NO NEW LIGHTS: Do not place any lights in the roof overhangs, eaves, or soffits.\n";
        activePrompt += "2. EXISTING LIGHTS MUST BE OFF: If the original input photo has soffit lights turned on, you must RETOUCH THEM OUT. They must be turned OFF in the final image.\n";
        activePrompt += "3. PITCH BLACK EAVES: The area under the roof line must remain completely dark. Zero downlighting from the roof.\n\n";
    }

    // --- PART 1: NEGATIVE CONSTRAINTS (HARD RULES) ---
    // List unselected fixtures first to strictly forbid them
    const unselectedFixtures = FIXTURE_TYPES.filter(ft => !selectedFixtures.includes(ft.id));
    if (unselectedFixtures.length > 0) {
        activePrompt += "### STRICT NEGATIVE CONSTRAINTS (DO NOT GENERATE):\n";
        activePrompt += "You must NOT generate any of the following lighting types. These surfaces must remain DARK:\n";
        unselectedFixtures.forEach(ft => {
            activePrompt += `- NO ${ft.label.toUpperCase()}: ${ft.negativePrompt}\n`;
        });
        activePrompt += "\n";
    }

    // --- PART 2: POSITIVE INSTRUCTIONS ---
    activePrompt += "### ACTIVE LIGHTING CONFIGURATION (EXCLUSIVE ALLOW-LIST):\n";
    activePrompt += "NOTE: This section defines the ONLY allowed lights. Treat this as an exclusive white-list.\n";
    
    // Add positive instructions for selected fixtures
    FIXTURE_TYPES.forEach(ft => {
        if (selectedFixtures.includes(ft.id)) {
            let p = ft.positivePrompt;
            let subOptionList: string[] = []; 
            let allOptionsList: any[] = [];

            // Identify sub-options
            subOptionList = fixtureSubOptions[ft.id] || [];
            allOptionsList = ft.subOptions || [];

            // Apply Strict Sub-Option Logic
            if (subOptionList && subOptionList.length > 0 && allOptionsList) {
                 const selectedSubs = subOptionList;
                 const allSubIds = allOptionsList.map(o => o.id);
                 
                 // 1. Build Strict Allow/Deny Lists
                 const allowedLabels = selectedSubs.map(id => allOptionsList.find(o => o.id === id)?.label || id).join(', ').toUpperCase();
                 const forbiddenLabels = allSubIds.filter(id => !selectedSubs.includes(id)).map(id => allOptionsList.find(o => o.id === id)?.label || id).join(', ').toUpperCase();
                 
                 // 2. Override Prompt Header with STRICT SUB-OPTION RULE
                 p = `\n*** STRICT SUB-OPTION RULE - ${ft.label.toUpperCase()} ***\n`;
                 p += `THIS IS A MANDATORY, NON-NEGOTIABLE RULE:\n`;
                 p += `ONLY the sub-options listed in ALLOWED may receive ${ft.label.toLowerCase()}.\n`;
                 p += `ALL other surfaces/features MUST remain COMPLETELY DARK - NO EXCEPTIONS.\n\n`;
                 p += `[STRICT SCOPE - ${ft.label.toUpperCase()}]\n`;
                 p += `ALLOWED (ONLY THESE GET LIGHTS): ${allowedLabels}\n`;
                 p += `STRICTLY FORBIDDEN (MUST REMAIN DARK): ${forbiddenLabels}\n\n`;
                 p += `ENFORCEMENT:\n`;
                 p += `- If it's not in ALLOWED, it gets ZERO light\n`;
                 p += `- Do NOT add lights to "complete" or "balance" the design\n`;
                 p += `- Do NOT assume missing sub-options should be lit\n`;
                 p += `- FORBIDDEN surfaces must be pitch black with no illumination\n`;

                 // 3. Add Positives for SELECTED items
                 const positives = selectedSubs.map(id => {
                     const opt = allOptionsList.find(o => o.id === id);
                     return opt ? `YES DO THIS: ${opt.prompt}` : '';
                 }).join('\n');
                 p += `\nINSTRUCTIONS:\n${positives}\n`;

                 // 4. Add Explicit Negatives for UNSELECTED items
                 const unselected = allSubIds.filter(id => !selectedSubs.includes(id));
                 p += `\n## STRICT EXCLUSIONS FOR ${ft.label.toUpperCase()}:\n`;
                 p += `The following surfaces are NOT SELECTED and MUST remain completely dark:\n`;
                 unselected.forEach(id => {
                     const opt = allOptionsList.find(o => o.id === id);
                     if (opt && 'negativePrompt' in opt) {
                        p += `FORBIDDEN: ${(opt as any).negativePrompt}\n`;
                     }
                 });
                 
                 // 5. Global Geometry Check & Hard Rules (Specific per type)
                 if (ft.id === 'up') {
                    if (selectedSubs.includes('windows')) {
                        p += "\n[HARD RULE - WINDOW PLACEMENT]:\n";
                        p += "- SINGLE WINDOWS: Place fixture EXACTLY under the center of the glass.\n";
                        p += "- SEPARATED WINDOWS: If there is ANY wall space (brick/siding/trim) separating two windows, they are treated as SINGLE windows. Place a separate up light centered under the glass of EACH window.\n";
                        p += "- SIDE-BY-SIDE WINDOWS: Place fixture EXACTLY centered on the vertical mullion between the panes.\n";
                        p += "- PIERS/SIDES: Do NOT place light sources on the wall piers. They must only receive light from the V-cone spill of the window lights.";
                    }
                    if (selectedSubs.includes('windows') && !selectedSubs.includes('siding')) {
                        p += "\n\n[CRITICAL CONSTRAINT]: Windows are selected, but Siding/Piers are NOT. You must STRICTLY limit up-lighting to the window glass/mullions only. The brick/siding piers BETWEEN the windows must remain completely dark. Do not graze the wall sections.";
                    }
                    if (selectedSubs.includes('siding')) {
                        p += "\n\n[STRICT RULE - SIDING UP LIGHT PLACEMENT]:\n";
                        p += "*** MANDATORY PLACEMENT ORDER - READ CAREFULLY ***\n";
                        p += "- START at EACH END of the home's facade (left corner and right corner)\n";
                        p += "- Place the FIRST up lights in the landscaping beds at BOTH ends of the home\n";
                        p += "- These corner/end lights are REQUIRED - they anchor the design\n";
                        p += "- Then work INWARD from both ends, spacing lights evenly along the siding\n";
                        p += "- Lights must be positioned IN THE LANDSCAPING (mulch beds, plant beds) - NOT in grass\n";
                        p += "- The light beam should graze UP the wall surface to create wall-washing effect\n";
                        p += "- FORBIDDEN: Starting in the middle, skipping corners, placing lights in open lawn\n";
                        p += "- REQUIRED: Both left and right ends of home facade MUST have up lights\n";
                    }
                    p += "\n\nGENERAL SAFETY: Do NOT generate new trees. Do NOT place lights in open grass without a target.";
                 }

                 if (ft.id === 'path') {
                     p += "\n\nGENERAL SAFETY: Do NOT place path lights in the middle of open grass/lawn areas where there is no edge/path.";
                 }

                 if (ft.id === 'coredrill') {
                     p += "\n\nGENERAL SAFETY: Do NOT place core drill lights in grass or dirt. They must be in hardscape.";
                 }

                 if (ft.id === 'gutter') {
                     if (selectedSubs.includes('dormers')) {
                         p += "\n\n[STRICT RULE - GUTTER MOUNT DORMER LIGHTING]:\n";
                         p += "*** MANDATORY RULE - READ CAREFULLY ***\n";
                         p += "- Each dormer gets EXACTLY ONE (1) gutter-mounted up light - NO MORE, NO LESS\n";
                         p += "- The fixture must be placed DIRECTLY BELOW the dormer, CENTERED on the dormer's width\n";
                         p += "- The fixture sits INSIDE the horizontal gutter trough, not on the roof\n";
                         p += "- The light beam shines STRAIGHT UP to wash the dormer face\n";
                         p += "- COUNT THE DORMERS: If 2 dormers exist, use exactly 2 lights. If 3 dormers, exactly 3 lights.\n";
                         p += "- FORBIDDEN: Multiple lights per dormer, lights between dormers, lights on roof shingles, lights on dormer itself\n";
                         p += "- CENTERING IS CRITICAL: The fixture must be horizontally centered under each dormer\n";
                     }
                     p += "\n\nGENERAL SAFETY: Lights must shine UP from the gutter line. Do not shine down.";
                 }

                 if (ft.id === 'soffit') {
                     p += "\n\nGENERAL SAFETY: Lights must be recessed in the overhang shining DOWN.";
                 }

                 if (ft.id === 'hardscape') {
                     p += "\n\nGENERAL SAFETY: Lights must be linear or puck style installed under a hardscape lip.";
                 }
            }

            activePrompt += `\n[APPLY TO EXISTING]: ${p}\n`;
        }
    });

    // --- LOGIC GATE FOR GUTTER vs SOFFIT ---
    // Rule: If Gutter is ON and Soffit is OFF -> Strictly forbid soffit lighting.
    if (selectedFixtures.includes('gutter') && !selectedFixtures.includes('soffit')) {
        activePrompt += `\n\n[HARD CONSTRAINT]: GUTTER LIGHTS ARE ACTIVE, BUT SOFFIT LIGHTS ARE DISABLED. You must ONLY generate lights shining UP from the gutter lip. The underside of the roof eaves (soffits) MUST remain completely dark. Do not allow any light bleed under the roof overhangs. Do NOT turn on existing soffit lights.`;
    }

    // --- LOGIC GATE FOR UP LIGHT vs SOFFIT ---
    // Rule: If Up Lights are ON and Soffit is OFF -> Strictly forbid soffit lighting.
    if (selectedFixtures.includes('up') && !selectedFixtures.includes('soffit')) {
        activePrompt += `\n\n[HARD CONSTRAINT]: UP LIGHTS ARE ACTIVE, BUT SOFFIT DOWNLIGHTS ARE DISABLED. Do NOT generate any recessed can lights or downlights in the roof overhangs/soffits. The ONLY light on the house must come from the GROUND UP. The eaves themselves should not be emitting light, though they may catch the wash from the up lights.`;
    }
    
    // Final QA Instruction - Comprehensive Verification Checklist
    activePrompt += "\n\n### FINAL VERIFICATION CHECKLIST (MANDATORY):\n";
    activePrompt += "Before outputting, verify each item. If ANY check fails, FIX IT:\n";
    activePrompt += "[ ] WINDOW COUNT: Does output have the SAME number of windows as source? If not, FIX.\n";
    activePrompt += "[ ] DOOR COUNT: Does output have the SAME number of doors as source? If not, FIX.\n";
    activePrompt += "[ ] HARDSCAPE: Does output have the SAME driveway/sidewalk/walkway as source (or NONE if source has NONE)? If not, FIX.\n";
    activePrompt += "[ ] TREES: Does output have the SAME trees in the SAME positions as source? If not, FIX.\n";
    activePrompt += "[ ] LANDSCAPING: Does output have the SAME bushes and plants as source? If not, FIX.\n";
    activePrompt += "[ ] ARCHITECTURE: Does output have the SAME house shape, roof, dormers as source? If not, FIX.\n";
    activePrompt += "[ ] LIGHT PLACEMENT: Are lights ONLY on surfaces listed in ALLOWED sections above? If not, REMOVE.\n";
    activePrompt += "[ ] FORBIDDEN SURFACES: Are all surfaces listed in EXCLUSIONS/FORBIDDEN sections dark? If not, FIX.\n";
    activePrompt += "[ ] SKY: Is the sky natural twilight (no giant artificial moon)? If not, FIX.\n";
    activePrompt += "[ ] COMPOSITION: Is the full house visible without cropping or zooming? If not, FIX.\n";

    // Add closing reinforcement from constants.ts (category enforcement rules)
    activePrompt += "\n\n" + SYSTEM_PROMPT.closingReinforcement;

    // Prepare Color Temperature Prompt
    const selectedColor = COLOR_TEMPERATURES.find(c => c.id === colorTemp);
    const colorPrompt = selectedColor?.prompt || "Use Soft White (3000K) for all lights.";

    // Add User Custom Instructions
    if (prompt) {
        activePrompt += `\n\nADDITIONAL CUSTOM NOTES: ${prompt}`;
    }

    // Validation
    if (selectedFixtures.length === 0 && !prompt) {
        setIsLoading(false);
        setError("Please select at least one lighting type or enter custom instructions.");
        return;
    }

    setLastUsedPrompt(activePrompt);
    setShowFeedback(false);
    setFeedbackText('');
    setIsLiked(false);
    setIsFullScreen(false);

    // Dynamic Aspect Ratio Detection
    let targetRatio = "1:1";
    try {
        const img = new Image();
        img.src = previewUrl;
        await img.decode();
        const ratio = img.width / img.height;
        // Select closest supported ratio to avoid cropping
        if (ratio >= 1.5) targetRatio = "16:9";
        else if (ratio >= 1.15) targetRatio = "4:3";
        else if (ratio >= 0.85) targetRatio = "1:1";
        else if (ratio >= 0.65) targetRatio = "3:4";
        else targetRatio = "9:16";
        
        console.log(`Detected Ratio: ${ratio.toFixed(2)} | Target: ${targetRatio}`);
    } catch (e) {
        console.warn("Aspect ratio detection failed, defaulting to 1:1", e);
    }

    try {
      const base64 = await fileToBase64(file);
      let result = await generateNightScene(base64, activePrompt, file.type, targetRatio, lightIntensity, beamAngle, colorPrompt, userPreferences);

      setGeneratedImage(result);

      // Trigger loading screen celebration FIRST (before hiding loading)
      setShowLoadingCelebration(true);

      // Add to history with settings
      setGenerationHistory(prev => [...prev, {
        id: Date.now().toString(),
        image: result,
        timestamp: Date.now(),
        settings: {
          selectedFixtures: selectedFixtures,
          fixtureSubOptions: { ...fixtureSubOptions },
          colorTemp: colorTemp,
          lightIntensity: lightIntensity,
          beamAngle: beamAngle,
          prompt: prompt
        }
      }]);
      // Increment usage count after successful generation
      await subscription.incrementUsage();

      // Wait for the loading celebration to play, then transition
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowLoadingCelebration(false);
      setIsLoading(false);

      // Trigger button celebration effect after transitioning
      setGenerationComplete(true);
      setTimeout(() => setGenerationComplete(false), 2500);
      showToast('success', 'Night scene generated successfully!');
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.toString().toLowerCase();
      if (errorMessage.includes('403') || errorMessage.includes('permission_denied') || errorMessage.includes('permission denied')) {
        setError("Permission denied. Please check your API Key configuration.");
        showToast('error', 'Permission denied. Check your API key.');
        // Only try to open the modal if we are in the AI Studio environment
        if ((window as any).aistudio) await requestApiKey();
      } else {
        setError("Failed to generate night scene. Please try again.");
        showToast('error', 'Generation failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleFeedbackRegenerate = async () => {
    if (!file || !feedbackText) return;

    // Rate limiting - prevent rapid clicks
    const now = Date.now();
    if (now - lastGenerateTime.current < GENERATE_COOLDOWN_MS) {
      showToast('warning', 'Please wait before generating again');
      return;
    }
    lastGenerateTime.current = now;

    // Save negative feedback for AI learning (before regenerating)
    saveFeedback('disliked', feedbackText);

    setIsLoading(true);
    setError(null);

    // Use current color/settings for regeneration
    const selectedColor = COLOR_TEMPERATURES.find(c => c.id === colorTemp);
    const colorPrompt = selectedColor?.prompt || "Use Soft White (3000K) for all lights.";

    try {
        const base64 = await fileToBase64(file);
        // Construct a refinement prompt
        const refinementPrompt = `${lastUsedPrompt}\n\nCRITICAL MODIFICATION REQUEST: ${feedbackText}\n\nRe-generate the night scene keeping the original design but applying the modification request.`;

        let result = await generateNightScene(base64, refinementPrompt, file.type, "1:1", lightIntensity, beamAngle, colorPrompt, userPreferences);

        setGeneratedImage(result);

        // Trigger loading screen celebration FIRST (before hiding loading)
        setShowLoadingCelebration(true);

        // Add to history with settings
        setGenerationHistory(prev => [...prev, {
          id: Date.now().toString(),
          image: result,
          timestamp: Date.now(),
          settings: {
            selectedFixtures: selectedFixtures,
            fixtureSubOptions: { ...fixtureSubOptions },
            colorTemp: colorTemp,
            lightIntensity: lightIntensity,
            beamAngle: beamAngle,
            prompt: feedbackText
          }
        }]);
        // Increment usage count after successful generation
        await subscription.incrementUsage();

        // Wait for the loading celebration to play, then transition
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowLoadingCelebration(false);
        setIsLoading(false);

        setShowFeedback(false);
        setFeedbackText('');
        setIsLiked(false);

        // Trigger button celebration effect after transitioning
        setGenerationComplete(true);
        setTimeout(() => setGenerationComplete(false), 2500);
        showToast('success', 'Scene regenerated with your feedback!');
    } catch (err: any) {
        console.error(err);
        const errorMessage = err.toString().toLowerCase();
        if (errorMessage.includes('403') || errorMessage.includes('permission_denied')) {
            setError("Permission denied. Please check your API Key configuration.");
            showToast('error', 'Permission denied. Check your API key.');
            if ((window as any).aistudio) await requestApiKey();
        } else {
            setError("Failed to regenerate. Please try again.");
            showToast('error', 'Regeneration failed. Please try again.');
        }
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = 'omnia-night-scene.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleDownloadImage = (project: SavedProject) => {
    if (!project.image) return;
    const link = document.createElement('a');
    link.href = project.image;
    link.download = `${project.name.replace(/\s+/g, '_')}_Scene.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Get all images for a project (primary + additional images)
  const getProjectImages = (project: SavedProject): { url: string; label: string }[] => {
    const images: { url: string; label: string }[] = [];
    if (project.image) {
      images.push({ url: project.image, label: 'Primary' });
    }
    if (project.images && project.images.length > 0) {
      project.images.forEach(img => {
        if (img.url !== project.image) {
          images.push({ url: img.url, label: img.label || 'View' });
        }
      });
    }
    return images;
  };

  // Handler: Open add image modal
  const handleOpenAddImageModal = (projectId: string) => {
    setAddImageProjectId(projectId);
    setAddImageFile(null);
    setAddImagePreview(null);
    setAddImageLabel('');
    setShowAddImageModal(true);
  };

  // Handler: Add image file selection
  const handleAddImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAddImageFile(file);
      const preview = await getPreviewUrl(file);
      setAddImagePreview(preview);
    }
  };

  // Handler: Submit new image to project
  const handleSubmitAddImage = async () => {
    if (!addImageProjectId || !addImageFile) return;
    setIsAddingImage(true);
    try {
      const base64 = await fileToBase64(addImageFile);
      const success = await addImageToProject(addImageProjectId, base64, addImageLabel || undefined);
      if (success) {
        showToast('success', 'Image added to project');
        setShowAddImageModal(false);
      } else {
        showToast('error', 'Failed to add image');
      }
    } catch (err) {
      console.error('Error adding image:', err);
      showToast('error', 'Failed to add image');
    } finally {
      setIsAddingImage(false);
    }
  };

  // Helper function to generate quote data based on selected fixtures
  const generateQuoteFromSelections = (): QuoteData => {
    // 1. Parse prompt (custom notes) for explicit quantities
    const parsedCounts = parsePromptForQuantities(prompt);
    const hasParsedCounts = Object.keys(parsedCounts).length > 0;

    // 2. Estimate counts based on selected sub-options (smarter estimation)
    const estimatedCounts = estimateCountsFromSubOptions(selectedFixtures, fixtureSubOptions);

    // Generate Line Items using CURRENT pricing state - ONLY for selected fixtures
    const lineItems = pricing.map(def => {
         // RULE: Only add transformer if at least one fixture is selected
         if (def.fixtureType === 'transformer') {
             // Only include transformer if there are other selected fixtures
             if (selectedFixtures.length > 0) {
                 return { ...def, quantity: 1 };
             }
             return { ...def, quantity: 0 };
         }

         // Priority 1: Use explicit counts from custom notes if provided
         if (hasParsedCounts && parsedCounts[def.id]) {
             return { ...def, quantity: parsedCounts[def.id] };
         }

         // Priority 2: Use estimated counts based on selected sub-options
         if (estimatedCounts[def.id]) {
             return { ...def, quantity: estimatedCounts[def.id] };
         }

         // Priority 3: If fixture is selected but no estimate, use a minimal default
         if (selectedFixtures.includes(def.fixtureType)) {
             return { ...def, quantity: 4 }; // Minimal default
         }

         // Not selected - quantity 0 (will be filtered out)
         return { ...def, quantity: 0 };
    }).filter(item => item.quantity > 0);

    return {
        lineItems: lineItems.map(i => ({
            id: i.id,
            name: i.name,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice
        })),
        taxRate: 0.07,
        discount: 0,
        clientDetails: {
            name: "",
            email: "",
            phone: "",
            address: ""
        },
        total: 0 // View will calculate
    };
  };

  const handleGenerateQuote = () => {
    const newQuote = generateQuoteFromSelections();
    setCurrentQuote(newQuote);
    handleTabChange('projects');
  };

  const handleSaveProjectFromEditor = async () => {
      if (!generatedImage) {
        return;
      }
      const projectName = `Night Scene ${projects.length + 1}`;
      // Generate quote based on selected fixtures so it saves with the project
      const quoteData = generateQuoteFromSelections();
      const result = await saveProject(projectName, generatedImage, quoteData);
      if (result) {
        // Track this project ID so subsequent quote saves update it instead of creating duplicates
        setCurrentProjectId(result.id);
        setCurrentQuote(quoteData);
        // Save positive feedback for AI learning (saved project = liked design)
        saveFeedback('saved', undefined, result.id);
        handleTabChange('projects');
        showToast('success', 'Project saved successfully!');
      } else {
        setError('Failed to save project. Please try again.');
        showToast('error', 'Failed to save project');
      }
  };

  // Save to drafts (no client assignment)
  const handleSaveToDrafts = async () => {
    if (!generatedImage) return;

    setIsSavingImage(true);
    try {
      const projectName = `Draft ${projects.length + 1}`;
      const quoteData = generateQuoteFromSelections();
      const result = await saveProject(projectName, generatedImage, quoteData);
      if (result) {
        setCurrentProjectId(result.id);
        setCurrentQuote(quoteData);
        saveFeedback('saved', undefined, result.id);
        setShowSaveImageModal(false);
        handleTabChange('projects');
        showToast('success', 'Saved to drafts!');
        // Show next step prompt
        setNextStepProjectId(result.id);
        setNextStepType('quote');
        setShowNextStepModal(true);
      } else {
        showToast('error', 'Failed to save');
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  // Save to a new client
  const handleSaveToNewClient = async (clientData: Partial<Client>) => {
    if (!generatedImage || !clientData.name) return;

    setIsSavingImage(true);
    try {
      // First create the client
      const newClient = await createClient({
        name: clientData.name,
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        notes: clientData.notes || ''
      });

      if (!newClient) {
        showToast('error', 'Failed to create client');
        return;
      }

      // Now save the project with the client ID
      const projectName = clientData.name;
      const quoteData = generateQuoteFromSelections();
      const result = await saveProject(projectName, generatedImage, quoteData, null, newClient.id, newClient.name);

      if (result) {
        setCurrentProjectId(result.id);
        setCurrentQuote(quoteData);
        saveFeedback('saved', undefined, result.id);
        setShowSaveImageModal(false);
        handleTabChange('projects');
        showToast('success', `Saved to ${newClient.name}!`);
        // Show next step prompt
        setNextStepProjectId(result.id);
        setNextStepType('quote');
        setShowNextStepModal(true);
      } else {
        showToast('error', 'Failed to save project');
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  // Save to an existing client
  const handleSaveToExistingClient = async (clientId: string, clientName: string) => {
    if (!generatedImage) return;

    setIsSavingImage(true);
    try {
      const projectName = clientName;
      const quoteData = generateQuoteFromSelections();
      const result = await saveProject(projectName, generatedImage, quoteData, null, clientId, clientName);

      if (result) {
        setCurrentProjectId(result.id);
        setCurrentQuote(quoteData);
        saveFeedback('saved', undefined, result.id);
        setShowSaveImageModal(false);
        handleTabChange('projects');
        showToast('success', `Saved to ${clientName}!`);
        // Show next step prompt
        setNextStepProjectId(result.id);
        setNextStepType('quote');
        setShowNextStepModal(true);
      } else {
        showToast('error', 'Failed to save project');
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleSaveProjectFromQuote = async (quoteData: QuoteData) => {
      // If we have a current project ID, update that project instead of creating a new one
      if (currentProjectId) {
        const success = await updateProject(currentProjectId, {
          quote: quoteData,
          name: quoteData.clientDetails.name || undefined
        });
        if (success) {
          setCurrentQuote(quoteData);
          showToast('success', 'Quote updated!');
        } else {
          setError('Failed to update quote. Please try again.');
          showToast('error', 'Failed to update quote');
        }
      } else {
        // No existing project - create a new one (shouldn't happen in normal flow)
        const projectName = quoteData.clientDetails.name || `Quote ${projects.length + 1}`;
        const result = await saveProject(projectName, generatedImage || '', quoteData);
        if (result) {
          setCurrentProjectId(result.id);
          handleTabChange('projects');
          showToast('success', 'Quote saved to project!');
        } else {
          setError('Failed to save project. Please try again.');
          showToast('error', 'Failed to save project');
        }
      }
  };

  const handleDeleteProject = async (id: string) => {
      await deleteProject(id);
      showToast('success', 'Project deleted');
  };

  const handleGenerateBOM = (quoteData: QuoteData) => {
      const bom = generateBOM(quoteData.lineItems, fixtureCatalog.length > 0 ? fixtureCatalog : undefined);
      setCurrentBOM(bom);
  };

  const handleBOMChange = (bom: BOMData) => {
      setCurrentBOM(bom);
  };

  const handleSaveProjectFromBOM = async (bom: BOMData) => {
      const projectName = currentQuote?.clientDetails?.name || `BOM Project ${projects.length + 1}`;
      const result = await saveProject(projectName, generatedImage || '', currentQuote, bom);
      if (result) {
        handleTabChange('projects');
        showToast('success', 'BOM saved to project!');
      } else {
        setError('Failed to save project. Please try again.');
        showToast('error', 'Failed to save project');
      }
  };

  // Approve a project
  const handleApproveProject = async (projectId: string) => {
      await updateProjectStatus(projectId, 'approved');
      showToast('success', 'Project approved! Ready to schedule.');
  };

  // Change project status
  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
      await updateProjectStatus(projectId, newStatus);
      showToast('success', `Project moved to ${STATUS_CONFIG[newStatus].label}`);
  };

  // Generate invoice from approved project
  const handleGenerateInvoice = (project: SavedProject) => {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

      // Convert quote line items to invoice line items
      const lineItems: InvoiceLineItem[] = project.quote?.lineItems.map(item => ({
          id: item.id,
          description: `${item.name} - ${item.description}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
      })) || [];

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = project.quote?.taxRate || 0.07;
      const taxAmount = subtotal * taxRate;
      const discount = project.quote?.discount || 0;
      const total = subtotal + taxAmount - discount;

      const newInvoice: InvoiceData = {
          id: `inv-${Date.now()}`,
          projectId: project.id,
          projectName: project.name,
          invoiceNumber,
          invoiceDate: today.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          clientDetails: project.quote?.clientDetails || { name: '', email: '', phone: '', address: '' },
          lineItems,
          subtotal,
          taxRate,
          taxAmount,
          discount,
          total,
          notes: '',
          status: 'draft'
      };

      setCurrentInvoice(newInvoice);
      setInvoices(prev => [...prev, newInvoice]);
      setProjectsSubTab('invoicing');
  };

  // Send quote to client portal
  const handleSendQuoteToPortal = async (project: SavedProject) => {
    if (!project.quote || !user?.id) {
      showToast('error', 'Unable to send quote. Project must have a quote saved.');
      return;
    }

    const clientEmail = project.quote.clientDetails?.email;
    if (!clientEmail) {
      showToast('error', 'Please add a client email before sending the quote.');
      return;
    }

    setIsSendingQuote(true);

    try {
      // First generate the share link
      const shareResponse = await fetch(`/api/projects/${project.id}/share?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quote', expiresInDays: 30 })
      });

      const shareData = await shareResponse.json();
      if (!shareResponse.ok) {
        throw new Error(shareData.error || 'Failed to generate share link');
      }

      const shareUrl = shareData.data.shareUrl;

      // Now send the quote email with the portal link
      const response = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: clientEmail,
          clientName: project.quote.clientDetails?.name || 'Valued Customer',
          projectName: project.name,
          companyName: companyProfile.name,
          companyEmail: companyProfile.email,
          companyPhone: companyProfile.phone,
          companyAddress: companyProfile.address,
          companyLogo: companyProfile.logo,
          lineItems: project.quote.lineItems.filter(item => item.quantity > 0).map(item => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          })),
          subtotal: project.quote.total / (1 + project.quote.taxRate / 100),
          taxRate: project.quote.taxRate,
          taxAmount: project.quote.total - (project.quote.total / (1 + project.quote.taxRate / 100)),
          discount: project.quote.discount || 0,
          total: project.quote.total,
          projectImageUrl: project.image?.startsWith('http') ? project.image : undefined,
          portalLink: shareUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send quote email');
      }

      // Update project status to quoted if it was a draft
      if (project.status === 'draft') {
        await updateProject(project.id, { status: 'quoted' });
      }

      showToast('success', 'Quote sent to client!');
      setShowProjectDetailModal(false);
    } catch (err: any) {
      console.error('Error sending quote:', err);
      showToast('error', err.message || 'Failed to send quote');
    } finally {
      setIsSendingQuote(false);
    }
  };

  // === CALENDAR EVENT HANDLERS ===

  // Reset event form
  const resetEventForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventType('consultation');
    setEventDate(new Date());
    setEventTimeSlot('morning');
    setEventCustomTime('09:00');
    setEventDuration(1);
    setEventLocation('');
    setEventNotes('');
    setEventClientName('');
    setEventClientPhone('');
    // Reset recurrence fields
    setEventRecurrence('none');
    setEventRecurrenceEndDate('');
    setEventRecurrenceCount(0);
  };

  // Open create event modal
  const handleCreateEvent = () => {
    resetEventForm();
    setEventDate(selectedCalendarDate); // Use currently selected date
    setShowEventModal(true);
  };

  // Open edit event modal
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventType(event.eventType);
    setEventDate(new Date(event.date));
    setEventTimeSlot(event.timeSlot);
    setEventCustomTime(event.customTime || '09:00');
    setEventDuration(event.duration);
    setEventLocation(event.location || '');
    setEventNotes(event.notes || '');
    setEventClientName(event.clientName || '');
    setEventClientPhone(event.clientPhone || '');
    // Load recurrence data
    setEventRecurrence(event.recurrence || 'none');
    setEventRecurrenceEndDate(event.recurrenceEndDate || '');
    setEventRecurrenceCount(event.recurrenceCount || 0);
    setShowEventModal(true);
  };

  // Save event (create or update)
  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      showToast('error', 'Please enter an event title');
      return;
    }

    const eventData = {
      title: eventTitle.trim(),
      eventType: eventType,
      date: eventDate.toISOString().split('T')[0],
      timeSlot: eventTimeSlot,
      customTime: eventTimeSlot === 'custom' ? eventCustomTime : undefined,
      duration: eventDuration,
      location: eventLocation.trim() || undefined,
      notes: eventNotes.trim() || undefined,
      clientName: eventClientName.trim() || undefined,
      clientPhone: eventClientPhone.trim() || undefined,
      // Include recurrence data for service calls
      recurrence: eventType === 'service-call' ? eventRecurrence : undefined,
      recurrenceEndDate: eventType === 'service-call' && eventRecurrence !== 'none' && eventRecurrenceEndDate ? eventRecurrenceEndDate : undefined,
      recurrenceCount: eventType === 'service-call' && eventRecurrence !== 'none' && eventRecurrenceCount > 0 ? eventRecurrenceCount : undefined,
    };

    if (editingEventId) {
      // Update existing event
      const success = await updateCalendarEvent(editingEventId, eventData);
      if (success) {
        showToast('success', 'Event updated!');
      } else {
        showToast('error', 'Failed to update event');
      }
    } else {
      // Create new event
      const newEvent = await createEvent(eventData);
      if (newEvent) {
        showToast('success', 'Event created!');
      } else {
        showToast('error', 'Failed to create event');
      }
    }

    setShowEventModal(false);
    resetEventForm();
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    const success = await deleteEvent(eventId);
    if (success) {
      showToast('success', 'Event deleted');
    } else {
      showToast('error', 'Failed to delete event');
    }
  };

  // Update invoice field
  const handleInvoiceChange = (field: keyof InvoiceData, value: any) => {
      if (!currentInvoice) return;

      const updated = { ...currentInvoice, [field]: value };

      // Recalculate totals if needed
      if (field === 'lineItems' || field === 'taxRate' || field === 'discount') {
          const lineItems = field === 'lineItems' ? value : updated.lineItems;
          const subtotal = lineItems.reduce((sum: number, item: InvoiceLineItem) => sum + item.total, 0);
          const taxAmount = subtotal * updated.taxRate;
          updated.subtotal = subtotal;
          updated.taxAmount = taxAmount;
          updated.total = subtotal + taxAmount - updated.discount;
      }

      setCurrentInvoice(updated);
      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
  };

  // Update invoice line item
  const handleInvoiceLineItemChange = (itemId: string, field: keyof InvoiceLineItem, value: number | string) => {
      if (!currentInvoice) return;

      const updatedLineItems = currentInvoice.lineItems.map(item => {
          if (item.id === itemId) {
              const updated = { ...item, [field]: value };
              if (field === 'quantity' || field === 'unitPrice') {
                  updated.total = updated.quantity * updated.unitPrice;
              }
              return updated;
          }
          return item;
      });

      handleInvoiceChange('lineItems', updatedLineItems);
  };

  // Add new line item to invoice
  const handleAddInvoiceLineItem = () => {
      if (!currentInvoice) return;
      const newItem: InvoiceLineItem = {
          id: Date.now().toString(),
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0
      };
      handleInvoiceChange('lineItems', [...currentInvoice.lineItems, newItem]);
  };

  // Remove line item from invoice
  const handleRemoveInvoiceLineItem = (itemId: string) => {
      if (!currentInvoice) return;
      handleInvoiceChange('lineItems', currentInvoice.lineItems.filter(item => item.id !== itemId));
  };

  // Delete an invoice
  const handleDeleteInvoice = (invoiceId: string) => {
      if (!confirm('Are you sure you want to delete this invoice?')) return;
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      if (currentInvoice?.id === invoiceId) {
          setCurrentInvoice(null);
      }
  };

  // Unapprove a project (move back to draft)
  const handleUnapproveProject = async (projectId: string) => {
      if (!confirm('Move this project back to draft?')) return;
      await updateProjectStatus(projectId, 'draft');
      showToast('success', 'Project moved back to draft');
  };

  // Download invoice as PDF
  const handleDownloadInvoicePDF = async (invoice: InvoiceData) => {
      const elementId = `invoice-pdf-${invoice.id}`;
      const element = document.getElementById(elementId);

      if (element && (window as any).html2pdf) {
          element.classList.add('pdf-mode');
          const opt = {
              margin: [0.3, 0.3, 0.3, 0.3],
              filename: `${invoice.invoiceNumber}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
          };

          try {
              await (window as any).html2pdf().set(opt).from(element).save();
          } catch (e) {
              console.error("Invoice PDF Fail", e);
          } finally {
              element.classList.remove('pdf-mode');
          }
      } else {
          // Fallback: Generate a simple text-based PDF download
          const content = `
INVOICE: ${invoice.invoiceNumber}
Project: ${invoice.projectName}
Date: ${invoice.invoiceDate}
Due: ${invoice.dueDate}

Bill To:
${invoice.clientDetails.name}
${invoice.clientDetails.email}
${invoice.clientDetails.phone}
${invoice.clientDetails.address}

Line Items:
${invoice.lineItems.map(item => `${item.description} - Qty: ${item.quantity} x $${item.unitPrice} = $${item.total.toFixed(2)}`).join('\n')}

Subtotal: $${invoice.subtotal.toFixed(2)}
Tax (${(invoice.taxRate * 100).toFixed(0)}%): $${invoice.taxAmount.toFixed(2)}
Discount: -$${invoice.discount.toFixed(2)}
TOTAL: $${invoice.total.toFixed(2)}

Notes: ${invoice.notes || 'N/A'}
          `.trim();

          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${invoice.invoiceNumber}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      }
  };

  // Generate shareable invoice portal link
  const handleGenerateInvoiceShareLink = async () => {
    if (!currentInvoice?.projectId || !user?.id) {
      setInvoiceShareError('Unable to generate link. Invoice must be saved first.');
      return;
    }

    setIsGeneratingInvoiceLink(true);
    setInvoiceShareError(null);

    try {
      // Include invoice data so it can be stored with the project
      const invoiceData = {
        invoiceNumber: currentInvoice.invoiceNumber,
        invoiceDate: currentInvoice.invoiceDate,
        dueDate: currentInvoice.dueDate,
        lineItems: currentInvoice.lineItems,
        subtotal: currentInvoice.subtotal,
        taxRate: currentInvoice.taxRate,
        taxAmount: currentInvoice.taxAmount,
        discount: currentInvoice.discount,
        total: currentInvoice.total,
        notes: currentInvoice.notes,
        clientDetails: currentInvoice.clientDetails
      };

      const response = await fetch(`/api/projects/${currentInvoice.projectId}/share?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          expiresInDays: 30,
          invoiceData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate share link');
      }

      setInvoiceShareUrl(data.data.shareUrl);
    } catch (err: any) {
      console.error('Error generating invoice share link:', err);
      setInvoiceShareError(err.message || 'Failed to generate share link');
    } finally {
      setIsGeneratingInvoiceLink(false);
    }
  };

  const handleCopyInvoiceLink = async () => {
    if (!invoiceShareUrl) return;
    try {
      await navigator.clipboard.writeText(invoiceShareUrl);
      setInvoiceLinkCopied(true);
      setTimeout(() => setInvoiceLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy invoice link:', err);
    }
  };

  const handleOpenInvoiceShareModal = () => {
    setShowInvoiceShareModal(true);
    setInvoiceShareUrl(null);
    setInvoiceShareError(null);
    setInvoiceLinkCopied(false);
    // Auto-generate link when modal opens
    if (currentInvoice?.projectId && user?.id) {
      handleGenerateInvoiceShareLink();
    }
  };

  // Send invoice via email
  const handleSendInvoiceEmail = async () => {
      if (!currentInvoice || !currentInvoice.clientDetails.email) return;

      setIsSendingInvoiceEmail(true);
      setInvoiceEmailError(null);
      setInvoiceEmailSent(false);

      // Find the project to get the image URL
      // Only include if it's a valid HTTP(S) URL (not a base64 data URL)
      const project = projects.find(p => p.id === currentInvoice.projectId);
      const rawImageUrl = project?.image || null;
      const projectImageUrl = rawImageUrl && rawImageUrl.startsWith('http') ? rawImageUrl : null;

      try {
          const response = await fetch('/api/send-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  clientEmail: currentInvoice.clientDetails.email,
                  clientName: currentInvoice.clientDetails.name,
                  projectName: currentInvoice.projectName,
                  companyName: companyProfile.name,
                  companyEmail: companyProfile.email,
                  companyPhone: companyProfile.phone,
                  companyAddress: companyProfile.address,
                  companyLogo: companyProfile.logo,
                  invoiceNumber: currentInvoice.invoiceNumber,
                  invoiceDate: currentInvoice.invoiceDate,
                  dueDate: currentInvoice.dueDate,
                  lineItems: currentInvoice.lineItems,
                  subtotal: currentInvoice.subtotal,
                  taxRate: currentInvoice.taxRate,
                  taxAmount: currentInvoice.taxAmount,
                  discount: currentInvoice.discount,
                  total: currentInvoice.total,
                  notes: currentInvoice.notes,
                  projectImageUrl: projectImageUrl || undefined,
                  customMessage: invoiceEmailMessage || undefined
              })
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.error || 'Failed to send email');
          }

          setInvoiceEmailSent(true);
          showToast('success', 'Invoice email sent successfully!');
          setTimeout(() => {
              setShowInvoiceEmailModal(false);
              setInvoiceEmailSent(false);
              setInvoiceEmailMessage('');
              // Show payment options next step
              if (currentInvoice.projectId) {
                setNextStepProjectId(currentInvoice.projectId);
                setNextStepType('payment');
                setShowNextStepModal(true);
              }
          }, 2000);
      } catch (err: any) {
          console.error('Error sending invoice email:', err);
          setInvoiceEmailError(err.message || 'Failed to send email');
      } finally {
          setIsSendingInvoiceEmail(false);
      }
  };

  // Status configuration for pipeline
  const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
    draft: { label: 'Draft', color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
    quoted: { label: 'Quoted', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
    approved: { label: 'Approved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    scheduled: { label: 'Scheduled', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
    completed: { label: 'Completed', color: 'text-[#F6B45A]', bgColor: 'bg-[#F6B45A]/10', borderColor: 'border-[#F6B45A]/30' }
  };

  // Count projects by status
  const statusCounts = useMemo(() => {
    const counts: Record<ProjectStatus, number> = { draft: 0, quoted: 0, approved: 0, scheduled: 0, completed: 0 };
    projects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  // Pipeline Analytics - Conversion metrics, revenue, overdue invoices
  const pipelineAnalytics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Conversion rates
    const totalProjects = projects.length;
    const quotedOrBeyond = projects.filter(p => p.status !== 'draft').length;
    const approvedOrBeyond = projects.filter(p => ['approved', 'scheduled', 'completed'].includes(p.status)).length;
    const completedCount = projects.filter(p => p.status === 'completed').length;

    const draftToQuotedRate = totalProjects > 0 ? Math.round((quotedOrBeyond / totalProjects) * 100) : 0;
    const quotedToApprovedRate = quotedOrBeyond > 0 ? Math.round((approvedOrBeyond / quotedOrBeyond) * 100) : 0;
    const approvedToCompletedRate = approvedOrBeyond > 0 ? Math.round((completedCount / approvedOrBeyond) * 100) : 0;

    // Revenue calculations
    let revenueThisMonth = 0;
    let pendingRevenue = 0;
    let overdueRevenue = 0;
    const overdueProjects: SavedProject[] = [];

    // Calculate average quote value and days to approval
    let totalQuoteValue = 0;
    let quoteCount = 0;

    projects.forEach(p => {
      const quoteTotal = p.quote?.total || 0;

      // Count quote values for average
      if (p.quote && quoteTotal > 0) {
        totalQuoteValue += quoteTotal;
        quoteCount++;
      }

      // Revenue this month (paid invoices)
      if (p.invoicePaidAt) {
        const paidDate = new Date(p.invoicePaidAt);
        if (paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear) {
          revenueThisMonth += quoteTotal;
        }
      }

      // Pending revenue (approved/scheduled but not paid)
      if ((p.status === 'approved' || p.status === 'scheduled') && !p.invoicePaidAt) {
        pendingRevenue += quoteTotal;
      }

      // Overdue invoices - quoted projects older than 14 days without approval
      // or approved/scheduled projects older than 30 days without payment
      if (p.status === 'quoted') {
        const projectDate = new Date(p.date);
        const daysSinceQuote = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceQuote > 7) {
          overdueRevenue += quoteTotal;
          overdueProjects.push(p);
        }
      } else if ((p.status === 'approved' || p.status === 'scheduled' || p.status === 'completed') && !p.invoicePaidAt) {
        const projectDate = new Date(p.date);
        const daysSinceApproval = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceApproval > 14) {
          overdueRevenue += quoteTotal;
          overdueProjects.push(p);
        }
      }
    });

    const avgQuoteValue = quoteCount > 0 ? Math.round(totalQuoteValue / quoteCount) : 0;

    return {
      // Conversion funnel
      draftToQuotedRate,
      quotedToApprovedRate,
      approvedToCompletedRate,
      // Revenue
      revenueThisMonth,
      pendingRevenue,
      overdueRevenue,
      overdueProjects,
      // Quick stats
      avgQuoteValue,
      totalProjects,
      activeProjects: statusCounts.approved + statusCounts.scheduled
    };
  }, [projects, statusCounts]);

  // Memoized filtered project lists (includes search and status filtering)
  const filteredUnapprovedProjects = useMemo(() =>
      projects.filter(p => {
          // Status must be draft or quoted for this tab
          if (p.status !== 'draft' && p.status !== 'quoted') return false;
          // Apply status filter if not 'all'
          if (statusFilter !== 'all' && p.status !== statusFilter) return false;
          // Apply search filter
          const searchLower = searchTerm.toLowerCase();
          return (
              p.name.toLowerCase().includes(searchLower) ||
              p.date.includes(searchTerm) ||
              p.quote?.clientDetails?.name?.toLowerCase().includes(searchLower) ||
              p.quote?.clientDetails?.email?.toLowerCase().includes(searchLower) ||
              p.quote?.clientDetails?.phone?.includes(searchTerm)
          );
      }),
      [projects, searchTerm, statusFilter]
  );

  const filteredApprovedProjects = useMemo(() =>
      projects.filter(p => {
          // Status must be approved, scheduled, or completed for this tab
          if (p.status !== 'approved' && p.status !== 'scheduled' && p.status !== 'completed') return false;
          // Apply status filter if not 'all'
          if (statusFilter !== 'all' && p.status !== statusFilter) return false;
          // Apply search filter
          const searchLower = searchTerm.toLowerCase();
          return (
              p.name.toLowerCase().includes(searchLower) ||
              p.date.includes(searchTerm) ||
              p.quote?.clientDetails?.name?.toLowerCase().includes(searchLower) ||
              p.quote?.clientDetails?.email?.toLowerCase().includes(searchLower) ||
              p.quote?.clientDetails?.phone?.includes(searchTerm)
          );
      }),
      [projects, searchTerm, statusFilter]
  );

  // Unified pipeline filter for the new simplified navigation
  // Includes role-based filtering: salespeople only see their assigned projects
  // Also filters by selected location
  const filteredPipelineProjects = useMemo(() =>
      filteredProjectsByLocation.filter(p => {
          // Role-based filtering: salespeople only see their assigned projects
          if (role === 'salesperson' && user?.id) {
              // If project has assignments, check if current user is assigned
              if (p.assignedTo && p.assignedTo.length > 0) {
                  if (!p.assignedTo.includes(user.id)) return false;
              }
              // If no assignments yet, show all (legacy projects)
          }

          // Technicians only see their assigned projects (scheduled/approved)
          if (role === 'technician' && user?.id) {
              if (p.assignedTechnicianId && p.assignedTechnicianId !== user.id) return false;
              // Only show scheduled or approved projects for technicians
              if (p.status !== 'scheduled' && p.status !== 'approved') return false;
          }

          // Apply pipeline status filter
          if (pipelineStatusFilter !== 'all') {
              if (pipelineStatusFilter === 'draft' && p.status !== 'draft') return false;
              if (pipelineStatusFilter === 'quoted' && p.status !== 'quoted') return false;
              if (pipelineStatusFilter === 'approved' && p.status !== 'approved') return false;
              if (pipelineStatusFilter === 'scheduled' && p.status !== 'scheduled') return false;
              if (pipelineStatusFilter === 'completed' && p.status !== 'completed') return false;
          }
          // Apply search filter
          const searchLower = searchTerm.toLowerCase();
          return (
              p.name.toLowerCase().includes(searchLower) ||
              p.date.includes(searchTerm) ||
              p.quote?.clientDetails?.name?.toLowerCase().includes(searchLower) ||
              p.quote?.clientDetails?.email?.toLowerCase().includes(searchLower) ||
              p.quote?.clientDetails?.phone?.includes(searchTerm)
          );
      }),
      [filteredProjectsByLocation, searchTerm, pipelineStatusFilter, role, user?.id]
  );

  // Authentication is now handled by AuthWrapper

  // 2. Show Loading State while checking API Key
  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading System...</div>;
  }

  // 3. Show API Key Setup if authorized (no env var AND no IDX shim key)
  if (!isAuthorized) {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
            <div className="max-w-md text-center space-y-8 p-12 bg-[#111] rounded-[28px] shadow-2xl border border-white/10">
                <div className="flex flex-col items-center gap-2">
                     <h1 className="text-4xl font-bold text-[#F6B45A] tracking-tight font-serif">Omnia</h1>
                     <span className="text-gray-300 font-bold italic text-sm tracking-[0.2em] uppercase font-serif">Light Scape Pro</span>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <p className="text-gray-300 text-sm leading-relaxed">
                      To access the advanced <span className="text-[#F6B45A] font-bold">Gemini 3 Pro</span> model, please configure your API Key in the application settings.
                  </p>
                </div>
                {/* Only show the connect button if we are in a dev environment that supports it */}
                {(window as any).aistudio ? (
                    <button
                        onClick={requestApiKey}
                        className="w-full bg-[#F6B45A] text-[#050505] rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all"
                    >
                        Connect API Key (Dev Mode)
                    </button>
                ) : (
                    <div className="text-red-400 text-xs mt-4 border border-red-900/50 p-2 rounded bg-red-900/20">
                        Environment Variable <code>VITE_GEMINI_API_KEY</code> is missing.
                    </div>
                )}
            </div>
        </div>
    );
  }

  // 4. Client Portal (no auth required)
  if (currentPath.startsWith('/portal')) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    return <ClientPortal initialToken={token} />;
  }

  // 4b. Accept Invite page (no auth required - handles auth internally)
  if (currentPath.startsWith('/invite/')) {
    const token = currentPath.replace('/invite/', '');
    return <AcceptInvite token={token} />;
  }

  // 5. Show Billing Success page
  if (currentPath === '/billing/success') {
    return (
      <AuthWrapper>
        <BillingSuccess onContinue={handleBillingContinue} />
      </AuthWrapper>
    );
  }

  // 5. Show Billing Canceled page
  if (currentPath === '/billing/canceled') {
    return (
      <AuthWrapper>
        <BillingCanceled onContinue={handleBillingContinue} onRetry={handleBillingRetry} />
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="flex flex-col h-screen overflow-hidden bg-[#050505]">
      <Header
        onRequestUpgrade={() => setShowPricing(true)}
        subscriptionStatus={{
          hasActiveSubscription: subscription.hasActiveSubscription,
          remainingFreeGenerations: subscription.remainingFreeGenerations,
          freeTrialLimit: subscription.freeTrialLimit,
          isLoading: subscription.isLoading,
        }}
        hideLogoForAnimation={isLoading}
      />
      
      {/* Hidden PDF Generation Container */}
      <div style={{ position: 'absolute', left: '-5000px', top: 0, width: '1000px', height: '0', overflow: 'hidden' }}>
          {pdfProject && pdfProject.quote && (
              <QuoteView
                  onSave={() => {}}
                  initialData={pdfProject.quote}
                  companyProfile={companyProfile}
                  defaultPricing={pricing}
                  containerId={`quote-pdf-${pdfProject.id}`}
                  hideToolbar={true}
                  projectImage={pdfProject.image}
              />
          )}
      </div>

      {/* Full Screen Image Modal */}
      {isFullScreen && generatedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
          <button 
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 hover:scale-110 transition-all z-[101]"
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <img 
            src={generatedImage} 
            alt="Full Screen Result" 
            className="w-full h-full object-contain p-4 select-none"
          />
        </div>
      )}

      {/* Fixture Configuration Modal (Premium Bottom Sheet) */}
      <AnimatePresence>
      {activeConfigFixture && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
              {/* Backdrop with blur */}
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setActiveConfigFixture(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* Modal */}
              <motion.div
                className="relative w-full sm:max-w-lg bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 sm:rounded-2xl rounded-t-3xl shadow-2xl shadow-black/50 max-h-[85vh] sm:max-h-[70vh] flex flex-col overflow-hidden"
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                  {/* Decorative top line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F6B45A]/50 to-transparent" />

                  {/* Header */}
                  <div className="p-5 sm:p-6 shrink-0 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                            {getActiveFixtureTitle()}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Choose placement areas</p>
                      </div>
                      <motion.button
                        onClick={() => setActiveConfigFixture(null)}
                        className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                          <X className="w-5 h-5" />
                      </motion.button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 px-5 sm:px-6 pb-4 overflow-y-auto">
                      <div className="space-y-2">
                          {getCurrentSubOptions().map((opt, index) => {
                              const isSelected = pendingOptions.includes(opt.id);
                              return (
                                  <motion.button
                                    key={opt.id}
                                    onClick={() => togglePendingOption(opt.id)}
                                    className={`group w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                                        isSelected
                                            ? 'bg-[#F6B45A] border-[#F6B45A] shadow-[0_0_20px_rgba(246,180,90,0.3)]'
                                            : 'bg-[#0d0d0d] border-white/5 hover:border-[#F6B45A]/40 hover:bg-[#F6B45A]/5'
                                    }`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                      <div className="flex flex-col items-start text-left">
                                          <span className={`text-sm font-semibold transition-colors ${
                                              isSelected ? 'text-black' : 'text-white group-hover:text-[#F6B45A]'
                                          }`}>
                                              {opt.label}
                                          </span>
                                          <span className={`text-xs mt-0.5 transition-colors ${
                                              isSelected ? 'text-black/60' : 'text-gray-500'
                                          }`}>
                                              {opt.description}
                                          </span>
                                      </div>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-4 transition-all ${
                                          isSelected
                                              ? 'bg-black/20'
                                              : 'border border-white/20 group-hover:border-[#F6B45A]/50'
                                      }`}>
                                          <AnimatePresence>
                                              {isSelected && (
                                                  <motion.div
                                                      initial={{ scale: 0 }}
                                                      animate={{ scale: 1 }}
                                                      exit={{ scale: 0 }}
                                                  >
                                                      <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                                                  </motion.div>
                                              )}
                                          </AnimatePresence>
                                      </div>
                                  </motion.button>
                              )
                          })}
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 sm:p-6 pt-4 border-t border-white/5 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                          <motion.button
                            onClick={() => setActiveConfigFixture(null)}
                            className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 font-medium text-sm hover:bg-white/5 hover:text-white transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                              Cancel
                          </motion.button>
                          <motion.button
                            onClick={confirmFixtureSelection}
                            className="flex-[2] bg-[#F6B45A] text-black font-semibold py-3.5 rounded-xl hover:bg-[#ffc67a] transition-all shadow-lg shadow-[#F6B45A]/20 text-sm flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                              <Check className="w-4 h-4" />
                              Confirm
                          </motion.button>
                      </div>
                      {pendingOptions.length > 0 && (
                          <p className="text-center text-xs text-gray-500 mt-3">
                              {pendingOptions.length} option{pendingOptions.length !== 1 ? 's' : ''} selected
                          </p>
                      )}
                  </div>
              </motion.div>
          </div>
      )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence initial={false}>
          {/* TAB: EDITOR */}
          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              initial={{ x: tabDirection * 100 + '%' }}
              animate={{ x: 0 }}
              exit={{ x: tabDirection * -100 + '%' }}
              transition={{ type: 'spring', stiffness: 700, damping: 45 }}
              className="absolute inset-0 h-full overflow-y-auto overflow-x-hidden bg-[#050505] pb-24 md:pb-20">
              {/* Background Ambient Glow */}
              <div className="absolute top-[-10%] left-[20%] w-[60%] h-[500px] bg-[#F6B45A]/5 blur-[120px] rounded-full pointer-events-none"></div>

              <div className="max-w-4xl mx-auto min-h-full p-4 md:p-8 flex flex-col justify-start md:justify-center relative z-10">
                
                {/* MODE 1: RESULT VIEW (Generated Image Only) */}
                {generatedImage ? (
                <motion.div
                    className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0a0a0a] to-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 min-h-[500px]"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >

                    {/* Top Action Bar */}
                    <div className="absolute top-5 left-0 right-0 z-40 flex justify-center gap-3 px-4">
                        <motion.button
                            onClick={() => setShowSaveImageModal(true)}
                            className="bg-[#F6B45A] text-[#111] px-6 py-3 rounded-xl font-semibold text-xs hover:bg-[#ffc67a] transition-all shadow-xl shadow-[#F6B45A]/20 flex items-center gap-2"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FolderPlus className="w-4 h-4" />
                            Save
                        </motion.button>
                    </div>

                    {/* Main Image */}
                    <div className="flex-1 relative flex items-center justify-center bg-[#030303] overflow-hidden group">
                        <img
                            src={generatedImage}
                            alt="Generated Result"
                            className="w-full h-full object-contain cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.02]"
                            onClick={() => setIsFullScreen(true)}
                        />

                        {/* Subtle vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

                        {/* Corner accents */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#F6B45A]/30 rounded-tl" />
                            <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#F6B45A]/30 rounded-tr" />
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#F6B45A]/30 rounded-bl" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#F6B45A]/30 rounded-br" />
                        </div>

                        {/* Feedback / Loading Overlay */}
                        {isLoading && (
                            <motion.div
                                className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="w-16 h-16 border-3 border-[#F6B45A]/20 border-t-[#F6B45A] rounded-full animate-spin mb-6" />
                                <p className="font-semibold text-sm text-[#F6B45A] tracking-wide">Creating your vision...</p>
                                <p className="text-xs text-gray-500 mt-2">Analyzing lighting paths</p>
                            </motion.div>
                        )}
                    </div>

                    {/* History Thumbnail Strip with Settings Info */}
                    {generationHistory.length > 1 && (
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-full px-4">
                            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 mx-auto max-w-fit">
                                {generationHistory.map((entry, index) => {
                                    const isCurrentImage = entry.image === generatedImage;
                                    return (
                                        <div key={entry.id} className="relative group">
                                            <button
                                                onClick={() => setGeneratedImage(entry.image)}
                                                className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
                                                    isCurrentImage
                                                        ? 'ring-2 ring-[#F6B45A] scale-110'
                                                        : 'ring-1 ring-white/20 hover:ring-white/40 opacity-60 hover:opacity-100'
                                                }`}
                                                title={`Generation ${index + 1}`}
                                            >
                                                <img
                                                    src={entry.image}
                                                    alt={`Generation ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold bg-black/70 text-white px-1 rounded">
                                                    {index + 1}
                                                </span>
                                            </button>
                                            {/* Settings Tooltip on Hover */}
                                            {entry.settings && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                                                    <div className="bg-[#111] border border-white/20 rounded-xl p-3 shadow-2xl min-w-[200px] text-left">
                                                        <div className="text-[10px] font-bold text-[#F6B45A] uppercase tracking-wider mb-2">Settings Used</div>
                                                        <div className="space-y-1 text-[10px]">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Color Temp:</span>
                                                                <span className="text-white">{entry.settings.colorTemp}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Intensity:</span>
                                                                <span className="text-white">{entry.settings.lightIntensity}%</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Beam Angle:</span>
                                                                <span className="text-white">{entry.settings.beamAngle}°</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Fixtures:</span>
                                                                <span className="text-white">{entry.settings.selectedFixtures.length}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Apply these settings
                                                                setSelectedFixtures(entry.settings!.selectedFixtures);
                                                                setFixtureSubOptions(entry.settings!.fixtureSubOptions);
                                                                setColorTemp(entry.settings!.colorTemp);
                                                                setLightIntensity(entry.settings!.lightIntensity);
                                                                setBeamAngle(entry.settings!.beamAngle);
                                                                if (entry.settings!.prompt) setPrompt(entry.settings!.prompt);
                                                                showToast('success', 'Settings applied from history!');
                                                            }}
                                                            className="mt-2 w-full py-1.5 bg-[#F6B45A]/20 border border-[#F6B45A]/30 rounded-lg text-[#F6B45A] text-[10px] font-bold hover:bg-[#F6B45A]/30 transition-colors"
                                                        >
                                                            Apply These Settings
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Floating Controls Bar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 w-full px-4">

                        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl">
                            
                            <button
                                onClick={() => {
                                    setIsLiked(!isLiked);
                                    if (!isLiked) {
                                        handleDownload();
                                        // Save positive feedback for AI learning
                                        saveFeedback('liked');
                                    }
                                }}
                                className={`p-3 rounded-full transition-all duration-200 ${isLiked ? 'bg-[#F6B45A] text-[#111]' : 'hover:bg-white/10 text-white'}`}
                                title="Like & Download"
                            >
                                <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                            
                            <button 
                                onClick={() => setShowFeedback(true)}
                                className={`p-3 rounded-full transition-all duration-200 ${showFeedback ? 'bg-red-500/90 text-white' : 'hover:bg-white/10 text-white'}`}
                                title="Changes Needed"
                            >
                                <ThumbsDown className="w-5 h-5" />
                            </button>

                            <div className="w-px h-5 bg-white/10 mx-1"></div>

                            <button 
                                onClick={handleCloseResult}
                                className="p-3 rounded-full hover:bg-white/10 text-white transition-all"
                                title="Start Over"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                         <button 
                            onClick={() => setIsFullScreen(true)}
                            className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/50 hover:text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                            <Maximize2 className="w-3 h-3" />
                            Expand View
                        </button>
                    </div>

                    {/* Feedback Modal Overlay */}
                    {showFeedback && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                            <div className="w-full max-w-md bg-[#111] rounded-2xl p-6 shadow-2xl border border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-white font-serif">Refine Scene</h3>
                                    <button onClick={() => setShowFeedback(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                        <X className="w-5 h-5"/>
                                    </button>
                                </div>
                                <textarea 
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    className="w-full h-32 p-4 rounded-xl border border-white/10 bg-black/50 text-white text-sm focus:border-[#F6B45A] focus:ring-1 focus:ring-[#F6B45A] outline-none resize-none mb-4 font-mono"
                                    placeholder="Describe specific changes (e.g., 'Remove the tree light', 'Make it warmer')..."
                                    autoFocus
                                />
                                <button 
                                    onClick={handleFeedbackRegenerate}
                                    disabled={!feedbackText.trim() || isLoading}
                                    className="w-full bg-[#F6B45A] text-[#111] py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#ffc67a] flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
                ) : (
                // MODE 2: INPUT VIEW
                <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loading-screen"
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.4 } }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Background ambient effects */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Enhanced radial gradient backdrop with warm center glow */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: 'radial-gradient(ellipse at center, rgba(246,180,90,0.05) 0%, rgba(0,0,0,0.98) 50%, rgba(0,0,0,1) 100%)'
                                }}
                            />
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    background: 'radial-gradient(ellipse at center, rgba(246,180,90,0.12) 0%, rgba(246,180,90,0.04) 30%, transparent 60%)'
                                }}
                                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />

                            {/* Floating light particles in background */}
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={`bg-particle-${i}`}
                                    className="absolute w-1 h-1 rounded-full bg-[#F6B45A]/30"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`
                                    }}
                                    animate={{
                                        y: [0, -100, 0],
                                        opacity: [0, 0.6, 0],
                                        scale: [0, 1, 0]
                                    }}
                                    transition={{
                                        duration: 4 + Math.random() * 3,
                                        repeat: Infinity,
                                        delay: Math.random() * 3,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>

                        {/* Main eclipse/sun animation container */}
                        <div className="relative mb-10">
                            {/* Logo travels from header to middle, presses button, INSTANTLY disappears */}
                            <motion.div
                                className="absolute pointer-events-none z-30"
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    left: '50%',
                                    top: '50%',
                                    marginLeft: '-24px',
                                    marginTop: '-24px',
                                }}
                                initial={{
                                    y: -305,
                                    x: -225,
                                    scale: 0,
                                    opacity: 0
                                }}
                                animate={{
                                    y: [-305, -305, 0, 5, 5], // Header position, wait, travel to center, push into button
                                    x: [-225, -225, 0, 0, 0], // From header left to center
                                    scale: [0, 0.6, 1, 0.8, 0], // Appears small, grows, shrinks as it pushes, GONE
                                    opacity: [0, 1, 1, 1, 0] // Visible until it pushes then instantly gone
                                }}
                                transition={{
                                    duration: 11,
                                    times: [0, 0.12, 0.75, 0.76, 0.77], // Appears at 12%, arrives 75%, pushes 76%, GONE by 77%
                                    ease: "easeInOut"
                                }}
                            >
                                {/* Simplified Penrose Triangle Logo */}
                                <svg viewBox="0 0 48 48" className="w-full h-full">
                                    <defs>
                                        <linearGradient id="dropLogoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#FFD700" />
                                            <stop offset="100%" stopColor="#F6B45A" />
                                        </linearGradient>
                                        <linearGradient id="dropLogoGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#D4973D" />
                                            <stop offset="100%" stopColor="#F6B45A" />
                                        </linearGradient>
                                        <filter id="dropLogoGlow">
                                            <feGaussianBlur stdDeviation="2" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <path
                                        d="M24 6 L10 30 L14 30 L24 12 L34 30 L24 30 L24 34 L38 34 L24 6"
                                        fill="url(#dropLogoGrad1)"
                                        filter="url(#dropLogoGlow)"
                                    />
                                    <path
                                        d="M38 34 L24 34 L24 30 L34 30 L28 20 L32 20 L42 38 L38 38 L38 34"
                                        fill="url(#dropLogoGrad2)"
                                        filter="url(#dropLogoGlow)"
                                    />
                                    <path
                                        d="M6 38 L10 30 L14 30 L10 38 L38 38 L42 38 L6 38"
                                        fill="#B8860B"
                                        filter="url(#dropLogoGlow)"
                                    />
                                </svg>
                            </motion.div>

                            {/* === SMALLER EXPLOSION - When logo presses button at 8.25s === */}

                            {/* Main explosion - reduced size */}
                            <motion.div
                                className="absolute -inset-12 rounded-full pointer-events-none"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.8, 2.5], opacity: [0, 1, 0] }}
                                transition={{ duration: 0.5, ease: "easeOut", delay: 8.25 }}
                                style={{
                                    background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 25%, rgba(246,180,90,0.9) 50%, rgba(246,180,90,0.3) 75%, transparent 100%)'
                                }}
                            />

                            {/* Second explosion wave - reduced */}
                            <motion.div
                                className="absolute -inset-16 rounded-full pointer-events-none"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.5, 2.2], opacity: [0, 0.8, 0] }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: 8.3 }}
                                style={{
                                    background: 'radial-gradient(circle, rgba(246,180,90,0.7) 0%, rgba(246,180,90,0.3) 50%, transparent 100%)'
                                }}
                            />

                            {/* Explosion ring - reduced */}
                            <motion.div
                                className="absolute -inset-14 rounded-full pointer-events-none"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.5, 2.2], opacity: [0, 0.9, 0] }}
                                transition={{ duration: 0.7, ease: "easeOut", delay: 8.35 }}
                                style={{
                                    border: '4px solid rgba(246,180,90,0.8)',
                                    boxShadow: '0 0 40px rgba(246,180,90,0.6), 0 0 60px rgba(246,180,90,0.3)'
                                }}
                            />

                            {/* === REPEATING PULSE - Starts small, grows bigger === */}

                            {/* Main pulsing glow - starts small, expands over time */}
                            <motion.div
                                className="absolute -inset-2 rounded-full pointer-events-none"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: [0.5, 0.8, 0.5, 0.9, 1.0, 0.9, 1.1, 1.3, 1.1],
                                    opacity: [0.3, 0.5, 0.3, 0.5, 0.7, 0.5, 0.6, 0.9, 0.6]
                                }}
                                transition={{
                                    duration: 6,
                                    delay: 9.0,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    background: 'radial-gradient(circle, rgba(246,180,90,0.4) 0%, rgba(246,180,90,0.2) 50%, transparent 100%)',
                                    boxShadow: '0 0 30px rgba(246,180,90,0.5)'
                                }}
                            />

                            {/* Pulsing ring - starts tight, grows outward */}
                            <motion.div
                                className="absolute -inset-4 rounded-full pointer-events-none"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    scale: [0.6, 0.8, 0.6, 0.9, 1.0, 0.9, 1.1, 1.2, 1.1],
                                    opacity: [0.2, 0.4, 0.2, 0.4, 0.6, 0.4, 0.5, 0.7, 0.5]
                                }}
                                transition={{
                                    duration: 6,
                                    delay: 9.0,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    border: '2px solid rgba(246,180,90,0.5)',
                                    boxShadow: '0 0 20px rgba(246,180,90,0.3), inset 0 0 20px rgba(246,180,90,0.1)'
                                }}
                            />

                            {/* Inner core glow - starts small, pulses bigger */}
                            <motion.div
                                className="absolute rounded-full pointer-events-none"
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    left: '50%',
                                    top: '50%',
                                    marginLeft: '-15px',
                                    marginTop: '-15px',
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(246,180,90,0.7) 40%, transparent 100%)',
                                }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: [0.5, 0.8, 0.5, 0.9, 1.2, 0.9, 1.0, 1.4, 1.0],
                                    opacity: [0.4, 0.6, 0.4, 0.6, 0.9, 0.6, 0.7, 1, 0.7]
                                }}
                                transition={{
                                    duration: 6,
                                    delay: 8.8,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />

                            {/* Growing intensity glow ring - expands with progress */}
                            <motion.div
                                className="absolute rounded-full pointer-events-none"
                                style={{
                                    inset: `-${10 + statusMessageIndex * 12}px`,
                                }}
                                animate={{
                                    boxShadow: [
                                        `0 0 ${20 + statusMessageIndex * 25}px rgba(246,180,90,${0.1 + statusMessageIndex * 0.15})`,
                                        `0 0 ${40 + statusMessageIndex * 35}px rgba(246,180,90,${0.2 + statusMessageIndex * 0.18})`,
                                        `0 0 ${20 + statusMessageIndex * 25}px rgba(246,180,90,${0.1 + statusMessageIndex * 0.15})`,
                                    ]
                                }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />

                            {/* Eclipse ring - the main visual with enhanced animations */}
                            <motion.div
                                className="w-28 h-28 md:w-32 md:h-32 rounded-full relative"
                                animate={{
                                    scale: [1, 1.02, 1],
                                    boxShadow: [
                                        '0 0 60px rgba(246,180,90,0.3), inset 0 0 30px rgba(0,0,0,0.8)',
                                        '0 0 80px rgba(246,180,90,0.5), inset 0 0 30px rgba(0,0,0,0.8)',
                                        '0 0 60px rgba(246,180,90,0.3), inset 0 0 30px rgba(0,0,0,0.8)'
                                    ]
                                }}
                                transition={{
                                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)',
                                }}
                            >
                                {/* Golden corona effect */}
                                <motion.div
                                    className="absolute -inset-1 rounded-full"
                                    style={{
                                        background: 'conic-gradient(from 0deg, transparent, rgba(246,180,90,0.6), transparent, rgba(246,180,90,0.4), transparent)',
                                    }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                />

                                {/* Inner shadow for depth */}
                                <div
                                    className="absolute inset-2 rounded-full"
                                    style={{
                                        background: 'radial-gradient(circle at 30% 30%, #1a1a1a, #050505)',
                                        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)'
                                    }}
                                />

                                {/* Bright edge highlight */}
                                <motion.div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'conic-gradient(from 200deg, transparent 0%, rgba(246,180,90,0.9) 10%, rgba(255,220,150,1) 15%, rgba(246,180,90,0.9) 20%, transparent 30%)',
                                    }}
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                />

                                {/* SVG Progress Ring - Colorless until logo hits, then turns gold */}
                                <motion.svg
                                    className="absolute -inset-5 w-[calc(100%+40px)] h-[calc(100%+40px)]"
                                    viewBox="0 0 140 140"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    initial={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}
                                >
                                    {/* Background track - starts gray, turns gold after 8.25s */}
                                    <motion.circle
                                        cx="70"
                                        cy="70"
                                        r="65"
                                        fill="none"
                                        initial={{ stroke: 'rgba(255,255,255,0.15)' }}
                                        animate={{ stroke: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)', 'rgba(246,180,90,0.25)'] }}
                                        transition={{ duration: 8.5, times: [0, 0.97, 1], ease: "easeOut" }}
                                        strokeWidth="5"
                                    />
                                    {/* Animated progress arc - starts white/gray, turns gold after logo hits */}
                                    <motion.circle
                                        cx="70"
                                        cy="70"
                                        r="65"
                                        fill="none"
                                        initial={{ stroke: 'rgba(255,255,255,0.5)' }}
                                        animate={{
                                            strokeDashoffset: showLoadingCelebration ? 0 : [408.4, 286, 204, 122, 61, 30],
                                            stroke: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.5)', 'url(#progressGradient)']
                                        }}
                                        transition={{
                                            strokeDashoffset: { duration: showLoadingCelebration ? 0.5 : 12, ease: "easeOut" },
                                            stroke: { duration: 8.5, times: [0, 0.97, 1], ease: "easeOut" }
                                        }}
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray="408.4"
                                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                    />
                                    {/* Glowing accent dots - start gray/white, turn gold after 8.25s */}
                                    <motion.circle
                                        cx="70"
                                        cy="5"
                                        r="5"
                                        initial={{ fill: '#888888' }}
                                        animate={{ fill: ['#888888', '#888888', '#ffcc70'] }}
                                        transition={{ duration: 8.5, times: [0, 0.97, 1] }}
                                        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
                                    />
                                    <motion.circle
                                        cx="70"
                                        cy="135"
                                        r="4"
                                        initial={{ fill: '#666666' }}
                                        animate={{ fill: ['#666666', '#666666', '#F6B45A'] }}
                                        transition={{ duration: 8.5, times: [0, 0.97, 1] }}
                                        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
                                    />
                                    <motion.circle
                                        cx="5"
                                        cy="70"
                                        r="3.5"
                                        initial={{ fill: '#777777' }}
                                        animate={{ fill: ['#777777', '#777777', '#ffd280'] }}
                                        transition={{ duration: 8.5, times: [0, 0.97, 1] }}
                                        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
                                    />
                                    <motion.circle
                                        cx="135"
                                        cy="70"
                                        r="3.5"
                                        initial={{ fill: '#666666' }}
                                        animate={{ fill: ['#666666', '#666666', '#F6B45A'] }}
                                        transition={{ duration: 8.5, times: [0, 0.97, 1] }}
                                        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
                                    />
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#ffe082" />
                                            <stop offset="30%" stopColor="#ffcc50" />
                                            <stop offset="70%" stopColor="#F6B45A" />
                                            <stop offset="100%" stopColor="#e6a040" />
                                        </linearGradient>
                                    </defs>
                                </motion.svg>

                                {/* Completion flash effect - more dramatic */}
                                <AnimatePresence>
                                    {showLoadingCelebration && (
                                        <>
                                            {/* Gold scale-up burst */}
                                            <motion.div
                                                className="absolute -inset-4 rounded-full bg-gradient-radial from-[#F6B45A] via-[#F6B45A]/50 to-transparent"
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{
                                                    scale: [0.5, 1.5, 1.3],
                                                    opacity: [0, 1, 0]
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                            />
                                            {/* White flash overlay */}
                                            <motion.div
                                                className="absolute inset-0 rounded-full bg-white"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: [0, 1, 0] }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                                            />
                                            {/* Secondary glow ring */}
                                            <motion.div
                                                className="absolute -inset-8 rounded-full"
                                                style={{
                                                    background: 'radial-gradient(circle, rgba(246,180,90,0.4) 0%, transparent 70%)'
                                                }}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{
                                                    scale: [0.8, 1.2],
                                                    opacity: [0, 0.8, 0]
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                        </>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Orbiting particles around the eclipse */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={`orbit-${i}`}
                                    className="absolute w-2 h-2 rounded-full bg-[#F6B45A]"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        boxShadow: '0 0 10px rgba(246,180,90,0.8)'
                                    }}
                                    animate={{
                                        x: [0, Math.cos(i * 60 * Math.PI / 180) * 80, 0],
                                        y: [0, Math.sin(i * 60 * Math.PI / 180) * 80, 0],
                                        scale: [0.5, 1, 0.5],
                                        opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        delay: i * 0.5,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>

                        {/* Title with glow */}
                        <motion.h2
                            className="text-4xl md:text-5xl font-bold text-white font-serif tracking-tight mb-6 relative"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <span className="relative z-10">Omnia AI</span>
                            <motion.span
                                className="absolute inset-0 blur-lg text-[#F6B45A] z-0"
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                Omnia AI
                            </motion.span>
                        </motion.h2>

                        {/* Stepped progress with cycling status messages - HORIZONTAL */}
                        <motion.div
                            className="flex flex-row items-center justify-center gap-3 flex-wrap max-w-md px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {/* All status messages displayed horizontally with active one highlighted */}
                            {statusMessages.map((message, index) => (
                                <motion.span
                                    key={message}
                                    className={`text-xs uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300 ${
                                        index === statusMessageIndex
                                            ? 'text-[#F6B45A] font-bold scale-110'
                                            : index < statusMessageIndex
                                                ? 'text-[#F6B45A]/40'
                                                : 'text-white/20'
                                    }`}
                                    animate={index === statusMessageIndex ? {
                                        textShadow: ['0 0 10px rgba(246,180,90,0.5)', '0 0 20px rgba(246,180,90,0.8)', '0 0 10px rgba(246,180,90,0.5)']
                                    } : {}}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    {message}
                                    {index < statusMessages.length - 1 && <span className="ml-3 text-white/10">•</span>}
                                </motion.span>
                            ))}
                        </motion.div>

                        {/* Progress bar */}
                        <motion.div
                            className="w-48 md:w-64 h-1 bg-white/10 rounded-full mt-8 overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#F6B45A] via-[#ffc67a] to-[#F6B45A] rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: showLoadingCelebration ? '100%' : ['0%', '17%', '34%', '51%', '68%', '85%', '90%', '95%'] }}
                                transition={{
                                    duration: showLoadingCelebration ? 0.5 : 70,
                                    ease: "linear",
                                    times: showLoadingCelebration ? undefined : [0, 0.114, 0.229, 0.343, 0.457, 0.571, 0.786, 1]
                                }}
                            />
                        </motion.div>

                        {/* === CELEBRATION OVERLAY - Shown when generation completes === */}
                        <AnimatePresence>
                            {showLoadingCelebration && (
                                <>
                                    {/* Massive golden light burst from center */}
                                    <motion.div
                                        className="absolute inset-0 pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {/* Radial burst wave 1 */}
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ scale: 0, opacity: 1 }}
                                            animate={{ scale: 4, opacity: 0 }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                        >
                                            <div className="w-40 h-40 rounded-full bg-gradient-radial from-white/80 via-[#F6B45A]/50 to-transparent" />
                                        </motion.div>

                                        {/* Radial burst wave 2 (delayed) */}
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ scale: 0, opacity: 1 }}
                                            animate={{ scale: 3, opacity: 0 }}
                                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                                        >
                                            <div className="w-32 h-32 rounded-full bg-gradient-radial from-[#F6B45A]/90 via-[#ffc67a]/40 to-transparent" />
                                        </motion.div>

                                        {/* Inner glow that persists */}
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0, 0.8, 0.4] }}
                                            transition={{ duration: 1, times: [0, 0.3, 1] }}
                                        >
                                            <div className="w-96 h-96 rounded-full bg-gradient-radial from-[#F6B45A]/30 via-[#F6B45A]/10 to-transparent" />
                                        </motion.div>
                                    </motion.div>

                                    {/* Confetti-like particles that explode outward and settle */}
                                    {[...Array(40)].map((_, i) => {
                                        const angle = (i / 40) * Math.PI * 2;
                                        const radius = 150 + Math.random() * 100;
                                        const targetX = Math.cos(angle) * radius;
                                        const targetY = Math.sin(angle) * radius;
                                        const size = 2 + Math.random() * 4;
                                        const colors = ['#fff', '#F6B45A', '#ffc67a', '#ffe4a0'];
                                        const color = colors[Math.floor(Math.random() * colors.length)];

                                        return (
                                            <motion.div
                                                key={`confetti-${i}`}
                                                className="absolute rounded-full pointer-events-none"
                                                style={{
                                                    width: size,
                                                    height: size,
                                                    backgroundColor: color,
                                                    left: '50%',
                                                    top: '50%',
                                                    marginLeft: -size / 2,
                                                    marginTop: -size / 2,
                                                    boxShadow: `0 0 ${size * 2}px ${color}`
                                                }}
                                                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                                animate={{
                                                    x: [0, targetX, targetX + (Math.random() - 0.5) * 50],
                                                    y: [0, targetY, targetY + 100 + Math.random() * 50],
                                                    scale: [0, 1.5, 0.5],
                                                    opacity: [1, 1, 0],
                                                    rotate: [0, Math.random() * 360]
                                                }}
                                                transition={{
                                                    duration: 1.8 + Math.random() * 0.4,
                                                    ease: [0.25, 0.1, 0.25, 1],
                                                    delay: i * 0.015
                                                }}
                                            />
                                        );
                                    })}

                                    {/* Star/sparkle particles */}
                                    {[...Array(12)].map((_, i) => {
                                        const angle = (i / 12) * Math.PI * 2;
                                        const radius = 80 + Math.random() * 60;

                                        return (
                                            <motion.div
                                                key={`star-${i}`}
                                                className="absolute pointer-events-none"
                                                style={{
                                                    left: '50%',
                                                    top: '50%',
                                                }}
                                                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                                animate={{
                                                    x: Math.cos(angle) * radius,
                                                    y: Math.sin(angle) * radius,
                                                    scale: [0, 1, 0],
                                                    opacity: [1, 1, 0]
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    ease: "easeOut",
                                                    delay: 0.2 + i * 0.05
                                                }}
                                            >
                                                <Sparkles className="w-5 h-5 text-[#F6B45A]" style={{ filter: 'drop-shadow(0 0 8px #F6B45A)' }} />
                                            </motion.div>
                                        );
                                    })}

                                    {/* "Complete!" text overlay */}
                                    <motion.div
                                        className="absolute inset-0 flex flex-col items-center justify-center z-50"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, delay: 0.3 }}
                                    >
                                        <motion.div
                                            className="flex items-center gap-3 bg-[#F6B45A] px-8 py-4 rounded-2xl shadow-2xl shadow-[#F6B45A]/40"
                                            initial={{ y: 20 }}
                                            animate={{ y: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                        >
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.4 }}
                                            >
                                                <CheckCircle2 className="w-7 h-7 text-black" />
                                            </motion.div>
                                            <span className="text-black font-bold text-xl tracking-wide">Complete!</span>
                                        </motion.div>

                                        <motion.p
                                            className="text-gray-400 text-sm mt-4"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 }}
                                        >
                                            Preparing your design...
                                        </motion.p>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                <motion.div
                    key="editor-input"
                    className="flex flex-col gap-8 pb-20 md:pb-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                >
                    
                    {/* Image Upload Area */}
                    <div className="relative">
                        <ImageUpload 
                            currentImage={file}
                            previewUrl={previewUrl}
                            onImageSelect={handleImageSelect}
                            onClear={handleClear}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col gap-6">
                        
                        {/* Premium Fixture Selection */}
                        <div className="flex flex-col gap-5">
                            {/* Section Header with Presets */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#F6B45A]/15 to-[#F6B45A]/5 border border-[#F6B45A]/20 shadow-lg shadow-[#F6B45A]/5">
                                            <Sparkles className="w-4 h-4 text-[#F6B45A]" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-white tracking-tight">Select Fixtures</h3>
                                            <p className="text-xs text-gray-500">Choose lighting types to include</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-500 bg-white/5 px-2.5 py-1 rounded-full">
                                        {selectedFixtures.length} selected
                                    </span>
                                </div>
                                {/* Presets Row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {fixturePresets.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Presets:</span>
                                            {fixturePresets.map(preset => (
                                                <div key={preset.id} className="relative group">
                                                    <button
                                                        onClick={() => handleApplyPreset(preset)}
                                                        className="px-2.5 py-1 text-[10px] font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
                                                    >
                                                        {preset.name}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePreset(preset.id)}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-2.5 h-2.5 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedFixtures.length > 0 && (
                                        <button
                                            onClick={() => setShowSavePresetModal(true)}
                                            className="px-2.5 py-1 text-[10px] font-medium bg-[#F6B45A]/10 border border-[#F6B45A]/20 text-[#F6B45A] rounded-full hover:bg-[#F6B45A]/20 hover:border-[#F6B45A]/40 transition-all flex items-center gap-1"
                                        >
                                            <Save className="w-3 h-3" />
                                            Save Preset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Fixture Grid - Premium minimal buttons */}
                            <div className="flex flex-wrap gap-2 md:gap-3">
                                {FIXTURE_TYPES.map((ft) => {
                                    const isSelected = selectedFixtures.includes(ft.id);
                                    const subOpts = fixtureSubOptions[ft.id];
                                    const hasSubOpts = subOpts && subOpts.length > 0;

                                    const getSubLabel = (id: string) => {
                                        return ft.subOptions?.find(o => o.id === id)?.label || '';
                                    };

                                    return (
                                        <motion.button
                                            key={ft.id}
                                            onClick={() => toggleFixture(ft.id)}
                                            className={`group relative overflow-visible rounded-full transition-all duration-300 ${
                                                isSelected
                                                    ? 'bg-[#F6B45A]'
                                                    : 'bg-[#0d0d0d] hover:bg-[#F6B45A]/10 active:bg-[#F6B45A]'
                                            }`}
                                            initial={false}
                                            animate={{
                                                y: isSelected ? -3 : 0,
                                                boxShadow: isSelected
                                                    ? '0 8px 32px rgba(246,180,90,0.5), 0 4px 12px rgba(246,180,90,0.3), 0 0 0 1px rgba(246,180,90,0.2)'
                                                    : '0 0 0 rgba(246,180,90,0)'
                                            }}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            {/* Gold underglow effect when selected */}
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        className="absolute -bottom-2 left-1/2 w-3/4 h-4 rounded-full pointer-events-none"
                                                        style={{
                                                            background: 'radial-gradient(ellipse at center, rgba(246,180,90,0.6) 0%, transparent 70%)',
                                                            filter: 'blur(8px)',
                                                            transform: 'translateX(-50%)'
                                                        }}
                                                        initial={{ opacity: 0, scaleX: 0.5 }}
                                                        animate={{ opacity: 1, scaleX: 1 }}
                                                        exit={{ opacity: 0, scaleX: 0.5 }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                )}
                                            </AnimatePresence>

                                            {/* Border with hover color change */}
                                            <div className={`absolute inset-0 rounded-full border transition-all duration-200 ${
                                                isSelected
                                                    ? 'border-[#F6B45A]'
                                                    : 'border-white/10 group-hover:border-[#F6B45A]/50 group-active:border-[#F6B45A]'
                                            }`} />

                                            {/* Sparkle/twinkle effect when selected */}
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <>
                                                        {[...Array(4)].map((_, i) => (
                                                            <motion.div
                                                                key={`sparkle-${ft.id}-${i}`}
                                                                className="absolute w-1 h-1 bg-white rounded-full pointer-events-none"
                                                                style={{
                                                                    left: `${20 + i * 20}%`,
                                                                    top: '50%'
                                                                }}
                                                                initial={{ opacity: 0, scale: 0, y: 0 }}
                                                                animate={{
                                                                    opacity: [0, 1, 0],
                                                                    scale: [0, 1.5, 0],
                                                                    y: [0, -15 - i * 5, -25 - i * 5],
                                                                    x: [(i - 1.5) * 5, (i - 1.5) * 10]
                                                                }}
                                                                transition={{
                                                                    duration: 0.6,
                                                                    delay: i * 0.08,
                                                                    ease: "easeOut"
                                                                }}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </AnimatePresence>

                                            {/* Content */}
                                            <div className="relative z-10 flex items-center gap-2 py-2.5 px-5 md:py-3 md:px-6">
                                                {/* Label with hover color change */}
                                                <span className={`text-xs md:text-sm font-semibold tracking-wide transition-colors duration-200 whitespace-nowrap ${
                                                    isSelected
                                                        ? 'text-black'
                                                        : 'text-gray-400 group-hover:text-[#F6B45A] group-active:text-black'
                                                }`}>
                                                    {ft.label}
                                                </span>

                                                {/* Sub-options indicator */}
                                                <AnimatePresence mode="wait">
                                                    {hasSubOpts && (
                                                        <motion.span
                                                            key="subopts-badge"
                                                            initial={{ opacity: 0, scale: 0.8, width: 0 }}
                                                            animate={{ opacity: 1, scale: 1, width: 'auto' }}
                                                            exit={{ opacity: 0, scale: 0.8, width: 0 }}
                                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                                                                isSelected
                                                                    ? 'bg-black/15 text-black/70'
                                                                    : 'bg-white/10 text-gray-500 group-hover:bg-[#F6B45A]/20 group-hover:text-[#F6B45A]'
                                                            }`}
                                                        >
                                                            +{subOpts.length}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>

                                                {/* Checkmark when selected - with sparkle */}
                                                <AnimatePresence>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0, opacity: 0, rotate: -180 }}
                                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                            exit={{ scale: 0, opacity: 0 }}
                                                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                        >
                                                            <Check className="w-4 h-4 text-black" strokeWidth={2.5} />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Premium Custom Notes Input */}
                        <div className="relative mt-2">
                            {/* Section Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                                        <Settings2 className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white tracking-tight">Additional Notes</h3>
                                        <p className="text-xs text-gray-500">Add specific instructions</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Optional</span>
                            </div>

                            {/* Textarea Container */}
                            <div className="relative group">
                                {/* Gradient border effect on focus */}
                                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#F6B45A]/0 via-[#F6B45A]/0 to-[#F6B45A]/0 group-focus-within:from-[#F6B45A]/40 group-focus-within:via-[#F6B45A]/20 group-focus-within:to-[#F6B45A]/40 transition-all duration-500 blur-[2px]" />

                                <div className="relative bg-gradient-to-b from-white/[0.03] to-black/30 rounded-2xl border border-white/10 group-focus-within:border-[#F6B45A]/30 transition-all duration-300 overflow-hidden shadow-lg shadow-black/20">
                                    <textarea
                                        className="w-full h-14 md:h-16 bg-transparent p-4 md:p-5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none resize-none"
                                        placeholder="Add fixture types and number of fixtures for it to be auto generated in the quote."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        maxLength={500}
                                    />

                                    {/* Bottom bar with character count */}
                                    <div className="flex items-center justify-end px-4 py-2.5 border-t border-white/5 bg-black/20">
                                        <span className={`text-[10px] font-medium transition-colors ${
                                            prompt.length > 400 ? 'text-[#F6B45A]' : prompt.length > 0 ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                            {prompt.length}/500
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    className="p-4 bg-gradient-to-r from-red-900/20 to-red-900/10 border border-red-500/30 rounded-xl flex items-center gap-3"
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 shrink-0">
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                    </div>
                                    <p className="text-xs text-red-300 font-medium">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ✨ HERO Generate Button - The Core Action */}
                        <motion.button
                            onClick={(e) => {
                                // Capture click position for ripple effect
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                setRipplePosition({ x, y });
                                setShowRipple(true);
                                setTimeout(() => setShowRipple(false), 600);
                                handleGenerate();
                            }}
                            disabled={!file || (selectedFixtures.length === 0 && !prompt) || isLoading}
                            className="relative w-full overflow-hidden rounded-2xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group mt-2"
                            whileHover={!(!file || (selectedFixtures.length === 0 && !prompt) || isLoading) ? { scale: 1.02, y: -4 } : {}}
                            whileTap={!(!file || (selectedFixtures.length === 0 && !prompt) || isLoading) ? { scale: 0.97 } : {}}
                        >
                            {/* === IDLE STATE: Ambient Glow Pulse === */}
                            <motion.div
                                className="absolute -inset-2 rounded-3xl pointer-events-none"
                                animate={!isLoading ? {
                                    boxShadow: [
                                        '0 0 20px rgba(246, 180, 90, 0.3), 0 0 40px rgba(246, 180, 90, 0.15), 0 0 60px rgba(246, 180, 90, 0.05)',
                                        '0 0 30px rgba(246, 180, 90, 0.5), 0 0 60px rgba(246, 180, 90, 0.25), 0 0 90px rgba(246, 180, 90, 0.1)',
                                        '0 0 20px rgba(246, 180, 90, 0.3), 0 0 40px rgba(246, 180, 90, 0.15), 0 0 60px rgba(246, 180, 90, 0.05)'
                                    ]
                                } : {}}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            />

                            {/* Background gradient - enhanced */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#F6B45A] via-[#ffc67a] to-[#F6B45A] bg-[length:200%_100%] group-hover:animate-gradient-x" />

                            {/* Inner glow enhancement */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/30" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* === PRESS STATE: Gold Ripple Effect === */}
                            <AnimatePresence>
                                {showRipple && (
                                    <motion.div
                                        className="absolute rounded-full bg-white/40 pointer-events-none"
                                        style={{ left: `${ripplePosition.x}%`, top: `${ripplePosition.y}%` }}
                                        initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 0.8 }}
                                        animate={{ width: 600, height: 600, x: '-50%', y: '-50%', opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* === LOADING STATE: Dramatic Light Show === */}
                            <AnimatePresence>
                                {isLoading && (
                                    <motion.div
                                        className="absolute inset-0 z-20 overflow-hidden rounded-2xl"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {/* Pulsing overlay */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10"
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        />

                                        {/* Central energy core */}
                                        <motion.div
                                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                                            style={{
                                                background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 30%, transparent 70%)'
                                            }}
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.6, 1, 0.6]
                                            }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                        />

                                        {/* Rotating light beams */}
                                        <motion.div
                                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        >
                                            {[...Array(6)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="absolute h-0.5 origin-left"
                                                    style={{
                                                        width: '150px',
                                                        rotate: `${i * 60}deg`,
                                                        background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(17,17,17,0.3), transparent)'
                                                    }}
                                                    animate={{
                                                        opacity: [0.4, 1, 0.4],
                                                        scaleX: [0.5, 1, 0.5]
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        delay: i * 0.2,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ))}
                                        </motion.div>

                                        {/* Secondary counter-rotating beams */}
                                        <motion.div
                                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                        >
                                            {[...Array(4)].map((_, i) => (
                                                <div
                                                    key={`beam2-${i}`}
                                                    className="absolute h-px origin-left"
                                                    style={{
                                                        width: '120px',
                                                        rotate: `${i * 90 + 45}deg`,
                                                        background: 'linear-gradient(90deg, rgba(17,17,17,0.6), rgba(17,17,17,0.2), transparent)'
                                                    }}
                                                />
                                            ))}
                                        </motion.div>

                                        {/* Rising spark particles */}
                                        {[...Array(16)].map((_, i) => (
                                            <motion.div
                                                key={`spark-${i}`}
                                                className="absolute w-1 h-1 rounded-full"
                                                style={{
                                                    left: `${15 + (i * 5)}%`,
                                                    background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(17,17,17,0.7)'
                                                }}
                                                initial={{ bottom: '40%', opacity: 0, scale: 0 }}
                                                animate={{
                                                    bottom: ['40%', '110%'],
                                                    opacity: [0, 1, 1, 0],
                                                    scale: [0, 1.2, 0.8, 0],
                                                    x: [(i % 2 === 0 ? -20 : 20), (i % 2 === 0 ? 20 : -20)]
                                                }}
                                                transition={{
                                                    duration: 2 + (i * 0.08),
                                                    repeat: Infinity,
                                                    delay: i * 0.1,
                                                    ease: "easeOut"
                                                }}
                                            />
                                        ))}

                                        {/* Horizontal shimmer wave */}
                                        <motion.div
                                            className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                            animate={{ x: ['-100%', '400%'] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* === COMPLETE STATE: Golden Burst & Particles === */}
                            <AnimatePresence>
                                {generationComplete && (
                                    <>
                                        {/* Golden light burst */}
                                        <motion.div
                                            className="absolute inset-0 pointer-events-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0, 1, 0] }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.8 }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-radial from-white/60 via-[#F6B45A]/30 to-transparent" />
                                        </motion.div>

                                        {/* Celebration particles that settle */}
                                        {[...Array(20)].map((_, i) => (
                                            <motion.div
                                                key={`celebrate-${i}`}
                                                className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                                                style={{
                                                    left: `${20 + Math.random() * 60}%`,
                                                    background: i % 3 === 0 ? '#fff' : i % 3 === 1 ? '#F6B45A' : '#ffc67a'
                                                }}
                                                initial={{
                                                    top: '50%',
                                                    opacity: 1,
                                                    scale: 1
                                                }}
                                                animate={{
                                                    top: ['50%', `${-20 - Math.random() * 30}%`, `${100 + Math.random() * 20}%`],
                                                    opacity: [1, 1, 0],
                                                    scale: [1, 1.5, 0.5],
                                                    x: [(Math.random() - 0.5) * 100]
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{
                                                    duration: 1.8 + Math.random() * 0.5,
                                                    ease: [0.25, 0.46, 0.45, 0.94],
                                                    delay: i * 0.03
                                                }}
                                            />
                                        ))}
                                    </>
                                )}
                            </AnimatePresence>

                            {/* Content - must be above loading effects */}
                            <div className="relative z-30 flex items-center justify-center gap-3 py-5 md:py-6">
                                <motion.div
                                    animate={isLoading ? {
                                        rotate: 360,
                                        scale: [1, 1.1, 1]
                                    } : generationComplete ? {
                                        scale: [1, 1.3, 1],
                                        rotate: [0, 15, -15, 0]
                                    } : {}}
                                    transition={isLoading ? {
                                        rotate: { repeat: Infinity, duration: 1.2, ease: "linear" },
                                        scale: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
                                    } : generationComplete ? {
                                        duration: 0.5
                                    } : {}}
                                >
                                    {isLoading ? (
                                        <Sun className="w-6 h-6 md:w-7 md:h-7 text-[#111]" />
                                    ) : generationComplete ? (
                                        <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-[#111]" />
                                    ) : (
                                        <Wand2 className="w-5 h-5 md:w-6 md:h-6 text-[#111] group-hover:rotate-12 transition-transform duration-300" />
                                    )}
                                </motion.div>
                                <motion.span
                                    className="text-[#111] font-bold text-sm md:text-base tracking-wide"
                                    animate={generationComplete ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                >
                                    {isLoading ? 'Generating...' : generationComplete ? '✨ Complete!' : 'Generate Lighting Scene'}
                                </motion.span>
                            </div>

                            {/* Shine sweep effect - enhanced */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg] pointer-events-none opacity-0 group-hover:opacity-100"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '200%' }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />

                            {/* Border highlight */}
                            <div className="absolute inset-0 rounded-2xl border border-white/40 pointer-events-none" />
                        </motion.button>
                    </div>
                </motion.div>
                )}
                </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <motion.div
              key="projects"
              initial={{ x: tabDirection * 100 + '%' }}
              animate={{ x: 0 }}
              exit={{ x: tabDirection * -100 + '%' }}
              transition={{ type: 'spring', stiffness: 700, damping: 45 }}
              className="absolute inset-0 h-full overflow-y-auto overflow-x-hidden bg-[#050505] pb-24 md:pb-20"
            >
              {/* Background Tech Mesh/Glow */}
              <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(246, 180, 90, 0.05) 0%, transparent 50%)' }}></div>
              <div className="fixed inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

             <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">

                 {/* High-End Header */}
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 mb-6 border-b border-white/5 pb-6">
                     {/* Mobile: Title and Search in same row */}
                     <div className="flex items-start justify-between w-full md:w-auto gap-3">
                        <div className="flex-1 md:flex-none">
                           <h2 className="text-2xl md:text-4xl font-bold text-white font-serif tracking-tight mb-1 md:mb-2">Project Library</h2>
                           <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#F6B45A] animate-pulse"></div>
                                <span className="text-[9px] md:text-[10px] text-gray-300 font-mono uppercase tracking-widest">Active: {projects.length}</span>
                           </div>
                        </div>

                        {/* Mobile Search Icon/Input */}
                        <div className="md:hidden flex items-center gap-2">
                           <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                  <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#F6B45A] transition-colors" />
                              </div>
                              <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="block w-28 pl-8 pr-2 py-2 border border-white/10 rounded-lg leading-5 bg-[#111] text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-black focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 text-xs font-mono transition-all"
                                  placeholder="Search..."
                              />
                           </div>
                           <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                              className="py-2 px-2 border border-white/10 rounded-lg bg-[#111] text-gray-200 text-xs font-mono focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50"
                           >
                              <option value="all" className="bg-[#1a1a1a] text-white">All</option>
                              <option value="draft" className="bg-[#1a1a1a] text-white">Draft</option>
                              <option value="quoted" className="bg-[#1a1a1a] text-white">Quoted</option>
                              <option value="approved" className="bg-[#1a1a1a] text-white">Approved</option>
                              <option value="scheduled" className="bg-[#1a1a1a] text-white">Scheduled</option>
                              <option value="completed" className="bg-[#1a1a1a] text-white">Completed</option>
                           </select>
                        </div>
                     </div>

                     {/* Desktop Search Bar and Filter */}
                     <div className="hidden md:flex items-center gap-3">
                        <div className="w-72 relative group">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                               <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#F6B45A] transition-colors" />
                           </div>
                           <input
                               type="text"
                               value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-[#111] text-gray-200 placeholder-gray-400 focus:outline-none focus:bg-black focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 sm:text-sm font-mono transition-all"
                               placeholder="Search by name or client..."
                           />
                        </div>
                        <select
                           value={statusFilter}
                           onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                           className="py-3 px-4 border border-white/10 rounded-xl bg-[#111] text-gray-200 text-sm font-mono focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 cursor-pointer hover:border-[#F6B45A]/30 transition-colors"
                        >
                           <option value="all" className="bg-[#1a1a1a] text-white">All Statuses</option>
                           <option value="draft" className="bg-[#1a1a1a] text-white">Draft</option>
                           <option value="quoted" className="bg-[#1a1a1a] text-white">Quoted</option>
                           <option value="approved" className="bg-[#1a1a1a] text-white">Approved</option>
                           <option value="scheduled" className="bg-[#1a1a1a] text-white">Scheduled</option>
                           <option value="completed" className="bg-[#1a1a1a] text-white">Completed</option>
                        </select>
                        {(searchTerm || statusFilter !== 'all') && (
                           <button
                              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                              className="py-3 px-4 border border-white/10 rounded-xl bg-[#111] text-gray-400 text-sm font-mono hover:text-white hover:border-red-500/30 transition-colors flex items-center gap-2"
                           >
                              <X className="w-4 h-4" />
                              Clear
                           </button>
                        )}
                     </div>
                 </div>


                 {/* Simplified Navigation: 3 Main Tabs */}
                 <div className="flex items-center gap-2 mb-4">
                     <button
                         onClick={() => setProjectsSubTab('pipeline')}
                         className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
                             projectsSubTab === 'pipeline' || projectsSubTab === 'quotes' || projectsSubTab === 'invoicing'
                                 ? 'bg-[#F6B45A] text-black shadow-lg shadow-[#F6B45A]/30'
                                 : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                         }`}
                     >
                         <FolderPlus className="w-3 md:w-4 h-3 md:h-4" />
                         <span className="hidden sm:inline">Pipeline</span>
                     </button>
                     <button
                         onClick={() => setProjectsSubTab('clients')}
                         className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
                             projectsSubTab === 'clients'
                                 ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                                 : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                         }`}
                     >
                         <Users className="w-3 md:w-4 h-3 md:h-4" />
                         <span className="hidden sm:inline">Clients</span>
                     </button>

                </div>

                 {/* Pipeline Status Bar - Only show when on pipeline view */}
                 {(projectsSubTab === 'pipeline' || projectsSubTab === 'quotes' || projectsSubTab === 'invoicing') && (
                     <>
                         {/* Pipeline Visual Bar */}
                         <div className="mb-4 p-2 bg-white/[0.02] rounded-xl border border-white/5">
                             <div className="flex items-center justify-between gap-1">
                                 {/* Draft */}
                                 <button
                                     onClick={() => setPipelineStatusFilter(pipelineStatusFilter === 'draft' ? 'all' : 'draft')}
                                     className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                                         pipelineStatusFilter === 'draft' ? 'bg-gray-500/20 ring-1 ring-gray-400/50' : 'hover:bg-white/5'
                                     }`}
                                 >
                                     <span className="text-lg font-bold text-gray-400">{statusCounts.draft}</span>
                                     <span className="text-[10px] uppercase tracking-wider text-gray-500">Draft</span>
                                 </button>
                                 <ChevronRight className="w-3 h-3 text-white/10 flex-shrink-0" />
                                 {/* Quoted */}
                                 <button
                                     onClick={() => setPipelineStatusFilter(pipelineStatusFilter === 'quoted' ? 'all' : 'quoted')}
                                     className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                                         pipelineStatusFilter === 'quoted' ? 'bg-purple-500/20 ring-1 ring-purple-400/50' : 'hover:bg-white/5'
                                     }`}
                                 >
                                     <span className="text-lg font-bold text-purple-400">{statusCounts.quoted}</span>
                                     <span className="text-[10px] uppercase tracking-wider text-purple-500">Quoted</span>
                                 </button>
                                 <ChevronRight className="w-3 h-3 text-white/10 flex-shrink-0" />
                                 {/* Approved */}
                                 <button
                                     onClick={() => setPipelineStatusFilter(pipelineStatusFilter === 'approved' ? 'all' : 'approved')}
                                     className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                                         pipelineStatusFilter === 'approved' ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50' : 'hover:bg-white/5'
                                     }`}
                                 >
                                     <span className="text-lg font-bold text-emerald-400">{statusCounts.approved}</span>
                                     <span className="text-[10px] uppercase tracking-wider text-emerald-500">Approved</span>
                                 </button>
                                 <ChevronRight className="w-3 h-3 text-white/10 flex-shrink-0" />
                                 {/* Scheduled */}
                                 <button
                                     onClick={() => setPipelineStatusFilter(pipelineStatusFilter === 'scheduled' ? 'all' : 'scheduled')}
                                     className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                                         pipelineStatusFilter === 'scheduled' ? 'bg-blue-500/20 ring-1 ring-blue-400/50' : 'hover:bg-white/5'
                                     }`}
                                 >
                                     <span className="text-lg font-bold text-blue-400">{statusCounts.scheduled}</span>
                                     <span className="text-[10px] uppercase tracking-wider text-blue-500">Scheduled</span>
                                 </button>
                             </div>
                         </div>
                     </>
                 )}

                 {/* SUB-TAB: QUOTES */}
                 {projectsSubTab === 'quotes' && (
                     <QuoteView
                        onSave={handleSaveProjectFromQuote}
                        onGenerateBOM={handleGenerateBOM}
                        onClose={() => setProjectsSubTab('pipeline')}
                        onEditDesign={() => handleTabChange('editor')}
                        initialData={currentQuote}
                        companyProfile={companyProfile}
                        defaultPricing={pricing}
                        projectImage={generatedImage}
                        userId={user?.id}
                        projectId={currentProjectId || undefined}
                     />
                 )}

                 {/* View Mode Toggle - Only show on pipeline */}
                 {projectsSubTab === 'pipeline' && (
                     <div className="hidden md:flex items-center justify-end gap-2 mb-4">
                         <span className="text-xs text-gray-500 mr-2">View:</span>
                         <button
                             onClick={() => setPipelineViewMode('grid')}
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                 pipelineViewMode === 'grid'
                                     ? 'bg-[#F6B45A]/20 text-[#F6B45A] ring-1 ring-[#F6B45A]/30'
                                     : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                             }`}
                         >
                             <LayoutGrid className="w-3.5 h-3.5" />
                             Grid
                         </button>
                         <button
                             onClick={() => setPipelineViewMode('kanban')}
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                 pipelineViewMode === 'kanban'
                                     ? 'bg-[#F6B45A]/20 text-[#F6B45A] ring-1 ring-[#F6B45A]/30'
                                     : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                             }`}
                         >
                             <Columns className="w-3.5 h-3.5" />
                             Kanban
                         </button>
                     </div>
                 )}

                 {/* SUB-TAB: PIPELINE (All Projects) */}
                 {projectsSubTab === 'pipeline' && (
                     <>
                         {filteredPipelineProjects.length === 0 ? (
                             <motion.div
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-[#F6B45A]/20 rounded-3xl bg-gradient-to-b from-[#F6B45A]/5 to-transparent relative overflow-hidden"
                             >
                                 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #F6B45A 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                                 <motion.div
                                   animate={{ y: [0, -8, 0] }}
                                   transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                   className="w-20 h-20 rounded-full bg-[#F6B45A]/10 flex items-center justify-center mb-6 border border-[#F6B45A]/20 animate-glow-pulse"
                                 >
                                    <FolderPlus className="w-8 h-8 text-[#F6B45A]/60" />
                                 </motion.div>
                                 <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No Pending Projects</p>
                                 <p className="text-sm text-gray-400 mt-1 max-w-[280px] text-center">All projects have been approved or create a new design in the Editor.</p>
                                 <motion.button
                                   whileHover={{ scale: 1.02 }}
                                   whileTap={{ scale: 0.98 }}
                                   onClick={() => handleTabChange('editor')}
                                   className="mt-6 px-5 py-2.5 bg-[#F6B45A]/10 border border-[#F6B45A]/30 rounded-xl text-[#F6B45A] text-sm font-bold hover:bg-[#F6B45A]/20 transition-colors relative z-10"
                                 >
                                   Open Editor
                                 </motion.button>
                             </motion.div>
                         ) : (
                            <>
                            {/* Mobile Compact List View - always visible on mobile */}
                            <div className="md:hidden space-y-3">
                                {filteredPipelineProjects.map((p, index) => (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="group bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                                        {/* Main Row - Tap to expand */}
                                        <div
                                            className="flex items-center gap-3 p-3 active:bg-white/5"
                                            onClick={() => setExpandedCardId(expandedCardId === p.id ? null : p.id)}
                                        >
                                            <div onClick={(e) => { e.stopPropagation(); if (p.image) { setGeneratedImage(p.image); handleTabChange('editor'); }}} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-black">
                                                {p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]"><Wand2 className="w-5 h-5 text-gray-600" /></div>}
                                                <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[p.status].bgColor.replace('/10', '')} border border-black`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm text-white truncate">{p.name}</h3>
                                                <div className="flex items-center gap-2 mt-1"><span className={`text-[10px] font-bold uppercase ${STATUS_CONFIG[p.status].color}`}>{STATUS_CONFIG[p.status].label}</span>{p.invoicePaidAt && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PAID</span>}{pipelineAnalytics.overdueProjects.some(op => op.id === p.id) && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">OVERDUE</span>}<span className="text-gray-600">•</span><span className="text-[10px] text-gray-500">{p.date}</span></div>
                                                {p.quote && <div className="text-xs font-bold text-[#F6B45A] mt-1">${p.quote.total.toFixed(0)}</div>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedCardId === p.id ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {/* Expandable Quick Edit Section */}
                                        <AnimatePresence>
                                            {expandedCardId === p.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden border-t border-white/5"
                                                >
                                                    <div className="p-3 space-y-3 bg-[#0a0a0a]">
                                                        {/* Client & Total Quick Edit */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="text"
                                                                value={inlineEditQuote[p.id]?.clientName ?? p.quote?.clientDetails?.name ?? ''}
                                                                onChange={(e) => setInlineEditQuote(prev => ({
                                                                    ...prev,
                                                                    [p.id]: { ...prev[p.id], clientName: e.target.value, total: prev[p.id]?.total ?? p.quote?.total ?? 0, notes: prev[p.id]?.notes ?? '' }
                                                                }))}
                                                                placeholder="Client name"
                                                                className="bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={inlineEditQuote[p.id]?.total ?? p.quote?.total ?? ''}
                                                                onChange={(e) => setInlineEditQuote(prev => ({
                                                                    ...prev,
                                                                    [p.id]: { ...prev[p.id], clientName: prev[p.id]?.clientName ?? p.quote?.clientDetails?.name ?? '', total: parseFloat(e.target.value) || 0, notes: prev[p.id]?.notes ?? '' }
                                                                }))}
                                                                placeholder="$ Total"
                                                                className="bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
                                                            />
                                                        </div>
                                                        {/* Save Button */}
                                                        <button
                                                            onClick={async () => {
                                                                const edits = inlineEditQuote[p.id];
                                                                if (edits || p.quote) {
                                                                    const updatedQuote: QuoteData = {
                                                                        clientDetails: {
                                                                            name: edits?.clientName || p.quote?.clientDetails?.name || '',
                                                                            email: p.quote?.clientDetails?.email || '',
                                                                            phone: p.quote?.clientDetails?.phone || '',
                                                                            address: p.quote?.clientDetails?.address || ''
                                                                        },
                                                                        total: edits?.total || p.quote?.total || 0,
                                                                        lineItems: p.quote?.lineItems || [],
                                                                        taxRate: p.quote?.taxRate || 0,
                                                                        discount: p.quote?.discount || 0
                                                                    };
                                                                    const success = await updateProject(p.id, {
                                                                        quote: updatedQuote,
                                                                        name: updatedQuote.clientDetails.name || p.name,
                                                                        status: p.status === 'draft' ? 'quoted' : p.status
                                                                    });
                                                                    if (success) {
                                                                        setExpandedCardId(null);
                                                                        setInlineEditQuote(prev => { const next = {...prev}; delete next[p.id]; return next; });
                                                                        showToast('success', 'Quote updated!');
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full bg-[#F6B45A] hover:bg-[#ffc67a] text-black py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                                                        >
                                                            <Save className="w-3.5 h-3.5" />
                                                            Save Changes
                                                        </button>
                                                        {/* Quick Actions */}
                                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                            {p.quote?.clientDetails?.phone && <a href={`tel:${p.quote.clientDetails.phone}`} className="flex-1 py-2 text-[10px] uppercase font-bold text-gray-400 active:text-[#F6B45A] flex items-center justify-center gap-1.5 bg-white/5 rounded-lg"><Phone className="w-3.5 h-3.5" />Call</a>}
                                                            {(p.status === 'approved' || p.status === 'scheduled' || p.status === 'completed') && (
                                                                <button onClick={() => handleGenerateInvoice(p)} className="flex-1 py-2 text-[10px] uppercase font-bold text-blue-400 active:text-blue-300 flex items-center justify-center gap-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20"><Receipt className="w-3.5 h-3.5" />Invoice</button>
                                                            )}
                                                            <button onClick={() => handleDeleteProject(p.id)} className="py-2 px-3 text-[10px] uppercase font-bold text-gray-400 active:text-red-500 flex items-center justify-center gap-1.5 bg-white/5 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Action Buttons - Always visible */}
                                        <div className="flex items-center border-t border-white/5 divide-x divide-white/5">
                                            <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(p); }} disabled={!p.image} className="flex-1 py-2.5 text-[10px] uppercase font-bold text-gray-400 active:text-white active:bg-white/5 flex items-center justify-center gap-1.5 disabled:opacity-30"><ImageIcon className="w-3.5 h-3.5" />Save</button>
                                            <button onClick={(e) => { e.stopPropagation(); setCurrentProjectId(p.id); if (p.image) setGeneratedImage(p.image); if (p.quote) setCurrentQuote(p.quote); else setCurrentQuote(null); setProjectsSubTab('quotes'); }} className="flex-1 py-2.5 text-[10px] uppercase font-bold text-purple-400 active:text-purple-300 active:bg-purple-500/10 flex items-center justify-center gap-1.5"><FileText className="w-3.5 h-3.5" />Quote</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleApproveProject(p.id); }} className="flex-1 py-2.5 text-[10px] uppercase font-bold text-emerald-500 active:text-emerald-400 active:bg-emerald-500/10 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {/* Kanban View - only visible on desktop/tablet (md+) */}
                            {pipelineViewMode === 'kanban' && (
                                <div className="hidden md:block h-[calc(100vh-320px)] min-h-[500px]">
                                    <KanbanBoard
                                        projects={projects}
                                        statusConfig={STATUS_CONFIG}
                                        onStatusChange={async (projectId, newStatus) => {
                                            const success = await updateProjectStatus(projectId, newStatus);
                                            if (success) {
                                                showToast('success', `Project moved to ${STATUS_CONFIG[newStatus].label}`);
                                            } else {
                                                showToast('error', 'Failed to update project status');
                                            }
                                            return success;
                                        }}
                                        onProjectClick={(p) => {
                                            setViewProjectId(p.id);
                                            setShowProjectDetailModal(true);
                                        }}
                                        onEditProject={(p) => {
                                            setViewProjectId(p.id);
                                            setIsEditingProject(true);
                                            setEditProjectName(p.name);
                                            setEditClientName(p.quote?.clientDetails?.name || p.clientName || '');
                                            setEditClientEmail(p.quote?.clientDetails?.email || '');
                                            setEditClientPhone(p.quote?.clientDetails?.phone || '');
                                            setEditClientAddress(p.quote?.clientDetails?.address || '');
                                            setEditProjectNotes(p.notes || '');
                                            setEditLineItems(p.quote?.lineItems || []);
                                            setEditProjectLocationId(p.location_id || null);
                                            setShowProjectDetailModal(true);
                                        }}
                                        onSendQuote={handleSendQuoteToPortal}
                                        onGenerateQuote={(p) => {
                                            setCurrentProjectId(p.id);
                                            if (p.image) setGeneratedImage(p.image);
                                            setCurrentQuote(p.quote || null);
                                            setProjectsSubTab('quotes');
                                        }}
                                        onScheduleProject={(p) => {
                                            setScheduleProjectId(p.id);
                                            setScheduleDate(new Date());
                                            setScheduleTimeSlot('morning');
                                            setScheduleCustomTime('09:00');
                                            setScheduleDuration(2);
                                            setScheduleNotes('');
                                            setShowScheduleModal(true);
                                        }}
                                        onCompleteProject={(p) => {
                                            setCompletionProjectId(p.id);
                                            setCompletionNotes('');
                                            setAutoGenerateInvoice(false);
                                            setShowCompletionModal(true);
                                        }}
                                        onGenerateInvoice={handleGenerateInvoice}
                                    />
                                </div>
                            )}

                            {/* Desktop Card Grid View */}
                            <div className={`hidden ${pipelineViewMode === 'grid' ? 'md:grid' : ''} grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8`}>
                                {filteredPipelineProjects.map((p, index) => (
                                    <motion.div
                                      key={p.id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      whileHover={{ y: -6, transition: { duration: 0.25 } }}
                                      className="group relative bg-gradient-to-b from-[#151515] to-[#111] border border-white/5 rounded-2xl overflow-visible hover:border-[#F6B45A]/40 transition-all duration-300 hover:shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(246,180,90,0.08)] flex flex-col cursor-pointer">
                                        {/* Gold edge glow on hover */}
                                        <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(246,180,90,0.2) 0%, transparent 50%, rgba(246,180,90,0.1) 100%)' }} />

                                        {/* Status Badge with contextual animations */}
                                        <motion.div
                                            className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_CONFIG[p.status].bgColor} ${STATUS_CONFIG[p.status].color} border ${STATUS_CONFIG[p.status].borderColor}`}
                                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 400 }}
                                        >
                                            {/* Draft - subtle pulse indicating "in progress" */}
                                            {p.status === 'draft' && (
                                                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                                                    <Clock className="w-3 h-3" />
                                                </motion.div>
                                            )}
                                            {/* Quoted - file icon */}
                                            {p.status === 'quoted' && <FileText className="w-3 h-3" />}
                                            {/* Approved - sparkle/shine effect */}
                                            {p.status === 'approved' && (
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ duration: 0.6, delay: index * 0.05 + 0.3 }}
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </motion.div>
                                            )}
                                            {/* Scheduled - subtle calendar tick */}
                                            {p.status === 'scheduled' && (
                                                <motion.div animate={{ y: [0, -1, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                                    <Calendar className="w-3 h-3" />
                                                </motion.div>
                                            )}
                                            {/* Completed - check with shine */}
                                            {p.status === 'completed' && <Check className="w-3 h-3" />}
                                            {STATUS_CONFIG[p.status].label}
                                            {/* Sparkle for approved status */}
                                            {p.status === 'approved' && (
                                                <motion.div
                                                    className="absolute -top-1 -right-1"
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                                                    transition={{ duration: 0.8, delay: index * 0.05 + 0.5 }}
                                                >
                                                    <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
                                                </motion.div>
                                            )}
                                        </motion.div>

                                        {/* Paid Badge - Top Right */}
                                        {p.invoicePaidAt && (
                                            <motion.div
                                                className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 + 0.15, type: "spring", stiffness: 400 }}
                                            >
                                                <Check className="w-3 h-3" />
                                                PAID
                                            </motion.div>
                                        )}

                                        {/* Overdue Badge - Top Right (only if not paid) */}
                                        {!p.invoicePaidAt && pipelineAnalytics.overdueProjects.some(op => op.id === p.id) && (
                                            <motion.div
                                                className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30"
                                                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 + 0.15, type: "spring", stiffness: 400 }}
                                            >
                                                <AlertCircle className="w-3 h-3" />
                                                OVERDUE
                                            </motion.div>
                                        )}

                                        {/* Image Section - Hero (Multi-Image Support) with Parallax */}
                                        {(() => {
                                            const images = getProjectImages(p);
                                            const currentIndex = projectImageIndex[p.id] || 0;
                                            const currentImage = images[currentIndex];
                                            return (
                                                <div
                                                    className={`relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-black`}
                                                    onMouseMove={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const x = (e.clientX - rect.left) / rect.width - 0.5;
                                                        const y = (e.clientY - rect.top) / rect.height - 0.5;
                                                        const img = e.currentTarget.querySelector('.parallax-image') as HTMLElement;
                                                        if (img) {
                                                            img.style.transform = `scale(1.08) translate(${x * -12}px, ${y * -12}px)`;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const img = e.currentTarget.querySelector('.parallax-image') as HTMLElement;
                                                        if (img) {
                                                            img.style.transform = 'scale(1) translate(0, 0)';
                                                        }
                                                    }}
                                                >
                                                    {currentImage ? (
                                                        <>
                                                            {/* Ambient glow from lit areas */}
                                                            <div
                                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                                                style={{
                                                                    background: 'radial-gradient(ellipse at 50% 60%, rgba(246,180,90,0.15) 0%, transparent 50%)',
                                                                    filter: 'blur(20px)',
                                                                }}
                                                            />
                                                            <img
                                                                src={currentImage.url}
                                                                onClick={() => {
                                                                    setGeneratedImage(currentImage.url);
                                                                    handleTabChange('editor');
                                                                }}
                                                                className="parallax-image w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 ease-out"
                                                                style={{ transformOrigin: 'center center' }}
                                                                alt={currentImage.label || 'Scene'}
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-90 pointer-events-none"></div>

                                                            {/* Subtle gold edge glow on hover */}
                                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-t-2xl" style={{ boxShadow: 'inset 0 0 30px rgba(246,180,90,0.1)' }} />

                                                            {/* Tech Corners */}
                                                            <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>
                                                            <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>
                                                            <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>
                                                            <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>

                                                            {/* Multi-Image Navigation */}
                                                            {images.length > 1 && (
                                                                <>
                                                                    {/* Left Arrow */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setProjectImageIndex(prev => ({
                                                                                ...prev,
                                                                                [p.id]: currentIndex === 0 ? images.length - 1 : currentIndex - 1
                                                                            }));
                                                                        }}
                                                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <ChevronLeft className="w-4 h-4 text-white" />
                                                                    </button>
                                                                    {/* Right Arrow */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setProjectImageIndex(prev => ({
                                                                                ...prev,
                                                                                [p.id]: currentIndex === images.length - 1 ? 0 : currentIndex + 1
                                                                            }));
                                                                        }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <ChevronRight className="w-4 h-4 text-white" />
                                                                    </button>
                                                                    {/* Image Counter & Label */}
                                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-0.5 bg-black/60 rounded-full text-[9px] text-white/80">
                                                                        <span>{currentIndex + 1}/{images.length}</span>
                                                                        <span className="text-[#F6B45A]">{currentImage.label || 'View'}</span>
                                                                    </div>
                                                                    {/* Thumbnail Strip */}
                                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 p-1 bg-black/40 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {images.map((img, idx) => (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setProjectImageIndex(prev => ({ ...prev, [p.id]: idx }));
                                                                                }}
                                                                                className={`relative w-8 h-6 rounded overflow-hidden transition-all ${
                                                                                    idx === currentIndex
                                                                                        ? 'ring-2 ring-[#F6B45A] ring-offset-1 ring-offset-black scale-110'
                                                                                        : 'opacity-60 hover:opacity-100'
                                                                                }`}
                                                                            >
                                                                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}

                                                            {/* Hover Action */}
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                                <div className="bg-[#F6B45A] text-black px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                                    Load Scene
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
                                                            <Wand2 className="w-8 h-8 opacity-20 mb-2"/>
                                                            <span className="text-[9px] uppercase font-bold opacity-40">No Visualization</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Info Section */}
                                        <div className="p-5 flex flex-col flex-1 border-t border-white/5 bg-[#0a0a0a]">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[9px] text-[#F6B45A] font-mono mb-1">ID: PRJ-{p.id.substring(0,6).toUpperCase()}</div>
                                                    <h3 className="font-bold text-lg text-white font-serif tracking-tight truncate">{p.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    {p.quote?.clientDetails?.phone && (
                                                        <a
                                                            href={`tel:${p.quote.clientDetails.phone}`}
                                                            className="p-2 text-gray-400 hover:text-[#F6B45A] hover:bg-white/5 rounded-full transition-colors"
                                                            title={`Call ${p.quote.clientDetails.phone}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteProject(p.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white/5 rounded-full transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Client Info */}
                                            {p.quote?.clientDetails?.name && (
                                                <div className="mb-3 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-gray-300">
                                                        <User className="w-3.5 h-3.5 text-gray-500" />
                                                        <span className="text-sm truncate">{p.quote.clientDetails.name}</span>
                                                    </div>
                                                    {p.quote.clientDetails.address && (
                                                        <div className="flex items-start gap-2 text-gray-400">
                                                            <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                                                            <span className="text-xs truncate">{p.quote.clientDetails.address.split('\n')[0]}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Assignment Dropdown - only for admins/owners */}
                                            {hasPermission('canAssignProjects') && (
                                                <div className="mb-3">
                                                    <AssignmentDropdown
                                                        assignedUserId={p.assignedTo?.[0]}
                                                        assignedUserName={teamMembers.find(m => m.userId === p.assignedTo?.[0])?.userName}
                                                        roleFilter={['salesperson', 'admin']}
                                                        onAssign={async (userId: string, _userName: string) => {
                                                            await updateProject(p.id, { assignedTo: [userId] });
                                                        }}
                                                        onUnassign={async () => {
                                                            await updateProject(p.id, { assignedTo: [] });
                                                        }}
                                                        label="Assigned To"
                                                        placeholder="Unassigned"
                                                        compact
                                                    />
                                                </div>
                                            )}

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <div className="bg-[#151515] p-2 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Created</span>
                                                    <span className="text-xs text-gray-200 font-mono">{p.date}</span>
                                                </div>
                                                <div
                                                    onClick={() => {
                                                        if (p.quote) {
                                                            setCurrentProjectId(p.id);
                                                            setCurrentQuote(p.quote);
                                                            if (p.image) setGeneratedImage(p.image);
                                                            setProjectsSubTab('quotes');
                                                        }
                                                    }}
                                                    className={`bg-[#151515] p-2 rounded-lg border border-white/5 relative group/quote transition-colors ${p.quote ? 'cursor-pointer hover:border-[#F6B45A]/30 hover:bg-[#F6B45A]/5' : ''}`}
                                                >
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Estimate</span>
                                                    <span className={`text-xs font-mono font-bold ${p.quote ? 'text-[#F6B45A]' : 'text-gray-400'}`}>
                                                        {p.quote ? `$${p.quote.total.toFixed(0)}` : 'N/A'}
                                                    </span>
                                                    {p.quote && (
                                                        <ArrowUpRight className="absolute top-2 right-2 w-3 h-3 text-[#F6B45A] opacity-0 group-hover/quote:opacity-100 transition-opacity" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expandable Quick Edit Section */}
                                            <AnimatePresence>
                                                {expandedCardId === p.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                                                            {/* Quick Quote Edit */}
                                                            <div className="space-y-2">
                                                                <label className="block text-[10px] uppercase font-bold text-gray-400">Client Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={inlineEditQuote[p.id]?.clientName ?? p.quote?.clientDetails?.name ?? ''}
                                                                    onChange={(e) => setInlineEditQuote(prev => ({
                                                                        ...prev,
                                                                        [p.id]: { ...prev[p.id], clientName: e.target.value, total: prev[p.id]?.total ?? p.quote?.total ?? 0, notes: prev[p.id]?.notes ?? '' }
                                                                    }))}
                                                                    placeholder="Enter client name"
                                                                    className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none transition-colors"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="space-y-2">
                                                                    <label className="block text-[10px] uppercase font-bold text-gray-400">Total ($)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={inlineEditQuote[p.id]?.total ?? p.quote?.total ?? ''}
                                                                        onChange={(e) => setInlineEditQuote(prev => ({
                                                                            ...prev,
                                                                            [p.id]: { ...prev[p.id], clientName: prev[p.id]?.clientName ?? p.quote?.clientDetails?.name ?? '', total: parseFloat(e.target.value) || 0, notes: prev[p.id]?.notes ?? '' }
                                                                        }))}
                                                                        placeholder="0"
                                                                        className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none transition-colors"
                                                                    />
                                                                </div>
                                                                <div className="flex items-end gap-2">
                                                                    <button
                                                                        onClick={async () => {
                                                                            // Save inline edits
                                                                            const edits = inlineEditQuote[p.id];
                                                                            if (edits || p.quote) {
                                                                                const updatedQuote: QuoteData = {
                                                                                    clientDetails: {
                                                                                        name: edits?.clientName || p.quote?.clientDetails?.name || '',
                                                                                        email: p.quote?.clientDetails?.email || '',
                                                                                        phone: p.quote?.clientDetails?.phone || '',
                                                                                        address: p.quote?.clientDetails?.address || ''
                                                                                    },
                                                                                    total: edits?.total || p.quote?.total || 0,
                                                                                    lineItems: p.quote?.lineItems || [],
                                                                                    taxRate: p.quote?.taxRate || 0,
                                                                                    discount: p.quote?.discount || 0
                                                                                };
                                                                                const success = await updateProject(p.id, {
                                                                                    quote: updatedQuote,
                                                                                    name: updatedQuote.clientDetails.name || p.name,
                                                                                    status: p.status === 'draft' ? 'quoted' : p.status
                                                                                });
                                                                                if (success) {
                                                                                    setExpandedCardId(null);
                                                                                    setInlineEditQuote(prev => { const next = {...prev}; delete next[p.id]; return next; });
                                                                                    showToast('success', 'Quote updated!');
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="flex-1 bg-[#F6B45A] hover:bg-[#ffc67a] text-black py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                                                    >
                                                                        <Save className="w-3.5 h-3.5" />
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setExpandedCardId(null);
                                                                            setInlineEditQuote(prev => { const next = {...prev}; delete next[p.id]; return next; });
                                                                        }}
                                                                        className="bg-white/5 hover:bg-white/10 text-gray-400 p-2 rounded-lg transition-all"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {/* Quick Actions Row */}
                                                            <div className="flex gap-2 pt-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setCurrentProjectId(p.id);
                                                                        if (p.image) setGeneratedImage(p.image);
                                                                        setCurrentQuote(p.quote || null);
                                                                        setProjectsSubTab('quotes');
                                                                    }}
                                                                    className="flex-1 text-center text-[10px] text-purple-400 hover:text-purple-300 py-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20"
                                                                >
                                                                    Full Quote Editor
                                                                </button>
                                                                {(p.status === 'approved' || p.status === 'scheduled' || p.status === 'completed') && (
                                                                    <button
                                                                        onClick={() => handleGenerateInvoice(p)}
                                                                        className="flex-1 text-center text-[10px] text-blue-400 hover:text-blue-300 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20 flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <Receipt className="w-3 h-3" />
                                                                        Generate Invoice
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Expand/Collapse Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedCardId(expandedCardId === p.id ? null : p.id);
                                                }}
                                                className="w-full mt-3 flex items-center justify-center gap-1 py-1.5 text-[10px] uppercase font-bold text-gray-500 hover:text-gray-300 transition-colors"
                                            >
                                                <span>{expandedCardId === p.id ? 'Collapse' : 'Quick Edit'}</span>
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedCardId === p.id ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Action Buttons Row - Status-Aware */}
                                            <div className="mt-2 pt-4 border-t border-white/5 space-y-2">
                                                {/* Draft/Quoted Status: Show Quote + Approve */}
                                                {(p.status === 'draft' || p.status === 'quoted') && (
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <button
                                                            onClick={() => handleDownloadImage(p)}
                                                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-2.5 px-2 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all group/btn"
                                                            title="Download Image"
                                                            disabled={!p.image}
                                                        >
                                                            <ImageIcon className="w-3.5 h-3.5 shrink-0 group-hover/btn:text-[#F6B45A]" />
                                                            <span className="hidden sm:inline">Save</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenAddImageModal(p.id)}
                                                            className="bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 text-[#F6B45A] py-2.5 px-2 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all border border-[#F6B45A]/30 hover:border-[#F6B45A]/50"
                                                            title="Add Another Image"
                                                        >
                                                            <Plus className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="hidden sm:inline">Add</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setCurrentProjectId(p.id);
                                                                if (p.image) setGeneratedImage(p.image);
                                                                setCurrentQuote(p.quote || null);
                                                                setProjectsSubTab('quotes');
                                                            }}
                                                            className="bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white py-2.5 px-2 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all border border-purple-500/30 hover:border-purple-500 group/btn"
                                                            title={p.quote ? "Edit Quote" : "Add Quote"}
                                                        >
                                                            <FileText className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="hidden sm:inline">Quote</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveProject(p.id)}
                                                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white py-2.5 px-2 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all border border-emerald-500/30 hover:border-emerald-500"
                                                            title="Approve Project"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="hidden sm:inline">OK</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Approved Status: Show Schedule */}
                                                {p.status === 'approved' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setScheduleProjectId(p.id);
                                                                setScheduleDate(new Date());
                                                                setScheduleTimeSlot('morning');
                                                                setScheduleDuration(2);
                                                                setScheduleNotes('');
                                                                setShowScheduleModal(true);
                                                            }}
                                                            className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2.5 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-blue-500/30 hover:border-blue-500"
                                                        >
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            Schedule
                                                        </button>
                                                        <button
                                                            onClick={() => handleUnapproveProject(p.id)}
                                                            className="bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-2.5 rounded-lg transition-all border border-white/5 hover:border-red-500/30"
                                                            title="Revert to draft"
                                                        >
                                                            <Undo2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Scheduled Status: Show Reschedule + Complete */}
                                                {p.status === 'scheduled' && (
                                                    <>
                                                        {p.schedule && (
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-2">
                                                                <Calendar className="w-4 h-4 text-blue-400" />
                                                                <span className="text-sm text-blue-400 font-medium">
                                                                    {new Date(p.schedule.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                    {' · '}
                                                                    {p.schedule.timeSlot === 'morning' ? 'AM' : p.schedule.timeSlot === 'afternoon' ? 'Midday' : p.schedule.timeSlot === 'evening' ? 'PM' : p.schedule.customTime}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setScheduleProjectId(p.id);
                                                                    if (p.schedule) {
                                                                        setScheduleDate(new Date(p.schedule.scheduledDate));
                                                                        setScheduleTimeSlot(p.schedule.timeSlot);
                                                                        setScheduleCustomTime(p.schedule.customTime || '09:00');
                                                                        setScheduleDuration(p.schedule.estimatedDuration);
                                                                        setScheduleNotes(p.schedule.installationNotes || '');
                                                                    }
                                                                    setShowScheduleModal(true);
                                                                }}
                                                                className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2.5 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-blue-500/30 hover:border-blue-500"
                                                            >
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                Reschedule
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setCompletionProjectId(p.id);
                                                                    setCompletionNotes('');
                                                                    setAutoGenerateInvoice(false);
                                                                    setShowCompletionModal(true);
                                                                }}
                                                                className="flex-1 bg-[#F6B45A]/10 hover:bg-[#F6B45A] text-[#F6B45A] hover:text-black py-2.5 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-[#F6B45A]/30 hover:border-[#F6B45A]"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                Complete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Completed Status: Show Invoice */}
                                                {p.status === 'completed' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleGenerateInvoice(p)}
                                                            className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2.5 rounded-lg text-[9px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-blue-500/30 hover:border-blue-500"
                                                        >
                                                            <Receipt className="w-3.5 h-3.5" />
                                                            Invoice
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadImage(p)}
                                                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2.5 rounded-lg transition-all"
                                                            title="Download Image"
                                                            disabled={!p.image}
                                                        >
                                                            <ImageIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            </>
                         )}
                     </>
                 )}

                 {/* SUB-TAB: APPROVED */}
                 {false /* 'approved' tab now part of pipeline */ && (
                     <>
                         {filteredApprovedProjects.length === 0 ? (
                             <motion.div
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-emerald-500/20 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent relative overflow-hidden"
                             >
                                 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                                 <motion.div
                                   animate={{ y: [0, -8, 0] }}
                                   transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                   className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20"
                                   style={{ boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}
                                 >
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                                 </motion.div>
                                 <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No Approved Projects</p>
                                 <p className="text-sm text-gray-400 mt-1 max-w-[280px] text-center">Approve projects from the Projects tab to see them here.</p>
                                 <motion.button
                                   whileHover={{ scale: 1.02 }}
                                   whileTap={{ scale: 0.98 }}
                                   onClick={() => { setProjectsSubTab('pipeline'); setPipelineStatusFilter('all'); }}
                                   className="mt-6 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors relative z-10"
                                 >
                                   View Projects
                                 </motion.button>
                             </motion.div>
                         ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                                {filteredApprovedProjects.map((p) => (
                                    <div key={p.id} className="group relative bg-[#111]/80 backdrop-blur-sm border border-emerald-500/20 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col">

                                        {/* Status Badge */}
                                        <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_CONFIG[p.status].bgColor} ${STATUS_CONFIG[p.status].color} border ${STATUS_CONFIG[p.status].borderColor}`}>
                                            {p.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                            {p.status === 'scheduled' && <Calendar className="w-3 h-3" />}
                                            {p.status === 'completed' && <Check className="w-3 h-3" />}
                                            {STATUS_CONFIG[p.status].label}
                                        </div>

                                        {/* Image Section (Multi-Image Support) */}
                                        {(() => {
                                            const images = getProjectImages(p);
                                            const currentIndex = projectImageIndex[p.id] || 0;
                                            const currentImage = images[currentIndex];
                                            return (
                                                <div className={`relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-black`}>
                                                    {currentImage ? (
                                                        <>
                                                            <img
                                                                src={currentImage.url}
                                                                onClick={() => {
                                                                    setGeneratedImage(currentImage.url);
                                                                    handleTabChange('editor');
                                                                }}
                                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                                                                alt={currentImage.label || 'Scene'}
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-90 pointer-events-none"></div>

                                                            {/* Multi-Image Navigation */}
                                                            {images.length > 1 && (
                                                                <>
                                                                    {/* Left Arrow */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setProjectImageIndex(prev => ({
                                                                                ...prev,
                                                                                [p.id]: currentIndex === 0 ? images.length - 1 : currentIndex - 1
                                                                            }));
                                                                        }}
                                                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <ChevronLeft className="w-4 h-4 text-white" />
                                                                    </button>
                                                                    {/* Right Arrow */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setProjectImageIndex(prev => ({
                                                                                ...prev,
                                                                                [p.id]: currentIndex === images.length - 1 ? 0 : currentIndex + 1
                                                                            }));
                                                                        }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <ChevronRight className="w-4 h-4 text-white" />
                                                                    </button>
                                                                    {/* Image Counter & Label */}
                                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-0.5 bg-black/60 rounded-full text-[9px] text-white/80">
                                                                        <span>{currentIndex + 1}/{images.length}</span>
                                                                        <span className="text-emerald-400">{currentImage.label || 'View'}</span>
                                                                    </div>
                                                                    {/* Thumbnail Strip */}
                                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 p-1 bg-black/40 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {images.map((img, idx) => (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setProjectImageIndex(prev => ({ ...prev, [p.id]: idx }));
                                                                                }}
                                                                                className={`relative w-8 h-6 rounded overflow-hidden transition-all ${
                                                                                    idx === currentIndex
                                                                                        ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-black scale-110'
                                                                                        : 'opacity-60 hover:opacity-100'
                                                                                }`}
                                                                            >
                                                                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
                                                            <Wand2 className="w-8 h-8 opacity-20 mb-2"/>
                                                            <span className="text-[9px] uppercase font-bold opacity-40">No Visualization</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Info Section */}
                                        <div className="p-5 flex flex-col flex-1 border-t border-emerald-500/10 bg-[#0a0a0a]">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[9px] text-emerald-500 font-mono mb-1">ID: PRJ-{p.id.substring(0,6).toUpperCase()}</div>
                                                    <h3 className="font-bold text-lg text-white font-serif tracking-tight truncate">{p.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    {p.quote?.clientDetails?.phone && (
                                                        <a
                                                            href={`tel:${p.quote.clientDetails.phone}`}
                                                            className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-full transition-colors"
                                                            title={`Call ${p.quote.clientDetails.phone}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Client Info */}
                                            {p.quote?.clientDetails?.name && (
                                                <div className="mb-3 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-gray-300">
                                                        <User className="w-3.5 h-3.5 text-gray-500" />
                                                        <span className="text-sm truncate">{p.quote.clientDetails.name}</span>
                                                    </div>
                                                    {p.quote.clientDetails.address && (
                                                        <div className="flex items-start gap-2 text-gray-400">
                                                            <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                                                            <span className="text-xs truncate">{p.quote.clientDetails.address.split('\n')[0]}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <div className="bg-[#151515] p-2 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Created</span>
                                                    <span className="text-xs text-gray-200 font-mono">{p.date}</span>
                                                </div>
                                                <div className="bg-[#151515] p-2 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Total</span>
                                                    <span className="text-xs font-mono font-bold text-emerald-500">
                                                        {p.quote ? `$${p.quote.total.toFixed(0)}` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Scheduled Date Badge */}
                                            {p.status === 'scheduled' && p.schedule && (
                                                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                    <Calendar className="w-4 h-4 text-blue-400" />
                                                    <span className="text-sm text-blue-400 font-medium">
                                                        {new Date(p.schedule.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        {' · '}
                                                        {p.schedule.timeSlot === 'morning' ? 'AM' : p.schedule.timeSlot === 'afternoon' ? 'Midday' : p.schedule.timeSlot === 'evening' ? 'PM' : p.schedule.customTime}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Status Change & Action Buttons */}
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                {/* Status Progression */}
                                                <div className="flex gap-2">
                                                    {p.status === 'approved' && (
                                                        <button
                                                            onClick={() => {
                                                                setScheduleProjectId(p.id);
                                                                setScheduleDate(new Date());
                                                                setScheduleTimeSlot('morning');
                                                                setScheduleDuration(2);
                                                                setScheduleNotes('');
                                                                setShowScheduleModal(true);
                                                            }}
                                                            className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-blue-500/30 hover:border-blue-500"
                                                        >
                                                            <Calendar className="w-3 h-3" />
                                                            Schedule
                                                        </button>
                                                    )}
                                                    {p.status === 'scheduled' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setScheduleProjectId(p.id);
                                                                    if (p.schedule) {
                                                                        setScheduleDate(new Date(p.schedule.scheduledDate));
                                                                        setScheduleTimeSlot(p.schedule.timeSlot);
                                                                        setScheduleCustomTime(p.schedule.customTime || '09:00');
                                                                        setScheduleDuration(p.schedule.estimatedDuration);
                                                                        setScheduleNotes(p.schedule.installationNotes || '');
                                                                    }
                                                                    setShowScheduleModal(true);
                                                                }}
                                                                className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-blue-500/30 hover:border-blue-500"
                                                            >
                                                                <Calendar className="w-3 h-3" />
                                                                Reschedule
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setCompletionProjectId(p.id);
                                                                    setCompletionNotes('');
                                                                    setAutoGenerateInvoice(false);
                                                                    setShowCompletionModal(true);
                                                                }}
                                                                className="flex-1 bg-[#F6B45A]/10 hover:bg-[#F6B45A] text-[#F6B45A] hover:text-black py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-[#F6B45A]/30 hover:border-[#F6B45A]"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                Complete
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleUnapproveProject(p.id)}
                                                        className="flex-shrink-0 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-2 rounded-lg text-xs font-bold transition-all border border-white/5 hover:border-red-500/30"
                                                        title="Move back to draft"
                                                    >
                                                        <Undo2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Invoice & Add Image Buttons */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleGenerateInvoice(p)}
                                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                                    >
                                                        <Receipt className="w-4 h-4" />
                                                        Invoice
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenAddImageModal(p.id)}
                                                        className="flex-shrink-0 bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 text-[#F6B45A] p-3 rounded-lg text-xs font-bold transition-all border border-[#F6B45A]/30 hover:border-[#F6B45A]/50"
                                                        title="Add Another Image"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                     </>
                 )}

                 {/* SUB-TAB: INVOICING */}
                 {projectsSubTab === 'invoicing' && (
                     <>
                         {currentInvoice ? (
                             /* Invoice Editor View - Matches QuoteView Layout with Blue Theme */
                             <motion.div
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ duration: 0.4 }}
                                 className="max-w-4xl mx-auto"
                             >
                                 {/* Invoice Header */}
                                 <div className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative">
                                     {/* Ambient glow effects */}
                                     <div className="absolute top-0 left-1/4 w-96 h-48 bg-blue-500/10 blur-3xl pointer-events-none" />
                                     <div className="absolute top-0 right-1/4 w-64 h-32 bg-cyan-500/5 blur-2xl pointer-events-none" />

                                     {/* Decorative corner accents */}
                                     <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-blue-500/30 rounded-tl-2xl" />
                                     <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-blue-500/30 rounded-tr-2xl" />

                                     {/* Top Bar */}
                                     <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/5 relative z-10">
                                         <div className="flex items-center gap-4">
                                             <motion.div
                                                 whileHover={{ scale: 1.05, rotate: 5 }}
                                                 className="p-3 bg-gradient-to-br from-blue-500/30 to-cyan-500/20 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/10"
                                             >
                                                 <Receipt className="w-6 h-6 text-blue-400" />
                                             </motion.div>
                                             <div>
                                                 <h3 className="text-xl font-bold text-white font-serif tracking-wide">{currentInvoice.invoiceNumber}</h3>
                                                 <p className="text-xs text-gray-400 flex items-center gap-2">
                                                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                                     {currentInvoice.projectName}
                                                 </p>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <motion.span
                                                 initial={{ scale: 0.9 }}
                                                 animate={{ scale: 1 }}
                                                 className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                     currentInvoice.status === 'draft' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                     currentInvoice.status === 'sent' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10' :
                                                     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                                                 }`}
                                             >
                                                 <span className="flex items-center gap-2">
                                                     <span className={`w-1.5 h-1.5 rounded-full ${
                                                         currentInvoice.status === 'draft' ? 'bg-gray-400' :
                                                         currentInvoice.status === 'sent' ? 'bg-blue-400 animate-pulse' :
                                                         'bg-emerald-400'
                                                     }`} />
                                                     {currentInvoice.status}
                                                 </span>
                                             </motion.span>
                                             <motion.button
                                                 whileHover={{ scale: 1.1, rotate: 90 }}
                                                 whileTap={{ scale: 0.9 }}
                                                 onClick={() => setCurrentInvoice(null)}
                                                 className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/10"
                                             >
                                                 <X className="w-5 h-5" />
                                             </motion.button>
                                         </div>
                                     </div>

                                     {/* Invoice Details */}
                                     <div className="p-6 space-y-8 relative z-10">
                                         {/* Dates Row */}
                                         <motion.div
                                             initial={{ opacity: 0, x: -20 }}
                                             animate={{ opacity: 1, x: 0 }}
                                             transition={{ delay: 0.1 }}
                                             className="grid grid-cols-2 gap-6"
                                         >
                                             <div className="group">
                                                 <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                     <Calendar className="w-3 h-3 text-blue-500" />
                                                     Invoice Date
                                                 </label>
                                                 <div className="relative">
                                                     <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                                     <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden group-hover:border-blue-500/30 transition-colors">
                                                         <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                                                         <input
                                                             type="date"
                                                             value={currentInvoice.invoiceDate}
                                                             onChange={(e) => handleInvoiceChange('invoiceDate', e.target.value)}
                                                             className="w-full bg-transparent pl-12 pr-4 py-3.5 text-white text-sm focus:outline-none"
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                             <div className="group">
                                                 <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                     <Clock className="w-3 h-3 text-cyan-500" />
                                                     Due Date
                                                 </label>
                                                 <div className="relative">
                                                     <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                                     <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden group-hover:border-cyan-500/30 transition-colors">
                                                         <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
                                                         <input
                                                             type="date"
                                                             value={currentInvoice.dueDate}
                                                             onChange={(e) => handleInvoiceChange('dueDate', e.target.value)}
                                                             className="w-full bg-transparent pl-12 pr-4 py-3.5 text-white text-sm focus:outline-none"
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         </motion.div>

                                         {/* Client Details */}
                                         <motion.div
                                             initial={{ opacity: 0, x: -20 }}
                                             animate={{ opacity: 1, x: 0 }}
                                             transition={{ delay: 0.2 }}
                                         >
                                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                 <User className="w-3 h-3 text-blue-500" />
                                                 Bill To
                                             </label>
                                             <div className="bg-[#0a0a0a]/50 border border-white/10 rounded-xl p-4 space-y-4 hover:border-blue-500/20 transition-colors">
                                                 <div className="grid grid-cols-2 gap-4">
                                                     <div className="relative group">
                                                         <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                                         <input
                                                             type="text"
                                                             value={currentInvoice.clientDetails.name}
                                                             onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, name: e.target.value })}
                                                             placeholder="Client Name"
                                                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                         />
                                                     </div>
                                                     <div className="relative group">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors text-sm">@</span>
                                                         <input
                                                             type="email"
                                                             value={currentInvoice.clientDetails.email}
                                                             onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, email: e.target.value })}
                                                             placeholder="Client Email"
                                                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                         />
                                                     </div>
                                                     <div className="relative group">
                                                         <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                                         <input
                                                             type="text"
                                                             value={currentInvoice.clientDetails.phone}
                                                             onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, phone: e.target.value })}
                                                             placeholder="Phone"
                                                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                         />
                                                     </div>
                                                     <div className="relative group">
                                                         <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                                         <input
                                                             type="text"
                                                             value={currentInvoice.clientDetails.address}
                                                             onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, address: e.target.value })}
                                                             placeholder="Address"
                                                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         </motion.div>

                                         {/* Line Items */}
                                         <motion.div
                                             initial={{ opacity: 0, x: -20 }}
                                             animate={{ opacity: 1, x: 0 }}
                                             transition={{ delay: 0.3 }}
                                         >
                                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                 <Receipt className="w-3 h-3 text-blue-500" />
                                                 Line Items
                                                 <span className="ml-auto text-blue-500/50">{currentInvoice.lineItems.length} items</span>
                                             </label>
                                             <div className="hidden md:block bg-gradient-to-b from-[#0a0a0a] to-[#080808] rounded-xl border border-white/10 overflow-hidden shadow-xl shadow-black/20">
                                                 {/* Header */}
                                                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500/5 to-transparent">
                                                     <div className="col-span-4 text-gray-400">Description</div>
                                                     <div className="col-span-2 text-center text-gray-400">Qty</div>
                                                     <div className="col-span-2 text-center text-gray-400">Unit Price</div>
                                                     <div className="col-span-3 text-right text-gray-400">Total</div>
                                                     <div className="col-span-1"></div>
                                                 </div>
                                                 {/* Items */}
                                                 <AnimatePresence mode="popLayout">
                                                     {currentInvoice.lineItems.map((item, index) => (
                                                         <motion.div
                                                             key={item.id}
                                                             initial={{ opacity: 0, x: -20 }}
                                                             animate={{ opacity: 1, x: 0 }}
                                                             exit={{ opacity: 0, x: 20, height: 0 }}
                                                             transition={{ delay: index * 0.05 }}
                                                             className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all group"
                                                         >
                                                             <div className="col-span-4">
                                                                 <input
                                                                     type="text"
                                                                     value={item.description}
                                                                     onChange={(e) => handleInvoiceLineItemChange(item.id, 'description', e.target.value)}
                                                                     placeholder="Enter description..."
                                                                     className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                                                                 />
                                                             </div>
                                                             <div className="col-span-2 flex items-center justify-center gap-1">
                                                                 <motion.button
                                                                     whileHover={{ scale: 1.1 }}
                                                                     whileTap={{ scale: 0.9 }}
                                                                     onClick={() => handleInvoiceLineItemChange(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                                                     className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white border border-transparent hover:border-white/10"
                                                                 >
                                                                     <Minus className="w-3 h-3" />
                                                                 </motion.button>
                                                                 <input
                                                                     type="number"
                                                                     value={item.quantity}
                                                                     onChange={(e) => handleInvoiceLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                     className="w-12 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500/50 py-1"
                                                                 />
                                                                 <motion.button
                                                                     whileHover={{ scale: 1.1 }}
                                                                     whileTap={{ scale: 0.9 }}
                                                                     onClick={() => handleInvoiceLineItemChange(item.id, 'quantity', item.quantity + 1)}
                                                                     className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white border border-transparent hover:border-white/10"
                                                                 >
                                                                     <Plus className="w-3 h-3" />
                                                                 </motion.button>
                                                             </div>
                                                             <div className="col-span-2 flex items-center justify-center">
                                                                 <span className="text-blue-500/50 mr-1">$</span>
                                                                 <input
                                                                     type="number"
                                                                     value={item.unitPrice}
                                                                     onChange={(e) => handleInvoiceLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                     className="w-20 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500/50 py-1"
                                                                 />
                                                             </div>
                                                             <div className="col-span-3 text-right">
                                                                 <span className="text-white font-mono font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                                                                     ${item.total.toFixed(2)}
                                                                 </span>
                                                             </div>
                                                             <div className="col-span-1 flex justify-center">
                                                                 <motion.button
                                                                     whileHover={{ scale: 1.1 }}
                                                                     whileTap={{ scale: 0.9 }}
                                                                     onClick={() => handleRemoveInvoiceLineItem(item.id)}
                                                                     className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/20"
                                                                     title="Remove item"
                                                                 >
                                                                     <Trash2 className="w-3.5 h-3.5" />
                                                                 </motion.button>
                                                             </div>
                                                         </motion.div>
                                                     ))}
                                                 </AnimatePresence>
                                                 {/* Add Item Button */}
                                                 <motion.button
                                                     whileHover={{ scale: 1.01 }}
                                                     whileTap={{ scale: 0.99 }}
                                                     onClick={handleAddInvoiceLineItem}
                                                     className="w-full p-4 text-gray-400 hover:text-blue-400 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent hover:via-blue-500/10 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider border-t border-white/5"
                                                 >
                                                     <Plus className="w-4 h-4" />
                                                     Add Line Item
                                                 </motion.button>
                                             </div>

                                            {/* MOBILE CARDS - Hidden on desktop */}
                                            <div className="md:hidden space-y-3">
                                                {currentInvoice.lineItems.map((item, index) => (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.03 }}
                                                        className="bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border border-white/10 rounded-xl p-4 space-y-3"
                                                    >
                                                        {/* Description + Delete Row */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <input
                                                                type="text"
                                                                value={item.description}
                                                                onChange={(e) => handleInvoiceLineItemChange(item.id, 'description', e.target.value)}
                                                                placeholder="Item description..."
                                                                className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none placeholder-gray-500"
                                                            />
                                                            <motion.button
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleRemoveInvoiceLineItem(item.id)}
                                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </motion.button>
                                                        </div>

                                                        {/* Qty, Price, Total Row */}
                                                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                                                            {/* Quantity */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold uppercase text-gray-500">Qty</span>
                                                                <div className="flex items-center bg-[#0a0a0a] rounded-lg border border-white/10">
                                                                    <motion.button
                                                                        whileTap={{ scale: 0.9 }}
                                                                        onClick={() => handleInvoiceLineItemChange(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                                                        className="p-2 text-gray-400 hover:text-white"
                                                                    >
                                                                        <Minus className="w-3 h-3" />
                                                                    </motion.button>
                                                                    <input
                                                                        type="number"
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleInvoiceLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                        className="w-10 bg-transparent text-white text-sm text-center focus:outline-none font-bold"
                                                                    />
                                                                    <motion.button
                                                                        whileTap={{ scale: 0.9 }}
                                                                        onClick={() => handleInvoiceLineItemChange(item.id, 'quantity', item.quantity + 1)}
                                                                        className="p-2 text-gray-400 hover:text-white"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                    </motion.button>
                                                                </div>
                                                            </div>

                                                            {/* Unit Price */}
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-gray-500 text-sm">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={item.unitPrice}
                                                                    onChange={(e) => handleInvoiceLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                    className="w-20 bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none focus:border-blue-500/30"
                                                                />
                                                            </div>

                                                            {/* Total */}
                                                            <div className="text-right">
                                                                <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-mono">
                                                                    ${item.total.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}

                                                {/* Mobile Add Item Button */}
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleAddInvoiceLineItem}
                                                    className="w-full p-4 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl border border-dashed border-blue-500/30 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add Item
                                                </motion.button>
                                            </div>
                                         </motion.div>

                                         {/* Totals */}
                                         <motion.div
                                             initial={{ opacity: 0, x: 20 }}
                                             animate={{ opacity: 1, x: 0 }}
                                             transition={{ delay: 0.4 }}
                                             className="flex justify-end"
                                         >
                                             <div className="w-80 bg-gradient-to-br from-[#0a0a0a] to-[#080808] border border-white/10 rounded-xl p-5 space-y-4 shadow-xl shadow-black/20">
                                                 <div className="flex justify-between items-center text-sm">
                                                     <span className="text-gray-400">Subtotal</span>
                                                     <span className="text-white font-mono">${currentInvoice.subtotal.toFixed(2)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-sm">
                                                     <span className="text-gray-400">Tax ({(currentInvoice.taxRate * 100).toFixed(0)}%)</span>
                                                     <span className="text-white font-mono">${currentInvoice.taxAmount.toFixed(2)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-sm">
                                                     <span className="text-gray-400">Discount</span>
                                                     <div className="flex items-center gap-1">
                                                         <span className="text-red-400/70">-$</span>
                                                         <input
                                                             type="number"
                                                             value={currentInvoice.discount}
                                                             onChange={(e) => handleInvoiceChange('discount', parseFloat(e.target.value) || 0)}
                                                             className="w-20 bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                                                         />
                                                     </div>
                                                 </div>
                                                 <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                                     <span className="text-white font-bold text-lg">Grand Total</span>
                                                     <div className="relative">
                                                         <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-lg opacity-30" />
                                                         <span className="relative text-2xl font-mono font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                                             ${currentInvoice.total.toFixed(2)}
                                                         </span>
                                                     </div>
                                                 </div>
                                             </div>
                                         </motion.div>

                                         {/* Notes */}
                                         <motion.div
                                             initial={{ opacity: 0, y: 20 }}
                                             animate={{ opacity: 1, y: 0 }}
                                             transition={{ delay: 0.5 }}
                                             className="group"
                                         >
                                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                 <FileText className="w-3 h-3 text-blue-500" />
                                                 Notes & Payment Instructions
                                             </label>
                                             <div className="relative">
                                                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                                 <textarea
                                                     value={currentInvoice.notes}
                                                     onChange={(e) => handleInvoiceChange('notes', e.target.value)}
                                                     placeholder="Add any notes or payment instructions..."
                                                     className="relative w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-600 resize-none h-28"
                                                 />
                                             </div>
                                         </motion.div>
                                     </div>

                                     {/* Footer Actions */}
                                     <div className="flex items-center justify-between p-6 border-t border-white/10 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a] to-blue-500/5 relative z-10">
                                         {/* Bottom decorative accents */}
                                         <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-blue-500/20 rounded-bl-2xl" />
                                         <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-blue-500/20 rounded-br-2xl" />

                                         <motion.button
                                             whileHover={{ scale: 1.02 }}
                                             whileTap={{ scale: 0.98 }}
                                             onClick={() => handleInvoiceChange('status', currentInvoice.status === 'draft' ? 'sent' : currentInvoice.status === 'sent' ? 'paid' : 'draft')}
                                             className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                                 currentInvoice.status === 'draft' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20' :
                                                 currentInvoice.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20' :
                                                 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500 hover:text-white hover:border-gray-500'
                                             }`}
                                         >
                                             {currentInvoice.status === 'draft' ? 'Mark as Sent' : currentInvoice.status === 'sent' ? 'Mark as Paid' : 'Reset to Draft'}
                                         </motion.button>
                                         <motion.button
                                             whileHover={{ scale: 1.02 }}
                                             whileTap={{ scale: 0.98 }}
                                             onClick={() => handleDownloadInvoicePDF(currentInvoice)}
                                             className="relative group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all overflow-hidden"
                                         >
                                             {/* Shine effect */}
                                             <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                             {/* Glow */}
                                             <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
                                             <Download className="relative w-4 h-4" />
                                             <span className="relative">Download PDF</span>
                                         </motion.button>
                                         {/* Send Email Button */}
                                         <motion.button
                                             whileHover={{ scale: 1.02 }}
                                             whileTap={{ scale: 0.98 }}
                                             onClick={() => setShowInvoiceEmailModal(true)}
                                             className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                         >
                                             <Mail className="w-4 h-4" />
                                             <span>Email</span>
                                         </motion.button>
                                         {/* Share Portal Link Button */}
                                         <motion.button
                                             whileHover={{ scale: 1.02 }}
                                             whileTap={{ scale: 0.98 }}
                                             onClick={handleOpenInvoiceShareModal}
                                             className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                         >
                                             <Share2 className="w-4 h-4" />
                                             <span>Share</span>
                                         </motion.button>
                                     </div>
                                 </div>
                             </motion.div>
                         ) : (
                             /* Invoice List View */
                             <>
                                 {/* Invoice Header with Stats & Filters */}
                                 <div className="mb-6 space-y-4">
                                     {/* Stats Row */}
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                         <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-xl p-4">
                                             <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Invoices</p>
                                             <p className="text-2xl font-bold text-white">{invoiceStats.total}</p>
                                         </div>
                                         <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-emerald-500/20 rounded-xl p-4">
                                             <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Paid</p>
                                             <p className="text-2xl font-bold text-emerald-400">{invoiceStats.paid}</p>
                                         </div>
                                         <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-blue-500/20 rounded-xl p-4">
                                             <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Unpaid</p>
                                             <p className="text-2xl font-bold text-blue-400">${invoiceStats.totalUnpaid.toFixed(0)}</p>
                                         </div>
                                         <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-red-500/20 rounded-xl p-4">
                                             <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Overdue</p>
                                             <p className="text-2xl font-bold text-red-400">{invoiceStats.overdue > 0 ? `$${invoiceStats.totalOverdue.toFixed(0)}` : '0'}</p>
                                         </div>
                                     </div>

                                     {/* Filter Row */}
                                     <div className="flex flex-wrap items-center gap-3">
                                         {/* Search */}
                                         <div className="relative flex-1 min-w-[200px]">
                                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                             <input
                                                 type="text"
                                                 value={invoiceSearchTerm}
                                                 onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                                                 placeholder="Search invoices..."
                                                 className="w-full pl-10 pr-4 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                                             />
                                         </div>

                                         {/* Status Filter */}
                                         <div className="flex items-center gap-2">
                                             {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((status) => (
                                                 <button
                                                     key={status}
                                                     onClick={() => setInvoiceStatusFilter(status)}
                                                     className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                                         invoiceStatusFilter === status
                                                             ? status === 'all' ? 'bg-white/10 text-white' :
                                                               status === 'draft' ? 'bg-gray-500/20 text-gray-300' :
                                                               status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                                               status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                                                               'bg-red-500/20 text-red-400'
                                                             : 'text-gray-500 hover:bg-white/5'
                                                     }`}
                                                 >
                                                     {status}
                                                     {status !== 'all' && (
                                                         <span className="ml-1.5 opacity-70">
                                                             ({status === 'draft' ? invoiceStats.draft :
                                                               status === 'sent' ? invoiceStats.sent :
                                                               status === 'paid' ? invoiceStats.paid :
                                                               invoiceStats.overdue})
                                                         </span>
                                                     )}
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                 </div>

                                 {invoices.length === 0 ? (
                                     <motion.div
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-blue-500/20 rounded-3xl bg-gradient-to-b from-blue-500/5 to-transparent relative overflow-hidden"
                                     >
                                         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                                         <motion.div
                                           animate={{ y: [0, -8, 0] }}
                                           transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                           className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20"
                                           style={{ boxShadow: '0 0 30px rgba(59,130,246,0.2)' }}
                                         >
                                            <Receipt className="w-8 h-8 text-blue-500/60" />
                                         </motion.div>
                                         <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No Invoices Yet</p>
                                         <p className="text-sm text-gray-400 mt-1 max-w-[280px] text-center">Your invoices will appear here once you generate them from approved projects.</p>
                                         <motion.button
                                           whileHover={{ scale: 1.02 }}
                                           whileTap={{ scale: 0.98 }}
                                           onClick={() => { setProjectsSubTab('pipeline'); setPipelineStatusFilter('approved'); }}
                                           className="mt-6 px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition-colors relative z-10"
                                         >
                                           View Approved Projects
                                         </motion.button>
                                     </motion.div>
                                 ) : filteredInvoices.length === 0 ? (
                                     <motion.div
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       className="flex flex-col items-center justify-center h-[30vh] border border-dashed border-white/10 rounded-2xl"
                                     >
                                         <Search className="w-8 h-8 text-gray-500 mb-4" />
                                         <p className="text-gray-400">No invoices match your filters</p>
                                         <button
                                             onClick={() => { setInvoiceSearchTerm(''); setInvoiceStatusFilter('all'); }}
                                             className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                                         >
                                             Clear filters
                                         </button>
                                     </motion.div>
                                 ) : (
                                     <motion.div
                                         initial={{ opacity: 0 }}
                                         animate={{ opacity: 1 }}
                                         className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                                     >
                                         {filteredInvoices.map((invoice, index) => (
                                             <motion.div
                                                 key={invoice.id}
                                                 initial={{ opacity: 0, y: 20 }}
                                                 animate={{ opacity: 1, y: 0 }}
                                                 transition={{ delay: index * 0.05 }}
                                                 whileHover={{ y: -4, scale: 1.01 }}
                                                 className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all cursor-pointer group relative overflow-hidden"
                                             >
                                                 {/* Ambient glow on hover */}
                                                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-blue-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                                 {/* Decorative corner */}
                                                 <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-blue-500/0 group-hover:border-blue-500/30 rounded-tr-2xl transition-colors" />

                                                 {/* Delete Button */}
                                                 <motion.button
                                                     whileHover={{ scale: 1.1 }}
                                                     whileTap={{ scale: 0.9 }}
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         handleDeleteInvoice(invoice.id);
                                                     }}
                                                     className="absolute top-3 right-3 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/20"
                                                     title="Delete invoice"
                                                 >
                                                     <Trash2 className="w-4 h-4" />
                                                 </motion.button>

                                                 <div onClick={() => setCurrentInvoice(invoice)} className="flex items-start justify-between mb-4 relative z-10">
                                                     <div>
                                                         <p className="text-[10px] text-blue-400/70 font-mono mb-1 flex items-center gap-1.5">
                                                             <Receipt className="w-3 h-3" />
                                                             {invoice.invoiceNumber}
                                                         </p>
                                                         <h4 className="font-bold text-white font-serif tracking-wide">{invoice.projectName}</h4>
                                                         <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                                                             <User className="w-3 h-3" />
                                                             {invoice.clientDetails.name || 'No client'}
                                                         </p>
                                                     </div>
                                                     <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                                         getInvoiceStatus(invoice) === 'draft' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                         getInvoiceStatus(invoice) === 'sent' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                         getInvoiceStatus(invoice) === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                         'bg-red-500/10 text-red-400 border-red-500/20'
                                                     }`}>
                                                         <span className="flex items-center gap-1.5">
                                                             <span className={`w-1.5 h-1.5 rounded-full ${
                                                                 getInvoiceStatus(invoice) === 'draft' ? 'bg-gray-400' :
                                                                 getInvoiceStatus(invoice) === 'sent' ? 'bg-blue-400 animate-pulse' :
                                                                 getInvoiceStatus(invoice) === 'paid' ? 'bg-emerald-400' :
                                                                 'bg-red-400 animate-pulse'
                                                             }`} />
                                                             {getInvoiceStatus(invoice)}
                                                         </span>
                                                     </span>
                                                 </div>
                                                 <div onClick={() => setCurrentInvoice(invoice)} className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                                                     <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                                         <Clock className="w-3 h-3" />
                                                         Due: {new Date(invoice.dueDate).toLocaleDateString()}
                                                     </div>
                                                     <div className="text-lg font-bold font-mono bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                                         ${invoice.total.toFixed(2)}
                                                     </div>
                                                 </div>

                                                 {/* Bottom gradient line */}
                                                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                             </motion.div>
                                         ))}
                                     </motion.div>
                                 )}
                             </>
                         )}
                     </>
                 )}

                 {/* SUB-TAB: CLIENTS */}
                 {projectsSubTab === 'clients' && (
                     <>
                         {/* Clients Header */}
                         <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
                                     <Users className="w-6 h-6 text-purple-400" />
                                 </div>
                                 <div>
                                     <h3 className="text-xl font-bold text-white font-serif">Client Directory</h3>
                                     <p className="text-sm text-gray-400">{clients.length} clients</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3">
                                 {/* Client Search */}
                                 <div className="relative">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                     <input
                                         type="text"
                                         value={clientSearchTerm}
                                         onChange={(e) => setClientSearchTerm(e.target.value)}
                                         placeholder="Search clients..."
                                         className="w-48 pl-10 pr-4 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                     />
                                 </div>
                                 <motion.button
                                     onClick={() => setShowCompletedJobsModal(true)}
                                     whileHover={{ scale: 1.02 }}
                                     whileTap={{ scale: 0.98 }}
                                     className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-emerald-500/20 transition-colors"
                                 >
                                     <Check className="w-4 h-4" />
                                     Completed Jobs
                                 </motion.button>
                                 <motion.button
                                     onClick={() => {
                                         setClientImportData(null);
                                         setClientImportProgress(null);
                                         setClientImportResult(null);
                                         setShowClientImportModal(true);
                                     }}
                                     whileHover={{ scale: 1.02 }}
                                     whileTap={{ scale: 0.98 }}
                                     className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                 >
                                     <Upload className="w-4 h-4" />
                                     Import CSV
                                 </motion.button>
                                 <motion.button
                                     onClick={() => handleOpenClientModal()}
                                     whileHover={{ scale: 1.02 }}
                                     whileTap={{ scale: 0.98 }}
                                     className="px-4 py-2.5 bg-purple-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-purple-600 transition-colors"
                                 >
                                     <Plus className="w-4 h-4" />
                                     Add Client
                                 </motion.button>
                             </div>
                         </div>

                         {/* Clients Grid */}
                         {filteredClients.length === 0 ? (
                             <motion.div
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-purple-500/20 rounded-3xl bg-gradient-to-b from-purple-500/5 to-transparent"
                             >
                                 <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
                                     <Users className="w-8 h-8 text-purple-400/60" />
                                 </div>
                                 <p className="font-bold text-lg text-white font-serif mb-2">No Clients Yet</p>
                                 <p className="text-sm text-gray-400 mb-6">Add your first client to get started</p>
                                 <button
                                     onClick={() => handleOpenClientModal()}
                                     className="px-5 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 text-sm font-bold hover:bg-purple-500/20"
                                 >
                                     Add Client
                                 </button>
                             </motion.div>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                 {filteredClients.map((client, index) => {
                                     const clientProjectCount = projects.filter(p => p.clientId === client.id).length;
                                     return (
                                     <motion.div
                                         key={client.id}
                                         initial={{ opacity: 0, y: 20 }}
                                         animate={{ opacity: 1, y: 0 }}
                                         transition={{ delay: index * 0.05 }}
                                         className="group bg-gradient-to-b from-[#151515] to-[#111] border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 transition-all cursor-pointer"
                                         onClick={() => {
                                             setViewClientId(client.id);
                                             setShowClientProjectsModal(true);
                                         }}
                                     >
                                         <div className="flex items-start justify-between mb-4">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                     <User className="w-6 h-6 text-purple-400" />
                                                 </div>
                                                 <div>
                                                     <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">{client.name}</h4>
                                                     {client.email && (
                                                         <span className="text-xs text-purple-400">
                                                             {client.email}
                                                         </span>
                                                     )}
                                                 </div>
                                             </div>
                                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); handleSendPortalInvite(client); }}
                                                     disabled={!client.email || sendingPortalInvite === client.id}
                                                     className="p-2 hover:bg-emerald-500/10 rounded-lg text-gray-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                                     title={client.email ? 'Send Portal Invite' : 'No email address'}
                                                 >
                                                     {sendingPortalInvite === client.id ? (
                                                         <Loader2 className="w-4 h-4 animate-spin" />
                                                     ) : (
                                                         <ExternalLink className="w-4 h-4" />
                                                     )}
                                                 </button>
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); handleOpenClientModal(client); }}
                                                     className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                                 >
                                                     <Edit className="w-4 h-4" />
                                                 </button>
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                                                     className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"
                                                 >
                                                     <Trash2 className="w-4 h-4" />
                                                 </button>
                                             </div>
                                         </div>

                                         <div className="space-y-2 text-sm" onClick={(e) => e.stopPropagation()}>
                                             {client.phone && (
                                                 <div className="flex items-center gap-2 text-gray-400">
                                                     <Phone className="w-4 h-4" />
                                                     <a href={`tel:${client.phone}`} className="hover:text-white">{client.phone}</a>
                                                 </div>
                                             )}
                                             {client.address && (
                                                 <div className="flex items-start gap-2 text-gray-400">
                                                     <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                                     <span className="line-clamp-2">{client.address}</span>
                                                 </div>
                                             )}
                                         </div>

                                         {client.notes && (
                                             <div className="mt-4 pt-4 border-t border-white/5">
                                                 <p className="text-xs text-gray-500 line-clamp-2">{client.notes}</p>
                                             </div>
                                         )}

                                         {/* Projects Count Badge */}
                                         <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                             <div className="flex items-center gap-2 text-xs text-gray-400">
                                                 <FolderPlus className="w-3.5 h-3.5" />
                                                 <span>{clientProjectCount} project{clientProjectCount !== 1 ? 's' : ''}</span>
                                             </div>
                                             <div className="flex items-center gap-1 text-xs text-purple-400 group-hover:text-purple-300">
                                                 <span>View</span>
                                                 <ChevronRight className="w-3.5 h-3.5" />
                                             </div>
                                         </div>
                                     </motion.div>
                                     );
                                 })}
                             </div>
                         )}
                     </>
                 )}
             </div>
            </motion.div>
          )}

          {/* TAB: SCHEDULE */}
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ x: tabDirection * 100 + '%' }}
              animate={{ x: 0 }}
              exit={{ x: tabDirection * -100 + '%' }}
              transition={{ type: 'spring', stiffness: 700, damping: 45 }}
              className="absolute inset-0 h-full overflow-y-auto overflow-x-hidden bg-[#050505] pb-24 md:pb-20"
            >
              {/* Background Tech Mesh/Glow - Blue themed */}
              <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)' }}></div>
              <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

              {/* Show TechnicianDashboard for technicians, ScheduleView for everyone else */}
              {role === 'technician' ? (
                <TechnicianDashboard
                  projects={projects}
                  onMarkComplete={(projectId) => {
                    // Open completion modal
                    setCompletionProjectId(projectId);
                    setCompletionNotes('');
                    setAutoGenerateInvoice(false);
                    setShowCompletionModal(true);
                  }}
                  onViewDetails={(projectId) => {
                    // Navigate to projects tab to view details
                    handleTabChange('projects');
                    setProjectsSubTab('pipeline');
                  }}
                />
              ) : (
                <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
                  <ScheduleView
                    projects={filteredProjectsByLocation}
                    selectedDate={selectedCalendarDate}
                    onDateSelect={setSelectedCalendarDate}
                    onViewProject={(project) => {
                      // Open project detail modal to show quote and photo
                      setViewProjectId(project.id);
                      setShowProjectDetailModal(true);
                    }}
                    onScheduleProject={(project) => {
                      // Open schedule modal for approved project
                      setScheduleProjectId(project.id);
                      setScheduleDate(new Date());
                      setScheduleTimeSlot('morning');
                      setScheduleCustomTime('09:00');
                      setScheduleDuration(4);
                      setScheduleNotes('');
                      setShowScheduleModal(true);
                    }}
                    onReschedule={(project) => {
                      // Open schedule modal with existing data
                      setScheduleProjectId(project.id);
                      if (project.schedule) {
                        setScheduleDate(new Date(project.schedule.scheduledDate));
                        setScheduleTimeSlot(project.schedule.timeSlot);
                        setScheduleCustomTime(project.schedule.customTime || '09:00');
                        setScheduleDuration(project.schedule.estimatedDuration);
                        setScheduleNotes(project.schedule.installationNotes || '');
                      }
                      setShowScheduleModal(true);
                    }}
                    onComplete={(project) => {
                      // Open completion modal
                      setCompletionProjectId(project.id);
                      setCompletionNotes('');
                      setAutoGenerateInvoice(false);
                      setShowCompletionModal(true);
                    }}
                    events={calendarEvents}
                    onCreateEvent={handleCreateEvent}
                    onEditEvent={handleEditEvent}
                    onDeleteEvent={handleDeleteEvent}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: SETTINGS */}
           {activeTab === 'settings' && (
             <motion.div
               key="settings"
               initial={{ x: tabDirection * 100 + '%' }}
               animate={{ x: 0 }}
               exit={{ x: tabDirection * -100 + '%' }}
               transition={{ type: 'spring', stiffness: 700, damping: 45 }}
               className="absolute inset-0"
             >
             <SettingsView
                profile={companyProfile}
                onProfileChange={setCompanyProfile}
                colorTemp={colorTemp}
                onColorTempChange={setColorTemp}
                lightIntensity={lightIntensity}
                onLightIntensityChange={setLightIntensity}
                darknessLevel={darknessLevel}
                onDarknessLevelChange={setDarknessLevel}
                beamAngle={beamAngle}
                onBeamAngleChange={setBeamAngle}
                pricing={pricing}
                onPricingChange={setPricing}
                customPricing={customPricing}
                onCustomPricingChange={setCustomPricing}
                fixtureCatalog={fixtureCatalog}
                onFixtureCatalogChange={setFixtureCatalog}
                subscription={{
                  hasActiveSubscription: subscription.hasActiveSubscription,
                  plan: subscription.plan,
                  remainingFreeGenerations: subscription.remainingFreeGenerations,
                  freeTrialLimit: subscription.freeTrialLimit,
                  generationCount: subscription.generationCount,
                }}
                userId={user?.id}
                onRequestUpgrade={() => setShowPricing(true)}
                // Theme props
                theme={theme}
                onThemeChange={setTheme}
                accentColor={accentColor}
                onAccentColorChange={setAccentColor}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                highContrast={highContrast}
                onHighContrastChange={setHighContrast}
                // Notification props
                notifications={notifications}
                onNotificationsChange={setNotifications}
                // Business Goals
                businessGoals={businessGoals}
                onBusinessGoalChange={async (goal) => {
                  await createGoal(goal);
                }}
                // Sign out
                onSignOut={handleSignOut}
                // Save settings
                onSaveSettings={handleSaveSettings}
                isSaving={isSavingSettings}
                // Locations and Technicians
                locations={locations}
                locationsLoading={locationsLoading}
                onCreateLocation={createLocation}
                onUpdateLocation={updateLocation}
                onDeleteLocation={deleteLocation}
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
                technicians={technicians}
                techniciansLoading={techniciansLoading}
                onCreateTechnician={createTechnician}
                onUpdateTechnician={updateTechnician}
                onDeleteTechnician={deleteTechnician}
                // Analytics data for goal progress
                currentMonthRevenue={currentMonthRevenue}
                currentMonthProjects={currentMonthProjects}
                currentMonthClients={currentMonthClients}
                currentQuarterRevenue={currentQuarterRevenue}
                currentQuarterProjects={currentQuarterProjects}
                currentQuarterClients={currentQuarterClients}
                currentYearRevenue={currentYearRevenue}
                currentYearProjects={currentYearProjects}
                currentYearClients={currentYearClients}
                // Analytics data
                analyticsMetrics={analytics}
                leadSourceROI={leadSourceMetrics}
                cashFlowForecast={cashFlowForecast}
                locationMetrics={locationMetrics}
                technicianMetrics={technicianMetrics}
                companyMetrics={companyMetrics}
                // Analytics state
                analyticsDateRange={{ start: analyticsDateRange.startDate, end: analyticsDateRange.endDate }}
                onAnalyticsDateRangeChange={(range) => {
                  if (range.start && range.end) {
                    setAnalyticsDateRange({ startDate: range.start, endDate: range.end, label: 'Custom' });
                  }
                }}
                analyticsComparisonView={showComparison}
                onAnalyticsComparisonViewChange={setShowComparison}
                // Analytics actions
                onExportAnalytics={(format) => {
                  // Export logic can be implemented here
                  console.log(`Exporting analytics as ${format}`);
                }}
                // Advanced Analytics (formerly in Projects section)
                pipelineAnalytics={pipelineAnalytics}
                businessHealthData={businessHealthData}
                pipelineForecastData={pipelineForecastData}
                teamPerformanceData={teamPerformanceData}
                capacityPlanningData={capacityPlanningData}
                onViewProject={(projectId) => {
                  setViewProjectId(projectId);
                  setShowProjectDetailModal(true);
                }}
             />
             </motion.div>
          )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <Footer variant="minimal" />
      </div>

      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Schedule Installation</h3>
                </div>
                <motion.button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Project Info */}
                {scheduleProjectId && (() => {
                  const project = projects.find(p => p.id === scheduleProjectId);
                  if (!project) return null;
                  return (
                    <div className="bg-white/5 rounded-xl p-3 space-y-1">
                      <p className="font-medium text-white">{project.name}</p>
                      {project.quote?.clientDetails && (
                        <p className="text-sm text-gray-400">
                          {project.quote.clientDetails.name} · {project.quote.clientDetails.address}
                        </p>
                      )}
                      {project.quote?.total && (
                        <p className="text-sm text-blue-400">Estimate: ${project.quote.total.toLocaleString()}</p>
                      )}
                    </div>
                  );
                })()}

                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Installation Date</label>
                  <input
                    type="date"
                    value={scheduleDate.toISOString().split('T')[0]}
                    onChange={(e) => setScheduleDate(new Date(e.target.value))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Time Slot</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['morning', 'afternoon', 'evening', 'custom'] as const).map(slot => (
                      <motion.button
                        key={slot}
                        onClick={() => setScheduleTimeSlot(slot)}
                        className={`p-3 rounded-xl border transition-all ${
                          scheduleTimeSlot === slot
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-sm font-medium capitalize">{slot}</div>
                        <div className="text-xs opacity-70">
                          {slot === 'morning' && '8-12'}
                          {slot === 'afternoon' && '12-5'}
                          {slot === 'evening' && '5-8'}
                          {slot === 'custom' && 'Set time'}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  {scheduleTimeSlot === 'custom' && (
                    <input
                      type="time"
                      value={scheduleCustomTime}
                      onChange={(e) => setScheduleCustomTime(e.target.value)}
                      className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Duration</label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setScheduleDuration(Math.max(1, scheduleDuration - 1))}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Minus className="w-4 h-4 text-gray-400" />
                    </motion.button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold text-white">{scheduleDuration}</span>
                      <span className="text-gray-400 ml-1">hours</span>
                    </div>
                    <motion.button
                      onClick={() => setScheduleDuration(Math.min(12, scheduleDuration + 1))}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Installation Notes (optional)</label>
                  <textarea
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="Gate codes, parking instructions, access notes..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>

                {/* Conflict Warning */}
                {scheduleConflicts.hasConflict && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-400">Scheduling Conflict Detected</p>
                        <p className="text-xs text-amber-400/80">
                          This time slot overlaps with {scheduleConflicts.conflicts.length} existing {scheduleConflicts.conflicts.length === 1 ? 'item' : 'items'}:
                        </p>
                        <ul className="space-y-1">
                          {scheduleConflicts.conflicts.map((conflict) => (
                            <li key={conflict.id} className="text-xs text-amber-300/70 flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${conflict.type === 'project' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                              <span className="font-medium">{conflict.name}</span>
                              <span className="text-amber-400/50">·</span>
                              <span>{formatTimeSlot(conflict.timeSlot, conflict.customTime)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-400/60 italic">You can still proceed, but consider adjusting the time.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-white/10">
                <motion.button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleProjectId(null);
                    setScheduleNotes('');
                    showToast('info', 'You can schedule this job later from the Schedule tab');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Schedule Later
                </motion.button>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={async () => {
                      if (!scheduleProjectId) return;
                      const project = projects.find(p => p.id === scheduleProjectId);
                      const scheduleData: ScheduleData = {
                        scheduledDate: scheduleDate.toISOString().split('T')[0],
                        timeSlot: scheduleTimeSlot,
                        customTime: scheduleTimeSlot === 'custom' ? scheduleCustomTime : undefined,
                        estimatedDuration: scheduleDuration,
                        installationNotes: scheduleNotes || undefined,
                      };
                      const success = await scheduleProject(scheduleProjectId, scheduleData);
                      if (success) {
                        showToast('success', 'Job scheduled successfully!');
                        setShowScheduleModal(false);
                        // Show next step prompt
                        setNextStepProjectId(scheduleProjectId);
                        setNextStepType('schedule');
                        setShowNextStepModal(true);
                        setScheduleProjectId(null);
                        setScheduleNotes('');

                        // Send scheduling confirmation email to client
                        if (project?.quote?.clientDetails?.email) {
                          try {
                            await fetch('/api/send-schedule-confirmation', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                clientEmail: project.quote.clientDetails.email,
                                clientName: project.quote.clientDetails.name || 'Valued Customer',
                                projectName: project.name,
                                companyName: companyProfile.name,
                                companyEmail: companyProfile.email,
                                companyPhone: companyProfile.phone,
                                scheduledDate: scheduleData.scheduledDate,
                                timeSlot: scheduleData.timeSlot,
                                customTime: scheduleData.customTime,
                                installationNotes: scheduleData.installationNotes,
                                address: project.quote.clientDetails.address
                              })
                            });
                            showToast('success', 'Confirmation email sent to client');
                          } catch (emailErr) {
                            console.error('Failed to send schedule confirmation:', emailErr);
                          }
                        }
                      } else {
                        showToast('error', 'Failed to schedule job');
                      }
                    }}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Schedule Job
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompletionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Complete Installation</h3>
                </div>
                <motion.button
                  onClick={() => setShowCompletionModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {completionProjectId && (() => {
                  const project = projects.find(p => p.id === completionProjectId);
                  if (!project) return null;
                  return (
                    <div className="bg-white/5 rounded-xl p-3 space-y-1">
                      <p className="font-medium text-white">{project.name}</p>
                      {project.schedule && (
                        <p className="text-sm text-gray-400">
                          Scheduled: {new Date(project.schedule.scheduledDate).toLocaleDateString()} ({project.schedule.timeSlot})
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Completion Notes (optional)</label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Installation complete. Any notes about the job..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoGenerateInvoice}
                    onChange={(e) => setAutoGenerateInvoice(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <span className="text-sm text-gray-300">Generate invoice automatically</span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
                <motion.button
                  onClick={() => setShowCompletionModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={async () => {
                    if (!completionProjectId) return;
                    const success = await completeProject(completionProjectId, completionNotes || undefined);
                    if (success) {
                      showToast('success', 'Job marked as complete!');
                      setShowCompletionModal(false);

                      // Auto-generate invoice if checked
                      if (autoGenerateInvoice) {
                        const project = projects.find(p => p.id === completionProjectId);
                        if (project) {
                          handleTabChange('projects');
                          handleGenerateInvoice(project);
                        }
                      } else {
                        // Show next step prompt for invoice
                        setNextStepProjectId(completionProjectId);
                        setNextStepType('invoice');
                        setShowNextStepModal(true);
                      }

                      setCompletionProjectId(null);
                      setCompletionNotes('');
                    } else {
                      showToast('error', 'Failed to complete job');
                    }
                  }}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Mark Complete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Detail Modal (View from Schedule) */}
      <AnimatePresence>
        {showProjectDetailModal && viewProjectId && (() => {
          const project = projects.find(p => p.id === viewProjectId);
          if (!project) return null;

          const primaryImage = project.images && project.images.length > 0 ? project.images[0].url : project.image;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowProjectDetailModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#111]/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/20 flex items-center justify-center">
                      {isEditingProject ? <Edit3 className="w-5 h-5 text-[#F6B45A]" /> : <FileText className="w-5 h-5 text-[#F6B45A]" />}
                    </div>
                    <div>
                      {isEditingProject ? (
                        <input
                          type="text"
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          className="text-lg font-semibold text-white bg-white/5 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:border-[#F6B45A]/50"
                          placeholder="Project name"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      )}
                      <p className="text-xs text-gray-400">
                        {isEditingProject ? 'Editing project details' : (project.quote?.clientDetails?.name || 'No client info')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingProject && (
                      <motion.button
                        onClick={() => {
                          setIsEditingProject(true);
                          setEditProjectName(project.name);
                          setEditClientName(project.quote?.clientDetails?.name || project.clientName || '');
                          setEditClientEmail(project.quote?.clientDetails?.email || '');
                          setEditClientPhone(project.quote?.clientDetails?.phone || '');
                          setEditClientAddress(project.quote?.clientDetails?.address || '');
                          setEditProjectNotes(project.notes || '');
                          setEditLineItems(project.quote?.lineItems || []);
                          setEditProjectLocationId(project.location_id || null);
                        }}
                        className="p-2 rounded-lg bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Edit project"
                      >
                        <Edit3 className="w-5 h-5 text-[#F6B45A]" />
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => {
                        setShowProjectDetailModal(false);
                        setIsEditingProject(false);
                        setEditLineItems([]);
                        setEditProjectLocationId(null);
                        setShowAddItemDropdown(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </motion.button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-4 space-y-6">
                  {/* Project Image */}
                  {primaryImage && (
                    <div className="relative rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={primaryImage}
                        alt={project.name}
                        className="w-full h-64 md:h-96 object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white font-medium border border-white/10">
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Schedule Info */}
                  {project.schedule && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-semibold">Scheduled Installation</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Date:</span>
                          <p className="text-white font-medium">
                            {new Date(project.schedule.scheduledDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Time:</span>
                          <p className="text-white font-medium">
                            {formatTimeSlot(project.schedule.timeSlot, project.schedule.customTime)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Duration:</span>
                          <p className="text-white font-medium">{project.schedule.estimatedDuration} hours</p>
                        </div>
                        {project.schedule.installationNotes && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Notes:</span>
                            <p className="text-white">{project.schedule.installationNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Schedule Job Button - for approved projects without schedule */}
                  {project.status === 'approved' && !project.schedule && (
                    <motion.button
                      onClick={() => {
                        setScheduleProjectId(project.id);
                        setScheduleDate(new Date());
                        setScheduleTimeSlot('morning');
                        setScheduleCustomTime('09:00');
                        setScheduleDuration(2);
                        setScheduleNotes('');
                        setShowScheduleModal(true);
                      }}
                      className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-emerald-500/20 transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-emerald-400 font-semibold">Schedule Job</p>
                        <p className="text-xs text-gray-500">Set installation date and time</p>
                      </div>
                    </motion.button>
                  )}

                  {/* Quote Details */}
                  {project.quote && (
                    <div className="space-y-4">
                      <h4 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-[#F6B45A]" />
                        Quote Details
                      </h4>

                      {/* Client Details */}
                      <div className="bg-white/5 rounded-xl p-4 space-y-3">
                        {isEditingProject ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Client Name</label>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <input
                                  type="text"
                                  value={editClientName}
                                  onChange={(e) => setEditClientName(e.target.value)}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F6B45A]/50"
                                  placeholder="Client name"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Email</label>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <input
                                  type="email"
                                  value={editClientEmail}
                                  onChange={(e) => setEditClientEmail(e.target.value)}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F6B45A]/50"
                                  placeholder="client@email.com"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Phone</label>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <input
                                  type="tel"
                                  value={editClientPhone}
                                  onChange={(e) => setEditClientPhone(e.target.value)}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F6B45A]/50"
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Address</label>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <input
                                  type="text"
                                  value={editClientAddress}
                                  onChange={(e) => setEditClientAddress(e.target.value)}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F6B45A]/50"
                                  placeholder="123 Main St, City, ST 12345"
                                />
                              </div>
                            </div>
                            {/* Location Assignment */}
                            {locations.length > 0 && (
                              <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Assigned Location</label>
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-gray-500" />
                                  <select
                                    value={editProjectLocationId || ''}
                                    onChange={(e) => setEditProjectLocationId(e.target.value || null)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F6B45A]/50"
                                  >
                                    <option value="" className="bg-[#1a1a1a] text-white">No Location Assigned</option>
                                    {locations.filter(loc => loc.isActive).map(loc => (
                                      <option key={loc.id} value={loc.id} className="bg-[#1a1a1a] text-white">{loc.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <p className="text-white font-medium">{project.quote.clientDetails.name}</p>
                              <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {project.quote.clientDetails.email}
                              </p>
                              {project.quote.clientDetails.phone && (
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {project.quote.clientDetails.phone}
                                </p>
                              )}
                              {project.quote.clientDetails.address && (
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {project.quote.clientDetails.address}
                                </p>
                              )}
                              {project.location_id && (
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  {locations.find(l => l.id === project.location_id)?.name || 'Unknown Location'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Line Items */}
                      {isEditingProject ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400 font-medium">Line Items</p>
                            <div className="relative">
                              <motion.button
                                onClick={() => setShowAddItemDropdown(!showAddItemDropdown)}
                                className="px-3 py-1.5 bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 text-[#F6B45A] text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Item
                              </motion.button>
                              {showAddItemDropdown && (
                                <div className="absolute right-0 mt-1 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                                  {pricing.map((fixture) => (
                                    <button
                                      key={fixture.id}
                                      onClick={() => {
                                        const newItem: LineItem = {
                                          id: `${fixture.fixtureType}_${Date.now()}`,
                                          name: fixture.name,
                                          description: fixture.description,
                                          quantity: 1,
                                          unitPrice: fixture.unitPrice,
                                        };
                                        setEditLineItems([...editLineItems, newItem]);
                                        setShowAddItemDropdown(false);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                      <p className="text-white text-sm font-medium truncate">{fixture.name}</p>
                                      <p className="text-xs text-gray-500">${fixture.unitPrice.toFixed(2)} each</p>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {editLineItems.length > 0 ? (
                            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                              {editLineItems.map((item, idx) => (
                                <div
                                  key={item.id}
                                  className={`p-3 flex items-center gap-3 ${
                                    idx !== editLineItems.length - 1 ? 'border-b border-white/5' : ''
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} each</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <motion.button
                                      onClick={() => {
                                        if (item.quantity > 1) {
                                          setEditLineItems(editLineItems.map(li =>
                                            li.id === item.id ? { ...li, quantity: li.quantity - 1 } : li
                                          ));
                                        }
                                      }}
                                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </motion.button>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                                        setEditLineItems(editLineItems.map(li =>
                                          li.id === item.id ? { ...li, quantity: qty } : li
                                        ));
                                      }}
                                      className="w-12 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-[#F6B45A]/50"
                                    />
                                    <motion.button
                                      onClick={() => {
                                        setEditLineItems(editLineItems.map(li =>
                                          li.id === item.id ? { ...li, quantity: li.quantity + 1 } : li
                                        ));
                                      }}
                                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </div>
                                  <div className="text-right w-20">
                                    <p className="text-[#F6B45A] text-sm font-medium">
                                      ${(item.quantity * item.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                  <motion.button
                                    onClick={() => {
                                      setEditLineItems(editLineItems.filter(li => li.id !== item.id));
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                              <p className="text-gray-500 text-sm">No items added yet. Click "Add Item" to add fixtures.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        project.quote.lineItems && project.quote.lineItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-400 font-medium">Line Items</p>
                            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                              {project.quote.lineItems.map((item, idx) => (
                                <div
                                  key={item.id}
                                  className={`p-3 flex items-center justify-between ${
                                    idx !== project.quote!.lineItems.length - 1 ? 'border-b border-white/5' : ''
                                  }`}
                                >
                                  <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{item.name}</p>
                                    {item.description && (
                                      <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-white text-sm">
                                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      ${(item.quantity * item.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}

                      {/* Quote Summary */}
                      <div className="bg-gradient-to-r from-[#F6B45A]/10 to-[#F6B45A]/5 border border-[#F6B45A]/20 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">Subtotal</span>
                          <span className="text-white font-medium">
                            ${(project.quote.total / (1 + project.quote.taxRate / 100) + (project.quote.discount || 0)).toFixed(2)}
                          </span>
                        </div>
                        {project.quote.discount && project.quote.discount > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Discount</span>
                            <span className="text-emerald-400 font-medium">-${project.quote.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">Tax ({project.quote.taxRate}%)</span>
                          <span className="text-white font-medium">
                            ${((project.quote.total / (1 + project.quote.taxRate / 100)) * (project.quote.taxRate / 100)).toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#F6B45A]/20">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-semibold">Total</span>
                            <span className="text-[#F6B45A] font-bold text-xl">
                              ${project.quote.total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No Quote Message */}
                  {!project.quote && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-400 font-medium text-sm">No Quote Available</p>
                        <p className="text-gray-400 text-xs mt-1">This project doesn't have a quote generated yet.</p>
                      </div>
                    </div>
                  )}

                  {/* Notes Section - Only in edit mode or if notes exist */}
                  {(isEditingProject || project.notes) && (
                    <div className="space-y-2">
                      <h4 className="text-white font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        Project Notes
                      </h4>
                      {isEditingProject ? (
                        <textarea
                          value={editProjectNotes}
                          onChange={(e) => setEditProjectNotes(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F6B45A]/50 resize-none"
                          rows={4}
                          placeholder="Add notes about this project..."
                        />
                      ) : (
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 sticky bottom-0 bg-[#111]/95 backdrop-blur-sm">
                  {isEditingProject ? (
                    <>
                      <motion.button
                        onClick={() => {
                          setIsEditingProject(false);
                          setEditProjectName('');
                          setEditClientName('');
                          setEditClientEmail('');
                          setEditClientPhone('');
                          setEditClientAddress('');
                          setEditProjectNotes('');
                          setEditLineItems([]);
                          setEditProjectLocationId(null);
                          setShowAddItemDropdown(false);
                        }}
                        className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSavingProject}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={async () => {
                          if (!viewProjectId) return;
                          setIsSavingProject(true);
                          try {
                            // Calculate new subtotal and total from edited line items
                            const subtotal = editLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                            const taxRate = project.quote?.taxRate || 0;
                            const discount = project.quote?.discount || 0;
                            const newTotal = (subtotal - discount) * (1 + taxRate / 100);

                            const updatedQuote = project.quote ? {
                              ...project.quote,
                              lineItems: editLineItems,
                              total: newTotal,
                              clientDetails: {
                                name: editClientName,
                                email: editClientEmail,
                                phone: editClientPhone,
                                address: editClientAddress,
                              }
                            } : undefined;

                            const success = await updateProject(viewProjectId, {
                              name: editProjectName,
                              clientName: editClientName,
                              quote: updatedQuote,
                              notes: editProjectNotes,
                              location_id: editProjectLocationId,
                            });

                            if (success) {
                              showToast('success', 'Project updated successfully!');
                              setIsEditingProject(false);
                              setShowAddItemDropdown(false);
                            } else {
                              showToast('error', 'Failed to update project');
                            }
                          } catch (error) {
                            console.error('Error updating project:', error);
                            showToast('error', 'Failed to update project');
                          } finally {
                            setIsSavingProject(false);
                          }
                        }}
                        className="px-6 py-2 bg-[#F6B45A] hover:bg-[#f6c45a] text-black font-medium rounded-xl transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSavingProject}
                      >
                        {isSavingProject ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </motion.button>
                    </>
                  ) : (
                    <>
                      {/* Send Quote Button - only show for quoted status */}
                      {project.quote && project.status === 'quoted' && (
                        <motion.button
                          onClick={() => handleSendQuoteToPortal(project)}
                          disabled={isSendingQuote}
                          className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isSendingQuote ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Send Quote
                            </>
                          )}
                        </motion.button>
                      )}
                      {/* Schedule Button - show for approved projects */}
                      {project.status === 'approved' && (
                        <motion.button
                          onClick={() => {
                            setShowProjectDetailModal(false);
                            setScheduleProjectId(project.id);
                            setScheduleDate(new Date());
                            setScheduleTimeSlot('morning');
                            setScheduleCustomTime('09:00');
                            setScheduleDuration(2);
                            setScheduleNotes('');
                            setShowScheduleModal(true);
                          }}
                          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Calendar className="w-4 h-4" />
                          Schedule
                        </motion.button>
                      )}
                      {/* Generate Quote Button - show for draft status */}
                      {project.status === 'draft' && (
                        <motion.button
                          onClick={() => {
                            setShowProjectDetailModal(false);
                            setCurrentProjectId(project.id);
                            if (project.image) setGeneratedImage(project.image);
                            setCurrentQuote(null);
                            setProjectsSubTab('quotes');
                          }}
                          className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FileText className="w-4 h-4" />
                          Generate Quote
                        </motion.button>
                      )}
                      {/* Reschedule Button - show for scheduled projects */}
                      {project.status === 'scheduled' && (
                        <motion.button
                          onClick={() => {
                            setShowProjectDetailModal(false);
                            setScheduleProjectId(project.id);
                            setScheduleDate(project.schedule?.scheduledDate ? new Date(project.schedule.scheduledDate) : new Date());
                            setScheduleTimeSlot(project.schedule?.timeSlot || 'morning');
                            setScheduleCustomTime(project.schedule?.customTime || '09:00');
                            setScheduleDuration(project.schedule?.estimatedDuration || 2);
                            setScheduleNotes(project.schedule?.installationNotes || '');
                            setShowScheduleModal(true);
                          }}
                          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Calendar className="w-4 h-4" />
                          Reschedule
                        </motion.button>
                      )}
                      {/* Complete Button - only show for scheduled projects */}
                      {project.status === 'scheduled' && (
                        <motion.button
                          onClick={() => {
                            setShowProjectDetailModal(false);
                            setCompletionProjectId(project.id);
                            setCompletionNotes('');
                            setAutoGenerateInvoice(false);
                            setShowCompletionModal(true);
                          }}
                          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Complete
                        </motion.button>
                      )}
                      {/* Generate Invoice Button - show for scheduled or completed projects */}
                      {(project.status === 'scheduled' || project.status === 'completed') && (
                        <motion.button
                          onClick={() => {
                            setShowProjectDetailModal(false);
                            handleGenerateInvoice(project);
                          }}
                          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Receipt className="w-4 h-4" />
                          Generate Invoice
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => {
                          setShowProjectDetailModal(false);
                          setIsEditingProject(false);
                          setEditLineItems([]);
                          setEditProjectLocationId(null);
                          setShowAddItemDropdown(false);
                        }}
                        className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Close
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Client Projects Modal (View all projects for a client) */}
      <AnimatePresence>
        {showClientProjectsModal && viewClientId && (() => {
          const client = clients.find(c => c.id === viewClientId);
          if (!client) return null;

          const clientProjects = projects.filter(p => p.clientId === viewClientId);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowClientProjectsModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#111]/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{client.name}</h3>
                      <p className="text-xs text-gray-400">
                        {clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowClientProjectsModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </motion.button>
                </div>

                {/* Client Info */}
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Content - Projects List */}
                <div className="p-4">
                  {clientProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mb-4 border border-gray-500/20">
                        <FolderPlus className="w-7 h-7 text-gray-400/60" />
                      </div>
                      <p className="font-bold text-lg text-white font-serif mb-2">No Projects Yet</p>
                      <p className="text-sm text-gray-400">This client doesn't have any projects.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clientProjects.map((project) => {
                        const primaryImage = project.images && project.images.length > 0 ? project.images[0].url : project.image;
                        const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                          draft: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
                          quoted: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
                          approved: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
                          scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
                          completed: { bg: 'bg-[#F6B45A]/20', text: 'text-[#F6B45A]', border: 'border-[#F6B45A]/30' },
                        };
                        const colors = statusColors[project.status] || statusColors.draft;

                        return (
                          <motion.div
                            key={project.id}
                            onClick={() => {
                              setShowClientProjectsModal(false);
                              setViewProjectId(project.id);
                              setShowProjectDetailModal(true);
                            }}
                            className="group bg-gradient-to-b from-[#151515] to-[#111] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/30 transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {/* Project Image */}
                            {primaryImage ? (
                              <div className="relative h-40 overflow-hidden">
                                <img
                                  src={primaryImage}
                                  alt={project.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 ${colors.bg} ${colors.text} ${colors.border} border rounded-full text-xs font-medium`}>
                                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                                <FileText className="w-8 h-8 text-gray-500" />
                              </div>
                            )}

                            {/* Project Info */}
                            <div className="p-4">
                              <h4 className="font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                                {project.name}
                              </h4>
                              <p className="text-xs text-gray-400 mb-3">
                                Created {new Date(project.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>

                              {/* Quote Total */}
                              {project.quote && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-400">Quote Total</span>
                                  <span className="text-[#F6B45A] font-bold">
                                    ${project.quote.total.toLocaleString()}
                                  </span>
                                </div>
                              )}

                              {/* Schedule Info */}
                              {project.schedule && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-blue-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {new Date(project.schedule.scheduledDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 sticky bottom-0 bg-[#111]/95 backdrop-blur-sm">
                  <motion.button
                    onClick={() => setShowClientProjectsModal(false)}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Completed Jobs Modal */}
      <AnimatePresence>
        {showCompletedJobsModal && (() => {
          const completedProjects = projects
            .filter(p => p.status === 'completed')
            .sort((a, b) => {
              // Sort by completion date (schedule date) descending, most recent first
              const dateA = a.schedule?.scheduledDate ? new Date(a.schedule.scheduledDate).getTime() : new Date(a.date).getTime();
              const dateB = b.schedule?.scheduledDate ? new Date(b.schedule.scheduledDate).getTime() : new Date(b.date).getTime();
              return dateB - dateA;
            });

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCompletedJobsModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#111]/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Completed Jobs</h3>
                      <p className="text-xs text-gray-400">
                        {completedProjects.length} completed project{completedProjects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowCompletedJobsModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </motion.button>
                </div>

                {/* Modal Content - Completed Projects List */}
                <div className="p-4">
                  {completedProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mb-4 border border-gray-500/20">
                        <Check className="w-7 h-7 text-gray-400/60" />
                      </div>
                      <p className="font-bold text-lg text-white font-serif mb-2">No Completed Jobs Yet</p>
                      <p className="text-sm text-gray-400">Completed projects will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedProjects.map((project, index) => {
                        const client = clients.find(c => c.id === project.clientId);
                        const primaryImage = project.images && project.images.length > 0 ? project.images[0].url : project.image;
                        const completionDate = project.schedule?.scheduledDate
                          ? new Date(project.schedule.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : new Date(project.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                        return (
                          <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => {
                              setShowCompletedJobsModal(false);
                              setViewProjectId(project.id);
                              setShowProjectDetailModal(true);
                            }}
                            className="group flex items-center gap-4 p-4 bg-gradient-to-r from-[#151515] to-[#111] border border-white/5 rounded-xl cursor-pointer hover:border-emerald-500/30 transition-all"
                          >
                            {/* Project Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-emerald-500/10">
                              {primaryImage ? (
                                <img
                                  src={primaryImage}
                                  alt={project.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Check className="w-6 h-6 text-emerald-400/40" />
                                </div>
                              )}
                            </div>

                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                                  {project.name}
                                </h4>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase shrink-0">
                                  Completed
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                {client && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span className="truncate">{client.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{completionDate}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quote Total */}
                            {project.quote && (
                              <div className="text-right shrink-0">
                                <p className="text-[#F6B45A] font-bold">${project.quote.total.toLocaleString()}</p>
                                {project.invoicePaidAt && (
                                  <p className="text-[10px] text-emerald-400 font-medium">PAID</p>
                                )}
                              </div>
                            )}

                            {/* Arrow */}
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 sticky bottom-0 bg-[#111]/95 backdrop-blur-sm">
                  <motion.button
                    onClick={() => setShowCompletedJobsModal(false)}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Next Step Modal - Workflow Prompts */}
      <AnimatePresence>
        {showNextStepModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNextStepModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Quote Next Step */}
              {nextStepType === 'quote' && (
                <>
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Project Saved!</h3>
                    <p className="text-gray-400">Would you like to create a quote for this project?</p>
                  </div>
                  <div className="flex border-t border-white/10">
                    <motion.button
                      onClick={() => setShowNextStepModal(false)}
                      className="flex-1 px-6 py-4 text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Later
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowNextStepModal(false);
                        if (nextStepProjectId) {
                          setCurrentProjectId(nextStepProjectId);
                          const project = projects.find(p => p.id === nextStepProjectId);
                          if (project?.image) setGeneratedImage(project.image);
                          setProjectsSubTab('quotes');
                          handleTabChange('projects');
                        }
                      }}
                      className="flex-1 px-6 py-4 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors font-bold border-l border-white/10"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Create Quote
                    </motion.button>
                  </div>
                </>
              )}

              {/* Schedule Complete Next Step */}
              {nextStepType === 'schedule' && (
                <>
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Job Scheduled!</h3>
                    <p className="text-gray-400">What would you like to do next?</p>
                  </div>
                  <div className="p-4 pt-0 space-y-2">
                    <motion.button
                      onClick={() => {
                        setShowNextStepModal(false);
                        handleTabChange('schedule');
                      }}
                      className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CalendarDays className="w-5 h-5" />
                      View on Calendar
                    </motion.button>
                    <motion.button
                      onClick={() => setShowNextStepModal(false)}
                      className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 font-medium transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Done
                    </motion.button>
                  </div>
                </>
              )}

              {/* Invoice Next Step */}
              {nextStepType === 'invoice' && (
                <>
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Job Completed!</h3>
                    <p className="text-gray-400">Ready to invoice the client?</p>
                  </div>
                  <div className="flex border-t border-white/10">
                    <motion.button
                      onClick={() => setShowNextStepModal(false)}
                      className="flex-1 px-6 py-4 text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Later
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowNextStepModal(false);
                        if (nextStepProjectId) {
                          const project = projects.find(p => p.id === nextStepProjectId);
                          if (project) handleGenerateInvoice(project);
                        }
                      }}
                      className="flex-1 px-6 py-4 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors font-bold border-l border-white/10 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Receipt className="w-5 h-5" />
                      Generate Invoice
                    </motion.button>
                  </div>
                </>
              )}

              {/* Payment Options Next Step */}
              {nextStepType === 'payment' && (
                <>
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#F6B45A]/20 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-[#F6B45A]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Invoice Sent!</h3>
                    <p className="text-gray-400">Help your client pay quickly</p>
                  </div>
                  <div className="p-4 pt-0 space-y-2">
                    <motion.button
                      onClick={() => {
                        if (currentInvoice) {
                          handleGenerateInvoiceShareLink();
                        }
                        setShowNextStepModal(false);
                      }}
                      className="w-full px-4 py-3 bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 border border-[#F6B45A]/30 rounded-xl text-[#F6B45A] font-medium transition-colors flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ExternalLink className="w-5 h-5" />
                      Copy Payment Portal Link
                    </motion.button>
                    <motion.button
                      onClick={() => setShowNextStepModal(false)}
                      className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 font-medium transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Done
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {editingEventId ? 'Edit Event' : 'Create Event'}
                  </h3>
                </div>
                <motion.button
                  onClick={() => setShowEventModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Event Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter event title..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['consultation', 'meeting', 'site-visit', 'follow-up', 'service-call', 'personal', 'other'] as EventType[]).map(type => {
                      const typeLabels: Record<EventType, string> = {
                        'consultation': 'Consultation',
                        'meeting': 'Meeting',
                        'site-visit': 'Site Visit',
                        'follow-up': 'Follow-up',
                        'service-call': 'Service Call',
                        'personal': 'Personal',
                        'other': 'Other'
                      };
                      const typeColors: Record<EventType, string> = {
                        'consultation': 'purple',
                        'meeting': 'blue',
                        'site-visit': 'green',
                        'follow-up': 'orange',
                        'service-call': 'emerald',
                        'personal': 'pink',
                        'other': 'gray'
                      };
                      const color = typeColors[type];
                      const isSelected = eventType === type;
                      return (
                        <motion.button
                          key={type}
                          onClick={() => setEventType(type)}
                          className={`p-2 rounded-xl border text-sm font-medium transition-all ${
                            isSelected
                              ? color === 'purple' ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                              : color === 'blue' ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                              : color === 'green' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : color === 'orange' ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                              : color === 'emerald' ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                              : color === 'pink' ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                              : 'bg-gray-500/20 border-gray-500 text-gray-400'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {typeLabels[type]}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Recurrence Options - Only show for service-call type */}
                {eventType === 'service-call' && (
                  <div className="p-4 bg-teal-500/10 rounded-xl border border-teal-500/20">
                    <label className="block text-sm font-medium text-teal-400 mb-3">Recurring Service Schedule</label>
                    <div className="space-y-3">
                      {/* Recurrence Pattern */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Repeat</label>
                        <select
                          value={eventRecurrence}
                          onChange={(e) => setEventRecurrence(e.target.value as RecurrencePattern)}
                          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        >
                          <option value="none" className="bg-[#1a1a1a] text-white">Does not repeat</option>
                          <option value="weekly" className="bg-[#1a1a1a] text-white">Weekly</option>
                          <option value="biweekly" className="bg-[#1a1a1a] text-white">Every 2 weeks</option>
                          <option value="monthly" className="bg-[#1a1a1a] text-white">Monthly</option>
                          <option value="quarterly" className="bg-[#1a1a1a] text-white">Every 3 months</option>
                          <option value="biannually" className="bg-[#1a1a1a] text-white">Every 6 months</option>
                          <option value="annually" className="bg-[#1a1a1a] text-white">Annually</option>
                        </select>
                      </div>

                      {/* End Condition - Only show if recurring */}
                      {eventRecurrence !== 'none' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5">End Date (optional)</label>
                            <input
                              type="date"
                              value={eventRecurrenceEndDate}
                              onChange={(e) => setEventRecurrenceEndDate(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5">Or # of occurrences</label>
                            <input
                              type="number"
                              min="0"
                              value={eventRecurrenceCount || ''}
                              onChange={(e) => setEventRecurrenceCount(parseInt(e.target.value) || 0)}
                              placeholder="Indefinite"
                              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                            />
                          </div>
                        </div>
                      )}

                      {eventRecurrence !== 'none' && (
                        <p className="text-xs text-teal-400/70">
                          {eventRecurrence === 'weekly' && 'This service call will repeat every week'}
                          {eventRecurrence === 'biweekly' && 'This service call will repeat every 2 weeks'}
                          {eventRecurrence === 'monthly' && 'This service call will repeat every month on the same day'}
                          {eventRecurrence === 'quarterly' && 'This service call will repeat every 3 months'}
                          {eventRecurrence === 'biannually' && 'This service call will repeat every 6 months'}
                          {eventRecurrence === 'annually' && 'This service call will repeat once a year'}
                          {eventRecurrenceCount > 0 && ` for ${eventRecurrenceCount} occurrences`}
                          {eventRecurrenceEndDate && ` until ${new Date(eventRecurrenceEndDate).toLocaleDateString()}`}
                          {!eventRecurrenceCount && !eventRecurrenceEndDate && ' indefinitely'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={eventDate.toISOString().split('T')[0]}
                    onChange={(e) => setEventDate(new Date(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Time Slot</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['morning', 'afternoon', 'evening', 'custom'] as const).map(slot => (
                      <motion.button
                        key={slot}
                        onClick={() => setEventTimeSlot(slot)}
                        className={`p-3 rounded-xl border transition-all ${
                          eventTimeSlot === slot
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-sm font-medium capitalize">{slot}</div>
                        <div className="text-xs opacity-70">
                          {slot === 'morning' && '8-12'}
                          {slot === 'afternoon' && '12-5'}
                          {slot === 'evening' && '5-8'}
                          {slot === 'custom' && 'Set time'}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  {eventTimeSlot === 'custom' && (
                    <input
                      type="time"
                      value={eventCustomTime}
                      onChange={(e) => setEventCustomTime(e.target.value)}
                      className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setEventDuration(Math.max(0.5, eventDuration - 0.5))}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Minus className="w-4 h-4 text-gray-400" />
                    </motion.button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold text-white">{eventDuration}</span>
                      <span className="text-gray-400 ml-1">hour{eventDuration !== 1 ? 's' : ''}</span>
                    </div>
                    <motion.button
                      onClick={() => setEventDuration(Math.min(12, eventDuration + 0.5))}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location (optional)</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Enter location..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Client Info (collapsible) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Client Info (optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={eventClientName}
                      onChange={(e) => setEventClientName(e.target.value)}
                      placeholder="Client name..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <input
                      type="tel"
                      value={eventClientPhone}
                      onChange={(e) => setEventClientPhone(e.target.value)}
                      placeholder="Phone number..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
                  <textarea
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    placeholder="Add any notes about this event..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
                <motion.button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSaveEvent}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {editingEventId ? 'Save Changes' : 'Create Event'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Image Modal */}
      <AnimatePresence>
        {showAddImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAddImageModal(false);
              setAddImageFile(null);
              setAddImagePreview(null);
              setAddImageLabel('');
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/20 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-[#F6B45A]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Add Image to Project</h3>
                </div>
                <motion.button
                  onClick={() => {
                    setShowAddImageModal(false);
                    setAddImageFile(null);
                    setAddImagePreview(null);
                    setAddImageLabel('');
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Image Upload Area */}
                {!addImagePreview ? (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#F6B45A]/30 hover:bg-[#F6B45A]/5 transition-all">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-white font-medium mb-1">Click to upload image</p>
                      <p className="text-sm text-gray-500">JPG, PNG, HEIC • Max 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAddImageFileChange}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={addImagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                      <motion.button
                        onClick={() => {
                          setAddImageFile(null);
                          setAddImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="w-4 h-4 text-white" />
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Label Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={addImageLabel}
                    onChange={(e) => setAddImageLabel(e.target.value)}
                    placeholder="e.g., Front Yard, Backyard, Side View"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
                <motion.button
                  onClick={() => {
                    setShowAddImageModal(false);
                    setAddImageFile(null);
                    setAddImagePreview(null);
                    setAddImageLabel('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSubmitAddImage}
                  disabled={!addImageFile || isAddingImage}
                  className={`px-6 py-2 font-medium rounded-xl transition-colors flex items-center gap-2 ${
                    addImageFile && !isAddingImage
                      ? 'bg-[#F6B45A] hover:bg-[#e5a54a] text-black'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={addImageFile && !isAddingImage ? { scale: 1.02 } : {}}
                  whileTap={addImageFile && !isAddingImage ? { scale: 0.98 } : {}}
                >
                  {isAddingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Image'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Preset Modal */}
      <AnimatePresence>
        {showSavePresetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowSavePresetModal(false);
              setNewPresetName('');
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/20 flex items-center justify-center">
                    <Save className="w-5 h-5 text-[#F6B45A]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Save Preset</h3>
                </div>
                <motion.button
                  onClick={() => {
                    setShowSavePresetModal(false);
                    setNewPresetName('');
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Preview of what's being saved */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Will Save</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFixtures.map(id => (
                      <span key={id} className="px-2 py-0.5 bg-[#F6B45A]/10 text-[#F6B45A] text-[10px] rounded-full">
                        {FIXTURE_TYPES.find(f => f.id === id)?.label || id}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span>{colorTemp}</span>
                    <span>•</span>
                    <span>{lightIntensity}% intensity</span>
                    <span>•</span>
                    <span>{beamAngle}° beam</span>
                  </div>
                </div>

                {/* Preset Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preset Name
                  </label>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="e.g., Dramatic Uplighting, Warm Path..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F6B45A]/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newPresetName.trim()) {
                        handleSavePreset();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                <button
                  onClick={() => {
                    setShowSavePresetModal(false);
                    setNewPresetName('');
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  whileHover={{ scale: newPresetName.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: newPresetName.trim() ? 0.98 : 1 }}
                  className="flex-1 px-4 py-3 bg-[#F6B45A] text-black font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Preset
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Email Modal */}
      <AnimatePresence>
        {showInvoiceEmailModal && currentInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowInvoiceEmailModal(false);
              setInvoiceEmailMessage('');
              setInvoiceEmailError(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Send Invoice</h3>
                    <p className="text-xs text-gray-500">{currentInvoice.invoiceNumber}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => {
                    setShowInvoiceEmailModal(false);
                    setInvoiceEmailMessage('');
                    setInvoiceEmailError(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Recipient Info */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white">{currentInvoice.clientDetails.name || 'No name set'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400 text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{currentInvoice.clientDetails.email || 'No email set'}</span>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Due</span>
                    <span className="text-xl font-bold text-blue-400 font-mono">${currentInvoice.total.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Due: {currentInvoice.dueDate} • {currentInvoice.lineItems.length} items
                  </div>
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Personal Message (optional)</label>
                  <textarea
                    value={invoiceEmailMessage}
                    onChange={(e) => setInvoiceEmailMessage(e.target.value)}
                    placeholder="Add a personal note to your client..."
                    className="w-full h-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10">
                <motion.button
                  onClick={handleSendInvoiceEmail}
                  disabled={!currentInvoice.clientDetails.email || isSendingInvoiceEmail || invoiceEmailSent}
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${
                    invoiceEmailSent
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  whileHover={!isSendingInvoiceEmail && !invoiceEmailSent && currentInvoice.clientDetails.email ? { scale: 1.01 } : {}}
                  whileTap={!isSendingInvoiceEmail && !invoiceEmailSent && currentInvoice.clientDetails.email ? { scale: 0.99 } : {}}
                >
                  {invoiceEmailSent ? (
                    <>
                      <Check className="w-4 h-4" />
                      Email Sent!
                    </>
                  ) : isSendingInvoiceEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invoice Email
                    </>
                  )}
                </motion.button>
                {!currentInvoice.clientDetails.email && (
                  <p className="text-xs text-red-400 text-center mt-3">Please add a client email address first</p>
                )}
                {invoiceEmailError && (
                  <p className="text-xs text-red-400 text-center mt-3">{invoiceEmailError}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Share Portal Modal */}
      <AnimatePresence>
        {showInvoiceShareModal && currentInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvoiceShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#151515] to-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative flex items-center justify-between p-5 border-b border-white/10">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Share2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white font-serif">Client Portal</h3>
                    <p className="text-[10px] text-gray-500">Share invoice with client</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setShowInvoiceShareModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5">
                {/* Info */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm mb-1">Client Payment Portal</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Share this link with your client. They can view the invoice and pay directly with a credit card.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Link Display */}
                {isGeneratingInvoiceLink ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-3 text-gray-400">Generating link...</span>
                  </div>
                ) : invoiceShareError ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-red-400 text-sm">{invoiceShareError}</p>
                    <button
                      onClick={handleGenerateInvoiceShareLink}
                      className="mt-3 text-xs text-blue-400 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : invoiceShareUrl ? (
                  <div className="space-y-3">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                      <Link2 className="w-5 h-5 text-gray-500 shrink-0" />
                      <input
                        type="text"
                        value={invoiceShareUrl}
                        readOnly
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none truncate"
                      />
                    </div>
                    <motion.button
                      onClick={handleCopyInvoiceLink}
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        invoiceLinkCopied
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      {invoiceLinkCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : null}

                {/* Valid Period Info */}
                {invoiceShareUrl && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Link valid for 30 days</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-white/10 bg-black/30">
                <motion.button
                  onClick={() => setShowInvoiceShareModal(false)}
                  className="w-full py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Image Modal */}
      <SaveImageModal
        isOpen={showSaveImageModal}
        onClose={() => setShowSaveImageModal(false)}
        onSaveToDrafts={handleSaveToDrafts}
        onSaveToNewClient={handleSaveToNewClient}
        onSaveToExistingClient={handleSaveToExistingClient}
        clients={clients}
        searchClients={searchClients}
        isSaving={isSavingImage}
      />

      {/* Client Modal */}
      <AnimatePresence>
        {showClientModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClientModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl border border-white/10 w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">
                  {editingClient ? 'Edit Client' : 'New Client'}
                </h3>
                <motion.button
                  onClick={() => setShowClientModal(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientFormData.name}
                    onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                    placeholder="Client name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    autoFocus
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={clientFormData.phone}
                    onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={clientFormData.address}
                    onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={clientFormData.notes}
                    onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                    placeholder="Additional notes about this client..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  />
                </div>

                {/* Lead Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lead Source
                  </label>
                  <select
                    value={clientFormData.leadSource || ''}
                    onChange={(e) => setClientFormData({
                      ...clientFormData,
                      leadSource: e.target.value as LeadSource | undefined || undefined
                    })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="" className="bg-[#1a1a1a] text-white">Select source...</option>
                    <option value="google" className="bg-[#1a1a1a] text-white">Google Ads</option>
                    <option value="referral" className="bg-[#1a1a1a] text-white">Referral</option>
                    <option value="angi" className="bg-[#1a1a1a] text-white">Angi/HomeAdvisor</option>
                    <option value="thumbtack" className="bg-[#1a1a1a] text-white">Thumbtack</option>
                    <option value="website" className="bg-[#1a1a1a] text-white">Website</option>
                    <option value="social" className="bg-[#1a1a1a] text-white">Social Media</option>
                    <option value="yard_sign" className="bg-[#1a1a1a] text-white">Yard Sign</option>
                    <option value="other" className="bg-[#1a1a1a] text-white">Other</option>
                  </select>
                </div>

                {/* Marketing Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Marketing Cost
                    <span className="text-gray-500 text-xs ml-2">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={clientFormData.marketingCost || ''}
                      onChange={(e) => setClientFormData({
                        ...clientFormData,
                        marketingCost: parseFloat(e.target.value) || undefined
                      })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cost to acquire this lead (e.g., ad spend, referral fee)
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-4 border-t border-white/10">
                {editingClient && (
                  <motion.button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this client?')) {
                        const success = await deleteClient(editingClient.id);
                        if (success) {
                          showToast('success', 'Client deleted');
                          setShowClientModal(false);
                        }
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </motion.button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleSaveClient}
                  disabled={!clientFormData.name.trim()}
                  whileHover={{ scale: clientFormData.name.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: clientFormData.name.trim() ? 0.98 : 1 }}
                  className="px-4 py-3 bg-purple-500 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingClient ? 'Update' : 'Create'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Import Modal */}
      <AnimatePresence>
        {showClientImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !clientImportProgress && setShowClientImportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl border border-white/10 w-full max-w-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Import Clients</h3>
                    <p className="text-xs text-gray-400">Upload a CSV file with client data</p>
                  </div>
                </div>
                {!clientImportProgress && (
                  <motion.button
                    onClick={() => setShowClientImportModal(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Result Summary */}
                {clientImportResult && (
                  <div className={`p-4 rounded-xl border ${clientImportResult.failed === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {clientImportResult.failed === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      )}
                      <span className="font-semibold text-white">Import Complete</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Successfully imported <span className="text-emerald-400 font-bold">{clientImportResult.imported}</span> clients
                      {clientImportResult.failed > 0 && (
                        <>, <span className="text-red-400 font-bold">{clientImportResult.failed}</span> failed</>
                      )}
                    </p>
                    {clientImportResult.errors.length > 0 && (
                      <div className="mt-2 text-xs text-red-400 max-h-20 overflow-y-auto">
                        {clientImportResult.errors.slice(0, 5).map((err, i) => (
                          <div key={i}>{err}</div>
                        ))}
                        {clientImportResult.errors.length > 5 && (
                          <div>...and {clientImportResult.errors.length - 5} more errors</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                {clientImportProgress && !clientImportResult && (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Importing clients...</span>
                      <span className="text-sm text-purple-400 font-mono">
                        {clientImportProgress.current}/{clientImportProgress.total}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(clientImportProgress.current / clientImportProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* File Upload */}
                {!clientImportData && !clientImportProgress && !clientImportResult && (
                  <div className="space-y-4">
                    <label className="block">
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                        <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-300 mb-1">Click to upload CSV file</p>
                        <p className="text-xs text-gray-500">or drag and drop</p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              const result = parseClientCSV(text);
                              setClientImportData(result);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>

                    {/* CSV Format Help */}
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-xs text-gray-400 mb-2">Expected CSV format:</p>
                      <code className="text-xs text-purple-400 block bg-black/30 p-2 rounded-lg overflow-x-auto">
                        name,email,phone,address,notes<br />
                        John Doe,john@email.com,555-1234,123 Main St,Notes here
                      </code>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                {clientImportData && !clientImportProgress && !clientImportResult && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-300">
                        <span className="text-emerald-400 font-bold">{clientImportData.valid.length}</span> valid rows,{' '}
                        <span className="text-red-400 font-bold">{clientImportData.invalid.length}</span> invalid
                      </p>
                      <button
                        onClick={() => setClientImportData(null)}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Choose different file
                      </button>
                    </div>

                    {/* Preview of valid rows */}
                    {clientImportData.valid.length > 0 && (
                      <div className="border border-white/10 rounded-xl overflow-hidden">
                        <div className="bg-white/5 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Preview ({Math.min(5, clientImportData.valid.length)} of {clientImportData.valid.length})
                        </div>
                        <div className="divide-y divide-white/5">
                          {clientImportData.valid.slice(0, 5).map((row, i) => (
                            <div key={i} className="px-4 py-2 text-sm">
                              <div className="font-medium text-white">{row.name}</div>
                              <div className="text-xs text-gray-400 flex flex-wrap gap-3">
                                {row.email && <span>{row.email}</span>}
                                {row.phone && <span>{row.phone}</span>}
                                {row.address && <span className="truncate max-w-[200px]">{row.address}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invalid rows warning */}
                    {clientImportData.invalid.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-xs text-red-400 mb-1 font-semibold">Rows with errors (will be skipped):</p>
                        <div className="text-xs text-gray-400 space-y-1">
                          {clientImportData.invalid.slice(0, 3).map((row, i) => (
                            <div key={i}>Row {row.rowNumber}: {row.error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
                {clientImportResult ? (
                  <motion.button
                    onClick={() => setShowClientImportModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl"
                  >
                    Done
                  </motion.button>
                ) : clientImportData && clientImportData.valid.length > 0 && !clientImportProgress ? (
                  <>
                    <button
                      onClick={() => setShowClientImportModal(false)}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={async () => {
                        setClientImportProgress({ current: 0, total: clientImportData.valid.length });
                        const result = await importClients(clientImportData.valid, (current, total) => {
                          setClientImportProgress({ current, total });
                        });
                        setClientImportProgress(null);
                        setClientImportResult(result);
                        if (result.imported > 0) {
                          showToast('success', `Imported ${result.imported} clients`);
                        }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Import {clientImportData.valid.length} Clients
                    </motion.button>
                  </>
                ) : !clientImportProgress && (
                  <button
                    onClick={() => setShowClientImportModal(false)}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <Pricing
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
      />
    </div>
    </AuthWrapper>
  );
};

export default App;