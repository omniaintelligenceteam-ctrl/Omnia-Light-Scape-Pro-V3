/**
 * Enhanced Property Analysis Service
 * Provides smarter AI-powered analysis BEFORE fixture placement
 */

import { GoogleGenAI } from "@google/genai";
import type { 
  EnhancedHouseAnalysis, 
  ArchitecturalStyle, 
  FacadeWidth,
  SuggestedFixture,
  AvoidZone,
  PlacementZone,
  LIGHTING_APPROACH_BY_STYLE,
  SPACING_BY_FACADE_WIDTH
} from "../src/types/houseAnalysis";

// Use Gemini 3 Pro for best analysis
const ANALYSIS_MODEL = 'gemini-3-pro-preview';
const ANALYSIS_TIMEOUT_MS = 90000; // 90 seconds for comprehensive analysis

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

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED ANALYSIS PROMPT - The core of the smart analysis
// ═══════════════════════════════════════════════════════════════════════════════

const ENHANCED_ANALYSIS_PROMPT = `You are an expert landscape lighting designer analyzing a property photo for optimal fixture placement.

Your task is to provide a COMPREHENSIVE architectural analysis that will guide intelligent fixture suggestions.

## ANALYSIS OBJECTIVES

1. **ARCHITECTURAL STYLE CLASSIFICATION**
   - Identify the home's architectural style (modern, traditional, craftsman, mediterranean, colonial, etc.)
   - This affects lighting approach: modern = minimal/clean, traditional = warm/balanced, mediterranean = dramatic shadows

2. **FACADE WIDTH ESTIMATION**
   - Narrow (<30 feet): 2-4 fixtures typically
   - Medium (30-50 feet): 4-8 fixtures typically
   - Wide (50-80 feet): 6-12 fixtures typically
   - Extra-wide (>80 feet): 10-20 fixtures typically
   - Use visual cues: garage doors (~9-18ft wide), windows (~3ft wide), doors (~3ft wide)

3. **MATERIAL DETECTION**
   For each material found, note:
   - Location on facade (main, accent, lower half, etc.)
   - Texture level (affects beam angle selection)
   - Recommended beam angle for texture grazing

4. **ARCHITECTURAL FEATURES**
   Identify and count:
   - Gables (triangular roof peaks)
   - Dormers (windowed roof projections)
   - Columns/Pillars (structural or decorative)
   - Archways/Porticos
   - Bay windows
   - Balconies
   - Shutters

5. **OPTIMAL UPLIGHT POSITIONS**
   For each potential uplight position:
   - Describe location precisely
   - Provide X/Y percentage of image (0,0 = top-left)
   - Explain what the light will illuminate
   - Rate the opportunity (high/medium/low)

6. **AVOID ZONES**
   Identify areas where fixtures should NOT be placed:
   - Directly under windows (glare risk)
   - In front of doors (obstruction)
   - Near HVAC units, meter boxes, hose bibs
   - On hardscape surfaces (for in-ground fixtures only)
   - Areas with obvious utilities

7. **SMART FIXTURE SUGGESTIONS**
   Based on your analysis, suggest fixtures with:
   - Specific positions (as percentage of image)
   - Count based on facade width and architecture
   - Reasoning for each suggestion
   - Priority order (what to light first)

8. **LIGHTING APPROACH RECOMMENDATION**
   Based on house style:
   - Modern: clean-minimal (40-60% intensity, 15° beam)
   - Traditional: warm-welcoming (50-70% intensity, 30° beam)
   - Mediterranean/Spanish: dramatic-shadow (55-75% intensity, 15° beam)
   - Craftsman: warm-welcoming (45-65% intensity, 25° beam)
   - Colonial: balanced-traditional (50-70% intensity, 30° beam)

## POSITION PERCENTAGE SYSTEM

Use this coordinate system for positions:
- X: 0% = left edge, 50% = center, 100% = right edge
- Y: 0% = top edge, 50% = middle, 100% = bottom edge

Example positions:
- "Far left corner at foundation" = {xPercent: 5, yPercent: 95}
- "Centered under first window from left" = {xPercent: 25, yPercent: 90}
- "Right side of entry door" = {xPercent: 52, yPercent: 88}

## OUTPUT FORMAT

Return ONLY a valid JSON object matching this structure:

{
  "style": "traditional|modern|craftsman|mediterranean|colonial|spanish|tudor|farmhouse|ranch|cape-cod|victorian|mid-century|transitional|contemporary|unknown",
  "facadeWidth": "narrow|medium|wide|extra-wide",
  "facadeWidthFeet": <estimated feet or null>,
  "storyCount": <1|2|3>,
  "wallHeight": "8-12ft|18-25ft|25+ft",
  "architecturalFeatures": [
    {
      "type": "gable|dormer|column|pilaster|archway|portico|bay-window|balcony|turret|chimney|shutters|corbels|dentil-molding",
      "count": <number>,
      "positions": ["<description>", ...],
      "lightingOpportunity": "high|medium|low",
      "suggestedApproach": "<how to light this feature>"
    }
  ],
  "materials": [
    {
      "material": "brick|stone|stucco|siding-lap|siding-board-and-batten|siding-shake|vinyl|wood|concrete|glass|metal|mixed",
      "location": "<where on facade>",
      "percentage": <0-100>,
      "textureLevel": "smooth|light|moderate|heavy",
      "recommendedBeamAngle": <15|20|25|30|45>
    }
  ],
  "primaryMaterial": "<main material>",
  "suggestedFixtures": [
    {
      "fixtureType": "up|path|soffit|gutter|hardscape|coredrill",
      "subOption": "siding|windows|trees|columns|entryway|walkway|driveway|dormers|peaks",
      "count": <number>,
      "positions": [
        {
          "description": "<specific location description>",
          "xPercent": <0-100>,
          "yPercent": <0-100>,
          "target": "<what this light illuminates>"
        }
      ],
      "spacing": "<spacing description>",
      "reasoning": "<why this placement>",
      "priority": <1-10, 1=highest>
    }
  ],
  "avoidZones": [
    {
      "id": "<unique-id>",
      "reason": "window-glare|door-obstruction|utility-equipment|hardscape-surface|hvac-unit|meter-box|spigot-hose|structural-hazard|aesthetic-concern",
      "description": "<what to avoid>",
      "xPercent": <0-100>,
      "yPercent": <0-100>,
      "radiusPercent": <0-20>,
      "severity": "critical|important|suggested"
    }
  ],
  "optimalUplightPositions": [
    {
      "id": "<unique-id>",
      "type": "optimal|acceptable",
      "description": "<position description>",
      "xPercent": <0-100>,
      "yPercent": <0-100>,
      "suggestedFixture": "up",
      "reasoning": "<why this is a good position>"
    }
  ],
  "landscaping": {
    "trees": {
      "count": <number>,
      "positions": ["<tree 1 location>", ...],
      "sizes": ["small|medium|large", ...],
      "uplightCandidates": <how many are good for uplighting>
    },
    "plantingBeds": {
      "present": <true|false>,
      "locations": ["<location>", ...],
      "fixtureAccessible": <true|false>
    }
  },
  "hardscape": {
    "driveway": {
      "present": <true|false>,
      "width": "narrow|standard|wide",
      "position": "left|right|center",
      "suggestedPathLightCount": <number>
    },
    "walkway": {
      "present": <true|false>,
      "length": "short|medium|long",
      "style": "straight|curved",
      "suggestedPathLightCount": <number>
    }
  },
  "entry": {
    "type": "single|double|grand",
    "hasOverhang": <true|false>,
    "hasColumns": <true|false>,
    "hasSidelights": <true|false>,
    "suggestedFixtureApproach": "<how to light the entry>"
  },
  "windows": {
    "firstFloorCount": <number>,
    "secondFloorCount": <number>,
    "pattern": "symmetrical|asymmetrical|irregular",
    "positions": "<description of window layout>"
  },
  "lightingApproach": {
    "style": "clean-minimal|warm-welcoming|dramatic-shadow|balanced-traditional|statement-architectural",
    "description": "<1-2 sentences about the approach>",
    "intensityRecommendation": <0-100>,
    "beamAngleRecommendation": <15|20|25|30|45>,
    "colorTempRecommendation": "2700K|3000K|4000K",
    "reasoning": "<why this approach fits the home>"
  },
  "fixtureSummary": {
    "totalSuggestedCount": <total number>,
    "byType": {
      "up": <count>,
      "path": <count>,
      ...
    },
    "estimatedSpacing": "<typical spacing>",
    "coverageNotes": "<notes about coverage>"
  },
  "confidence": <0-100>,
  "notes": ["<special note 1>", "<special note 2>", ...]
}

IMPORTANT RULES:
1. Every position MUST have xPercent and yPercent values
2. Avoid zones MUST identify windows, doors, utilities
3. Suggested fixtures MUST have specific position coordinates
4. Spacing follows professional standards (6-8 feet for uplights, 6-8 feet for path lights)
5. Be conservative with counts - quality over quantity
6. Prioritize the entry and main facade features`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENHANCED ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Performs comprehensive AI analysis of a property photo
 * Returns detailed analysis with smart fixture suggestions
 */
