
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

// Analysis model - Gemini 3 Pro for best reasoning + multimodal understanding (USER PREFERENCE: ALWAYS USE THE BEST)
const ANALYSIS_MODEL_NAME = 'gemini-3-pro-preview';
const ANALYSIS_TIMEOUT_MS = 60000; // 1 minute for analysis

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
        "label": "Far left corner"
      },
      {
        "id": "window_1",
        "type": "window",
        "horizontalPosition": <0-100 percentage from left>,
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
        "anchor": "<description like 'right_of corner_left' or 'below window_1'>",
        "description": "<human-readable like 'At far LEFT corner, in landscaping bed'>"
      }
    ]
  }
}

SPATIAL MAPPING INSTRUCTIONS:
1. Map all architectural features (windows, doors, columns, corners, dormers, gables, gutters) with horizontal positions (0% = far left, 100% = far right)
2. For each selected fixture to place, specify EXACT horizontal position and anchor it to a feature
3. Use percentage-based coordinates for precise placement
4. Create narrative descriptions for each fixture placement

Base your analysis on:
- Wall height determines intensity (taller = brighter)
- Brick/stone needs narrow beam (15-30°) for texture grazing
- Smooth siding works with wider beams (30-45°)
- Walkway spacing: path light every 6-8 feet
- Window up lights: one centered below each first-floor window
- Siding up lights: one in each wall section between windows`;

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
      ANALYSIS_TIMEOUT_MS,
      'Property analysis timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find(p => p.text);
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
  } catch (error) {
    console.error('Property Analysis Error:', error);
    throw error;
  }
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
  analysis: PropertyAnalysis,
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

        placements.push({
          fixtureType,
          subOption,
          count,
          positions,
          spacing,
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
  analysis: PropertyAnalysis,
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

IMPORTANT: If the user provided placement notes, use their descriptions as the PRIMARY guide for fixture positions. Their notes override default placement logic.

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
      "positions": ["<SPECIFIC position with visual anchor 1>", "<SPECIFIC position with visual anchor 2>", "..."],
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
  analysis: PropertyAnalysis,
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

    // Add visual description for gutter fixtures to help AI distinguish from soffit lights AND prevent roof placement
    const gutterVisualDescription = placement.fixtureType === 'gutter' ? `

GUTTER FIXTURE VISUAL APPEARANCE (CRITICAL):
- Small bronze bullet fixture (size of a fist) peaking out over the roof INSIDE the metal gutter channel
- The fixture is VISIBLE - you can see it sitting in the gutter trough
- Light beam projects UPWARD from this fixture toward the target above
- The gutter fixture is OUTSIDE the eave, sitting IN the metal gutter, shining UP

*** CRITICAL MOUNTING LOCATION - INSIDE THE GUTTER TROUGH ***
GUTTER ANATOMY: A gutter is a U-shaped metal channel that runs along the 1st story roofline to collect rainwater.
- The INSIDE of the gutter is the U-shaped channel where water flows
- Fixtures MUST sit INSIDE this U-shaped channel, against the INNER WALL (closest to house)
- The fixture is PARTIALLY HIDDEN by the gutter walls - only the top is visible from below

MANDATORY PLACEMENT:
- INSIDE the 1st story gutter trough (in the U-channel where water flows)
- Against the INNER GUTTER WALL (the wall closest to the fascia/house)
- The fixture sits DOWN inside the gutter channel

ABSOLUTELY FORBIDDEN PLACEMENTS:
- ON THE ROOF SURFACE (shingles) - NEVER
- ON THE GUTTER LIP/EDGE (the outer rim of the gutter) - NEVER
- ON TOP OF THE GUTTER (sitting on the visible edge) - NEVER
- ON THE FASCIA BOARD (the vertical board behind the gutter) - NEVER
- ANYWHERE prominently visible on the roofline - NEVER

VISUAL TEST: If you can see the entire fixture from ground level, it's placed WRONG.
The fixture should be PARTIALLY OBSCURED by the gutter walls because it sits INSIDE the channel.` : '';

    return {
      fixture: placement.fixtureType,
      fixtureLabel: fixtureType?.label || placement.fixtureType,
      subOption: placement.subOption,
      subOptionLabel: subOption?.label || placement.subOption,
      count: placement.count,
      positions: placement.positions,
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

  // ALWAYS add explicit soffit prohibition unless soffit is selected
  const soffitSelected = selectedFixtureIds.includes('soffit');
  const explicitSoffitProhibition = soffitSelected ? '' : `
