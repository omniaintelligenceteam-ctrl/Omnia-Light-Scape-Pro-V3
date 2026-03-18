
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
  type ArchitecturalStyleType,
  type FacadeWidthType
} from "../constants";
import type { EnhancedHouseAnalysis, SuggestedFixture } from "../src/types/houseAnalysis";
import type { LightFixture, GutterLine } from "../types/fixtures";
import { rotationToDirectionLabel, hasCustomRotation } from "../utils/fixtureConverter";

// Stage 2 image model: Nano Banana Pro (Gemini 3 Pro Image).
const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

// Timeout for API calls (2 minutes)
const API_TIMEOUT_MS = 120000;
const MAX_AUTO_GUTTER_LINES = 3;
const AUTO_PLACEMENT_CONFIDENCE_MIN_SCORE = 85;
const STAGE1_RETRY_MAX_ATTEMPTS = 5;
const STAGE1_RETRY_INITIAL_DELAY_MS = 2500;

// Non-selected fixture types, including soffit, are explicitly forbidden in prompt assembly.


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

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return String(error).toLowerCase();
  }
}

function parseProviderRetryDelayMs(error: unknown): number | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!message) return null;

  // Gemini API often includes RetryInfo like: "retryDelay":"34s"
  const retryDelayMatch = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (retryDelayMatch) {
    const seconds = Number(retryDelayMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000);
  }

  // Some messages include: "Please retry in 34.03s."
  const pleaseRetryMatch = message.match(/please\s+retry\s+in\s+(\d+(?:\.\d+)?)s/i);
  if (pleaseRetryMatch) {
    const seconds = Number(pleaseRetryMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000);
  }

  return null;
}

function isRetryableProviderError(error: unknown): boolean {
  const message = normalizeErrorMessage(error);
  return (
    message.includes('timed out') ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('unavailable') ||
    message.includes('service unavailable') ||
    message.includes('high demand') ||
    message.includes('econnreset') ||
    message.includes('network')
  );
}

function isQuotaExceededError(error: unknown): boolean {
  const message = normalizeErrorMessage(error);
  return (
    message.includes('resource_exhausted') ||
    message.includes('quota exceeded') ||
    message.includes('rate limit') ||
    message.includes('input_token_count') ||
    message.includes('generate_content_paid_tier_input_token_count')
  );
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
      const isRetryable = isRetryableProviderError(error);

      if (attempt < maxAttempts && isRetryable) {
        const backoffDelay = initialDelayMs * Math.pow(2, attempt - 1);
        const providerDelay = parseProviderRetryDelayMs(error) ?? 0;
        const baseDelay = Math.max(backoffDelay, providerDelay);
        const jitter = Math.round(baseDelay * 0.2 * Math.random());
        const delay = baseDelay + jitter;
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

function looksLikeBase64Blob(value: string): boolean {
  if (!value) return false;
  if (value.length < 5000) return false;
  if (/\s/.test(value)) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(value)) return false;
  return true;
}

function sanitizeGenerationPrompt(prompt: string): { prompt: string; removedBytes: number } {
  if (!prompt) return { prompt, removedBytes: 0 };

  let removedBytes = 0;
  let next = prompt;

  // Remove embedded data URIs (common accidental bug: pasting image data into prompt fields).
  next = next.replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, (match) => {
    removedBytes += match.length;
    return '[EMBEDDED_IMAGE_DATA_REMOVED]';
  });

  // Remove large raw base64 blobs if they ended up in the prompt (heuristic).
  // This is intentionally conservative to avoid stripping legitimate short tokens.
  next = next.replace(/[A-Za-z0-9+/=]{20000,}/g, (match) => {
    removedBytes += match.length;
    return '[BASE64_BLOB_REMOVED]';
  });

  return { prompt: next, removedBytes };
}

const MAX_USER_DIRECTIVE_CHARS = 6_000;
const MAX_MODIFICATION_REQUEST_CHARS = 1_500;
const MAX_GENERATION_PROMPT_CHARS = 20_000;

function sanitizeFreeformDirectiveText(
  value: string | undefined,
  maxChars: number,
  label: string
): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  const { prompt: sanitized, removedBytes } = sanitizeGenerationPrompt(trimmed);
  if (removedBytes > 0) {
    console.warn(`[PromptSanitizer] Removed ${removedBytes} chars of embedded image/base64 data from ${label}.`);
  }

  if (sanitized.length <= maxChars) return sanitized;

  const clipped = sanitized.slice(0, maxChars);
  console.warn(`[PromptSanitizer] Truncated ${label} from ${sanitized.length} to ${maxChars} chars.`);
  return `${clipped}\n[TRUNCATED_${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}]`;
}


function extractBase64Data(imageOrDataUri: string): string {
  const commaIndex = imageOrDataUri.indexOf(',');
  return commaIndex >= 0 ? imageOrDataUri.slice(commaIndex + 1) : imageOrDataUri;
}



type InlineImagePart = {
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
};

function selectGeneratedImagePart(
  parts: InlineImagePart[],
  sourceCandidates: string[] = []
): { data: string; mimeType: string } | null {
  const imageParts = parts
    .filter(part => typeof part.inlineData?.data === 'string' && part.inlineData.data.length > 0)
    .map(part => ({
      data: part.inlineData!.data!,
      mimeType: part.inlineData!.mimeType || 'image/png',
    }));

  if (imageParts.length === 0) return null;

  const sourceSet = new Set(sourceCandidates.filter(Boolean));
  const nonSourceImageParts = imageParts.filter(part => !sourceSet.has(part.data));
  const pool = nonSourceImageParts.length > 0 ? nonSourceImageParts : imageParts;
  const selected = pool[pool.length - 1];

  if (imageParts.length > 1) {
    const matchedSourceCount = imageParts.length - nonSourceImageParts.length;
    console.log(
      `[ImageSelect] Received ${imageParts.length} image parts (${matchedSourceCount} matched input). ` +
      `Using ${nonSourceImageParts.length > 0 ? 'last non-source' : 'last'} image part.`
    );
  }

  return selected;
}

const PHOTOREALISM_LOCK_ADDENDUM = `

=== PHOTOREALISM LOCK (NON-NEGOTIABLE) ===
- Sky must be true black (#000000 to #0A0A0A) with ONE realistic full moon.
- Preserve natural inverse-square falloff (brightest mid-wall, not at fixture base).
- Use conical beams with soft feathered edges (no hard geometric light shapes).
- Maintain visible dark gaps between adjacent fixtures (no uniform wall wash).
- Preserve architecture/materials pixel-accurately; no invented structures or fake texture.
- Keep warm amber residential tone (2700K-3000K) unless explicitly overridden by user.
- NEVER render text, numbers, coordinates, labels, crosshairs, arrows, UI badges, or debug overlays.
- Marker/guide annotations from reference images are placement guides only and must be invisible in final output.
- If any requirement conflicts, prioritize photorealism and physical light behavior.
`;

/**
 * Lightweight fixture type compliance check. Asks Gemini 3.1 Pro to identify
 * visible fixture types in the generated image, then flags any that weren't selected.
 */
async function verifyFixtureCompliance(
  generatedImage: string,
  imageMimeType: string,
  selectedFixtures: string[]
): Promise<{ passed: boolean; violatingTypes: string[] }> {
  const VALID_TYPES = ['up', 'path', 'gutter', 'soffit', 'hardscape', 'coredrill', 'well'];

  const prompt = `Look at this landscape lighting image. List ONLY the lighting fixture types you can see:
- up (ground-mounted uplights washing walls or trees upward)
- path (short pathway bollard lights on ground)
- gutter (uplights mounted inside rain gutter channel)
- soffit (recessed downlights in roof eaves/overhangs)
- hardscape (flush lights in concrete, steps, or retaining walls)
- coredrill (flush in-ground lights in driveways or sidewalks)
- well (in-ground well lights)
- none (no lighting fixtures visible)

Return ONLY valid JSON: { "visibleTypes": ["up", "path"] }
Do not include types you are unsure about. Only include types you can clearly identify.`;

  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const imageData = extractBase64Data(generatedImage);

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_3_1_PRO_MODEL_NAME,
        contents: { parts: [
          { inlineData: { data: imageData, mimeType: imageMimeType } },
          { text: prompt }
        ]},
        config: { temperature: 0.1 }
      }),
      30000,
      'Fixture compliance check timed out'
    );

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*"visibleTypes"[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[FixtureCompliance] Could not parse response, assuming pass:', text);
      return { passed: true, violatingTypes: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const visibleTypes: string[] = (parsed.visibleTypes || [])
      .map((t: string) => t.toLowerCase().trim())
      .filter((t: string) => VALID_TYPES.includes(t));

    const violatingTypes = visibleTypes.filter(t => !selectedFixtures.includes(t));

    if (violatingTypes.length > 0) {
      console.warn(`[FixtureCompliance] VIOLATION: Found ${violatingTypes.join(', ')} but only ${selectedFixtures.join(', ')} were selected`);
    } else {
      console.log('[FixtureCompliance] Passed — no unauthorized fixture types detected');
    }

    return { passed: violatingTypes.length === 0, violatingTypes };
  } catch (err) {
    console.warn('[FixtureCompliance] Check failed, assuming pass:', err);
    return { passed: true, violatingTypes: [] };
  }
}

