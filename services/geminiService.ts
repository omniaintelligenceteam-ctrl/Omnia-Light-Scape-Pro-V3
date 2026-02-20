
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, ThinkingLevel } from "@google/genai";
import type { UserPreferences, PropertyAnalysis, SpatialMap, SpatialFixturePlacement } from "../types";
// FixtureType and SystemPromptConfig imports removed (used by deleted Stages 2-4)
import {
  LIGHTING_APPROACH_BY_STYLE,
  SPACING_BY_FACADE_WIDTH,
  BEAM_ANGLE_BY_MATERIAL,
  INTENSITY_BY_WALL_HEIGHT,
  FEATURE_LIGHTING_GUIDELINES,
  ENHANCED_ANALYSIS_SYSTEM_PROMPT,
  FIXTURE_TYPES,
  SYSTEM_PROMPT,
  DEEP_THINK_SYSTEM_PROMPT,
  type ArchitecturalStyleType,
  type FacadeWidthType
} from "../constants";
import type { EnhancedHouseAnalysis, SuggestedFixture } from "../src/types/houseAnalysis";
import { drawFixtureMarkers } from "./canvasNightService";
import { buildReferenceParts } from "./referenceLibrary";
import { paintLightGradients } from "./lightGradientPainter";
import type { LightFixture, GutterLine } from "../types/fixtures";
import { rotationToDirectionLabel, hasCustomRotation } from "../utils/fixtureConverter";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

// Timeout for API calls (2 minutes)
const API_TIMEOUT_MS = 120000;
const MAX_PHOTOREAL_RETRY_ATTEMPTS = 1;
const PHOTOREAL_MIN_SCORE = 85;

// Non-selected fixture types, including soffit, are explicitly forbidden in prompt assembly.

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP THINK OUTPUT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

interface DeepThinkOutput {
  prompt: string;
  fixtureCount?: number;
  fixtureBreakdown?: Record<string, number>;
  analysisNotes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE INTENSITY / BEAM ANGLE DESCRIPTIONS (used by Deep Think input)
// ═══════════════════════════════════════════════════════════════════════════════

function getIntensityDescription(val: number): string {
  if (val < 25) return `LIGHTING INTENSITY: SUBTLE (2-3W LED equivalent, 150-300 lumens)
- Faint accent glow, light barely reaches first story roofline (8-10 ft max)
- Soft, gentle pools with gradual falloff, extremely soft beam edges
- Brightness at 2ft: 100%, at 4ft: 25%, at 8ft: 6% (barely visible)
- Best for: Ambient mood, pathway marking, subtle accent`;

  if (val < 50) return `LIGHTING INTENSITY: MODERATE (4-5W LED equivalent, 300-500 lumens)
- Standard 1st story reach (8-12 ft walls), comfortably reaches roofline
- Visible wall grazing that reveals texture WITHOUT hot spots
- Brightness at 2ft: 100%, at 4ft: 25%, at 8ft: 6%, at 12ft: 3% (still visible)
- Sufficient to show brick mortar joints, siding shadow lines
- Best for: Single-story homes, accent features, balanced residential lighting`;

  if (val < 75) return `LIGHTING INTENSITY: BRIGHT (6-8W LED equivalent, 500-800 lumens)
- 2nd story reach (18-25 ft walls), strong wall grazing full wall height
- More pronounced beam visibility, subtle atmospheric effect near fixture
- Brightness at 2ft: 100%, at 6ft: 11%, at 12ft: 3%, at 20ft: 1% (still visible)
- Strong shadows in brick/stone mortar joints, dramatic siding shadow lines
- Best for: Two-story facades, tall trees, dramatic accent lighting`;

  return `LIGHTING INTENSITY: HIGH POWER (10-15W LED equivalent, 800-1500 lumens)
- Full 2-3 story reach (25+ ft walls), intense beams reaching tall walls and gable peaks
- Maximum wall coverage with strong definition, pronounced atmospheric scatter
- Brightness at 2ft: 100%, at 8ft: 6%, at 16ft: 1.5%, at 25ft: 0.6%
- Maximum shadow definition, deep mortar joint shadows, dramatic texture grazing
- Best for: Tall facades, commercial properties, dramatic architectural statements`;
}

function getBeamAngleDescription(angle: number): string {
  if (angle <= 15) return `BEAM ANGLE: 15° (NARROW SPOT) — MAXIMUM DRAMA
- Tight focused beams, spread: ~2.6ft at 10ft, ~5.2ft at 20ft
- Ideal for revealing surface texture, deep mortar joint shadows
- Creates VISIBLE DARK GAPS between fixtures — the professional look
- Best for: Columns, narrow wall sections, focal points`;

  if (angle <= 30) return `BEAM ANGLE: 30° (SPOT) — PROFESSIONAL STANDARD
- Defined beam with moderate spread: ~5.4ft at 10ft, ~10.8ft at 20ft
- Excellent balance of texture revelation and coverage
- Creates visible separation between fixture illumination zones
- Best for: Facade accent lighting, medium trees, general professional use`;

  if (angle >= 60) return `BEAM ANGLE: 60° (WIDE FLOOD) — AREA COVERAGE
- Broad even wash: ~11.5ft at 10ft, ~23ft at 20ft
- Very soft edges, no distinct beam boundary
- WARNING: Reduced texture revelation, can create flat uniform appearance
- Best for: Large blank facades, area lighting where drama is NOT the goal`;

  return `BEAM ANGLE: 45° (FLOOD) — BALANCED COVERAGE
- Standard professional spread: ~8.3ft at 10ft, ~16.6ft at 20ft
- Moderate texture revelation, soft but discernible beam shape
- May require closer spacing to maintain dark gaps
- Best for: General facade lighting, medium wall areas`;
}

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

interface PhotorealismVerificationResult {
  passed: boolean;
  score: number;
  details: string;
  issues: string[];
}

function extractBase64Data(imageOrDataUri: string): string {
  const commaIndex = imageOrDataUri.indexOf(',');
  return commaIndex >= 0 ? imageOrDataUri.slice(commaIndex + 1) : imageOrDataUri;
}

function extractMimeType(imageOrDataUri: string, fallback: string): string {
  if (!imageOrDataUri.startsWith('data:')) return fallback;
  const mimeMatch = imageOrDataUri.match(/^data:(.*?);base64,/);
  return mimeMatch?.[1] || fallback;
}

function buildPhotorealismLockAddendum(): string {
  return `

=== PHOTOREALISM LOCK (NON-NEGOTIABLE) ===
- Sky must be true black (#000000 to #0A0A0A) with ONE realistic full moon.
- Preserve natural inverse-square falloff (brightest mid-wall, not at fixture base).
- Use conical beams with soft feathered edges (no hard geometric light shapes).
- Maintain visible dark gaps between adjacent fixtures (no uniform wall wash).
- Preserve architecture/materials pixel-accurately; no invented structures or fake texture.
- Keep warm amber residential tone (2700K-3000K) unless explicitly overridden by user.
- If any requirement conflicts, prioritize photorealism and physical light behavior.
`;
}

function buildPhotorealismCorrectionPrompt(
  basePrompt: string,
  issues: string[]
): string {
  const issueList = issues.length > 0
    ? issues.map((issue, idx) => `${idx + 1}. ${issue}`).join('\n')
    : '1. Output looked synthetic/flat and lacked realistic light behavior.';

  return `${basePrompt}

=== PHOTOREALISM CORRECTION PASS ===
The previous output failed realism checks. Correct ONLY the lighting realism while preserving placement/count.
Address these issues:
${issueList}

MANDATORY FIXES:
- Restore deep black sky with one realistic moon only.
- Reintroduce conical beams, feathered edges, and inverse-square falloff.
- Reinstate dark gaps between fixtures; avoid flat/uniform washes.
- Preserve original architecture and material texture fidelity.
- Keep warm residential amber tone.
`;
}

async function verifyPhotorealism(
  generatedImageBase64: string,
  imageMimeType: string
): Promise<PhotorealismVerificationResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Evaluate this nighttime architectural lighting image for PHOTOREALISM.

Score realism from 0-100 using this checklist:
1) Sky is pure black (#000000 to #0A0A0A) with one realistic full moon
2) Warm amber residential lighting (2700K-3000K feel)
3) Inverse-square falloff (no base hot-spot dominance, natural attenuation)
4) Distinct dark gaps between fixture pools (not uniform wall wash)
5) Soft feathered beam edges + conical spread (not geometric/hard-edged beams)
6) Original architecture/materials preserved and believable texture revelation

