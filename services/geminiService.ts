
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { UserPreferences, PropertyAnalysis, FixtureSelections, LightingPlan, FixturePlacement, SpatialMap, SpatialFixturePlacement } from "../types";
import type { FixtureType, SystemPromptConfig } from "../constants";
import {
  LIGHTING_APPROACH_BY_STYLE,
  SPACING_BY_FACADE_WIDTH,
  BEAM_ANGLE_BY_MATERIAL,
  INTENSITY_BY_WALL_HEIGHT,
  FEATURE_LIGHTING_GUIDELINES,
  ENHANCED_ANALYSIS_SYSTEM_PROMPT,
  FIXTURE_TYPES,
  SYSTEM_PROMPT,
  type ArchitecturalStyleType,
  type FacadeWidthType
} from "../constants";
import type { EnhancedHouseAnalysis, SuggestedFixture } from "../src/types/houseAnalysis";
import { drawFixtureMarkers } from "./canvasNightService";
import { buildReferenceParts } from "./referenceLibrary";
import { paintLightGradients } from "./lightGradientPainter";
import type { LightFixture } from "../types/fixtures";

// Type for validation response
export interface PromptValidationResult {
  valid: boolean;
  fixedPrompt?: string;
  issues?: string[];
  confidence: number; // 0-100
}

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

// Timeout for API calls (2 minutes)
const API_TIMEOUT_MS = 120000;

// Temporary: Hide all soffit references from AI prompts (set to false to restore)
const SOFFIT_HIDDEN = true;

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

/**
 * Retry helper with exponential backoff
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param initialDelayMs - Initial delay in ms before first retry (default: 2000)
 * @returns Result of the function if successful
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      const isRetryable = isTimeout || (error instanceof Error && (
        error.message.includes('503') ||
        error.message.includes('429') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('network')
      ));

      if (attempt < maxAttempts && isRetryable) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Builds a preference context section for the AI prompt
 * This helps the AI maintain consistency with the user's preferred style
 * while still generating unique designs for each property
 */
function buildPreferenceContext(preferences: UserPreferences | null | undefined): string {
  if (!preferences) return '';

  const contextLines: string[] = [];

  // Only include context if user has meaningful feedback history
  const totalFeedback = (preferences.total_liked || 0) + (preferences.total_saved || 0);
  if (totalFeedback < 2) return ''; // Need at least 2 positive signals before applying preferences

  contextLines.push(`
    # USER PREFERENCE CONTEXT
    Apply these learned preferences while keeping each design UNIQUE to this specific property:`);

  // Style preferences from liked/saved designs
  if (preferences.style_keywords && preferences.style_keywords.length > 0) {
    contextLines.push(`    - Design Style: ${preferences.style_keywords.join(', ')}`);
  }

  // Things to avoid from negative feedback
  if (preferences.avoid_keywords && preferences.avoid_keywords.length > 0) {
    contextLines.push(`    - AVOID: ${preferences.avoid_keywords.join(', ')}`);
  }

  // Color temperature preference
  if (preferences.preferred_color_temp) {
    contextLines.push(`    - Color Temperature Preference: ${preferences.preferred_color_temp}`);
  }

  // Intensity preference range
  if (preferences.preferred_intensity_range) {
    const range = preferences.preferred_intensity_range;
    if (range.min !== undefined && range.max !== undefined) {
      contextLines.push(`    - Intensity Preference: ${range.min}% - ${range.max}%`);
    }
  }

  contextLines.push(`
    IMPORTANT: Use these preferences as STYLE GUIDANCE only. Each property is unique -
    the preferences inform your approach and aesthetic, NOT exact fixture placement.
`);

  return contextLines.join('\n');
}

// Analysis model - Gemini 3 Pro for other analysis functions
const ANALYSIS_MODEL_NAME = 'gemini-3-pro-preview';
const ANALYSIS_TIMEOUT_MS = 90000; // 90 seconds for analysis

/**
 * Stage 1: ANALYZING
 * Analyzes property photo AND user's fixture selections to extract architectural details
 */
export const analyzePropertyArchitecture = async (
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>
): Promise<PropertyAnalysis & { spatialMap?: SpatialMap }> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build user's fixture selection summary (from Fixture Summary box)
  const fixtureSelectionSummary = selectedFixtures.length > 0
    ? selectedFixtures.map(f => {
        const subOpts = fixtureSubOptions[f] || [];
        const subOptStr = subOpts.length > 0 ? ` (${subOpts.join(', ')})` : '';
        return `- ${f}${subOptStr}`;
      }).join('\n')
    : '- No fixtures selected';

  // Build DYNAMIC fixture_counts schema from ONLY user's selections
  const fixtureCountsSchema: string[] = [];
  const fixturePositionsSchema: string[] = [];

  selectedFixtures.forEach(fixtureId => {
    const subOpts = fixtureSubOptions[fixtureId] || [];
    subOpts.forEach(subOptId => {
      const key = `${fixtureId}_${subOptId}`;
      const userCount = fixtureCounts[subOptId];
      if (userCount !== null && userCount !== undefined) {
        // User specified exact count - AI must use this
        fixtureCountsSchema.push(`"${key}": ${userCount}`);
      } else {
        // Auto mode - AI recommends based on property features
        fixtureCountsSchema.push(`"${key}": <recommend count based on property>`);
      }
      fixturePositionsSchema.push(`"${key}": ["<position 1>", "<position 2>", "..."]`);
    });
  });

  // Build user's quantity summary (only show user-specified counts)
  const quantitySummary = Object.entries(fixtureCounts)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `- ${k}: EXACTLY ${v} fixtures (do not change)`)
    .join('\n') || '- All set to Auto (AI recommends based on property)';

  const analysisPrompt = `Analyze this property photo for landscape lighting design.

=== USER'S FIXTURE SELECTIONS (from Fixture Summary) ===
${fixtureSelectionSummary}

=== USER'S QUANTITY SETTINGS ===
${quantitySummary}

CRITICAL: Only analyze fixtures the user has selected above. Do NOT suggest additional fixtures.

Analyze the photo and return ONLY a valid JSON object (no markdown, no code blocks, no explanation).

Your analysis should:
1. Identify architecture details relevant to the SELECTED fixtures only
2. For user-specified counts, use EXACTLY that number
3. For auto counts, recommend based on property features
4. Provide placement positions for ONLY the selected fixtures

Return this exact structure:

{
  "architecture": {
    "story_count": <1 or 2 or 3>,
    "wall_height_estimate": "<8-12ft or 18-25ft or 25+ft>",
    "facade_materials": ["<brick, siding, stone, stucco, wood, or vinyl>"],
    "windows": {
      "first_floor_count": <number>,
      "second_floor_count": <number>,
      "positions": "<describe window layout>"
    },
    "columns": { "present": <true/false>, "count": <number> },
    "dormers": { "present": <true/false>, "count": <number> },
    "gables": { "present": <true/false>, "count": <number> },
    "entryway": {
      "type": "<single, double, or grand>",
      "has_overhang": <true/false>
    }
  },
  "landscaping": {
    "trees": {
      "count": <number>,
      "sizes": ["<small, medium, or large>"],
      "positions": "<describe tree locations>"
    },
    "planting_beds": {
      "present": <true/false>,
      "locations": ["<front, sides, foundation, etc>"]
    }
  },
  "hardscape": {
    "driveway": {
      "present": <true/false>,
      "width_estimate": "<narrow, standard, or wide>",
      "position": "<left, right, or center>"
    },
    "walkway": {
      "present": <true/false>,
      "length_estimate": "<short, medium, or long>",
      "style": "<straight or curved>",
      "description": "<describe path>"
    },
    "patio": { "present": <true/false> },
    "sidewalk": { "present": <true/false> }
  },
  "recommendations": {
    "optimal_intensity": "<subtle, moderate, bright, or high_power>",
    "optimal_beam_angle": <15, 30, 45, or 60>,
    "fixture_counts": {
      ${fixtureCountsSchema.length > 0 ? fixtureCountsSchema.join(',\n      ') : '"none": 0'}
    },
    "fixture_positions": {
      ${fixturePositionsSchema.length > 0 ? fixturePositionsSchema.join(',\n      ') : '"none": []'}
    },
    "priority_areas": ["<ordered list based on selected fixtures>"],
    "notes": "<2-3 sentences about placement for the selected fixtures>"
  },
  "spatialMap": {
    "features": [
      {
        "id": "corner_left",
        "type": "corner",
        "horizontalPosition": 0,
        "verticalPosition": 50,
        "label": "Far left corner"
      },
      {
        "id": "window_1",
        "type": "window",
        "horizontalPosition": <0-100 percentage from left>,
        "verticalPosition": <0-100 percentage from top>,
        "width": <percentage width of feature>,
        "label": "<descriptive label like 'First window from left'>"
      }
    ],
    "placements": [
      {
        "id": "<unique_id like 'uplight_1'>",
        "fixtureType": "<fixture category id like 'up', 'path', etc>",
        "subOption": "<sub-option id like 'siding', 'windows', etc>",
        "horizontalPosition": <0-100 percentage from left>,
        "verticalPosition": <0-100 percentage from top>,
        "anchor": "<description like 'right_of corner_left' or 'below window_1'>",
        "description": "<human-readable like 'At far LEFT corner, in landscaping bed'>"
      }
    ]
  }
}

SPATIAL MAPPING INSTRUCTIONS:
1. Map all architectural features (windows, doors, columns, corners, dormers, gables, gutters) with BOTH horizontal (0%=left, 100%=right) AND vertical positions (0%=top, 100%=bottom)
2. For each fixture placement, specify EXACT x,y coordinates as percentages
3. Vertical position guideline: ground-level fixtures ~85-95%, window-level ~40-60%, roofline ~10-20%
4. Create narrative descriptions for each fixture placement

Base your analysis on:
- Wall height determines intensity (taller = brighter)
- Brick/stone needs narrow beam (15-30°) for texture grazing
- Smooth siding works with wider beams (30-45°)
- Walkway spacing: path light every 6-8 feet
- Window up lights: one centered below each first-floor window
- Siding up lights: one in each wall section between windows`;

  // Wrap the API call with retry logic (3 attempts, exponential backoff starting at 2s)
  return withRetry(async () => {
    const analyzePromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: analysisPrompt,
          },
        ],
      },
    });

    const response = await withTimeout(
      analyzePromise,
      ANALYSIS_TIMEOUT_MS,
      'Property analysis timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find((p: { text?: string }) => p.text);
        if (textPart && textPart.text) {
          // Clean up the response - remove any markdown code blocks if present
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const analysis: PropertyAnalysis = JSON.parse(jsonText);
            return analysis;
          } catch (parseError) {
            console.error('Failed to parse analysis JSON:', parseError);
            console.error('Raw response:', textPart.text);
            throw new Error('Failed to parse property analysis. Please try again.');
          }
        }
      }
    }

    throw new Error('No analysis generated. Please try again.');
  }, 3, 2000); // 3 attempts, starting with 2 second delay
};

/**
 * ZONE DETECTION
 * Analyzes property photo and returns clickable zones for fixture placement
 * Each zone represents a logical area (wall section, window group, tree, pathway, etc.)
 */
export interface LightingZone {
  id: string;
  label: string;
  description: string;
  // Bounding box as percentages (0-100)
  bounds: {
    x: number;      // left edge %
    y: number;      // top edge %
    width: number;  // width %
    height: number; // height %
  };
  // What type of feature this zone represents
  featureType: 'wall' | 'window' | 'door' | 'tree' | 'shrub' | 'pathway' | 'driveway' | 'garage' | 'roof' | 'column' | 'other';
  // Recommended fixture types for this zone
  recommendedFixtures: string[];
  // Lighting technique suggestion
  technique: string;
}

export const detectLightingZones = async (
  imageBase64: string,
  imageMimeType: string = 'image/jpeg'
): Promise<LightingZone[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const zonePrompt = `Analyze this property photo and identify distinct zones for landscape lighting placement.

For each zone, provide:
1. A short label (e.g., "Left Wall Section", "Front Windows", "Oak Tree")
2. A description of what's in that zone
3. Bounding box as percentages (x, y, width, height) where 0,0 is top-left
4. The feature type (wall, window, door, tree, shrub, pathway, driveway, garage, roof, column, other)
5. Recommended fixture types (uplight, downlight, path_light, spot, well_light, wall_wash)
6. Suggested lighting technique

CRITICAL RULES:
- Identify 3-12 zones depending on property complexity
- Zones should not overlap significantly
- Each architectural feature or landscape element gets its own zone
- Include wall sections BETWEEN windows as separate zones
- Group similar adjacent windows together
- Trees and large shrubs each get their own zone
- Pathways and driveways are separate zones

Return JSON array:
[
  {
    "id": "zone_1",
    "label": "Left Wall Section",
    "description": "Stucco wall area to the left of the main windows",
    "bounds": { "x": 0, "y": 20, "width": 25, "height": 60 },
    "featureType": "wall",
    "recommendedFixtures": ["uplight", "wall_wash"],
    "technique": "Wall grazing with warm uplights spaced 4-6ft apart"
  },
  ...
]

Only return the JSON array, no other text.`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: ANALYSIS_MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [
            { text: zonePrompt },
            {
              inlineData: {
                mimeType: imageMimeType,
                data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
              }
            }
          ]
        }]
      }),
      ANALYSIS_TIMEOUT_MS,
      'Zone detection timed out'
    );

    const text = response.text?.trim() || '[]';
    
    // Parse JSON, handling potential markdown code blocks
    let jsonStr = text;
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      jsonStr = match ? match[1].trim() : text;
    }
    
    const zones: LightingZone[] = JSON.parse(jsonStr);
    
    // Validate and clean up zones
    return zones.map((zone, idx) => ({
      id: zone.id || `zone_${idx + 1}`,
      label: zone.label || `Zone ${idx + 1}`,
      description: zone.description || '',
      bounds: {
        x: Math.max(0, Math.min(100, zone.bounds?.x || 0)),
        y: Math.max(0, Math.min(100, zone.bounds?.y || 0)),
        width: Math.max(5, Math.min(100, zone.bounds?.width || 20)),
        height: Math.max(5, Math.min(100, zone.bounds?.height || 20)),
      },
      featureType: zone.featureType || 'other',
      recommendedFixtures: zone.recommendedFixtures || ['uplight'],
      technique: zone.technique || ''
    }));
    
  } catch (error) {
    console.error('Zone detection failed:', error);
    // Return a simple fallback grid if detection fails
    return [
      { id: 'zone_left', label: 'Left Section', description: 'Left third of property', bounds: { x: 0, y: 0, width: 33, height: 100 }, featureType: 'wall', recommendedFixtures: ['uplight'], technique: 'Wall lighting' },
      { id: 'zone_center', label: 'Center Section', description: 'Center of property', bounds: { x: 33, y: 0, width: 34, height: 100 }, featureType: 'wall', recommendedFixtures: ['uplight', 'downlight'], technique: 'Feature lighting' },
      { id: 'zone_right', label: 'Right Section', description: 'Right third of property', bounds: { x: 67, y: 0, width: 33, height: 100 }, featureType: 'wall', recommendedFixtures: ['uplight'], technique: 'Wall lighting' },
    ];
  }
};

/**
 * Stage 2: PLANNING
 * Builds lighting plan with exact placements, optimal settings, and validated counts
 */
export const buildLightingPlan = (
  analysis: PropertyAnalysis & { spatialMap?: SpatialMap },
  userSelections: FixtureSelections
): LightingPlan => {
  const { architecture, recommendations } = analysis;

  // Auto-select intensity based on wall height
  let intensity: number;
  switch (architecture.wall_height_estimate) {
    case '25+ft':
      intensity = 85;
      break;
    case '18-25ft':
      intensity = 65;
      break;
    default:
      intensity = 45;
  }

  // Auto-select beam angle based on materials
  const hasTexturedMaterial = architecture.facade_materials.some(
    m => m === 'brick' || m === 'stone'
  );
  const beamAngle = hasTexturedMaterial ? 15 : 30;

  // Build placements for each selected fixture/sub-option
  const placements: FixturePlacement[] = [];

  userSelections.fixtures.forEach(fixtureType => {
    const subOptions = userSelections.subOptions[fixtureType] || [];
    subOptions.forEach(subOption => {
      const key = `${fixtureType}_${subOption}`;
      const recommendedCount = (recommendations.fixture_counts as Record<string, number>)[key] || 0;
      const userCount = userSelections.counts?.[`${fixtureType}-${subOption}`];

      // Use user count if specified, otherwise use AI recommendation
      const count = userCount ?? recommendedCount;

      if (typeof count === 'number' && count > 0) {
        // Get positions from analysis if available
        const positions = (recommendations.fixture_positions as Record<string, string[]>)?.[key] ||
          generateDefaultPositions(fixtureType, subOption, count, analysis);

        // Determine spacing based on fixture type
        const spacing = getSpacingForFixture(fixtureType, subOption);

        // Map spatialMap coordinates to spatialPositions if available
        let spatialPositions: Array<{ x: number; y: number }> | undefined;
        if (analysis.spatialMap) {
          const matchingPlacements = analysis.spatialMap.placements.filter(
            sp => sp.fixtureType === fixtureType && sp.subOption === subOption
          );
          if (matchingPlacements.length > 0) {
            spatialPositions = matchingPlacements.map(sp => ({
              x: sp.horizontalPosition,
              y: sp.verticalPosition
            }));
          }
        }

        // FIX #2: Gutter Y-coordinate enforcement
        // Gutter fixtures MUST be at Y >= 80% (ground level), NOT roof at Y=20-30%
        if (fixtureType === 'gutter' && spatialPositions) {
          const invalidPositions = spatialPositions.filter(sp => sp.y < 80);
          if (invalidPositions.length > 0) {
            console.warn(`[Gutter Fix] ${invalidPositions.length} fixtures at Y < 80% (roof area) - clamping to Y=85%`);
            spatialPositions = spatialPositions.map(sp => ({
              x: sp.x,
              y: sp.y < 80 ? 85 : sp.y // Force ground-level gutter position
            }));
          }
        }

        placements.push({
          fixtureType,
          subOption,
          count,
          positions,
          spacing,
          spatialPositions,
        });
      }
    });
  });

  return {
    placements,
    settings: {
      intensity,
      beamAngle,
      reasoning: `${intensity}% intensity for ${architecture.wall_height_estimate} walls, ${beamAngle}° beam for ${architecture.facade_materials.join('/')} texture`,
    },
    priorityOrder: recommendations.priority_areas,
  };
};

/**
 * Helper: Generate default positions based on fixture type and count
 */
function generateDefaultPositions(
  fixtureType: string,
  subOption: string,
  count: number,
  analysis: PropertyAnalysis
): string[] {
  const positions: string[] = [];

  if (fixtureType === 'up' && subOption === 'siding') {
    for (let i = 1; i <= count; i++) {
      positions.push(`wall section ${i} between windows`);
    }
  } else if (fixtureType === 'up' && subOption === 'windows') {
    for (let i = 1; i <= count; i++) {
      positions.push(`centered below window ${i}`);
    }
  } else if (fixtureType === 'up' && subOption === 'trees') {
    const treeDesc = analysis.landscaping.trees.positions || '';
    for (let i = 1; i <= count; i++) {
      positions.push(`at base of tree ${i}${treeDesc ? ` (${treeDesc})` : ''}`);
    }
  } else if (fixtureType === 'path' && subOption === 'walkway') {
    const walkwayDesc = analysis.hardscape.walkway.description || 'along walkway';
    for (let i = 1; i <= count; i++) {
      positions.push(`${walkwayDesc} - position ${i} of ${count}`);
    }
  } else if (fixtureType === 'path' && subOption === 'driveway') {
    for (let i = 1; i <= count; i++) {
      positions.push(`driveway edge - position ${i}`);
    }
  } else {
    for (let i = 1; i <= count; i++) {
      positions.push(`${subOption} position ${i}`);
    }
  }

  return positions;
}

/**
 * Helper: Get recommended spacing for fixture type
 */
function getSpacingForFixture(fixtureType: string, subOption: string): string {
  if (fixtureType === 'path') {
    return '6-8 feet apart';
  } else if (fixtureType === 'up' && subOption === 'siding') {
    return '8-10 feet apart (between windows)';
  } else if (fixtureType === 'up' && subOption === 'windows') {
    return 'one per window, centered';
  } else if (fixtureType === 'soffit') {
    return '4-6 feet apart';
  } else if (fixtureType === 'gutter') {
    return 'whatever is needed to illuminate target areas';
  }
  return 'as needed for coverage';
}

/**
 * Helper: Get texture description for materials
 */
function hasTextureDescription(materials: string[]): string {
  const descriptions: string[] = [];
  if (materials.includes('brick')) descriptions.push('brick shows mortar joint shadows');
  if (materials.includes('stone')) descriptions.push('stone shows irregular surface texture');
  if (materials.includes('siding')) descriptions.push('siding shows horizontal shadow lines');
  if (materials.includes('stucco')) descriptions.push('stucco shows subtle texture patterns');
  return descriptions.length > 0 ? descriptions.join(', ') : 'smooth surface rendering';
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW AI-POWERED PIPELINE FUNCTIONS (Stages 2-4)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper: Get description of what a fixture type looks like when "dark" (not selected)
 * This helps the AI understand what to render for prohibited fixtures
 */
function getDarkDescription(fixtureId: string): string {
  const descriptions: Record<string, string> = {
    'up': 'Ground areas near foundation remain unlit - NO vertical light beams on walls',
    'path': 'Walkways and paths remain in darkness - NO ground-level path lighting',
    'gutter': '2nd story archutecture and dormers appear as dark silhouette - NO edge illumination',
    'soffit': 'SOFFIT/EAVES MUST BE PITCH BLACK - NO downlights, NO recessed lights, NO illumination from above. Eave undersides are COMPLETELY DARK shadows. The only light on soffits comes from UP LIGHTS reflecting upward - NEVER from fixtures IN the soffit. DO NOT ADD SOFFIT LIGHTS.',
    'hardscape': 'Walls, steps, and retaining walls remain unlit - NO accent lighting',
    'coredrill': 'Ground surfaces remain dark - NO in-ground well lights or markers',
    'holiday': 'Roofline remains dark - NO colored lights, NO string lights, NO RGB illumination',
  };
  return descriptions[fixtureId] || 'This fixture type remains completely dark and unlit';
}

const PLANNING_TIMEOUT_MS = 60000; // 1 minute for planning

/**
 * Stage 2: PLANNING (AI-Powered)
 * Uses AI to create intelligent lighting plan based on property analysis
 * Replaces hardcoded TypeScript logic with contextual AI reasoning
 */
export const planLightingWithAI = async (
  analysis: PropertyAnalysis & { spatialMap?: SpatialMap },
  userSelections: FixtureSelections,
  fixtureTypes: FixtureType[]
): Promise<LightingPlan> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build fixture type descriptions for AI context
  const fixtureDescriptions = fixtureTypes
    .filter(ft => userSelections.fixtures.includes(ft.id))
    .map(ft => {
      const selectedSubOpts = userSelections.subOptions[ft.id] || [];
      const subOptDescriptions = ft.subOptions
        .filter(so => selectedSubOpts.includes(so.id))
        .map(so => `    - ${so.id}: ${so.description}`)
        .join('\n');
      return `- ${ft.id} (${ft.label}): ${ft.description}\n${subOptDescriptions}`;
    })
    .join('\n');

  // Build user count constraints
  const userCountConstraints = Object.entries(userSelections.counts || {})
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `- ${k}: EXACTLY ${v} fixtures (user specified - DO NOT CHANGE)`)
    .join('\n') || '- All counts set to Auto (you decide based on property)';

  // Build user placement notes
  const userPlacementNotes = Object.entries(userSelections.placementNotes || {})
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: "${v}"`)
    .join('\n') || '- No specific placement notes provided';

  const planningPrompt = `You are an expert landscape lighting designer. Based on the property analysis and user's fixture selections, create an optimal lighting plan.

