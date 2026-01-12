import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ImageUpload } from './components/ImageUpload';
import { QuoteView } from './components/QuoteView';
import { SettingsView } from './components/SettingsView';
// Removed LoginScreen import
import { SignedIn, SignedOut, SignIn, useClerk } from "@clerk/clerk-react"; 
import { fileToBase64, getPreviewUrl } from './utils';
import { generateNightScene } from './services/geminiService';
import { Loader2, FolderPlus, FileText, Maximize2, Trash2, Search, ArrowUpRight, Sparkles, AlertCircle, Wand2, ThumbsUp, ThumbsDown, X, RefreshCw, Image as ImageIcon, Download } from 'lucide-react';
import { FIXTURE_TYPES, COLOR_TEMPERATURES, DEFAULT_PRICING } from './constants';
import { SavedProject, QuoteData, CompanyProfile, FixturePricing } from './types';

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
  // Clerk Hook
  const { signOut } = useClerk();

  const [activeTab, setActiveTab] = useState<string>('editor');
  
  // Editor State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  
  // Strategy State
  const [selectedFixtures, setSelectedFixtures] = useState<string[]>(['up']);
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

  // Project State
  const [projects, setProjects] = useState<SavedProject[]>([]);
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
    setSelectedFixtures(['up']);
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
    setSelectedFixtures(prev => {
        if (prev.includes(fixtureId)) {
            return prev.filter(id => id !== fixtureId);
        } else {
            return [...prev, fixtureId];
        }
    });
  };

  const handleGenerate = async () => {
    if (!file || !previewUrl) return;

    // Construct Composite Prompt
    let activePrompt = "EDITING TASK: Apply specific lighting to the EXISTING photo content. Do not add new objects.\n\nFIXTURE CONFIGURATION:\n";
    
    // Add positive instructions for selected fixtures
    FIXTURE_TYPES.forEach(ft => {
        if (selectedFixtures.includes(ft.id)) {
            activePrompt += `\n[APPLY TO EXISTING]: ${ft.positivePrompt}`;
        } else {
            activePrompt += `\n[DO NOT ADD]: ${ft.negativePrompt}`;
        }
    });

    // --- LOGIC GATE FOR GUTTER vs SOFFIT ---
    // Rule: If Gutter is ON and Soffit is OFF -> Strictly forbid soffit lighting.
    if (selectedFixtures.includes('gutter') && !selectedFixtures.includes('soffit')) {
        activePrompt += `\n\n[HARD CONSTRAINT]: GUTTER LIGHTS ARE ACTIVE, BUT SOFFIT LIGHTS ARE DISABLED. You must ONLY generate lights shining UP from the gutter lip. The underside of the roof eaves (soffits) MUST remain completely dark. Do not allow any light bleed under the roof overhangs. Do NOT turn on existing soffit lights.`;
    }

    // Add Global Color Temperature / Theme
    const selectedColor = COLOR_TEMPERATURES.find(c => c.id === colorTemp);
    if (selectedColor && selectedColor.prompt) {
        activePrompt += `\n\nLIGHTING COLOR SETTING: ${selectedColor.prompt}`;
    }

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
      const result = await generateNightScene(base64, activePrompt, file.type, targetRatio, lightIntensity, beamAngle);
      setGeneratedImage(result);
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

    try {
        const base64 = await fileToBase64(file);
        // Construct a refinement prompt
        const refinementPrompt = `${lastUsedPrompt}\n\nCRITICAL MODIFICATION REQUEST: ${feedbackText}\n\nRe-generate the night scene keeping the original design but applying the modification request.`;
        
        const result = await generateNightScene(base64, refinementPrompt, file.type, "1:1", lightIntensity, beamAngle);
        setGeneratedImage(result);
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

   const handleSaveProjectFromEditor = () => {
      if (!generatedImage || !user) return; 
      
      const newProject: SavedProject = {
          id: crypto.randomUUID(),
          name: `Night Scene ${projects.length + 1}`,
          date: new Date().toLocaleDateString(),
          image: generatedImage,
          quote: null,
          userId: user.id 
      };

      // 1. Load ALL data from disk (everyone's projects)
      const allRawProjects = JSON.parse(localStorage.getItem("lumina_projects") || "[]");
      
      // 2. Add new project to the master list
      const updatedMasterList = [newProject, ...allRawProjects];
      
      // 3. Save master list back to disk
      localStorage.setItem("lumina_projects", JSON.stringify(updatedMasterList));
      
      // 4. Update your screen (just your projects)
      setProjects([newProject, ...projects]);
      setActiveTab('projects');
  };
    const handleSaveProjectFromQuote = (quoteData: QuoteData) => {
      if (!user) return;
      
      const newProject: SavedProject = {
          id: crypto.randomUUID(),
          name: quoteData.clientDetails.name || `Quote ${projects.length + 1}`,
          date: new Date().toLocaleDateString(),
          image: generatedImage, 
          quote: quoteData,
          userId: user.id
      };

      // 1. Load ALL data
      const allRawProjects = JSON.parse(localStorage.getItem("lumina_projects") || "[]");
      
      // 2. Add and Save
      localStorage.setItem("lumina_projects", JSON.stringify([newProject, ...allRawProjects]));
      
      // 3. Update UI
      setProjects([newProject, ...projects]);
      setActiveTab('projects');
  };


    const handleDeleteProject = (id: string) => {
      // 1. Get Master List from Disk
      const allRawProjects = JSON.parse(localStorage.getItem("lumina_projects") || "[]");
      
      // 2. Remove the specific project from the Master List
      const updatedMasterList = allRawProjects.filter((p: SavedProject) => p.id !== id);
      
      // 3. Save the new list back to Disk
      localStorage.setItem("lumina_projects", JSON.stringify(updatedMasterList));
      
      // 4. Update UI
      setProjects(projects.filter(p => p.id !== id));
  };

  // Logout Function - UPDATED for Clerk
  const handleLogout = async () => {
    // 1. Clear any legacy persistence
    localStorage.removeItem('lumina_active_user');

    // 2. Reset UI & Feature State
    setActiveTab('editor');
    setFile(null);
    setPreviewUrl(null);
    setGeneratedImage(null);
    setPrompt('');
    setCritiques([]);
    setFeedbackStatus('none');
    setCurrentCritiqueInput("");
    
    // 3. Reset User Data
    setProjects([]);
    setUser(null);
    setUserSettings(null);

    // 4. CLERK SIGN OUT
    await signOut();
  };


  // Filter projects for the search bar
  const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.date.includes(searchTerm)
  );

  return (
    <>
      <SignedOut>
        <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
          <SignIn />
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col h-screen overflow-hidden bg-[#050505]">
          <Header onRequestUpgrade={requestApiKey} />
          
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
                                        
                                        return (
                                            <button
                                                key={ft.id}
                                                onClick={() => toggleFixture(ft.id)}
                                                className={`py-3 px-4 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-200 border flex items-center justify-center text-center ${
                                                    isSelected 
                                                    ? 'bg-[#F6B45A] text-[#111] border-[#F6B45A] shadow-[0_0_15px_rgba(246,180,90,0.3)] scale-[1.02]' 
                                                    : 'bg-[#111] text-gray-300 border-white/10 hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white'
                                                }`}
                                            >
                                                {ft.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Description Textarea */}
                            <div className="relative group mt-2">
                                <textarea
                                    className="w-full h-16 bg-[#0F0F0F] border border-white/10 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 transition-all resize-none font-mono"
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
                     <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
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
                     
                     {filteredProjects.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-white/10 rounded-3xl bg-[#111]/50 backdrop-blur-sm">
                             <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                <FolderPlus className="w-8 h-8 text-gray-500" />
                             </div>
                             <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">System Empty</p>
                             <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">No rendered scenes found in database</p>
                         </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                            {filteredProjects.map((p, index) => (
                                <div key={p.id} className="group relative bg-[#111]/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:border-[#F6B45A]/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(246,180,90,0.1)] flex flex-col">
                                    
                                    {/* Image Section - Hero */}
                                    <div 
                                        className={`relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-black`}
                                    >
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

                                        {/* Download Actions Row */}
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
                                                    Save Quote
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                    // darknessLevel removed from props
                    beamAngle={beamAngle}
                    onBeamAngleChange={setBeamAngle}
                    pricing={pricing}
                    onPricingChange={setPricing}
                 />
              )}

            </main>
          </div>

          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
        </div>
      </SignedIn>
    </>
  );
};

export default App;