Respond in exact JSON (no markdown):
{"score": <0-100>, "passed": <true|false>, "issues": ["<issue1>", "<issue2>"]}`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: generatedImageBase64, mimeType: imageMimeType } },
          { text: prompt },
        ],
      },
      config: { temperature: 0.1 },
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        passed: false,
        score: 0,
        details: 'Photoreal verification parse failed.',
        issues: ['Unable to parse photorealism analysis response.'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      score?: number;
      passed?: boolean;
      issues?: string[];
    };
    const score = typeof parsed.score === 'number' ? parsed.score : 0;
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const passed = parsed.passed === true || (score >= PHOTOREAL_MIN_SCORE && issues.length === 0);
    const details = `Photoreal score ${score}/100. ${issues.length > 0 ? `Issues: ${issues.join(' | ')}` : 'No major realism issues detected.'}`;
    return { passed, score, details, issues };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      details: `Photoreal verification error: ${error}`,
      issues: ['Verification service error.'],
    };
  }
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

// Analysis model - Gemini 3.1 Pro with Deep Think for property analysis
const ANALYSIS_MODEL_NAME = 'gemini-3.1-pro-preview';
const ANALYSIS_TIMEOUT_MS = 120000; // 120 seconds for Deep Think analysis

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
- Brick/stone needs narrow beam (15-30Â°) for texture grazing
- Smooth siding works with wider beams (30-45Â°)
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
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
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
        // Skip thinking parts (thought: true) — grab the final output text
        const textPart = candidate.content.parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).pop();
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
      resolve(canvas.toDataURL(mimeType, 0.95).split(',')[1]);
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

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

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

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Single-story homes, accent features, balanced residential lighting`;

    if (val < 75) return `LIGHTING INTENSITY: BRIGHT (6-8W LED equivalent, 500-800 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- 2nd story reach (18-25 ft walls)
- Strong wall grazing reaching full wall height
- More pronounced beam visibility and definition
- Visible light cone in air near fixture (subtle atmospheric effect)
- Noticeable bloom around fixture lens (2-3 inch radius)
- Light beam reaches ground with soft falloff at edges
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

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Two-story facades, tall trees, dramatic accent lighting`;

    return `LIGHTING INTENSITY: HIGH POWER (10-15W LED equivalent, 800-1500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Full 2-3 story reach (25+ ft walls)
- Intense beams reaching tall walls and gable peaks
- Maximum wall coverage with strong definition
- Pronounced atmospheric scatter near fixture (visible light cone)
- Strong lens bloom and halo effect (3-4 inch radius)
- Wide beam coverage with natural falloff at edges
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

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Tall facades, commercial properties, dramatic architectural statements`;
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return `BEAM ANGLE: 15 DEGREES (NARROW SPOT) - MAXIMUM DRAMA

BEAM GEOMETRY:
- Tight, focused conical beams (narrow at fixture, widening gradually upward)
- Spread calculation: diameter = distance Ã— 0.26 (tan 15Â°)
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
- Spread calculation: diameter = distance Ã— 0.54 (tan 30Â°)
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
- Spread calculation: diameter = distance Ã— 1.73 (tan 60Â°)
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
- Spread calculation: diameter = distance Ã— 1.0 (tan 45Â°)
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

    # STEP 1: PRESERVE THE SOURCE IMAGE EXACTLY (MANDATORY)
    - The output MUST be a pixel-perfect copy of the source photo with ONLY light effects added
    - Do NOT add, remove, or modify ANY architectural features, landscaping, or hardscape
    - Do NOT add windows, doors, walkways, driveways, trees, or any object not in the source
    - Every pixel that is NOT directly illuminated by a requested fixture stays UNCHANGED

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
    - **Eave/Overhang Areas**: Remain DARK â€” no fixtures in eaves unless explicitly requested.
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
    - The area where it WOULD be placed remains in deep shadow â€” ZERO LIGHT
    - ABSENCE = ABSOLUTE PROHIBITION â€” no exceptions for any reason

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
    - Light beams are CONICAL (narrow at fixture, organic spread) â€” NOT geometric cylinders with straight edges
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
    - BRICK/STONE: Light catches texture, creates micro-shadows in mortar joints â€” beam edges follow mortar/texture relief, NOT straight geometric lines
    - VINYL/ALUMINUM SIDING: Slight sheen, horizontal shadow lines from overlap â€” beam interacts with siding texture, NOT uniform geometric wash
    - STUCCO: Diffuse reflection, soft appearance, minimal texture shadows
    - WOOD: Warm absorption, grain may be visible, natural material feel
    - PAINTED SURFACES: Color temperature affects perceived paint color
    - ALL SURFACES: Beam edges appear organic and slightly irregular, never ruler-straight

    ## LIGHT CONTAINMENT
    - Light ONLY appears where fixtures directly illuminate
    - No ambient glow, no fill light, no bounce light beyond the fixture beam
    - Unlit surfaces remain in deep shadow exactly as in the source image

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

    // Build parts array â€” send both clean + marked images for manual placement mode
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
    // rawPromptMode: send userInstructions directly, skip auto-mode system prompt wrapper.
    // Always append photorealism lock so quality constraints remain explicit.
    const finalPromptText = `${rawPromptMode ? userInstructions : systemPrompt}\n${buildPhotorealismLockAddendum()}`;
    imageParts.push({ text: finalPromptText });

    const generatePromise = ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: imageParts,
      },
      config: {
        temperature: 0.1,
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DIRECT GENERATION MODE (FAST - Single API Call)
// Skips analysis/planning/prompting/validation stages for ~60-70% faster generation
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  const beamDesc = beamAngle < 20 ? 'NARROW SPOT (15-20Â°)' : beamAngle < 40 ? 'MEDIUM FLOOD (25-40Â°)' : 'WIDE FLOOD (45-60Â°)';

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
  prompt += '=== PROHIBITED FIXTURES (MUST REMAIN DARK) ===\n\n';
  const nonSelectedFixtures = FIXTURE_TYPES.filter(f =>
    !selectedFixtures.includes(f.id)
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
  prompt += `\n${buildPhotorealismLockAddendum()}`;

  console.log('=== DIRECT GENERATION MODE ===');
  console.log('Selected fixtures:', selectedFixtures);
  console.log('Sub-options:', fixtureSubOptions);
  console.log('Counts:', fixtureCounts);
  console.log('Prompt length:', prompt.length, 'characters');

  try {
    const runDirectGeneration = async (promptText: string): Promise<string> => {
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
              text: promptText,
            },
          ],
        },
        config: {
          temperature: 0.1,
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
              const detectedMimeType = part.inlineData.mimeType || 'image/png';
              return `data:${detectedMimeType};base64,${base64Data}`;
            }
          }
        }
      }

      throw new Error("Direct generation returned no image. Try the full pipeline mode.");
    };

    let result = await runDirectGeneration(prompt);
    let photorealCheck = await verifyPhotorealism(
      extractBase64Data(result),
      extractMimeType(result, imageMimeType)
    );
    console.log(`[Direct Mode] Photorealism: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);

    if (!photorealCheck.passed) {
      for (let attempt = 1; attempt <= MAX_PHOTOREAL_RETRY_ATTEMPTS; attempt++) {
        const correctionPrompt = buildPhotorealismCorrectionPrompt(prompt, photorealCheck.issues);
        const retryResult = await runDirectGeneration(correctionPrompt);
        const retryPhotoreal = await verifyPhotorealism(
          extractBase64Data(retryResult),
          extractMimeType(retryResult, imageMimeType)
        );

        if (retryPhotoreal.passed || retryPhotoreal.score >= photorealCheck.score) {
          result = retryResult;
          photorealCheck = retryPhotoreal;
        }

        if (photorealCheck.passed) break;
      }
    }

    console.log('✓ Direct generation successful');
    return result;
  } catch (error) {
    console.error("Direct Generation Error:", error);
    throw error;
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPATIAL MAPPING UTILITIES (Ported from claudeService.ts)
// Used for Enhanced Gemini Pro 3 Mode
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    up: 'small bronze uplight at wall base, beam UPWARD â€” place at EXACT marked position, shine in EXACT marked direction',
    gutter: 'small uplight seated INSIDE the rain gutter trough at this EXACT mount position (slightly below gutter edge), beam UPWARD on wall directly above â€” DO NOT move from marked position, NO downlights',
    path: 'small bronze fixture in landscaping, 360Â° ground pool â€” place at EXACT marked position',
    well: 'small bronze uplight at ground level, beam UPWARD at tree canopy â€” place at EXACT marked position',
    hardscape: 'small bronze fixture under step tread, beam DOWNWARD onto riser â€” place at EXACT marked position',
    soffit: 'small bronze recessed fixture flush in soffit, beam DOWNWARD â€” place at EXACT marked position',
    coredrill: 'TINY flush bronze disc in concrete (~3” diameter), beam UPWARD â€” place at EXACT marked position, NO visible hardware',
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
    const gutterSuffix = fixtureType === 'gutter' ? ' EXACTLY IN THE GUTTER TROUGH at this precise mount position (slightly below gutter edge) â€" DO NOT move or redistribute' : '';
    const coords = `Place at EXACTLY [${xCoord}%, ${yCoord}%]${gutterSuffix}`;
    const gutterLineHint = fixtureType === 'gutter' && typeof p.gutterLineX === 'number' && typeof p.gutterLineY === 'number'
      ? ` (gutter line anchor [${p.gutterLineX.toFixed(1)}%, ${p.gutterLineY.toFixed(1)}%])`
      : '';
    const gutterDepthHint = fixtureType === 'gutter' && typeof p.gutterMountDepthPercent === 'number'
      ? ` (mount depth ${p.gutterMountDepthPercent.toFixed(1)}% below line)`
      : '';

    // Per-fixture beam direction override when user has custom rotation
    let fixtureRenderAs = renderAs;
    let directionNote = '';
    if (p.rotation !== undefined && hasCustomRotation(p.rotation, p.fixtureType)) {
      const dirLabel = rotationToDirectionLabel(p.rotation);
      fixtureRenderAs = fixtureRenderAs
        .replace(/beam UPWARD[^,–]*/gi, `beam ${dirLabel}`)
        .replace(/beam DOWNWARD[^,–]*/gi, `beam ${dirLabel}`);
      directionNote = ` â€" BEAM DIRECTION: ${dirLabel} (user-specified, MUST be honored exactly)`;
    }

    // Per-fixture beam length notation
    let beamNote = '';
    if (p.beamLength !== undefined && Math.abs(p.beamLength - 1.0) > 0.05) {
      beamNote = p.beamLength > 1.0
        ? ` â€" EXTENDED beam (${p.beamLength.toFixed(1)}x reach)`
        : ` â€" SHORT beam (${p.beamLength.toFixed(1)}x reach)`;
    }

    narrative += `FIXTURE ${i + 1} (${typeLabel}): ${coords}${gutterLineHint}${gutterDepthHint}`;
    if (p.description) {
      narrative += ` â€" ${p.description}`;
    }
    narrative += ` â€" Render as: ${fixtureRenderAs}${directionNote}${beamNote}\n`;
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

  // Add position enforcement for gutter fixtures
  if (fixtureType === 'gutter') {
    narrative += `\nGUTTER POSITION ENFORCEMENT: Every gutter light MUST remain at its EXACT marked [X%, Y%] mount position INSIDE the gutter trough (slightly below edge). Do NOT redistribute, rebalance, or evenly space them. The user placed each gutter light at a specific location â€" that location is non-negotiable.\n`;
  }

  // Add direction enforcement for non-gutter fixtures with rotations
  const rotatedFixtures = sorted.filter(p => p.rotation !== undefined && hasCustomRotation(p.rotation, p.fixtureType));
  if (rotatedFixtures.length > 0) {
    narrative += `\nDIRECTION ENFORCEMENT: ${rotatedFixtures.length} fixture(s) above have user-specified beam directions. Each light MUST shine in its marked direction â€" do NOT default to straight up/down.\n`;
  }

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
  output += `### CRITICAL POSITIONING RULES\n`;
  output += `- GUTTER MOUNTED UP LIGHTS: Each gutter light MUST stay at its EXACT [X%, Y%] mount position inside the gutter trough (slightly below gutter edge). Do NOT move, shift, redistribute, or evenly space them. Each gutter light shines UPWARD from its exact marked spot.\n`;
  output += `- ALL OTHER FIXTURES: Each fixture MUST be rendered at its EXACT [X%, Y%] position AND its light beam MUST shine in the EXACT direction specified by its rotation. If a fixture points UP-RIGHT, the light goes UP-RIGHT. If it points LEFT, the light goes LEFT.\n`;
  output += `- The user is a professional lighting designer. Every position and direction is intentional and non-negotiable.\n\n`;

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

// ═══════════════════════════════════════════════════════════════════════════════
// 2-STAGE PIPELINE: Deep Think → Nano Banana Pro
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assembles all reference data for Deep Think to generate its prompt.
 * This replaces the role of buildEnhancedPrompt/buildManualPrompt by providing
 * raw materials to Deep Think rather than assembling the prompt directly.
 */
function buildDeepThinkInput(
  mode: 'auto' | 'manual',
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null,
  spatialMap?: SpatialMap
): { systemPrompt: string; fixtureReference: string; userSelections: string; lightingParams: string; preferenceContext: string; spatialMapContext?: string } {

  // 1. Build fixture reference data (selected + prohibited)
  let fixtureReference = '';

  // Selected fixtures with full definitions
  fixtureReference += '### SELECTED FIXTURES (USER WANTS THESE)\n\n';
  selectedFixtures.forEach(fixtureId => {
    const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
    if (!fixtureType) return;

    const subOpts = fixtureSubOptions[fixtureId] || [];

    fixtureReference += `#### ${fixtureType.label.toUpperCase()} (id: ${fixtureType.id})\n`;
    fixtureReference += `Description: ${fixtureType.description}\n`;
    fixtureReference += `Prompt guidance: ${fixtureType.positivePrompt}\n\n`;

    // Selected sub-options with counts
    subOpts.forEach(subOptId => {
      const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
      if (!subOpt) return;
      const count = fixtureCounts[subOptId];
      const countStr = count !== null && count !== undefined
        ? `EXACTLY ${count} (user-specified, non-negotiable)`
        : 'AUTO (you determine optimal count based on property)';
      fixtureReference += `  Sub-option: ${subOpt.label} (id: ${subOpt.id})\n`;
      fixtureReference += `  Count: ${countStr}\n`;
      fixtureReference += `  Placement rules: ${subOpt.prompt}\n\n`;
    });

    // Non-selected sub-options (prohibited within this fixture type)
    const nonSelected = fixtureType.subOptions?.filter(s => !subOpts.includes(s.id)) || [];
    if (nonSelected.length > 0) {
      fixtureReference += `  PROHIBITED sub-options within ${fixtureType.label}:\n`;
      nonSelected.forEach(subOpt => {
        fixtureReference += `  - ${subOpt.label}: FORBIDDEN. ${subOpt.darkDescription || subOpt.negativePrompt}\n`;
      });
      fixtureReference += '\n';
    }
  });

  // Non-selected fixture types (complete prohibition)
  fixtureReference += '### PROHIBITED FIXTURES (MUST NOT APPEAR)\n\n';
  FIXTURE_TYPES.forEach(ft => {
    if (!selectedFixtures.includes(ft.id)) {
      fixtureReference += `- ${ft.label}: FORBIDDEN. ${ft.negativePrompt}\n`;
    }
  });

  // 2. Build user selections summary
  let userSelections = '### USER FIXTURE SELECTIONS\n';
  selectedFixtures.forEach(fId => {
    const ft = FIXTURE_TYPES.find(f => f.id === fId);
    if (!ft) return;
    const subs = fixtureSubOptions[fId] || [];
    userSelections += `- ${ft.label}: ${subs.map(s => {
      const count = fixtureCounts[s];
      return `${s}${count !== null && count !== undefined ? ` (EXACTLY ${count})` : ' (Auto)'}`;
    }).join(', ')}\n`;
  });

  // 3. Build lighting parameter descriptions
  let lightingParams = '### LIGHTING PARAMETERS\n';
  lightingParams += `Color Temperature: ${colorTemperaturePrompt}\n`;
  lightingParams += `Intensity: ${lightIntensity}%\n`;
  lightingParams += getIntensityDescription(lightIntensity) + '\n\n';
  lightingParams += `Beam Angle: ${beamAngle}°\n`;
  lightingParams += getBeamAngleDescription(beamAngle) + '\n';

  // 4. Preference context
  const preferenceContext = buildPreferenceContext(userPreferences);

  // 5. Spatial map context (manual mode)
  let spatialMapContext: string | undefined;
  if (spatialMap && spatialMap.placements.length > 0) {
    spatialMapContext = formatSpatialMapForPrompt(spatialMap);
  }

  // 6. Select system prompt based on mode
  const systemPrompt = mode === 'auto'
    ? DEEP_THINK_SYSTEM_PROMPT.autoMode
    : DEEP_THINK_SYSTEM_PROMPT.manualMode;

  return {
    systemPrompt,
    fixtureReference,
    userSelections,
    lightingParams,
    preferenceContext,
    spatialMapContext,
  };
}

/**
 * Stage 1 (New Pipeline): Deep Think analyzes the property photo and writes
 * the complete generation prompt for Nano Banana Pro.
 * Replaces: analyzePropertyArchitecture() + buildEnhancedPrompt() / buildManualPrompt()
 */
export async function deepThinkGeneratePrompt(
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null,
  spatialMap?: SpatialMap,
  gradientImageBase64?: string,
  markedImageBase64?: string,
  isManualMode?: boolean
): Promise<DeepThinkOutput> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const mode = isManualMode ? 'manual' : 'auto';
  const input = buildDeepThinkInput(
    mode,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    spatialMap
  );

  // Assemble the full prompt for Deep Think
  let deepThinkPrompt = input.systemPrompt;
  deepThinkPrompt += '\n\n## FIXTURE REFERENCE DATA\n' + input.fixtureReference;
  deepThinkPrompt += '\n\n' + input.userSelections;
  deepThinkPrompt += '\n\n' + input.lightingParams;
  if (input.preferenceContext) {
    deepThinkPrompt += '\n\n' + input.preferenceContext;
  }
  if (input.spatialMapContext) {
    deepThinkPrompt += '\n\n## SPATIAL MAP DATA (exact coordinates for each fixture)\n' + input.spatialMapContext;
  }

  // Build image parts
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
  imageParts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });

  // For manual mode: include gradient/marker image so Deep Think can see positions
  if (gradientImageBase64) {
    imageParts.push({ inlineData: { data: gradientImageBase64, mimeType: imageMimeType } });
  } else if (markedImageBase64) {
    imageParts.push({ inlineData: { data: markedImageBase64, mimeType: imageMimeType } });
  }

  imageParts.push({ text: deepThinkPrompt });

  console.log(`[DeepThink] Sending to Deep Think (${mode} mode). Input prompt: ${deepThinkPrompt.length} chars`);

  return withRetry(async () => {
    const response = await withTimeout(
      ai.models.generateContent({
        model: ANALYSIS_MODEL_NAME, // gemini-3.1-pro-preview
        contents: { parts: imageParts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      }),
      ANALYSIS_TIMEOUT_MS,
      'Deep Think prompt generation timed out. Please try again.'
    );

    if (response.candidates?.[0]?.content?.parts) {
      // Skip thinking parts (thought: true) — grab the final output text
      const textPart = response.candidates[0].content.parts
        .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
        .pop();

      if (textPart?.text) {
        let jsonText = textPart.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          const output: DeepThinkOutput = JSON.parse(jsonText);
          console.log(`[DeepThink] Prompt generated. Length: ${output.prompt.length} chars, Fixtures: ${output.fixtureCount}`);
          if (output.analysisNotes) console.log(`[DeepThink] Notes: ${output.analysisNotes}`);
          return output;
        } catch (parseError) {
          console.warn('[DeepThink] JSON parse failed, using raw text as prompt:', parseError);
          // Fallback: treat entire text as the prompt
          return { prompt: textPart.text, analysisNotes: 'JSON parse failed, using raw text' };
        }
      }
    }
    throw new Error('Deep Think returned no output. Please try again.');
  }, 3, 2000);
}

