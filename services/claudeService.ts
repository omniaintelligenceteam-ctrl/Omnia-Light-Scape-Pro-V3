/**
 * Claude Service - Claude Opus 4.5 Integration for Property Analysis
 *
 * This service uses Claude Opus 4.5 for superior reasoning and prompt crafting,
 * paired with Nano Banana Pro (gemini-3-pro-image-preview) for image generation.
 *
 * Hybrid Flow:
 * 1. Claude Opus 4.5 analyzes property + crafts optimized prompt (1 API call)
 * 2. Nano Banana Pro generates image with Claude's prompt (1 API call)
 *
 * Total: 2 API calls vs previous 5 API calls
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PropertyAnalysis, UserPreferences, SpatialMap, SpatialFixturePlacement } from '../types';
import { FIXTURE_TYPES, SYSTEM_PROMPT } from '../constants';

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true // Required for browser-based usage
  });
};

// Claude Opus 4.5 model ID (released November 2025)
const CLAUDE_MODEL = 'claude-opus-4-5-20251101';

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
 * Response type from Claude's analysis
 */
export interface ClaudeAnalysisResult {
  analysis: PropertyAnalysis;
  optimizedPrompt: string;
  reasoning: string;
  spatialMap?: SpatialMap;  // Grid-based feature and fixture placement map
}

/**
 * Builds a comprehensive analysis prompt for Claude
 */