export async function enhancedAnalyzeProperty(
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  selectedFixtures?: string[],
  fixtureSubOptions?: Record<string, string[]>
): Promise<EnhancedHouseAnalysis> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build context about what user has selected (if any)
  let selectionContext = '';
  if (selectedFixtures && selectedFixtures.length > 0) {
    selectionContext = `
## USER'S CURRENT SELECTIONS (Focus analysis on these)
Selected fixture types: ${selectedFixtures.join(', ')}
${Object.entries(fixtureSubOptions || {}).map(([fixture, subs]) => 
  `- ${fixture}: ${subs.join(', ')}`
).join('\n')}

Prioritize fixture suggestions that match the user's selections.
`;
  }

  const fullPrompt = ENHANCED_ANALYSIS_PROMPT + selectionContext;

  try {
    const analyzePromise = ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: fullPrompt,
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
          // Clean up the response
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const analysis: EnhancedHouseAnalysis = JSON.parse(jsonText);
            
            // Validate and enrich the analysis
            return validateAndEnrichAnalysis(analysis);
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION & ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates and enriches the AI analysis with defaults and calculations
 */
function validateAndEnrichAnalysis(analysis: EnhancedHouseAnalysis): EnhancedHouseAnalysis {
  // Ensure all required fields have defaults
  const enriched: EnhancedHouseAnalysis = {
    style: analysis.style || 'unknown',
    facadeWidth: analysis.facadeWidth || 'medium',
    facadeWidthFeet: analysis.facadeWidthFeet,
    storyCount: analysis.storyCount || 1,
    wallHeight: analysis.wallHeight || '8-12ft',
    architecturalFeatures: analysis.architecturalFeatures || [],
    materials: analysis.materials || [],
    primaryMaterial: analysis.primaryMaterial || 'siding-lap',
    suggestedFixtures: analysis.suggestedFixtures || [],
    avoidZones: analysis.avoidZones || [],
    optimalUplightPositions: analysis.optimalUplightPositions || [],
    landscaping: analysis.landscaping || {
      trees: { count: 0, positions: [], sizes: [], uplightCandidates: 0 },
      plantingBeds: { present: false, locations: [], fixtureAccessible: true }
    },
    hardscape: analysis.hardscape || {
      driveway: { present: false, width: 'standard', position: 'left', suggestedPathLightCount: 0 },
      walkway: { present: false, length: 'medium', style: 'straight', suggestedPathLightCount: 0 }
    },
    entry: analysis.entry || {
      type: 'single',
      hasOverhang: false,
      hasColumns: false,
      hasSidelights: false,
      suggestedFixtureApproach: 'Flank entry with two uplights'
    },
    windows: analysis.windows || {
      firstFloorCount: 0,
      secondFloorCount: 0,
      pattern: 'symmetrical',
      positions: 'Unknown'
    },
    lightingApproach: analysis.lightingApproach || {
      style: 'balanced-traditional',
      description: 'Balanced lighting approach suitable for most homes.',
      intensityRecommendation: 55,
      beamAngleRecommendation: 30,
      colorTempRecommendation: '3000K',
      reasoning: 'Default approach for unclassified home style.'
    },
    fixtureSummary: analysis.fixtureSummary || {
      totalSuggestedCount: 0,
      byType: {},
      estimatedSpacing: '6-8 feet',
      coverageNotes: ''
    },
    confidence: analysis.confidence || 70,
    notes: analysis.notes || []
  };

  // Calculate fixture summary from suggestions if not provided
  if (enriched.suggestedFixtures.length > 0 && enriched.fixtureSummary.totalSuggestedCount === 0) {
    const byType: Record<string, number> = {};
    let total = 0;
    
    for (const fixture of enriched.suggestedFixtures) {
      byType[fixture.fixtureType] = (byType[fixture.fixtureType] || 0) + fixture.count;
      total += fixture.count;
    }
    
    enriched.fixtureSummary = {
      totalSuggestedCount: total,
      byType,
      estimatedSpacing: '6-8 feet',
      coverageNotes: `${total} fixtures suggested for ${enriched.facadeWidth} facade`
    };
  }

  // Add default avoid zones for windows if not detected
  if (enriched.avoidZones.length === 0 && enriched.windows.firstFloorCount > 0) {
    // Add general window avoidance note
    enriched.notes.push('Ensure uplights are placed BETWEEN windows, not directly under them');
  }

  return enriched;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR UI INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converts analysis positions to fixture placer format
 */
export function analysisToFixturePlacerPositions(
  analysis: EnhancedHouseAnalysis,
  fixtureType: string,
  subOption?: string
): Array<{ x: number; y: number; description: string }> {
  const positions: Array<{ x: number; y: number; description: string }> = [];

  // Find suggested fixtures matching the type/subOption
  for (const suggested of analysis.suggestedFixtures) {
    if (suggested.fixtureType === fixtureType) {
      if (subOption && suggested.subOption !== subOption) continue;
      
      for (const pos of suggested.positions) {
        positions.push({
          x: pos.xPercent / 100, // Convert to 0-1 range
          y: pos.yPercent / 100,
          description: pos.description
        });
      }
    }
  }

  return positions;
}

/**
 * Generates a human-readable summary of the analysis
 */
export function generateAnalysisSummary(analysis: EnhancedHouseAnalysis): string {
  const lines: string[] = [];
  
  lines.push(`**${analysis.style.charAt(0).toUpperCase() + analysis.style.slice(1)} Style Home**`);
  lines.push(`${analysis.storyCount}-story, ${analysis.facadeWidth} facade`);
  
  if (analysis.architecturalFeatures.length > 0) {
    const features = analysis.architecturalFeatures
      .map(f => `${f.count} ${f.type}${f.count > 1 ? 's' : ''}`)
      .join(', ');
    lines.push(`Features: ${features}`);
  }
  
  lines.push('');
  lines.push(`**Recommended Approach:** ${analysis.lightingApproach.description}`);
  lines.push(`- Intensity: ${analysis.lightingApproach.intensityRecommendation}%`);
  lines.push(`- Beam Angle: ${analysis.lightingApproach.beamAngleRecommendation}°`);
  lines.push(`- Color Temp: ${analysis.lightingApproach.colorTempRecommendation}`);
  
  if (analysis.suggestedFixtures.length > 0) {
    lines.push('');
    lines.push(`**Suggested Fixtures:** ${analysis.fixtureSummary.totalSuggestedCount} total`);
    for (const [type, count] of Object.entries(analysis.fixtureSummary.byType)) {
      lines.push(`- ${type}: ${count}`);
    }
  }
  
  if (analysis.notes.length > 0) {
    lines.push('');
    lines.push('**Notes:**');
    for (const note of analysis.notes) {
      lines.push(`- ${note}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Gets fixture suggestions filtered by user's current selections
 */
export function getFilteredSuggestions(
  analysis: EnhancedHouseAnalysis,
  selectedFixtures: string[],
  selectedSubOptions: Record<string, string[]>
): SuggestedFixture[] {
  return analysis.suggestedFixtures.filter(suggestion => {
    // Must be a selected fixture type
    if (!selectedFixtures.includes(suggestion.fixtureType)) return false;
    
    // If there are sub-options selected, must match one
    const subs = selectedSubOptions[suggestion.fixtureType];
    if (subs && subs.length > 0 && !subs.includes(suggestion.subOption)) return false;
    
    return true;
  });
}

/**
 * Explains WHY a fixture position was suggested
 */
export function explainFixturePlacement(suggestion: SuggestedFixture): string {
  const lines: string[] = [];
  
  lines.push(`**${suggestion.fixtureType.toUpperCase()} - ${suggestion.subOption}**`);
  lines.push(`Count: ${suggestion.count} fixtures`);
  lines.push(`Spacing: ${suggestion.spacing}`);
  lines.push('');
  lines.push(`**Why this placement:** ${suggestion.reasoning}`);
  lines.push('');
  lines.push('**Positions:**');
  
  for (let i = 0; i < suggestion.positions.length; i++) {
    const pos = suggestion.positions[i];
    lines.push(`${i + 1}. ${pos.description}`);
    lines.push(`   → Illuminates: ${pos.target}`);
  }
  
  return lines.join('\n');
}
