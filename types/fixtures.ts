/**
 * Fixture Placement Types for Omnia Lighting Control System
 * These types define the data structures for placing and controlling
 * individual light fixtures on property images.
 */

// Fixture type categories matching common landscape lighting fixtures
export type FixtureCategory =
  | 'uplight'        // Wall wash, tree uplighting
  | 'downlight'      // Soffit, overhead lighting
  | 'path_light'     // Walkway, border lights
  | 'spot'           // Focused accent lighting
  | 'wall_wash'      // Wide-angle wall illumination
  | 'well_light'     // In-ground fixtures
  | 'bollard'        // Pathway bollards
  | 'step_light'     // Stair/step lighting
  | 'gutter_uplight'; // Gutter-mounted uplight (inside gutter channel)

/**
 * Individual light fixture with position and properties
 */
export interface LightFixture {
  id: string;
  x: number;           // Percentage of image width (0-100)
  y: number;           // Percentage of image height (0-100)
  type: FixtureCategory;
  intensity: number;   // 0-1 (brightness level)
  colorTemp: number;   // Kelvin (2700-5000K typical)
  beamAngle: number;   // Degrees (15-120 typical)
  label?: string;      // User-defined label
  locked?: boolean;    // Prevent accidental moves
  rotation?: number;   // Degrees (0-360) for directional fixtures
}

/**
 * Preset configurations for different fixture types
 */
export interface FixturePreset {
  type: FixtureCategory;
  name: string;
  description: string;
  icon: string;
  defaultIntensity: number;
  defaultColorTemp: number;
  defaultBeamAngle: number;
  glowConfig: GlowConfiguration;
}

/**
 * Configuration for rendering the glow effect of a fixture
 */
export interface GlowConfiguration {
  // Primary glow dimensions (relative to image size)
  baseHeight: number;    // Height of glow spread (0-1)
  baseWidth: number;     // Width of glow spread (0-1)
  
  // Color and blending
  primaryColor: [number, number, number];  // RGB base color
  secondaryColor?: [number, number, number]; // Optional gradient color
  
  // Effect parameters
  layers: number;        // Number of gradient layers (1-5)
  blurRadius: number;    // Base blur radius in pixels
  coreIntensity: number; // Brightness of the fixture core (0-1)
  falloffExponent: number; // How quickly light falls off (1-3)
  
  // Direction (for directional fixtures)
  direction?: 'up' | 'down' | 'omni' | 'spread';
}

/**
 * A complete fixture layout for an image
 */
export interface FixtureLayout {
  id: string;
  imageId: string;          // Reference to the base image
  fixtures: LightFixture[];
  createdAt: string;
  updatedAt: string;
  name?: string;
  notes?: string;
}

/**
 * State for the fixture placement UI
 */
export interface FixturePlacementState {
  fixtures: LightFixture[];
  selectedFixtureId: string | null;
  activeFixtureType: FixtureCategory;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;        // Grid cell size in percentage
}

/**
 * Events emitted by the fixture placer
 */
export interface FixturePlacementEvents {
  onFixtureAdd: (fixture: LightFixture) => void;
  onFixtureUpdate: (id: string, updates: Partial<LightFixture>) => void;
  onFixtureDelete: (id: string) => void;
  onFixtureSelect: (id: string | null) => void;
  onLayoutSave: (layout: FixtureLayout) => void;
}

/**
 * Default presets for each fixture type
 */