function buildClaudeAnalysisPrompt(
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null
): string {
  // Build user's fixture selection summary
  const fixtureSelectionSummary = selectedFixtures.length > 0
    ? selectedFixtures.map(f => {
        const subOpts = fixtureSubOptions[f] || [];
        const subOptStr = subOpts.length > 0 ? ` (${subOpts.join(', ')})` : '';
        return `- ${f}${subOptStr}`;
      }).join('\n')
    : '- No fixtures selected';

  // Build quantity summary
  const quantitySummary = Object.entries(fixtureCounts)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `- ${k}: EXACTLY ${v} fixtures (do not change)`)
    .join('\n') || '- All set to Auto (AI recommends based on property)';

  // Build fixture details with prompts from constants
  let fixtureDetails = '';
  selectedFixtures.forEach(fixtureId => {
    const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
    if (fixtureType) {
      const subOpts = fixtureSubOptions[fixtureId] || [];
      subOpts.forEach(subOptId => {
        const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
        if (subOpt) {
          const count = fixtureCounts[subOptId];
          fixtureDetails += `
### ${fixtureType.label} - ${subOpt.label}
- Count: ${count !== null ? `EXACTLY ${count}` : 'Auto (recommend based on property)'}
- Prompt template: ${subOpt.prompt}
- Dark state (when NOT selected): ${subOpt.darkDescription}
`;
        }
      });
    }
  });

  // Build prohibitions for non-selected fixtures
  let prohibitions = '\n### FIXTURES THAT MUST REMAIN OFF (DARK):\n';
  FIXTURE_TYPES.forEach(fixtureType => {
    if (!selectedFixtures.includes(fixtureType.id)) {
      prohibitions += `- ${fixtureType.label}: MUST be completely dark/off\n`;
    } else {
      // Check for non-selected sub-options
      const selectedSubs = fixtureSubOptions[fixtureType.id] || [];
      fixtureType.subOptions?.forEach(subOpt => {
        if (!selectedSubs.includes(subOpt.id)) {
          prohibitions += `- ${fixtureType.label} / ${subOpt.label}: MUST be completely dark/off\n`;
        }
      });
    }
  });

  // User preferences context
  let preferencesContext = '';
  if (userPreferences && (userPreferences.total_liked || 0) + (userPreferences.total_saved || 0) >= 2) {
    preferencesContext = `
### USER STYLE PREFERENCES (from past feedback):
- Preferred styles: ${userPreferences.style_keywords?.join(', ') || 'None specified'}
- Avoid: ${userPreferences.avoid_keywords?.join(', ') || 'None specified'}
`;
  }

  // Build explicit fixture inventory for inclusion in optimizedPrompt
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
          const countStr = count !== null ? `EXACTLY ${count}` : 'Auto (AI decides based on property)';
          inventoryAllowlist += `- ${fixtureType.label} (${subOpt.label}): ${countStr}\n`;
          if (count !== null) {
            totalFixtureCount += count;
          }
        }
      });
    }
  });

  // Build explicit prohibition list (fixture types not selected)
  let inventoryProhibitions = '';
  FIXTURE_TYPES.forEach(fixtureType => {
    if (!selectedFixtures.includes(fixtureType.id)) {
      // Entire fixture category not selected
      inventoryProhibitions += `- ${fixtureType.label}: FORBIDDEN - ZERO instances allowed\n`;
    } else {
      // Check for non-selected sub-options within selected category
      const selectedSubs = fixtureSubOptions[fixtureType.id] || [];
      fixtureType.subOptions?.forEach(subOpt => {
        if (!selectedSubs.includes(subOpt.id)) {
          inventoryProhibitions += `- ${fixtureType.label} (${subOpt.label}): FORBIDDEN - ZERO instances allowed\n`;
        }
      });
    }
  });

  // Build the inventory reminder section
  const inventoryReminder = `
## FIXTURE INVENTORY REMINDER (COPY THIS INTO optimizedPrompt)
ALLOWED FIXTURES (include ONLY these):
${inventoryAllowlist || '- None selected'}
${totalFixtureCount > 0 ? `EXPECTED TOTAL: approximately ${totalFixtureCount} fixtures` : ''}

FORBIDDEN FIXTURES (ZERO of these):
${inventoryProhibitions || '- None'}
`;

  return `You are a professional landscape lighting designer analyzing a property photo.

## YOUR TASK
1. Analyze the property architecture, landscaping, and hardscape
2. Create an optimized image generation prompt for Nano Banana Pro (Gemini 3 Pro Image)
3. The prompt should follow ALL constraints in the master instruction below

## USER'S FIXTURE SELECTIONS
${fixtureSelectionSummary}

## USER'S QUANTITY SETTINGS
${quantitySummary}

## LIGHTING PARAMETERS
- Color Temperature: ${colorTemperaturePrompt}
- Light Intensity: ${lightIntensity}%
- Beam Angle: ${beamAngle}°

## SELECTED FIXTURE DETAILS
${fixtureDetails}

## PROHIBITION LIST
${prohibitions}
${preferencesContext}
${inventoryReminder}

## MASTER INSTRUCTION (INCLUDE IN YOUR PROMPT)
${SYSTEM_PROMPT.masterInstruction}

## CLOSING REINFORCEMENT (INCLUDE AT END OF YOUR PROMPT)
${SYSTEM_PROMPT.closingReinforcement}

## SPATIAL MAPPING (CRITICAL FOR ACCURATE PLACEMENT)

First, map all architectural features with their horizontal position on the facade.
Use percentages: 0% = far left edge, 100% = far right edge.

Then, for each fixture to place, specify its EXACT horizontal position and anchor it to a feature.

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "analysis": {
    "architecture": {
      "story_count": <1, 2, or 3>,
      "wall_height_estimate": "<8-12ft, 18-25ft, or 25+ft>",
      "facade_materials": ["<materials found>"],
      "windows": {
        "first_floor_count": <number>,
        "second_floor_count": <number>,
        "positions": "<describe window layout>"
      },
      "columns": { "present": <boolean>, "count": <number> },
      "dormers": { "present": <boolean>, "count": <number> },
      "gables": { "present": <boolean>, "count": <number> },
      "entryway": {
        "type": "<single, double, or grand>",
        "has_overhang": <boolean>
      }
    },
    "landscaping": {
      "trees": {
        "count": <number>,
        "sizes": ["<small, medium, or large>"],
        "positions": "<describe locations>"
      },
      "planting_beds": {
        "present": <boolean>,
        "locations": ["<locations>"]
      }
    },
    "hardscape": {
      "driveway": {
        "present": <boolean>,
        "width_estimate": "<narrow, standard, or wide>",
        "position": "<left, right, or center>"
      },
      "walkway": {
        "present": <boolean>,
        "length_estimate": "<short, medium, or long>",
        "style": "<straight or curved>",
        "description": "<describe path>"
      },
      "patio": { "present": <boolean> },
      "sidewalk": { "present": <boolean> }
    },
    "recommendations": {
      "optimal_intensity": "<subtle, moderate, bright, or high_power>",
      "optimal_beam_angle": <15, 30, 45, or 60>,
      "fixture_counts": {
        "<fixture_subOption>": <count for each selected fixture>
      },
      "fixture_positions": {
        "<fixture_subOption>": ["<position 1>", "<position 2>", "..."]
      },
      "priority_areas": ["<ordered list>"],
      "notes": "<2-3 sentences about placement>"
    }
  },
  "spatialMap": {
    "features": [
      { "id": "corner_left", "type": "corner", "horizontalPosition": 0, "label": "Far left corner" },
      { "id": "window_1", "type": "window", "horizontalPosition": 15, "width": 8, "label": "First window from left" },
      { "id": "entry_door", "type": "door", "horizontalPosition": 50, "label": "Center entry door" },
      { "id": "window_2", "type": "window", "horizontalPosition": 75, "label": "Window right of door" },
      { "id": "corner_right", "type": "corner", "horizontalPosition": 100, "label": "Far right corner" }
    ],
    "placements": [
      {
        "id": "uplight_1",
        "fixtureType": "up",
        "subOption": "siding",
        "horizontalPosition": 5,
        "anchor": "right_of corner_left",
        "description": "At far LEFT corner, in landscaping bed"
      },
      {
        "id": "uplight_2",
        "fixtureType": "up",
        "subOption": "siding",
        "horizontalPosition": 35,
        "anchor": "between window_1 and entry_door",
        "description": "Wall section between first window and entry door"
      }
    ]
  },
  "optimizedPrompt": "<THE FULL PROMPT FOR IMAGE GENERATION - Include the SPATIAL PLACEMENT MAP section with horizontal positions and narrative descriptions>",
  "reasoning": "<Brief explanation of your analysis and prompt decisions>"
}

CRITICAL PROMPT CRAFTING RULES:
1. Use ALL CAPS for critical rules (MUST, NEVER, EXACTLY, FORBIDDEN)
2. Include a SPATIAL PLACEMENT MAP section in your optimizedPrompt using the spatialMap data
3. Format placements as narrative: "Scanning LEFT to RIGHT, you will see exactly N fixtures:"
4. For each fixture, include: position (% from left), anchor feature, description
5. End each fixture group with: "COUNT CHECK: There are EXACTLY N fixtures. No more, no less."
6. Describe what "dark" looks like for prohibited fixtures
7. Include the master instruction constraints
8. Include color temperature and beam angle specifications
9. The prompt should be comprehensive and self-contained
10. ALWAYS include FIXTURE INVENTORY section (see below) - this is CRITICAL for preventing extra fixtures

## FIXTURE INVENTORY (STRICT ENFORCEMENT - MUST INCLUDE IN optimizedPrompt)

Your optimizedPrompt MUST include a "COMPLETE FIXTURE INVENTORY" section that explicitly lists:
1. EXACTLY which fixture types and sub-types will appear in the image
2. The EXACT count for each fixture type (from spatialMap placements)
3. The TOTAL count of ALL fixtures combined

Your optimizedPrompt MUST ALSO include a "PROHIBITION VERIFICATION" section that lists:
- Every fixture type that is NOT selected with "ZERO instances allowed"
- Every sub-option that is NOT selected with "ZERO instances allowed"

INVENTORY FORMAT TO INCLUDE IN optimizedPrompt:
\`\`\`
## COMPLETE FIXTURE INVENTORY
This image will contain EXACTLY these fixtures and NO OTHERS:
- [fixture type] ([sub-option]): EXACTLY [count] fixtures
- [next fixture]...
TOTAL FIXTURES IN IMAGE: [sum of all counts]

## PROHIBITION VERIFICATION
These fixture types MUST NOT appear AT ALL (ZERO instances):
- [non-selected fixture type]: FORBIDDEN - zero allowed
- [non-selected sub-option]: FORBIDDEN - zero allowed
...

VERIFICATION RULE: Before finalizing the image, mentally count all fixtures. If the count exceeds the inventory above, REMOVE the extras. If any prohibited fixture types appear, REMOVE them entirely.
\`\`\`

EXAMPLE SPATIAL PLACEMENT MAP FORMAT (include this in optimizedPrompt):
## EXACT FIXTURE PLACEMENT MAP
The facade spans 0% (far left) to 100% (far right).

### REFERENCE POINTS:
- Far left corner: 0%
- First window: 15%
- Entry door: 50%
- Second window: 75%
- Far right corner: 100%

### UP LIGHTS (siding)
Scanning LEFT to RIGHT, you will see exactly 4 fixtures:
1. Fixture at 5% - At far LEFT corner, in landscaping bed
2. Fixture at 35% - Wall section between first window and entry door
3. Fixture at 62% - Wall section between entry door and second window
4. Fixture at 95% - At far RIGHT corner, in landscaping bed

COUNT CHECK: There are EXACTLY 4 fixtures. No more, no less.

Return ONLY the JSON object, no markdown code blocks or additional text.`;
}

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
 * Analyzes a property photo and crafts an optimized prompt using Claude Opus 4.5
 *
 * This combines multiple stages (ANALYZING, PLANNING, PROMPTING, VALIDATING) into one call.
 */
