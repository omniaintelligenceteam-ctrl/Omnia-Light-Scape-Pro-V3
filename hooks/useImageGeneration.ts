import { useState, useRef, useCallback } from 'react';
import type { PropertyAnalysis } from '../types';

export type GenerationStage = 'idle' | 'analyzing' | 'planning' | 'prompting' | 'validating' | 'generating';

interface UseImageGenerationReturn {
  // Image state
  file: File | null;
  previewUrl: string | null;
  generatedImage: string | null;
  
  // Generation state
  isLoading: boolean;
  error: string | null;
  generationComplete: boolean;
  generationStage: GenerationStage;
  
  // UI state
  showLoadingCelebration: boolean;
  showRipple: boolean;
  statusMessageIndex: number;
  ripplePosition: { x: number; y: number };
  
  // Property analysis
  propertyAnalysis: PropertyAnalysis | null;
  
  // Refs for cancellation/timing
  generationCancelledRef: React.MutableRefObject<boolean>;
  lastGenerateTime: React.MutableRefObject<number>;
  
  // Actions
  setFile: (file: File | null) => void;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setGeneratedImage: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setGenerationComplete: React.Dispatch<React.SetStateAction<boolean>>;
  setGenerationStage: React.Dispatch<React.SetStateAction<GenerationStage>>;
  setShowLoadingCelebration: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRipple: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusMessageIndex: React.Dispatch<React.SetStateAction<number>>;
  setRipplePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setPropertyAnalysis: React.Dispatch<React.SetStateAction<PropertyAnalysis | null>>;
  
  // Utility actions
  resetGeneration: () => void;
  cancelGeneration: () => void;
  clearImage: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  // Image state
  const [file, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Generation state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationComplete, setGenerationComplete] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  
  // UI state for loading animations
  const [showLoadingCelebration, setShowLoadingCelebration] = useState<boolean>(false);
  const [showRipple, setShowRipple] = useState<boolean>(false);
  const [statusMessageIndex, setStatusMessageIndex] = useState<number>(0);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  
  // Property analysis from AI
  const [propertyAnalysis, setPropertyAnalysis] = useState<PropertyAnalysis | null>(null);
  
  // Refs for timing and cancellation
  const generationCancelledRef = useRef<boolean>(false);
  const lastGenerateTime = useRef<number>(0);

  // Set file and cleanup old preview URL
  const setFile = useCallback((newFile: File | null) => {
    // Cleanup old preview URL to prevent memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setFileState(newFile);
    
    if (newFile) {
      const url = URL.createObjectURL(newFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    
    // Clear generated image when new file is selected
    setGeneratedImage(null);
    setGenerationComplete(false);
    setError(null);
  }, [previewUrl]);

  // Reset all generation state
  const resetGeneration = useCallback(() => {
    setGeneratedImage(null);
    setIsLoading(false);
    setError(null);
    setGenerationComplete(false);
    setGenerationStage('idle');
    setShowLoadingCelebration(false);
    setShowRipple(false);
    setStatusMessageIndex(0);
    setPropertyAnalysis(null);
    generationCancelledRef.current = false;
  }, []);

  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    generationCancelledRef.current = true;
    setIsLoading(false);
    setGenerationStage('idle');
    setShowLoadingCelebration(false);
  }, []);

  // Clear everything including the source image
  const clearImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFileState(null);
    setPreviewUrl(null);
    resetGeneration();
  }, [previewUrl, resetGeneration]);

  return {
    // State
    file,
    previewUrl,
    generatedImage,
    isLoading,
    error,
    generationComplete,
    generationStage,
    showLoadingCelebration,
    showRipple,
    statusMessageIndex,
    ripplePosition,
    propertyAnalysis,
    
    // Refs
    generationCancelledRef,
    lastGenerateTime,
    
    // Setters
    setFile,
    setPreviewUrl,
    setGeneratedImage,
    setIsLoading,
    setError,
    setGenerationComplete,
    setGenerationStage,
    setShowLoadingCelebration,
    setShowRipple,
    setStatusMessageIndex,
    setRipplePosition,
    setPropertyAnalysis,
    
    // Actions
    resetGeneration,
    cancelGeneration,
    clearImage,
  };
}