=== PROPERTY ANALYSIS ===
${JSON.stringify(analysis, null, 2)}

=== USER'S SELECTED FIXTURES ===
${fixtureDescriptions}

=== USER'S COUNT CONSTRAINTS ===
${userCountConstraints}

=== USER'S PLACEMENT NOTES (CRITICAL - FOLLOW THESE) ===
${userPlacementNotes}

=== SPATIAL MAP (EXACT POSITIONS) ===
${analysis.spatialMap ? formatSpatialMapForPrompt(analysis.spatialMap) : 'No spatial map available - use property analysis to determine positions'}

IMPORTANT: If the user provided placement notes, use their descriptions as the PRIMARY guide for fixture positions. Their notes override default placement logic.
IMPORTANT: If a spatial map is provided above, USE THE EXACT HORIZONTAL POSITIONS from it for each fixture.

=== YOUR TASK ===
Create a detailed lighting plan with VISUAL ANCHORS for each fixture position.

CRITICAL: Use VISUAL ANCHORS instead of vague descriptions. Research shows AI image generators achieve only ~30% accuracy with counts alone, but ~80% accuracy with specific position anchors.

GOOD position examples (with visual anchors):
- "Far LEFT corner of facade, in landscaping bed"
- "Centered below first-floor window #1"
- "Wall section BETWEEN window 1 and entry door"
- "At base of large oak tree on left side of yard"
- "Far RIGHT corner of facade"

BAD position examples (too vague):
- "On the siding"
- "Near the windows"
- "Along the walkway"

INTENSITY based on wall height:
- 8-12ft walls: 40-50%
- 18-25ft walls: 60-70%
- 25+ft walls: 80-90%

BEAM ANGLE (DEFAULT TO NARROW FOR DRAMATIC CONTRAST):
- ALL materials: 15-25° (narrow for dramatic contrast and texture grazing)
- Creates DISTINCT light pools with DARK GAPS between fixtures
- Wider angles (45-60°) create flat, uniform wash - AVOID for professional look
- The goal is dramatic interplay of light and shadow, NOT uniform illumination

Return ONLY a valid JSON object (no markdown, no code blocks):

{
  "placements": [
    {
      "fixtureType": "<fixture id>",
      "subOption": "<sub-option id>",
      "count": <number>,
      "positions": ["<fallback text description 1>", "<fallback text description 2>", "..."],
      "spatialPositions": [
        {"x": <0-100 percentage from left>, "y": <0-100 percentage from top>},
        {"x": <0-100>, "y": <0-100>},
        ...
      ],
      "spacing": "<spacing description>"
    }
  ],
  "settings": {
    "intensity": <number 0-100>,
    "beamAngle": <15 or 20 for dramatic contrast - AVOID 45/60>,
    "reasoning": "<1-2 sentences explaining your choices>"
  },
  "priorityOrder": ["<most important area>", "<second>", "..."]
}

CRITICAL: spatialPositions array MUST have the same length as count. Use EXACT x,y percentage coordinates from the spatial map. Ground-level fixtures: y~85-95%, window-level: y~40-60%, roofline: y~10-20%.

CRITICAL RULES:
- positions array MUST have EXACTLY the same length as count (e.g., 6 count = 6 positions)
- EVERY position MUST reference a specific architectural feature or location
- Use ordinal references: "window 1", "window 2", "tree on left", "corner of facade"
- User-specified counts are NON-NEGOTIABLE
- ONLY include fixtures for sub-options the user selected - NO OTHERS`;

  try {
    const planPromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [{ text: planningPrompt }],
      },
    });

    const response = await withTimeout(
      planPromise,
      PLANNING_TIMEOUT_MS,
      'Lighting plan generation timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const plan: LightingPlan = JSON.parse(jsonText);
            console.log('✓ AI Lighting Plan generated:', plan);

            // Map spatialMap coordinates (horizontalPosition/verticalPosition) to spatialPositions (x/y)
            if (analysis.spatialMap && analysis.spatialMap.placements.length > 0) {
              plan.placements = plan.placements.map(placement => {
                // Find matching placements from spatialMap
                const matchingPlacements = analysis.spatialMap!.placements.filter(
                  sp => sp.fixtureType === placement.fixtureType && sp.subOption === placement.subOption
                );

                if (matchingPlacements.length > 0) {
                  // Map horizontalPosition/verticalPosition → x/y
                  placement.spatialPositions = matchingPlacements.map(sp => ({
                    x: sp.horizontalPosition,
                    y: sp.verticalPosition
                  }));
                  console.log(`✓ Mapped ${matchingPlacements.length} coordinates for ${placement.fixtureType}/${placement.subOption}`);
                }
                return placement;
              });
            }

            return plan;
          } catch (parseError) {
            console.error('Failed to parse lighting plan JSON:', parseError);
            console.error('Raw response:', textPart.text);
            // Fallback to legacy function
            console.warn('Falling back to legacy planning function');
            return buildLightingPlan(analysis, userSelections);
          }
        }
      }
    }

    // Fallback to legacy function
    console.warn('No AI plan generated, falling back to legacy function');
    return buildLightingPlan(analysis, userSelections);
  } catch (error) {
    console.error('AI Planning Error:', error);
    // Fallback to legacy function
    console.warn('Falling back to legacy planning function due to error');
    return buildLightingPlan(analysis, userSelections);
  }
};

const PROMPTING_TIMEOUT_MS = 60000; // 1 minute for prompt crafting

/**
 * Stage 3: PROMPTING (AI-Powered)
 * Uses AI to craft the optimal prompt for the image generation model
 * Replaces simple string concatenation with intelligent prompt engineering
 */
export const craftPromptWithAI = async (
  analysis: PropertyAnalysis & { spatialMap?: SpatialMap },
  plan: LightingPlan,
  systemPrompt: SystemPromptConfig,
  fixtureTypes: FixtureType[],
  colorTemp: string,
  userPreferences?: UserPreferences | null,
  placementNotes?: Record<string, string>
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Get selected fixture types and sub-options
  const selectedFixtureIds = [...new Set(plan.placements.map(p => p.fixtureType))];

  // Build ALLOWLIST - fixtures that ARE selected
  const allowlistItems = plan.placements.map(placement => {
    const fixtureType = fixtureTypes.find(ft => ft.id === placement.fixtureType);
    const subOption = fixtureType?.subOptions.find(so => so.id === placement.subOption);
    const userNote = placementNotes?.[placement.subOption] || '';

    // Add visual description for gutter fixtures — effect-only, no hardware descriptions
    const gutterVisualDescription = placement.fixtureType === 'gutter' ? `

WASH-UP▲ LIGHT — INVISIBLE FIXTURE, EFFECT ONLY (CRITICAL):
- FIXTURE: COMPLETELY INVISIBLE — hidden inside the gutter trough. Do NOT draw ANY fixture, bracket, sconce, or hardware.
- LIGHT EFFECT: A soft, wide WASH of warm light appears on the 2nd story wall DIRECTLY ABOVE the fixture position. The wall glows warmly, revealing texture.
- BEAM DIRECTION: UPWARD ONLY — light illuminates ONLY the wall ABOVE the fixture. ABSOLUTELY ZERO light below the mounting point — surface below must remain DARK.
- BEAM REACH: Light washes ALL THE WAY UP from the mounting point to the peak/gable above.

VISUAL TEST:
- CORRECT: Wall ABOVE the marker glows warmly with a soft wash — NO fixture visible
- CORRECT: Two warm washes flanking a peak, illuminating the full gable
- WRONG: Visible sconce or wall-mounted fixture (WASH-UP▲ = INVISIBLE fixture)
- WRONG: Light going both up AND down (sconce behavior — WASH-UP▲ = UP ONLY)
- WRONG: Any downward light or recessed ceiling light from eaves (WASH-UP▲ = UPWARD, never down)
- WRONG: Fixture sitting on roof shingles or mounted on wall face` : '';

    return {
      fixture: placement.fixtureType,
      fixtureLabel: fixtureType?.label || placement.fixtureType,
      subOption: placement.subOption,
      subOptionLabel: subOption?.label || placement.subOption,
      count: placement.count,
      positions: placement.positions,
      spatialPositions: placement.spatialPositions,  // Include spatial coordinates if available
      positivePrompt: (subOption?.prompt || fixtureType?.positivePrompt || '') + gutterVisualDescription,
      userPlacementNote: userNote,
    };
  });

  // Build PROHIBITION list - fixtures that are NOT selected
  const prohibitedFixtures = fixtureTypes
    .filter(ft => !selectedFixtureIds.includes(ft.id))
    .map(ft => ({
      id: ft.id,
      label: ft.label,
      darkDescription: getDarkDescription(ft.id), // How this looks when "off"
    }));

  // Build SUBOPTION-LEVEL PROHIBITION - non-selected suboptions within SELECTED fixture types
  const subOptionProhibitions: { fixtureLabel: string; subOptionLabel: string; darkDescription: string }[] = [];

  selectedFixtureIds.forEach(fixtureId => {
    const fixtureType = fixtureTypes.find(ft => ft.id === fixtureId);
    if (fixtureType && fixtureType.subOptions) {
      // Get list of selected suboption IDs for this fixture
      const selectedSubIds = plan.placements
        .filter(p => p.fixtureType === fixtureId)
        .map(p => p.subOption);

      // Find non-selected suboptions for this fixture type
      fixtureType.subOptions
        .filter(so => !selectedSubIds.includes(so.id))
        .forEach(so => {
          subOptionProhibitions.push({
            fixtureLabel: fixtureType.label,
            subOptionLabel: so.label,
            darkDescription: so.darkDescription || `${so.label} must remain completely dark - no fixtures placed for this target`,
          });
        });
    }
  });

  // ALWAYS add explicit soffit prohibition unless soffit is selected (skip if SOFFIT_HIDDEN)
  const soffitSelected = selectedFixtureIds.includes('soffit');
  const explicitSoffitProhibition = SOFFIT_HIDDEN ? '' : (soffitSelected ? '' : `
## SOFFIT LIGHTS - ABSOLUTE PROHIBITION (CRITICAL)
SOFFIT LIGHTS ARE NOT SELECTED. The following is MANDATORY:
- ZERO fixtures in soffits or eaves
- Eave undersides remain PITCH BLACK
- NO downlights, NO recessed lights, NO can lights in eaves
- Any soffit "glow" is ONLY from up lights reflecting upward - NOT from fixtures IN the soffit
- Do NOT add soffit lights "for realism" or "to complete the design"
- UP LIGHTS shine UP. SOFFIT LIGHTS shine DOWN. They are OPPOSITES.
- If you see "soffit reach" or "soffit glow" that means REFLECTED light from UP LIGHTS, NOT soffit fixtures
`);

  // When GUTTER is selected, add extra-strong soffit prohibition to prevent confusion (skip if SOFFIT_HIDDEN)
  const gutterSelected = selectedFixtureIds.includes('gutter');
  const gutterSoffitClarification = SOFFIT_HIDDEN ? '' : (gutterSelected ? `

## WASH-UP▲ UPLIGHTS vs SCONCES vs SOFFIT LIGHTS - CRITICAL DISTINCTION
YOU HAVE SELECTED: WASH-UP▲ UPLIGHTS (INVISIBLE fixtures, warm wash on wall ABOVE only)
YOU HAVE NOT SELECTED: SCONCES or SOFFIT LIGHTS

*** THESE ARE THREE DIFFERENT THINGS — DO NOT CONFUSE THEM ***

WASH-UP▲ UPLIGHTS (SELECTED - GENERATE THESE):
- Fixture Visibility: COMPLETELY INVISIBLE — do NOT draw any fixture hardware
- Light Effect: Soft warm WASH on the 2nd story wall ABOVE the marker position
- Beam Direction: UPWARD ONLY — ZERO light below the marker
- The wall above GLOWS warmly, revealing texture. No visible fixture at all.

SCONCES (NOT SELECTED - FORBIDDEN):
- Visible wall-mounted fixture with light going BOTH up AND down
- If your render shows a visible fixture with bidirectional light = WRONG (sconce)

SOFFIT LIGHTS (NOT SELECTED - FORBIDDEN):
- Recessed IN the soffit/eave underside, beam DOWNWARD
- If your render shows downward light from eaves = WRONG (soffit)

VISUAL TEST:
- CORRECT: Wall ABOVE the marker glows warmly — NO visible fixture
- WRONG: Visible fixture at the marker position (you made a sconce)
- WRONG: Light going both up AND down (you made a sconce)
- WRONG: Light going DOWN from the eaves (you made a soffit light)

SOFFIT MUST REMAIN DARK:
- Eave undersides remain pitch black
- NO downlights, NO can lights, NO recessed fixtures in eaves
- Any soffit glow is ONLY reflected ambient light from upward washes hitting walls above
` : '');

  // Build preference context
  const preferenceContext = userPreferences ? `
User has these preferences from past feedback:
- Style keywords: ${userPreferences.style_keywords?.join(', ') || 'none'}
- Avoid: ${userPreferences.avoid_keywords?.join(', ') || 'none'}
- Preferred intensity: ${userPreferences.preferred_intensity_range?.min || 30}-${userPreferences.preferred_intensity_range?.max || 70}%
` : '';

  const craftingPrompt = `You are an expert at writing prompts for AI image generation. Your task is to craft a prompt for generating a nighttime landscape lighting image with STRICT FIXTURE CONTROL.

CRITICAL RESEARCH FINDINGS (you MUST apply these):
1. Use ALL CAPS for critical rules - research shows Gemini follows caps better
2. Use markdown dashed lists for rules - Gemini follows structured lists better
3. Include explicit ALLOWLIST of fixtures that MAY appear
4. Include explicit PROHIBITION list of fixtures that MUST NOT appear
5. For prohibited fixtures, describe what "DARK" looks like
6. For fixture counts, list EACH position individually with visual anchors
7. Add VALIDATION language at the end with consequences
8. Include DRAMATIC CONTRAST section for realistic professional lighting