## SOFFIT LIGHTS - ABSOLUTE PROHIBITION (CRITICAL)
SOFFIT LIGHTS ARE NOT SELECTED. The following is MANDATORY:
- ZERO fixtures in soffits or eaves
- Eave undersides remain PITCH BLACK
- NO downlights, NO recessed lights, NO can lights in eaves
- Any soffit "glow" is ONLY from up lights reflecting upward - NOT from fixtures IN the soffit
- Do NOT add soffit lights "for realism" or "to complete the design"
- UP LIGHTS shine UP. SOFFIT LIGHTS shine DOWN. They are OPPOSITES.
- If you see "soffit reach" or "soffit glow" that means REFLECTED light from UP LIGHTS, NOT soffit fixtures
`;

  // When GUTTER is selected, add extra-strong soffit prohibition to prevent confusion
  const gutterSelected = selectedFixtureIds.includes('gutter');
  const gutterSoffitClarification = gutterSelected ? `

## GUTTER LIGHTS vs SOFFIT LIGHTS - CRITICAL DISTINCTION
YOU HAVE SELECTED: GUTTER-MOUNTED UP LIGHTS (fixtures IN the gutter, shining UP)
YOU HAVE NOT SELECTED: SOFFIT LIGHTS (fixtures IN the eave, shining DOWN)

*** DO NOT CONFUSE THESE - THEY ARE OPPOSITES ***

GUTTER UP LIGHTS (SELECTED - GENERATE THESE):
- Fixture Location: INSIDE the metal gutter trough/channel
- Fixture Appearance: Small brass/bronze bullet visible sitting IN the gutter
- Beam Direction: UPWARD toward dormers, gables, or 2nd story facade
- Light travels: FROM gutter UP TO higher features
- You can SEE the fixture sitting in the gutter

SOFFIT LIGHTS (NOT SELECTED - DO NOT GENERATE):
- Fixture Location: Recessed IN the soffit/eave underside
- Fixture Appearance: Flush-mounted can light in eave
- Beam Direction: DOWNWARD onto porch, ground, or windows
- Light travels: FROM eave DOWN TO ground
- Fixture is recessed/hidden in the eave

VISUAL TEST:
- If fixture is INSIDE the gutter trough and light goes UP = CORRECT (gutter light)
- If fixture is IN the eave and light goes DOWN = WRONG (soffit light - forbidden)

SOFFIT MUST REMAIN DARK:
- Eave undersides remain pitch black
- NO downlights, NO can lights, NO recessed fixtures in eaves
- Any glow on soffit is ONLY reflected ambient light from gutter lights hitting walls below

GUTTER MOUNTING LOCATION - ABSOLUTE REQUIREMENTS:
*** FIXTURES MUST BE INSIDE THE GUTTER TROUGH - NOT ON THE ROOF ***

