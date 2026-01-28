/**
 * useLightingStyle Hook
 * 
 * Manages lighting style preset state and integrates with the generation pipeline.
 * Handles persistence to localStorage and optional Supabase sync.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  LIGHTING_PRESETS,
  getPresetById,
  applyOverrides,
  buildPresetPromptAdditions,
  buildPresetNegativePrompt,
  DEFAULT_PRESET_ID,
  type LightingStyleId,
  type LightingStylePreset,
  type LightingStyleOverrides,
  type AppliedLightingStyle,
  type ICLightSettings
} from '../src/constants/lightingPresets';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LightingStyleState {
  /** Currently selected preset ID */
  selectedStyleId: LightingStyleId;
  /** User overrides on top of preset */
  overrides: LightingStyleOverrides;
}

export interface GenerationStyleContext {
  /** Prompt prefix to prepend */
  promptPrefix: string;
  /** Prompt suffix to append */
  promptSuffix: string;
  /** Color temperature instruction for prompt */
  colorTempPrompt: string;
  /** Additional negative prompt terms */
  negativePromptAdditions: string;
  /** IC-Light specific settings */
  icLightSettings: ICLightSettings;
  /** Final computed color temp in Kelvin */
  colorTemp: number;
  /** Final computed intensity (0-1) */
  intensity: number;
}

export interface UseLightingStyleOptions {
  /** Initial preset to use */
  initialStyleId?: LightingStyleId;
  /** Initial overrides */
  initialOverrides?: LightingStyleOverrides;
  /** Storage key for localStorage persistence */
  storageKey?: string;
  /** Enable localStorage persistence */
  persist?: boolean;
}

export interface UseLightingStyleReturn {
  // State
  selectedStyleId: LightingStyleId;
  overrides: LightingStyleOverrides;
  appliedStyle: AppliedLightingStyle;
  preset: LightingStylePreset;
  
  // Actions
  setStyleId: (id: LightingStyleId) => void;
  setOverrides: (overrides: LightingStyleOverrides) => void;
  updateOverride: <K extends keyof LightingStyleOverrides>(
    key: K, 
    value: LightingStyleOverrides[K]
  ) => void;
  resetToPreset: () => void;
  
  // For generation integration
  getGenerationContext: () => GenerationStyleContext;
  
  // For UI
  hasOverrides: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_DEFAULT = 'omnia:lightingStyle';

function loadFromStorage(key: string): LightingStyleState | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the stored style ID exists
      if (parsed.selectedStyleId && 
          (parsed.selectedStyleId === 'custom' || 
           parsed.selectedStyleId in LIGHTING_PRESETS)) {
        return {
          selectedStyleId: parsed.selectedStyleId,
          overrides: parsed.overrides || {}
        };
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function saveToStorage(key: string, state: LightingStyleState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useLightingStyle(
  options: UseLightingStyleOptions = {}
): UseLightingStyleReturn {
  const {
    initialStyleId = DEFAULT_PRESET_ID,
    initialOverrides = {},
    storageKey = STORAGE_KEY_DEFAULT,
    persist = true
  } = options;
  
  // Initialize state from storage or defaults
  const [state, setState] = useState<LightingStyleState>(() => {
    if (persist) {
      const stored = loadFromStorage(storageKey);
      if (stored) return stored;
    }
    return {
      selectedStyleId: initialStyleId,
      overrides: initialOverrides
    };
  });
  
  const { selectedStyleId, overrides } = state;
  
  // Persist to storage when state changes
  useEffect(() => {
    if (persist) {
      saveToStorage(storageKey, state);
    }
  }, [state, storageKey, persist]);
  
  // Get current preset
  const preset = useMemo(() => 
    getPresetById(selectedStyleId),
    [selectedStyleId]
  );
  
  // Compute applied style with overrides
  const appliedStyle = useMemo(() => 
    applyOverrides(preset, overrides),
    [preset, overrides]
  );
  
  // Check if any overrides are active
  const hasOverrides = useMemo(() => 
    Object.keys(overrides).length > 0,
    [overrides]
  );
  
  // Actions
  const setStyleId = useCallback((id: LightingStyleId) => {
    setState(prev => ({
      ...prev,
      selectedStyleId: id,
      // Optionally clear overrides when changing style
      // overrides: {}
    }));
  }, []);
  
  const setOverrides = useCallback((newOverrides: LightingStyleOverrides) => {
    setState(prev => ({
      ...prev,
      overrides: newOverrides
    }));
  }, []);
  
  const updateOverride = useCallback(<K extends keyof LightingStyleOverrides>(
    key: K,
    value: LightingStyleOverrides[K]
  ) => {
    setState(prev => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [key]: value
      }
    }));
  }, []);
  
  const resetToPreset = useCallback(() => {
    setState(prev => ({
      ...prev,
      overrides: {}
    }));
  }, []);
  
  // Build generation context
  const getGenerationContext = useCallback((): GenerationStyleContext => {
    const promptAdditions = buildPresetPromptAdditions(appliedStyle);
    const negativePromptAdditions = buildPresetNegativePrompt(preset);
    
    return {
      promptPrefix: promptAdditions.prefix,
      promptSuffix: promptAdditions.suffix,
      colorTempPrompt: promptAdditions.colorTempPrompt,
      negativePromptAdditions,
      icLightSettings: preset.icLightSettings,
      colorTemp: appliedStyle.finalColorTemp,
      intensity: appliedStyle.finalIntensity
    };
  }, [appliedStyle, preset]);
  
  return {
    // State
    selectedStyleId,
    overrides,
    appliedStyle,
    preset,
    
    // Actions
    setStyleId,
    setOverrides,
    updateOverride,
    resetToPreset,
    
    // For generation
    getGenerationContext,
    
    // For UI
    hasOverrides
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Integrate lighting style into final generation prompt
 * Use this in the generation pipeline to add style context
 */
export function integrateStyleIntoPrompt(
  basePrompt: string,
  styleContext: GenerationStyleContext
): string {
  const parts: string[] = [];
  
  // Add style prefix
  if (styleContext.promptPrefix) {
    parts.push(styleContext.promptPrefix);
  }
  
  // Add color temperature instruction
  parts.push(styleContext.colorTempPrompt);
  
  // Add base prompt
  parts.push(basePrompt);
  
  // Add style suffix
  if (styleContext.promptSuffix) {
    parts.push(styleContext.promptSuffix);
  }
  
  return parts.join('\n\n');
}

/**
 * Integrate lighting style into negative prompt
 */
export function integrateStyleIntoNegativePrompt(
  baseNegative: string,
  styleContext: GenerationStyleContext
): string {
  if (styleContext.negativePromptAdditions) {
    return `${baseNegative}, ${styleContext.negativePromptAdditions}`;
  }
  return baseNegative;
}

/**
 * Get IC-Light API parameters from style context
 */
export function getICLightParams(styleContext: GenerationStyleContext): {
  cfg: number;
  light_source: string;
  strength?: number;
} {
  const { icLightSettings } = styleContext;
  return {
    cfg: icLightSettings.cfg,
    light_source: icLightSettings.light_source,
    strength: icLightSettings.strength
  };
}

export default useLightingStyle;