=== LIGHTING STYLE REQUIREMENT (CRITICAL FOR REALISM) ===
The final prompt MUST include a section titled "## LIGHTING STYLE - DRAMATIC CONTRAST" with:
1. NARROW BEAM specification (15-30° tight spots, not wide flood)
2. DARK GAPS requirement (intentional unlit areas between fixtures)
3. INVERSE SQUARE LAW (brightness = 1/distance², creates natural falloff)
4. SOFT BEAM EDGES (feathered 6-12 inch transition, never crisp circles)
5. ISOLATED LIGHT POOLS (each fixture's zone is distinct, not blending)
6. TEXTURE GRAZING (narrow angle reveals brick/stone/siding texture)

The lighting must look PROFESSIONAL with dramatic interplay of light and shadow.
Uniform wall wash = WRONG. Distinct pools with dark gaps = CORRECT.

=== PROPERTY CONTEXT ===
${JSON.stringify(analysis, null, 2)}

=== EXCLUSIVE FIXTURE ALLOWLIST (Only these may appear) ===
${(() => {
  // Log coordinate data for verification
  console.log('=== CRAFTING PROMPT - FIXTURE COORDINATES ===');
  allowlistItems.forEach(item => {
    if (item.spatialPositions && item.spatialPositions.length > 0) {
      console.log(`${item.fixtureLabel}/${item.subOptionLabel} (${item.count} fixtures):`);
      item.spatialPositions.forEach((sp, i) => {
        console.log(`  FIXTURE ${i + 1}: [${sp.x?.toFixed(1) ?? '?'}%, ${sp.y?.toFixed(1) ?? '?'}%]`);
      });
    } else {
      console.log(`${item.fixtureLabel}/${item.subOptionLabel}: NO SPATIAL COORDS - using text positions:`, item.positions);
    }
  });
  console.log('===========================================');
  return '';
})()}
${allowlistItems.map(item => `
- ${item.fixtureLabel.toUpperCase()} / ${item.subOptionLabel.toUpperCase()}:
  - Count: ${item.count} fixtures
  - Positions: ${item.spatialPositions && item.spatialPositions.length > 0
      ? item.spatialPositions.map((sp, i) => `FIXTURE ${i + 1}: Place at [${sp.x?.toFixed(1) ?? '?'}%, ${sp.y?.toFixed(1) ?? '?'}%]`).join('; ')
      : item.positions.map((pos, i) => `FIXTURE ${i + 1}: ${pos}`).join('; ')}
  - Instructions: ${item.positivePrompt}${item.userPlacementNote ? `
  - USER NOTE (PRIORITY): "${item.userPlacementNote}"` : ''}
`).join('\n')}

=== ABSOLUTE PROHIBITION LIST (These MUST remain DARK) ===
${prohibitedFixtures.map(pf => `
- ${pf.label.toUpperCase()}: ${pf.darkDescription}
`).join('\n')}

=== SUBOPTION-LEVEL PROHIBITION (CRITICAL - Non-selected targets within selected fixture types) ===
${subOptionProhibitions.length > 0 ? `
The following SPECIFIC TARGETS are NOT selected and MUST remain DARK even though their parent fixture type is enabled:
${subOptionProhibitions.map(sp => `
- ${sp.fixtureLabel.toUpperCase()} / ${sp.subOptionLabel.toUpperCase()}: ${sp.darkDescription}
`).join('\n')}
*** CRITICAL: Only the ALLOWLIST suboptions above receive fixtures. All other suboptions within selected fixture types MUST remain completely unlit. ***
` : '(All suboptions within selected fixtures are enabled)'}
${explicitSoffitProhibition}
${gutterSoffitClarification}
=== MASTER PRESERVATION RULES ===
${systemPrompt.masterInstruction}

=== COLOR TEMPERATURE ===
${colorTemp}

${preferenceContext}

=== YOUR TASK ===
Craft a prompt with this EXACT structure:

## EXCLUSIVE FIXTURE ALLOWLIST
ONLY the following fixture types may appear in this image:
- [List each selected fixture with description]

## ABSOLUTE PROHIBITION - MUST REMAIN DARK
The following fixtures are FORBIDDEN:
- [List each non-selected fixture with description of how it looks when dark/off]

## SUBOPTION-LEVEL PROHIBITION (Non-selected targets within enabled fixture types)
Within selected fixture types, ONLY the specified suboptions receive lights:
- [List each non-selected suboption with its dark description]

## LIGHTING STYLE - DRAMATIC CONTRAST (CRITICAL FOR REALISM)
BEAM ANGLE: 15-25° (narrow spot for texture grazing, NOT wide flood)
DARK GAPS: Intentional unlit areas MUST exist between each fixture's illumination zone
LIGHT PHYSICS: Inverse square law - brightness = 1/(distance squared), rapid falloff
BEAM EDGES: Soft, feathered transition (6-12 inches), NEVER crisp circles
EFFECT: Each fixture creates an ISOLATED conical wash of light
TEXTURE: Narrow angle reveals brick mortar joints / stone texture / siding lines
SEPARATION: Light pools do NOT blend together - visible dark wall sections between

WHAT TO AVOID:
- Uniform brightness across entire wall (looks flat/fake)
- Light pools that blend into continuous wash
- Crisp, hard-edged circular light boundaries
- Fill light that softens shadows between fixtures

VALIDATION: Fixtures MUST have VISIBLE DARK GAPS between them.
Uniform wall wash = INVALID. Distinct pools with shadows = VALID.

## EXACT FIXTURE PLACEMENTS
For each selected fixture type, list:
### [Fixture Type] - [Count] FIXTURES TOTAL
FIXTURE 1: [Exact position with visual anchor]
FIXTURE 2: [Exact position with visual anchor]
...

## SCENE PRESERVATION
[Property and composition rules]

## VALIDATION
CRITICAL: Before finalizing, verify:
- ONLY fixtures from ALLOWLIST appear
- Fixture counts match EXACTLY
- All PROHIBITED fixtures remain completely dark
- DARK GAPS visible between each fixture's light pool
Any violation = INVALID IMAGE

Return ONLY the final prompt text (no JSON, no code blocks).
Use ALL CAPS for critical rules. Use markdown dashed lists.`;

  try {
    const craftPromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [{ text: craftingPrompt }],
      },
    });

    const response = await withTimeout(
      craftPromise,
      PROMPTING_TIMEOUT_MS,
      'Prompt crafting timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          const craftedPrompt = textPart.text.trim();
          console.log('✓ AI-crafted prompt generated (length:', craftedPrompt.length, 'chars)');
          return craftedPrompt;
        }
      }
    }

    // Fallback to legacy function
    console.warn('No AI prompt generated, falling back to legacy function');
    return buildFinalPrompt(analysis, plan, colorTemp, userPreferences);
  } catch (error) {
    console.error('AI Prompt Crafting Error:', error);
    console.warn('Falling back to legacy prompt function due to error');
    return buildFinalPrompt(analysis, plan, colorTemp, userPreferences);
  }
};

const VALIDATION_TIMEOUT_MS = 45000; // 45 seconds for validation

/**
 * Stage 4: VALIDATING (AI-Powered) - NEW STAGE
 * Reviews the final prompt before sending to image generation
 * Catches contradictions, unclear instructions, and potential hallucination triggers
 */
export const validatePrompt = async (
  finalPrompt: string,
  analysis: PropertyAnalysis,
  plan: LightingPlan
): Promise<PromptValidationResult> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Extract expected fixture types from plan
  const expectedFixtureTypes = [...new Set(plan.placements.map(p => p.fixtureType))];
  const expectedCounts = plan.placements.map(p => ({
    type: p.fixtureType,
    subOption: p.subOption,
    count: p.count,
    positionsCount: p.positions?.length || 0,
    spatialPositionsCount: p.spatialPositions?.length || 0,
  }));

  // PRE-CHECK: Position count must match fixture count
  const positionMismatches: string[] = [];
  expectedCounts.forEach(c => {
    // Check text positions
    if (c.positionsCount !== c.count && c.spatialPositionsCount === 0) {
      positionMismatches.push(
        `Position/count mismatch for ${c.type}/${c.subOption}: ${c.count} fixtures requested but ${c.positionsCount} positions specified`
      );
    }
    // Check spatial positions if available
    if (c.spatialPositionsCount > 0 && c.spatialPositionsCount !== c.count) {
      positionMismatches.push(
        `Coordinate/count mismatch for ${c.type}/${c.subOption}: ${c.count} fixtures but ${c.spatialPositionsCount} coordinates`
      );
    }
  });

  // If there are position mismatches, return invalid immediately (don't waste API call)
  if (positionMismatches.length > 0) {
    console.warn('Position count validation failed:', positionMismatches);
    return {
      valid: false,
      confidence: 0,
      issues: positionMismatches,
    };
  }

  const validationPrompt = `You are a quality assurance expert for AI image generation prompts. Your job is to catch issues that could cause the AI to generate wrong fixtures or wrong counts.

=== PROMPT TO VALIDATE ===
${finalPrompt}

=== PROPERTY CONTEXT ===
Windows: ${analysis.architecture?.windows?.first_floor_count || 'unknown'} first floor, ${analysis.architecture?.windows?.second_floor_count || 0} second floor
Trees: ${analysis.landscaping?.trees?.count || 'unknown'}
Wall height: ${analysis.architecture?.wall_height_estimate || 'unknown'}

=== EXPECTED LIGHTING PLAN ===
Selected fixture types: ${expectedFixtureTypes.join(', ')}
Expected counts:
${expectedCounts.map(c => `- ${c.type}/${c.subOption}: ${c.count} fixtures (${c.positionsCount} positions listed)`).join('\n')}

=== VALIDATION CHECKLIST ===

## CRITICAL CHECK 1: FIXTURE TYPE CONTROL
- Does the prompt have an ALLOWLIST section listing ONLY these fixture types: ${expectedFixtureTypes.join(', ')}?
- Does the prompt have a PROHIBITION section for fixture types NOT in the plan?
- Are prohibited fixtures described as "dark", "unlit", "no illumination"?
- FAIL if: The prompt mentions placing fixtures that are NOT in the allowlist

## CRITICAL CHECK 2: FIXTURE COUNT ACCURACY
For each fixture type, verify:
${expectedCounts.map(c => `- ${c.type}/${c.subOption}: Does prompt specify EXACTLY ${c.count} fixtures with ${c.count} individual position descriptions?`).join('\n')}
- FAIL if: Count number doesn't match number of position descriptions
- FAIL if: Positions are vague (e.g., "along the wall" instead of "between window 1 and window 2")

## CHECK 3: VISUAL ANCHORS
- Does each fixture position reference a specific architectural feature?
- Good: "centered below window 1", "far left corner of facade", "between entry door and window 2"
- Bad: "on the siding", "near the windows", "along the walkway"

## CHECK 4: STRUCTURE
- Does the prompt use ALL CAPS for critical rules?
- Does the prompt use markdown dashed lists for rules?
- Is there a VALIDATION section at the end?

## CRITICAL CHECK 4.5: SUBOPTION-LEVEL PROHIBITION (NEW)
For each selected fixture type, verify that NON-SELECTED suboptions are explicitly prohibited:
- Selected fixture types: ${expectedFixtureTypes.join(', ')}
- Selected suboptions: ${expectedCounts.map(c => `${c.type}/${c.subOption}`).join(', ')}
- Look for "SUBOPTION-LEVEL PROHIBITION" section in the prompt
- Each non-selected suboption within a selected fixture type should have a "dark description"
- FAIL if: A fixture type is selected but non-selected suboptions within it have no prohibition
- Example: If UP LIGHTS is selected with only "siding" suboption, then "windows", "columns", "trees", "entryway" must be explicitly prohibited

${SOFFIT_HIDDEN ? '' : `## CRITICAL CHECK 5: SOFFIT PROHIBITION (MOST COMMON ERROR)
${!expectedFixtureTypes.includes('soffit') ? `
- SOFFIT IS NOT IN THE SELECTED FIXTURES - this is a CRITICAL check
- Verify the prompt explicitly PROHIBITS soffit lights/downlights
- Look for phrases like: "soffit must remain dark", "no downlights", "eaves pitch black"
- FAIL if: The prompt mentions soffit lighting without explicit prohibition
- FAIL if: The prompt says "soffit glow" without clarifying it's REFLECTED light from up lights
- This is the MOST COMMON hallucination error - be extra strict here
` : '- Soffit IS selected, so soffit lights are allowed'}`}

## CRITICAL CHECK 6: GUTTER PLACEMENT (MOST CRITICAL FOR GUTTER LIGHTS)
${expectedFixtureTypes.includes('gutter') ? `
- GUTTER LIGHTS ARE SELECTED - verify fixtures are INSIDE THE GUTTER TROUGH

CORRECT PLACEMENT (REQUIRED):
- Fixtures described as "inside gutter trough" or "in the gutter channel"
- Fixtures against "inner gutter wall" or "inside the U-channel"
- Fixtures partially hidden by gutter walls
- Beam direction is UPWARD toward targets

INCORRECT PLACEMENT (FAIL THE VALIDATION):
- Fixtures "on the roof" or "on roof surface" - FAIL
- Fixtures "on shingles" or "on roofing material" - FAIL
- Fixtures "on gutter lip" or "on gutter edge" - FAIL
- Fixtures prominently visible on roofline - FAIL
- Fixtures on fascia board - FAIL

${SOFFIT_HIDDEN ? '' : `ALSO CHECK SOFFIT DISTINCTION:
- Gutter lights are UP LIGHTS (shine upward) - NOT soffit lights (shine down)
- FAIL if: prompt describes downward beams when gutter lights are selected
- FAIL if: fixtures described as in soffit/eave instead of in gutter
- FAIL if: "soffit" appears without explicit prohibition/dark description`}
` : '- Gutter is NOT selected, skip this check'}

Return ONLY a valid JSON object:

{
  "valid": <true if passes all critical checks, false otherwise>,
  "confidence": <0-100 score>,
  "issues": ["<specific issue 1>", "<specific issue 2>", "..."],
  "fixedPrompt": "<corrected prompt if issues found, otherwise null>"
}

Be STRICT about fixture type control and count accuracy. These are the most important checks.`;

  try {
    const validatePromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [{ text: validationPrompt }],
      },
    });

    const response = await withTimeout(
      validatePromise,
      VALIDATION_TIMEOUT_MS,
      'Prompt validation timed out.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const result: PromptValidationResult = JSON.parse(jsonText);
            console.log('✓ Prompt validation complete:', {
              valid: result.valid,
              confidence: result.confidence,
              issueCount: result.issues?.length || 0,
            });

            if (result.issues && result.issues.length > 0) {
              console.warn('Validation issues found:', result.issues);
            }

            return result;
          } catch (parseError) {
            console.error('Failed to parse validation JSON:', parseError);
            // Return INVALID - prompt may be malformed
            return { valid: false, confidence: 0, issues: ['Validation response parse error - prompt may be malformed'] };
          }
        }
      }
    }

    // No response = INVALID - validation could not be performed
    return { valid: false, confidence: 0, issues: ['No validation response from AI'] };
  } catch (error) {
    console.error('Prompt Validation Error:', error);
    // Validation error = INVALID - something is wrong
    return { valid: false, confidence: 0, issues: ['Validation error: ' + (error instanceof Error ? error.message : 'Unknown error')] };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY FUNCTIONS (Kept for fallback)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stage 3: PROMPTING (LEGACY)
 * Creates the perfect final prompt by combining analysis, plan, and user preferences
 */
export const buildFinalPrompt = (
  analysis: PropertyAnalysis & { spatialMap?: SpatialMap },
  plan: LightingPlan,
  colorTemp: string,
  userPreferences?: UserPreferences | null
): string => {
  const { architecture, landscaping, hardscape, recommendations } = analysis;

  // Log coordinate data for verification (LEGACY FALLBACK)
  console.log('=== BUILD FINAL PROMPT (LEGACY) - FIXTURE COORDINATES ===');
  plan.placements.forEach(p => {
    if (p.spatialPositions && p.spatialPositions.length > 0) {
      console.log(`${p.fixtureType}/${p.subOption} (${p.count} fixtures):`);
      p.spatialPositions.forEach((sp, i) => {
        console.log(`  FIXTURE ${i + 1}: [${sp.x?.toFixed(1) ?? '?'}%, ${sp.y?.toFixed(1) ?? '?'}%]`);
      });
    } else {
      console.log(`${p.fixtureType}/${p.subOption}: NO SPATIAL COORDS - using text positions:`, p.positions);
    }
  });
  console.log('=========================================================');

  // Build placement instructions with exact x,y coordinates when available
  const placementInstructions = plan.placements.map(p => {
    const positions = p.spatialPositions && p.spatialPositions.length > 0
      ? p.spatialPositions.map((sp, i) => `FIXTURE ${i + 1}: Place at [${sp.x?.toFixed(1) ?? '?'}%, ${sp.y?.toFixed(1) ?? '?'}%]`).join('\n  ')
      : p.positions.join('; ');

    return `
## ${(p.fixtureType || 'UNKNOWN').toUpperCase()} LIGHTS - ${(p.subOption || 'general').toUpperCase()}
- Quantity: Place EXACTLY ${p.count} fixtures
- Positions:
  ${positions}
- Spacing: ${p.spacing}
`;
  }).join('\n');

  // Build preference context if available
  const preferenceContext = buildPreferenceContext(userPreferences);

  return `
# PROPERTY-SPECIFIC CONTEXT (From AI Analysis)
This is a ${architecture.story_count}-story ${architecture.facade_materials.join('/')} home.
- Wall Height: ${architecture.wall_height_estimate}
- Windows: ${architecture.windows.first_floor_count} first floor${architecture.windows.second_floor_count > 0 ? `, ${architecture.windows.second_floor_count} second floor` : ''} - ${architecture.windows.positions}
- Columns: ${architecture.columns.present ? `${architecture.columns.count} columns` : 'none'}
- Entryway: ${architecture.entryway.type} door${architecture.entryway.has_overhang ? ' with overhang' : ''}
- Trees: ${landscaping.trees.count > 0 ? `${landscaping.trees.count} (${landscaping.trees.sizes.join(', ')})` : 'none significant'}
- Walkway: ${hardscape.walkway.present ? `${hardscape.walkway.length_estimate} ${hardscape.walkway.style} path` : 'none visible'}

# EXACT FIXTURE PLACEMENTS (Follow precisely!)
${placementInstructions}

# OPTIMIZED LIGHTING SETTINGS
- Intensity: ${plan.settings.intensity}% - ${plan.settings.reasoning}
- Beam Angle: ${plan.settings.beamAngle}°
- Color Temperature: ${colorTemp}

# SHADOW REALISM FOR THIS PROPERTY
Based on ${architecture.wall_height_estimate} walls:
- Light must travel full height (${architecture.story_count === 1 ? '8-12ft' : architecture.story_count === 2 ? '18-25ft' : '25+ft'}) to the roofline
- Intensity falloff: gradual dimming over full wall height
- Between fixtures: GRADUAL TRANSITION shadows (NOT uniform darkness)
- Ambient scatter: soft glow extends 2-3 feet beyond beam edge
- Material rendering: ${hasTextureDescription(architecture.facade_materials)}

# PRIORITY ORDER
Light these areas first: ${plan.priorityOrder.join(' → ')}

# AI RECOMMENDATIONS
${recommendations.notes}
${preferenceContext}
`;
};

/**
 * Validates that all fixture placements have valid coordinates before image generation.
 * Throws an error if coordinates are missing or invalid.
 */
export function validateCoordinatesBeforeGeneration(plan: LightingPlan): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  plan.placements.forEach(p => {
    if (!p.spatialPositions || p.spatialPositions.length === 0) {
      // Missing coordinates is an ERROR - we need exact positions
      errors.push(`${p.fixtureType}/${p.subOption}: no spatial coordinates provided (expected ${p.count})`);
    } else if (p.spatialPositions.length !== p.count) {
      // Count mismatch is an ERROR
      errors.push(`${p.fixtureType}/${p.subOption}: coordinate count mismatch - expected ${p.count}, got ${p.spatialPositions.length}`);
    } else {
      // Validate coordinate values are in range
      p.spatialPositions.forEach((sp, i) => {
        if (typeof sp.x !== 'number' || typeof sp.y !== 'number') {
          errors.push(`${p.fixtureType}/${p.subOption} fixture ${i + 1}: invalid coordinate type (x=${typeof sp.x}, y=${typeof sp.y})`);
        } else if (sp.x < 0 || sp.x > 100 || sp.y < 0 || sp.y > 100) {
          warnings.push(`${p.fixtureType}/${p.subOption} fixture ${i + 1}: coords out of range [${sp.x.toFixed(1)}%, ${sp.y.toFixed(1)}%]`);
        } else {
          // Log valid coordinates for verification
          console.log(`✓ ${p.fixtureType}/${p.subOption} fixture ${i + 1}: [${sp.x.toFixed(1)}%, ${sp.y.toFixed(1)}%]`);
        }
      });
    }
  });

  // Log warnings
  if (warnings.length > 0) {
    console.warn('Coordinate validation warnings:', warnings);
  }

  // Throw on errors
  if (errors.length > 0) {
    const errorMessage = `Missing or invalid coordinates:\n${errors.join('\n')}`;
    console.error('Coordinate validation ERRORS:', errors);
    throw new Error(errorMessage);
  }
}

/**
 * VERIFICATION STEP: Double-check fixtures match Fixture Summary before generating
 * This runs right before Stage 4 to ensure the prompt matches user's selections
 */
export interface VerifiedFixtureSummary {
  verified: boolean;
  fixtures: {
    fixtureType: string;
    subOption: string;
    count: number;
    source: 'user' | 'ai';  // 'user' if user specified count, 'ai' if auto-recommended
  }[];
  totalFixtures: number;
  summary: string;
}

export const verifyFixturesBeforeGeneration = (
  plan: LightingPlan,
  userSelections: FixtureSelections
): VerifiedFixtureSummary => {
  const verifiedFixtures: VerifiedFixtureSummary['fixtures'] = [];
  let totalFixtures = 0;

  // Double-check each placement matches user's selections
  plan.placements.forEach(placement => {
    const { fixtureType, subOption, count } = placement;

    // Verify fixture type is in user's selections
    if (!userSelections.fixtures.includes(fixtureType)) {
      console.warn(`VERIFICATION WARNING: ${fixtureType} not in user's selected fixtures`);
      return; // Skip this fixture - user didn't select it
    }

    // Verify sub-option is in user's selections for this fixture
    const userSubOptions = userSelections.subOptions[fixtureType] || [];
    if (!userSubOptions.includes(subOption)) {
      console.warn(`VERIFICATION WARNING: ${subOption} not in user's sub-options for ${fixtureType}`);
      return; // Skip this sub-option - user didn't select it
    }

    // Determine if count came from user or AI
    const userCount = userSelections.counts?.[subOption];
    const source: 'user' | 'ai' = (userCount !== null && userCount !== undefined) ? 'user' : 'ai';

    verifiedFixtures.push({
      fixtureType,
      subOption,
      count,
      source,
    });

    totalFixtures += count;

    console.log(`✓ VERIFIED: ${fixtureType} - ${subOption}: ${count} fixtures (${source} specified)`);
  });

  // Build summary string for final prompt
  const summaryLines = verifiedFixtures.map(f =>
    `- ${(f.fixtureType || 'UNKNOWN').toUpperCase()} LIGHTS - ${f.subOption || 'general'}: ${f.count} fixtures`
  );

  const summary = `
=== VERIFIED FIXTURE SUMMARY (Double-Checked) ===
${summaryLines.join('\n')}
TOTAL FIXTURES: ${totalFixtures}
===================================================`;

  console.log(summary);

  return {
    verified: true,
    fixtures: verifiedFixtures,
    totalFixtures,
    summary,
  };
};

/**
 * Resize a base64 image to fit within maxDim on the longest side.
 * Returns the original if already within bounds or on error.
 */
