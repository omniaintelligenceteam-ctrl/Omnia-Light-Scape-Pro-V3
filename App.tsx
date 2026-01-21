import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { ImageUpload } from './components/ImageUpload';
import { QuoteView } from './components/QuoteView';
import { SettingsView } from './components/SettingsView';
import AuthWrapper from './components/AuthWrapper';
import { InventoryView } from './components/InventoryView';
import { BOMView } from './components/BOMView';
import { Pricing } from './components/Pricing';
import { BillingSuccess } from './components/BillingSuccess';
import { BillingCanceled } from './components/BillingCanceled';
import { generateBOM } from './utils/bomCalculator';
import { useUserSync } from './hooks/useUserSync';
import { useProjects } from './hooks/useProjects';
import { useSubscription } from './hooks/useSubscription';
import { useToast } from './components/Toast';
import { fileToBase64, getPreviewUrl } from './utils';
import { generateNightScene } from './services/geminiService';
import { applyWatermark, shouldApplyWatermark } from './utils/watermark';
import { Loader2, FolderPlus, FileText, Maximize2, Trash2, Search, ArrowUpRight, Sparkles, AlertCircle, Wand2, ThumbsUp, ThumbsDown, X, RefreshCw, Image as ImageIcon, Check, CheckCircle2, Receipt, Calendar, Download, Plus, Minus, Undo2, ClipboardList, Package, Phone, MapPin, User, Clock, ChevronRight, ArrowUp, ArrowDown, Navigation, CircleDot, Triangle, Sun, Settings2, GalleryVerticalEnd } from 'lucide-react';
import { FIXTURE_TYPES, COLOR_TEMPERATURES, DEFAULT_PRICING, SYSTEM_PROMPT } from './constants';
import { SavedProject, QuoteData, CompanyProfile, FixturePricing, BOMData, FixtureCatalogItem, InvoiceData, InvoiceLineItem, ProjectStatus, AccentColor, FontSize, NotificationPreferences } from './types';

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
  const { projects, isLoading: projectsLoading, saveProject, deleteProject, updateProjectStatus } = useProjects();

  // Rate limiting for generate button (prevent double-clicks)
  const lastGenerateTime = useRef<number>(0);
  const GENERATE_COOLDOWN_MS = 3000; // 3 seconds between generations

  const [activeTab, setActiveTab] = useState<string>('editor');
  
  // Editor State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  
  // Strategy State
  const [selectedFixtures, setSelectedFixtures] = useState<string[]>([]);
  // Sub-Options State
  const [fixtureSubOptions, setFixtureSubOptions] = useState<Record<string, string[]>>({});
  
  // Modal Configuration State
  const [activeConfigFixture, setActiveConfigFixture] = useState<string | null>(null); // 'up', 'path', 'coredrill', 'gutter', 'soffit', 'hardscape' or null
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);

  // Lifted Setting State
  const [colorTemp, setColorTemp] = useState<string>('3000k');
  const [lightIntensity, setLightIntensity] = useState<number>(45);
  // Darkness Level State removed - hardcoded in service
  const [beamAngle, setBeamAngle] = useState<number>(30);

  // Lifted Pricing State
  const [pricing, setPricing] = useState<FixturePricing[]>(DEFAULT_PRICING);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generation History for Undo
  interface GenerationHistoryEntry {
    id: string;
    image: string;
    timestamp: number;
  }
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryEntry[]>([]);

  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Feedback State
  const [lastUsedPrompt, setLastUsedPrompt] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isLiked, setIsLiked] = useState<boolean>(false);

  // Project State (projects loaded from useProjects hook above)
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Projects Sub-Tab State
  const [projectsSubTab, setProjectsSubTab] = useState<'projects' | 'quotes' | 'approved' | 'invoicing'>('projects');
  const [showMobileProjectsMenu, setShowMobileProjectsMenu] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);

  // Inventory Sub-Tab State
  const [inventorySubTab, setInventorySubTab] = useState<'bom' | 'inventory'>('bom');

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

  // Load saved settings (company profile, pricing, catalog, lighting) on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('omnia_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.companyProfile) setCompanyProfile(settings.companyProfile);
        if (settings.pricing) setPricing(settings.pricing);
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
    if (['up', 'path', 'coredrill', 'gutter', 'soffit', 'hardscape'].includes(fixtureId)) {
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
      let result = await generateNightScene(base64, activePrompt, file.type, targetRatio, lightIntensity, beamAngle, colorPrompt);

      // Apply watermark for free users
      if (shouldApplyWatermark(subscription.hasActiveSubscription)) {
        result = await applyWatermark(result);
      }

      setGeneratedImage(result);
      // Add to history
      setGenerationHistory(prev => [...prev, {
        id: Date.now().toString(),
        image: result,
        timestamp: Date.now()
      }]);
      // Increment usage count after successful generation
      await subscription.incrementUsage();
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
    } finally {
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

    setIsLoading(true);
    setError(null);

    // Use current color/settings for regeneration
    const selectedColor = COLOR_TEMPERATURES.find(c => c.id === colorTemp);
    const colorPrompt = selectedColor?.prompt || "Use Soft White (3000K) for all lights.";

    try {
        const base64 = await fileToBase64(file);
        // Construct a refinement prompt
        const refinementPrompt = `${lastUsedPrompt}\n\nCRITICAL MODIFICATION REQUEST: ${feedbackText}\n\nRe-generate the night scene keeping the original design but applying the modification request.`;

        let result = await generateNightScene(base64, refinementPrompt, file.type, "1:1", lightIntensity, beamAngle, colorPrompt);

        // Apply watermark for free users
        if (shouldApplyWatermark(subscription.hasActiveSubscription)) {
          result = await applyWatermark(result);
        }

        setGeneratedImage(result);
        // Add to history
        setGenerationHistory(prev => [...prev, {
          id: Date.now().toString(),
          image: result,
          timestamp: Date.now()
        }]);
        // Increment usage count after successful generation
        await subscription.incrementUsage();
        setShowFeedback(false);
        setFeedbackText('');
        setIsLiked(false);
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
    } finally {
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
    setActiveTab('quotes');
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
        setActiveTab('projects');
        showToast('success', 'Project saved successfully!');
      } else {
        setError('Failed to save project. Please try again.');
        showToast('error', 'Failed to save project');
      }
  };

  const handleSaveProjectFromQuote = async (quoteData: QuoteData) => {
      const projectName = quoteData.clientDetails.name || `Quote ${projects.length + 1}`;
      const result = await saveProject(projectName, generatedImage || '', quoteData);
      if (result) {
        setActiveTab('projects');
        showToast('success', 'Quote saved to project!');
      } else {
        setError('Failed to save project. Please try again.');
        showToast('error', 'Failed to save project');
      }
  };

  const handleDeleteProject = async (id: string) => {
      await deleteProject(id);
      showToast('success', 'Project deleted');
  };

  const handleGenerateBOM = (quoteData: QuoteData) => {
      const bom = generateBOM(quoteData.lineItems, fixtureCatalog.length > 0 ? fixtureCatalog : undefined);
      setCurrentBOM(bom);
      setActiveTab('bom');
  };

  const handleBOMChange = (bom: BOMData) => {
      setCurrentBOM(bom);
  };

  const handleSaveProjectFromBOM = async (bom: BOMData) => {
      const projectName = currentQuote?.clientDetails?.name || `BOM Project ${projects.length + 1}`;
      const result = await saveProject(projectName, generatedImage || '', currentQuote, bom);
      if (result) {
        setActiveTab('projects');
        showToast('success', 'BOM saved to project!');
      } else {
        setError('Failed to save project. Please try again.');
        showToast('error', 'Failed to save project');
      }
  };

  // Approve a project
  const handleApproveProject = async (projectId: string) => {
      await updateProjectStatus(projectId, 'approved');
      setProjectsSubTab('approved');
      showToast('success', 'Project approved!');
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

  // Memoized filtered project lists (includes search filtering)
  const filteredUnapprovedProjects = useMemo(() =>
      projects.filter(p =>
          (p.status === 'draft' || p.status === 'quoted') &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.date.includes(searchTerm) ||
           p.quote?.clientDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
      [projects, searchTerm]
  );

  const filteredApprovedProjects = useMemo(() =>
      projects.filter(p =>
          (p.status === 'approved' || p.status === 'scheduled' || p.status === 'completed') &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.date.includes(searchTerm) ||
           p.quote?.clientDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
      [projects, searchTerm]
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

  // 4. Show Billing Success page
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

      {/* Fixture Configuration Modal (Bottom Sheet Style) */}
      {activeConfigFixture && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
              {/* Backdrop - clickable to close */}
              <div 
                className="absolute inset-0 bg-black/20 pointer-events-auto transition-opacity" 
                onClick={() => setActiveConfigFixture(null)}
              ></div>
              
              {/* Modal / Bottom Sheet */}
              <div className="pointer-events-auto w-full max-w-4xl bg-[#0a0a0a] border-t border-x border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.7)] transform transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[50vh] flex flex-col pb-safe">
                  {/* Header - Fixed */}
                  <div className="p-6 pb-2 border-b border-white/5 shrink-0 flex justify-between items-start bg-[#0a0a0a] rounded-t-[32px]">
                      <div>
                        <h3 className="text-xl font-bold text-white font-serif">
                            Configure {getActiveFixtureTitle()}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Select specific placement targets.</p>
                      </div>
                      <button 
                        onClick={() => setActiveConfigFixture(null)} 
                        className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="p-6 pt-4 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                          {getCurrentSubOptions().map(opt => {
                              const isSelected = pendingOptions.includes(opt.id);
                              return (
                                  <button
                                    key={opt.id}
                                    onClick={() => togglePendingOption(opt.id)}
                                    className={`w-full flex items-start justify-between p-4 rounded-xl border-2 transition-all h-full ${isSelected ? 'bg-[#F6B45A]/15 border-[#F6B45A] text-white shadow-[0_0_15px_rgba(246,180,90,0.2)]' : 'bg-[#050505] border-white/5 text-gray-400 hover:bg-[#0a0a0a] hover:border-[#F6B45A]/30'}`}
                                  >
                                      <div className="flex flex-col items-start text-left gap-1.5">
                                          <span className={`text-sm font-bold ${isSelected ? 'text-[#F6B45A]' : 'text-gray-200'}`}>{opt.label}</span>
                                          <span className="text-[10px] text-gray-500 leading-relaxed">{opt.description}</span>
                                      </div>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-3 transition-all ${isSelected ? 'bg-[#F6B45A]' : 'bg-white/5 border border-white/10'}`}>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                                      </div>
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* Footer - Fixed */}
                  <div className="p-6 pt-4 border-t border-white/5 shrink-0 bg-[#0a0a0a] pb-8 sm:pb-6">
                      <button 
                        onClick={confirmFixtureSelection}
                        className="w-full bg-[#F6B45A] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[#ffc67a] transition-colors shadow-lg text-xs"
                      >
                          Confirm Selection
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <main className="flex-1 overflow-hidden">
          
          {/* TAB: EDITOR */}
          {activeTab === 'editor' && (
            <div className="h-full overflow-y-auto bg-[#050505] relative pb-20">
              {/* Background Ambient Glow */}
              <div className="absolute top-[-10%] left-[20%] w-[60%] h-[500px] bg-[#F6B45A]/5 blur-[120px] rounded-full pointer-events-none"></div>

              <div className="max-w-4xl mx-auto min-h-full p-4 md:p-8 flex flex-col justify-start md:justify-center relative z-10">
                
                {/* MODE 1: RESULT VIEW (Generated Image Only) */}
                {generatedImage ? (
                <div className="flex-1 flex flex-col relative bg-black rounded-[32px] overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500 min-h-[500px]">
                    
                    {/* Top Action Bar */}
                    <div className="absolute top-6 left-0 right-0 z-40 flex justify-center gap-3 px-4">
                        <button
                            onClick={handleSaveProjectFromEditor}
                            className="bg-[#F6B45A] text-[#111] px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] md:text-xs hover:bg-[#ffc67a] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(246,180,90,0.3)] flex items-center gap-2"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Save Project
                        </button>
                    </div>

                    {/* Main Image */}
                    <div className="flex-1 relative flex items-center justify-center bg-[#050505] overflow-hidden group">
                        <img 
                            src={generatedImage} 
                            alt="Generated Result" 
                            className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300"
                            onClick={() => setIsFullScreen(true)}
                        />
                        
                        {/* Feedback / Loading Overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#F6B45A]" />
                                <p className="font-bold tracking-widest uppercase text-sm font-mono text-[#F6B45A]">Processing...</p>
                            </div>
                        )}
                    </div>

                    {/* History Thumbnail Strip */}
                    {generationHistory.length > 1 && (
                        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-full px-4">
                            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 mx-auto max-w-fit">
                                {generationHistory.map((entry, index) => {
                                    const isCurrentImage = entry.image === generatedImage;
                                    return (
                                        <button
                                            key={entry.id}
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
                                    if (!isLiked) handleDownload();
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
                </div>
                ) : (
                // MODE 2: INPUT VIEW
                isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                        <div className="w-24 h-24 border-4 border-[#F6B45A]/20 border-t-[#F6B45A] rounded-full animate-spin mb-8 shadow-[0_0_50px_rgba(246,180,90,0.2)]"></div>
                        <h2 className="text-4xl font-bold text-white font-serif tracking-tight mb-4">Omnia AI</h2>
                        <div className="flex flex-col items-center gap-2">
                             <p className="text-[#F6B45A] font-bold text-sm uppercase tracking-[0.25em] animate-pulse">Processing Scene</p>
                             <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Analyzing Geometry & Light Paths</p>
                        </div>
                    </div>
                ) : (
                <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 fade-in duration-500 pb-20 md:pb-0">
                    
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
                        <div className="flex flex-col gap-4">
                            {/* Section Header */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#F6B45A]/20 to-[#F6B45A]/5 border border-[#F6B45A]/20">
                                    <Sparkles className="w-4 h-4 text-[#F6B45A]" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white">Active Fixtures</h3>
                                    <p className="text-[10px] text-gray-500">Select lighting types to include</p>
                                </div>
                            </div>

                            {/* Fixture Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                                {FIXTURE_TYPES.map((ft) => {
                                    const isSelected = selectedFixtures.includes(ft.id);
                                    const subOpts = fixtureSubOptions[ft.id];
                                    const hasSubOpts = subOpts && subOpts.length > 0;

                                    const getSubLabel = (id: string) => {
                                        return ft.subOptions?.find(o => o.id === id)?.label || '';
                                    };

                                    // Icon mapping for each fixture type
                                    const getFixtureIcon = (id: string) => {
                                        switch(id) {
                                            case 'up': return ArrowUp;
                                            case 'path': return Navigation;
                                            case 'coredrill': return CircleDot;
                                            case 'gutter': return Triangle;
                                            case 'soffit': return ArrowDown;
                                            case 'hardscape': return GalleryVerticalEnd;
                                            default: return Sun;
                                        }
                                    };
                                    const Icon = getFixtureIcon(ft.id);

                                    return (
                                        <motion.button
                                            key={ft.id}
                                            onClick={() => toggleFixture(ft.id)}
                                            className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
                                                isSelected
                                                    ? 'bg-gradient-to-b from-[#F6B45A] via-[#e5a040] to-[#cc8a30] shadow-[0_0_20px_rgba(246,180,90,0.3)]'
                                                    : 'bg-[#0a0a0a] hover:bg-[#111]'
                                            }`}
                                            whileHover={{ scale: 1.03, y: -3 }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            {/* Border gradient overlay */}
                                            <div className={`absolute inset-0 rounded-xl border-2 ${
                                                isSelected
                                                    ? 'border-[#F6B45A]'
                                                    : 'border-white/5 hover:border-[#F6B45A]/30'
                                            }`} />

                                            {/* Inner glow when selected */}
                                            {isSelected && (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
                                                    <motion.div
                                                        className="absolute -inset-1 bg-[#F6B45A]/20 blur-xl pointer-events-none"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                    />
                                                </>
                                            )}

                                            {/* Content */}
                                            <div className="relative z-10 flex flex-col items-center justify-center py-4 px-3 md:py-5 md:px-4">
                                                {/* Icon container */}
                                                <div className={`relative mb-2 ${isSelected ? '' : ''}`}>
                                                    <Icon
                                                        className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${
                                                            isSelected
                                                                ? 'text-[#1a1a1a]'
                                                                : 'text-gray-400'
                                                        }`}
                                                        strokeWidth={isSelected ? 2.5 : 2}
                                                    />
                                                    {/* Icon glow ring when selected */}
                                                    {isSelected && (
                                                        <motion.div
                                                            className="absolute inset-0 rounded-full bg-[#1a1a1a]/10 blur-sm scale-150"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
                                                    isSelected
                                                        ? 'text-[#1a1a1a]'
                                                        : 'text-gray-300'
                                                }`}>
                                                    {ft.label}
                                                </span>

                                                {/* Sub-options badge */}
                                                {hasSubOpts && (
                                                    <motion.div
                                                        className={`mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-medium max-w-full truncate ${
                                                            isSelected
                                                                ? 'bg-[#1a1a1a]/15 text-[#1a1a1a]/80'
                                                                : 'bg-white/5 text-gray-500'
                                                        }`}
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                    >
                                                        {subOpts.map(id => getSubLabel(id)).filter(Boolean).join(', ')}
                                                    </motion.div>
                                                )}

                                                {/* Checkmark indicator */}
                                                <AnimatePresence>
                                                    {isSelected && (
                                                        <motion.div
                                                            className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a1a1a]/20 flex items-center justify-center"
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0, opacity: 0 }}
                                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                        >
                                                            <Check className="w-2.5 h-2.5 text-[#1a1a1a]" strokeWidth={3} />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Shine effect when selected */}
                                            {isSelected && (
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
                                                    initial={{ x: '-100%' }}
                                                    animate={{ x: '200%' }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        repeatDelay: 4,
                                                        duration: 0.8,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Premium Custom Notes Input */}
                        <div className="relative mt-4">
                            {/* Section Header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                                    <Settings2 className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white">Custom Notes</h3>
                                    <p className="text-[10px] text-gray-500">Add specific instructions (optional)</p>
                                </div>
                            </div>

                            {/* Textarea Container */}
                            <div className="relative group">
                                {/* Gradient border effect on focus */}
                                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#F6B45A]/0 via-[#F6B45A]/0 to-[#F6B45A]/0 group-focus-within:from-[#F6B45A]/50 group-focus-within:via-[#F6B45A]/30 group-focus-within:to-[#F6B45A]/50 transition-all duration-500 blur-[1px]" />

                                <div className="relative bg-gradient-to-b from-white/[0.04] to-black/40 rounded-xl border border-white/10 group-focus-within:border-[#F6B45A]/30 transition-all duration-300 overflow-hidden">
                                    <textarea
                                        className="w-full h-20 bg-transparent p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none resize-none"
                                        placeholder="e.g., '10 Up lights on siding, 3 Gutter lights, 6 Path lights along walkway...'"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />

                                    {/* Bottom bar with character count */}
                                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-black/20">
                                        <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                                            Optional Details
                                        </span>
                                        <span className={`text-[9px] font-mono transition-colors ${
                                            prompt.length > 200 ? 'text-[#F6B45A]' : 'text-gray-600'
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

                        {/* Premium Generate Button */}
                        <motion.button
                            onClick={handleGenerate}
                            disabled={!file || (selectedFixtures.length === 0 && !prompt) || isLoading}
                            className="relative w-full overflow-hidden rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
                            whileHover={!(!file || (selectedFixtures.length === 0 && !prompt) || isLoading) ? { scale: 1.01, y: -2 } : {}}
                            whileTap={!(!file || (selectedFixtures.length === 0 && !prompt) || isLoading) ? { scale: 0.98 } : {}}
                        >
                            {/* Background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#F6B45A] via-[#ffc67a] to-[#F6B45A] bg-[length:200%_100%] group-hover:animate-gradient-x" />

                            {/* Inner glow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/25" />

                            {/* Outer glow on hover */}
                            <div className="absolute -inset-1 bg-[#F6B45A]/0 group-hover:bg-[#F6B45A]/30 blur-xl transition-all duration-500 pointer-events-none" />

                            {/* Content */}
                            <div className="relative z-10 flex items-center justify-center gap-3 py-4 md:py-5">
                                <motion.div
                                    animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                                    transition={isLoading ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 text-[#111]" />
                                    ) : (
                                        <Wand2 className="w-5 h-5 text-[#111] group-hover:rotate-12 transition-transform duration-300" />
                                    )}
                                </motion.div>
                                <span className="text-[#111] font-black text-sm uppercase tracking-[0.2em]">
                                    {isLoading ? 'Generating...' : 'Generate Scene'}
                                </span>
                            </div>

                            {/* Shine sweep effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] pointer-events-none opacity-0 group-hover:opacity-100"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '200%' }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                            />

                            {/* Border highlight */}
                            <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none" />
                        </motion.button>
                    </div>
                </div>
                )
                )}
              </div>
            </div>
          )}

          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="h-full overflow-y-auto bg-[#050505] relative pb-20">
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
                        <div className="md:hidden relative">
                           <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                  <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#F6B45A] transition-colors" />
                              </div>
                              <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="block w-36 pl-8 pr-2 py-2 border border-white/10 rounded-lg leading-5 bg-[#111] text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-black focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 text-xs font-mono transition-all"
                                  placeholder="Search..."
                              />
                           </div>
                        </div>
                     </div>

                     {/* Desktop Search Bar */}
                     <div className="hidden md:block w-96 relative group">
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
                 </div>

                 {/* Status Pipeline - Hidden on mobile */}
                 <div className="hidden md:block mb-6 p-4 bg-[#111] rounded-2xl border border-white/5">
                     <div className="flex items-center gap-2 overflow-x-auto pb-2">
                         {(['draft', 'quoted', 'approved', 'scheduled', 'completed'] as ProjectStatus[]).map((status, index) => {
                             const config = STATUS_CONFIG[status];
                             const count = statusCounts[status];
                             return (
                                 <React.Fragment key={status}>
                                     <div className={`flex-shrink-0 flex flex-col items-center gap-1 px-5 py-2 rounded-xl ${config.bgColor} border ${config.borderColor} min-w-[90px]`}>
                                         <span className={`text-2xl font-bold ${config.color}`}>{count}</span>
                                         <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
                                     </div>
                                     {index < 4 && (
                                         <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                     )}
                                 </React.Fragment>
                             );
                         })}
                     </div>
                 </div>

                 {/* Sub-Tabs Navigation - Dropdown on mobile, buttons on desktop */}
                 {/* Mobile Dropdown */}
                 <div className="md:hidden mb-6 relative">
                     <button
                         onClick={() => setShowMobileProjectsMenu(!showMobileProjectsMenu)}
                         className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border ${
                             projectsSubTab === 'projects' ? 'bg-[#F6B45A] text-black border-[#F6B45A]' :
                             projectsSubTab === 'quotes' ? 'bg-purple-500 text-white border-purple-500' :
                             projectsSubTab === 'approved' ? 'bg-emerald-500 text-white border-emerald-500' :
                             'bg-[#F6B45A] text-black border-[#F6B45A]'
                         }`}
                     >
                         <div className="flex items-center gap-2">
                             {projectsSubTab === 'projects' && <FolderPlus className="w-4 h-4" />}
                             {projectsSubTab === 'quotes' && <FileText className="w-4 h-4" />}
                             {projectsSubTab === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                             {projectsSubTab === 'invoicing' && <Receipt className="w-4 h-4" />}
                             {projectsSubTab === 'projects' ? 'Projects' : projectsSubTab === 'quotes' ? 'Quotes' : projectsSubTab === 'approved' ? 'Approved' : 'Invoicing'}
                         </div>
                         <ChevronRight className={`w-4 h-4 transition-transform ${showMobileProjectsMenu ? 'rotate-90' : ''}`} />
                     </button>
                     <AnimatePresence>
                         {showMobileProjectsMenu && (
                             <motion.div
                                 initial={{ opacity: 0, y: -10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: -10 }}
                                 className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl"
                             >
                                 <button
                                     onClick={() => { setProjectsSubTab('projects'); setShowMobileProjectsMenu(false); }}
                                     className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                                         projectsSubTab === 'projects' ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:bg-white/5'
                                     }`}
                                 >
                                     <FolderPlus className="w-4 h-4" />
                                     Projects
                                 </button>
                                 <button
                                     onClick={() => { setProjectsSubTab('quotes'); setShowMobileProjectsMenu(false); }}
                                     className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                                         projectsSubTab === 'quotes' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-white/5'
                                     }`}
                                 >
                                     <FileText className="w-4 h-4" />
                                     Quotes
                                 </button>
                                 <button
                                     onClick={() => { setProjectsSubTab('approved'); setShowMobileProjectsMenu(false); }}
                                     className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                                         projectsSubTab === 'approved' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:bg-white/5'
                                     }`}
                                 >
                                     <CheckCircle2 className="w-4 h-4" />
                                     Approved
                                 </button>
                                 <button
                                     onClick={() => { setProjectsSubTab('invoicing'); setShowMobileProjectsMenu(false); }}
                                     className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                                         projectsSubTab === 'invoicing' ? 'bg-[#F6B45A] text-black' : 'text-gray-400 hover:bg-white/5'
                                     }`}
                                 >
                                     <Receipt className="w-4 h-4" />
                                     Invoicing
                                 </button>
                             </motion.div>
                         )}
                     </AnimatePresence>
                 </div>

                 {/* Desktop Buttons */}
                 <div className="hidden md:flex items-center gap-2 mb-8 bg-[#111] p-1.5 rounded-xl border border-white/5 w-fit">
                     <button
                         onClick={() => setProjectsSubTab('projects')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                             projectsSubTab === 'projects'
                                 ? 'bg-[#F6B45A] text-black'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <FolderPlus className="w-4 h-4" />
                         Projects
                     </button>
                     <button
                         onClick={() => setProjectsSubTab('quotes')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                             projectsSubTab === 'quotes'
                                 ? 'bg-purple-500 text-white'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <FileText className="w-4 h-4" />
                         Quotes
                     </button>
                     <button
                         onClick={() => setProjectsSubTab('approved')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                             projectsSubTab === 'approved'
                                 ? 'bg-emerald-500 text-white'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <CheckCircle2 className="w-4 h-4" />
                         Approved
                     </button>
                     <button
                         onClick={() => setProjectsSubTab('invoicing')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                             projectsSubTab === 'invoicing'
                                 ? 'bg-[#F6B45A] text-black'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <Receipt className="w-4 h-4" />
                         Invoicing
                     </button>
                 </div>

                 {/* SUB-TAB: QUOTES */}
                 {projectsSubTab === 'quotes' && (
                     <QuoteView
                        onSave={handleSaveProjectFromQuote}
                        onGenerateBOM={handleGenerateBOM}
                        initialData={currentQuote}
                        companyProfile={companyProfile}
                        defaultPricing={pricing}
                        projectImage={generatedImage}
                     />
                 )}

                 {/* SUB-TAB: PROJECTS (Unapproved) */}
                 {projectsSubTab === 'projects' && (
                     <>
                         {filteredUnapprovedProjects.length === 0 ? (
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
                                   onClick={() => setActiveTab('editor')}
                                   className="mt-6 px-5 py-2.5 bg-[#F6B45A]/10 border border-[#F6B45A]/30 rounded-xl text-[#F6B45A] text-sm font-bold hover:bg-[#F6B45A]/20 transition-colors"
                                 >
                                   Open Editor
                                 </motion.button>
                             </motion.div>
                         ) : (
                            <>
                            {/* Mobile Compact List View */}
                            <div className="md:hidden space-y-3">
                                {filteredUnapprovedProjects.map((p, index) => (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="group bg-[#111] border border-white/5 rounded-xl overflow-hidden active:scale-[0.99] transition-transform">
                                        <div className="flex items-center gap-3 p-3">
                                            <div onClick={() => { if (p.image) { setGeneratedImage(p.image); setActiveTab('editor'); }}} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-black">
                                                {p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]"><Wand2 className="w-5 h-5 text-gray-600" /></div>}
                                                <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[p.status].bgColor.replace('/10', '')} border border-black`}></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm text-white truncate">{p.name}</h3>
                                                <div className="flex items-center gap-2 mt-1"><span className={`text-[10px] font-bold uppercase ${STATUS_CONFIG[p.status].color}`}>{STATUS_CONFIG[p.status].label}</span><span className="text-gray-600">•</span><span className="text-[10px] text-gray-500">{p.date}</span></div>
                                                {p.quote && <div className="text-xs font-bold text-[#F6B45A] mt-1">${p.quote.total.toFixed(0)}</div>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {p.quote?.clientDetails?.phone && <a href={`tel:${p.quote.clientDetails.phone}`} className="p-2 text-gray-400 active:text-[#F6B45A] rounded-full"><Phone className="w-4 h-4" /></a>}
                                                <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-gray-500 active:text-red-500 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center border-t border-white/5 divide-x divide-white/5">
                                            <button onClick={() => handleDownloadImage(p)} disabled={!p.image} className="flex-1 py-2.5 text-[10px] uppercase font-bold text-gray-400 active:text-white active:bg-white/5 flex items-center justify-center gap-1.5 disabled:opacity-30"><ImageIcon className="w-3.5 h-3.5" />Save</button>
                                            <button onClick={() => { if (p.image) setGeneratedImage(p.image); if (p.quote) setCurrentQuote(p.quote); else setCurrentQuote(null); setProjectsSubTab('quotes'); }} className="flex-1 py-2.5 text-[10px] uppercase font-bold text-purple-400 active:text-purple-300 active:bg-purple-500/10 flex items-center justify-center gap-1.5"><FileText className="w-3.5 h-3.5" />Quote</button>
                                            <button onClick={() => handleApproveProject(p.id)} className="flex-1 py-2.5 text-[10px] uppercase font-bold text-emerald-500 active:text-emerald-400 active:bg-emerald-500/10 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {/* Desktop Card Grid View */}
                            <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                                {filteredUnapprovedProjects.map((p, index) => (
                                    <motion.div
                                      key={p.id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                      className="group relative bg-gradient-to-b from-[#151515] to-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#F6B45A]/30 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col cursor-pointer">

                                        {/* Status Badge */}
                                        <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_CONFIG[p.status].bgColor} ${STATUS_CONFIG[p.status].color} border ${STATUS_CONFIG[p.status].borderColor}`}>
                                            {p.status === 'draft' && <Clock className="w-3 h-3" />}
                                            {p.status === 'quoted' && <FileText className="w-3 h-3" />}
                                            {p.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                            {p.status === 'scheduled' && <Calendar className="w-3 h-3" />}
                                            {p.status === 'completed' && <Check className="w-3 h-3" />}
                                            {STATUS_CONFIG[p.status].label}
                                        </div>

                                        {/* Image Section - Hero */}
                                        <div className={`relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-black`}>
                                            {p.image ? (
                                                <>
                                                    <img
                                                        src={p.image}
                                                        onClick={() => {
                                                            setGeneratedImage(p.image);
                                                            setActiveTab('editor');
                                                        }}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                                                        alt="Scene"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-90 pointer-events-none"></div>

                                                    {/* Tech Corners */}
                                                    <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>
                                                    <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>
                                                    <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>
                                                    <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-white/30 group-hover:border-[#F6B45A] transition-colors"></div>

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

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <div className="bg-[#151515] p-2 rounded-lg border border-white/5">
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Created</span>
                                                    <span className="text-xs text-gray-200 font-mono">{p.date}</span>
                                                </div>
                                                <div
                                                    onClick={() => {
                                                        if (p.quote) {
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

                                            {/* Action Buttons Row */}
                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                                <button
                                                    onClick={() => handleDownloadImage(p)}
                                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all group/btn"
                                                    title="Download Image"
                                                    disabled={!p.image}
                                                >
                                                    <ImageIcon className="w-3 h-3 group-hover/btn:text-[#F6B45A]" />
                                                    Save Img
                                                </button>

                                                {/* Add/Edit Quote Button */}
                                                <button
                                                    onClick={() => {
                                                        if (p.image) setGeneratedImage(p.image);
                                                        if (p.quote) {
                                                            setCurrentQuote(p.quote);
                                                        } else {
                                                            setCurrentQuote(null);
                                                        }
                                                        setProjectsSubTab('quotes');
                                                    }}
                                                    className="flex-1 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-purple-500/30 hover:border-purple-500 group/btn"
                                                    title={p.quote ? "Edit Quote" : "Add Quote"}
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    {p.quote ? 'Edit Quote' : 'Add Quote'}
                                                </button>

                                                {/* Approve Button */}
                                                <button
                                                    onClick={() => handleApproveProject(p.id)}
                                                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-emerald-500/30 hover:border-emerald-500"
                                                    title="Approve Project"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Approve
                                                </button>
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
                 {projectsSubTab === 'approved' && (
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
                                   onClick={() => setProjectsSubTab('projects')}
                                   className="mt-6 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors"
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

                                        {/* Image Section */}
                                        <div className={`relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-black`}>
                                            {p.image ? (
                                                <>
                                                    <img
                                                        src={p.image}
                                                        onClick={() => {
                                                            setGeneratedImage(p.image);
                                                            setActiveTab('editor');
                                                        }}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                                                        alt="Scene"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-90 pointer-events-none"></div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
                                                    <Wand2 className="w-8 h-8 opacity-20 mb-2"/>
                                                    <span className="text-[9px] uppercase font-bold opacity-40">No Visualization</span>
                                                </div>
                                            )}
                                        </div>

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

                                            {/* Status Change & Action Buttons */}
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                {/* Status Progression */}
                                                <div className="flex gap-2">
                                                    {p.status === 'approved' && (
                                                        <button
                                                            onClick={() => handleStatusChange(p.id, 'scheduled')}
                                                            className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-blue-500/30 hover:border-blue-500"
                                                        >
                                                            <Calendar className="w-3 h-3" />
                                                            Schedule
                                                        </button>
                                                    )}
                                                    {p.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => handleStatusChange(p.id, 'completed')}
                                                            className="flex-1 bg-[#F6B45A]/10 hover:bg-[#F6B45A] text-[#F6B45A] hover:text-black py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-[#F6B45A]/30 hover:border-[#F6B45A]"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            Complete
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleUnapproveProject(p.id)}
                                                        className="flex-shrink-0 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-2 rounded-lg text-xs font-bold transition-all border border-white/5 hover:border-red-500/30"
                                                        title="Move back to draft"
                                                    >
                                                        <Undo2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Invoice Button */}
                                                <button
                                                    onClick={() => handleGenerateInvoice(p)}
                                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                    Generate Invoice
                                                </button>
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
                             /* Invoice Editor View */
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
                                             <div className="bg-gradient-to-b from-[#0a0a0a] to-[#080808] rounded-xl border border-white/10 overflow-hidden shadow-xl shadow-black/20">
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
                                     </div>
                                 </div>
                             </motion.div>
                         ) : (
                             /* Invoice List View */
                             <>
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
                                           onClick={() => setProjectsSubTab('approved')}
                                           className="mt-6 px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition-colors"
                                         >
                                           View Approved Projects
                                         </motion.button>
                                     </motion.div>
                                 ) : (
                                     <motion.div
                                         initial={{ opacity: 0 }}
                                         animate={{ opacity: 1 }}
                                         className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                                     >
                                         {invoices.map((invoice, index) => (
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
                                                         invoice.status === 'draft' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                         invoice.status === 'sent' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                     }`}>
                                                         <span className="flex items-center gap-1.5">
                                                             <span className={`w-1.5 h-1.5 rounded-full ${
                                                                 invoice.status === 'draft' ? 'bg-gray-400' :
                                                                 invoice.status === 'sent' ? 'bg-blue-400 animate-pulse' :
                                                                 'bg-emerald-400'
                                                             }`} />
                                                             {invoice.status}
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
             </div>
            </div>
          )}

           {/* TAB: INVENTORY */}
           {activeTab === 'inventory' && (
            <div className="h-full overflow-y-auto bg-[#050505] relative pb-20">
              {/* Background Tech Mesh/Glow */}
              <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(246, 180, 90, 0.05) 0%, transparent 50%)' }}></div>
              <div className="fixed inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

              <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">

                {/* High-End Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6 border-b border-white/5 pb-6">
                    <div>
                       <h2 className="text-3xl md:text-4xl font-bold text-white font-serif tracking-tight mb-2">Inventory & BOM</h2>
                       <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#F6B45A] animate-pulse"></div>
                            <span className="text-[10px] text-gray-300 font-mono uppercase tracking-widest">Materials Management</span>
                       </div>
                    </div>
                </div>

                {/* Sub-Tabs Navigation */}
                <div className="flex items-center gap-2 mb-8 bg-[#111] p-1.5 rounded-xl border border-white/5 w-fit">
                    <button
                        onClick={() => setInventorySubTab('bom')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                            inventorySubTab === 'bom'
                                ? 'bg-[#F6B45A] text-black'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        Bill of Materials
                    </button>
                    <button
                        onClick={() => setInventorySubTab('inventory')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                            inventorySubTab === 'inventory'
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Package className="w-4 h-4" />
                        Inventory
                    </button>
                </div>

                {/* SUB-TAB: BOM */}
                {inventorySubTab === 'bom' && (
                    <BOMView
                      bomData={currentBOM}
                      onBOMChange={handleBOMChange}
                      onSaveProject={handleSaveProjectFromBOM}
                      currentQuote={currentQuote}
                      generatedImage={generatedImage}
                    />
                )}

                {/* SUB-TAB: INVENTORY */}
                {inventorySubTab === 'inventory' && (
                    <InventoryView />
                )}
              </div>
            </div>
           )}

          {/* TAB: SETTINGS */}
           {activeTab === 'settings' && (
             <SettingsView
                profile={companyProfile}
                onProfileChange={setCompanyProfile}
                colorTemp={colorTemp}
                onColorTempChange={setColorTemp}
                lightIntensity={lightIntensity}
                onLightIntensityChange={setLightIntensity}
                beamAngle={beamAngle}
                onBeamAngleChange={setBeamAngle}
                pricing={pricing}
                onPricingChange={setPricing}
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
                // Sign out
                onSignOut={handleSignOut}
                // Save settings
                onSaveSettings={handleSaveSettings}
                isSaving={isSavingSettings}
             />
          )}

        </main>

        {/* Footer */}
        <Footer variant="minimal" />
      </div>

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

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