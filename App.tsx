import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ImageUpload } from './components/ImageUpload';
import { QuoteView } from './components/QuoteView';
import { SettingsView } from './components/SettingsView';
import { fileToBase64, getPreviewUrl } from './utils';
import { generateNightScene } from './services/geminiService';
import { Loader2, Download, RefreshCw, AlertCircle, Wand2, ChevronDown, ThumbsUp, ThumbsDown, X, ArrowLeft, FolderPlus, FileText, Maximize2, Trash2, Calendar, Sparkles, Search, MoreHorizontal, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { FIXTURE_TYPES, COLOR_TEMPERATURES } from './constants';
import { SavedProject, QuoteData, CompanyProfile } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('editor');
  
  // Editor State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  
  // Strategy State
  const [selectedFixtures, setSelectedFixtures] = useState<string[]>(['up']);
  // Lifted Setting State
  const [colorTemp, setColorTemp] = useState<string>('3000k');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: 'Omnia Light Scape Pro',
    email: 'dev@omnia.com',
    address: '123 Landscape Lane\nDesign District, CA 90210',
    logo: null
  });

  // Auth State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Check for API key on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsAuthorized(hasKey);
        } catch (e) {
          console.error("Auth check failed", e);
          setIsAuthorized(false);
        }
      } else {
        // Fallback for environments without the shim
        setIsAuthorized(true);
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const requestApiKey = async () => {
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
            setIsAuthorized(true);
            setError(null);
        } catch (e) {
            console.error("Key selection cancelled or failed", e);
        }
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
            // Don't allow deselecting the last one? Or allow it but button disabled. 
            // Let's allow empty, but maybe show warning or handle in logic.
            return prev.filter(id => id !== fixtureId);
        } else {
            return [...prev, fixtureId];
        }
    });
  };

  const handleGenerate = async () => {
    if (!file) return;

    // Construct Composite Prompt
    let activePrompt = "Generate a comprehensive landscape lighting design.\n\nFIXTURE INSTRUCTIONS:\n";
    
    // Add positive instructions for selected fixtures
    // Add negative instructions for unselected fixtures to prevent hallucinations
    FIXTURE_TYPES.forEach(ft => {
        if (selectedFixtures.includes(ft.id)) {
            activePrompt += `\n[INCLUDE ${ft.label.toUpperCase()}]: ${ft.positivePrompt}`;
        } else {
            activePrompt += `\n[EXCLUDE ${ft.label.toUpperCase()}]: ${ft.negativePrompt}`;
        }
    });

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

    try {
      const base64 = await fileToBase64(file);
      const result = await generateNightScene(base64, activePrompt, file.type);
      setGeneratedImage(result);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.toString().toLowerCase();
      if (errorMessage.includes('403') || errorMessage.includes('permission_denied') || errorMessage.includes('permission denied')) {
        setError("Permission denied. Please select a valid API Key.");
        if (window.aistudio) await requestApiKey();
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
        
        const result = await generateNightScene(base64, refinementPrompt, file.type);
        setGeneratedImage(result);
        setShowFeedback(false);
        setFeedbackText('');
        setIsLiked(false);
    } catch (err: any) {
        console.error(err);
        const errorMessage = err.toString().toLowerCase();
        if (errorMessage.includes('403') || errorMessage.includes('permission_denied') || errorMessage.includes('permission denied')) {
            setError("Permission denied. Please select a valid API Key.");
            if (window.aistudio) await requestApiKey();
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

  const handleGenerateQuote = () => {
    // Reset quote state for a new quote
    setCurrentQuote(null);
    setActiveTab('quotes');
  };

  const handleSaveProjectFromEditor = () => {
      if (!generatedImage) return;
      const newProject: SavedProject = {
          id: crypto.randomUUID(),
          name: `Night Scene ${projects.length + 1}`,
          date: new Date().toLocaleDateString(),
          image: generatedImage,
          quote: null
      };
      setProjects([newProject, ...projects]);
      setActiveTab('projects');
  };

  const handleSaveProjectFromQuote = (quoteData: QuoteData) => {
      const newProject: SavedProject = {
          id: crypto.randomUUID(),
          name: quoteData.clientDetails.name || `Quote ${projects.length + 1}`,
          date: new Date().toLocaleDateString(),
          image: generatedImage, // Uses current generated image if available
          quote: quoteData
      };
      setProjects([newProject, ...projects]);
      setActiveTab('projects');
  };

  const handleDeleteProject = (id: string) => {
      setProjects(projects.filter(p => p.id !== id));
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!isAuthorized) {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
            <div className="max-w-md text-center space-y-8 p-12 bg-[#111] rounded-[28px] shadow-2xl border border-white/10">
                <div className="flex flex-col items-center gap-2">
                     <h1 className="text-4xl font-bold text-[#F6B45A] tracking-tight font-serif">Omnia</h1>
                     <span className="text-gray-400 font-bold italic text-sm tracking-[0.2em] uppercase font-serif">Light Scape Pro</span>
                </div>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                  <p className="text-gray-400 text-sm leading-relaxed">
                      To access the advanced <span className="text-[#F6B45A] font-bold">Gemini 3 Pro</span> model, please connect your API Key.
                  </p>
                </div>
                <button 
                    onClick={requestApiKey} 
                    className="w-full bg-[#F6B45A] text-[#050505] rounded-xl py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ffc67a] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] hover:scale-[1.01] transition-all"
                >
                    Connect API Key
                </button>
            </div>
        </div>
    );
  }

  // Filter projects for the search bar
  const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.date.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505]">
      <Header onRequestUpgrade={requestApiKey} />
      
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

              {/* Fix: Use min-h-full instead of h-full, and justify-start on mobile to allow scrolling */}
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
                                    <button onClick={() => setShowFeedback(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white">
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
                <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 fade-in duration-500 pb-20 md:pb-0">
                    
                    {/* Image Upload Area */}
                    <div className="relative">
                        <ImageUpload 
                            currentImage={file}
                            previewUrl={previewUrl}
                            onImageSelect={handleImageSelect}
                            onClear={handleClear}
                        />
                        
                        {/* Loading Screen ON THE PICTURE */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 rounded-2xl flex flex-col items-center justify-center text-white border border-white/10">
                                <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#F6B45A]" />
                                <h3 className="text-xl font-bold tracking-tight text-[#F6B45A] font-serif mb-2">Omnia AI</h3>
                                <p className="font-mono text-xs uppercase text-gray-400 tracking-widest">Processing High-Res Model...</p>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className={`flex flex-col gap-6 transition-all duration-300 ${isLoading ? 'opacity-30 pointer-events-none filter blur-[1px]' : 'opacity-100'}`}>
                        
                        {/* NEW: Button-Based Fixture Selection */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-1 flex items-center gap-2">
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
                                                : 'bg-[#111] text-gray-400 border-white/10 hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white'
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
                                className="w-full h-16 bg-[#0F0F0F] border border-white/10 rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 transition-all resize-none font-mono"
                                placeholder="> Enter specific instructions (e.g. 'Add moonlighting to the oak tree')..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <div className="absolute right-3 bottom-3 text-[10px] text-gray-700 font-mono uppercase tracking-widest">
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
                             <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Database // Active Systems: {projects.length}</span>
                        </div>
                     </div>

                     {/* Search Bar Simulation */}
                     <div className="w-full md:w-96 relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-[#F6B45A] transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-[#111] text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-black focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 sm:text-sm font-mono transition-all"
                            placeholder="Search by ID or Client..."
                        />
                     </div>
                 </div>
                 
                 {filteredProjects.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-white/10 rounded-3xl bg-[#111]/50 backdrop-blur-sm">
                         <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <FolderPlus className="w-8 h-8 text-gray-600" />
                         </div>
                         <p className="font-bold text-lg text-white font-serif tracking-wide mb-2">System Empty</p>
                         <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">No rendered scenes found in database</p>
                     </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                        {filteredProjects.map((p, index) => (
                            <div key={p.id} className="group relative bg-[#111]/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:border-[#F6B45A]/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(246,180,90,0.1)] flex flex-col">
                                
                                {/* Image Section - Hero */}
                                <div 
                                    onClick={() => {
                                        if (p.image) {
                                            setGeneratedImage(p.image);
                                            setActiveTab('editor');
                                        }
                                    }}
                                    className={`relative aspect-[4/3] w-full overflow-hidden cursor-pointer bg-black`}
                                >
                                    {p.image ? (
                                        <>
                                            <img src={p.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" alt="Scene" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-90"></div>
                                            
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
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-[#0a0a0a]">
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
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-full transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        <div className="bg-[#151515] p-2 rounded-lg border border-white/5">
                                            <span className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Created</span>
                                            <span className="text-xs text-gray-300 font-mono">{p.date}</span>
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
                                            <span className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Estimate</span>
                                            <span className={`text-xs font-mono font-bold ${p.quote ? 'text-[#F6B45A]' : 'text-gray-600'}`}>
                                                {p.quote ? `$${p.quote.total.toFixed(0)}` : 'N/A'}
                                            </span>
                                            {p.quote && (
                                                <ArrowUpRight className="absolute top-2 right-2 w-3 h-3 text-[#F6B45A] opacity-0 group-hover/quote:opacity-100 transition-opacity" />
                                            )}
                                        </div>
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
             />
          )}

        </main>
      </div>

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