async function resizeImageBase64(
  base64: string,
  mimeType: string,
  maxDim: number = 2048
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w <= maxDim && h <= maxDim) { resolve(base64); return; }
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      console.log(`[ImageResize] Resizing from ${img.width}x${img.height} to ${w}x${h}`);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(mimeType, 0.90).split(',')[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg',
  aspectRatio: string = '1:1',
  lightIntensity: number = 45,
  beamAngle: number = 30,
  colorTemperaturePrompt: string = "Use Soft White (3000K) for all lights.",
  userPreferences?: UserPreferences | null,
  markedImageBase64?: string,
  rawPromptMode?: boolean,
  prefixParts?: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }>,
  gradientImageBase64?: string
): Promise<string> => {

  // Initialization: The API key is obtained from environment variable
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Map sliders (0-100) to descriptive prompt instructions with height-based wattage guidance
  // Map sliders (0-100) to descriptive prompt instructions with realistic lighting physics
  const getIntensityPrompt = (val: number) => {
    if (val < 25) return `LIGHTING INTENSITY: SUBTLE (2-3W LED equivalent, 150-300 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Faint accent glow providing ambient definition
- Light barely reaches first story roofline (8-10 ft max reach)
- Soft, gentle pools of light with gradual falloff
- Beam edges EXTREMELY soft and diffused (12+ inch transition zone)
- Minimal atmospheric scatter visible near fixture

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft from fixture: 100% (reference)
- Brightness at 4ft: 25% (1/4 of reference)
- Brightness at 8ft: 6% (barely visible)
- Natural, rapid falloff creates intimate pools

HOT SPOT AVOIDANCE:
- NO bright spots at fixture base
- Light appears to "float" on surface
- Even distribution within small pool

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash — this is natural reflection, NOT a separate light source.

BEST FOR: Ambient mood, pathway marking, subtle accent, intimate settings`;

    if (val < 50) return `LIGHTING INTENSITY: MODERATE (4-5W LED equivalent, 300-500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Standard 1st story reach (8-12 ft walls)
- Light comfortably reaches the roofline with gentle falloff
- Visible wall grazing that reveals texture WITHOUT hot spots
- Soft beam edges with 6-8 inch feather/transition zone
- Subtle atmospheric glow visible near fixture lens
- Small bloom halo around fixture (1-2 inch radius)

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 4ft: 25%
- Brightness at 8ft: 6%
- Brightness at 12ft (roofline): 3% - still visible

TEXTURE REVELATION:
- Sufficient intensity to show brick mortar joints
- Siding shadow lines visible but not harsh
- Stone texture defined but not over-emphasized

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash — this is natural reflection, NOT a separate light source.

BEST FOR: Single-story homes, accent features, balanced residential lighting`;

    if (val < 75) return `LIGHTING INTENSITY: BRIGHT (6-8W LED equivalent, 500-800 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- 2nd story reach (18-25 ft walls)
- Strong wall grazing reaching full wall height
- More pronounced beam visibility and definition
- Visible light cone in air near fixture (subtle atmospheric effect)
- Noticeable bloom around fixture lens (2-3 inch radius)
- Clear bounce light contribution on ground and adjacent surfaces
- Beam feathers over 8-12 inch transition zone

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 6ft: 11%
- Brightness at 12ft: 3%
- Brightness at 20ft: 1% - still visible for tall walls

TEXTURE REVELATION:
- Strong shadows in brick/stone mortar joints
- Dramatic siding shadow lines
- Surface irregularities clearly defined

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash — this is natural reflection, NOT a separate light source.

BEST FOR: Two-story facades, tall trees, dramatic accent lighting`;

    return `LIGHTING INTENSITY: HIGH POWER (10-15W LED equivalent, 800-1500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Full 2-3 story reach (25+ ft walls)
- Intense beams reaching tall walls and gable peaks
- Maximum wall coverage with strong definition
- Pronounced atmospheric scatter near fixture (visible light cone)
- Strong lens bloom and halo effect (3-4 inch radius)
- Significant bounce/fill light contribution to surrounding areas
- Beam still feathers at edges (10-15 inch transition zone)

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 8ft: 6%
- Brightness at 16ft: 1.5%
- Brightness at 25ft: 0.6% - still visible for tall facades

TEXTURE REVELATION:
- Maximum shadow definition on textured surfaces
- Deep mortar joint shadows
- Dramatic texture grazing effect

HOT SPOT MANAGEMENT:
- Even with high power, NO harsh bright spots at fixture base
- Fixture angled to start beam 18-24 inches above ground
- Light brightest at mid-wall, not at base

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash — this is natural reflection, NOT a separate light source.

BEST FOR: Tall facades, commercial properties, dramatic architectural statements`;
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return `BEAM ANGLE: 15 DEGREES (NARROW SPOT) - MAXIMUM DRAMA

BEAM GEOMETRY:
- Tight, focused conical beams (narrow at fixture, widening gradually upward)
- Spread calculation: diameter = distance × 0.26 (tan 15°)
- At 10 feet: ~2.6 foot diameter light pool
- At 20 feet: ~5.2 foot diameter light pool

LIGHT DISTRIBUTION:
- HOT CENTER: Brightest point at beam center
- SOFT FALLOFF: Rapid but smooth transition to edges
- Edge transition zone: 3-4 inches (soft gradient, NOT hard cutoff)
- Beam boundary: Feathered, never crisp circles

TEXTURE GRAZING EFFECT:
- Ideal angle for revealing surface texture
- Brick: Deep mortar joint shadows, dramatic grid pattern
- Stone: Maximum texture revelation, rugged appearance
- Siding: Strong horizontal shadow lines

DARK GAP CREATION:
- Narrow beams create VISIBLE DARK GAPS between fixtures
- This is the PROFESSIONAL LOOK - isolated pools with separation
- Adjacent fixtures do NOT blend - each maintains distinct boundary

BEST FOR: Architectural columns, narrow wall sections, focal points, maximum drama`;

    if (angle <= 30) return `BEAM ANGLE: 30 DEGREES (SPOT) - PROFESSIONAL STANDARD

BEAM GEOMETRY:
- Defined beam with moderate spread
- Spread calculation: diameter = distance × 0.54 (tan 30°)
- At 10 feet: ~5.4 foot diameter light pool
- At 20 feet: ~10.8 foot diameter light pool

LIGHT DISTRIBUTION:
- DEFINED CENTER: Clear brightness concentration
- GRADUAL FALLOFF: Smooth transition over 6-8 inches
- Visible beam definition with diffused, feathered edges
- NOT crisp boundaries - always soft gradient

TEXTURE GRAZING EFFECT:
- Excellent balance of texture revelation and coverage
- Brick: Visible mortar joint shadows, balanced pattern
- Stone: Good texture definition without harshness
- Siding: Clear horizontal lines, professional appearance

DARK GAP CREATION:
- Creates VISIBLE separation between fixture illumination zones
- Standard spacing allows dark wall sections between beams
- Professional landscape lighting look with intentional dark areas

BEST FOR: Facade accent lighting, medium trees, entry features, general professional use`;

    if (angle >= 60) return `BEAM ANGLE: 60 DEGREES (WIDE FLOOD) - AREA COVERAGE

BEAM GEOMETRY:
- Broad, even wash of light
- Spread calculation: diameter = distance × 1.73 (tan 60°)
- At 10 feet: ~11.5 foot diameter light pool
- At 20 feet: ~23 foot diameter light pool

LIGHT DISTRIBUTION:
- EVEN COVERAGE: Minimal hot center effect
- VERY SOFT edges: 12+ inch gradual transition
- No distinct beam boundary - blends smoothly into darkness
- Creates seamless wall wash effect

WARNING - REDUCED DRAMA:
- Wide floods REDUCE texture revelation
- Less shadow definition on brick/stone
- Can create FLAT, UNIFORM appearance
- Dark gaps between fixtures may DISAPPEAR
- Use sparingly - professional lighting rarely uses this wide

BEST FOR: Wall washing (when uniform coverage desired), large blank facades, area lighting where drama is NOT the goal`;

    return `BEAM ANGLE: 45 DEGREES (FLOOD) - BALANCED COVERAGE

BEAM GEOMETRY:
- Standard professional landscape spread
- Spread calculation: diameter = distance × 1.0 (tan 45°)
- At 10 feet: ~8.3 foot diameter light pool
- At 20 feet: ~16.6 foot diameter light pool

LIGHT DISTRIBUTION:
- BALANCED CENTER: Moderate brightness concentration
- SOFT EDGES: 8-10 inch feathered transition zone
- Soft but discernible beam shape
- Good coverage with some definition retained

TEXTURE EFFECT:
- Moderate texture revelation
- Brick: Visible but softer mortar shadows
- Stone: Texture present but less dramatic
- Siding: Subtle horizontal shadow lines

DARK GAP CONSIDERATION:
- May require closer fixture spacing to maintain dark gaps
- Watch for beam overlap creating uniform wash
- Consider narrower angle for more dramatic results

BEST FOR: General facade lighting, medium wall areas, balanced coverage needs`;
  };

  // Build user preference context (if available)
  const preferenceContext = buildPreferenceContext(userPreferences);

  // Simplified prompt structure to avoid adversarial trigger patterns while maintaining instruction density.
  const systemPrompt = `
    You are a professional Architectural Lighting Designer and Night Photography Specialist.
    Task: Transform the provided daylight photograph into an ULTRA-REALISTIC 1AM nighttime landscape lighting scene with CINEMATIC QUALITY. The result must look like a professional photograph taken at 1AM with high-end camera equipment (Sony A7R IV or Canon R5 quality).
${preferenceContext}

    # STEP 0: FRAMING & COMPOSITION PRESERVATION (CRITICAL)
    - The output image must have the EXACT SAME framing and composition as the source image
    - Keep the ENTIRE house in frame - do NOT crop, zoom in, or cut off any part of the home
    - Do NOT change the camera angle, perspective, or viewpoint
    - All edges of the property visible in the source must remain visible in the output
    - The aspect ratio and boundaries must match the source image exactly
    - If the source shows the full front facade, the output MUST show the full front facade

    # STEP 1: SOURCE IMAGE ANALYSIS (MANDATORY)
    BEFORE making any changes, you MUST analyze and catalog the input photograph:
    - Count and note the exact position of every window, door, and architectural feature
    - Identify all landscaping elements (trees, bushes, plants) and their EXACT positions
    - Identify all hardscape elements (driveways, sidewalks, patios, walkways) OR note their ABSENCE
    - Note the exact shape of the roof, any dormers, columns, or decorative elements
    YOUR OUTPUT MUST PRESERVE THIS CATALOG EXACTLY. Every element stays; no elements added.

    # STEP 2: PIXEL-PERFECT PRESERVATION (CRITICAL)
    1. **ABSOLUTE STRUCTURE LOCK**: The generated image must be a 1:1 edit of the source photo.
       - Every building, tree, bush, object MUST appear EXACTLY as shown in source.
       - If source has NO sidewalk, output has NO sidewalk.
       - If source has NO driveway, output has NO driveway.
       - If source has NO front walkway (just grass to door), output has NO front walkway.
       - You are ONLY permitted to: darken the scene to night, add the specific requested light fixtures.

    2. **ABSOLUTE ZERO-ADDITION POLICY**:
       - FORBIDDEN ADDITIONS: New trees, bushes, plants, walkways, driveways, patios, steps, railings, windows, doors, dormers, columns, decorations, paths, pots, furniture.
       - If you are uncertain whether something exists in source, DO NOT ADD IT.
       - Your job is to ADD LIGHT to existing elements, NOT to ADD MATTER.

    3. **HARDSCAPE PRESERVATION**:
       - Many homes do NOT have front walkways, sidewalks, or visible driveways. This is NORMAL.
       - If source photo shows GRASS leading to front door, output MUST show GRASS (no path).
       - Do NOT "complete" or "add" hardscape that seems missing. It is not missing.

    4. **Sky & Darkness Level**: Transform to DEEP 1AM NIGHTTIME - NOT twilight, NOT dusk, but TRUE NIGHT.
       - Sky must be PITCH BLACK with no gradients, no blue tones, no ambient glow
       - This is 1AM darkness - the deepest, darkest part of night
       - Unlit areas should be so dark you can BARELY make out shapes and forms
       - Only the landscape lighting fixtures provide meaningful illumination
       - The darkness should feel authentic, atmospheric, and cinematic
       - Include a realistic full moon that provides EXTREMELY SUBTLE edge lighting only
       - Moon should NOT act as a spotlight - just the faintest silhouette definition on rooflines and trees

    5. **Background**: Trees in background remain as barely-visible dark silhouettes against the black sky. Do not add trees.

    # STEP 3: EXCLUSIVE LIGHTING RULES
    - **PLACEMENT PRIORITY**: The "DESIGN REQUEST" below contains a strict ALLOW-LIST.
    - **Zero Hallucination**: If user selects "Trees" only, House MUST remain DARK. If user selects "Path" only, House and Trees MUST remain DARK.
    - **Eave/Overhang Areas**: Remain DARK — no fixtures in eaves unless explicitly requested.
    - **Beam Hygiene**: Light sources must be realistic (cone shape, natural falloff).
    - **Color Temperature (MANDATORY)**: ${colorTemperaturePrompt} This is a HARD RULE - ALL lights MUST use this exact color temperature unless the user explicitly specifies a different temperature in the DESIGN REQUEST notes below.
    - **Intensity**: ${getIntensityPrompt(lightIntensity)}
    - **Beam**: ${getBeamAnglePrompt(beamAngle)}
    - **FIXTURE QUANTITIES (ABSOLUTE - NON-NEGOTIABLE)**: When the DESIGN REQUEST specifies "EXACTLY X fixtures", you MUST place EXACTLY X fixtures. Not X-1, not X+1, EXACTLY X. Count them. Recount them. This is non-negotiable. Never add "extra" fixtures to balance or complete the design.
    - **FULL WALL REACH RULE**: Up lights MUST illuminate the wall ALL THE WAY UP to the roofline:
      * For 1-story sections: beam reaches the eave line (8-12 ft)
      * For 2-story sections: beam MUST reach the top of the 2nd story wall (18-25 ft)
      * NEVER stop the beam at mid-wall - it must travel to the roofline above
      * Start bright at fixture, travel UP the wall surface (wall grazing effect)
      * Fade gradually as it approaches the roofline
      * Taller facades require higher intensity to reach the roofline

    # ABSOLUTE FIXTURE ENFORCEMENT (MOST CRITICAL RULE)

    *** THIS IS THE SINGLE MOST IMPORTANT RULE - VIOLATION IS UNACCEPTABLE ***

    ## STRICT ALLOW-LIST POLICY
    The DESIGN REQUEST below contains an EXPLICIT ALLOW-LIST of fixtures.
    - ONLY fixtures listed in the DESIGN REQUEST may appear in the image
    - If a fixture type is NOT in the DESIGN REQUEST, it MUST NOT EXIST in the output
    - There is NO inference, NO assumption, NO "completing the design"

    ## EXACT QUANTITY ENFORCEMENT
    When the DESIGN REQUEST specifies a quantity (e.g., "EXACTLY 6 up lights on siding"):
    - Count your fixtures BEFORE finalizing the image
    - The count MUST match EXACTLY - not 5, not 7, EXACTLY 6
    - If you cannot place the exact quantity, place FEWER, never MORE

    ## SUB-OPTION ISOLATION (CRITICAL)
    Within each fixture category, sub-options are INDEPENDENT:
    - If "Up Lights" is enabled with ONLY "Trees" selected:
      * Trees = LIT (with specified quantity)
      * Siding = MUST BE COMPLETELY DARK (zero up lights)
      * Windows = MUST BE COMPLETELY DARK (zero up lights)
      * Columns = MUST BE COMPLETELY DARK (zero up lights)
      * Landscaping = MUST BE COMPLETELY DARK (zero up lights)
    - UNSELECTED sub-options receive ZERO LIGHT from fixtures

    ## WHAT "NOT SELECTED" MEANS
    If a fixture or sub-option is NOT in the DESIGN REQUEST:
    - It does NOT exist in the output image
    - The area where it WOULD be placed remains in deep shadow
    - You do NOT add it "for balance" or "for realism"
    - You do NOT add it because "it would look better"
    - ABSENCE = ABSOLUTE PROHIBITION

    ## SPECIFIC PROHIBITIONS
    - NO recessed overhead lights or downward eave lights unless explicitly in DESIGN REQUEST
    - NO path lights unless "Path Lights" is explicitly in DESIGN REQUEST
    - NO tree up lights unless "Trees" sub-option is explicitly selected
    - NO siding up lights unless "Siding" sub-option is explicitly selected
    - NO window up lights unless "Windows" sub-option is explicitly selected
    - NO string lights, holiday lights, or decorative lights EVER (unless explicitly requested)
    - NO interior window glow (unless explicitly requested)
    - NO security lights, floodlights, or motion lights EVER

    ## VERIFICATION CHECKLIST (DO THIS BEFORE OUTPUT)
    1. List every fixture type in the DESIGN REQUEST
    2. For each fixture type, list every sub-option that is ENABLED
    3. Count the specified quantity for each
    4. Verify your output matches this list EXACTLY
    5. Verify areas NOT in this list are COMPLETELY DARK

    # YOUR ONLY PERMITTED MODIFICATIONS:
    1. Convert to TRUE 1AM DARKNESS - pitch black night, not twilight or dusk
    2. Add ONLY the specific light fixtures listed in DESIGN REQUEST
    3. Add realistic light beams/glow from those fixtures with physically accurate falloff
    4. Add full moon with EXTREMELY SUBTLE edge lighting on rooflines and tree silhouettes only
    EVERYTHING ELSE must remain pixel-for-pixel identical to the source image.

    # PHOTO-REALISM REQUIREMENTS (CRITICAL)
    - The output must look like a REAL PHOTOGRAPH taken at 1AM, NOT a digital rendering or CGI
    - Achieve the look of professional night photography with high-end full-frame camera
    - Light falloff must be physically accurate - inverse square law applies
    - The contrast between lit and unlit must be DRAMATIC - this is what makes night photography stunning
    - Lit areas: warm, inviting glow that looks natural, not artificially bright
    - The interplay of light and deep shadow creates the cinematic atmosphere
    - Overall mood: mysterious, dramatic, professional - like an architectural magazine night shoot

    # ADVANCED LIGHT PHYSICS (CRITICAL FOR REALISM)

    ## BEAM CHARACTERISTICS
    - Every light beam has a HOT CENTER (brightest point) that gradually FEATHERS to soft edges
    - Beam edges should never be sharp/crisp - LED sources create soft, diffused boundaries
    - The transition from lit to unlit should span 6-12 inches, not a hard line
    - Light intensity follows inverse square law: brightness = 1/(distance squared)
    - Light beams are CONICAL (narrow at fixture, organic spread) — NOT geometric cylinders with straight edges
    - Beam boundaries interact with surface texture, creating naturally irregular edges

    ## ATMOSPHERIC LIGHT SCATTER
    - Night air has subtle particulates that catch and scatter light
    - Create extremely subtle VISIBLE LIGHT CONES in the air (not fog, just atmosphere)
    - Brightest near fixture, fading to invisible within 2-3 feet
    - This is what gives professional night photography its "magic"

    ## FIXTURE SOURCE POINT
    - Each fixture should have a tiny, bright LENS GLOW at the source point
    - Add subtle BLOOM/HALO effect around bright fixture lenses (1-2 inch radius)
    - The fixture housing may be barely visible as a dark silhouette

    ## SURFACE MATERIAL INTERACTION
    - BRICK/STONE: Light catches texture, creates micro-shadows in mortar joints — beam edges follow mortar/texture relief, NOT straight geometric lines
    - VINYL/ALUMINUM SIDING: Slight sheen, horizontal shadow lines from overlap — beam interacts with siding texture, NOT uniform geometric wash
    - STUCCO: Diffuse reflection, soft appearance, minimal texture shadows
    - WOOD: Warm absorption, grain may be visible, natural material feel
    - PAINTED SURFACES: Color temperature affects perceived paint color
    - ALL SURFACES: Beam edges appear organic and slightly irregular, never ruler-straight

    ## SECONDARY/BOUNCE LIGHT
    - Lit surfaces reflect a small amount of light back into the scene
    - Ground near up lights receives subtle AMBIENT GLOW from wall reflection
    - Adjacent unlit surfaces receive faint FILL LIGHT from nearby lit areas
    - This prevents the "floating light in void" artificial look

    ## SHADOW QUALITY (LED SOURCES)
    - LED fixtures create SOFT SHADOWS with gradual edges (penumbra)
    - Shadow edges should transition over 2-4 inches, not be razor sharp
    - Multiple fixtures create multiple overlapping, semi-transparent shadows
    - Shadow darkness varies: deepest at center, lighter at edges

    ## GROUND PLANE INTERACTION
    - Light pools on ground from path lights should have soft, feathered edges
    - Hard surfaces (concrete, pavers) reflect slightly more than grass/mulch
    - Create subtle gradation from bright center to dark perimeter

    # SHADOW CONSISTENCY (CRITICAL - NO BRIGHT SPOTS)
    - ALL unlit areas must have UNIFORM DARKNESS throughout the entire image
    - NO bright spots, NO lighter patches, NO inconsistent shadow levels in unlit areas
    - The DARKEST shadow sets the standard - ALL other shadows must match this darkness level
    - Eliminate any areas that appear brighter than others in the shadows
    - Grass, siding, roof, trees - if not lit by a fixture, they should all be the SAME level of dark
    - Think of it like a consistent "black floor" - nothing unlit should be brighter than this floor
    - Even areas that would naturally catch ambient light (like white siding) must be uniformly dark
    - The ONLY variation in brightness should come from the landscape lighting fixtures
    - Shadows do NOT have varying levels of darkness - they are all equally deep and dark

    # DESIGN REQUEST
    Apply the following specific configuration to the scene. These instructions override default placement rules if they conflict:

    ${userInstructions}
  `;

  try {
    // Resize images to max 2048px before sending to Gemini to avoid timeouts
    const resizedImage = await resizeImageBase64(imageBase64, imageMimeType);
    const resizedGradient = gradientImageBase64
      ? await resizeImageBase64(gradientImageBase64, imageMimeType)
      : undefined;
    const resizedMarked = markedImageBase64
      ? await resizeImageBase64(markedImageBase64, imageMimeType)
      : undefined;

    // Build parts array — send both clean + marked images for manual placement mode
    const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
    // Inject reference examples (few-shot) before user images if provided
    if (prefixParts && prefixParts.length > 0) {
      imageParts.push(...prefixParts);
    }
    imageParts.push({ inlineData: { data: resizedImage, mimeType: imageMimeType } });
    // Prefer gradient image (includes markers) over markers-only
    if (resizedGradient) {
      imageParts.push({ inlineData: { data: resizedGradient, mimeType: imageMimeType } });
    } else if (resizedMarked) {
      imageParts.push({ inlineData: { data: resizedMarked, mimeType: imageMimeType } });
    }
    // rawPromptMode: send userInstructions directly, skip auto-mode system prompt wrapper
    imageParts.push({ text: rawPromptMode ? userInstructions : systemPrompt });

    const generatePromise = ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: imageParts,
      },
      config: {
        imageConfig: {
            imageSize: "2K",
            aspectRatio: aspectRatio,
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    // Wrap with timeout to prevent hanging
    const response = await withTimeout(
      generatePromise,
      API_TIMEOUT_MS,
      'Generation timed out. The server took too long to respond. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      // Check for finishReason to debug safety blocks
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.warn(`Gemini generation stopped with reason: ${candidate.finishReason}`);
          // We don't throw immediately, as there might still be content, but it's a good indicator of issues.
      }

      if (candidate.content && candidate.content.parts) {
          const parts = candidate.content.parts;
          
          // First, try to find the image part
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
          }
          
          // If no image part found, check for text (error description from model)
          const textPart = parts.find(p => p.text);
          if (textPart && textPart.text) {
             throw new Error(`Generation blocked: ${textPart.text}`);
          }
      }
    }

    // Capture safety ratings if available for debugging
    if (response.candidates && response.candidates[0] && response.candidates[0].safetyRatings) {
        console.warn("Safety Ratings:", response.candidates[0].safetyRatings);
    }

    throw new Error("No image generated. The model returned an empty response (Possible Safety Filter Trigger).");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECT GENERATION MODE (FAST - Single API Call)
// Skips analysis/planning/prompting/validation stages for ~60-70% faster generation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a complete prompt directly from user selections + pre-built templates
 * No AI analysis needed - uses the rich prompt templates from constants.ts
 */
const buildDirectPrompt = (
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number
): string => {
  // Start with master instruction (includes narrative description and constraints)
  let prompt = SYSTEM_PROMPT.masterInstruction + '\n\n';

  // Add intensity and beam angle context
  const intensityDesc = lightIntensity < 25 ? 'SUBTLE' : lightIntensity < 50 ? 'MODERATE' : lightIntensity < 75 ? 'BRIGHT' : 'HIGH POWER';
  const beamDesc = beamAngle < 20 ? 'NARROW SPOT (15-20°)' : beamAngle < 40 ? 'MEDIUM FLOOD (25-40°)' : 'WIDE FLOOD (45-60°)';

  prompt += `=== LIGHTING PARAMETERS ===
- Color Temperature: ${colorTemperaturePrompt}
- Intensity Level: ${intensityDesc} (${lightIntensity}%)
- Beam Angle: ${beamDesc}

`;

  // Add ENABLED fixtures section
  prompt += '=== ENABLED LIGHTING (ALLOWLIST) ===\n\n';

  if (selectedFixtures.length === 0) {
    prompt += 'NO LIGHTING ENABLED. Convert to nighttime scene only. Do NOT add any light fixtures.\n\n';
  } else {
    // Build fixture-specific prompts from FIXTURE_TYPES
    selectedFixtures.forEach(fixtureId => {
      const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
      if (fixtureType) {
        // Get sub-options for this fixture
        const subOpts = fixtureSubOptions[fixtureId] || [];

        // Skip this fixture entirely if it has sub-options but none are selected
        // This prevents soffit (and any fixture with sub-options) from being enabled
        // when no specific sub-option is chosen
        if (fixtureType.subOptions && fixtureType.subOptions.length > 0 && subOpts.length === 0) {
          return; // Skip - don't add positivePrompt
        }

        prompt += `### ${fixtureType.label.toUpperCase()}\n`;
        prompt += fixtureType.positivePrompt + '\n\n';

        // Add sub-option specific prompts
        if (subOpts.length > 0 && fixtureType.subOptions) {
          subOpts.forEach(subOptId => {
            const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
            if (subOpt) {
              const count = fixtureCounts[subOptId];
              const countStr = count !== null && count !== undefined ? `EXACTLY ${count}` : 'AUTO (AI determines optimal count)';
              prompt += `#### ${subOpt.label}\n`;
              prompt += `- Count: ${countStr} fixtures\n`;
              prompt += `- ${subOpt.prompt}\n\n`;
            }
          });

          // Add dark descriptions for NON-selected sub-options within this fixture type
          const nonSelectedSubOpts = fixtureType.subOptions.filter(s => !subOpts.includes(s.id));
          if (nonSelectedSubOpts.length > 0) {
            prompt += `#### PROHIBITED SUB-OPTIONS (within ${fixtureType.label}):\n`;
            nonSelectedSubOpts.forEach(subOpt => {
              prompt += `- ${subOpt.label}: ${subOpt.darkDescription || 'MUST remain completely dark - no fixtures'}\n`;
            });
            prompt += '\n';
          }
        }
      }
    });
  }

  // Add PROHIBITION section for non-selected fixture types
  // IMPORTANT: Skip soffit entirely - if we don't mention it, AI can't generate it
  // This is the "complete invisibility" approach for soffit control
  prompt += '=== PROHIBITED FIXTURES (MUST REMAIN DARK) ===\n\n';
  const nonSelectedFixtures = FIXTURE_TYPES.filter(f =>
    !selectedFixtures.includes(f.id) && f.id !== 'soffit'
  );
  if (nonSelectedFixtures.length > 0) {
    nonSelectedFixtures.forEach(fixture => {
      prompt += `### ${fixture.label.toUpperCase()} - FORBIDDEN\n`;
      prompt += `${fixture.negativePrompt}\n`;
      prompt += `ALL ${fixture.label.toLowerCase()} areas MUST remain PITCH BLACK with zero illumination.\n\n`;
    });
  }

  // Add closing reinforcement
  prompt += SYSTEM_PROMPT.closingReinforcement;

  return prompt;
};

/**
 * DIRECT GENERATION - Single API call, ~20-60 seconds
 * Uses Nano Banana Pro's built-in "thinking" for composition
 * Skips analysis/planning/prompting/validation stages
 */
export const generateNightSceneDirect = async (
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  aspectRatio: string = '1:1',
  userPreferences?: UserPreferences | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build prompt directly from templates (no AI analysis needed)
  let prompt = buildDirectPrompt(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle
  );

  // Add user preference context if available
  const preferenceContext = buildPreferenceContext(userPreferences);
  if (preferenceContext) {
    prompt = preferenceContext + '\n\n' + prompt;
  }

  console.log('=== DIRECT GENERATION MODE ===');
  console.log('Selected fixtures:', selectedFixtures);
  console.log('Sub-options:', fixtureSubOptions);
  console.log('Counts:', fixtureCounts);
  console.log('Prompt length:', prompt.length, 'characters');

  try {
    const generatePromise = ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          imageSize: "2K",
          aspectRatio: aspectRatio,
        }
      },
    });

    // Wrap with timeout
    const response = await withTimeout(
      generatePromise,
      API_TIMEOUT_MS,
      'Direct generation timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn(`Direct generation stopped with reason: ${candidate.finishReason}`);
      }

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            console.log('✓ Direct generation successful');
            return `data:${mimeType};base64,${base64Data}`;
          }
        }
      }
    }

    throw new Error("Direct generation returned no image. Try the full pipeline mode.");
  } catch (error) {
    console.error("Direct Generation Error:", error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPATIAL MAPPING UTILITIES (Ported from claudeService.ts)
// Used for Enhanced Gemini Pro 3 Mode
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a narrative description of fixture placements for a specific fixture type.
 * Research shows narrative descriptions are more effective than technical specs for AI image generation.
 */
export function generateNarrativePlacement(
  spatialMap: SpatialMap,
  fixtureType: string,
  subOption?: string
): string {
  let placements = spatialMap.placements.filter(p => p.fixtureType === fixtureType);
  if (subOption) {
    placements = placements.filter(p => p.subOption === subOption);
  }

  if (placements.length === 0) return '';

  // Per-fixture "render as" micro-descriptions for type reinforcement
  const renderAsMap: Record<string, string> = {
    up: 'small bronze uplight at wall base, beam UPWARD',
    gutter: 'invisible fixture, warm wall wash ABOVE only — NO visible hardware',
    path: 'small bronze fixture in landscaping, 360° ground pool',
    well: 'small bronze uplight at ground level, beam UPWARD at tree canopy',
    hardscape: 'small bronze fixture under step tread, beam DOWNWARD onto riser',
    soffit: 'small bronze recessed fixture flush in soffit, beam DOWNWARD',
    coredrill: 'TINY flush bronze disc in concrete (~3" diameter), beam UPWARD — NO visible hardware',
  };

  const typeLabel = fixtureType.toUpperCase();
  const renderAs = renderAsMap[fixtureType] || fixtureType;

  // Sort left to right
  const sorted = [...placements].sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  const label = subOption ? `${fixtureType} (${subOption})` : fixtureType;
  let narrative = `### ${label.toUpperCase()}\n`;
  narrative += `Scanning LEFT to RIGHT, you will see exactly ${sorted.length} fixtures:\n\n`;

  sorted.forEach((p, i) => {
    // Output exact x,y coordinates for precise placement
    const xCoord = p.horizontalPosition.toFixed(1);
    const yCoord = p.verticalPosition !== undefined ? p.verticalPosition.toFixed(1) : '?';
    const coords = `Place at [${xCoord}%, ${yCoord}%]`;

    narrative += `FIXTURE ${i + 1} (${typeLabel}): ${coords}`;
    if (p.description) {
      narrative += ` — ${p.description}`;
    }
    narrative += ` — Render as: ${renderAs}\n`;
  });

  // Add inter-fixture spacing when 2+ fixtures
  if (sorted.length >= 2) {
    narrative += `\nSPACING: These ${sorted.length} fixtures are arranged LEFT to RIGHT.\n`;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].horizontalPosition - sorted[i - 1].horizontalPosition;
      narrative += `- Gap between FIXTURE ${i} and FIXTURE ${i + 1}: ${gap.toFixed(1)}% of image width\n`;
    }
  }

  narrative += `\nCOUNT CHECK: There are EXACTLY ${sorted.length} fixtures. No more, no less.\n`;

  return narrative;
}

