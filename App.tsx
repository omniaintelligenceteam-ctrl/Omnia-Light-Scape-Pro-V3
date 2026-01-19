import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ImageUpload } from './components/ImageUpload';
import { QuoteView } from './components/QuoteView';
import { SettingsView } from './components/SettingsView';
import AuthWrapper from './components/AuthWrapper';
import { InventoryView } from './components/InventoryView';
import { BOMView } from './components/BOMView';
import { Pricing } from './components/Pricing';
import { generateBOM } from './utils/bomCalculator';
import { useUserSync } from './hooks/useUserSync';
import { useProjects } from './hooks/useProjects';
import { useSubscription } from './hooks/useSubscription';
import { fileToBase64, getPreviewUrl } from './utils';
import { generateNightScene } from './services/geminiService';
import { Loader2, FolderPlus, FileText, Maximize2, Trash2, Search, ArrowUpRight, Sparkles, AlertCircle, Wand2, ThumbsUp, ThumbsDown, X, RefreshCw, Image as ImageIcon, Check, CheckCircle2, Receipt, Calendar, DollarSign, Download, Plus, Minus, Undo2 } from 'lucide-react';
import { FIXTURE_TYPES, COLOR_TEMPERATURES, DEFAULT_PRICING } from './constants';
import { SavedProject, QuoteData, CompanyProfile, FixturePricing, BOMData, FixtureCatalogItem, InvoiceData, InvoiceLineItem } from './types';

// Helper to parse fixture quantities from text
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