WHAT "INSIDE THE GUTTER" MEANS:
- Gutters are U-shaped metal channels attached below the roofline
- The fixture sits DOWN INSIDE this U-channel, against the inner wall
- Water flows around the fixture (it's weather-sealed)
- Only the top portion of the fixture is visible from below

WHAT "ON THE ROOF" MEANS (FORBIDDEN):
- Fixture sitting ON shingles or roofing material - FORBIDDEN
- Fixture mounted to visible roof surface - FORBIDDEN
- Fixture prominently visible on the roofline - FORBIDDEN
- Fixture on the outer edge/lip of the gutter - FORBIDDEN

ROOF PLACEMENT = WRONG. INSIDE GUTTER TROUGH = CORRECT.
If you place fixtures ON the roof surface, the image is INVALID.
` : '';

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
${allowlistItems.map(item => `
- ${item.fixtureLabel.toUpperCase()} / ${item.subOptionLabel.toUpperCase()}:
  - Count: ${item.count} fixtures
  - Positions: ${item.positions.map((pos, i) => `FIXTURE ${i + 1}: ${pos}`).join('; ')}
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
EFFECT: Each fixture creates an ISOLATED vertical column of light
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
  }));

  // PRE-CHECK: Position count must match fixture count
  const positionMismatches: string[] = [];
  expectedCounts.forEach(c => {
    if (c.positionsCount !== c.count) {
      positionMismatches.push(
        `Position/count mismatch for ${c.type}/${c.subOption}: ${c.count} fixtures requested but ${c.positionsCount} positions specified`
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

## CRITICAL CHECK 5: SOFFIT PROHIBITION (MOST COMMON ERROR)
${!expectedFixtureTypes.includes('soffit') ? `
- SOFFIT IS NOT IN THE SELECTED FIXTURES - this is a CRITICAL check
- Verify the prompt explicitly PROHIBITS soffit lights/downlights
- Look for phrases like: "soffit must remain dark", "no downlights", "eaves pitch black"
- FAIL if: The prompt mentions soffit lighting without explicit prohibition
- FAIL if: The prompt says "soffit glow" without clarifying it's REFLECTED light from up lights
- This is the MOST COMMON hallucination error - be extra strict here
` : '- Soffit IS selected, so soffit lights are allowed'}

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

ALSO CHECK SOFFIT DISTINCTION:
- Gutter lights are UP LIGHTS (shine upward) - NOT soffit lights (shine down)
- FAIL if: prompt describes downward beams when gutter lights are selected
- FAIL if: fixtures described as in soffit/eave instead of in gutter
- FAIL if: "soffit" appears without explicit prohibition/dark description
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
  analysis: PropertyAnalysis,
  plan: LightingPlan,
  colorTemp: string,
  userPreferences?: UserPreferences | null
): string => {
  const { architecture, landscaping, hardscape, recommendations } = analysis;

  // Build placement instructions with exact positions
  const placementInstructions = plan.placements.map(p => `
## ${p.fixtureType.toUpperCase()} LIGHTS - ${p.subOption.toUpperCase()}
- Quantity: Place EXACTLY ${p.count} fixtures (count them!)
- Positions: ${p.positions.join('; ')}
- Spacing: ${p.spacing}
`).join('\n');

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
- Light must travel full height (${architecture.story_count === 1 ? '8-12ft' : architecture.story_count === 2 ? '18-25ft' : '25+ft'}) to soffit
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
    `- ${f.fixtureType.toUpperCase()} LIGHTS - ${f.subOption}: ${f.count} fixtures`
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

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg',
  aspectRatio: string = '1:1',
  lightIntensity: number = 45,
  beamAngle: number = 30,
  colorTemperaturePrompt: string = "Use Soft White (3000K) for all lights.",
  userPreferences?: UserPreferences | null
): Promise<string> => {
  
  // Initialization: The API key is obtained from environment variable
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Map sliders (0-100) to descriptive prompt instructions with height-based wattage guidance
  // Map sliders (0-100) to descriptive prompt instructions with realistic lighting physics
  const getIntensityPrompt = (val: number) => {
    if (val < 25) return `LIGHTING INTENSITY: SUBTLE (2-3W LED equivalent, 150-300 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Faint accent glow providing ambient definition
- Light barely reaches first story soffit (8-10 ft max reach)
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

SOFFIT INTERACTION (CRITICAL - NO SOFFIT FIXTURES):
- Up light beams travel UP and may reach soffit level
- Soffit receives REFLECTED ambient glow from light hitting wall below
- This is NOT the same as soffit fixtures - there are NO fixtures IN the soffit
- The soffit glow is dim, ambient, and clearly comes from BELOW
- Do NOT add any downlights or fixtures in the eave to "enhance" this effect

BEST FOR: Ambient mood, pathway marking, subtle accent, intimate settings`;

    if (val < 50) return `LIGHTING INTENSITY: MODERATE (4-5W LED equivalent, 300-500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Standard 1st story reach (8-12 ft walls)
- Light comfortably reaches soffit with gentle falloff
- Visible wall grazing that reveals texture WITHOUT hot spots
- Soft beam edges with 6-8 inch feather/transition zone
- Subtle atmospheric glow visible near fixture lens
- Small bloom halo around fixture (1-2 inch radius)

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 4ft: 25%
- Brightness at 8ft: 6%
- Brightness at 12ft (soffit): 3% - still visible

TEXTURE REVELATION:
- Sufficient intensity to show brick mortar joints
- Siding shadow lines visible but not harsh
- Stone texture defined but not over-emphasized

SOFFIT INTERACTION (CRITICAL - NO SOFFIT FIXTURES):
- Up light beams travel UP and reach soffit level
- Soffit receives REFLECTED ambient glow from light hitting wall below
- This is NOT the same as soffit fixtures - there are NO fixtures IN the soffit
- The soffit glow is dim, ambient, and clearly comes from BELOW
- Do NOT add any downlights or fixtures in the eave to "enhance" this effect

BEST FOR: Single-story homes, accent features, balanced residential lighting`;

    if (val < 75) return `LIGHTING INTENSITY: BRIGHT (6-8W LED equivalent, 500-800 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- 2nd story reach (18-25 ft walls)
- Strong wall grazing traveling to higher soffits
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

SOFFIT INTERACTION (CRITICAL - NO SOFFIT FIXTURES):
- Up light beams travel UP and reach soffit level on taller walls
- Soffit receives REFLECTED ambient glow from light hitting wall below
- This is NOT the same as soffit fixtures - there are NO fixtures IN the soffit
- The soffit glow is moderate, ambient, and clearly comes from BELOW
- Do NOT add any downlights or fixtures in the eave to "enhance" this effect

BEST FOR: Two-story facades, tall trees, dramatic accent lighting`;

    return `LIGHTING INTENSITY: HIGH POWER (10-15W LED equivalent, 800-1500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Full 2-3 story reach (25+ ft walls)
- Intense beams traveling to tall soffits and gable peaks
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

SOFFIT INTERACTION (CRITICAL - NO SOFFIT FIXTURES):
- Up light beams travel UP and reach soffit/gable level on tall walls
- Soffit receives REFLECTED ambient glow from light hitting wall below
- This is NOT the same as soffit fixtures - there are NO fixtures IN the soffit
- The soffit glow is visible, ambient, and clearly comes from BELOW
- Do NOT add any downlights or fixtures in the eave to "enhance" this effect

BEST FOR: Tall facades, commercial properties, dramatic architectural statements`;
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return `BEAM ANGLE: 15 DEGREES (NARROW SPOT) - MAXIMUM DRAMA

BEAM GEOMETRY:
- Tight, focused columns of light
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
    - **Soffit/Eave Defaults**: DEFAULT OFF unless explicitly requested.
    - **Beam Hygiene**: Light sources must be realistic (cone shape, natural falloff).
    - **Color Temperature (MANDATORY)**: ${colorTemperaturePrompt} This is a HARD RULE - ALL lights MUST use this exact color temperature unless the user explicitly specifies a different temperature in the DESIGN REQUEST notes below.
    - **Intensity**: ${getIntensityPrompt(lightIntensity)}
    - **Beam**: ${getBeamAnglePrompt(beamAngle)}
    - **FIXTURE QUANTITIES (ABSOLUTE - NON-NEGOTIABLE)**: When the DESIGN REQUEST specifies "EXACTLY X fixtures", you MUST place EXACTLY X fixtures. Not X-1, not X+1, EXACTLY X. Count them. Recount them. This is non-negotiable. Never add "extra" fixtures to balance or complete the design.
    - **SOFFIT REACH RULE**: Up lights MUST reach the soffit/eave line. The light beam should:
      * Start bright at the fixture (avoid hot spot by angling back 15-20 degrees from wall)
      * Travel UP the wall surface (wall grazing effect)
      * Fade gradually as it approaches the soffit
      * The soffit itself receives subtle reflected glow, NOT direct illumination
      * Taller walls require more intensity to reach the soffit
      * The beam should be visible traveling up the wall, not just illuminating a spot

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
    - NO soffit/downlights unless "Soffit Lights" is explicitly in DESIGN REQUEST
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
    - BRICK/STONE: Light catches texture, creates micro-shadows in mortar joints
    - VINYL/ALUMINUM SIDING: Slight sheen, horizontal shadow lines from overlap
    - STUCCO: Diffuse reflection, soft appearance, minimal texture shadows
    - WOOD: Warm absorption, grain may be visible, natural material feel
    - PAINTED SURFACES: Color temperature affects perceived paint color

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
            text: systemPrompt,
          },
        ],
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

  // Sort left to right
  const sorted = [...placements].sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  const label = subOption ? `${fixtureType} (${subOption})` : fixtureType;
  let narrative = `### ${label.toUpperCase()}\n`;
  narrative += `Scanning LEFT to RIGHT, you will see exactly ${sorted.length} fixtures:\n\n`;

  sorted.forEach((p, i) => {
    const positionDesc =
      p.horizontalPosition < 15 ? 'near the left edge' :
      p.horizontalPosition > 85 ? 'near the right edge' :
      `at ${Math.round(p.horizontalPosition)}% from the left`;

    narrative += `${i + 1}. Fixture ${positionDesc} - ${p.description}\n`;
  });

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
  output += `The facade spans 0% (far left) to 100% (far right).\n\n`;

  // Reference points
  if (spatialMap.features.length > 0) {
    output += `### REFERENCE POINTS:\n`;
    const sortedFeatures = [...spatialMap.features].sort((a, b) => a.horizontalPosition - b.horizontalPosition);
    sortedFeatures.forEach(f => {
      output += `- ${f.label}: ${f.horizontalPosition}%\n`;
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
  beamAngle: number
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
  let prompt = SYSTEM_PROMPT.masterInstruction + '\n\n';

  // Add fixture inventory
  prompt += `## COMPLETE FIXTURE INVENTORY\n`;
  prompt += `This image will contain EXACTLY these fixtures and NO OTHERS:\n`;
  prompt += inventoryAllowlist || '- None selected\n';
  if (totalFixtureCount > 0) {
    prompt += `\nTOTAL FIXTURES IN IMAGE: ${totalFixtureCount}\n`;
  }
  prompt += '\n';

  // Add prohibition verification
  prompt += `## PROHIBITION VERIFICATION\n`;
  prompt += `These fixture types MUST NOT appear AT ALL (ZERO instances):\n`;
  prompt += inventoryProhibitions || '- None\n';
  prompt += '\n';
  prompt += `VERIFICATION RULE: Before finalizing the image, mentally count all fixtures. If the count exceeds the inventory above, REMOVE the extras. If any prohibited fixture types appear, REMOVE them entirely.\n\n`;

  // Add spatial placement map if available
  if (analysis.spatialMap && analysis.spatialMap.placements.length > 0) {
    prompt += formatSpatialMapForPrompt(analysis.spatialMap);
    prompt += '\n';
  }

  // Add lighting parameters
  prompt += `## LIGHTING PARAMETERS\n`;
  prompt += `- Color Temperature: ${colorTemperaturePrompt}\n`;
  prompt += `- Light Intensity: ${lightIntensity}%\n`;
  prompt += `- Beam Angle: ${beamAngle}°\n\n`;

  // Add closing reinforcement
  prompt += SYSTEM_PROMPT.closingReinforcement;

  return prompt;
}

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
  userPreferences?: UserPreferences | null
): Promise<string> => {
  console.log('[Enhanced Mode] Starting Gemini-only generation...');

  // Step 1: Analyze property with Gemini (includes spatial mapping)
  console.log('[Enhanced Mode] Step 1: Analyzing property with Gemini Pro 3...');
  const analysis = await analyzePropertyArchitecture(
    imageBase64,
    imageMimeType,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts
  );

  console.log('[Enhanced Mode] Analysis complete. Spatial map:', analysis.spatialMap ? 'included' : 'not included');

  // Step 2: Build enhanced prompt using Claude's quality approach
  console.log('[Enhanced Mode] Step 2: Building enhanced prompt...');
  const enhancedPrompt = buildEnhancedPrompt(
    analysis,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle
  );

  console.log('[Enhanced Mode] Enhanced prompt built. Length:', enhancedPrompt.length, 'characters');

  // Step 3: Generate image with Gemini 3 Pro Image using enhanced prompt
  console.log('[Enhanced Mode] Step 3: Generating image with Gemini 3 Pro Image...');
  const result = await generateNightScene(
    imageBase64,
    enhancedPrompt, // User instructions (our comprehensive enhanced prompt)
    imageMimeType,
    targetRatio,
    lightIntensity,
    beamAngle,
    colorTemperaturePrompt,
    userPreferences
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