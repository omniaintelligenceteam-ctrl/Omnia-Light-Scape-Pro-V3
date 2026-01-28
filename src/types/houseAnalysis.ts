/**
 * Enhanced House Analysis Types
 * For AI-powered architectural analysis before fixture placement
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHITECTURAL FEATURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ArchitecturalStyle = 
  | 'modern'
  | 'contemporary'
  | 'traditional'
  | 'colonial'
  | 'craftsman'
  | 'mediterranean'
  | 'spanish'
  | 'tudor'
  | 'farmhouse'
  | 'ranch'
  | 'cape-cod'
  | 'victorian'
  | 'mid-century'
  | 'transitional'
  | 'unknown';

export type FacadeMaterial = 
  | 'brick'
  | 'stone'
  | 'stucco'
  | 'siding-lap'
  | 'siding-board-and-batten'
  | 'siding-shake'
  | 'vinyl'
  | 'wood'
  | 'concrete'
  | 'glass'
  | 'metal'
  | 'mixed';

export type FacadeWidth = 'narrow' | 'medium' | 'wide' | 'extra-wide';

export interface ArchitecturalFeature {
  type: 'gable' | 'dormer' | 'column' | 'pilaster' | 'archway' | 'portico' | 'bay-window' | 'balcony' | 'turret' | 'chimney' | 'shutters' | 'corbels' | 'dentil-molding';
  count: number;
  positions: string[]; // e.g., ["left side", "center peak", "flanking entry"]
  lightingOpportunity: 'high' | 'medium' | 'low';
  suggestedApproach?: string;
}

export interface DetectedMaterial {
  material: FacadeMaterial;
  location: string; // e.g., "main facade", "lower half", "accent areas"
  percentage: number; // 0-100 estimated coverage
  textureLevel: 'smooth' | 'light' | 'moderate' | 'heavy';
  recommendedBeamAngle: number; // Narrower for texture grazing
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEMENT ZONE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlacementZone {
  id: string;
  type: 'optimal' | 'acceptable' | 'avoid';
  description: string;
  /** Position as percentage of image dimensions */
  xPercent: number; // 0-100 from left edge
  yPercent: number; // 0-100 from top edge
  /** Recommended fixture type for this zone */
  suggestedFixture?: string;
  /** Why this zone is suitable/unsuitable */
  reasoning: string;
}

export interface SuggestedFixture {
  fixtureType: string; // 'up', 'path', 'soffit', etc.
  subOption: string; // 'siding', 'windows', 'trees', etc.
  /** Suggested count for this fixture/sub-option combo */
  count: number;
  /** Position percentages for each fixture */
  positions: FixturePosition[];
  /** Spacing recommendation */
  spacing: string;
  /** Why this placement is recommended */
  reasoning: string;
  /** Priority ranking (1 = highest) */
  priority: number;
}