const App: React.FC = () => {
  // Get Clerk user and sync to database
  const { user } = useUser();
  useUserSync(); // Automatically sync user to Supabase on sign-in

  // Subscription and usage tracking
  const subscription = useSubscription();

  // Load/save projects from Supabase
  const { projects, isLoading: projectsLoading, saveProject, deleteProject } = useProjects();

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
  const [error, useStateError] = useState<string | null>(null);
  const setError = (msg: string | null) => useStateError(msg);

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
    email: 'dev@omnia.com',
    address: '123 Landscape Lane\nDesign District, CA 90210',
    logo: null
  });

  // BOM State
  const [currentBOM, setCurrentBOM] = useState<BOMData | null>(null);
  const [fixtureCatalog, setFixtureCatalog] = useState<FixtureCatalogItem[]>([]);

  // Projects Sub-Tab State
  const [projectsSubTab, setProjectsSubTab] = useState<'projects' | 'approved' | 'invoicing'>('projects');
  const [approvedProjectIds, setApprovedProjectIds] = useState<Set<string>>(new Set());
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);

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
    setError(null);
    setShowFeedback(false);
    setIsLiked(false);
    setIsFullScreen(false);
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setGeneratedImage(null);
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

  const handleGenerate = async () => {
    if (!file || !previewUrl) return;

    // Check if user can generate (subscription or free trial)
    const { canGenerate, reason } = await subscription.checkCanGenerate();
    if (!canGenerate) {
      if (reason === 'FREE_TRIAL_EXHAUSTED') {
        setShowPricing(true);
      } else {
        setError('Unable to generate. Please try again.');
      }
      return;
    }

    // Construct Composite Prompt
    let activePrompt = "EDITING TASK: Apply specific lighting to the EXISTING photo content.\n\n";

    activePrompt += "### CRITICAL GEOMETRY LOCK (ZERO ADDITIONS):\n";
    activePrompt += "You are strictly forbidden from adding ANY physical matter to this scene. You are a lighting engine only, not a builder.\n";
    activePrompt += "1. NO NEW TREES. NO NEW BUSHES. NO NEW PLANTS.\n";
    activePrompt += "2. NO NEW SIDEWALKS. NO NEW PATHWAYS. NO NEW DRIVEWAYS.\n";
    activePrompt += "3. NO NEW ARCHITECTURE. Do not add wings to the house, do not add dormers, do not add windows.\n";
    activePrompt += "4. NO NEW DECORATIONS. Do not add furniture, pots, or statues.\n";
    activePrompt += "VERIFICATION: If the object does not exist in the original daylight photo, it MUST NOT exist in the night render. Only add PHOTONS (Light).\n\n";

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
                 
                 // 2. Override Prompt Header
                 p = `PRIORITY OVERRIDE - ${ft.label.toUpperCase()}: You must ONLY place ${ft.label.toLowerCase()} in the following selected locations.\n`;
                 p += `[STRICT SCOPE - ${ft.label.toUpperCase()}]\n`;
                 p += `ALLOWED: ${allowedLabels}\n`;
                 p += `STRICTLY FORBIDDEN: ${forbiddenLabels}\n`;
                 p += `VERIFICATION: If a surface is listed in FORBIDDEN, it must remain DARK.\n`;

                 // 3. Add Positives for SELECTED items
                 const positives = selectedSubs.map(id => {
                     const opt = allOptionsList.find(o => o.id === id);
                     return opt ? `YES DO THIS: ${opt.prompt}` : '';
                 }).join('\n');
                 p += `\nINSTRUCTIONS:\n${positives}\n`;

                 // 4. Add Explicit Negatives for UNSELECTED items
                 const unselected = allSubIds.filter(id => !selectedSubs.includes(id));
                 p += `\nEXCLUSIONS:\n`;
                 unselected.forEach(id => {
                     const opt = allOptionsList.find(o => o.id === id);
                     if (opt && 'negativePrompt' in opt) {
                        p += `${(opt as any).negativePrompt}\n`;
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
                         p += "\n\n[CRITICAL HARD RULE - DORMERS]: For each dormer window, place EXACTLY ONE (1) up-light inside the horizontal gutter directly below it. The light beam must shine STRAIGHT UP to wash the dormer face. Do not place lights on the roof shingles.";
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
    
    // Final QA Instruction
    activePrompt += "\n\n### FINAL QA PROTOCOL:\n";
    activePrompt += "1. REVIEW GEOMETRY: Did you add any trees, sidewalks, or structural features? If yes, REMOVE THEM.\n";
    activePrompt += "2. REVIEW EXCLUSIONS: Did you add lights to forbidden surfaces? If yes, REMOVE THEM.\n";

    // Prepare Color Temperature Prompt
    const selectedColor = COLOR_TEMPERATURES.find(c => c.id === colorTemp);
    const colorPrompt = selectedColor?.prompt || "Use Soft White (3000K) for all lights.";

    // Add User Custom Instructions
    if (prompt) {
        activePrompt += `\n\nADDITIONAL CUSTOM NOTES: ${prompt}`;
    }

    // Validation
    if (selectedFixtures.length === 0 && !prompt) {
        setError("Please select at least one lighting type or enter custom instructions.");
        return;
    }

    setLastUsedPrompt(activePrompt);
    setShowFeedback(false);
    setFeedbackText('');
    setIsLiked(false);
    setIsLoading(true);
    setError(null);
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
      const result = await generateNightScene(base64, activePrompt, file.type, targetRatio, lightIntensity, beamAngle, colorPrompt);
      setGeneratedImage(result);
      // Increment usage count after successful generation
      await subscription.incrementUsage();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.toString().toLowerCase();
      if (errorMessage.includes('403') || errorMessage.includes('permission_denied') || errorMessage.includes('permission denied')) {
        setError("Permission denied. Please check your API Key configuration.");
        // Only try to open the modal if we are in the AI Studio environment
        if ((window as any).aistudio) await requestApiKey();
      } else {
        setError("Failed to generate night scene. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackRegenerate = async () => {
    if (!file || !feedbackText) return;

    setIsLoading(true);
    setError(null);

    // Use current color/settings for regeneration
    const selectedColor = COLOR_TEMPERATURES.find(c => c.id === colorTemp);
    const colorPrompt = selectedColor?.prompt || "Use Soft White (3000K) for all lights.";

    try {
        const base64 = await fileToBase64(file);
        // Construct a refinement prompt
        const refinementPrompt = `${lastUsedPrompt}\n\nCRITICAL MODIFICATION REQUEST: ${feedbackText}\n\nRe-generate the night scene keeping the original design but applying the modification request.`;
        
        const result = await generateNightScene(base64, refinementPrompt, file.type, "1:1", lightIntensity, beamAngle, colorPrompt);
        setGeneratedImage(result);
        // Increment usage count after successful generation
        await subscription.incrementUsage();
        setShowFeedback(false);
        setFeedbackText('');
        setIsLiked(false);
    } catch (err: any) {
        console.error(err);
        const errorMessage = err.toString().toLowerCase();
        if (errorMessage.includes('403') || errorMessage.includes('permission_denied')) {
            setError("Permission denied. Please check your API Key configuration.");
            if ((window as any).aistudio) await requestApiKey();
        } else {
            setError("Failed to regenerate. Please try again.");
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

  const handleGenerateQuote = () => {
    // 1. Parse prompt for quantities
    const parsedCounts = parsePromptForQuantities(prompt);
    
    // Default fallback quantities if no parsing found but user toggled buttons
    const defaultQuantities: Record<string, number> = {
        'up': 12, 'path': 6, 'gutter': 4, 'soffit': 4, 'hardscape': 8, 'coredrill': 4, 'transformer': 1
    };

    const hasParsedCounts = Object.keys(parsedCounts).length > 0;

    // Generate Line Items using CURRENT pricing state
    const lineItems = pricing.map(def => {
         // RULE: Always add a transformer
         if (def.fixtureType === 'transformer') {
             return { ...def, quantity: 1 };
         }

         if (hasParsedCounts) {
             // If we found numbers in text, use them strictly. 
             // If ID not found in text, quantity is 0.
             const qty = parsedCounts[def.id] || 0;
             return { ...def, quantity: qty };
         } else {
             // Fallback to Toggle Buttons
             if (selectedFixtures.includes(def.fixtureType)) {
                 return { ...def, quantity: defaultQuantities[def.fixtureType] || 1 };
             }
             return { ...def, quantity: 0 };
         }
    }).filter(item => item.quantity > 0);

    const newQuote: QuoteData = {
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
    
    setCurrentQuote(newQuote);
    setActiveTab('quotes');
  };

  const handleSaveProjectFromEditor = async () => {
      console.log('Save Project clicked!', { hasImage: !!generatedImage });
      if (!generatedImage) {
        console.log('No generated image, returning early');
        return;
      }
      const projectName = `Night Scene ${projects.length + 1}`;
      console.log('Calling saveProject with:', projectName);
      const result = await saveProject(projectName, generatedImage, null);
      console.log('saveProject result:', result);
      if (result) {
        setActiveTab('projects');
      } else {
        setError('Failed to save project. Please try again.');
      }
  };

  const handleSaveProjectFromQuote = async (quoteData: QuoteData) => {
      const projectName = quoteData.clientDetails.name || `Quote ${projects.length + 1}`;
      const result = await saveProject(projectName, generatedImage || '', quoteData);
      if (result) {
        setActiveTab('projects');
      } else {
        setError('Failed to save project. Please try again.');
      }
  };

  const handleDeleteProject = async (id: string) => {
      await deleteProject(id);
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
      } else {
        setError('Failed to save project. Please try again.');
      }
  };

  // Approve a project
  const handleApproveProject = (projectId: string) => {
      setApprovedProjectIds(prev => new Set([...prev, projectId]));
      setProjectsSubTab('approved');
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

  // Unapprove a project (move back to projects)
  const handleUnapproveProject = (projectId: string) => {
      if (!confirm('Remove this project from approved list?')) return;
      setApprovedProjectIds(prev => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
      });
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

  // Memoized filtered project lists (includes search filtering)
  const filteredUnapprovedProjects = useMemo(() =>
      projects.filter(p =>
          !approvedProjectIds.has(p.id) &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.date.includes(searchTerm))
      ),
      [projects, approvedProjectIds, searchTerm]
  );

  const filteredApprovedProjects = useMemo(() =>
      projects.filter(p =>
          approvedProjectIds.has(p.id) &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.date.includes(searchTerm))
      ),
      [projects, approvedProjectIds, searchTerm]
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
                        className="w-full bg-[#F6B45A] text-[#050505] rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] transition-all"
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
              <div className="pointer-events-auto w-full max-w-4xl bg-[#111] border-t border-x border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transform transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[50vh] flex flex-col pb-safe">
                  {/* Header - Fixed */}
                  <div className="p-6 pb-2 border-b border-white/5 shrink-0 flex justify-between items-start bg-[#111] rounded-t-[32px]">
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
                  <div className="p-6 pt-4 overflow-y-auto custom-scrollbar bg-[#111]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                          {getCurrentSubOptions().map(opt => {
                              const isSelected = pendingOptions.includes(opt.id);
                              return (
                                  <button 
                                    key={opt.id}
                                    onClick={() => togglePendingOption(opt.id)}
                                    className={`w-full flex items-start justify-between p-4 rounded-xl border transition-all h-full ${isSelected ? 'bg-[#F6B45A]/10 border-[#F6B45A] text-white' : 'bg-[#0a0a0a] border-white/5 text-gray-400 hover:bg-[#1a1a1a]'}`}
                                  >
                                      <div className="flex flex-col items-start text-left gap-1">
                                          <span className={`text-sm font-bold ${isSelected ? 'text-[#F6B45A]' : 'text-gray-300'}`}>{opt.label}</span>
                                          <span className="text-[10px] text-gray-500 leading-relaxed">{opt.description}</span>
                                      </div>
                                      {isSelected && <Check className="w-5 h-5 text-[#F6B45A] shrink-0 ml-3" />}
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* Footer - Fixed */}
                  <div className="p-6 pt-4 border-t border-white/5 shrink-0 bg-[#111] pb-8 sm:pb-6">
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
            <div className="h-full overflow-y-auto bg-[#050505] relative">
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
                            className="bg-black/40 backdrop-blur-md text-white border border-white/10 px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] md:text-xs hover:bg-white/10 hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                        >
                            <FolderPlus className="w-4 h-4 text-[#F6B45A]" />
                            Save Project
                        </button>
                        <button 
                            onClick={handleGenerateQuote}
                            className="bg-[#F6B45A] text-[#111] px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] md:text-xs hover:bg-[#ffc67a] hover:scale-105 transition-all shadow-[0_0_20px_rgba(246,180,90,0.3)] flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Generate Quote
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
                        
                        {/* NEW: Button-Based Fixture Selection */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 ml-1 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-[#F6B45A]" />
                                Active Fixtures
                            </label>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-1">
                                {FIXTURE_TYPES.map((ft) => {
                                    const isSelected = selectedFixtures.includes(ft.id);
                                    // Check if this fixture has sub-options selected
                                    const subOpts = fixtureSubOptions[ft.id];
                                    const hasSubOpts = subOpts && subOpts.length > 0;
                                    
                                    // Helper to get labels for sub-options
                                    const getSubLabel = (id: string) => {
                                        return ft.subOptions?.find(o => o.id === id)?.label || '';
                                    };

                                    return (
                                        <button
                                            key={ft.id}
                                            onClick={() => toggleFixture(ft.id)}
                                            className={`py-3 px-4 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-200 border flex flex-col items-center justify-center text-center ${
                                                isSelected 
                                                ? 'bg-[#F6B45A] text-[#111] border-[#F6B45A] shadow-[0_0_15px_rgba(246,180,90,0.3)] scale-[1.02]' 
                                                : 'bg-[#111] text-gray-300 border-white/10 hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            <span>{ft.label}</span>
                                            {hasSubOpts && (
                                                <span className="text-[8px] opacity-70 mt-1 max-w-full truncate px-1">
                                                    ({subOpts.map(id => getSubLabel(id)).filter(Boolean).join(', ')})
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Description Textarea */}
                        <div className="relative group mt-2">
                            <textarea
                                className="w-full h-16 bg-[#0F0F0F] border border-white/10 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#F6B45A]/50 focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 transition-all resize-none font-mono"
                                placeholder="Type of Fixtures and Number of fixtures (e.g. '10 Up lights, 3 Gutter up lights, 6 Path lights')"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <div className="absolute right-3 bottom-3 text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                                Custom Notes
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl flex items-center gap-3 animate-pulse">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <p className="text-xs text-red-400 font-bold">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button 
                            onClick={handleGenerate}
                            disabled={!file || (selectedFixtures.length === 0 && !prompt) || isLoading}
                            className="w-full bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] text-[#111] rounded-xl py-4 font-black text-xs uppercase tracking-[0.25em] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-3 group"
                        >
                            <Wand2 className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
                            Generate Scene
                        </button>
                    </div>
                </div>
                )
                )}
              </div>
            </div>
          )}

          {/* TAB: QUOTES */}
          {activeTab === 'quotes' && (
             <QuoteView
                onSave={handleSaveProjectFromQuote}
                onGenerateBOM={handleGenerateBOM}
                initialData={currentQuote}
                companyProfile={companyProfile}
                defaultPricing={pricing}
             />
          )}

          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="h-full overflow-y-auto bg-[#050505] relative">
              {/* Background Tech Mesh/Glow */}
              <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(246, 180, 90, 0.05) 0%, transparent 50%)' }}></div>
              <div className="fixed inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

             <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">

                 {/* High-End Header */}
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6 border-b border-white/5 pb-6">
                     <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white font-serif tracking-tight mb-2">Project Library</h2>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-[#F6B45A] animate-pulse"></div>
                             <span className="text-[10px] text-gray-300 font-mono uppercase tracking-widest">Database // Active Systems: {projects.length}</span>
                        </div>
                     </div>

                     {/* Search Bar Simulation */}
                     <div className="w-full md:w-96 relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#F6B45A] transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-[#111] text-gray-200 placeholder-gray-400 focus:outline-none focus:bg-black focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 sm:text-sm font-mono transition-all"
                            placeholder="Search by ID or Client..."
                        />
                     </div>
                 </div>

                 {/* Sub-Tabs Navigation */}
                 <div className="flex items-center gap-2 mb-8 bg-[#111] p-1.5 rounded-xl border border-white/5 w-fit">
                     <button
                         onClick={() => setProjectsSubTab('projects')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                             projectsSubTab === 'projects'
                                 ? 'bg-[#F6B45A] text-black'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <FolderPlus className="w-4 h-4" />
                         Projects
                         <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${projectsSubTab === 'projects' ? 'bg-black/20' : 'bg-white/10'}`}>
                             {filteredUnapprovedProjects.length}
                         </span>
                     </button>
                     <button
                         onClick={() => setProjectsSubTab('approved')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                             projectsSubTab === 'approved'
                                 ? 'bg-emerald-500 text-white'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <CheckCircle2 className="w-4 h-4" />
                         Approved
                         <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${projectsSubTab === 'approved' ? 'bg-black/20' : 'bg-white/10'}`}>
                             {filteredApprovedProjects.length}
                         </span>
                     </button>
                     <button
                         onClick={() => setProjectsSubTab('invoicing')}
                         className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                             projectsSubTab === 'invoicing'
                                 ? 'bg-blue-500 text-white'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                         }`}
                     >
                         <Receipt className="w-4 h-4" />
                         Invoicing
                         <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${projectsSubTab === 'invoicing' ? 'bg-black/20' : 'bg-white/10'}`}>
                             {invoices.length}
                         </span>
                     </button>
                 </div>

                 {/* SUB-TAB: PROJECTS (Unapproved) */}
                 {projectsSubTab === 'projects' && (
                     <>
                         {filteredUnapprovedProjects.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-white/10 rounded-3xl bg-[#111]/50 backdrop-blur-sm">
                                 <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <FolderPlus className="w-8 h-8 text-gray-500" />
                                 </div>
                                 <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No Pending Projects</p>
                                 <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">All projects have been approved</p>
                             </div>
                         ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                                {filteredUnapprovedProjects.map((p) => (
                                    <div key={p.id} className="group relative bg-[#111]/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:border-[#F6B45A]/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(246,180,90,0.1)] flex flex-col">

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
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-[9px] text-[#F6B45A] font-mono mb-1">ID: PRJ-{p.id.substring(0,6).toUpperCase()}</div>
                                                    <h3 className="font-bold text-lg text-white font-serif tracking-tight truncate w-48">{p.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDeleteProject(p.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white/5 rounded-full transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

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
                                                            setActiveTab('quotes');
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

                                                {p.quote && (
                                                    <button
                                                        onClick={() => setPdfProject(p)}
                                                        className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all group/btn"
                                                        title="Download Quote PDF"
                                                    >
                                                        <FileText className="w-3 h-3 group-hover/btn:text-[#F6B45A]" />
                                                        Quote
                                                    </button>
                                                )}

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
                                    </div>
                                ))}
                            </div>
                         )}
                     </>
                 )}

                 {/* SUB-TAB: APPROVED */}
                 {projectsSubTab === 'approved' && (
                     <>
                         {filteredApprovedProjects.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-emerald-500/20 rounded-3xl bg-emerald-500/5 backdrop-blur-sm">
                                 <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                                 </div>
                                 <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No Approved Projects</p>
                                 <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Approve projects to see them here</p>
                             </div>
                         ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                                {filteredApprovedProjects.map((p) => (
                                    <div key={p.id} className="group relative bg-[#111]/80 backdrop-blur-sm border border-emerald-500/20 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col">

                                        {/* Approved Badge */}
                                        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Approved
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
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-[9px] text-emerald-500 font-mono mb-1">ID: PRJ-{p.id.substring(0,6).toUpperCase()}</div>
                                                    <h3 className="font-bold text-lg text-white font-serif tracking-tight truncate w-48">{p.name}</h3>
                                                </div>
                                            </div>

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

                                            {/* Action Buttons */}
                                            <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                                                <button
                                                    onClick={() => handleUnapproveProject(p.id)}
                                                    className="flex-shrink-0 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-3 rounded-lg text-xs font-bold transition-all border border-white/5 hover:border-red-500/30"
                                                    title="Remove from approved"
                                                >
                                                    <Undo2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateInvoice(p)}
                                                    disabled={!p.quote}
                                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
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
                             <div className="max-w-4xl mx-auto">
                                 {/* Invoice Header */}
                                 <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                                     {/* Top Bar */}
                                     <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-transparent">
                                         <div className="flex items-center gap-4">
                                             <div className="p-3 bg-blue-500/20 rounded-xl">
                                                 <Receipt className="w-6 h-6 text-blue-500" />
                                             </div>
                                             <div>
                                                 <h3 className="text-xl font-bold text-white font-serif">{currentInvoice.invoiceNumber}</h3>
                                                 <p className="text-xs text-gray-400">{currentInvoice.projectName}</p>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                 currentInvoice.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                                                 currentInvoice.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                                 'bg-emerald-500/20 text-emerald-400'
                                             }`}>
                                                 {currentInvoice.status}
                                             </span>
                                             <button
                                                 onClick={() => setCurrentInvoice(null)}
                                                 className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                             >
                                                 <X className="w-5 h-5" />
                                             </button>
                                         </div>
                                     </div>

                                     {/* Invoice Details */}
                                     <div className="p-6 space-y-6">
                                         {/* Dates Row */}
                                         <div className="grid grid-cols-2 gap-4">
                                             <div>
                                                 <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Invoice Date</label>
                                                 <div className="relative">
                                                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                     <input
                                                         type="date"
                                                         value={currentInvoice.invoiceDate}
                                                         onChange={(e) => handleInvoiceChange('invoiceDate', e.target.value)}
                                                         className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                                     />
                                                 </div>
                                             </div>
                                             <div>
                                                 <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Due Date</label>
                                                 <div className="relative">
                                                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                     <input
                                                         type="date"
                                                         value={currentInvoice.dueDate}
                                                         onChange={(e) => handleInvoiceChange('dueDate', e.target.value)}
                                                         className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                                                     />
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Client Details */}
                                         <div>
                                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Bill To</label>
                                             <div className="grid grid-cols-2 gap-4">
                                                 <input
                                                     type="text"
                                                     value={currentInvoice.clientDetails.name}
                                                     onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, name: e.target.value })}
                                                     placeholder="Client Name"
                                                     className="bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500"
                                                 />
                                                 <input
                                                     type="email"
                                                     value={currentInvoice.clientDetails.email}
                                                     onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, email: e.target.value })}
                                                     placeholder="Client Email"
                                                     className="bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500"
                                                 />
                                                 <input
                                                     type="text"
                                                     value={currentInvoice.clientDetails.phone}
                                                     onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, phone: e.target.value })}
                                                     placeholder="Phone"
                                                     className="bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500"
                                                 />
                                                 <input
                                                     type="text"
                                                     value={currentInvoice.clientDetails.address}
                                                     onChange={(e) => handleInvoiceChange('clientDetails', { ...currentInvoice.clientDetails, address: e.target.value })}
                                                     placeholder="Address"
                                                     className="bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500"
                                                 />
                                             </div>
                                         </div>

                                         {/* Line Items */}
                                         <div>
                                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 block">Line Items</label>
                                             <div className="bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden">
                                                 {/* Header */}
                                                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                     <div className="col-span-4">Description</div>
                                                     <div className="col-span-2 text-center">Qty</div>
                                                     <div className="col-span-2 text-center">Unit Price</div>
                                                     <div className="col-span-3 text-right">Total</div>
                                                     <div className="col-span-1"></div>
                                                 </div>
                                                 {/* Items */}
                                                 {currentInvoice.lineItems.map((item) => (
                                                     <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors group">
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
                                                             <button
                                                                 onClick={() => handleInvoiceLineItemChange(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                                                 className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                                             >
                                                                 <Minus className="w-3 h-3" />
                                                             </button>
                                                             <input
                                                                 type="number"
                                                                 value={item.quantity}
                                                                 onChange={(e) => handleInvoiceLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                 className="w-12 bg-transparent text-white text-sm text-center focus:outline-none"
                                                             />
                                                             <button
                                                                 onClick={() => handleInvoiceLineItemChange(item.id, 'quantity', item.quantity + 1)}
                                                                 className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                                             >
                                                                 <Plus className="w-3 h-3" />
                                                             </button>
                                                         </div>
                                                         <div className="col-span-2 flex items-center justify-center">
                                                             <span className="text-gray-400 mr-1">$</span>
                                                             <input
                                                                 type="number"
                                                                 value={item.unitPrice}
                                                                 onChange={(e) => handleInvoiceLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                 className="w-20 bg-transparent text-white text-sm text-center focus:outline-none"
                                                             />
                                                         </div>
                                                         <div className="col-span-3 text-right text-white font-mono font-bold">
                                                             ${item.total.toFixed(2)}
                                                         </div>
                                                         <div className="col-span-1 flex justify-center">
                                                             <button
                                                                 onClick={() => handleRemoveInvoiceLineItem(item.id)}
                                                                 className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                 title="Remove item"
                                                             >
                                                                 <Trash2 className="w-3.5 h-3.5" />
                                                             </button>
                                                         </div>
                                                     </div>
                                                 ))}
                                                 {/* Add Item Button */}
                                                 <button
                                                     onClick={handleAddInvoiceLineItem}
                                                     className="w-full p-4 text-gray-400 hover:text-blue-400 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                                                 >
                                                     <Plus className="w-4 h-4" />
                                                     Add Line Item
                                                 </button>
                                             </div>
                                         </div>

                                         {/* Totals */}
                                         <div className="flex justify-end">
                                             <div className="w-72 space-y-3">
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
                                                         <span className="text-gray-400">-$</span>
                                                         <input
                                                             type="number"
                                                             value={currentInvoice.discount}
                                                             onChange={(e) => handleInvoiceChange('discount', parseFloat(e.target.value) || 0)}
                                                             className="w-20 bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-blue-500"
                                                         />
                                                     </div>
                                                 </div>
                                                 <div className="flex justify-between items-center text-lg pt-3 border-t border-white/10">
                                                     <span className="text-white font-bold">Total</span>
                                                     <span className="text-blue-500 font-mono font-bold">${currentInvoice.total.toFixed(2)}</span>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Notes */}
                                         <div>
                                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Notes</label>
                                             <textarea
                                                 value={currentInvoice.notes}
                                                 onChange={(e) => handleInvoiceChange('notes', e.target.value)}
                                                 placeholder="Add any notes or payment instructions..."
                                                 className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500 resize-none h-24"
                                             />
                                         </div>
                                     </div>

                                     {/* Footer Actions */}
                                     <div className="flex items-center justify-between p-6 border-t border-white/10 bg-[#0a0a0a]">
                                         <button
                                             onClick={() => handleInvoiceChange('status', currentInvoice.status === 'draft' ? 'sent' : currentInvoice.status === 'sent' ? 'paid' : 'draft')}
                                             className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                                 currentInvoice.status === 'draft' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' :
                                                 currentInvoice.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' :
                                                 'bg-gray-500/20 text-gray-400 hover:bg-gray-500 hover:text-white'
                                             }`}
                                         >
                                             {currentInvoice.status === 'draft' ? 'Mark as Sent' : currentInvoice.status === 'sent' ? 'Mark as Paid' : 'Reset to Draft'}
                                         </button>
                                         <button
                                             onClick={() => handleDownloadInvoicePDF(currentInvoice)}
                                             className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20"
                                         >
                                             <Download className="w-4 h-4" />
                                             Download PDF
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             /* Invoice List View */
                             <>
                                 {invoices.length === 0 ? (
                                     <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-blue-500/20 rounded-3xl bg-blue-500/5 backdrop-blur-sm">
                                         <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                                            <Receipt className="w-8 h-8 text-blue-500/50" />
                                         </div>
                                         <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">No Invoices Yet</p>
                                         <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Generate invoices from approved projects</p>
                                     </div>
                                 ) : (
                                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                         {invoices.map((invoice) => (
                                             <div
                                                 key={invoice.id}
                                                 className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group relative"
                                             >
                                                 {/* Delete Button */}
                                                 <button
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         handleDeleteInvoice(invoice.id);
                                                     }}
                                                     className="absolute top-3 right-3 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                     title="Delete invoice"
                                                 >
                                                     <Trash2 className="w-4 h-4" />
                                                 </button>

                                                 <div onClick={() => setCurrentInvoice(invoice)} className="flex items-start justify-between mb-4">
                                                     <div>
                                                         <p className="text-[10px] text-blue-500 font-mono mb-1">{invoice.invoiceNumber}</p>
                                                         <h4 className="font-bold text-white">{invoice.projectName}</h4>
                                                         <p className="text-xs text-gray-400">{invoice.clientDetails.name || 'No client'}</p>
                                                     </div>
                                                     <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                                                         invoice.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                                                         invoice.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                                         'bg-emerald-500/20 text-emerald-400'
                                                     }`}>
                                                         {invoice.status}
                                                     </span>
                                                 </div>
                                                 <div onClick={() => setCurrentInvoice(invoice)} className="flex items-center justify-between pt-4 border-t border-white/5">
                                                     <div className="text-xs text-gray-400">
                                                         Due: {new Date(invoice.dueDate).toLocaleDateString()}
                                                     </div>
                                                     <div className="text-lg font-bold text-blue-500 font-mono">
                                                         ${invoice.total.toFixed(2)}
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
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
              <InventoryView />
           )}

          {/* TAB: BOM */}
          {activeTab === 'bom' && (
            <BOMView
              bomData={currentBOM}
              onBOMChange={handleBOMChange}
              onSaveProject={handleSaveProjectFromBOM}
              currentQuote={currentQuote}
              generatedImage={generatedImage}
            />
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
             />
          )}

        </main>
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