/**
 * Builds a correction prompt that explicitly tells the AI to remove violating fixture types.
 */
function buildFixtureComplianceCorrectionPrompt(
  originalPrompt: string,
  violatingTypes: string[]
): string {
  const violatingLabels = violatingTypes
    .map(id => FIXTURE_TYPES.find(f => f.id === id)?.label || id)
    .join(', ');

  const correction = `CRITICAL CORRECTION — FORBIDDEN FIXTURES DETECTED
The previous generation incorrectly included: ${violatingLabels}.
You MUST NOT render any ${violatingLabels} fixtures. Those areas must be PITCH BLACK with ZERO illumination.
Re-generate following all instructions below, but with ABSOLUTELY ZERO ${violatingLabels}.\n\n`;

  return correction + originalPrompt;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}



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
const GEMINI_3_1_PRO_MODEL_NAME = 'gemini-3.1-pro-preview';
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
      model: GEMINI_3_1_PRO_MODEL_NAME,
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
        model: GEMINI_3_1_PRO_MODEL_NAME,
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

function buildImageConfig(aspectRatio?: string): { imageSize: "2K"; aspectRatio?: string } {
  if (aspectRatio && aspectRatio.trim().length > 0) {
    return { imageSize: "2K", aspectRatio };
  }
  return { imageSize: "2K" };
}


/**
 * Builds a complete prompt directly from user selections + pre-built templates
 * No AI analysis needed - uses the rich prompt templates from constants.ts
 */