/**
 * Formats the full spatial map into a prompt-ready string
 */
export function formatSpatialMapForPrompt(spatialMap: SpatialMap): string {
  if (!spatialMap.features.length && !spatialMap.placements.length) {
    return '';
  }

  let output = `\n## EXACT FIXTURE PLACEMENT MAP\n`;
  output += `Coordinates: x=0% (far left) to x=100% (far right), y=0% (top) to y=100% (bottom).\n\n`;

  // Reference points with x,y coordinates
  if (spatialMap.features.length > 0) {
    output += `### REFERENCE POINTS:\n`;
    const sortedFeatures = [...spatialMap.features].sort((a, b) => a.horizontalPosition - b.horizontalPosition);
    sortedFeatures.forEach(f => {
      const yCoord = f.verticalPosition !== undefined ? f.verticalPosition.toFixed(1) : '?';
      output += `- ${f.label}: [${f.horizontalPosition.toFixed(1)}%, ${yCoord}%]\n`;
    });
    output += '\n';
  }

  // Group placements by fixtureType and subOption
  const groups = new Map<string, SpatialFixturePlacement[]>();
  spatialMap.placements.forEach(p => {
    const key = `${p.fixtureType}_${p.subOption}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  });

  // Generate narrative for each group
  groups.forEach((placements, key) => {
    const [fixtureType, subOption] = key.split('_');
    output += generateNarrativePlacement({ ...spatialMap, placements }, fixtureType, subOption);
    output += '\n';
  });

  return output;
}

/**
 * Builds an enhanced prompt for image generation using Gemini's analysis results
 * This replicates Claude's prompt quality using Gemini Pro 3 analysis
 */
function buildEnhancedPrompt(
  analysis: PropertyAnalysis & { spatialMap?: SpatialMap },
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  isManualPlacement: boolean = false
): string {
  // Build fixture inventory
  let inventoryAllowlist = '';
  let totalFixtureCount = 0;
  selectedFixtures.forEach(fixtureId => {
    const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
    if (fixtureType) {
      const subOpts = fixtureSubOptions[fixtureId] || [];
      subOpts.forEach(subOptId => {
        const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
        if (subOpt) {
          const count = fixtureCounts[subOptId];
          const countStr = count !== null ? `EXACTLY ${count}` : 'Auto (AI determines optimal count based on property)';
          inventoryAllowlist += `- ${fixtureType.label} (${subOpt.label}): ${countStr}\n`;
          if (count !== null) {
            totalFixtureCount += count;
          }
        }
      });
    }
  });

  // Build prohibition list (skip soffit for "complete invisibility")
  let inventoryProhibitions = '';
  FIXTURE_TYPES.forEach(fixtureType => {
    // Skip soffit - complete invisibility approach
    if (fixtureType.id === 'soffit') return;

    if (!selectedFixtures.includes(fixtureType.id)) {
      inventoryProhibitions += `- ${fixtureType.label}: FORBIDDEN - ZERO instances allowed\n`;
    } else {
      const selectedSubs = fixtureSubOptions[fixtureType.id] || [];
      fixtureType.subOptions?.forEach(subOpt => {
        if (!selectedSubs.includes(subOpt.id)) {
          inventoryProhibitions += `- ${fixtureType.label} (${subOpt.label}): FORBIDDEN - ZERO instances allowed\n`;
        }
      });
    }
  });

  // Start building the comprehensive prompt
  let prompt = '';

  if (isManualPlacement) {
    // Manual mode: strict executor preamble — no creative vision, pure execution
    const manualCount = analysis.spatialMap?.placements.length || 0;
    prompt += `YOU ARE A PRECISION LIGHTING PLACEMENT TOOL.\n\n`;
    prompt += `ABSOLUTE RULES:\n`;
    prompt += `1. Render EXACTLY the fixture types specified — no substitutions\n`;
    prompt += `2. Place fixtures at EXACTLY the positions marked — no repositioning\n`;
    prompt += `3. Render EXACTLY ${manualCount} light sources — NO MORE, NO LESS\n`;
    prompt += `4. Areas without markers MUST remain COMPLETELY DARK — zero ambient light, zero fill\n`;
    prompt += `5. Do NOT add lights "for realism," "rhythm," "to complete the design," or for ANY other reason\n`;
    prompt += `6. The home's architecture, landscaping, and hardscape must be PIXEL-PERFECT identical to the source\n`;
    prompt += `7. ANY light source not corresponding to a numbered marker is a FAILURE\n\n`;
    prompt += `FRAMING: Output MUST have the EXACT same framing and composition as the source image. Do NOT crop, zoom, or reframe.\n`;
    prompt += `SKY: Pure black sky with full moon. No stars, gradients, blue tones, or atmospheric glow.\n\n`;

    // Add prohibition list to manual mode too — critical for preventing unwanted fixture types
    if (inventoryProhibitions) {
      prompt += `## PROHIBITED FIXTURE TYPES — ZERO INSTANCES ALLOWED\n`;
      prompt += `The user did NOT place these fixture types. They MUST NOT appear in the output:\n`;
      prompt += inventoryProhibitions;
      prompt += `\nIf you see yourself adding ANY fixture type not in the markers above, STOP — it is FORBIDDEN.\n\n`;
    }
  } else {
    // Auto mode: full creative masterInstruction
    prompt += SYSTEM_PROMPT.masterInstruction + '\n\n';

    // Add fixture inventory (auto mode only — manual mode uses marker checklist instead)
    prompt += `## COMPLETE FIXTURE INVENTORY\n`;
    prompt += `This image will contain EXACTLY these fixtures and NO OTHERS:\n`;
    prompt += inventoryAllowlist || '- None selected\n';
    if (totalFixtureCount > 0) {
      prompt += `\nTOTAL FIXTURES IN IMAGE: ${totalFixtureCount}\n`;
    }
    prompt += '\n';

    // Add prohibition verification (auto mode only)
    prompt += `## PROHIBITION VERIFICATION\n`;
    prompt += `These fixture types MUST NOT appear AT ALL (ZERO instances):\n`;
    prompt += inventoryProhibitions || '- None\n';
    prompt += '\n';
    prompt += `VERIFICATION RULE: Before finalizing the image, mentally count all fixtures. If the count exceeds the inventory above, REMOVE the extras. If any prohibited fixture types appear, REMOVE them entirely.\n\n`;
  }

  // Add spatial placement map if available
  if (analysis.spatialMap && analysis.spatialMap.placements.length > 0) {
    prompt += formatSpatialMapForPrompt(analysis.spatialMap);
    prompt += '\n';

    // Manual placement: reference the visible colored markers drawn on the image
    if (isManualPlacement) {
      const count = analysis.spatialMap.placements.length;
      const presentTypes = new Set(analysis.spatialMap.placements.map(p => p.fixtureType));

      // Dual-image reference
      prompt += `## DUAL-IMAGE REFERENCE\n`;
      prompt += `You are given TWO images:\n`;
      prompt += `- IMAGE 1: The clean, unmodified original photograph — use this as your BASE for the output\n`;
      prompt += `- IMAGE 2: The same photograph with bright colored numbered circle markers showing EXACTLY where to place each light fixture\n\n`;
      prompt += `Your task: Generate a night scene based on IMAGE 1, placing professional landscape lighting fixtures at the EXACT positions shown by the markers in IMAGE 2. The output should look like IMAGE 1 transformed into a professional night scene with NO colored markers visible.\n\n`;

      // Manual placement header
      prompt += `## CRITICAL: MANUAL PLACEMENT MODE — EXACTLY ${count} LIGHTS, ZERO EXTRAS\n`;
      prompt += `IMAGE 2 contains EXACTLY ${count} bright colored numbered circle markers.\n`;
      prompt += `Each marker shows the EXACT position and type of lighting fixture to place.\n`;
      prompt += `Place EXACTLY ${count} lights total — one per marker. ZERO additional lights anywhere.\n\n`;

      // Rich fixture type descriptions (only for types actually placed)
      prompt += `## FIXTURE TYPE REFERENCE — WHAT EACH MARKER LABEL MEANS\n\n`;

      if (presentTypes.has('up')) {
        prompt += `### "UP" MARKERS — Ground-Mounted Up Lights\n`;
        prompt += `- FIXTURE: Small brass/bronze cylinder ground stake, low-profile, nearly invisible at night\n`;
        prompt += `- MOUNTING: Staked into the ground AT THE BASE of the house foundation, within 6 inches of the wall\n`;
        prompt += `- BEAM DIRECTION: Aimed straight UP but LEANED BACK 15° from vertical (tilted slightly away from the wall). This prevents a harsh hot spot at the base and spreads the beam evenly up the entire wall.\n`;
        prompt += `- BEAM REACH: The light column MUST illuminate the wall from bottom to top, reaching the gutter line / roofline directly above (8-25 ft). The beam does NOT stop at mid-wall — it lights the FULL HEIGHT.\n`;
        prompt += `- LIGHT PHYSICS: Because of the 15° lean-back, light starts on the wall 12-18 inches above ground (not at the fixture). Brightest at mid-wall, even wash continuing up to the roofline, NO hot spots at the fixture base.\n`;
        prompt += `- THIS IS A GROUND-LEVEL FIXTURE — the brass cylinder sits at ground level, NOT mounted on the wall\n\n`;
      }

      if (presentTypes.has('gutter')) {
        prompt += `### "WASH-UP▲" MARKERS — Invisible Roof-Edge Uplights\n`;
        prompt += `- FIXTURE VISIBILITY: COMPLETELY INVISIBLE. Do NOT draw ANY fixture, bracket, sconce, or hardware. The fixture is hidden and cannot be seen at night.\n`;
        prompt += `- LIGHT EFFECT: Soft, wide WASH of warm light on the 2nd story wall DIRECTLY ABOVE the marker. Wall glows warmly revealing texture.\n`;
        prompt += `- BEAM DIRECTION: UPWARD ONLY. ZERO light below the marker — wall/surface below must remain DARK.\n`;
        prompt += `- BEAM REACH: Full height of 2nd story wall above, from marker position up to the peak/gable.\n`;
        prompt += `- NOT A SCONCE: No visible fixture. No bidirectional light. No light going downward.\n`;
        prompt += `- Eave undersides are PITCH BLACK — light goes UP from this position, NEVER down. No recessed overhead lights.\n\n`;
      }

      if (presentTypes.has('path')) {
        prompt += `### "PATH" MARKERS — Path Lights\n`;
        prompt += `- FIXTURE: Small bronze up light fixture, low-profile, nearly invisible at night\n`;
        prompt += `- MOUNTING: Post-mounted, staked in landscaping beds alongside walkways (NOT on pavement)\n`;
        prompt += `- BEAM DIRECTION: 360-degree omnidirectional downward distribution from under the hat\n`;
        prompt += `- LIGHT POOL: 6-8 foot diameter warm pools on the ground around the fixture\n\n`;
      }

      if (presentTypes.has('well')) {
        prompt += `### "WELL" MARKERS — In-Ground Well Lights\n`;
        prompt += `- FIXTURE: Small bronze up light, flush-mounted at ground level, nearly invisible at night\n`;
        prompt += `- MOUNTING: Completely flush with grade at ground level\n`;
        prompt += `- BEAM DIRECTION: Aims UPWARD — typically used to uplight trees and canopy\n`;
        prompt += `- LIGHT PHYSICS: Beam originates at ground level, projects upward; reveals bark texture, creates shadows in foliage\n\n`;
      }

      if (presentTypes.has('hardscape')) {
        prompt += `### "STEP" MARKERS — Hardscape / Step Lights\n`;
        prompt += `- FIXTURE: Small bronze fixture, low-profile, nearly invisible at night\n`;
        prompt += `- MOUNTING: Under the tread nosing (front edge of step), facing downward\n`;
        prompt += `- BEAM DIRECTION: Projects DOWNWARD from under tread to illuminate the riser below\n`;
        prompt += `- Creates clear visual definition of each step edge; light spills onto the next tread below\n\n`;
      }

      if (presentTypes.has('soffit')) {
        prompt += `### "DOWN" MARKERS — Soffit Downlights\n`;
        prompt += `- FIXTURE: Small bronze recessed fixture, flush-mounted in soffit, nearly invisible at night\n`;
        prompt += `- MOUNTING: Flush inside the soffit/roof overhang, no protrusion below soffit plane\n`;
        prompt += `- BEAM DIRECTION: Projects DOWNWARD from soffit toward ground\n`;
        prompt += `- Grazes window frames, columns, or wall surfaces depending on position\n\n`;
      }

      if (presentTypes.has('coredrill')) {
        prompt += `### "COREDRILL" MARKERS — Flush In-Ground Core Drill Lights\n`;
        prompt += `- FIXTURE: Extremely small bronze disc about the size of a dip can (~3 inch diameter), completely flush with the concrete surface, INVISIBLE — no hardware visible above grade\n`;
        prompt += `- SIZE: The fixture is TINY — roughly 3 inches in diameter, like a small puck embedded in concrete. It must NOT appear as a large well light or oversized housing.\n`;
        prompt += `- MOUNTING: Core-drilled into hardscape (concrete driveway, paver walkway), completely FLUSH with grade, ZERO protrusion above surface\n`;
        prompt += `- BEAM DIRECTION: Aims UPWARD to graze the wall/pier/column surface directly above the fixture\n`;
        prompt += `- TYPICAL USE: Garage door piers (flanking garage doors), concrete walkways, driveways\n`;
        prompt += `- The light washes UP the vertical wall/pier surface above it, reaching the roofline\n`;
        prompt += `- Distance from wall: 4-6 inches for proper grazing angle\n`;
        prompt += `- THIS IS NOT A TREE UPLIGHT — these are embedded in CONCRETE near walls/piers, NOT in landscape beds\n`;
        prompt += `- THIS IS NOT A PROTRUDING UPLIGHT — there is NO brass cylinder sticking up. The fixture is INVISIBLE, flush with the concrete surface\n\n`;
      }

      // Critical confusion prevention
      prompt += `## CRITICAL CONFUSION PREVENTION\n`;
      if (presentTypes.has('gutter')) {
        prompt += `### WASH-UP▲ = INVISIBLE UPWARD WASH (the ONLY correct interpretation)\n`;
        prompt += `- WASH-UP▲: INVISIBLE fixture — warm wash on wall ABOVE only, ZERO light below, NO visible hardware\n`;
        prompt += `- FORBIDDEN: Any visible wall-mounted fixture (sconce) at a WASH-UP▲ position\n`;
        prompt += `- FORBIDDEN: Any downward light from eaves or overhangs — eave undersides are PITCH BLACK\n`;
        prompt += `- If your render shows a visible fixture at a WASH-UP▲ position = WRONG\n`;
        prompt += `- If your render shows ANY downward light from the roofline area = WRONG\n`;
      }
      if (presentTypes.has('coredrill') && presentTypes.has('up')) {
        prompt += `### COREDRILL ≠ UP (Different fixtures — do NOT confuse)\n`;
        prompt += `- COREDRILL: INVISIBLE fixture flush in concrete, no visible hardware above surface. Light grazes nearby wall/pier.\n`;
        prompt += `- UP: VISIBLE brass cylinder stake sitting on ground in landscaping bed. Distinct hardware visible.\n`;
        prompt += `- If a marker says "COREDRILL", there must be NO visible fixture — only the light beam on the wall above.\n`;
      }
      if (presentTypes.has('coredrill') && presentTypes.has('well')) {
        prompt += `### COREDRILL ≠ WELL (Different locations)\n`;
        prompt += `- COREDRILL: Flush in CONCRETE/PAVERS near walls and garage piers\n`;
        prompt += `- WELL: Flush in LANDSCAPE BEDS near trees\n`;
      }
      if (presentTypes.has('up')) {
        prompt += `- "UP" fixtures are at GROUND LEVEL aiming upward — NOT sconces, NOT wall-mounted, NOT high-mounted\n`;
      }
      prompt += `- Every marker label tells you the EXACT fixture type. NEVER substitute one type for another.\n\n`;

      // Lighting style rules — photorealism
      prompt += `## LIGHTING STYLE — MUST LOOK LIKE A REAL PHOTOGRAPH (MANDATORY)\n`;
      prompt += `- Color temperature: warm (2700K-3000K)\n`;
      prompt += `- SOFT WALL WASHES: Light appears as a gentle, wide glow on the wall — the wall GLOWS warmly. NEVER hard triangles, cones, or geometric beam shapes.\n`;
      prompt += `- FULL WALL COVERAGE: Each uplight washes the wall from near-ground ALL THE WAY UP to the roofline. Brightest in lower half, gently fading but still visible at the top.\n`;
      prompt += `- TEXTURE REVELATION: Warm light grazes across wall surfaces, revealing stone, brick, or siding texture beautifully.\n`;
      prompt += `- INVISIBLE FIXTURES: Do NOT draw fixture hardware. Only the light effect on walls is visible.\n`;
      prompt += `- NO GEOMETRIC SHAPES: Real lighting NEVER creates triangles or cones. It creates soft, diffused wall washes.\n\n`;

      // Absolute prohibition - zero tolerance
      prompt += `## ABSOLUTELY FORBIDDEN — ZERO TOLERANCE\n`;
      prompt += `The following must have ZERO instances in the output:\n`;
      prompt += `- ANY light source without a corresponding numbered marker in IMAGE 2\n`;
      prompt += `- ANY recessed overhead lights or downward light from eaves (NONE were placed)\n`;
      prompt += `- Porch lights, sconces, lanterns, string lights, pendant lights\n`;
      prompt += `- Window glow, interior lights, ambient room lighting visible through glass\n`;
      prompt += `- Ambient illumination or sky glow beyond what the ${count} placed fixtures produce\n`;
      prompt += `- Decorative lights on walls, doors, columns, or any surface without a marker\n`;
      prompt += `- Areas of the house WITHOUT a marker MUST remain COMPLETELY DARK — no exceptions\n`;
      prompt += `- If you find yourself adding a light that doesn't correspond to a marker, STOP and REMOVE it\n\n`;

      // Explicit marker checklist
      prompt += `## MARKER CHECKLIST — Verify EVERY marker is converted:\n`;
      const labelMap: Record<string, string> = {
        up: 'small bronze uplight (beam UP)',
        path: 'small bronze path light',
        well: 'small bronze uplight (beam UP)',
        hardscape: 'small bronze step light',
        gutter: 'invisible roof-edge uplight — warm wash on wall ABOVE only, no visible fixture',
        coredrill: 'tiny flush bronze disc in concrete (beam UP)'
      };
      analysis.spatialMap.placements.forEach((p, i) => {
        const label = labelMap[p.fixtureType] || 'light';
        const hDir = p.horizontalPosition < 33 ? 'left side' : p.horizontalPosition > 66 ? 'right side' : 'center';
        const vDir = p.verticalPosition < 33 ? 'upper area' : p.verticalPosition > 66 ? 'lower area' : 'mid-height';
        prompt += `  ${i + 1}. Marker #${i + 1} → ${label} at ${hDir}, ${vDir}\n`;
      });
      prompt += `\nTOTAL: ${count} markers = EXACTLY ${count} lights in the output. No more, no less.\n\n`;

      // Final verification
      prompt += `## FINAL VERIFICATION — COUNT EVERY LIGHT IN YOUR OUTPUT\n`;
      prompt += `1. Count all visible light sources in your generated image\n`;
      prompt += `2. You MUST have EXACTLY ${count} light sources — one for each marker\n`;
      prompt += `3. If you count FEWER than ${count}: you MISSED a marker — go back and add the missing light\n`;
      prompt += `4. If you count MORE than ${count}: you added an UNAUTHORIZED light — REMOVE it immediately\n`;
      prompt += `5. Verify each light matches its marker type (UP=upward beam from ground, WASH-UP▲=invisible uplight warm wall wash ABOVE only, PATH=bollard, etc.)\n`;
      if (presentTypes.has('gutter')) {
        prompt += `6. Verify ZERO downward lights from eaves AND ZERO visible sconces — WASH-UP▲ = invisible fixtures, upward wash only\n`;
      }
      prompt += `\n`;
    }
  }

  // Add lighting parameters
  prompt += `## LIGHTING PARAMETERS\n`;
  prompt += `- Color Temperature: ${colorTemperaturePrompt}\n`;
  prompt += `- Light Intensity: ${lightIntensity}%\n`;
  prompt += `- Beam Angle: ${beamAngle}°\n\n`;

  // Add closing reinforcement (auto mode only — manual mode uses strict executor preamble)
  if (!isManualPlacement) {
    prompt += SYSTEM_PROMPT.closingReinforcement;
  }

  return prompt;
}

/**
 * Builds a prompt specifically for manual placement mode.
 * Skips all AI decision-making language — pure executor instructions.
 * Does NOT require PropertyAnalysis (no analyzePropertyArchitecture() call needed).
 */
function buildManualPrompt(
  spatialMap: SpatialMap,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  hasGradientImage?: boolean
): string {
  const count = spatialMap.placements.length;
  const presentTypes = new Set(spatialMap.placements.map(p => p.fixtureType));

  let prompt = '';

  // Color mapping for marker guide (must match canvasNightService.ts MARKER_COLORS)
  const colorMap: Record<string, { hex: string; name: string }> = {
    up:        { hex: '#FF0000', name: 'RED' },
    soffit:    { hex: '#FF6600', name: 'ORANGE' },
    path:      { hex: '#00FF00', name: 'GREEN' },
    well:      { hex: '#FFFF00', name: 'YELLOW' },
    hardscape: { hex: '#FF00FF', name: 'MAGENTA' },
    gutter:    { hex: '#00CCFF', name: 'CYAN' },
    coredrill: { hex: '#FFA500', name: 'AMBER' },
  };

  // 1. Executor preamble — two-pass: IMAGE 1 is nighttime base, IMAGE 2 is gradient guide
  prompt += `YOU ARE A PROFESSIONAL LANDSCAPE LIGHTING RENDERER.\n\n`;
  prompt += `Your task is to add PHOTOREALISTIC landscape lighting to a nighttime house photo.\n`;
  prompt += `The lighting must look like a REAL photograph of a professionally lit home — not CGI, not illustrated, not cartoonish.\n`;
  prompt += `Add ONLY the specific fixtures listed below — nothing more.\n\n`;
  prompt += `IMAGE 1 is a nighttime photograph of a house with NO lights on.\n`;
  prompt += `IMAGE 2 is the SAME house with gradient overlays showing where lighting effects should appear.\n\n`;
  prompt += `YOUR TASK: Add photorealistic warm landscape lighting effects to IMAGE 1 at the exact positions and directions shown by the gradients in IMAGE 2.\n\n`;
  prompt += `ABSOLUTE RULES:\n`;
  prompt += `1. Render EXACTLY the fixture types specified — no substitutions\n`;
  prompt += `2. Place fixtures at EXACTLY the positions marked — no repositioning\n`;
  prompt += `3. Render EXACTLY ${count} light sources — NO MORE, NO LESS\n`;
  prompt += `4. Areas without markers MUST remain COMPLETELY DARK\n`;
  prompt += `5. Do NOT add lights for ANY reason not marked in IMAGE 2\n`;
  prompt += `6. Architecture and landscaping must be IDENTICAL to IMAGE 1\n`;
  prompt += `7. Remove ALL gradient overlays, labels, and markers — output is a CLEAN photo\n`;
  prompt += `8. Every window MUST remain dark — no interior lights\n\n`;

  // 1b. Exclusive fixture allowlist
  const allowlistLabelMap: Record<string, string> = {
    up: 'Ground-mounted uplight (brass cylinder, beam UP)',
    gutter: 'Invisible roof-edge light — soft warm wash ONLY on wall ABOVE, ZERO light below, NO visible fixture',
    path: 'Path light bollard (brass dome-top, 360° ground pool)',
    well: 'In-ground well light (flush, beam UP at trees)',
    hardscape: 'Step/hardscape light (LED bar under tread, beam DOWN)',
    coredrill: 'Core drill light (flush in concrete, beam UP, NO visible hardware)',
  };

  const allFixtureTypes = ['up', 'gutter', 'path', 'well', 'hardscape', 'coredrill'];
  const nonSelectedTypes = allFixtureTypes.filter(t => !presentTypes.has(t));

  prompt += `## EXCLUSIVE FIXTURE ALLOWLIST — ONLY THESE TYPES MAY EXIST\n`;
  prompt += `The ONLY lighting fixtures permitted in the output image are:\n`;
  for (const type of presentTypes) {
    if (allowlistLabelMap[type]) {
      prompt += `- ${allowlistLabelMap[type]}\n`;
    }
  }
  prompt += `\nNO OTHER light source of ANY kind may appear. This includes:\n`;
  prompt += `- NO ambient glow on surfaces without a marker\n`;
  prompt += `- NO fill light that softens dark areas\n`;
  prompt += `- NO bounce light, reflected light, or secondary illumination\n`;
  prompt += `- NO light that "completes" the scene aesthetically\n`;
  prompt += `VALIDATION: If ANY light source appears that is not in this allowlist = INVALID IMAGE\n\n`;

  // 1c. Prohibition-by-type for non-selected fixtures
  if (nonSelectedTypes.length > 0) {
    const darkDescriptions: Record<string, string> = {
      up: 'Wall bases remain in shadow, NO upward beam columns on walls from ground level',
      gutter: 'Roof edge is dark, NO mounted uplights, NO upward illumination onto 2nd story from the roofline',
      path: 'No bollard fixtures, no circular ground pools along walkways',
      well: 'No flush in-ground lights in landscape beds, no tree uplighting from ground',
      hardscape: 'Step risers remain dark, no light bars under treads',
      coredrill: 'Concrete/paver surfaces have no flush lights, no wall-grazing from driveways',
    };

    const promptLabelMap: Record<string, string> = { gutter: 'WASH-UP▲' };
    prompt += `## THESE FIXTURE TYPES WERE NOT SELECTED — THEY MUST NOT APPEAR\n`;
    for (const type of nonSelectedTypes) {
      if (darkDescriptions[type]) {
        const label = promptLabelMap[type] || type.toUpperCase();
        prompt += `- ${label}: ${darkDescriptions[type]}\n`;
      }
    }
    prompt += `\n`;
  }

  // 1d. Type authority rule
  prompt += `## TYPE AUTHORITY RULE\n`;
  prompt += `The fixture TYPE is determined EXCLUSIVELY by the marker label — NEVER by location.\n`;
  prompt += `- A marker labeled "WASH-UP▲" at ANY position = invisible roof-edge light, warm wash on wall ABOVE only, NO visible fixture — regardless of surroundings\n`;
  prompt += `- A marker labeled "UP" at ANY position = ground-mounted uplight, regardless of surroundings\n`;
  prompt += `- You MUST NOT substitute one fixture type for another based on where the marker is placed\n`;
  prompt += `- The user placed each marker deliberately — the marker label IS the user's intent\n\n`;

  // 1e. Essential preservation rules
  prompt += `## FRAMING & COMPOSITION PRESERVATION (CRITICAL)\n`;
  prompt += `- Output MUST have the EXACT SAME framing and composition as IMAGE 1\n`;
  prompt += `- Keep the ENTIRE house in frame — do NOT crop, zoom in, or cut off any part\n`;
  prompt += `- Do NOT change the camera angle, perspective, or viewpoint\n`;
  prompt += `- The aspect ratio and boundaries must match IMAGE 1 exactly\n\n`;

  prompt += `## PIXEL-PERFECT PRESERVATION\n`;
  prompt += `- The generated image must be a 1:1 edit of IMAGE 1\n`;
  prompt += `- Every building, tree, bush, object MUST appear EXACTLY as shown in IMAGE 1\n`;
  prompt += `- You are ONLY permitted to add the specific requested light fixtures — nothing else changes\n`;
  prompt += `- FORBIDDEN: Adding new trees, bushes, walkways, driveways, patios, steps, railings, windows, doors, or any matter not in IMAGE 1\n`;
  prompt += `- If IMAGE 1 has NO sidewalk, output has NO sidewalk. If IMAGE 1 has NO driveway, output has NO driveway.\n\n`;

  prompt += `## DARKNESS PRESERVATION\n`;
  prompt += `- IMAGE 1 is ALREADY correctly dark — PRESERVE this darkness level exactly\n`;
  prompt += `- Do NOT brighten the sky, add ambient light, or lighten shadows\n`;
  prompt += `- Sky must remain pitch black — no blue gradients, no twilight glow\n`;
  prompt += `- Unlit areas stay exactly as dark as they appear in IMAGE 1\n`;
  prompt += `- Only the landscape lighting fixtures provide meaningful illumination\n`;
  prompt += `- Light pools on ground: soft feathered edges. Hard surfaces reflect slightly more than grass/mulch.\n\n`;

  // 2. Image reference instruction (gradient map or marker-only)
  if (hasGradientImage) {
    prompt += `## DUAL-IMAGE REFERENCE\n`;
    prompt += `You are given TWO task images:\n`;
    prompt += `- IMAGE 1 (NIGHTTIME BASE): A nighttime photograph of the house with NO lights on — use as your BASE\n`;
    prompt += `- IMAGE 2 (ANNOTATED GUIDE): The same house (daytime) with semi-transparent directional hints and numbered markers showing where to add lights\n\n`;

    prompt += `## CRITICAL: CLEAN OUTPUT — NO ANNOTATIONS VISIBLE\n`;
    prompt += `The colored markers, numbers, text labels, and gradient overlays in IMAGE 2 are INVISIBLE GUIDES ONLY.\n`;
    prompt += `Your output MUST look like a clean, professional photograph with ZERO annotation artifacts:\n`;
    prompt += `- NO numbered circles or colored dots\n`;
    prompt += `- NO text labels or type names\n`;
    prompt += `- NO colored triangular or conical shapes\n`;
    prompt += `- NO gradient overlays or semi-transparent colored regions\n`;
    prompt += `- The output should be INDISTINGUISHABLE from a real nighttime photograph\n\n`;

    prompt += `## HOW TO USE THE ANNOTATED GUIDE\n`;
    prompt += `The faint warm-colored shapes in IMAGE 2 indicate ONLY two things:\n`;
    prompt += `- POSITION: Where each light fixture is located (center of the marker)\n`;
    prompt += `- DIRECTION: Which way the light beam points (upward shape = uplight, downward shape = downlight, circular = omnidirectional)\n\n`;
    prompt += `DO NOT reproduce the gradient shapes literally. The gradients are just POSITION and DIRECTION guides. Instead, render each light as:\n`;
    prompt += `- A soft, wide WALL WASH — the wall surface itself glows warmly, revealing its texture\n`;
    prompt += `- ABSOLUTELY NO hard triangles, cones, V-shapes, or geometric beam patterns\n`;
    prompt += `- Light that looks IDENTICAL to real professional landscape lighting photography\n`;
    prompt += `- The wall's material (stone, brick, siding) should be beautifully revealed by the warm light grazing across its surface\n`;
    prompt += `- Think: "the wall is glowing" NOT "a beam is hitting the wall"\n\n`;

    prompt += `## DIRECTION RULES\n`;
    prompt += `- Upward-pointing hints = light beams going UP the wall (uplights, WASH-UP▲ uplights, core drills)\n`;
    prompt += `- Downward-pointing hints = light beams going DOWN (step lights, hardscape lights)\n`;
    prompt += `- Circular hints = omnidirectional ground-level pools (path lights, bollards)\n`;
    prompt += `- NEVER reverse the indicated direction\n`;
    prompt += `- WASH-UP▲ markers beam UPWARD from the roof edge — INVISIBLE fixture, warm wash on wall ABOVE only, NO visible hardware, ZERO light below\n`;
    prompt += `- If a marker is at the roofline with an upward hint, render light going UP — NEVER render it as a downlight or sconce\n\n`;

    prompt += `## COUNT RULES\n`;
    prompt += `The guide contains EXACTLY ${count} fixture positions.\n`;
    prompt += `Your output MUST contain EXACTLY ${count} light effects — no more, no fewer.\n`;
    prompt += `Any area WITHOUT an annotated fixture MUST remain COMPLETELY DARK.\n\n`;

    prompt += `## PROHIBITED FIXTURES\n`;
    prompt += `Do NOT add any light sources that are not indicated by the annotated guide:\n`;
    prompt += `- NO wall-mounted sconces, lanterns, or decorative wall fixtures\n`;
    prompt += `- NO visible fixtures at WASH-UP▲ marker positions — the fixture is hidden and INVISIBLE\n`;
    prompt += `- NO porch lights, coach lights, or entrance fixtures\n`;
    prompt += `- NO string lights, recessed ceiling lights, or window glow\n`;
    prompt += `- The ONLY light sources in the scene are the ${count} fixtures marked in the guide\n`;
    prompt += `- If a wall, door, or garage has no marker near it, it must have NO fixture on it\n\n`;

    prompt += `## POSITION MATCHING RULE\n`;
    prompt += `Each marker's crosshair intersection is the PRECISE fixture location.\n`;
    prompt += `- Match horizontal position EXACTLY — if marker is at 35% from left, light must be at 35% from left\n`;
    prompt += `- Match vertical position EXACTLY — if marker is at 80% from top, light must be at 80% from top\n`;
    prompt += `- DO NOT "snap" fixtures to architectural features — marker position overrides any perceived "correct" location\n`;
    prompt += `- If a marker appears in an unusual position, TRUST THE MARKER — the user placed it deliberately\n`;
    prompt += `- For WASH-UP▲ markers specifically: the marker Y% position IS where the light originates — warm wash goes ABOVE this point only\n`;
    prompt += `Coordinates use: x=0% (far left) to x=100% (far right), y=0% (top) to y=100% (bottom). 0%,0% is the TOP-LEFT corner.\n\n`;
  } else {
    prompt += `## DUAL-IMAGE REFERENCE\n`;
    prompt += `You are given TWO task images (the last two images in this message):\n`;
    prompt += `- IMAGE 1 (NIGHTTIME BASE): A nighttime photograph of the house with NO lights on — use this as your BASE\n`;
    prompt += `- MARKED IMAGE: The same house (daytime) with bright colored numbered circle markers showing EXACTLY where to place each light fixture\n\n`;
    prompt += `Your task: Add professional landscape lighting effects to IMAGE 1 at the EXACT positions shown by the markers in the MARKED IMAGE. The output should look like IMAGE 1 with realistic lighting added — NO colored markers visible.\n\n`;
    prompt += `## POSITION MATCHING RULE\n`;
    prompt += `Each marker's crosshair intersection is the PRECISE fixture location.\n`;
    prompt += `- Match horizontal position EXACTLY — if marker is at 35% from left, light must be at 35% from left\n`;
    prompt += `- Match vertical position EXACTLY — if marker is at 80% from top, light must be at 80% from top\n`;
    prompt += `- DO NOT "snap" fixtures to architectural features — marker position overrides any perceived "correct" location\n`;
    prompt += `- If a marker appears in an unusual position, TRUST THE MARKER — the user placed it deliberately\n`;
    prompt += `- For WASH-UP▲ markers specifically: the marker Y% position IS where the light originates — warm wash goes ABOVE this point only\n`;
    prompt += `Coordinates use: x=0% (far left) to x=100% (far right), y=0% (top) to y=100% (bottom). 0%,0% is the TOP-LEFT corner of the image.\n\n`;
  }

  // 2b. Color-to-type mapping
  prompt += `## MARKER COLOR GUIDE (MARKED IMAGE)\n`;
  prompt += `Each marker on the MARKED IMAGE has a specific color indicating its fixture type:\n`;
  for (const type of presentTypes) {
    const c = colorMap[type];
    if (c) {
      const labelMap2: Record<string, string> = {
        up: 'UP light (ground-mounted, beam UP)',
        gutter: 'WASH-UP▲ (invisible roof-edge light — warm wash on wall ABOVE only, NO visible fixture)',
        path: 'PATH light (bollard on ground)',
        well: 'WELL light (in-ground, beam UP at trees)',
        hardscape: 'STEP/HARDSCAPE light (under tread)',
        coredrill: 'COREDRILL light (flush in concrete, beam UP)',
      };
      prompt += `- ${c.name} circle (${c.hex}) = ${labelMap2[type] || type}\n`;
    }
  }
  prompt += `\nEach marker also has a TEXT LABEL below it (UP, WASH-UP▲, PATH, etc.) confirming the type.\n`;
  prompt += `The NUMBER inside each circle is the fixture sequence number.\n\n`;

  // 3. Manual placement header
  prompt += `## CRITICAL: MANUAL PLACEMENT MODE — EXACTLY ${count} LIGHTS, ZERO EXTRAS\n`;
  prompt += `IMAGE 2 contains EXACTLY ${count} bright colored numbered circle markers.\n`;
  prompt += `Each marker shows the EXACT position and type of lighting fixture to place.\n`;
  prompt += `Place EXACTLY ${count} lights total — one per marker. ZERO additional lights anywhere.\n\n`;

  // 4. Spatial map with exact coordinates
  prompt += formatSpatialMapForPrompt(spatialMap);
  prompt += '\n';

  // 5. Fixture visual descriptions (only for types actually placed)
  prompt += `## FIXTURE TYPE REFERENCE — WHAT EACH MARKER LABEL MEANS\n\n`;

  if (presentTypes.has('up')) {
    prompt += `### "UP" MARKERS — Ground-Mounted Up Lights\n`;
    prompt += `- FIXTURE: The fixture itself is INVISIBLE at night — you should NOT see a brass cylinder or any hardware. The only visible element is the LIGHT it produces on the wall.\n`;
    prompt += `- MOUNTING: At ground level at the base of the wall.\n`;
    prompt += `- WHAT THE LIGHT LOOKS LIKE: A soft, wide WASH of warm light on the wall surface. NOT a hard triangle or cone shape. The light looks like a gentle glow that reveals the wall's texture (stone, brick, siding). Think of it as the wall itself glowing warmly — not a spotlight beam projected onto it.\n`;
    prompt += `- BEAM REACH: The warm wash covers the wall from near-ground ALL THE WAY UP to the roofline/eaves. The FULL wall height is illuminated. Brightest in the lower half, gently dimming toward the top — but light is still clearly visible at the roofline.\n`;
    prompt += `- BEAM WIDTH: Wide enough to softly illuminate 4-6 feet of wall width. The edges feather out gradually — NO hard edges, NO geometric shapes, NO triangles.\n`;
    prompt += `- TEXTURE INTERACTION: The light reveals the wall's material texture — stone mortar joints, brick patterns, siding lines. This is what makes it look REAL. The light grazes across the surface, creating subtle shadows in the texture.\n`;
    prompt += `- DO NOT DRAW THE FIXTURE — only draw the light effect on the wall. The fixture is hidden in landscaping and invisible at night.\n\n`;
  }

  if (presentTypes.has('path')) {
    prompt += `### "PATH" MARKERS — Path Lights\n`;
    prompt += `- FIXTURE: Cast brass "china hat" or dome-top path light, ~22 inches tall, solid brass with aged bronze patina\n`;
    prompt += `- MOUNTING: Post-mounted, staked in landscaping beds alongside walkways (NOT on pavement)\n`;
    prompt += `- BEAM DIRECTION: 360-degree omnidirectional downward distribution from under the hat\n`;
    prompt += `- LIGHT POOL: 6-8 foot diameter warm pools on the ground around the fixture\n\n`;
  }

  if (presentTypes.has('well')) {
    prompt += `### "WELL" MARKERS — In-Ground Well Lights\n`;
    prompt += `- FIXTURE: Flush-mounted in-ground well light, brass housing, tempered glass lens, zero protrusion\n`;
    prompt += `- MOUNTING: Completely flush with grade at ground level\n`;
    prompt += `- BEAM DIRECTION: Aims UPWARD — typically used to uplight trees and canopy\n`;
    prompt += `- LIGHT PHYSICS: Beam originates at ground level, projects upward; reveals bark texture, creates shadows in foliage\n\n`;
  }

  if (presentTypes.has('hardscape')) {
    prompt += `### "STEP" MARKERS — Hardscape / Step Lights\n`;
    prompt += `- FIXTURE: Linear LED light bar (7-19" length), low-profile brass housing, 12V\n`;
    prompt += `- MOUNTING: Under the tread nosing (front edge of step), facing downward\n`;
    prompt += `- BEAM DIRECTION: Projects DOWNWARD from under tread to illuminate the riser below\n`;
    prompt += `- Creates clear visual definition of each step edge; light spills onto the next tread below\n\n`;
  }

  if (presentTypes.has('soffit')) {
    prompt += `### "DOWN" MARKERS — Soffit Downlights\n`;
    prompt += `- FIXTURE: Recessed canless LED downlight, flush-mounted in soffit, IP65+ rated\n`;
    prompt += `- MOUNTING: Flush inside the soffit/roof overhang, no protrusion below soffit plane\n`;
    prompt += `- BEAM DIRECTION: Projects DOWNWARD from soffit toward ground\n`;
    prompt += `- Grazes window frames, columns, or wall surfaces depending on position\n\n`;
  }

  if (presentTypes.has('coredrill')) {
    prompt += `### "COREDRILL" MARKERS — Flush In-Ground Core Drill Lights\n`;
    prompt += `- FIXTURE: Flush-mounted well light recessed into CONCRETE or PAVERS, brass/stainless housing, tempered glass lens, vehicle-rated\n`;
    prompt += `- MOUNTING: Core-drilled into hardscape (concrete driveway, paver walkway), completely FLUSH with grade, ZERO protrusion above surface\n`;
    prompt += `- BEAM DIRECTION: Aims UPWARD to graze the wall/pier/column surface directly above the fixture\n`;
    prompt += `- TYPICAL USE: Garage door piers (flanking garage doors), concrete walkways, driveways\n`;
    prompt += `- The light washes UP the vertical wall/pier surface above it, reaching the roofline\n`;
    prompt += `- Distance from wall: 4-6 inches for proper grazing angle\n`;
    prompt += `- THIS IS NOT A TREE UPLIGHT — these are embedded in CONCRETE near walls/piers, NOT in landscape beds\n`;
    prompt += `- THIS IS NOT A PROTRUDING UPLIGHT — there is NO brass cylinder sticking up. The fixture is INVISIBLE, flush with the concrete surface\n\n`;
  }

  // WASH-UP▲ last — recency bias ensures the AI remembers this most-confused fixture type
  if (presentTypes.has('gutter')) {
    prompt += `### "WASH-UP▲" MARKERS — Invisible Roof-Edge Uplights (BEAM UPWARD ONLY)\n`;
    prompt += `- FIXTURE: COMPLETELY INVISIBLE — you must NOT draw ANY visible fixture, sconce, bracket, or hardware at this position. NOTHING visible at the mounting point.\n`;
    prompt += `- LIGHT EFFECT: A soft, wide WASH of warm light on the wall ABOVE the marker. The 2nd story wall glows warmly, revealing texture (stone, siding, stucco). NOT a hard beam — a natural, diffused wash.\n`;
    prompt += `- DIRECTION: UPWARD ONLY. ABSOLUTELY ZERO light below the marker. The surface below must remain completely DARK.\n`;
    prompt += `- REACH: Light washes ALL THE WAY UP from the marker to the peak/gable above — the FULL 2nd story wall height.\n`;
    prompt += `- NOT A WALL SCONCE — no visible fixture, no bidirectional light, no hardware. Only the warm glow on the wall above.\n`;
    prompt += `- Eave undersides are PITCH BLACK — light goes UP onto the wall above, never down. No recessed ceiling lights.\n`;
    prompt += `- The marker position tells you EXACTLY where the light originates.\n`;

    // Per-fixture coordinate reinforcement for gutter placements
    const gutterPlacements = spatialMap.placements.filter(p => p.fixtureType === 'gutter');
    const gutterStartIdx = spatialMap.placements.findIndex(p => p.fixtureType === 'gutter');
    gutterPlacements.forEach((p, i) => {
      const fixtureNum = gutterStartIdx + i + 1;
      prompt += `- WASH-UP▲ #${fixtureNum} at EXACTLY [${p.horizontalPosition.toFixed(1)}%, ${p.verticalPosition.toFixed(1)}%] — warm wall wash ABOVE this point ONLY. ZERO light below. NO visible fixture.\n`;
    });
    prompt += `\n`;

    // Positive-only eave darkness + upward confirmation (no soffit word)
    prompt += `## EAVE/OVERHANG AREAS — MUST BE PITCH BLACK\n`;
    prompt += `The underside of ALL roof overhangs and eaves MUST remain completely dark — deep shadow only.\n`;
    prompt += `- ZERO recessed lights, ZERO downward light cones from any overhang\n`;
    prompt += `- WASH-UP▲ markers near the roofline = light travels UPWARD onto the wall ABOVE\n`;
    prompt += `- VISUAL TEST: ALL light near the roofline must travel UPWARD. Any downward light from eaves = ERROR.\n`;
    prompt += `- The upward arrow (▲) on each WASH-UP▲ marker confirms: light goes UP.\n\n`;
  }

  // 6. Confusion prevention (UNCONDITIONAL — always include all distinctions)
  prompt += `## CRITICAL CONFUSION PREVENTION\n`;
  prompt += `### WASH-UP▲ = INVISIBLE UPWARD WASH (the ONLY correct interpretation)\n`;
  prompt += `- WASH-UP▲: INVISIBLE fixture — warm wash on wall ABOVE only, ZERO light below, NO visible hardware\n`;
  prompt += `- FORBIDDEN: Any visible wall-mounted fixture (sconce) at a WASH-UP▲ position\n`;
  prompt += `- FORBIDDEN: Any downward light from eaves or overhangs — eave undersides are PITCH BLACK\n`;
  prompt += `- If your render shows a visible fixture at a WASH-UP▲ position = WRONG\n`;
  prompt += `- If your render shows ANY downward light from the roofline area = WRONG\n`;
  prompt += `### COREDRILL ≠ UP (Different fixtures — do NOT confuse)\n`;
  prompt += `- COREDRILL: INVISIBLE fixture flush in concrete, no visible hardware above surface. Light grazes nearby wall/pier.\n`;
  prompt += `- UP: VISIBLE brass cylinder stake sitting on ground in landscaping bed. Distinct hardware visible.\n`;
  prompt += `- If a marker says "COREDRILL", there must be NO visible fixture — only the light beam on the wall above.\n`;
  prompt += `### COREDRILL ≠ WELL (Different locations)\n`;
  prompt += `- COREDRILL: Flush in CONCRETE/PAVERS near walls and garage piers\n`;
  prompt += `- WELL: Flush in LANDSCAPE BEDS near trees\n`;
  prompt += `- "UP" fixtures are at GROUND LEVEL aiming upward — NOT sconces, NOT wall-mounted, NOT high-mounted\n`;
  prompt += `- Every marker label tells you the EXACT fixture type. NEVER substitute one type for another.\n\n`;

  // 6b. Common mistakes section
  prompt += `## COMMON MISTAKES TO AVOID\n`;
  prompt += `- WRONG: Rendering a visible sconce/wall fixture for a "WASH-UP▲" marker\n`;
  prompt += `  RIGHT: WASH-UP▲ = INVISIBLE fixture, only a warm glow on the wall ABOVE is visible\n`;
  prompt += `- WRONG: Light going BOTH up and down from a "WASH-UP▲" marker (sconce behavior)\n`;
  prompt += `  RIGHT: WASH-UP▲ = light UP ONLY. Wall below the marker must remain DARK.\n`;
  prompt += `- WRONG: Rendering ANY downward light or recessed overhead light at a "WASH-UP▲" marker\n`;
  prompt += `  RIGHT: WASH-UP▲ = light goes UPWARD onto the wall above, eaves stay pitch black.\n`;
  prompt += `- WRONG: Rendering a visible brass cylinder for a "COREDRILL" marker\n`;
  prompt += `  RIGHT: Coredrill = invisible flush fixture in concrete, only the light beam is visible\n`;
  prompt += `- WRONG: Rendering a path light as a ground-level uplight (or vice versa)\n`;
  prompt += `  RIGHT: Path lights = tall bollards with 360° ground pools; uplights = short cylinders with narrow upward beams\n`;
  prompt += `- WRONG: Moving a light to a "nicer" position instead of the exact marker location\n`;
  prompt += `  RIGHT: Trust the marker position — the user placed it deliberately\n\n`;

  // 7. Lighting style — photorealism
  prompt += `## LIGHTING STYLE — MUST LOOK LIKE A REAL PHOTOGRAPH (MANDATORY)\n`;
  prompt += `The output must be INDISTINGUISHABLE from a real photograph of a professionally lit home at night.\n\n`;
  prompt += `- Color temperature: warm (2700K-3000K)\n`;
  prompt += `- SOFT WALL WASHES: Light appears as a gentle, wide glow on the wall surface — the wall GLOWS warmly. NEVER render hard-edged triangles, cones, V-shapes, or geometric spotlight beams.\n`;
  prompt += `- FULL WALL COVERAGE: Each uplight washes the wall from near-ground ALL THE WAY UP to the roofline/eaves. The entire wall height glows. Brightest in the lower half, gently fading toward the top — but still clearly visible at the roofline.\n`;
  prompt += `- TEXTURE REVELATION: The warm light grazes across the wall surface, beautifully revealing stone texture, brick mortar joints, or siding lines. This texture interaction is what makes the lighting look REAL.\n`;
  prompt += `- INVISIBLE FIXTURES: The light fixtures themselves are NOT visible at night. Do NOT draw brass cylinders, hardware, or any fixture body. Only draw the LIGHT EFFECT on the walls and surfaces.\n`;
  prompt += `- NO GEOMETRIC SHAPES: Real landscape lighting NEVER creates hard triangles or cone shapes on walls. It creates soft, diffused washes. If your output has any triangle or cone shapes, it is WRONG.\n`;
  prompt += `- REFERENCE: Look at professional landscape lighting photography — the walls glow warmly and evenly, fixtures are invisible, and the light reveals beautiful architectural texture.\n\n`;

  // 8. Absolute prohibition
  prompt += `## ABSOLUTELY FORBIDDEN — ZERO TOLERANCE\n`;
  prompt += `The following must have ZERO instances in the output:\n`;
  prompt += `- ANY light source without a corresponding numbered marker in IMAGE 2\n`;
  prompt += `- ANY recessed overhead lights or downward light from eaves (NONE were placed)\n`;
  prompt += `- Porch lights, sconces, lanterns, string lights, pendant lights\n`;
  prompt += `- Window glow, interior lights, ambient room lighting visible through glass\n`;
  prompt += `- Ambient illumination or sky glow beyond what the ${count} placed fixtures produce\n`;
  prompt += `- Decorative lights on walls, doors, columns, or any surface without a marker\n`;
  prompt += `- Areas of the house WITHOUT a marker MUST remain COMPLETELY DARK — no exceptions\n`;
  prompt += `- If you find yourself adding a light that doesn't correspond to a marker, STOP and REMOVE it\n`;
  prompt += `- Ambient glow on walls, ground, or surfaces without a corresponding marker\n`;
  prompt += `- Fill light that softens dark shadows between fixtures\n`;
  prompt += `- Bounce light, reflected illumination, or secondary light sources\n`;
  prompt += `- General illumination that "completes" the scene — darkness IS the design intent\n`;
  prompt += `- Light on walls, columns, garage doors, or any surface that has NO marker near it\n\n`;

  // 9. Marker checklist
  prompt += `## MARKER CHECKLIST — Verify EVERY marker is converted:\n`;
  const labelMap: Record<string, string> = {
    up: 'ground-mounted uplight (beam UP)',
    path: 'brass path light bollard',
    well: 'in-ground well light (beam UP)',
    hardscape: 'under-tread step light',
    gutter: 'invisible roof-edge uplight — warm wash on wall ABOVE only, no visible fixture',
    coredrill: 'flush in-ground core drill light (beam UP from concrete)'
  };
  spatialMap.placements.forEach((p, i) => {
    const label = labelMap[p.fixtureType] || 'light';
    prompt += `  ${i + 1}. Marker #${i + 1} → ${label} at [${p.horizontalPosition.toFixed(1)}%, ${p.verticalPosition.toFixed(1)}%]\n`;
  });
  prompt += `\nTOTAL: ${count} markers = EXACTLY ${count} lights in the output. No more, no less.\n\n`;

  // 10. Final verification
  prompt += `## FINAL VERIFICATION — COUNT EVERY LIGHT IN YOUR OUTPUT\n`;
  prompt += `1. Count all visible light sources in your generated image\n`;
  prompt += `2. You MUST have EXACTLY ${count} light sources — one for each marker\n`;
  prompt += `3. If you count FEWER than ${count}: you MISSED a marker — go back and add the missing light\n`;
  prompt += `4. If you count MORE than ${count}: you added an UNAUTHORIZED light — REMOVE it immediately\n`;
  prompt += `5. Verify each light matches its marker type (UP=upward beam from ground, WASH-UP▲=invisible uplight warm wall wash ABOVE only, PATH=bollard, etc.)\n`;
  let verifyNum = 6;
  if (presentTypes.has('gutter')) {
    prompt += `${verifyNum}. Verify ZERO downward lights from eaves AND ZERO visible sconces — WASH-UP▲ = invisible fixtures, upward wash only\n`;
    verifyNum++;
  }
  prompt += `${verifyNum}. For each light, verify it is within 3% of the marker's x,y coordinates\n`;
  prompt += `${verifyNum + 1}. If a light drifted to a "nicer" position, MOVE IT BACK to the marker position — user intent overrides aesthetics\n`;
  prompt += `\n`;

  // 11. Lighting parameters
  prompt += `## LIGHTING PARAMETERS\n`;
  prompt += `- Color Temperature: ${colorTemperaturePrompt}\n`;
  prompt += `- Light Intensity: ${lightIntensity}%\n`;
  prompt += `- Beam Angle: ${beamAngle}°\n\n`;

  return prompt;
}

/**
 * Validates manual placements before generation.
 * Checks fixture types, coordinate ranges, and counts.
 * Returns validation result — if invalid, generation should NOT proceed.
 */
const VALID_FIXTURE_TYPES = new Set(['up', 'gutter', 'path', 'well', 'hardscape', 'soffit', 'coredrill']);

function validateManualPlacements(spatialMap: SpatialMap): {
  valid: boolean;
  errors: string[];
  summary: { type: string; count: number; positions: string[] }[];
} {
  const errors: string[] = [];
  const countByType = new Map<string, { count: number; positions: string[] }>();

  // Check: must have at least one placement
  if (!spatialMap.placements || spatialMap.placements.length === 0) {
    errors.push('No fixture placements found — nothing to generate');
    return { valid: false, errors, summary: [] };
  }

  spatialMap.placements.forEach((p, i) => {
    const idx = i + 1;

    // A. Validate fixture type
    if (!p.fixtureType || !VALID_FIXTURE_TYPES.has(p.fixtureType)) {
      errors.push(`Fixture #${idx}: unknown type "${p.fixtureType}" (valid: ${[...VALID_FIXTURE_TYPES].join(', ')})`);
    }

    // B. Validate coordinates exist and are numbers
    if (typeof p.horizontalPosition !== 'number' || isNaN(p.horizontalPosition)) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): invalid X coordinate (${p.horizontalPosition})`);
    } else if (p.horizontalPosition < 0 || p.horizontalPosition > 100) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): X coordinate out of range: ${p.horizontalPosition.toFixed(1)}% (must be 0-100)`);
    }

    if (typeof p.verticalPosition !== 'number' || isNaN(p.verticalPosition)) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): invalid Y coordinate (${p.verticalPosition})`);
    } else if (p.verticalPosition < 0 || p.verticalPosition > 100) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): Y coordinate out of range: ${p.verticalPosition.toFixed(1)}% (must be 0-100)`);
    }

    // C. Accumulate counts by type
    if (p.fixtureType) {
      const entry = countByType.get(p.fixtureType) || { count: 0, positions: [] };
      entry.count++;
      if (typeof p.horizontalPosition === 'number' && typeof p.verticalPosition === 'number') {
        entry.positions.push(`[${p.horizontalPosition.toFixed(1)}%, ${p.verticalPosition.toFixed(1)}%]`);
      }
      countByType.set(p.fixtureType, entry);
    }
  });

  // Build summary
  const summary = [...countByType.entries()].map(([type, data]) => ({
    type,
    count: data.count,
    positions: data.positions,
  }));

  const totalCount = spatialMap.placements.length;
  const summaryStr = summary.map(s => `${s.count}x ${s.type.toUpperCase()}`).join(', ');
  console.log(`[Manual Mode] Validation: ${summaryStr} = ${totalCount} total`);
  summary.forEach(s => {
    console.log(`  ${s.type.toUpperCase()}: ${s.count} fixtures at ${s.positions.join(', ')}`);
  });

  return { valid: errors.length === 0, errors, summary };
}