/**
 * Stage 2 (New Pipeline): Thin wrapper around Nano Banana Pro API.
 * Takes the prompt from Deep Think + images and generates the night scene.
 */
export async function executeGeneration(
  imageBase64: string,
  imageMimeType: string,
  generationPrompt: string,
  aspectRatio: string,
  prefixParts?: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }>,
  gradientImageBase64?: string,
  markedImageBase64?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Resize images to prevent timeouts
  const resizedImage = await resizeImageBase64(imageBase64, imageMimeType);
  const resizedGradient = gradientImageBase64
    ? await resizeImageBase64(gradientImageBase64, imageMimeType)
    : undefined;
  const resizedMarked = markedImageBase64
    ? await resizeImageBase64(markedImageBase64, imageMimeType)
    : undefined;

  // Build parts array
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];

  // Few-shot references first
  if (prefixParts && prefixParts.length > 0) {
    imageParts.push(...prefixParts);
  }

  // Base image
  imageParts.push({ inlineData: { data: resizedImage, mimeType: imageMimeType } });

  // Gradient or marker image
  if (resizedGradient) {
    imageParts.push({ inlineData: { data: resizedGradient, mimeType: imageMimeType } });
  } else if (resizedMarked) {
    imageParts.push({ inlineData: { data: resizedMarked, mimeType: imageMimeType } });
  }

  // The prompt from Deep Think
  imageParts.push({ text: generationPrompt });

  console.log(`[executeGeneration] Sending to Nano Banana Pro. Prompt: ${generationPrompt.length} chars, Images: ${imageParts.filter(p => 'inlineData' in p).length}`);

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME, // gemini-3-pro-image-preview
      contents: { parts: imageParts },
      config: {
        temperature: 0.1,
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { imageSize: '2K', aspectRatio },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    }),
    API_TIMEOUT_MS,
    'Image generation timed out. Please try again.'
  );

  // Extract image from response
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    // Check for text-only response (blocked or error)
    const textPart = response.candidates[0].content.parts.find((p: { text?: string }) => p.text);
    if (textPart && 'text' in textPart && textPart.text) {
      throw new Error(`Generation blocked: ${textPart.text}`);
    }
  }

  // Check finish reason
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Generation ended with reason: ${finishReason}`);
  }

  throw new Error('No image generated. The model returned an empty response.');
}

/**
 * Validates manual placements before generation.
 * Checks fixture types, coordinate ranges, and counts.
 */
const GUTTER_LINE_TOLERANCE_PERCENT = 2.5;
const GUTTER_VERIFICATION_TOLERANCE_PERCENT = 4.0;
const DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT = 0.6;
const MIN_GUTTER_MOUNT_DEPTH_PERCENT = 0.2;
const MAX_GUTTER_MOUNT_DEPTH_PERCENT = 2.0;
const GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT = 0.9;
const GUTTER_ABOVE_LINE_TOLERANCE_PERCENT = 0.2;
const MAX_GUTTER_RETRY_ATTEMPTS = 1;

function projectPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; distance: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return {
      x: x1,
      y: y1,
      distance: Math.sqrt((px - x1) ** 2 + (py - y1) ** 2),
    };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return { x, y, distance: Math.sqrt((px - x) ** 2 + (py - y) ** 2) };
}

function getDownwardNormalForLine(line: GutterLine): { nx: number; ny: number } | null {
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const n1 = { nx: -dy / len, ny: dx / len };
  const n2 = { nx: dy / len, ny: -dx / len };
  return n1.ny >= n2.ny ? n1 : n2;
}

function applyGutterMountDepth(
  lineX: number,
  lineY: number,
  line: GutterLine,
  depthPercent: number
): { mountX: number; mountY: number; appliedDepth: number } {
  const normal = getDownwardNormalForLine(line);
  if (!normal) {
    return { mountX: lineX, mountY: lineY, appliedDepth: 0 };
  }

  const clampedDepth = Math.max(MIN_GUTTER_MOUNT_DEPTH_PERCENT, Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, depthPercent));
  const mountX = Math.max(0, Math.min(100, lineX + normal.nx * clampedDepth));
  const mountY = Math.max(0, Math.min(100, lineY + normal.ny * clampedDepth));
  return { mountX, mountY, appliedDepth: clampedDepth };
}

function resolveRequestedGutterDepth(
  explicitDepth: number | undefined,
  line?: GutterLine
): number {
  const rawDepth = typeof explicitDepth === 'number'
    ? explicitDepth
    : (typeof line?.mountDepthPercent === 'number' ? line.mountDepthPercent : DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT);
  return Math.max(MIN_GUTTER_MOUNT_DEPTH_PERCENT, Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, rawDepth));
}

function resolveGutterLine(
  placement: SpatialFixturePlacement,
  gutterLines?: GutterLine[]
): { x: number; y: number; distance: number; line: GutterLine } | null {
  if (!gutterLines || gutterLines.length === 0) return null;

  if (placement.gutterLineId) {
    const explicitLine = gutterLines.find(line => line.id === placement.gutterLineId);
    if (explicitLine) {
      const projected = projectPointToSegment(
        placement.horizontalPosition,
        placement.verticalPosition,
        explicitLine.startX,
        explicitLine.startY,
        explicitLine.endX,
        explicitLine.endY
      );
      return { ...projected, line: explicitLine };
    }
  }

  return findNearestGutterProjection(placement.horizontalPosition, placement.verticalPosition, gutterLines);
}

function getSignedDepthFromLine(
  x: number,
  y: number,
  lineProjection: { x: number; y: number; line: GutterLine }
): number {
  const normal = getDownwardNormalForLine(lineProjection.line);
  if (!normal) return 0;
  const vx = x - lineProjection.x;
  const vy = y - lineProjection.y;
  return vx * normal.nx + vy * normal.ny;
}

function findNearestGutterProjection(
  x: number,
  y: number,
  gutterLines?: GutterLine[]
): { x: number; y: number; distance: number; line: GutterLine } | null {
  if (!gutterLines || gutterLines.length === 0) return null;
  let best: { x: number; y: number; distance: number; line: GutterLine } | null = null;
  for (const line of gutterLines) {
    const projected = projectPointToSegment(
      x,
      y,
      line.startX,
      line.startY,
      line.endX,
      line.endY
    );
    if (!best || projected.distance < best.distance) {
      best = { ...projected, line };
    }
  }
  return best;
}

function normalizeGutterPlacements(
  spatialMap: SpatialMap,
  gutterLines?: GutterLine[]
): { spatialMap: SpatialMap; snappedCount: number } {
  if (!gutterLines || gutterLines.length === 0) {
    return { spatialMap, snappedCount: 0 };
  }

  let snappedCount = 0;
  const placements = spatialMap.placements.map(p => {
    if (p.fixtureType !== 'gutter') return p;
    const nearest = resolveGutterLine(p, gutterLines);
    if (!nearest) return p;

    const preferredLineX = typeof p.gutterLineX === 'number' ? p.gutterLineX : nearest.x;
    const preferredLineY = typeof p.gutterLineY === 'number' ? p.gutterLineY : nearest.y;
    const lineProjection = projectPointToSegment(
      preferredLineX,
      preferredLineY,
      nearest.line.startX,
      nearest.line.startY,
      nearest.line.endX,
      nearest.line.endY
    );
    const requestedDepth = resolveRequestedGutterDepth(p.gutterMountDepthPercent, nearest.line);
    const mounted = applyGutterMountDepth(lineProjection.x, lineProjection.y, nearest.line, requestedDepth);

    const nextX = Number(mounted.mountX.toFixed(3));
    const nextY = Number(mounted.mountY.toFixed(3));
    if (
      Math.abs(nextX - p.horizontalPosition) > 0.01 ||
      Math.abs(nextY - p.verticalPosition) > 0.01
    ) {
      snappedCount++;
    }

    return {
      ...p,
      horizontalPosition: nextX,
      verticalPosition: nextY,
      gutterLineId: nearest.line.id,
      gutterLineX: Number(lineProjection.x.toFixed(3)),
      gutterLineY: Number(lineProjection.y.toFixed(3)),
      gutterMountDepthPercent: Number(mounted.appliedDepth.toFixed(3)),
      distanceToGutter: Number(nearest.distance.toFixed(3)),
    };
  });

  return {
    spatialMap: {
      ...spatialMap,
      placements,
    },
    snappedCount,
  };
}

function normalizeGutterGuideFixtures(
  fixtures: LightFixture[] | undefined,
  gutterLines?: GutterLine[]
): { fixtures: LightFixture[] | undefined; snappedCount: number } {
  if (!fixtures || fixtures.length === 0 || !gutterLines || gutterLines.length === 0) {
    return { fixtures, snappedCount: 0 };
  }

  let snappedCount = 0;
  const normalizedFixtures = fixtures.map(fixture => {
    if (fixture.type !== 'gutter_uplight') return fixture;

    const nearest = fixture.gutterLineId
      ? (() => {
          const explicitLine = gutterLines.find(line => line.id === fixture.gutterLineId);
          if (!explicitLine) return null;
          const projected = projectPointToSegment(
            fixture.x,
            fixture.y,
            explicitLine.startX,
            explicitLine.startY,
            explicitLine.endX,
            explicitLine.endY
          );
          return { ...projected, line: explicitLine };
        })()
      : findNearestGutterProjection(fixture.x, fixture.y, gutterLines);
    if (!nearest) return fixture;

    const preferredLineX = typeof fixture.gutterLineX === 'number' ? fixture.gutterLineX : nearest.x;
    const preferredLineY = typeof fixture.gutterLineY === 'number' ? fixture.gutterLineY : nearest.y;
    const lineProjection = projectPointToSegment(
      preferredLineX,
      preferredLineY,
      nearest.line.startX,
      nearest.line.startY,
      nearest.line.endX,
      nearest.line.endY
    );
    const requestedDepth = resolveRequestedGutterDepth(fixture.gutterMountDepthPercent, nearest.line);
    const mounted = applyGutterMountDepth(lineProjection.x, lineProjection.y, nearest.line, requestedDepth);
    const nextX = Number(mounted.mountX.toFixed(3));
    const nextY = Number(mounted.mountY.toFixed(3));
    if (Math.abs(nextX - fixture.x) > 0.01 || Math.abs(nextY - fixture.y) > 0.01) {
      snappedCount++;
    }

    return {
      ...fixture,
      x: nextX,
      y: nextY,
      gutterLineId: nearest.line.id,
      gutterLineX: Number(lineProjection.x.toFixed(3)),
      gutterLineY: Number(lineProjection.y.toFixed(3)),
      gutterMountDepthPercent: Number(mounted.appliedDepth.toFixed(3)),
    };
  });

  return { fixtures: normalizedFixtures, snappedCount };
}

const VALID_FIXTURE_TYPES = new Set(['up', 'gutter', 'path', 'well', 'hardscape', 'soffit', 'coredrill']);

function validateManualPlacements(
  spatialMap: SpatialMap,
  gutterLines?: GutterLine[]
): {
  valid: boolean;
  errors: string[];
  summary: { type: string; count: number; positions: string[] }[];
} {
  const errors: string[] = [];
  const countByType = new Map<string, { count: number; positions: string[] }>();

  // Check: must have at least one placement
  if (!spatialMap.placements || spatialMap.placements.length === 0) {
    errors.push('No fixture placements found â€” nothing to generate');
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

    // C. Gutter-specific validation
    if (p.fixtureType === 'gutter') {
      if (p.subOption && p.subOption !== 'gutterUpLights') {
        errors.push(`Fixture #${idx} (gutter): invalid sub-option "${p.subOption}" (expected gutterUpLights)`);
      }

      if (typeof p.rotation === 'number') {
        const normalizedRot = ((p.rotation % 360) + 360) % 360;
        if (normalizedRot > 100 && normalizedRot < 260) {
          errors.push(`Fixture #${idx} (gutter): beam direction appears downward (${normalizedRot.toFixed(1)}°)`);
        }
      }

      const nearest = findNearestGutterProjection(p.horizontalPosition, p.verticalPosition, gutterLines);
      if (gutterLines && gutterLines.length > 0 && (!nearest || nearest.distance > GUTTER_LINE_TOLERANCE_PERCENT)) {
        const dist = nearest ? nearest.distance.toFixed(2) : 'n/a';
        errors.push(`Fixture #${idx} (gutter): not on a gutter line (distance ${dist}%, tolerance ${GUTTER_LINE_TOLERANCE_PERCENT}%)`);
      }
    }

    // D. Accumulate counts by type
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
 * Returns a verification result (does NOT retry â€” just informs).
 */