const buildBasePrompt = (
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

const buildGenerationPrompt = (
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null,
  spatialMap?: SpatialMap,
  userInstructionNotes?: string,
  applyManualRailOverride?: boolean,
  modificationRequest?: string
): string => {
  let prompt = buildBasePrompt(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle
  );

  const preferenceContext = buildPreferenceContext(userPreferences);
  if (preferenceContext) {
    prompt = `${preferenceContext}\n\n${prompt}`;
  }

  if (spatialMap?.placements.length) {
    prompt += '\n\n=== SPATIAL MAP DATA (EXACT COORDINATES) ===\n';
    prompt += formatSpatialMapForPrompt(spatialMap);
    prompt += '\nMANDATORY: Render exactly the listed fixtures at exactly listed [X%, Y%] coordinates. Do not add, remove, or move fixtures.\n';
  }

  const trimmedUserInstructionNotes = sanitizeFreeformDirectiveText(
    userInstructionNotes,
    MAX_USER_DIRECTIVE_CHARS,
    'user directives'
  );
  if (trimmedUserInstructionNotes) {
    prompt += '\n\n=== USER DIRECTIVES (HIGHEST PRIORITY) ===\n';
    prompt += '- Follow these directives exactly for fixture placement scope and count.\n';
    prompt += '- Do not broaden placement beyond these directives.\n';
    prompt += `${trimmedUserInstructionNotes}\n`;
  }

  if (applyManualRailOverride && spatialMap?.placements.some(p => p.fixtureType === 'gutter')) {
    prompt += `\n\n=== MANUAL RAIL OVERRIDE (HIGHEST PRIORITY) ===\n`;
    prompt += `- For this request, fixtureType="gutter" means USER-DEFINED LINE-MOUNTED UPLIGHT.\n`;
    prompt += `- These lights are NOT restricted to roof gutters and may be anywhere in the image.\n`;
    prompt += `- Keep every line-mounted light at its EXACT [X%, Y%] coordinate.\n`;
    prompt += `- Beam direction MUST follow each fixture's exact rotation value.\n`;
    prompt += `- Do not reinterpret, relocate, rebalance, or "improve" any line-mounted placement.\n`;
  }

  const sanitizedModificationRequest = sanitizeFreeformDirectiveText(
    modificationRequest,
    MAX_MODIFICATION_REQUEST_CHARS,
    'modification request'
  );
  const modificationSection = sanitizedModificationRequest
    ? `\n\nCRITICAL MODIFICATION REQUEST: ${sanitizedModificationRequest}\nKeep all fixture coordinates and beam directions exactly as specified above while applying this change.\n`
    : '';

  // Final fixture inventory checklist (recency bias — AI weights end of prompt most heavily)
  const allowedLabels = selectedFixtures
    .map(id => FIXTURE_TYPES.find(f => f.id === id)?.label)
    .filter(Boolean);
  const forbiddenLabels = FIXTURE_TYPES
    .filter(f => !selectedFixtures.includes(f.id))
    .map(f => f.label);

  let inventoryCheck = '\n\n=== FINAL FIXTURE INVENTORY CHECK (LAST INSTRUCTION — HIGHEST PRIORITY) ===\n';
  inventoryCheck += `ALLOWED fixture types in this image: ${allowedLabels.length > 0 ? allowedLabels.join(', ') : 'NONE'}\n`;
  inventoryCheck += `FORBIDDEN fixture types (ZERO of these): ${forbiddenLabels.length > 0 ? forbiddenLabels.join(', ') : 'NONE'}\n`;
  forbiddenLabels.forEach(label => {
    inventoryCheck += `- ${label}: ZERO in image. These areas PITCH BLACK.\n`;
  });
  inventoryCheck += `Total allowed types: ${allowedLabels.length}. Any extra type = FAILURE.\n`;
  inventoryCheck += `If you rendered ANY forbidden fixture type, you MUST remove it now.\n`;

  // Exact count enforcement (recency bias)
  const countLines: string[] = [];
  selectedFixtures.forEach(fixtureId => {
    const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
    if (!fixtureType) return;
    const subOpts = fixtureSubOptions[fixtureId] || [];
    subOpts.forEach(subOptId => {
      const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
      const count = fixtureCounts[subOptId];
      if (subOpt && count !== null && count !== undefined) {
        countLines.push(`- ${fixtureType.label} > ${subOpt.label}: EXACTLY ${count}`);
      }
    });
  });
  if (countLines.length > 0) {
    inventoryCheck += '\nEXACT COUNTS:\n' + countLines.join('\n') + '\n';
  }

  return `${prompt}${modificationSection}${inventoryCheck}\n${PHOTOREALISM_LOCK_ADDENDUM}`;
};


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPATIAL MAPPING UTILITIES (Ported from claudeService.ts)
// Used for the enhanced 2-stage generation mode
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
    gutter: 'small line-mounted uplight on the USER-DRAWN RAIL at this EXACT mount position â€” place at EXACT marked position and shine in EXACT marked direction',
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
    const gutterSuffix = fixtureType === 'gutter' ? ' EXACTLY on the USER-DRAWN RAIL at this precise mount position â€" DO NOT move or redistribute' : '';
    const coords = `Place at EXACTLY [${xCoord}%, ${yCoord}%]${gutterSuffix}`;
    const gutterLineHint = fixtureType === 'gutter' && typeof p.gutterLineX === 'number' && typeof p.gutterLineY === 'number'
      ? ` (rail anchor [${p.gutterLineX.toFixed(1)}%, ${p.gutterLineY.toFixed(1)}%])`
      : '';
    const gutterDepthHint = fixtureType === 'gutter' && typeof p.gutterMountDepthPercent === 'number'
      ? ` (mount offset ${p.gutterMountDepthPercent.toFixed(1)}% from rail)`
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

  // Add position enforcement for line-mounted (gutter type) fixtures
  if (fixtureType === 'gutter') {
    narrative += `\nRAIL POSITION ENFORCEMENT: Every line-mounted light MUST remain at its EXACT marked [X%, Y%] mount position on the USER-DRAWN rail. Do NOT redistribute, rebalance, or evenly space them. The user placed each light at a specific location â€" that location is non-negotiable.\n`;
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
  output += `- LINE-MOUNTED UP LIGHTS (fixtureType=gutter): Treat these as USER-DRAWN RAIL fixtures, not literal roof gutters. They may be anywhere in the image. Each one MUST stay at its EXACT [X%, Y%] coordinate and on its user rail anchor if provided.\n`;
  output += `- ALL FIXTURES: Each fixture MUST be rendered at its EXACT [X%, Y%] position AND its light beam MUST shine in the EXACT direction specified by its rotation. If a fixture points UP-RIGHT, the light goes UP-RIGHT. If it points LEFT, the light goes LEFT.\n`;
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

  // Group placements by fixtureType and subOption.
  // Use a delimiter that won't collide with subOption ids like "garage_sides".
  const groups = new Map<string, SpatialFixturePlacement[]>();
  spatialMap.placements.forEach(p => {
    const key = `${p.fixtureType}::${p.subOption || ''}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  });

  // Generate narrative for each group
  groups.forEach((placements, key) => {
    const [fixtureType, subOption] = key.split('::');
    output += generateNarrativePlacement({ ...spatialMap, placements }, fixtureType, subOption);
    output += '\n';
  });

  return output;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function sanitizeFixtureType(type: string): string | null {
  const normalized = (type || '').toLowerCase().trim();
  if (VALID_FIXTURE_TYPES.has(normalized)) return normalized;
  if (normalized === 'uplight') return 'up';
  if (normalized === 'downlight') return 'soffit';
  if (normalized === 'steplight') return 'hardscape';
  return null;
}

interface AutoPlacementSeedPoint {
  x: number;
  y: number;
  description: string;
  target: string;
}

interface ExplicitAutoCountTarget {
  fixtureType: string;
  subOption: string;
  desiredCount: number;
}

function normalizeAutoSubOption(fixtureType: string, subOption?: string): string {
  if (fixtureType === 'gutter') return 'gutterUpLights';
  const normalized = (subOption || '').trim();
  return normalized || 'general';
}

function getAutoPlacementGroupKey(fixtureType: string, subOption: string): string {
  return `${fixtureType}::${subOption}`;
}

function getDefaultAutoYForFixture(fixtureType: string): number {
  switch (fixtureType) {
    case 'gutter':
      return 42;
    case 'soffit':
      return 32;
    case 'up':
      return 72;
    case 'path':
      return 84;
    case 'well':
      return 82;
    case 'hardscape':
      return 76;
    case 'coredrill':
      return 85;
    default:
      return 70;
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildEvenlySpacedAutoSeedPoints(
  count: number,
  fixtureType: string,
  minX: number = 10,
  maxX: number = 90,
  fallbackY?: number
): AutoPlacementSeedPoint[] {
  if (count <= 0) return [];
  const y = clampPercent(typeof fallbackY === 'number' ? fallbackY : getDefaultAutoYForFixture(fixtureType));
  const safeMinX = clampPercent(Math.min(minX, maxX));
  const safeMaxX = clampPercent(Math.max(minX, maxX));
  const span = Math.max(1, safeMaxX - safeMinX);

  return Array.from({ length: count }, (_, idx) => {
    const t = (idx + 1) / (count + 1);
    const x = clampPercent(safeMinX + span * t);
    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      description: `${fixtureType} auto placement`,
      target: `${fixtureType} target`,
    };
  });
}

function buildAutoSeedPointsForCount(
  rawPoints: AutoPlacementSeedPoint[],
  desiredCount: number,
  fixtureType: string
): AutoPlacementSeedPoint[] {
  if (desiredCount <= 0) return [];

  const points = rawPoints
    .map(point => ({
      x: Number(clampPercent(point.x).toFixed(3)),
      y: Number(clampPercent(point.y).toFixed(3)),
      description: point.description || `${fixtureType} auto placement`,
      target: point.target || `${fixtureType} target`,
    }))
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);

  if (points.length === 0) {
    return buildEvenlySpacedAutoSeedPoints(desiredCount, fixtureType);
  }
  if (points.length >= desiredCount) {
    return points.slice(0, desiredCount);
  }

  const defaultY = average(points.map(point => point.y)) || getDefaultAutoYForFixture(fixtureType);
  let minX = points[0].x;
  let maxX = points[points.length - 1].x;
  if (maxX - minX < 8) {
    minX = clampPercent(minX - 15);
    maxX = clampPercent(maxX + 15);
  }
  if (maxX - minX < 6) {
    minX = 10;
    maxX = 90;
  }

  const existing = points.slice();
  const additionsNeeded = desiredCount - existing.length;
  const supplemental = buildEvenlySpacedAutoSeedPoints(
    additionsNeeded,
    fixtureType,
    minX,
    maxX,
    defaultY
  );

  const merged = [...existing];
  for (const candidate of supplemental) {
    const tooClose = merged.some(
      point => Math.abs(point.x - candidate.x) < 1.2 && Math.abs(point.y - candidate.y) < 1.2
    );
    if (!tooClose) {
      merged.push(candidate);
      continue;
    }

    const nudged = {
      ...candidate,
      x: Number(clampPercent(candidate.x + 1.6).toFixed(3)),
    };
    merged.push(nudged);
  }

  if (merged.length < desiredCount) {
    const fallback = buildEvenlySpacedAutoSeedPoints(
      desiredCount - merged.length,
      fixtureType,
      12,
      88,
      defaultY
    );
    merged.push(...fallback);
  }

  return merged
    .sort((a, b) => a.x - b.x)
    .slice(0, desiredCount);
}

function buildExplicitAutoCountTargets(
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>
): ExplicitAutoCountTarget[] {
  const targets: ExplicitAutoCountTarget[] = [];
  const seen = new Set<string>();

  selectedFixtures.forEach(fixtureType => {
    const configuredSubOptions = fixtureSubOptions[fixtureType] || [];
    const subOptions = configuredSubOptions.length > 0
      ? configuredSubOptions
      : (fixtureType === 'gutter' ? ['gutterUpLights'] : []);

    subOptions.forEach(rawSubOption => {
      const normalizedSubOption = normalizeAutoSubOption(fixtureType, rawSubOption);
      const countValue = fixtureCounts[rawSubOption] ?? fixtureCounts[normalizedSubOption];
      if (typeof countValue !== 'number' || !Number.isFinite(countValue)) return;

      const desiredCount = Math.max(0, Math.round(countValue));
      const key = getAutoPlacementGroupKey(fixtureType, normalizedSubOption);
      if (seen.has(key)) return;
      seen.add(key);
      targets.push({ fixtureType, subOption: normalizedSubOption, desiredCount });
    });
  });

  return targets;
}

function reconcileAutoPlacementsToExplicitCounts(
  spatialMap: SpatialMap,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  skipFixtureTypes: Set<string> = new Set()
): { spatialMap: SpatialMap; adjustments: string[] } {
  const targets = buildExplicitAutoCountTargets(selectedFixtures, fixtureSubOptions, fixtureCounts)
    .filter(target => !skipFixtureTypes.has(target.fixtureType));
  if (targets.length === 0) {
    return { spatialMap, adjustments: [] };
  }

  let placements = [...spatialMap.placements];
  const adjustments: string[] = [];

  targets.forEach(target => {
    const matches = placements.filter(
      placement => placement.fixtureType === target.fixtureType && placement.subOption === target.subOption
    );

    if (matches.length === target.desiredCount) return;

    if (matches.length > target.desiredCount) {
      let kept = 0;
      placements = placements.filter(placement => {
        if (placement.fixtureType !== target.fixtureType || placement.subOption !== target.subOption) {
          return true;
        }
        kept += 1;
        return kept <= target.desiredCount;
      });
      adjustments.push(
        `${target.fixtureType}/${target.subOption}: trimmed ${matches.length} -> ${target.desiredCount}`
      );
      return;
    }

    const missing = target.desiredCount - matches.length;
    const seedPointsFromMatches: AutoPlacementSeedPoint[] = matches.map(match => ({
      x: match.horizontalPosition,
      y: match.verticalPosition,
      description: match.description,
      target: match.anchor,
    }));
    const seedPointsFromType: AutoPlacementSeedPoint[] = placements
      .filter(placement => placement.fixtureType === target.fixtureType)
      .map(placement => ({
        x: placement.horizontalPosition,
        y: placement.verticalPosition,
        description: placement.description,
        target: placement.anchor,
      }));
    const seedPoints = seedPointsFromMatches.length > 0 ? seedPointsFromMatches : seedPointsFromType;
    const candidatePoints = seedPoints.length > 0
      ? buildAutoSeedPointsForCount(
          seedPoints,
          target.desiredCount,
          target.fixtureType
        )
      : buildEvenlySpacedAutoSeedPoints(
          target.desiredCount,
          target.fixtureType,
          12,
          88
        );
    if (seedPoints.length === 0) {
      adjustments.push(
        `${target.fixtureType}/${target.subOption}: synthesized fallback anchor points for explicit count ${target.desiredCount}`
      );
    }

    const occupied = matches.map(match => ({
      x: match.horizontalPosition,
      y: match.verticalPosition,
    }));
    const additions: SpatialFixturePlacement[] = [];

    for (const candidate of candidatePoints) {
      if (additions.length >= missing) break;
      const tooCloseToOccupied = [...occupied, ...additions.map(add => ({
        x: add.horizontalPosition,
        y: add.verticalPosition,
      }))].some(
        point => Math.abs(point.x - candidate.x) < 1.1 && Math.abs(point.y - candidate.y) < 1.1
      );
      if (tooCloseToOccupied) continue;

      additions.push({
        id: `auto_reconcile_${target.fixtureType}_${target.subOption}_${matches.length + additions.length + 1}`,
        fixtureType: target.fixtureType,
        subOption: target.subOption,
        horizontalPosition: candidate.x,
        verticalPosition: candidate.y,
        anchor: `auto_reconcile_${target.fixtureType}_${target.subOption}`,
        description: candidate.description || `${target.fixtureType} auto reconciliation`,
      });
    }

    while (additions.length < missing) {
      const idx = matches.length + additions.length + 1;
      const fallbackPoint = buildEvenlySpacedAutoSeedPoints(
        1,
        target.fixtureType,
        10 + (idx % 5),
        90 - (idx % 5),
        seedPoints.length > 0 ? average(seedPoints.map(point => point.y)) : undefined
      )[0];
      additions.push({
        id: `auto_reconcile_${target.fixtureType}_${target.subOption}_${idx}`,
        fixtureType: target.fixtureType,
        subOption: target.subOption,
        horizontalPosition: fallbackPoint.x,
        verticalPosition: fallbackPoint.y,
        anchor: `auto_reconcile_${target.fixtureType}_${target.subOption}`,
        description: `${target.fixtureType} auto reconciliation`,
      });
    }

    placements = [...placements, ...additions];
    adjustments.push(
      `${target.fixtureType}/${target.subOption}: filled ${matches.length} -> ${target.desiredCount}`
    );
  });

  return {
    spatialMap: { ...spatialMap, placements },
    adjustments,
  };
}

function deriveFallbackAutoGutterLines(
  spatialMap: SpatialMap,
  maxLines: number
): GutterLine[] {
  const boundedMaxLines = Math.max(1, Math.min(10, maxLines));
  const gutterPlacements = spatialMap.placements.filter(placement => placement.fixtureType === 'gutter');
  const candidatePoints = gutterPlacements.length > 0
    ? gutterPlacements.map(placement => ({
        x: placement.gutterLineX ?? placement.horizontalPosition,
        y: placement.gutterLineY ?? placement.verticalPosition,
      }))
    : spatialMap.placements
        .filter(placement => placement.fixtureType === 'soffit' || placement.verticalPosition <= 55)
        .map(placement => ({
          x: placement.horizontalPosition,
          y: placement.verticalPosition,
        }));

  if (candidatePoints.length === 0) {
    return [{
      id: 'auto_gutter_fallback_1',
      startX: 12,
      startY: 42,
      endX: 88,
      endY: 42,
      mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
    }];
  }

  const sortedByY = candidatePoints
    .map(point => ({ x: clampPercent(point.x), y: clampPercent(point.y) }))
    .sort((a, b) => a.y - b.y);

  const clusters: Array<{ points: Array<{ x: number; y: number }>; avgY: number }> = [];
  const clusterTolerance = 4.5;
  for (const point of sortedByY) {
    const cluster = clusters.find(item => Math.abs(item.avgY - point.y) <= clusterTolerance);
    if (cluster) {
      cluster.points.push(point);
      cluster.avgY = average(cluster.points.map(p => p.y));
    } else {
      clusters.push({ points: [point], avgY: point.y });
    }
  }

  return clusters
    .sort((a, b) => b.points.length - a.points.length || a.avgY - b.avgY)
    .slice(0, boundedMaxLines)
    .map((cluster, index) => {
      const xs = cluster.points.map(point => point.x).sort((a, b) => a - b);
      const rawMinX = xs[0];
      const rawMaxX = xs[xs.length - 1];
      let minX = rawMinX;
      let maxX = rawMaxX;

      if (maxX - minX < 25) {
        minX = clampPercent(minX - 15);
        maxX = clampPercent(maxX + 15);
      }
      if (maxX - minX < 12) {
        minX = 12;
        maxX = 88;
      }

      const avgY = clampPercent(cluster.avgY);
      return {
        id: `auto_gutter_fallback_${index + 1}`,
        startX: Number(minX.toFixed(3)),
        startY: Number(avgY.toFixed(3)),
        endX: Number(maxX.toFixed(3)),
        endY: Number(avgY.toFixed(3)),
        mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
      };
    });
}

interface AutoPlacementConfidenceGateResult {
  passed: boolean;
  score: number;
  reasons: string[];
  hardFails: string[];
}

function getAutoPlausibleYBand(fixtureType: string): { min: number; max: number } | null {
  switch (fixtureType) {
    case 'up':
      return { min: 50, max: 99 };
    case 'well':
      return { min: 55, max: 99 };
    case 'path':
      return { min: 60, max: 99 };
    case 'hardscape':
      return { min: 55, max: 99 };
    case 'coredrill':
      return { min: 60, max: 99 };
    case 'gutter':
      return { min: 18, max: 62 };
    case 'soffit':
      return { min: 8, max: 58 };
    default:
      return null;
  }
}

function evaluateAutoPlacementConfidence(
  spatialMap: SpatialMap,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  gutterLines?: GutterLine[]
): AutoPlacementConfidenceGateResult {
  let score = 100;
  const reasons: string[] = [];
  const hardFails: string[] = [];
  const placements = spatialMap.placements || [];

  if (selectedFixtures.length > 0 && placements.length === 0) {
    hardFails.push('No auto placements were generated.');
    score -= 100;
  }

  const allowedTypes = new Set(
    selectedFixtures
      .map(type => sanitizeFixtureType(type))
      .filter((type): type is string => !!type)
  );
  const presentTypes = new Set(placements.map(placement => placement.fixtureType));
  const forbiddenTypes = [...presentTypes].filter(type => !allowedTypes.has(type));
  if (forbiddenTypes.length > 0) {
    hardFails.push(`Forbidden fixture types in auto constraints: ${forbiddenTypes.join(', ')}`);
    score -= 45 + Math.max(0, forbiddenTypes.length - 1) * 10;
  }

  const explicitTargets = buildExplicitAutoCountTargets(selectedFixtures, fixtureSubOptions, fixtureCounts);
  explicitTargets.forEach(target => {
    const actualCount = placements.filter(
      placement => placement.fixtureType === target.fixtureType && placement.subOption === target.subOption
    ).length;
    if (actualCount !== target.desiredCount) {
      hardFails.push(
        `Count mismatch ${target.fixtureType}/${target.subOption}: expected ${target.desiredCount}, got ${actualCount}`
      );
      score -= 30;
    }
  });

  let collisionCount = 0;
  const byGroup = new Map<string, SpatialFixturePlacement[]>();
  placements.forEach(placement => {
    const key = getAutoPlacementGroupKey(placement.fixtureType, placement.subOption || 'general');
    const existing = byGroup.get(key) || [];
    existing.push(placement);
    byGroup.set(key, existing);
  });
  byGroup.forEach(groupPlacements => {
    for (let i = 0; i < groupPlacements.length; i++) {
      for (let j = i + 1; j < groupPlacements.length; j++) {
        const a = groupPlacements[i];
        const b = groupPlacements[j];
        const dist = Math.sqrt(
          (a.horizontalPosition - b.horizontalPosition) ** 2 +
          (a.verticalPosition - b.verticalPosition) ** 2
        );
        if (dist < 0.9) collisionCount++;
      }
    }
  });
  if (collisionCount > 0) {
    reasons.push(`Detected ${collisionCount} overlapping/duplicate fixture positions.`);
    score -= Math.min(25, collisionCount * 6);
  }

  let yBandViolations = 0;
  placements.forEach(placement => {
    const band = getAutoPlausibleYBand(placement.fixtureType);
    if (!band) return;
    if (placement.verticalPosition < band.min || placement.verticalPosition > band.max) {
      yBandViolations++;
    }
  });
  if (yBandViolations > 0) {
    reasons.push(`Detected ${yBandViolations} fixture(s) outside plausible Y-bands for their types.`);
    score -= Math.min(20, yBandViolations * 3);
  }

  const gutterPlacements = placements.filter(placement => placement.fixtureType === 'gutter');
  if (gutterPlacements.length > 0) {
    if (!gutterLines || gutterLines.length === 0) {
      hardFails.push('Gutter fixtures exist but no gutter rails were available.');
      score -= 35;
    } else {
      let offRailCount = 0;
      let aboveLineCount = 0;
      let depthOutOfBandCount = 0;

      gutterPlacements.forEach(placement => {
        const nearest = resolveGutterLine(placement, gutterLines);
        if (!nearest) {
          offRailCount++;
          return;
        }

        if (nearest.distance > GUTTER_LINE_TOLERANCE_PERCENT + 0.5) {
          offRailCount++;
        }

        const signedDepth = getSignedDepthFromLine(
          placement.horizontalPosition,
          placement.verticalPosition,
          { x: nearest.x, y: nearest.y, line: nearest.line }
        );

        if (signedDepth < -GUTTER_ABOVE_LINE_TOLERANCE_PERCENT) {
          aboveLineCount++;
        }

        if (
          signedDepth < MIN_GUTTER_MOUNT_DEPTH_PERCENT - 0.2 ||
          signedDepth > MAX_GUTTER_MOUNT_DEPTH_PERCENT + GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT
        ) {
          depthOutOfBandCount++;
        }
      });

      if (offRailCount > 0) {
        hardFails.push(`Detected ${offRailCount} gutter fixture(s) off gutter rails.`);
        score -= 30;
      }
      if (aboveLineCount > 0) {
        hardFails.push(`Detected ${aboveLineCount} gutter fixture(s) mounted above gutter trough.`);
        score -= 30;
      }
      if (depthOutOfBandCount > 0) {
        reasons.push(`Detected ${depthOutOfBandCount} gutter fixture(s) with out-of-band mount depth.`);
        score -= Math.min(15, depthOutOfBandCount * 4);
      }
    }
  }

  const clampedScore = clampScore(score);
  const passed = hardFails.length === 0 && clampedScore >= AUTO_PLACEMENT_CONFIDENCE_MIN_SCORE;

  return {
    passed,
    score: clampedScore,
    reasons: [...hardFails, ...reasons],
    hardFails,
  };
}

const AUTO_FALLBACK_COUNT_BY_TYPE: Record<string, number> = {
  up: 4,
  path: 5,
  coredrill: 3,
  gutter: 2,
  soffit: 4,
  hardscape: 3,
  well: 3,
};

const AUTO_FALLBACK_COUNT_BY_SUBOPTION: Record<string, number> = {
  siding: 6,
  windows: 4,
  entryway: 2,
  columns: 3,
  trees: 3,
  pathway: 6,
  driveway: 6,
  landscaping: 4,
  garage_sides: 2,
  garage_door: 2,
  sidewalks: 3,
  walls: 3,
  steps: 3,
  peaks: 2,
  statues: 2,
  architectural: 3,
  gutterUpLights: 2,
};

function resolveAutoFallbackCount(
  fixtureType: string,
  rawSubOption: string,
  fixtureCounts: Record<string, number | null>
): number {
  const normalizedSubOption = normalizeAutoSubOption(fixtureType, rawSubOption);
  const explicitCount = fixtureCounts[rawSubOption] ?? fixtureCounts[normalizedSubOption];
  if (typeof explicitCount === 'number' && Number.isFinite(explicitCount)) {
    return Math.max(0, Math.round(explicitCount));
  }

  const bySubOption = AUTO_FALLBACK_COUNT_BY_SUBOPTION[normalizedSubOption];
  if (typeof bySubOption === 'number') return bySubOption;

  const byType = AUTO_FALLBACK_COUNT_BY_TYPE[fixtureType];
  if (typeof byType === 'number') return byType;

  return 3;
}

function buildFallbackAutoSpatialMapFromSelections(
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>
): SpatialMap {
  const placements: SpatialFixturePlacement[] = [];
  let groupIndex = 0;

  selectedFixtures.forEach(rawFixtureType => {
    const fixtureType = sanitizeFixtureType(rawFixtureType);
    if (!fixtureType) return;

    const fixtureDef = FIXTURE_TYPES.find(fixture => fixture.id === fixtureType);
    const configuredSubOptions = fixtureSubOptions[fixtureType] || [];
    const subOptions = fixtureDef?.subOptions && fixtureDef.subOptions.length > 0
      ? configuredSubOptions
      : ['general'];

    if (fixtureDef?.subOptions && fixtureDef.subOptions.length > 0 && subOptions.length === 0) {
      return;
    }

    subOptions.forEach((rawSubOption, subOptionIndex) => {
      const normalizedSubOption = normalizeAutoSubOption(fixtureType, rawSubOption);
      const desiredCount = resolveAutoFallbackCount(fixtureType, rawSubOption, fixtureCounts);
      if (desiredCount <= 0) return;

      const lane = (subOptionIndex % 3) - 1;
      const tierInset = Math.floor(subOptionIndex / 3) * 4;
      const minX = clampPercent(10 + tierInset + Math.max(0, lane * 1.5));
      const maxX = clampPercent(90 - tierInset - Math.max(0, -lane * 1.5));
      const fallbackY = clampPercent(getDefaultAutoYForFixture(fixtureType) + lane * 1.2);

      const points = buildEvenlySpacedAutoSeedPoints(
        desiredCount,
        fixtureType,
        minX,
        maxX,
        fallbackY
      );

      points.forEach((point, pointIndex) => {
        placements.push({
          id: `auto_fallback_${fixtureType}_${normalizedSubOption}_${groupIndex + 1}_${pointIndex + 1}`,
          fixtureType,
          subOption: normalizedSubOption,
          horizontalPosition: point.x,
          verticalPosition: point.y,
          anchor: `auto_fallback_${fixtureType}_${normalizedSubOption}`,
          description: `${fixtureType} fallback placement (${normalizedSubOption})`,
        });
      });

      groupIndex += 1;
    });
  });

  return { features: [], placements };
}

function buildAutoSpatialMapFromSuggestions(
  suggestions: SuggestedFixture[],
  selectedFixtures: string[],
  fixtureCounts: Record<string, number | null>
): SpatialMap {
  const selectedFixtureSet = new Set(
    selectedFixtures
      .map(fixture => sanitizeFixtureType(fixture))
      .filter((fixture): fixture is string => !!fixture)
  );
  const grouped = new Map<string, {
    fixtureType: string;
    subOption: string;
    priority: number;
    points: AutoPlacementSeedPoint[];
    suggestedCount: number;
  }>();

  suggestions
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .forEach(suggestion => {
      const fixtureType = sanitizeFixtureType(suggestion.fixtureType);
      if (!fixtureType || !selectedFixtureSet.has(fixtureType)) return;

      const normalizedSubOption = normalizeAutoSubOption(fixtureType, suggestion.subOption);
      const key = getAutoPlacementGroupKey(fixtureType, normalizedSubOption);
      const existing = grouped.get(key);
      const group = existing || {
        fixtureType,
        subOption: normalizedSubOption,
        priority: suggestion.priority,
        points: [] as AutoPlacementSeedPoint[],
        suggestedCount: 0,
      };

      group.priority = Math.min(group.priority, suggestion.priority);
      const positions = Array.isArray(suggestion.positions) ? suggestion.positions : [];
      if (positions.length > 0) {
        positions.forEach(position => {
          group.points.push({
            x: position.xPercent,
            y: position.yPercent,
            description: position.description || `${fixtureType} auto placement`,
            target: position.target || `${fixtureType} target`,
          });
        });
      }
      if (Number.isFinite(suggestion.count)) {
        group.suggestedCount += Math.max(0, Math.round(suggestion.count));
      }

      grouped.set(key, group);
    });

  const placements: SpatialFixturePlacement[] = [];
  [...grouped.values()]
    .sort((a, b) => a.priority - b.priority || a.fixtureType.localeCompare(b.fixtureType))
    .forEach((group, groupIdx) => {
      const explicitCount = fixtureCounts[group.subOption];
      const hasExplicitCount = typeof explicitCount === 'number' && Number.isFinite(explicitCount);
      if (
        !hasExplicitCount &&
        group.points.length === 0 &&
        group.suggestedCount <= 0
      ) {
        return;
      }
      if (hasExplicitCount && group.points.length === 0) {
        // No confident anchor points for an explicit user count.
        // Skip blind placement so confidence gate can fail fast instead of guessing.
        return;
      }

      const desiredCount = hasExplicitCount
        ? Math.max(0, Math.round(explicitCount))
        : Math.max(1, Math.round(group.suggestedCount || group.points.length || 1));

      const points = buildAutoSeedPointsForCount(group.points, desiredCount, group.fixtureType);
      points.forEach((point, idx) => {
        placements.push({
          id: `auto_${group.fixtureType}_${group.subOption}_${groupIdx + 1}_${idx + 1}`,
          fixtureType: group.fixtureType,
          subOption: group.subOption,
          horizontalPosition: point.x,
          verticalPosition: point.y,
          anchor: `auto_${group.fixtureType}_${idx + 1}`,
          description: point.description || point.target || `${group.fixtureType} auto placement`,
        });
      });
    });

  return { features: [], placements };
}

function ensureAutoGutterRailPlacements(
  spatialMap: SpatialMap,
  gutterLines: GutterLine[] | undefined,
  fixtureCounts: Record<string, number | null>
): SpatialMap {
  if (!gutterLines || gutterLines.length === 0) return spatialMap;

  const otherPlacements = spatialMap.placements.filter(placement => placement.fixtureType !== 'gutter');
  const existingGutters = spatialMap.placements
    .filter(placement => placement.fixtureType === 'gutter')
    .sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  const requestedCount = fixtureCounts['gutterUpLights'];
  const desiredCount = typeof requestedCount === 'number'
    ? Math.max(0, Math.round(requestedCount))
    : Math.max(existingGutters.length, Math.max(2, Math.min(6, gutterLines.length * 2)));
  const retainedGutters = existingGutters.slice(0, desiredCount);
  const missingCount = Math.max(0, desiredCount - retainedGutters.length);
  if (missingCount === 0) {
    return {
      ...spatialMap,
      placements: [...otherPlacements, ...retainedGutters],
    };
  }

  const lineCount = gutterLines.length;
  const basePerLine = Math.floor(missingCount / lineCount);
  let remainder = missingCount % lineCount;
  const generated: SpatialFixturePlacement[] = [];

  gutterLines.forEach((line, lineIndex) => {
    const placementsForLine = basePerLine + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    if (placementsForLine <= 0) return;

    const depth = resolveRequestedGutterDepth(undefined, line);
    for (let i = 0; i < placementsForLine; i++) {
      const t = (i + 1) / (placementsForLine + 1);
      const lineX = line.startX + (line.endX - line.startX) * t;
      const lineY = line.startY + (line.endY - line.startY) * t;
      const mounted = applyGutterMountDepth(lineX, lineY, line, depth);

      generated.push({
        id: `auto_gutter_rail_${lineIndex + 1}_${retainedGutters.length + generated.length + 1}`,
        fixtureType: 'gutter',
        subOption: 'gutterUpLights',
        horizontalPosition: Number(mounted.mountX.toFixed(3)),
        verticalPosition: Number(mounted.mountY.toFixed(3)),
        anchor: `gutter_line_${lineIndex + 1}`,
        description: 'Auto rail placement from detected gutter line',
        gutterLineId: line.id,
        gutterLineX: Number(lineX.toFixed(3)),
        gutterLineY: Number(lineY.toFixed(3)),
        gutterMountDepthPercent: Number(mounted.appliedDepth.toFixed(3)),
      });
    }
  });

  if (generated.length === 0) return spatialMap;
  return {
    ...spatialMap,
    placements: [...otherPlacements, ...retainedGutters, ...generated],
  };
}

// -------------------------------------------------------------------------------
// 2-STAGE PIPELINE: Deep Think -> Nano Banana 2
// -------------------------------------------------------------------------------


/**
 * Stage 2 (New Pipeline): Thin wrapper around Nano Banana 2 API.
 * Takes the prompt from Deep Think + images and generates the night scene.
 */
export async function executeGeneration(
  imageBase64: string,
  imageMimeType: string,
  generationPrompt: string,
  aspectRatio?: string,
  prefixParts?: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }>
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const sanitizedImageBase64 = extractBase64Data(imageBase64);
  const { prompt: sanitizedPrompt, removedBytes } = sanitizeGenerationPrompt(generationPrompt);
  generationPrompt = sanitizedPrompt;

  if (removedBytes > 0) {
    console.warn(`[executeGeneration] Removed ${removedBytes} chars of embedded base64/image data from the prompt.`);
  }

  // Guard rails: a multi-megabyte prompt almost always means an image/base64 dump.
  // Clip oversized prompts to avoid quota burn and return a best-effort result.
  if (generationPrompt.length > MAX_GENERATION_PROMPT_CHARS) {
    const originalLength = generationPrompt.length;
    const likelyBase64 = looksLikeBase64Blob(generationPrompt);
    generationPrompt = `${generationPrompt.slice(0, MAX_GENERATION_PROMPT_CHARS)}\n[TRUNCATED_OVERSIZED_PROMPT]`;
    console.warn(
      `[executeGeneration] Prompt truncated from ${originalLength} to ${MAX_GENERATION_PROMPT_CHARS} chars.` +
      (likelyBase64 ? ' Detected potential base64-like content in prompt.' : '')
    );
  }

  if (!sanitizedImageBase64 || sanitizedImageBase64.length < 1000) {
    throw new Error('INVALID_IMAGE_DATA: Missing/invalid base64 image data for generation.');
  }

  // Resize images to prevent timeouts
  const resizedImage = await resizeImageBase64(sanitizedImageBase64, imageMimeType);

  // Build parts array
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];

  // Few-shot references first
  if (prefixParts && prefixParts.length > 0) {
    imageParts.push(...prefixParts);
  }

  // Base image
  imageParts.push({ inlineData: { data: resizedImage, mimeType: imageMimeType } });

  // The prompt from Deep Think
  imageParts.push({ text: generationPrompt });

  console.log(`[executeGeneration] Sending to Nano Banana 2. Prompt: ${generationPrompt.length} chars, Images: ${imageParts.filter(p => 'inlineData' in p).length}`);

  const response = await (async () => {
    try {
      return await withRetry(
        () =>
          withTimeout(
            ai.models.generateContent({
              model: IMAGE_MODEL_NAME, // gemini-3.1-flash-image-preview
              contents: { parts: imageParts },
              config: {
                temperature: 0.1,
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: buildImageConfig(aspectRatio),
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
          ),
        3,
        2000
      );
    } catch (error) {
      if (isQuotaExceededError(error)) {
        const retryDelayMs = parseProviderRetryDelayMs(error);
        const retryHint = retryDelayMs
          ? ` Please retry in about ${Math.max(1, Math.ceil(retryDelayMs / 1000))} seconds.`
          : ' Please retry shortly.';
        throw new Error(`STAGE_2_QUOTA_EXCEEDED: Gemini image quota exceeded.${retryHint}`);
      }
      throw error;
    }
  })();

  // Extract image from response
  if (response.candidates?.[0]?.content?.parts) {
    const selectedImage = selectGeneratedImagePart(response.candidates[0].content.parts, [sanitizedImageBase64, resizedImage]);
    if (selectedImage) {
      return `data:${selectedImage.mimeType};base64,${selectedImage.data}`;
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
const DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT = 0.6;
const MIN_GUTTER_MOUNT_DEPTH_PERCENT = 0.2;
const MAX_GUTTER_MOUNT_DEPTH_PERCENT = 2.0;
const GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT = 0.9;
const GUTTER_ABOVE_LINE_TOLERANCE_PERCENT = 0.2;

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

      const nearest = findNearestGutterProjection(p.horizontalPosition, p.verticalPosition, gutterLines);
      if (gutterLines && gutterLines.length > 0 && (!nearest || nearest.distance > GUTTER_LINE_TOLERANCE_PERCENT)) {
        const dist = nearest ? nearest.distance.toFixed(2) : 'n/a';
        errors.push(`Fixture #${idx} (gutter): not on a user-defined rail (distance ${dist}%, tolerance ${GUTTER_LINE_TOLERANCE_PERCENT}%)`);
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
 * PASS 1: Convert daytime photo to clean nighttime base with NO lights.
 * Result is cached by the caller so subsequent generations skip this step.
 */
export async function generateNightBase(
  imageBase64: string,
  imageMimeType: string,
  aspectRatio?: string
): Promise<string> {
  console.log('[Pass 1] Generating nighttime base (no lights)...');

  const prompt = `Convert this daytime photograph into a photorealistic nighttime scene.

REQUIREMENTS:
- Deep 1AM darkness with true black sky (#000000 to #0A0A0A) and ONE realistic full moon
- No stylized stars, fantasy sky effects, or dramatic cloud glows
- The house and landscaping should be barely visible in deep shadow
- Do NOT add ANY lighting fixtures, landscape lights, porch lights, sconces, or any artificial light sources
- Every window MUST be completely dark with no interior glow
- Preserve the EXACT framing, composition, architecture, and all objects pixel-perfect
- Do NOT add, remove, or modify architectural elements, trees, bushes, or hardscape
- The ONLY change is time-of-day conversion: daytime to deep nighttime`;

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const resized = await resizeImageBase64(imageBase64, imageMimeType);

  const response = await withTimeout(
    ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: [
        { inlineData: { data: resized, mimeType: imageMimeType } },
        { text: prompt }
      ]},
      config: {
        temperature: 0.1,
        imageConfig: buildImageConfig(aspectRatio),
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
 * Manual-mode generation (strict 2-step Gemini pipeline).
 * Step 1: Deterministic prompt assembly from user selections + spatial map.
 * Step 2: Gemini image model renders final result from the source image + prompt.
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
  _targetRatio: string,
  userPreferences?: UserPreferences | null,
  onStageUpdate?: (stage: string) => void,
  _fixtures?: LightFixture[],
  _nightBaseBase64?: string,
  gutterLines?: GutterLine[],
  modificationRequest?: string
): Promise<{ result: string; nightBase: string }> => {
  console.log('[Manual Mode] Starting deterministic 2-step Gemini pipeline...');
  console.log(`[Manual Mode] ${spatialMap.placements.length} fixtures to render`);

  const normalized = normalizeGutterPlacements(spatialMap, gutterLines);
  const normalizedSpatialMap = normalized.spatialMap;
  if (normalized.snappedCount > 0) {
    console.log(`[Manual Mode] Normalized ${normalized.snappedCount} gutter fixture(s) onto gutter lines before generation.`);
  }

  // Validate placements before spending an API call
  const validation = validateManualPlacements(normalizedSpatialMap, gutterLines);
  if (!validation.valid) {
    console.error('[Manual Mode] Validation FAILED:', validation.errors);
    throw new Error(`Manual placement validation failed:\n${validation.errors.join('\n')}`);
  }

  // Keep source composition unchanged for coordinate fidelity.
  const manualAspectRatio: string | undefined = undefined;
  const generationBaseImage = imageBase64;

  // Step 1: Assemble deterministic prompt (no Deep Think call)
  onStageUpdate?.('analyzing');
  console.log('[Manual Mode] Step 1/2: Building deterministic prompt from selections + spatial map...');
  const lockedPrompt = buildGenerationPrompt(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    normalizedSpatialMap,
    undefined,
    true,
    modificationRequest
  );
  console.log(`[Manual Mode] Prompt assembled. Length: ${lockedPrompt.length} chars`);

  // Step 2: Generate with Gemini image model
  onStageUpdate?.('placing');
  console.log('[Manual Mode] Step 2/2: Generating final image with Gemini image model...');
  let result = await executeGeneration(
    generationBaseImage,
    imageMimeType,
    lockedPrompt,
    manualAspectRatio
  );

  // Fixture type compliance check — retry once if forbidden types detected
  const compliance = await verifyFixtureCompliance(result, imageMimeType, selectedFixtures);
  if (!compliance.passed) {
    console.warn(`[Manual Mode] Fixture compliance failed, retrying without: ${compliance.violatingTypes.join(', ')}`);
    const correctionPrompt = buildFixtureComplianceCorrectionPrompt(lockedPrompt, compliance.violatingTypes);
    result = await executeGeneration(generationBaseImage, imageMimeType, correctionPrompt, manualAspectRatio);
  }

  return { result, nightBase: generationBaseImage };
};

/**
 * Enhanced Night Scene Generation using the fixed 2-stage pipeline
 * This replaces the Claude + Gemini hybrid mode with a Gemini-only pipeline
 * 2-Stage Pipeline: Deterministic prompt assembly -> Nano Banana 2 (image generation)
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
  onAutoConstraintsResolved?: (constraints: {
    expectedPlacements: SpatialFixturePlacement[];
    gutterLines?: GutterLine[];
  }) => void,
  userInstructionNotes?: string
): Promise<string> => {
  console.log('[Enhanced Mode] Starting deterministic 2-step Gemini pipeline...');
  const hasUserSpecifiedCounts = buildExplicitAutoCountTargets(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts
  ).length > 0;
  const hasPlacementScopeNotes = !!userInstructionNotes?.includes('PLACEMENT NOTES (NON-NEGOTIABLE):');
  const strictAutoLockRequired = hasUserSpecifiedCounts || hasPlacementScopeNotes;

  // Optional spatial extraction (still Gemini 3.1 Pro analysis only)
  onStageUpdate?.('analyzing');
  let autoSpatialMap: SpatialMap | undefined;
  let autoGutterLines: GutterLine[] | undefined;

  try {
    if (selectedFixtures.length > 0) {
      console.log('[Enhanced Mode] Building auto spatial map from enhanced analysis...');
      const enhanced = await enhancedAnalyzeProperty(
        imageBase64,
        imageMimeType,
        selectedFixtures,
        fixtureSubOptions
      );
      const filteredSuggestions = getFilteredSuggestions(
        enhanced,
        selectedFixtures,
        fixtureSubOptions
      );
      autoSpatialMap = buildAutoSpatialMapFromSuggestions(
        filteredSuggestions,
        selectedFixtures,
        fixtureCounts
      );
      console.log(`[Enhanced Mode] Auto spatial map contains ${autoSpatialMap.placements.length} placement(s).`);

      if (autoSpatialMap) {
        const reconciled = reconcileAutoPlacementsToExplicitCounts(
          autoSpatialMap,
          selectedFixtures,
          fixtureSubOptions,
          fixtureCounts
        );
        autoSpatialMap = reconciled.spatialMap;
        if (reconciled.adjustments.length > 0) {
          console.log('[Enhanced Mode] Auto count reconciliation:', reconciled.adjustments.join(' | '));
        }
      }

      if (!autoSpatialMap || autoSpatialMap.placements.length === 0) {
        const fallbackAutoMap = buildFallbackAutoSpatialMapFromSelections(
          selectedFixtures,
          fixtureSubOptions,
          fixtureCounts
        );
        if (fallbackAutoMap.placements.length > 0) {
          autoSpatialMap = fallbackAutoMap;
          console.warn(
            `[Enhanced Mode] Falling back to deterministic auto placements (${fallbackAutoMap.placements.length} placement(s)) because analysis suggestions were insufficient.`
          );
        }
      }

      if (autoSpatialMap?.placements.some(placement => placement.fixtureType === 'gutter')) {
        autoGutterLines = deriveFallbackAutoGutterLines(autoSpatialMap, MAX_AUTO_GUTTER_LINES);
        autoSpatialMap = ensureAutoGutterRailPlacements(autoSpatialMap, autoGutterLines, fixtureCounts);
      }

      if (autoSpatialMap) {
        const confidenceGate = evaluateAutoPlacementConfidence(
          autoSpatialMap,
          selectedFixtures,
          fixtureSubOptions,
          fixtureCounts,
          autoGutterLines
        );
        if (!confidenceGate.passed) {
          const reason = confidenceGate.reasons.length > 0
            ? confidenceGate.reasons.join(' | ')
            : `Auto placement confidence score ${confidenceGate.score} below required threshold.`;
          if (strictAutoLockRequired) {
            throw new Error(`AUTO_PLACEMENT_UNCERTAIN: Unable to lock auto-placement confidently. ${reason}`);
          }
          console.warn('[Enhanced Mode] Auto placement confidence below threshold, continuing with prompt-only constraints:', reason);
          autoSpatialMap = undefined;
          autoGutterLines = undefined;
          onAutoConstraintsResolved?.({ expectedPlacements: [], gutterLines: undefined });
        }
      }

      onAutoConstraintsResolved?.({
        expectedPlacements: autoSpatialMap?.placements ?? [],
        gutterLines: autoGutterLines,
      });
    }
  } catch (autoConstraintError) {
    console.warn('[Enhanced Mode] Auto spatial map build failed:', autoConstraintError);
    onAutoConstraintsResolved?.({ expectedPlacements: [], gutterLines: undefined });
    if (strictAutoLockRequired && !isRetryableProviderError(autoConstraintError)) {
      throw autoConstraintError;
    }
    if (strictAutoLockRequired) {
      console.warn(
        '[Enhanced Mode] Continuing without strict auto spatial lock due to temporary Stage 1 provider unavailability.'
      );
    }
    autoSpatialMap = undefined;
    autoGutterLines = undefined;
  }

  // Step 1: Assemble deterministic prompt (no Deep Think call)
  onStageUpdate?.('analyzing');
  console.log('[Enhanced Mode] Step 1/2: Building deterministic prompt from selections...');
  const lockedPrompt = buildGenerationPrompt(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    autoSpatialMap,
    userInstructionNotes
  );
  console.log(`[Enhanced Mode] Prompt assembled. Length: ${lockedPrompt.length} chars`);

  // Step 2: Generate with Gemini image model
  onStageUpdate?.('generating');
  console.log('[Enhanced Mode] Step 2/2: Generating final image with Gemini image model...');
  let result = await executeGeneration(
    imageBase64,
    imageMimeType,
    lockedPrompt,
    targetRatio
  );


  // Fixture type compliance check — retry once if forbidden types detected
  const compliance = await verifyFixtureCompliance(result, imageMimeType, selectedFixtures);
  if (!compliance.passed) {
    console.warn(`[Enhanced Mode] Fixture compliance failed, retrying without: ${compliance.violatingTypes.join(', ')}`);
    const correctionPrompt = buildFixtureComplianceCorrectionPrompt(lockedPrompt, compliance.violatingTypes);
    result = await executeGeneration(imageBase64, imageMimeType, correctionPrompt, targetRatio);
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
    const response = await withRetry(async () => {
      const analyzePromise = ai.models.generateContent({
        model: GEMINI_3_1_PRO_MODEL_NAME,
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

      return withTimeout(
        analyzePromise,
        ENHANCED_ANALYSIS_TIMEOUT_MS,
        'Enhanced property analysis timed out. Please try again.'
      );
    }, STAGE1_RETRY_MAX_ATTEMPTS, STAGE1_RETRY_INITIAL_DELAY_MS);

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
            const embeddedJsonMatch = textPart.text.match(/\{[\s\S]*\}/);
            if (embeddedJsonMatch) {
              try {
                const recovered = JSON.parse(embeddedJsonMatch[0]) as EnhancedHouseAnalysis;
                console.warn('[Enhanced Analysis] Primary JSON parse failed; recovered embedded JSON object.');
                return enrichAnalysisWithRecommendations(recovered);
              } catch {
                // Continue to hard failure below.
              }
            }

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

function normalizeSubOptionToken(value?: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const SUB_OPTION_ALIAS_BY_FIXTURE: Record<string, Record<string, string>> = {
  up: {
    wall: 'siding',
    walls: 'siding',
    facade: 'siding',
    facades: 'siding',
    window: 'windows',
    windows: 'windows',
    entry: 'entryway',
    doorway: 'entryway',
    door: 'entryway',
    frontdoor: 'entryway',
    porchentry: 'entryway',
    column: 'columns',
    columns: 'columns',
    pillar: 'columns',
    pillars: 'columns',
    pilaster: 'columns',
    pilasters: 'columns',
    tree: 'trees',
    trees: 'trees',
    landscaping: 'trees',
    landscape: 'trees',
  },
  path: {
    walk: 'pathway',
    walkway: 'pathway',
    walkways: 'pathway',
    path: 'pathway',
    pathway: 'pathway',
    sidewalk: 'pathway',
    sidewalks: 'pathway',
    drive: 'driveway',
    driveway: 'driveway',
    landscaping: 'landscaping',
    landscape: 'landscaping',
    beds: 'landscaping',
    plantingbeds: 'landscaping',
  },
  coredrill: {
    garageside: 'garage_sides',
    garagesides: 'garage_sides',
    garagewall: 'garage_sides',
    garagewalls: 'garage_sides',
    garagedoor: 'garage_door',
    garagedoors: 'garage_door',
    sidewalk: 'sidewalks',
    sidewalks: 'sidewalks',
    walkway: 'sidewalks',
    drive: 'driveway',
    driveway: 'driveway',
  },
  gutter: {
    gutter: 'gutterUpLights',
    gutteruplight: 'gutterUpLights',
    gutteruplights: 'gutterUpLights',
    dormer: 'gutterUpLights',
    dormers: 'gutterUpLights',
    peak: 'gutterUpLights',
    peaks: 'gutterUpLights',
    roofline: 'gutterUpLights',
    secondstory: 'gutterUpLights',
    secondstoryfacade: 'gutterUpLights',
  },
  soffit: {
    window: 'windows',
    windows: 'windows',
    column: 'columns',
    columns: 'columns',
    wall: 'siding',
    walls: 'siding',
    siding: 'siding',
    peak: 'peaks',
    peaks: 'peaks',
    gable: 'peaks',
    gables: 'peaks',
  },
  hardscape: {
    column: 'columns',
    columns: 'columns',
    wall: 'walls',
    walls: 'walls',
    retainingwall: 'walls',
    retainingwalls: 'walls',
    step: 'steps',
    steps: 'steps',
    stair: 'steps',
    stairs: 'steps',
  },
  well: {
    tree: 'trees',
    trees: 'trees',
    statue: 'statues',
    statues: 'statues',
    architectural: 'architectural',
    architecture: 'architectural',
    accent: 'architectural',
  },
};

function resolveSuggestedSubOptionId(
  fixtureType: string,
  suggestionSubOption: string | undefined,
  selectedSubOptions: Record<string, string[]>
): string | null {
  const fixtureDef = FIXTURE_TYPES.find(ft => ft.id === fixtureType);
  const selectedForFixture = selectedSubOptions[fixtureType] || [];
  const hasConfigurableSubOptions = !!fixtureDef?.subOptions && fixtureDef.subOptions.length > 0;

  if (!hasConfigurableSubOptions) {
    const raw = (suggestionSubOption || '').trim();
    return raw || null;
  }

  if (selectedForFixture.length === 0) return null;

  const raw = (suggestionSubOption || '').trim();
  if (raw && selectedForFixture.includes(raw)) return raw;

  const token = normalizeSubOptionToken(raw);
  if (token) {
    const idMatch = selectedForFixture.find(id => normalizeSubOptionToken(id) === token);
    if (idMatch) return idMatch;

    const labelMatch = fixtureDef!.subOptions
      .filter(option => selectedForFixture.includes(option.id))
      .find(option => normalizeSubOptionToken(option.label) === token);
    if (labelMatch) return labelMatch.id;

    const aliasTarget = SUB_OPTION_ALIAS_BY_FIXTURE[fixtureType]?.[token];
    if (aliasTarget && selectedForFixture.includes(aliasTarget)) {
      return aliasTarget;
    }
  }

  if (fixtureType === 'gutter' && selectedForFixture.includes('gutterUpLights')) {
    return 'gutterUpLights';
  }

  return selectedForFixture.length === 1 ? selectedForFixture[0] : null;
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

  const selectedFixtureSet = new Set(
    selectedFixtures
      .map(fixture => sanitizeFixtureType(fixture))
      .filter((fixture): fixture is string => !!fixture)
  );

  return analysis.suggestedFixtures
    .map(suggestion => {
      const fixtureType = sanitizeFixtureType(suggestion.fixtureType);
      if (!fixtureType || !selectedFixtureSet.has(fixtureType)) return null;

      const fixtureDef = FIXTURE_TYPES.find(ft => ft.id === fixtureType);
      const resolvedSubOption = resolveSuggestedSubOptionId(
        fixtureType,
        suggestion.subOption,
        selectedSubOptions
      );

      if (fixtureDef?.subOptions && fixtureDef.subOptions.length > 0 && !resolvedSubOption) {
        return null;
      }

      return {
        ...suggestion,
        fixtureType,
        subOption: resolvedSubOption || suggestion.subOption,
      };
    })
    .filter((suggestion): suggestion is SuggestedFixture => !!suggestion)
    .sort((a, b) => a.priority - b.priority);
}