export const FIXTURE_PRESETS: FixturePreset[] = [
  {
    type: 'uplight',
    name: 'Uplight',
    description: 'Wall wash and tree uplighting',
    icon: '↑',
    defaultIntensity: 0.8,
    defaultColorTemp: 2700,
    defaultBeamAngle: 35,
    glowConfig: {
      baseHeight: 0.25,
      baseWidth: 0.08,
      primaryColor: [255, 200, 120],
      layers: 4,
      blurRadius: 30,
      coreIntensity: 0.9,
      falloffExponent: 1.5,
      direction: 'up'
    }
  },
  {
    type: 'downlight',
    name: 'Downlight',
    description: 'Soffit and overhead lighting',
    icon: '↓',
    defaultIntensity: 0.7,
    defaultColorTemp: 3000,
    defaultBeamAngle: 45,
    glowConfig: {
      baseHeight: 0.15,
      baseWidth: 0.1,
      primaryColor: [255, 220, 150],
      layers: 3,
      blurRadius: 25,
      coreIntensity: 0.85,
      falloffExponent: 1.8,
      direction: 'down'
    }
  },
  {
    type: 'path_light',
    name: 'Path Light',
    description: 'Walkway and border lighting',
    icon: '◉',
    defaultIntensity: 0.5,
    defaultColorTemp: 2700,
    defaultBeamAngle: 120,
    glowConfig: {
      baseHeight: 0.06,
      baseWidth: 0.06,
      primaryColor: [255, 210, 130],
      layers: 2,
      blurRadius: 20,
      coreIntensity: 0.7,
      falloffExponent: 2.0,
      direction: 'omni'
    }
  },
  {
    type: 'spot',
    name: 'Spotlight',
    description: 'Focused accent lighting',
    icon: '●',
    defaultIntensity: 0.9,
    defaultColorTemp: 3000,
    defaultBeamAngle: 15,
    glowConfig: {
      baseHeight: 0.12,
      baseWidth: 0.04,
      primaryColor: [255, 240, 200],
      layers: 3,
      blurRadius: 15,
      coreIntensity: 0.95,
      falloffExponent: 1.2,
      direction: 'up'
    }
  },
  {
    type: 'wall_wash',
    name: 'Wall Wash',
    description: 'Wide-angle wall illumination',
    icon: '▭',
    defaultIntensity: 0.75,
    defaultColorTemp: 2700,
    defaultBeamAngle: 90,
    glowConfig: {
      baseHeight: 0.2,
      baseWidth: 0.15,
      primaryColor: [255, 195, 110],
      layers: 5,
      blurRadius: 40,
      coreIntensity: 0.8,
      falloffExponent: 1.3,
      direction: 'spread'
    }
  },
  {
    type: 'well_light',
    name: 'Well Light',
    description: 'In-ground flush fixtures',
    icon: '○',
    defaultIntensity: 0.85,
    defaultColorTemp: 3000,
    defaultBeamAngle: 25,
    glowConfig: {
      baseHeight: 0.18,
      baseWidth: 0.05,
      primaryColor: [255, 225, 160],
      layers: 4,
      blurRadius: 25,
      coreIntensity: 0.9,
      falloffExponent: 1.4,
      direction: 'up'
    }
  },
  {
    type: 'bollard',
    name: 'Bollard',
    description: 'Pathway bollard lights',
    icon: '▮',
    defaultIntensity: 0.6,
    defaultColorTemp: 2700,
    defaultBeamAngle: 360,
    glowConfig: {
      baseHeight: 0.08,
      baseWidth: 0.08,
      primaryColor: [255, 210, 135],
      layers: 3,
      blurRadius: 25,
      coreIntensity: 0.75,
      falloffExponent: 1.8,
      direction: 'omni'
    }
  },
  {
    type: 'step_light',
    name: 'Step Light',
    description: 'Stair and step lighting',
    icon: '▬',
    defaultIntensity: 0.4,
    defaultColorTemp: 2700,
    defaultBeamAngle: 150,
    glowConfig: {
      baseHeight: 0.03,
      baseWidth: 0.08,
      primaryColor: [255, 200, 120],
      layers: 2,
      blurRadius: 15,
      coreIntensity: 0.65,
      falloffExponent: 2.2,
      direction: 'down'
    }
  },
  {
    type: 'gutter_uplight',
    name: 'Gutter Light',
    description: 'Gutter-mounted uplight inside channel',
    icon: '⌐',
    defaultIntensity: 0.8,
    defaultColorTemp: 2700,
    defaultBeamAngle: 30,
    glowConfig: {
      baseHeight: 0.20,
      baseWidth: 0.06,
      primaryColor: [255, 210, 130],
      layers: 4,
      blurRadius: 25,
      coreIntensity: 0.85,
      falloffExponent: 1.5,
      direction: 'up'
    }
  }
];

/**
 * Get preset configuration for a fixture type
 */
export function getFixturePreset(type: FixtureCategory): FixturePreset {
  return FIXTURE_PRESETS.find(p => p.type === type) || FIXTURE_PRESETS[0];
}

/**
 * Convert Kelvin to RGB color approximation
 */
export function kelvinToRGB(kelvin: number): [number, number, number] {
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = temp <= 0 ? 0 : 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b)))
  ];
}

/**
 * Generate a unique fixture ID
 */
export function generateFixtureId(): string {
  return `fixture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new fixture with defaults
 */
export function createFixture(
  x: number,
  y: number,
  type: FixtureCategory
): LightFixture {
  const preset = getFixturePreset(type);
  return {
    id: generateFixtureId(),
    x,
    y,
    type,
    intensity: preset.defaultIntensity,
    colorTemp: preset.defaultColorTemp,
    beamAngle: preset.defaultBeamAngle
  };
}