/**
 * Post-generation verification: sends the generated image back to Gemini
 * for text-only analysis to count fixtures and compare against expected.
 * Returns a verification result (does NOT retry — just informs).
 */
async function verifyGeneratedImage(
  generatedImageBase64: string,
  imageMimeType: string,
  expectedPlacements: SpatialFixturePlacement[]
): Promise<{ verified: boolean; confidence: number; details: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const expectedCount = expectedPlacements.length;
    const expectedTypes = [...new Set(expectedPlacements.map(p => p.fixtureType))];

    const verificationPrompt = `You are analyzing a nighttime landscape lighting photograph.
Count EVERY visible light source or illuminated fixture in this image.

For each light source found, report:
- Type (uplight, gutter light, path light, well light, hardscape/step light, soffit downlight, core-drill light)
- Approximate position as [X%, Y%] where 0%,0% is top-left

EXPECTED: ${expectedCount} fixtures of types: ${expectedTypes.join(', ')}

Respond in this EXACT JSON format (no markdown, no code blocks):
{"count": <number>, "fixtures": [{"type": "<type>", "x": <number>, "y": <number>}], "confidence": <0-100>}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { data: generatedImageBase64, mimeType: imageMimeType } },
          { text: verificationPrompt }
        ],
      },
      config: {
        temperature: 0.1,
      },
    });

    const text = response.text?.trim() || '';
    console.log('[Manual Mode] Verification raw response:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Manual Mode] Verification: Could not parse response as JSON');
      return { verified: false, confidence: 0, details: 'Could not parse verification response' };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { count: number; fixtures: Array<{ type: string; x: number; y: number }>; confidence: number };
    const actualCount = parsed.count;
    const confidence = parsed.confidence || 0;
    const countMatch = actualCount === expectedCount;

    const details = `Expected ${expectedCount} fixtures, found ${actualCount}. Confidence: ${confidence}%. Types expected: [${expectedTypes.join(', ')}]`;

    if (countMatch) {
      console.log(`[Manual Mode] Verification PASSED: ${actualCount}/${expectedCount} fixtures confirmed (${confidence}% confidence)`);
    } else {
      console.warn(`[Manual Mode] Verification WARNING: Expected ${expectedCount} fixtures but found ${actualCount} (${confidence}% confidence)`);
      if (parsed.fixtures) {
        parsed.fixtures.forEach((f, i) => {
          console.warn(`  Found fixture ${i + 1}: ${f.type} at [${f.x}%, ${f.y}%]`);
        });
      }
    }

    return { verified: countMatch, confidence, details };
  } catch (error) {
    console.warn('[Manual Mode] Verification failed (non-blocking):', error);
    return { verified: false, confidence: 0, details: `Verification error: ${error}` };
  }
}

/**
 * PASS 1: Convert daytime photo to clean nighttime base with NO lights.
 * Result is cached by the caller so subsequent generations skip this step.
 */
export async function generateNightBase(
  imageBase64: string,
  imageMimeType: string,
  aspectRatio: string
): Promise<string> {
  console.log('[Pass 1] Generating nighttime base (no lights)...');

  const prompt = `Convert this daytime photograph into a photorealistic nighttime scene.

REQUIREMENTS:
- Deep 1AM darkness — pitch black sky, subtle stars, faint moon glow on clouds
- The house and landscaping should be barely visible — deep shadows everywhere
- Do NOT add ANY lighting fixtures, landscape lights, porch lights, sconces, or any artificial light sources
- Every window MUST be completely dark — no interior lights visible
- The entire scene should appear as if all power is off — naturally dark with only moonlight
- Preserve the EXACT framing, composition, architecture, and all objects pixel-perfect
- Do NOT add, remove, or modify any architectural elements, trees, bushes, or hardscape
- The ONLY change is the time of day: daytime → deep nighttime`;

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const resized = await resizeImageBase64(imageBase64, imageMimeType);

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [
        { inlineData: { data: resized, mimeType: imageMimeType } },
        { text: prompt }
      ]},
      config: {
        imageConfig: { imageSize: "2K", aspectRatio },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    }),
    API_TIMEOUT_MS,
    'Night base generation timed out.'
  );

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        console.log('[Pass 1] Nighttime base generated successfully.');
        return part.inlineData.data;
      }
    }
  }
  throw new Error('Night base generation returned no image.');
}

/**
 * Streamlined manual-mode generation (TWO-PASS).
 * Pass 1: Convert daytime → nighttime (cached via nightBaseBase64 param).
 * Pass 2: Add lighting effects to nighttime base using gradient overlays.
 */
export const generateManualScene = async (
  imageBase64: string,
  imageMimeType: string,
  spatialMap: SpatialMap,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  targetRatio: string,
  userPreferences?: UserPreferences | null,
  onStageUpdate?: (stage: string) => void,
  fixtures?: LightFixture[],
  nightBaseBase64?: string
): Promise<{ result: string; nightBase: string }> => {
  console.log('[Manual Mode] Starting two-pass manual generation...');
  console.log(`[Manual Mode] ${spatialMap.placements.length} fixtures to render`);
  console.log(`[Manual Mode] Night base cached: ${!!nightBaseBase64}`);

  // Validate placements before spending an API call
  const validation = validateManualPlacements(spatialMap);
  if (!validation.valid) {
    console.error('[Manual Mode] Validation FAILED:', validation.errors);
    throw new Error(`Manual placement validation failed:\n${validation.errors.join('\n')}`);
  }

  // ── PASS 1: Nighttime conversion (cached) ──────────────────────────────────
  let nightBase: string;
  if (nightBaseBase64) {
    console.log('[Pass 1] Using cached nighttime base — skipping generation.');
    nightBase = nightBaseBase64;
  } else {
    onStageUpdate?.('converting');
    nightBase = await generateNightBase(imageBase64, imageMimeType, targetRatio);
  }

  const workingNightBase = nightBase;
  const workingAspectRatio = targetRatio;

  // ── Gradient generation (painted on ORIGINAL daytime image for contrast) ───
  onStageUpdate?.('generating');

  const hasGradients = !!(fixtures && fixtures.length > 0);
  let gradientImage: string | undefined;
  let markedImage: string | undefined;

  if (hasGradients) {
    console.log(`[Manual Mode] Painting directional light gradients for ${fixtures!.length} fixtures...`);
    gradientImage = await paintLightGradients(imageBase64, fixtures!, imageMimeType);
    console.log('[Manual Mode] Gradient map painted (includes numbered markers).');
  } else {
    console.log('[Manual Mode] Drawing fixture markers...');
    markedImage = await drawFixtureMarkers(imageBase64, spatialMap, imageMimeType);
    console.log('[Manual Mode] Markers drawn.');
  }

  const workingSpatialMap = spatialMap;

  const manualPrompt = buildManualPrompt(
    workingSpatialMap,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    hasGradients
  );
  console.log('[Manual Mode] Prompt built. Length:', manualPrompt.length, 'characters');

  // Load few-shot reference examples for the selected fixture types
  const fixtureTypes = [...new Set(spatialMap.placements.map(p => p.fixtureType))];
  let referenceParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
  try {
    referenceParts = await buildReferenceParts(fixtureTypes);
    if (referenceParts.length > 0) {
      console.log(`[Manual Mode] Injecting ${referenceParts.length} reference parts for types: ${fixtureTypes.join(', ')}`);
    } else {
      console.log('[Manual Mode] No reference images available — generating without examples');
    }
  } catch (err) {
    console.warn('[Manual Mode] Reference loading failed (non-blocking):', err);
  }

  // ── PASS 2: Add lighting effects to nighttime base ─────────────────────────
  onStageUpdate?.('placing');
  console.log('[Pass 2] Sending nighttime base + gradient to Gemini for lighting...');

  const result = await generateNightScene(
    workingNightBase,
    manualPrompt,
    imageMimeType,
    workingAspectRatio,
    lightIntensity,
    beamAngle,
    colorTemperaturePrompt,
    userPreferences,
    markedImage,
    true,
    referenceParts.length > 0 ? referenceParts : undefined,
    gradientImage
  );

  console.log('[Pass 2] Lighting generation complete!');

  const finalResult = result;

  // Post-generation verification (non-blocking)
  onStageUpdate?.('verifying');
  const verification = await verifyGeneratedImage(finalResult, imageMimeType, spatialMap.placements);
  console.log(`[Manual Mode] Verification: ${verification.verified ? 'PASSED' : 'WARNING'} — ${verification.details}`);

  return { result: finalResult, nightBase };
};

/**
 * Enhanced Night Scene Generation using Gemini Pro 3 Only
 * This replaces the Claude + Gemini hybrid mode with a Gemini-only pipeline
 * while maintaining the same quality through ported features
 */
export const generateNightSceneEnhanced = async (
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  targetRatio: string,
  userPreferences?: UserPreferences | null,
  onStageUpdate?: (stage: string) => void,
  manualSpatialMap?: SpatialMap,
  manualFixtures?: LightFixture[]
): Promise<string> => {

  // ─── GEMINI PIPELINE ───────────────────────────────────────────────────────
  console.log('[Enhanced Mode] Starting Gemini generation...');

  // Step 1: Analyze property with Gemini (includes spatial mapping)
  onStageUpdate?.('analyzing');
  console.log('[Enhanced Mode] Step 1: Analyzing property with Gemini Pro 3...');
  const analysis = await analyzePropertyArchitecture(
    imageBase64,
    imageMimeType,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts
  );

  console.log('[Enhanced Mode] Analysis complete. Spatial map:', analysis.spatialMap ? 'included' : 'not included');

  // If manual placements exist, override the AI spatial map with user's placements
  if (manualSpatialMap && manualSpatialMap.placements.length > 0) {
    console.log(`[Enhanced Mode] Overriding AI spatial map with ${manualSpatialMap.placements.length} manual placements`);
    analysis.spatialMap = manualSpatialMap;
  }

  // Step 2: Build enhanced prompt using Claude's quality approach
  console.log('[Enhanced Mode] Step 2: Building enhanced prompt...');
  const enhancedPrompt = buildEnhancedPrompt(
    analysis,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    !!manualSpatialMap
  );

  console.log('[Enhanced Mode] Enhanced prompt built. Length:', enhancedPrompt.length, 'characters');

  // Step 3: Generate image with Gemini 3 Pro Image using enhanced prompt
  onStageUpdate?.('generating');

  // Manual mode: generate gradient map (includes markers) or markers-only fallback
  let markedImageForGemini: string | undefined;
  let gradientImageForGemini: string | undefined;
  if (manualSpatialMap && manualSpatialMap.placements.length > 0) {
    if (manualFixtures && manualFixtures.length > 0) {
      console.log(`[Enhanced Mode] Painting directional light gradients for ${manualFixtures.length} fixtures...`);
      gradientImageForGemini = await paintLightGradients(imageBase64, manualFixtures, imageMimeType);
      console.log('[Enhanced Mode] Gradient map painted (includes numbered markers).');
    } else {
      console.log('[Enhanced Mode] Drawing fixture markers on image copy for Gemini...');
      markedImageForGemini = await drawFixtureMarkers(imageBase64, manualSpatialMap, imageMimeType);
      console.log('[Enhanced Mode] Markers drawn. Sending clean + marked images to Gemini.');
    }
  }

  console.log('[Enhanced Mode] Step 3: Generating image with Gemini 3 Pro Image...');
  const result = await generateNightScene(
    imageBase64,              // Always send the CLEAN original
    enhancedPrompt,
    imageMimeType,
    targetRatio,
    lightIntensity,
    beamAngle,
    colorTemperaturePrompt,
    userPreferences,
    markedImageForGemini,     // Send marked image as second reference (fallback)
    undefined,                // rawPromptMode
    undefined,                // prefixParts
    gradientImageForGemini    // Send gradient map (preferred, includes markers)
  );

  console.log('[Enhanced Mode] Generation complete!');
  return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED ANALYSIS INTEGRATION
// Uses the new smart analysis system for better fixture suggestions
// ═══════════════════════════════════════════════════════════════════════════════

const ENHANCED_ANALYSIS_TIMEOUT_MS = 90000; // 90 seconds for comprehensive analysis

/**
 * Enhanced property analysis that provides smarter fixture suggestions
 * This is the improved version of analyzePropertyArchitecture
 */
export const enhancedAnalyzeProperty = async (
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  selectedFixtures?: string[],
  fixtureSubOptions?: Record<string, string[]>
): Promise<EnhancedHouseAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build context about user's current selections
  let selectionContext = '';
  if (selectedFixtures && selectedFixtures.length > 0) {
    selectionContext = `
## USER'S CURRENT FIXTURE SELECTIONS
Focus your suggestions on these selected types:
${selectedFixtures.map(f => `- ${f}: ${(fixtureSubOptions?.[f] || []).join(', ') || 'all sub-options'}`).join('\n')}
`;
  }

  const analysisPrompt = `${ENHANCED_ANALYSIS_SYSTEM_PROMPT}

${selectionContext}

Analyze this property photo and return a comprehensive JSON analysis with:

1. **style**: Architectural style (modern, traditional, craftsman, mediterranean, colonial, spanish, tudor, farmhouse, ranch, cape-cod, victorian, mid-century, transitional, contemporary, unknown)

2. **facadeWidth**: Facade width classification
   - "narrow" (<30 feet, 2-4 fixtures typical)
   - "medium" (30-50 feet, 4-8 fixtures typical)
   - "wide" (50-80 feet, 6-12 fixtures typical)
   - "extra-wide" (>80 feet, 10-20 fixtures typical)

3. **storyCount**: 1, 2, or 3

4. **wallHeight**: "8-12ft", "18-25ft", or "25+ft"

5. **architecturalFeatures**: Array of detected features
   [{
     "type": "gable|dormer|column|pilaster|archway|portico|bay-window|balcony|turret|chimney|shutters|corbels|dentil-molding",
     "count": <number>,
     "positions": ["<description>"],
     "lightingOpportunity": "high|medium|low",
     "suggestedApproach": "<how to light>"
   }]

6. **materials**: Array of detected materials
   [{
     "material": "brick|stone|stucco|siding-lap|siding-board-and-batten|vinyl|wood|concrete|glass|metal|mixed",
     "location": "<where on facade>",
     "percentage": <0-100>,
     "textureLevel": "smooth|light|moderate|heavy",
     "recommendedBeamAngle": <15|20|25|30|45>
   }]

7. **primaryMaterial**: Main facade material

8. **suggestedFixtures**: Array of smart fixture suggestions
   [{
     "fixtureType": "up|path|soffit|gutter|hardscape|coredrill",
     "subOption": "siding|windows|trees|columns|entryway|walkway|driveway|dormers|peaks",
     "count": <number>,
     "positions": [{
       "description": "<specific location>",
       "xPercent": <0-100 from left>,
       "yPercent": <0-100 from top>,
       "target": "<what this illuminates>"
     }],
     "spacing": "<spacing description>",
     "reasoning": "<why this placement>",
     "priority": <1-10, 1=highest>
   }]

9. **avoidZones**: Array of zones to avoid
   [{
     "id": "<unique-id>",
     "reason": "window-glare|door-obstruction|utility-equipment|hardscape-surface|hvac-unit|meter-box|spigot-hose",
     "description": "<what to avoid>",
     "xPercent": <0-100>,
     "yPercent": <0-100>,
     "radiusPercent": <0-20>,
     "severity": "critical|important|suggested"
   }]

10. **optimalUplightPositions**: Best uplight positions
    [{
      "id": "<unique-id>",
      "type": "optimal|acceptable",
      "description": "<position>",
      "xPercent": <0-100>,
      "yPercent": <0-100>,
      "suggestedFixture": "up",
      "reasoning": "<why good>"
    }]

11. **landscaping**: {
      "trees": { "count": <n>, "positions": ["<loc>"], "sizes": ["small|medium|large"], "uplightCandidates": <n> },
      "plantingBeds": { "present": <bool>, "locations": ["<loc>"], "fixtureAccessible": <bool> }
    }

12. **hardscape**: {
      "driveway": { "present": <bool>, "width": "narrow|standard|wide", "position": "left|right|center", "suggestedPathLightCount": <n> },
      "walkway": { "present": <bool>, "length": "short|medium|long", "style": "straight|curved", "suggestedPathLightCount": <n> }
    }

13. **entry**: {
      "type": "single|double|grand",
      "hasOverhang": <bool>,
      "hasColumns": <bool>,
      "hasSidelights": <bool>,
      "suggestedFixtureApproach": "<how to light>"
    }

14. **windows**: {
      "firstFloorCount": <n>,
      "secondFloorCount": <n>,
      "pattern": "symmetrical|asymmetrical|irregular",
      "positions": "<description>"
    }

15. **lightingApproach**: {
      "style": "clean-minimal|warm-welcoming|dramatic-shadow|balanced-traditional|statement-architectural",
      "description": "<1-2 sentences>",
      "intensityRecommendation": <0-100>,
      "beamAngleRecommendation": <15|20|25|30|45>,
      "colorTempRecommendation": "2700K|3000K|4000K",
      "reasoning": "<why this approach>"
    }

16. **fixtureSummary**: {
      "totalSuggestedCount": <n>,
      "byType": { "up": <n>, "path": <n>, ... },
      "estimatedSpacing": "<spacing>",
      "coverageNotes": "<notes>"
    }

17. **confidence**: <0-100>

18. **notes**: ["<special notes>"]

Return ONLY valid JSON. No markdown code blocks.`;

  try {
    const analyzePromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: analysisPrompt,
          },
        ],
      },
    });

    const response = await withTimeout(
      analyzePromise,
      ENHANCED_ANALYSIS_TIMEOUT_MS,
      'Enhanced property analysis timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const analysis: EnhancedHouseAnalysis = JSON.parse(jsonText);
            
            // Enrich with calculated recommendations from constants
            return enrichAnalysisWithRecommendations(analysis);
          } catch (parseError) {
            console.error('Failed to parse enhanced analysis JSON:', parseError);
            console.error('Raw response:', textPart.text);
            throw new Error('Failed to parse property analysis. Please try again.');
          }
        }
      }
    }

    throw new Error('No analysis generated. Please try again.');
  } catch (error) {
    console.error('Enhanced Property Analysis Error:', error);
    throw error;
  }
};

/**
 * Enriches the AI analysis with recommendations from our constants
 */
function enrichAnalysisWithRecommendations(analysis: EnhancedHouseAnalysis): EnhancedHouseAnalysis {
  const enriched = { ...analysis };
  
  // Get style-based recommendations
  const styleKey = (analysis.style || 'unknown') as ArchitecturalStyleType;
  const styleConfig = LIGHTING_APPROACH_BY_STYLE[styleKey] || LIGHTING_APPROACH_BY_STYLE['unknown'];
  
  // Get spacing recommendations based on facade width
  const widthKey = (analysis.facadeWidth || 'medium') as FacadeWidthType;
  const spacingConfig = SPACING_BY_FACADE_WIDTH[widthKey] || SPACING_BY_FACADE_WIDTH['medium'];
  
  // Get intensity recommendations based on wall height
  const heightKey = analysis.wallHeight || '8-12ft';
  const intensityConfig = INTENSITY_BY_WALL_HEIGHT[heightKey] || INTENSITY_BY_WALL_HEIGHT['8-12ft'];
  
  // Get beam angle based on primary material
  const materialKey = analysis.primaryMaterial || 'mixed';
  const beamConfig = BEAM_ANGLE_BY_MATERIAL[materialKey] || BEAM_ANGLE_BY_MATERIAL['mixed'];
  
  // Ensure lighting approach uses our constants if AI didn't provide good values
  if (!enriched.lightingApproach) {
    enriched.lightingApproach = {
      style: styleConfig.style,
      description: styleConfig.description,
      intensityRecommendation: Math.round((styleConfig.intensityRange[0] + styleConfig.intensityRange[1]) / 2),
      beamAngleRecommendation: beamConfig.angle,
      colorTempRecommendation: styleConfig.colorTemp,
      reasoning: `${styleConfig.description} Beam angle: ${beamConfig.reason}`
    };
  } else {
    // Validate/enhance AI's recommendations
    if (!enriched.lightingApproach.intensityRecommendation || 
        enriched.lightingApproach.intensityRecommendation < intensityConfig.min ||
        enriched.lightingApproach.intensityRecommendation > intensityConfig.max) {
      enriched.lightingApproach.intensityRecommendation = 
        Math.round((intensityConfig.min + intensityConfig.max) / 2);
    }
  }
  
  // Add feature-specific lighting guidelines to notes
  const featureNotes: string[] = [];
  for (const feature of enriched.architecturalFeatures || []) {
    const guideline = FEATURE_LIGHTING_GUIDELINES[feature.type];
    if (guideline && !feature.suggestedApproach) {
      feature.suggestedApproach = guideline;
      featureNotes.push(`${feature.type}: ${guideline}`);
    }
  }
  
  // Update fixture summary with spacing config
  if (!enriched.fixtureSummary) {
    enriched.fixtureSummary = {
      totalSuggestedCount: enriched.suggestedFixtures?.reduce((sum, f) => sum + f.count, 0) || 0,
      byType: {},
      estimatedSpacing: spacingConfig.idealSpacing,
      coverageNotes: spacingConfig.description
    };
  } else {
    enriched.fixtureSummary.estimatedSpacing = spacingConfig.idealSpacing;
  }
  
  // Calculate byType if not provided
  if (enriched.suggestedFixtures && enriched.suggestedFixtures.length > 0) {
    const byType: Record<string, number> = {};
    for (const fixture of enriched.suggestedFixtures) {
      byType[fixture.fixtureType] = (byType[fixture.fixtureType] || 0) + fixture.count;
    }
    enriched.fixtureSummary.byType = byType;
    enriched.fixtureSummary.totalSuggestedCount = 
      Object.values(byType).reduce((sum, n) => sum + n, 0);
  }
  
  // Add spacing guidance to notes
  enriched.notes = enriched.notes || [];
  enriched.notes.push(`Recommended spacing for ${widthKey} facade: ${spacingConfig.idealSpacing}`);
  enriched.notes.push(`Fixture range: ${spacingConfig.minFixtures}-${spacingConfig.maxFixtures} fixtures typical`);
  
  // Ensure confidence is set
  if (!enriched.confidence) {
    enriched.confidence = 75;
  }
  
  return enriched;
}

/**
 * Converts enhanced analysis to the legacy PropertyAnalysis format
 * for backwards compatibility with existing code
 */
export function enhancedToLegacyAnalysis(enhanced: EnhancedHouseAnalysis): PropertyAnalysis {
  return {
    architecture: {
      story_count: enhanced.storyCount,
      wall_height_estimate: enhanced.wallHeight,
      facade_materials: enhanced.materials.map(m => m.material as any) || [enhanced.primaryMaterial as any],
      windows: {
        first_floor_count: enhanced.windows?.firstFloorCount || 0,
        second_floor_count: enhanced.windows?.secondFloorCount || 0,
        positions: enhanced.windows?.positions || ''
      },
      columns: {
        present: enhanced.architecturalFeatures?.some(f => f.type === 'column') || false,
        count: enhanced.architecturalFeatures?.find(f => f.type === 'column')?.count || 0
      },
      dormers: {
        present: enhanced.architecturalFeatures?.some(f => f.type === 'dormer') || false,
        count: enhanced.architecturalFeatures?.find(f => f.type === 'dormer')?.count || 0
      },
      gables: {
        present: enhanced.architecturalFeatures?.some(f => f.type === 'gable') || false,
        count: enhanced.architecturalFeatures?.find(f => f.type === 'gable')?.count || 0
      },
      entryway: {
        type: enhanced.entry?.type || 'single',
        has_overhang: enhanced.entry?.hasOverhang || false
      }
    },
    landscaping: {
      trees: {
        count: enhanced.landscaping?.trees?.count || 0,
        sizes: enhanced.landscaping?.trees?.sizes || [],
        positions: enhanced.landscaping?.trees?.positions?.join(', ')
      },
      planting_beds: {
        present: enhanced.landscaping?.plantingBeds?.present || false,
        locations: enhanced.landscaping?.plantingBeds?.locations || []
      }
    },
    hardscape: {
      driveway: {
        present: enhanced.hardscape?.driveway?.present || false,
        width_estimate: enhanced.hardscape?.driveway?.width || 'standard',
        position: enhanced.hardscape?.driveway?.position
      },
      walkway: {
        present: enhanced.hardscape?.walkway?.present || false,
        length_estimate: enhanced.hardscape?.walkway?.length || 'medium',
        style: enhanced.hardscape?.walkway?.style || 'straight',
        description: ''
      },
      patio: { present: false },
      sidewalk: { present: false }
    },
    recommendations: {
      optimal_intensity: enhanced.lightingApproach?.intensityRecommendation 
        ? (enhanced.lightingApproach.intensityRecommendation < 45 ? 'subtle' 
           : enhanced.lightingApproach.intensityRecommendation < 60 ? 'moderate'
           : enhanced.lightingApproach.intensityRecommendation < 75 ? 'bright' : 'high_power')
        : 'moderate',
      optimal_beam_angle: (enhanced.lightingApproach?.beamAngleRecommendation || 30) as 15 | 30 | 45 | 60,
      fixture_counts: enhanced.fixtureSummary?.byType || {},
      fixture_positions: Object.fromEntries(
        (enhanced.suggestedFixtures || []).map(sf => [
          `${sf.fixtureType}_${sf.subOption}`,
          sf.positions.map(p => p.description)
        ])
      ),
      priority_areas: enhanced.suggestedFixtures
        ?.sort((a, b) => a.priority - b.priority)
        .map(sf => `${sf.fixtureType} - ${sf.subOption}`) || [],
      notes: enhanced.notes?.join(' ') || enhanced.lightingApproach?.description || ''
    }
  };
}

/**
 * Helper to generate explanation for why a fixture was suggested
 */
export function explainSuggestedFixture(suggestion: SuggestedFixture): string {
  const lines: string[] = [];
  
  lines.push(`## ${suggestion.fixtureType.toUpperCase()} - ${suggestion.subOption}`);
  lines.push(`**Count:** ${suggestion.count} fixtures`);
  lines.push(`**Spacing:** ${suggestion.spacing}`);
  lines.push(`**Priority:** ${suggestion.priority}/10`);
  lines.push('');
  lines.push(`### Why This Placement`);
  lines.push(suggestion.reasoning);
  lines.push('');
  lines.push('### Positions');
  
  suggestion.positions.forEach((pos, i) => {
    lines.push(`${i + 1}. **${pos.description}**`);
    lines.push(`   - Illuminates: ${pos.target}`);
    lines.push(`   - Location: ${pos.xPercent}% from left, ${pos.yPercent}% from top`);
  });
  
  return lines.join('\n');
}

/**
 * Get fixture suggestions filtered by user's selections
 */
export function getFilteredSuggestions(
  analysis: EnhancedHouseAnalysis,
  selectedFixtures: string[],
  selectedSubOptions: Record<string, string[]>
): SuggestedFixture[] {
  if (!analysis.suggestedFixtures) return [];
  
  return analysis.suggestedFixtures.filter(suggestion => {
    if (!selectedFixtures.includes(suggestion.fixtureType)) return false;
    
    const subs = selectedSubOptions[suggestion.fixtureType];
    if (subs && subs.length > 0 && !subs.includes(suggestion.subOption)) return false;
    
    return true;
  }).sort((a, b) => a.priority - b.priority);
}