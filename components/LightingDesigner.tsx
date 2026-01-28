/**
 * LightingDesigner Component
 * 
 * Complete lighting design workflow that integrates:
 * 1. Image upload
 * 2. Fixture placement (FixturePlacer)
 * 3. IC-Light nighttime conversion
 * 4. Composite overlay of precise fixture effects
 * 
 * This is the main integration point for the advanced lighting system.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Sun, Moon, Sparkles, Download, Undo, Redo,
  Settings, Play, Loader2, Check, X, Eye, Image as ImageIcon,
  Wand2, Layers
} from 'lucide-react';
import { FixturePlacer } from './FixturePlacer';
import { useFixtures } from '../hooks/useFixtures';
import { CompositeService } from '../services/compositeService';
import { LightFixture, FIXTURE_PRESETS } from '../types/fixtures';

type WorkflowStep = 'upload' | 'place' | 'generate' | 'review';

interface LightingDesignerProps {
  onComplete?: (result: { originalImage: string; finalImage: string; fixtures: LightFixture[] }) => void;
  icLightEndpoint?: string;  // Optional IC-Light API endpoint
}

/**
 * LightingDesigner - Full workflow component
 */
export const LightingDesigner: React.FC<LightingDesignerProps> = ({
  onComplete,
  icLightEndpoint
}) => {
  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [icLightOutput, setIcLightOutput] = useState<string | null>(null);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fixture management
  const {
    fixtures,
    selectedId,
    activeType,
    setActiveType,
    addFixture,
    removeFixture,
    updateFixture,
    selectFixture,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
    exportToJson,
    importFromJson,
    hasUnsavedChanges
  } = useFixtures({ autoSave: true });

  // Preview mode state
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'original' | 'iclight' | 'final'>('original');

  /**
   * Handle image upload
   */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);
      setIcLightOutput(null);
      setFinalOutput(null);
      clearAll();
      setStep('place');
      setError(null);
    };
    reader.readAsDataURL(file);
  }, [clearAll]);

  /**
   * Mock IC-Light generation (replace with actual API call)
   */
  const generateIcLight = useCallback(async (): Promise<string> => {
    // If IC-Light endpoint provided, use it
    if (icLightEndpoint && originalImage) {
      // Real implementation would call the IC-Light API here
      // For now, simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      // In production: return actual IC-Light output URL
    }

    // For demo: return original image with darkening filter
    // In production, this would be the IC-Light nighttime output
    return originalImage || '';
  }, [originalImage, icLightEndpoint]);

  /**
   * Full generation pipeline
   */
  const handleGenerate = useCallback(async () => {
    if (!originalImage || fixtures.length === 0) {
      setError('Please upload an image and place at least one fixture');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);

    try {
      // Step 1: Generate IC-Light nighttime scene (0-50%)
      setGenerationProgress(10);
      const icOutput = await generateIcLight();
      setIcLightOutput(icOutput);
      setGenerationProgress(50);

      // Step 2: Composite fixture effects (50-100%)
      setGenerationProgress(60);
      const compositeResult = await CompositeService.compositeFixtures(
        icOutput,
        fixtures,
        {
          outputQuality: 0.95,
          maxOutputWidth: 1920,
          globalIntensityMultiplier: 1.0
        }
      );
      setGenerationProgress(90);

      setFinalOutput(compositeResult.dataUrl);
      setGenerationProgress(100);
      setStep('review');

      // Notify parent
      onComplete?.({
        originalImage,
        finalImage: compositeResult.dataUrl,
        fixtures
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [originalImage, fixtures, generateIcLight, onComplete]);

  /**
   * Download final image
   */
  const handleDownload = useCallback(() => {
    if (!finalOutput) return;

    const link = document.createElement('a');
    link.href = finalOutput;
    link.download = `lighting-design-${Date.now()}.jpg`;
    link.click();
  }, [finalOutput]);

  /**
   * Reset to start
   */
  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setIcLightOutput(null);
    setFinalOutput(null);
    clearAll();
    setStep('upload');
    setError(null);
  }, [clearAll]);

  // Current display image based on preview mode
  const displayImage = useMemo(() => {
    switch (previewMode) {
      case 'iclight':
        return icLightOutput || originalImage;
      case 'final':
        return finalOutput || originalImage;
      default:
        return originalImage;
    }
  }, [previewMode, originalImage, icLightOutput, finalOutput]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Sparkles className="text-amber-500" size={24} />
          <h2 className="text-lg font-semibold text-white">Lighting Designer</h2>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {(['upload', 'place', 'generate', 'review'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => {
                  if (s === 'upload' || (s === 'place' && originalImage) || 
                      (s === 'generate' && fixtures.length > 0) ||
                      (s === 'review' && finalOutput)) {
                    setStep(s);
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                  step === s
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {i === 0 && <Upload size={14} />}
                {i === 1 && <Layers size={14} />}
                {i === 2 && <Wand2 size={14} />}
                {i === 3 && <Check size={14} />}
                <span className="hidden sm:inline">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              </button>
              {i < 3 && <div className="w-4 h-px bg-gray-600" />}
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {step !== 'upload' && (
            <>
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                title="Undo"
              >
                <Undo size={18} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30"
                title="Redo"
              >
                <Redo size={18} />
              </button>
            </>
          )}
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-red-500"
            title="Start Over"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center p-8"
            >
              <label className="flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-amber-500 transition-colors">
                <Upload size={48} className="text-gray-500 mb-4" />
                <p className="text-lg text-gray-400 mb-2">Upload Property Photo</p>
                <p className="text-sm text-gray-500">Click or drag and drop</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </motion.div>
          )}

          {/* Step 2: Place Fixtures */}
          {step === 'place' && originalImage && (
            <motion.div
              key="place"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <FixturePlacer
                imageUrl={originalImage}
                initialFixtures={fixtures}
                onFixturesChange={(newFixtures) => {
                  // Sync with hook
                }}
                showPreview={showPreview}
              />
            </motion.div>
          )}

          {/* Step 3: Generate */}
          {step === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {isGenerating ? (
                <div className="text-center">
                  <Loader2 size={48} className="animate-spin text-amber-500 mx-auto mb-4" />
                  <p className="text-lg text-white mb-2">Generating Lighting Design</p>
                  <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {generationProgress < 50 ? 'Converting to nighttime...' : 'Adding fixture effects...'}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="relative w-64 h-48 mb-6 rounded-lg overflow-hidden">
                    <img
                      src={originalImage || ''}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 flex items-end justify-center pb-4">
                      <span className="text-white font-medium">
                        {fixtures.length} fixtures placed
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <Play size={20} />
                    Generate Lighting Design
                  </button>
                  {error && (
                    <p className="text-red-400 text-sm mt-4">{error}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && finalOutput && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Preview toggle */}
              <div className="flex items-center justify-center gap-2 p-2 bg-gray-800/50">
                <button
                  onClick={() => setPreviewMode('original')}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'original' ? 'bg-gray-700 text-white' : 'text-gray-400'
                  }`}
                >
                  <Sun size={14} className="inline mr-1" />
                  Original
                </button>
                <button
                  onClick={() => setPreviewMode('iclight')}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'iclight' ? 'bg-gray-700 text-white' : 'text-gray-400'
                  }`}
                >
                  <Moon size={14} className="inline mr-1" />
                  Nighttime
                </button>
                <button
                  onClick={() => setPreviewMode('final')}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === 'final' ? 'bg-amber-500 text-white' : 'text-gray-400'
                  }`}
                >
                  <Sparkles size={14} className="inline mr-1" />
                  Final
                </button>
              </div>

              {/* Image display */}
              <div className="flex-1 flex items-center justify-center p-4">
                <img
                  src={displayImage || ''}
                  alt="Result"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>

              {/* Download button */}
              <div className="flex items-center justify-center gap-4 p-4 bg-gray-800/50">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <Download size={20} />
                  Download Final Image
                </button>
                <button
                  onClick={() => setStep('place')}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Edit Fixtures
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with fixture summary */}
      {step === 'place' && fixtures.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {FIXTURE_PRESETS.slice(0, 5).map(preset => {
              const count = fixtures.filter(f => f.type === preset.type).length;
              if (count === 0) return null;
              return (
                <span key={preset.type} className="flex items-center gap-1">
                  <span>{preset.icon}</span>
                  <span>{count}</span>
                </span>
              );
            })}
          </div>
          <button
            onClick={() => setStep('generate')}
            disabled={fixtures.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Wand2 size={18} />
            Continue to Generate
          </button>
        </div>
      )}
    </div>
  );
};

export default LightingDesigner;