interface DetectedFixture {
  type: string;
  x: number;
  y: number;
  direction?: string;
}

function isGutterLikeType(type: string): boolean {
  const normalized = (type || '').toLowerCase();
  return normalized.includes('gutter') || (normalized.includes('roof') && normalized.includes('up'));
}

function normalizeDetectedFixtureType(type: string): string | null {
  const normalized = (type || '').toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes('soffit') ||
    normalized.includes('eave') ||
    normalized.includes('downlight')
  ) return 'soffit';
  if (
    normalized.includes('gutter') ||
    (normalized.includes('roof') && normalized.includes('up'))
  ) return 'gutter';
  if (normalized.includes('path') || normalized.includes('walk')) return 'path';
  if (normalized.includes('well')) return 'well';
  if (normalized.includes('hardscape') || normalized.includes('step')) return 'hardscape';
  if (normalized.includes('core') || normalized.includes('drill')) return 'coredrill';
  if (normalized.includes('holiday') || normalized.includes('string')) return 'holiday';
  if (normalized.includes('up')) return 'up';

  return null;
}

function evaluateUnexpectedFixtureTypes(
  expectedPlacements: SpatialFixturePlacement[],
  detectedFixtures: DetectedFixture[]
): { verified: boolean; details: string; unexpectedTypes: string[] } {
  const expectedTypes = new Set(expectedPlacements.map(p => p.fixtureType));
  const unexpected = new Set<string>();

  for (const fixture of detectedFixtures) {
    const canonical = normalizeDetectedFixtureType(fixture.type);
    if (!canonical) continue;
    if (!expectedTypes.has(canonical)) {
      unexpected.add(canonical);
    }
  }

  const unexpectedTypes = [...unexpected];
  if (unexpectedTypes.length > 0) {
    return {
      verified: false,
      details: `Unexpected fixture types detected: ${unexpectedTypes.join(', ')}.`,
      unexpectedTypes,
    };
  }

  return {
    verified: true,
    details: 'No unexpected fixture types detected.',
    unexpectedTypes: [],
  };
}

