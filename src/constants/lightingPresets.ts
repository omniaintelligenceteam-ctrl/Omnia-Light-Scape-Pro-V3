/**
 * Lighting Style Presets for Omnia
 * 
 * Each preset contains:
 * - Display info (name, description, icon)
 * - IC-Light generation settings (cfg, light_source)
 * - Prompt modifiers for the generation
 * - Visual settings (color temp, intensity, contrast)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LightingStyleId = 
  | 'dramatic' 
  | 'elegant' 
  | 'warm_welcoming' 
  | 'modern_minimal' 
  | 'security_focused'
  | 'natural_moonlit'
  | 'luxury_estate'
  | 'custom';

export type ContrastLevel = 'low' | 'medium' | 'high';

export type LightSourceType = 
  | 'Bottom Light' 
  | 'Top Light' 
  | 'Left Light' 
  | 'Right Light'
  | 'Ambient';

export interface ICLightSettings {
  /** Classifier-free guidance scale - higher = more adherence to prompt (1.5-4.0) */
  cfg: number;
  /** Primary light direction for IC-Light */
  light_source: LightSourceType;
  /** Secondary light influence (optional) */
  secondary_source?: LightSourceType;
  /** Light intensity multiplier for IC-Light */
  strength?: number;
}

export interface LightingStylePreset {
  id: LightingStyleId;
  name: string;
  description: string;
  shortDescription: string;
  icon: string; // Emoji icon for quick visual reference
  
  // IC-Light specific settings
  icLightSettings: ICLightSettings;
  
  // Prompt engineering
  promptPrefix: string;
  promptSuffix: string;
  negativePromptAdditions: string[];
  
  // Visual settings
  colorTemp: number; // Kelvin (2700-4000)
  intensity: number; // 0.0-1.0
  contrast: ContrastLevel;
  
  // Advanced settings
  shadowDepth: number; // 0.0-1.0 (how dark shadows should be)
  highlightBloom: number; // 0.0-1.0 (light bloom/glow effect)
  ambientFill: number; // 0.0-1.0 (ambient light to fill shadows)
  
  // Category for organization
  category: 'residential' | 'commercial' | 'architectural' | 'security';
  
  // Preview image (optional - for UI)
  previewImage?: string;
}

export interface LightingStyleOverrides {
  colorTemp?: number;
  intensity?: number;
  contrast?: ContrastLevel;
  shadowDepth?: number;
  highlightBloom?: number;
}