export interface FixturePosition {
  /** Description of position */
  description: string;
  /** X position as percentage of image width (0-100) */
  xPercent: number;
  /** Y position as percentage of image height (0-100) */
  yPercent: number;
  /** What this fixture will illuminate */
  target: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVOID ZONE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AvoidReason = 
  | 'window-glare'
  | 'door-obstruction'
  | 'utility-equipment'
  | 'hardscape-surface'
  | 'hvac-unit'
  | 'meter-box'
  | 'spigot-hose'
  | 'structural-hazard'
  | 'aesthetic-concern';

export interface AvoidZone {
  id: string;
  reason: AvoidReason;
  description: string;
  /** Position as percentage of image dimensions */
  xPercent: number;
  yPercent: number;
  /** Radius of zone to avoid (percentage of image width) */
  radiusPercent: number;
  /** How critical is this avoidance */
  severity: 'critical' | 'important' | 'suggested';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnhancedHouseAnalysis {
  /** Overall architectural style classification */
  style: ArchitecturalStyle;
  
  /** Facade width classification */
  facadeWidth: FacadeWidth;
  
  /** Estimated facade width in feet (if determinable) */
  facadeWidthFeet?: number;
  
  /** Number of stories */
  storyCount: 1 | 2 | 3;
  
  /** Wall height estimate */
  wallHeight: '8-12ft' | '18-25ft' | '25+ft';
  
  /** Detected architectural features */
  architecturalFeatures: ArchitecturalFeature[];
  
  /** Detected materials */
  materials: DetectedMaterial[];
  
  /** Primary material for lighting calculations */
  primaryMaterial: FacadeMaterial;
  
  /** Suggested fixtures based on analysis */
  suggestedFixtures: SuggestedFixture[];
  
  /** Zones to avoid when placing fixtures */
  avoidZones: AvoidZone[];
  
  /** Optimal uplight positions (positions at base of walls/columns/trees) */
  optimalUplightPositions: PlacementZone[];
  
  /** Landscaping analysis */
  landscaping: {
    trees: {
      count: number;
      positions: string[];
      sizes: ('small' | 'medium' | 'large')[];
      uplightCandidates: number; // How many are good for uplighting
    };
    plantingBeds: {
      present: boolean;
      locations: string[];
      fixtureAccessible: boolean; // Can fixtures be placed in beds
    };
  };
  
  /** Hardscape analysis */
  hardscape: {
    driveway: {
      present: boolean;
      width: 'narrow' | 'standard' | 'wide';
      position: 'left' | 'right' | 'center';
      suggestedPathLightCount: number;
    };
    walkway: {
      present: boolean;
      length: 'short' | 'medium' | 'long';
      style: 'straight' | 'curved';
      suggestedPathLightCount: number;
    };
  };
  
  /** Entry analysis */
  entry: {
    type: 'single' | 'double' | 'grand';
    hasOverhang: boolean;
    hasColumns: boolean;
    hasSidelights: boolean;
    suggestedFixtureApproach: string;
  };
  
  /** Windows analysis */
  windows: {
    firstFloorCount: number;
    secondFloorCount: number;
    pattern: 'symmetrical' | 'asymmetrical' | 'irregular';
    positions: string;
  };
  
  /** Lighting style recommendations based on house style */
  lightingApproach: {
    style: 'clean-minimal' | 'warm-welcoming' | 'dramatic-shadow' | 'balanced-traditional' | 'statement-architectural';
    description: string;
    intensityRecommendation: number; // 0-100
    beamAngleRecommendation: number; // 15, 30, 45, 60
    colorTempRecommendation: '2700K' | '3000K' | '4000K';
    reasoning: string;
  };
  
  /** Calculated fixture summary */
  fixtureSummary: {
    totalSuggestedCount: number;
    byType: Record<string, number>;
    estimatedSpacing: string;
    coverageNotes: string;
  };
  
  /** Overall analysis confidence */
  confidence: number; // 0-100
  
  /** Any special notes or warnings */
  notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS PROMPT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LIGHTING_APPROACH_BY_STYLE: Record<ArchitecturalStyle, {
  approach: EnhancedHouseAnalysis['lightingApproach']['style'];
  description: string;
  intensityRange: [number, number];
  beamAngle: number;
}> = {
  'modern': {
    approach: 'clean-minimal',
    description: 'Clean, focused beams highlighting architectural lines. Minimal fixtures, maximum impact.',
    intensityRange: [40, 60],
    beamAngle: 15,
  },
  'contemporary': {
    approach: 'clean-minimal',
    description: 'Strategic lighting emphasizing geometric forms and material contrasts.',
    intensityRange: [45, 65],
    beamAngle: 20,
  },
  'traditional': {
    approach: 'warm-welcoming',
    description: 'Balanced illumination creating an inviting, homey atmosphere.',
    intensityRange: [50, 70],
    beamAngle: 30,
  },
  'colonial': {
    approach: 'balanced-traditional',
    description: 'Symmetrical lighting respecting the formal architecture.',
    intensityRange: [50, 70],
    beamAngle: 30,
  },
  'craftsman': {
    approach: 'warm-welcoming',
    description: 'Warm lighting highlighting natural materials and handcrafted details.',
    intensityRange: [45, 65],
    beamAngle: 25,
  },
  'mediterranean': {
    approach: 'dramatic-shadow',
    description: 'Dramatic uplighting creating bold shadows on textured surfaces.',
    intensityRange: [55, 75],
    beamAngle: 15,
  },
  'spanish': {
    approach: 'dramatic-shadow',
    description: 'Bold shadows emphasizing stucco texture and architectural arches.',
    intensityRange: [55, 75],
    beamAngle: 15,
  },
  'tudor': {
    approach: 'dramatic-shadow',
    description: 'Lighting that emphasizes half-timber details and steep rooflines.',
    intensityRange: [55, 75],
    beamAngle: 20,
  },
  'farmhouse': {
    approach: 'warm-welcoming',
    description: 'Soft, inviting glow emphasizing rustic charm.',
    intensityRange: [40, 60],
    beamAngle: 30,
  },
  'ranch': {
    approach: 'balanced-traditional',
    description: 'Even coverage for long, horizontal facades.',
    intensityRange: [45, 65],
    beamAngle: 30,
  },
  'cape-cod': {
    approach: 'warm-welcoming',
    description: 'Cozy lighting highlighting the cottage-style details.',
    intensityRange: [45, 65],
    beamAngle: 30,
  },
  'victorian': {
    approach: 'statement-architectural',
    description: 'Elaborate lighting showcasing ornate details and trim work.',
    intensityRange: [55, 75],
    beamAngle: 20,
  },
  'mid-century': {
    approach: 'clean-minimal',
    description: 'Subtle lighting respecting the less-is-more philosophy.',
    intensityRange: [35, 55],
    beamAngle: 30,
  },
  'transitional': {
    approach: 'balanced-traditional',
    description: 'Versatile lighting that bridges traditional and contemporary.',
    intensityRange: [45, 65],
    beamAngle: 25,
  },
  'unknown': {
    approach: 'balanced-traditional',
    description: 'Balanced approach suitable for most home styles.',
    intensityRange: [45, 65],
    beamAngle: 30,
  },
};

export const SPACING_BY_FACADE_WIDTH: Record<FacadeWidth, {
  minFixtures: number;
  maxFixtures: number;
  idealSpacing: string;
}> = {
  'narrow': {
    minFixtures: 2,
    maxFixtures: 4,
    idealSpacing: '4-6 feet',
  },
  'medium': {
    minFixtures: 4,
    maxFixtures: 8,
    idealSpacing: '6-8 feet',
  },
  'wide': {
    minFixtures: 6,
    maxFixtures: 12,
    idealSpacing: '6-8 feet',
  },
  'extra-wide': {
    minFixtures: 10,
    maxFixtures: 20,
    idealSpacing: '8-10 feet',
  },
};