export const analyzeWithClaude = async (
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null
): Promise<ClaudeAnalysisResult> => {
  const anthropic = getAnthropicClient();

  // Build the analysis prompt
  const analysisPrompt = buildClaudeAnalysisPrompt(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences
  );

  // Clean base64 if it has data URL prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Determine media type
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (imageMimeType.includes('png')) {
    mediaType = 'image/png';
  } else if (imageMimeType.includes('gif')) {
    mediaType = 'image/gif';
  } else if (imageMimeType.includes('webp')) {
    mediaType = 'image/webp';
  }

  try {
    console.log('[Claude] Starting property analysis with Opus 4.5...');

    const messagePromise = anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: cleanBase64
            }
          },
          {
            type: 'text',
            text: analysisPrompt
          }
        ]
      }]
    });

    const response = await withTimeout(
      messagePromise,
      API_TIMEOUT_MS,
      'Claude analysis timed out. Please try again.'
    );

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let jsonText = textContent.text.trim();

    // Remove any markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const result: ClaudeAnalysisResult = JSON.parse(jsonText);

      console.log('[Claude] Analysis complete:', {
        architecture: result.analysis.architecture.story_count + ' story',
        fixtures: Object.keys(result.analysis.recommendations.fixture_counts).length + ' types',
        promptLength: result.optimizedPrompt.length + ' chars'
      });

      return result;
    } catch (parseError) {
      console.error('[Claude] Failed to parse JSON response:', parseError);
      console.error('[Claude] Raw response:', textContent.text);
      throw new Error('Failed to parse Claude analysis. Please try again.');
    }
  } catch (error) {
    console.error('[Claude] Analysis error:', error);
    throw error;
  }
};

/**
 * Quick health check for Claude API
 */
export const testClaudeConnection = async (): Promise<boolean> => {
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Reply with "OK" if you can read this.'
      }]
    });

    const textContent = response.content.find(block => block.type === 'text');
    return textContent?.type === 'text' && textContent.text.toLowerCase().includes('ok');
  } catch (error) {
    console.error('[Claude] Connection test failed:', error);
    return false;
  }
};
