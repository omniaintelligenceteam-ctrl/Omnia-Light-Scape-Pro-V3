/**
 * LightingStyleIntegration.tsx
 * 
 * Example component showing how to integrate the LightingStyleSelector
 * into the image generation flow. This can be used as a reference or
 * directly imported into the main App.tsx.
 */

import React, { useCallback } from 'react';
import { LightingStyleSelector, useLightingStyle } from './LightingStyleSelector';
import { 
  integrateStyleIntoPrompt, 
  integrateStyleIntoNegativePrompt,
  getICLightParams,
  type GenerationStyleContext
} from '../../hooks/useLightingStyle';

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE: Using in a Generation Panel
// ═══════════════════════════════════════════════════════════════════════════════

interface GenerationPanelProps {
  onGenerate: (params: GenerationParams) => Promise<void>;
  isGenerating: boolean;
}

interface GenerationParams {
  prompt: string;
  negativePrompt: string;
  icLightConfig: {
    cfg: number;
    light_source: string;
    strength?: number;
  };
  colorTemp: number;
  intensity: number;
}

/**
 * Example panel component showing lighting style integration
 */
export const GenerationPanelWithStyle: React.FC<GenerationPanelProps> = ({
  onGenerate,
  isGenerating
}) => {
  // Use the lighting style hook
  const {
    selectedStyleId,
    overrides,
    setStyleId,
    setOverrides,
    getGenerationContext,
    hasOverrides
  } = useLightingStyle();
  
  // Handle generation with style context
  const handleGenerate = useCallback(async () => {
    // Get the style context
    const styleContext = getGenerationContext();
    
    // Example base prompts (these would come from fixture selections in real usage)
    const basePrompt = "professional landscape lighting design";
    const baseNegative = "daytime, sunlight, bright ambient";
    
    // Integrate style into prompts
    const finalPrompt = integrateStyleIntoPrompt(basePrompt, styleContext);
    const finalNegative = integrateStyleIntoNegativePrompt(baseNegative, styleContext);
    
    // Get IC-Light parameters
    const icLightConfig = getICLightParams(styleContext);
    
    // Call the generation function
    await onGenerate({
      prompt: finalPrompt,
      negativePrompt: finalNegative,
      icLightConfig,
      colorTemp: styleContext.colorTemp,
      intensity: styleContext.intensity
    });
  }, [getGenerationContext, onGenerate]);
  
  return (
    <div className="space-y-6 p-4 bg-[#111] rounded-xl">
      {/* Lighting Style Selector */}
      <LightingStyleSelector
        selectedStyleId={selectedStyleId}
        overrides={overrides}
        onStyleChange={setStyleId}
        onOverridesChange={setOverrides}
        disabled={isGenerating}
        showAdvanced={true}
      />
      
      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold text-center
          transition-all duration-200
          ${isGenerating
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
          }
        `}
      >
        {isGenerating ? 'Generating...' : 'Generate with Style'}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE: Compact Sidebar Version
// ═══════════════════════════════════════════════════════════════════════════════

interface SidebarStyleSelectorProps {
  onStyleChange?: (context: GenerationStyleContext) => void;
}

/**
 * Compact version for use in sidebar/settings area
 */
export const SidebarStyleSelector: React.FC<SidebarStyleSelectorProps> = ({
  onStyleChange
}) => {
  const {
    selectedStyleId,
    overrides,
    setStyleId,
    setOverrides,
    getGenerationContext
  } = useLightingStyle();
  
  // Notify parent when style changes
  const handleStyleChange = useCallback((id: typeof selectedStyleId) => {
    setStyleId(id);
    // Get updated context after state change
    setTimeout(() => {
      onStyleChange?.(getGenerationContext());
    }, 0);
  }, [setStyleId, getGenerationContext, onStyleChange]);
  
  const handleOverridesChange = useCallback((newOverrides: typeof overrides) => {
    setOverrides(newOverrides);
    setTimeout(() => {
      onStyleChange?.(getGenerationContext());
    }, 0);
  }, [setOverrides, getGenerationContext, onStyleChange]);
  
  return (
    <div className="p-3 bg-[#151515] rounded-lg border border-[#333]">
      <LightingStyleSelector
        selectedStyleId={selectedStyleId}
        overrides={overrides}
        onStyleChange={handleStyleChange}
        onOverridesChange={handleOverridesChange}
        compact={true}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE: Integration with existing geminiService
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Example function showing how to integrate with the existing generation pipeline
 * This would be added to or called from geminiService.ts
 */
export function buildPromptWithLightingStyle(
  basePrompt: string,
  baseNegative: string,
  styleContext: GenerationStyleContext
): {
  prompt: string;
  negativePrompt: string;
  colorTempPrompt: string;
  icLightSettings: {
    cfg: number;
    light_source: string;
    strength?: number;
  };
} {
  return {
    prompt: integrateStyleIntoPrompt(basePrompt, styleContext),
    negativePrompt: integrateStyleIntoNegativePrompt(baseNegative, styleContext),
    colorTempPrompt: styleContext.colorTempPrompt,
    icLightSettings: getICLightParams(styleContext)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE: Settings/Preferences Component for Company Defaults
// ═══════════════════════════════════════════════════════════════════════════════

interface CompanyStyleDefaultsProps {
  defaultStyleId: string;
  onDefaultChange: (styleId: string) => void;
}

/**
 * Component for company settings to set default lighting style
 */
export const CompanyStyleDefaults: React.FC<CompanyStyleDefaultsProps> = ({
  defaultStyleId,
  onDefaultChange
}) => {
  const {
    selectedStyleId,
    overrides,
    setStyleId,
    setOverrides
  } = useLightingStyle({
    initialStyleId: defaultStyleId as any,
    persist: false // Don't persist in company settings
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-white">Default Lighting Style</h4>
          <p className="text-sm text-gray-500">
            New projects will start with this style
          </p>
        </div>
      </div>
      
      <LightingStyleSelector
        selectedStyleId={selectedStyleId}
        overrides={overrides}
        onStyleChange={(id) => {
          setStyleId(id);
          onDefaultChange(id);
        }}
        onOverridesChange={setOverrides}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default GenerationPanelWithStyle;
