import React, { useState, useRef, useCallback } from 'react';
import { Wand2, Sparkles, Loader2, Download, RefreshCw, ImagePlus, MousePointer2 } from 'lucide-react';
import { FixturePlacer, FixturePlacerHandle } from './FixturePlacer';
import { LightFixture, FixtureCategory } from '../types/fixtures';
import { analyzePropertyWithDeepThink, generateWithManualPlacement } from '../services/manualPlacementService';
import { useAuth } from '@clerk/clerk-react';

interface ManualPlacementGeneratorProps {
  initialImageUrl?: string;
  onGenerated?: (result: { imageUrl: string; fixtures: LightFixture[]; prompt: string }) => void;
}

const MARKER_COLORS: Record<FixtureCategory, string> = {
  uplight: '#f59e0b',      // amber
  downlight: '#3b82f6',    // blue
  path_light: '#10b981',   // emerald
  spot: '#ef4444',         // red
  wall_wash: '#8b5cf6',    // purple
  well_light: '#06b6d4',   // cyan
  bollard: '#84cc16',      // lime
  step_light: '#f97316',   // orange
  gutter_uplight: '#eab308', // yellow
  coredrill: '#6366f1',    // indigo
};

export const ManualPlacementGenerator: React.FC<ManualPlacementGeneratorProps> = ({
  initialImageUrl,
  onGenerated,
}) => {
  const { getToken } = useAuth();
  const placerRef = useRef<FixturePlacerHandle>(null);
  
  // State
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [fixtures, setFixtures] = useState<LightFixture[]>([]);
  const [activeFixtureType, setActiveFixtureType] = useState<FixtureCategory>('gutter_uplight');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [generationPrompt, setGenerationPrompt] = useState<string>('');
  const [styleNotes, setStyleNotes] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
      setFixtures([]);
      setGeneratedImage('');
      setError('');
    };
    reader.readAsDataURL(file);
  }, []);

  // DeepThink analysis
  const handleDeepThinkAnalysis = useCallback(async () => {
    if (!imageUrl) return;
    
    setIsAnalyzing(true);
    setError('');
    
    try {
      const base64 = imageUrl.split(',')[1];
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }
      
      const suggestions = await analyzePropertyWithDeepThink(base64, apiKey);
      
      // Add unique IDs to suggestions
      const withIds = suggestions.map((s, i) => ({
        ...s,
        id: `dt-${Date.now()}-${i}`
      }));
      
      setFixtures(withIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageUrl]);

  // Generate with Nano Banana 2 Pro
  const handleGenerate = useCallback(async () => {
    if (!imageUrl || fixtures.length === 0) return;
    
    setIsGenerating(true);
    setError('');
    
    try {
      const base64 = imageUrl.split(',')[1];
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }
      
      // Get image dimensions
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const result = await generateWithManualPlacement(
        base64,
        fixtures,
        apiKey,
        img.naturalWidth,
        img.naturalHeight,
        styleNotes
      );
      
      setGeneratedImage(result.imageUrl);
      setGenerationPrompt(result.prompt);
      
      onGenerated?.({
        imageUrl: result.imageUrl,
        fixtures,
        prompt: result.prompt
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [imageUrl, fixtures, styleNotes, onGenerated]);

  // Download generated image
  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `omnia-manual-placement-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          Manual Placement + AI Render
        </h2>
        <p className="text-gray-400 mt-1">
          DeepThink suggests positions. You adjust. Nano Banana 2 Pro renders.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Upload / Image Area */}
      {!imageUrl ? (
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center hover:border-gray-500 transition-colors">
          <ImagePlus className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Upload a property photo to start</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            Choose Photo
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Placement Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MousePointer2 className="w-5 h-5" />
                Fixture Placement
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleDeepThinkAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'DeepThink Suggest'}
                </button>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg cursor-pointer transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Fixture Type Selector */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(MARKER_COLORS).map(([type, color]) => (
                <button
                  key={type}
                  onClick={() => setActiveFixtureType(type as FixtureCategory)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeFixtureType === type
                      ? 'bg-gray-700 ring-2 ring-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-200 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>

            {/* Placement Canvas */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
              <FixturePlacer
                ref={placerRef}
                imageUrl={imageUrl}
                fixtures={fixtures}
                onFixturesChange={setFixtures}
                activeFixtureType={activeFixtureType}
                markerColors={MARKER_COLORS}
                cursorColor={MARKER_COLORS[activeFixtureType]}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{fixtures.length} fixtures placed</span>
              <div className="flex gap-2">
                <button
                  onClick={() => placerRef.current?.undo()}
                  disabled={!placerRef.current?.canUndo}
                  className="px-2 py-1 hover:bg-gray-700 rounded disabled:opacity-30"
                >
                  Undo
                </button>
                <button
                  onClick={() => placerRef.current?.redo()}
                  disabled={!placerRef.current?.canRedo}
                  className="px-2 py-1 hover:bg-gray-700 rounded disabled:opacity-30"
                >
                  Redo
                </button>
                <button
                  onClick={() => placerRef.current?.clearAll()}
                  className="px-2 py-1 hover:bg-red-900/50 text-red-400 rounded"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Style Notes */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Style Notes (optional)
              </label>
              <textarea
                value={styleNotes}
                onChange={(e) => setStyleNotes(e.target.value)}
                placeholder="e.g., 'Warm cozy feel', 'Modern dramatic lighting', 'Subtle elegant accent'"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                rows={2}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || fixtures.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Nano Banana 2 Pro Rendering...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Night Render
                </>
              )}
            </button>
          </div>

          {/* Right: Generated Result */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">AI Render Result</h3>
            
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
                  <img
                    src={generatedImage}
                    alt="AI Generated Night Scene"
                    className="w-full h-auto"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {showPrompt ? 'Hide Prompt' : 'Show Prompt'}
                  </button>
                </div>
                
                {showPrompt && (
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Prompt sent to Nano Banana 2 Pro:</p>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-48">
                      {generationPrompt}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 border-dashed">
                <div className="text-center text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Place fixtures and click Generate</p>
                  <p className="text-sm mt-1">to see Nano Banana 2 Pro render</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualPlacementGenerator;