function evaluateGutterVerification(
  expectedPlacements: SpatialFixturePlacement[],
  detectedFixtures: DetectedFixture[],
  gutterLines?: GutterLine[]
): { verified: boolean; details: string } {
  const expectedGutters = expectedPlacements.filter(p => p.fixtureType === 'gutter');
  if (expectedGutters.length === 0) {
    return { verified: true, details: 'No gutter fixtures expected.' };
  }

  const detectedGutters = detectedFixtures.filter(f => isGutterLikeType(f.type));
  if (detectedGutters.length < expectedGutters.length) {
    return {
      verified: false,
      details: `Gutter mismatch: expected ${expectedGutters.length}, detected ${detectedGutters.length}.`,
    };
  }

  const usedDetected = new Set<number>();
  const matched: Array<{ expected: SpatialFixturePlacement; actual: DetectedFixture; distance: number }> = [];

  for (const expected of expectedGutters) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < detectedGutters.length; i++) {
      if (usedDetected.has(i)) continue;
      const actual = detectedGutters[i];
      const dist = Math.sqrt(
        (expected.horizontalPosition - actual.x) ** 2 +
        (expected.verticalPosition - actual.y) ** 2
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      return { verified: false, details: 'Unable to match all expected gutter fixtures.' };
    }
    usedDetected.add(bestIdx);
    matched.push({ expected, actual: detectedGutters[bestIdx], distance: bestDist });
  }

  const maxPosDrift = Math.max(...matched.map(m => m.distance));
  const avgPosDrift = matched.reduce((sum, m) => sum + m.distance, 0) / matched.length;
  if (maxPosDrift > GUTTER_VERIFICATION_TOLERANCE_PERCENT) {
    return {
      verified: false,
      details: `Gutter position drift too high (max ${maxPosDrift.toFixed(2)}%, avg ${avgPosDrift.toFixed(2)}%).`,
    };
  }

  if (gutterLines && gutterLines.length > 0) {
    const maxLineDrift = Math.max(
      ...matched.map(m => {
        const nearest = findNearestGutterProjection(m.actual.x, m.actual.y, gutterLines);
        return nearest ? nearest.distance : 100;
      })
    );
    if (maxLineDrift > GUTTER_VERIFICATION_TOLERANCE_PERCENT) {
      return {
        verified: false,
        details: `Detected gutter fixtures are off the gutter line (max ${maxLineDrift.toFixed(2)}%).`,
      };
    }

    const mountDepthChecks = matched.map(m => {
      const expectedLineProjection = resolveGutterLine(m.expected, gutterLines);
      if (!expectedLineProjection) {
        return {
          valid: false,
          reason: 'Unable to resolve expected gutter line for mount-depth verification.',
          expectedDepth: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
          actualDepth: 0,
          depthDelta: Infinity,
        };
      }

      const expectedDepthFromPlacement =
        typeof m.expected.gutterMountDepthPercent === 'number'
          ? m.expected.gutterMountDepthPercent
          : getSignedDepthFromLine(
              m.expected.horizontalPosition,
              m.expected.verticalPosition,
              expectedLineProjection
            );

      const fallbackDepth = resolveRequestedGutterDepth(undefined, expectedLineProjection.line);
      const expectedDepth = Math.max(
        MIN_GUTTER_MOUNT_DEPTH_PERCENT,
        Math.min(
          MAX_GUTTER_MOUNT_DEPTH_PERCENT,
          expectedDepthFromPlacement > 0 ? expectedDepthFromPlacement : fallbackDepth
        )
      );

      const actualProjection = projectPointToSegment(
        m.actual.x,
        m.actual.y,
        expectedLineProjection.line.startX,
        expectedLineProjection.line.startY,
        expectedLineProjection.line.endX,
        expectedLineProjection.line.endY
      );
      const actualDepth = getSignedDepthFromLine(m.actual.x, m.actual.y, {
        x: actualProjection.x,
        y: actualProjection.y,
        line: expectedLineProjection.line,
      });

      return {
        valid: true,
        reason: '',
        expectedDepth,
        actualDepth,
        depthDelta: Math.abs(actualDepth - expectedDepth),
      };
    });

    const invalidDepthResolution = mountDepthChecks.find(check => !check.valid);
    if (invalidDepthResolution) {
      return {
        verified: false,
        details: invalidDepthResolution.reason,
      };
    }

    const aboveLineCount = mountDepthChecks.filter(
      check => check.actualDepth < -GUTTER_ABOVE_LINE_TOLERANCE_PERCENT
    ).length;
    if (aboveLineCount > 0) {
      return {
        verified: false,
        details: `Detected ${aboveLineCount} gutter fixture(s) above gutter trough (roof-edge mount).`,
      };
    }

    const shallowCount = mountDepthChecks.filter(
      check => check.actualDepth < MIN_GUTTER_MOUNT_DEPTH_PERCENT
    ).length;
    if (shallowCount > 0) {
      return {
        verified: false,
        details: `Detected ${shallowCount} gutter fixture(s) too shallow (not seated in gutter trough).`,
      };
    }

    const tooDeepCount = mountDepthChecks.filter(
      check => check.actualDepth > MAX_GUTTER_MOUNT_DEPTH_PERCENT + GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT
    ).length;
    if (tooDeepCount > 0) {
      return {
        verified: false,
        details: `Detected ${tooDeepCount} gutter fixture(s) too far below gutter trough.`,
      };
    }

    const maxDepthDelta = Math.max(...mountDepthChecks.map(check => check.depthDelta));
    if (maxDepthDelta > GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT) {
      return {
        verified: false,
        details: `Gutter mount-depth mismatch (max depth delta ${maxDepthDelta.toFixed(2)}%).`,
      };
    }
  }

  const downward = matched.filter(m => (m.actual.direction || '').toLowerCase().includes('down'));
  if (downward.length > 0) {
    return {
      verified: false,
      details: `Detected ${downward.length} gutter fixture(s) with downward beam direction.`,
    };
  }

  return {
    verified: true,
    details: `Gutter verified (max drift ${maxPosDrift.toFixed(2)}%, avg drift ${avgPosDrift.toFixed(2)}%).`,
  };
}

