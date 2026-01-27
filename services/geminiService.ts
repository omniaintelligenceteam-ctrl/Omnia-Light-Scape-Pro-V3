
import { GoogleGenAI } from "@google/genai";
import type { UserPreferences, PropertyAnalysis, FixtureSelections, LightingPlan, FixturePlacement } from "../types";

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
): Promise<PropertyAnalysis> => {
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
  }
}

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
    return 'one per gable peak';
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

/**
 * Stage 3: PROMPTING
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
  const getIntensityPrompt = (val: number) => {
    if (val < 25) return `Lighting Intensity: SUBTLE (2-3W LED equivalent).
    - Faint accent glow, minimal brightness
    - Light barely reaches first story soffit
    - Soft pools of light at fixture base
    - Beam edges extremely soft and diffused
    - Minimal atmospheric scatter visible
    - Very subtle lens glow at fixture
    - Best for: Ambient mood, pathway marking`;

    if (val < 50) return `Lighting Intensity: MODERATE (4-5W LED equivalent).
    - Standard 1st story reach (8-12 ft walls)
    - Light reaches soffit with gentle falloff
    - Visible wall grazing without hot spots
    - Soft beam edges with 6-8 inch feather zone
    - Subtle atmospheric glow near fixture
    - Visible lens glow, tiny bloom halo
    - Some bounce light on adjacent surfaces
    - Best for: Single-story homes, accent features`;

    if (val < 75) return `Lighting Intensity: BRIGHT (6-8W LED equivalent).
    - 2nd story reach (18-25 ft walls)
    - Strong wall grazing to higher soffits
    - More pronounced beam visibility
    - Visible light cone in air near fixture (subtle)
    - Noticeable bloom around fixture lens
    - Clear bounce light on ground/adjacent areas
    - Beam feathers over 8-12 inch transition zone
    - Best for: Two-story facades, tall trees`;

    return `Lighting Intensity: HIGH POWER (10-15W LED equivalent).
    - Full 2-3 story reach (25+ ft walls)
    - Intense beams reaching tall soffits
    - Maximum wall coverage
    - Pronounced atmospheric scatter near fixture
    - Strong lens bloom and halo effect
    - Significant bounce/fill light contribution
    - Beam still feathers at edges (10-15 inch zone)
    - Best for: Tall facades, commercial, dramatic effect`;
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return `Beam Angle: 15 DEGREES (NARROW SPOT).
    - Tight, focused columns of light
    - Light cone spreads ~2.5 feet at 10 feet distance
    - Hot center with rapid but SOFT falloff to edges
    - Edge transition zone: 3-4 inches (still soft, not sharp)
    - Creates dramatic accent with defined but feathered boundary
    - Best for: Architectural columns, narrow trees, specific focal points`;

    if (angle <= 30) return `Beam Angle: 30 DEGREES (SPOT).
    - Defined beam with moderate spread
    - Light cone spreads ~5 feet at 10 feet distance
    - Hot center transitioning to soft edges over 6-8 inches
    - Visible beam definition but edges are diffused, not crisp
    - Best for: Accent lighting on facades, medium trees, entry features`;

    if (angle >= 60) return `Beam Angle: 60 DEGREES (WIDE FLOOD).
    - Broad, even wash of light
    - Light cone spreads ~11 feet at 10 feet distance
    - Very soft, gradual edge transitions (12+ inches)
    - No distinct beam boundary - blends smoothly into darkness
    - Creates seamless wall wash effect
    - Best for: Wall washing, large facades, area lighting`;

    return `Beam Angle: 45 DEGREES (FLOOD).
    - Standard professional landscape spread
    - Light cone spreads ~8 feet at 10 feet distance
    - Balanced hot center with 8-10 inch feathered edges
    - Soft but discernible beam shape
    - Best for: General facade lighting, medium wall areas`;
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
        }
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