export interface AppliedLightingStyle {
  preset: LightingStylePreset;
  overrides: LightingStyleOverrides;
  // Computed final values
  finalColorTemp: number;
  finalIntensity: number;
  finalContrast: ContrastLevel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const LIGHTING_PRESETS: Record<Exclude<LightingStyleId, 'custom'>, LightingStylePreset> = {
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DRAMATIC - High contrast, bold shadows, statement lighting
  // ─────────────────────────────────────────────────────────────────────────────
  dramatic: {
    id: 'dramatic',
    name: 'Dramatic',
    description: 'High contrast lighting with bold shadows and statement illumination. Creates a striking nighttime presence with intentional dark areas that make the lit features pop.',
    shortDescription: 'High contrast, bold shadows',
    icon: '🎭',
    
    icLightSettings: {
      cfg: 3.5,
      light_source: 'Bottom Light',
      strength: 1.2
    },
    
    promptPrefix: 'dramatic professional landscape lighting design, high contrast illumination, bold intentional shadows, statement architectural lighting,',
    promptSuffix: 'cinematic lighting quality, professional photography lighting, sharp light-to-dark transitions, premium landscape lighting installation',
    negativePromptAdditions: [
      'flat lighting',
      'even illumination',
      'no shadows',
      'bright ambient',
      'washed out'
    ],
    
    colorTemp: 2700,
    intensity: 0.9,
    contrast: 'high',
    
    shadowDepth: 0.85,
    highlightBloom: 0.3,
    ambientFill: 0.1,
    
    category: 'architectural'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ELEGANT - Soft, balanced, sophisticated
  // ─────────────────────────────────────────────────────────────────────────────
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    description: 'Soft, balanced illumination with a sophisticated touch. Perfect for upscale properties where understated luxury is the goal.',
    shortDescription: 'Soft, balanced, sophisticated',
    icon: '✨',
    
    icLightSettings: {
      cfg: 2.5,
      light_source: 'Bottom Light',
      secondary_source: 'Ambient',
      strength: 1.0
    },
    
    promptPrefix: 'elegant soft landscape lighting, balanced warm illumination, sophisticated lighting design, refined light placement,',
    promptSuffix: 'luxury residential lighting, gentle gradients, premium quality fixtures, tasteful accent lighting',
    negativePromptAdditions: [
      'harsh lighting',
      'stark contrast',
      'industrial',
      'cold lighting',
      'security floodlights'
    ],
    
    colorTemp: 3000,
    intensity: 0.7,
    contrast: 'medium',
    
    shadowDepth: 0.5,
    highlightBloom: 0.4,
    ambientFill: 0.25,
    
    category: 'residential'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WARM & WELCOMING - Cozy, inviting, residential feel
  // ─────────────────────────────────────────────────────────────────────────────
  warm_welcoming: {
    id: 'warm_welcoming',
    name: 'Warm & Welcoming',
    description: 'Cozy and inviting atmosphere with warm tones that make a house feel like home. Emphasizes comfort and approachability.',
    shortDescription: 'Cozy, inviting, homey',
    icon: '🏠',
    
    icLightSettings: {
      cfg: 2.0,
      light_source: 'Bottom Light',
      secondary_source: 'Ambient',
      strength: 0.9
    },
    
    promptPrefix: 'warm welcoming landscape lighting, cozy residential illumination, inviting warm glow, comfortable home lighting,',
    promptSuffix: 'friendly atmosphere, soft warm light pools, gentle accent lighting, homey evening ambiance',
    negativePromptAdditions: [
      'cold lighting',
      'stark white',
      'clinical',
      'commercial feel',
      'intimidating'
    ],
    
    colorTemp: 2700,
    intensity: 0.65,
    contrast: 'low',
    
    shadowDepth: 0.4,
    highlightBloom: 0.5,
    ambientFill: 0.35,
    
    category: 'residential'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MODERN MINIMAL - Clean lines, focused light, contemporary
  // ─────────────────────────────────────────────────────────────────────────────
  modern_minimal: {
    id: 'modern_minimal',
    name: 'Modern Minimal',
    description: 'Clean, focused lighting with contemporary aesthetics. Less is more - precise light placement with intentional restraint.',
    shortDescription: 'Clean lines, focused, contemporary',
    icon: '⬜',
    
    icLightSettings: {
      cfg: 3.0,
      light_source: 'Bottom Light',
      strength: 1.1
    },
    
    promptPrefix: 'modern minimalist landscape lighting, clean contemporary illumination, precise focused light beams, architectural lighting design,',
    promptSuffix: 'geometric light patterns, crisp edges, intentional negative space, high-end modern aesthetic',
    negativePromptAdditions: [
      'cluttered lights',
      'traditional style',
      'ornate',
      'warm rustic',
      'country style'
    ],
    
    colorTemp: 3500,
    intensity: 0.75,
    contrast: 'high',
    
    shadowDepth: 0.7,
    highlightBloom: 0.15,
    ambientFill: 0.15,
    
    category: 'architectural'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SECURITY FOCUSED - Well-lit, practical, safe
  // ─────────────────────────────────────────────────────────────────────────────
  security_focused: {
    id: 'security_focused',
    name: 'Security First',
    description: 'Practical, well-lit design prioritizing visibility and safety. Reduces dark spots while maintaining aesthetic appeal.',
    shortDescription: 'Well-lit, practical, safe',
    icon: '🛡️',
    
    icLightSettings: {
      cfg: 2.5,
      light_source: 'Bottom Light',
      secondary_source: 'Top Light',
      strength: 1.3
    },
    
    promptPrefix: 'security-conscious landscape lighting, practical illumination, well-lit pathways, comprehensive area lighting,',
    promptSuffix: 'clear visibility, safety-focused design, overlapping light coverage, deterrent lighting',
    negativePromptAdditions: [
      'dark corners',
      'heavy shadows',
      'dim lighting',
      'spotty coverage',
      'hidden areas'
    ],
    
    colorTemp: 3000,
    intensity: 0.85,
    contrast: 'low',
    
    shadowDepth: 0.25,
    highlightBloom: 0.2,
    ambientFill: 0.5,
    
    category: 'security'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NATURAL MOONLIT - Subtle, organic, natural feel
  // ─────────────────────────────────────────────────────────────────────────────
  natural_moonlit: {
    id: 'natural_moonlit',
    name: 'Natural Moonlit',
    description: 'Subtle, organic lighting that mimics moonlight through trees. Creates a peaceful, natural evening atmosphere.',
    shortDescription: 'Subtle, organic, peaceful',
    icon: '🌙',
    
    icLightSettings: {
      cfg: 2.0,
      light_source: 'Top Light',
      secondary_source: 'Ambient',
      strength: 0.8
    },
    
    promptPrefix: 'natural moonlit landscape, organic subtle illumination, peaceful evening ambiance, soft downlighting,',
    promptSuffix: 'dappled light effect, gentle tree shadows, serene atmosphere, naturalistic lighting design',
    negativePromptAdditions: [
      'harsh uplight',
      'bright spots',
      'artificial look',
      'stadium lighting',
      'commercial'
    ],
    
    colorTemp: 4000,
    intensity: 0.5,
    contrast: 'medium',
    
    shadowDepth: 0.6,
    highlightBloom: 0.25,
    ambientFill: 0.3,
    
    category: 'residential'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LUXURY ESTATE - Premium, layered, showcase quality
  // ─────────────────────────────────────────────────────────────────────────────
  luxury_estate: {
    id: 'luxury_estate',
    name: 'Luxury Estate',
    description: 'Premium multi-layered lighting design for high-end properties. Combines multiple techniques for a showcase-worthy result.',
    shortDescription: 'Premium, layered, showcase',
    icon: '👑',
    
    icLightSettings: {
      cfg: 3.2,
      light_source: 'Bottom Light',
      secondary_source: 'Ambient',
      strength: 1.15
    },
    
    promptPrefix: 'luxury estate landscape lighting, premium multi-layered illumination, showcase architectural lighting, high-end residential design,',
    promptSuffix: 'magazine-quality lighting, professional grade fixtures, perfectly balanced composition, statement property lighting',
    negativePromptAdditions: [
      'budget lighting',
      'single layer',
      'basic installation',
      'residential grade',
      'simple design'
    ],
    
    colorTemp: 2800,
    intensity: 0.8,
    contrast: 'medium',
    
    shadowDepth: 0.6,
    highlightBloom: 0.35,
    ambientFill: 0.2,
    
    category: 'residential'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM PRESET TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export const CUSTOM_PRESET_TEMPLATE: LightingStylePreset = {
  id: 'custom',
  name: 'Custom',
  description: 'Create your own lighting style with full control over all settings.',
  shortDescription: 'Your custom settings',
  icon: '🎨',
  
  icLightSettings: {
    cfg: 2.5,
    light_source: 'Bottom Light',
    strength: 1.0
  },
  
  promptPrefix: '',
  promptSuffix: '',
  negativePromptAdditions: [],
  
  colorTemp: 3000,
  intensity: 0.7,
  contrast: 'medium',
  
  shadowDepth: 0.5,
  highlightBloom: 0.3,
  ambientFill: 0.2,
  
  category: 'residential'
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all presets as an array for iteration
 */
export function getAllPresets(): LightingStylePreset[] {
  return Object.values(LIGHTING_PRESETS);
}

/**
 * Get presets filtered by category
 */
export function getPresetsByCategory(category: LightingStylePreset['category']): LightingStylePreset[] {
  return Object.values(LIGHTING_PRESETS).filter(p => p.category === category);
}

/**
 * Get a preset by ID (returns custom template if 'custom')
 */
export function getPresetById(id: LightingStyleId): LightingStylePreset {
  if (id === 'custom') return CUSTOM_PRESET_TEMPLATE;
  return LIGHTING_PRESETS[id];
}

/**
 * Apply overrides to a preset and compute final values
 */
export function applyOverrides(
  preset: LightingStylePreset,
  overrides: LightingStyleOverrides
): AppliedLightingStyle {
  return {
    preset,
    overrides,
    finalColorTemp: overrides.colorTemp ?? preset.colorTemp,
    finalIntensity: overrides.intensity ?? preset.intensity,
    finalContrast: overrides.contrast ?? preset.contrast
  };
}

/**
 * Convert color temperature to descriptive label
 */
export function getColorTempLabel(kelvin: number): string {
  if (kelvin <= 2700) return 'Warm White (2700K)';
  if (kelvin <= 3000) return 'Soft White (3000K)';
  if (kelvin <= 3500) return 'Neutral White (3500K)';
  return 'Cool White (4000K)';
}

/**
 * Convert color temperature to hex color for UI preview
 */
export function getColorTempHex(kelvin: number): string {
  // Approximate color representations
  if (kelvin <= 2700) return '#FFB86C'; // Warm amber
  if (kelvin <= 3000) return '#FFD4A3'; // Soft warm
  if (kelvin <= 3500) return '#FFF0D0'; // Neutral warm
  return '#FFF8F0'; // Cool white
}

/**
 * Build prompt additions from a preset
 */
export function buildPresetPromptAdditions(
  applied: AppliedLightingStyle
): { prefix: string; suffix: string; colorTempPrompt: string } {
  const { preset, finalColorTemp, finalIntensity, finalContrast } = applied;
  
  // Build intensity descriptor
  let intensityDesc = '';
  if (finalIntensity < 0.5) intensityDesc = 'subtle, understated';
  else if (finalIntensity < 0.7) intensityDesc = 'balanced, moderate';
  else if (finalIntensity < 0.85) intensityDesc = 'confident, well-lit';
  else intensityDesc = 'bold, prominent';
  
  // Build contrast descriptor
  let contrastDesc = '';
  switch (finalContrast) {
    case 'low': contrastDesc = 'soft gradual transitions'; break;
    case 'medium': contrastDesc = 'balanced light and shadow'; break;
    case 'high': contrastDesc = 'dramatic sharp contrasts'; break;
  }
  
  const prefix = preset.promptPrefix 
    ? `${preset.promptPrefix} ${intensityDesc} lighting with ${contrastDesc},`
    : `${intensityDesc} lighting with ${contrastDesc},`;
    
  const suffix = preset.promptSuffix || '';
  
  const colorTempPrompt = `Use ${getColorTempLabel(finalColorTemp)} for all lights. Color temperature: ${finalColorTemp}K.`;
  
  return { prefix, suffix, colorTempPrompt };
}

/**
 * Get negative prompt additions from a preset
 */
export function buildPresetNegativePrompt(preset: LightingStylePreset): string {
  return preset.negativePromptAdditions.join(', ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES FOR UI
// ═══════════════════════════════════════════════════════════════════════════════

export const COLOR_TEMP_RANGE = {
  min: 2700,
  max: 4000,
  step: 100,
  default: 3000
};

export const INTENSITY_RANGE = {
  min: 0.3,
  max: 1.0,
  step: 0.05,
  default: 0.7
};

export const CONTRAST_OPTIONS: { value: ContrastLevel; label: string }[] = [
  { value: 'low', label: 'Soft' },
  { value: 'medium', label: 'Balanced' },
  { value: 'high', label: 'Dramatic' }
];

export const DEFAULT_PRESET_ID: LightingStyleId = 'elegant';