async function verifyGeneratedImage(
  generatedImageBase64: string,
  imageMimeType: string,
  expectedPlacements: SpatialFixturePlacement[],
  gutterLines?: GutterLine[]
): Promise<{ verified: boolean; confidence: number; details: string; gutterVerified: boolean; unexpectedTypes: string[] }> {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const expectedCount = expectedPlacements.length;
    const expectedTypes = [...new Set(expectedPlacements.map(p => p.fixtureType))];

    const verificationPrompt = `You are analyzing a nighttime landscape lighting photograph.
Count EVERY visible light source or illuminated fixture in this image.

For each light source found, report:
- Type (uplight, gutter light, path light, well light, hardscape/step light, soffit downlight, core-drill light)
- Approximate position as [X%, Y%] where 0%,0% is top-left
- Beam direction (up, down, left, right, up-right, up-left, down-right, down-left, or unknown)
- For gutter classification: label as "gutter light" ONLY if the source sits inside the gutter trough slightly below roof edge (not on shingles, not on soffit underside).

EXPECTED: ${expectedCount} fixtures of types: ${expectedTypes.join(', ')}

Respond in this EXACT JSON format (no markdown, no code blocks):
{"count": <number>, "fixtures": [{"type": "<type>", "x": <number>, "y": <number>, "direction": "<direction|unknown>"}], "confidence": <0-100>}`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
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
      return {
        verified: false,
        confidence: 0,
        details: 'Could not parse verification response',
        gutterVerified: false,
        unexpectedTypes: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { count: number; fixtures: DetectedFixture[]; confidence: number };
    const actualCount = parsed.count;
    const confidence = parsed.confidence || 0;
    const countMatch = actualCount === expectedCount;
    const fixtures = Array.isArray(parsed.fixtures) ? parsed.fixtures : [];
    const gutterVerification = evaluateGutterVerification(expectedPlacements, fixtures, gutterLines);
    const typeVerification = evaluateUnexpectedFixtureTypes(expectedPlacements, fixtures);
    const verified = countMatch && gutterVerification.verified && typeVerification.verified;

    const details = `Expected ${expectedCount} fixtures, found ${actualCount}. Confidence: ${confidence}%. Types expected: [${expectedTypes.join(', ')}]. ${gutterVerification.details} ${typeVerification.details}`;

    if (verified) {
      console.log(`[Manual Mode] Verification PASSED: ${actualCount}/${expectedCount} fixtures confirmed (${confidence}% confidence). ${gutterVerification.details} ${typeVerification.details}`);
    } else {
      console.warn(`[Manual Mode] Verification WARNING: Expected ${expectedCount} fixtures but found ${actualCount} (${confidence}% confidence). ${gutterVerification.details} ${typeVerification.details}`);
      if (fixtures) {
        fixtures.forEach((f, i) => {
          console.warn(`  Found fixture ${i + 1}: ${f.type} at [${f.x}%, ${f.y}%]`);
        });
      }
    }

    return {
      verified,
      confidence,
      details,
      gutterVerified: gutterVerification.verified,
      unexpectedTypes: typeVerification.unexpectedTypes,
    };
  } catch (error) {
    console.warn('[Manual Mode] Verification failed (non-blocking):', error);
    return {
      verified: false,
      confidence: 0,
      details: `Verification error: ${error}`,
      gutterVerified: false,
      unexpectedTypes: [],
    };
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
- Deep 1AM darkness â€” pitch black sky, subtle stars, faint moon glow on clouds
- The house and landscaping should be barely visible â€” deep shadows everywhere
- Do NOT add ANY lighting fixtures, landscape lights, porch lights, sconces, or any artificial light sources
- Every window MUST be completely dark â€” no interior lights visible
- The entire scene should appear as if all power is off â€” naturally dark with only moonlight
- Preserve the EXACT framing, composition, architecture, and all objects pixel-perfect
- Do NOT add, remove, or modify any architectural elements, trees, bushes, or hardscape
- The ONLY change is the time of day: daytime â†’ deep nighttime`;

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
        temperature: 0.1,
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

function buildGutterCorrectionPrompt(
  basePrompt: string,
  placements: SpatialFixturePlacement[],
  gutterLines?: GutterLine[],
  unexpectedTypes: string[] = []
): string {
  const gutterPlacements = placements
    .filter(p => p.fixtureType === 'gutter')
    .sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  if (gutterPlacements.length === 0 && unexpectedTypes.length === 0) return basePrompt;

  let correction = '\n\n=== CORRECTION PASS: GUTTER PLACEMENT LOCK ===\n';
  correction += 'The previous output failed verification. Fix fixture compliance exactly without changing architecture.\n';
  correction += 'MANDATORY RULES:\n';
  correction += '- Keep exact fixture count and preserve all non-light pixels.\n';
  correction += '- Do not add or remove any fixture type.\n';
  if (unexpectedTypes.length > 0) {
    correction += 'REMOVE UNEXPECTED FIXTURE TYPES:\n';
    unexpectedTypes.forEach(type => {
      correction += `- Remove ALL ${type.toUpperCase()} fixtures and light effects.\n`;
    });
    if (unexpectedTypes.includes('soffit')) {
      correction += '- Soffits/eaves must be pitch black with zero downlighting.\n';
    }
  }
  if (gutterPlacements.length > 0) {
    correction += '- Every gutter fixture must sit INSIDE the gutter trough at mount depth (not roof shingles, not soffit underside, not wall face).\n';
    correction += `- Mount each source slightly below the gutter edge (target depth ~${DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT.toFixed(1)}% in screen space).\n`;
    correction += '- Every gutter fixture beam must point UPWARD only.\n';
    correction += 'EXPECTED GUTTER FIXTURES (exact coordinates):\n';
    gutterPlacements.forEach((p, i) => {
      const lineInfo =
        typeof p.gutterLineX === 'number' && typeof p.gutterLineY === 'number'
          ? `, line=[${p.gutterLineX.toFixed(2)}%, ${p.gutterLineY.toFixed(2)}%]`
          : '';
      const depthInfo =
        typeof p.gutterMountDepthPercent === 'number'
          ? `, depth=${p.gutterMountDepthPercent.toFixed(2)}%`
          : '';
      correction += `- GUTTER ${i + 1}: mount=[${p.horizontalPosition.toFixed(2)}%, ${p.verticalPosition.toFixed(2)}%]${lineInfo}${depthInfo}\n`;
    });

    if (gutterLines && gutterLines.length > 0) {
      correction += 'REFERENCE GUTTER LINES:\n';
      gutterLines.forEach((line, i) => {
        const depth = resolveRequestedGutterDepth(undefined, line);
        correction += `- LINE ${i + 1}: [${line.startX.toFixed(2)}%, ${line.startY.toFixed(2)}%] -> [${line.endX.toFixed(2)}%, ${line.endY.toFixed(2)}%], depth=${depth.toFixed(2)}%\n`;
      });
    }
    correction += 'FINAL CHECK: All gutter fixtures must remain within 4% of expected mount coordinates and stay inside the gutter trough depth band.\n';
  }
  correction += 'FINAL CHECK: Output must match selected fixture types only and contain zero unselected fixture types.\n';
  return basePrompt + correction;
}

/**
 * Manual-mode generation (TWO-PASS + Deep Think).
 * Pass 1: Convert daytime to nighttime (cached via nightBaseBase64 param).
 * Deep Think: Analyze gradient/marker image + spatial map, write complete prompt.
 * Pass 2: Nano Banana Pro generates lit scene using Deep Think's prompt.
 */
export const generateManualScene = async (
  imageBase64: string,
  imageMimeType: string,
  spatialMap: SpatialMap,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  targetRatio: string,
  userPreferences?: UserPreferences | null,
  onStageUpdate?: (stage: string) => void,
  fixtures?: LightFixture[],
  nightBaseBase64?: string,
  gutterLines?: GutterLine[]
): Promise<{ result: string; nightBase: string }> => {
  console.log('[Manual Mode] Starting Deep Think manual generation...');
  console.log(`[Manual Mode] ${spatialMap.placements.length} fixtures to render`);
  console.log(`[Manual Mode] Night base cached: ${!!nightBaseBase64}`);

  const normalized = normalizeGutterPlacements(spatialMap, gutterLines);
  const normalizedSpatialMap = normalized.spatialMap;
  if (normalized.snappedCount > 0) {
    console.log(`[Manual Mode] Normalized ${normalized.snappedCount} gutter fixture(s) onto gutter lines before generation.`);
  }
  const normalizedGuideFixtures = normalizeGutterGuideFixtures(fixtures, gutterLines);
  if (normalizedGuideFixtures.snappedCount > 0) {
    console.log(`[Manual Mode] Normalized ${normalizedGuideFixtures.snappedCount} gutter guide fixture(s) for gradient hints.`);
  }

  // Validate placements before spending an API call
  const validation = validateManualPlacements(normalizedSpatialMap, gutterLines);
  if (!validation.valid) {
    console.error('[Manual Mode] Validation FAILED:', validation.errors);
    throw new Error(`Manual placement validation failed:\n${validation.errors.join('\n')}`);
  }

  // Pass 1: Nighttime conversion (cached)
  let nightBase: string;
  if (nightBaseBase64) {
    console.log('[Pass 1] Using cached nighttime base.');
    nightBase = nightBaseBase64;
  } else {
    onStageUpdate?.('converting');
    nightBase = await generateNightBase(imageBase64, imageMimeType, targetRatio);
  }

  // Generate gradient/marker overlays (painted on ORIGINAL daytime image for contrast)
  onStageUpdate?.('generating');

  const hasGradients = !!(normalizedGuideFixtures.fixtures && normalizedGuideFixtures.fixtures.length > 0);
  let gradientImage: string | undefined;
  let markedImage: string | undefined;

  if (hasGradients) {
    console.log(`[Manual Mode] Painting directional light gradients for ${normalizedGuideFixtures.fixtures!.length} fixtures...`);
    gradientImage = await paintLightGradients(
      imageBase64,
      normalizedGuideFixtures.fixtures!,
      imageMimeType,
      gutterLines
    );
    console.log('[Manual Mode] Gradient map painted (includes numbered markers).');
  } else {
    console.log('[Manual Mode] Drawing fixture markers...');
    markedImage = await drawFixtureMarkers(imageBase64, normalizedSpatialMap, imageMimeType);
    console.log('[Manual Mode] Markers drawn.');
  }

  // Load few-shot reference examples for the selected fixture types
  const fixtureTypes = [...new Set(normalizedSpatialMap.placements.map(p => p.fixtureType))];
  let referenceParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
  try {
    referenceParts = await buildReferenceParts(fixtureTypes);
    if (referenceParts.length > 0) {
      console.log(`[Manual Mode] Injecting ${referenceParts.length} reference parts for types: ${fixtureTypes.join(', ')}`);
    }
  } catch (err) {
    console.warn('[Manual Mode] Reference loading failed (non-blocking):', err);
  }

  // Deep Think: Analyze gradient/marker image + spatial map, write the complete prompt
  onStageUpdate?.('analyzing');
  console.log('[Manual Mode] Deep Think analyzing placements + writing prompt...');
  const deepThinkResult = await deepThinkGeneratePrompt(
    nightBase,
    imageMimeType,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    normalizedSpatialMap,
    gradientImage,
    markedImage,
    true
  );
  console.log(`[Manual Mode] Deep Think complete. Prompt length: ${deepThinkResult.prompt.length} chars`);
  const lockedPrompt = `${deepThinkResult.prompt}\n${buildPhotorealismLockAddendum()}`;

  // Pass 2: Nano Banana Pro generates the lit scene
  onStageUpdate?.('placing');
  console.log('[Pass 2] Generating lit scene with Nano Banana Pro...');
  let result = await executeGeneration(
    nightBase,
    imageMimeType,
    lockedPrompt,
    targetRatio,
    referenceParts.length > 0 ? referenceParts : undefined,
    gradientImage,
    markedImage
  );

  console.log('[Pass 2] Lighting generation complete!');

  // Post-generation verification (non-blocking)
  onStageUpdate?.('verifying');
  let verification = await verifyGeneratedImage(
    result,
    imageMimeType,
    normalizedSpatialMap.placements,
    gutterLines
  );
  console.log(`[Manual Mode] Verification: ${verification.verified ? 'PASSED' : 'WARNING'} - ${verification.details}`);

  const hasGutterFixtures = normalizedSpatialMap.placements.some(p => p.fixtureType === 'gutter');
  const shouldRetryVerificationFailure = !verification.verified &&
    (hasGutterFixtures || verification.unexpectedTypes.length > 0);

  if (shouldRetryVerificationFailure) {
    for (let attempt = 1; attempt <= MAX_GUTTER_RETRY_ATTEMPTS; attempt++) {
      console.warn(
        `[Manual Mode] Verification failed (unexpected: ${verification.unexpectedTypes.join(', ') || 'none'}), running correction retry ${attempt}/${MAX_GUTTER_RETRY_ATTEMPTS}...`
      );
      onStageUpdate?.('placing');
      const correctionPrompt = buildGutterCorrectionPrompt(
        lockedPrompt,
        normalizedSpatialMap.placements,
        gutterLines,
        verification.unexpectedTypes
      );
      const retryResult = await executeGeneration(
        nightBase,
        imageMimeType,
        correctionPrompt,
        targetRatio,
        referenceParts.length > 0 ? referenceParts : undefined,
        gradientImage,
        markedImage
      );

      onStageUpdate?.('verifying');
      const retryVerification = await verifyGeneratedImage(
        retryResult,
        imageMimeType,
        normalizedSpatialMap.placements,
        gutterLines
      );

      if (
        retryVerification.verified ||
        retryVerification.unexpectedTypes.length < verification.unexpectedTypes.length ||
        retryVerification.confidence >= verification.confidence
      ) {
        result = retryResult;
        verification = retryVerification;
      }

      if (verification.verified) break;
    }
    console.log(`[Manual Mode] Post-retry verification: ${verification.verified ? 'PASSED' : 'WARNING'} - ${verification.details}`);
  }

  onStageUpdate?.('verifying');
  let photorealCheck = await verifyPhotorealism(extractBase64Data(result), imageMimeType);
  console.log(`[Manual Mode] Photorealism: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);

  if (!photorealCheck.passed) {
    for (let attempt = 1; attempt <= MAX_PHOTOREAL_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Manual Mode] Photorealism failed, running correction retry ${attempt}/${MAX_PHOTOREAL_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('placing');
      const baseCorrectionPrompt = buildGutterCorrectionPrompt(
        lockedPrompt,
        normalizedSpatialMap.placements,
        gutterLines,
        verification.unexpectedTypes
      );
      const correctionPrompt = buildPhotorealismCorrectionPrompt(baseCorrectionPrompt, photorealCheck.issues);
      const retryResult = await executeGeneration(
        nightBase,
        imageMimeType,
        correctionPrompt,
        targetRatio,
        referenceParts.length > 0 ? referenceParts : undefined,
        gradientImage,
        markedImage
      );

      onStageUpdate?.('verifying');
      const retryVerification = await verifyGeneratedImage(
        retryResult,
        imageMimeType,
        normalizedSpatialMap.placements,
        gutterLines
      );
      const retryPhotorealCheck = await verifyPhotorealism(extractBase64Data(retryResult), imageMimeType);

      const placementNotWorse =
        retryVerification.verified ||
        retryVerification.unexpectedTypes.length <= verification.unexpectedTypes.length;
      if (
        (retryPhotorealCheck.passed && placementNotWorse) ||
        retryPhotorealCheck.score > photorealCheck.score
      ) {
        result = retryResult;
        verification = retryVerification;
        photorealCheck = retryPhotorealCheck;
      }

      if (photorealCheck.passed) break;
    }
    console.log(`[Manual Mode] Post-photoreal retry: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);
  }

  return { result, nightBase };
};

/**
 * Enhanced Night Scene Generation using Gemini Pro 3 Only
 * This replaces the Claude + Gemini hybrid mode with a Gemini-only pipeline
 * 2-Stage Pipeline: Deep Think (analysis + prompt) → Nano Banana Pro (image generation)
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
  onStageUpdate?: (stage: string) => void
): Promise<string> => {
  console.log('[Enhanced Mode] Starting 2-stage Deep Think pipeline...');

  // Stage 1: Deep Think analyzes property and writes the complete generation prompt
  onStageUpdate?.('analyzing');
  console.log('[Enhanced Mode] Stage 1: Deep Think analyzing property + generating prompt...');
  const deepThinkResult = await deepThinkGeneratePrompt(
    imageBase64,
    imageMimeType,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences
  );
  console.log(`[Enhanced Mode] Deep Think complete. Prompt length: ${deepThinkResult.prompt.length} chars`);
  if (deepThinkResult.fixtureBreakdown) {
    console.log('[Enhanced Mode] Fixture breakdown:', deepThinkResult.fixtureBreakdown);
  }
  const lockedPrompt = `${deepThinkResult.prompt}\n${buildPhotorealismLockAddendum()}`;

  // Stage 2: Nano Banana Pro generates the image using Deep Think's prompt
  onStageUpdate?.('generating');
  console.log('[Enhanced Mode] Stage 2: Generating image with Nano Banana Pro...');
  let result = await executeGeneration(
    imageBase64,
    imageMimeType,
    lockedPrompt,
    targetRatio
  );

  onStageUpdate?.('validating');
  let photorealCheck = await verifyPhotorealism(extractBase64Data(result), imageMimeType);
  console.log(`[Enhanced Mode] Photorealism: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);

  if (!photorealCheck.passed) {
    for (let attempt = 1; attempt <= MAX_PHOTOREAL_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Enhanced Mode] Photorealism failed, running correction retry ${attempt}/${MAX_PHOTOREAL_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('generating');
      const correctionPrompt = buildPhotorealismCorrectionPrompt(lockedPrompt, photorealCheck.issues);
      const retryResult = await executeGeneration(
        imageBase64,
        imageMimeType,
        correctionPrompt,
        targetRatio
      );

      onStageUpdate?.('validating');
      const retryPhotorealCheck = await verifyPhotorealism(extractBase64Data(retryResult), imageMimeType);
      if (retryPhotorealCheck.passed || retryPhotorealCheck.score >= photorealCheck.score) {
        result = retryResult;
        photorealCheck = retryPhotorealCheck;
      }
      if (photorealCheck.passed) break;
    }
  }

  console.log('[Enhanced Mode] Generation complete!');
  return result;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENHANCED ANALYSIS INTEGRATION
// Uses the new smart analysis system for better fixture suggestions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const ENHANCED_ANALYSIS_TIMEOUT_MS = 120000; // 120 seconds for Deep Think analysis

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
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
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
        // Skip thinking parts (thought: true) — grab the final output text
        const textPart = candidate.content.parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).pop();
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
