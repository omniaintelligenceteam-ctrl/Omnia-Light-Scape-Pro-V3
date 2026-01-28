# Enhanced Analysis Pipeline Usage Guide

## Overview

The Enhanced Analysis Pipeline provides smarter AI-powered analysis of property photos BEFORE image generation. It identifies architectural features, detects materials, suggests optimal fixture placements, and explains WHY each placement is recommended.

## Key Features

### 1. Architectural Style Detection
Automatically classifies homes as:
- Modern / Contemporary → Clean, minimal lighting approach
- Traditional / Colonial → Warm, welcoming approach
- Mediterranean / Spanish → Dramatic shadow play
- Craftsman / Farmhouse → Warm, natural feel
- Victorian → Statement architectural lighting
- And more...

### 2. Smart Fixture Suggestions
For each suggested fixture, the AI provides:
- **Position coordinates** (X/Y as percentage of image)
- **Count** based on facade width
- **Spacing** following professional standards
- **Reasoning** explaining WHY this placement

### 3. Avoid Zones
Identifies areas where fixtures should NOT be placed:
- Under windows (glare risk)
- In front of doors (obstruction)
- Near utilities (HVAC, meters)
- On hardscape (for ground fixtures)

### 4. Material-Based Recommendations
Detects facade materials and recommends:
- **Brick/Stone**: 15° narrow beam for texture grazing
- **Stucco**: 25° medium beam for subtle texture
- **Siding**: 25° beam for horizontal shadow lines
- **Smooth surfaces**: 30° standard beam

## API Usage

### Basic Enhanced Analysis

\`\`\`typescript
import { enhancedAnalyzeProperty } from './services/geminiService';

// Analyze a property photo
const analysis = await enhancedAnalyzeProperty(
  imageBase64,
  'image/jpeg',
  ['up', 'path'],           // Optional: selected fixture types
  { up: ['siding', 'trees'] } // Optional: selected sub-options
);

// Access analysis results
console.log('Style:', analysis.style);
console.log('Facade Width:', analysis.facadeWidth);
console.log('Suggested Fixtures:', analysis.suggestedFixtures);
console.log('Avoid Zones:', analysis.avoidZones);
\`\`\`

### Get Filtered Suggestions

\`\`\`typescript
import { getFilteredSuggestions } from './services/geminiService';

// Get suggestions matching user's selections
const suggestions = getFilteredSuggestions(
  analysis,
  ['up'],           // Selected fixture types
  { up: ['siding'] } // Selected sub-options
);

// suggestions now contains only up-siding suggestions
\`\`\`

### Convert to Legacy Format

\`\`\`typescript
import { enhancedToLegacyAnalysis } from './services/geminiService';

// For backwards compatibility with existing code
const legacyAnalysis = enhancedToLegacyAnalysis(enhancedAnalysis);
\`\`\`

### Explain a Suggestion

\`\`\`typescript
import { explainSuggestedFixture } from './services/geminiService';

// Generate human-readable explanation
const explanation = explainSuggestedFixture(suggestion);
// Returns markdown-formatted explanation of why this placement was suggested
\`\`\`

## UI Integration Example

### In FixturePlacer Component

\`\`\`tsx
import { enhancedAnalyzeProperty, getFilteredSuggestions, explainSuggestedFixture } from '../services/geminiService';
import type { EnhancedHouseAnalysis, SuggestedFixture } from '../src/types/houseAnalysis';

function FixturePlacerEnhanced({ imageBase64, selectedFixtures, fixtureSubOptions }) {
  const [analysis, setAnalysis] = useState<EnhancedHouseAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);

  // Run enhanced analysis when image is loaded
  useEffect(() => {
    async function analyze() {
      setLoading(true);
      try {
        const result = await enhancedAnalyzeProperty(
          imageBase64,
          'image/jpeg',
          selectedFixtures,
          fixtureSubOptions
        );
        setAnalysis(result);
      } catch (error) {
        console.error('Analysis failed:', error);
      }
      setLoading(false);
    }
    
    if (imageBase64) {
      analyze();
    }
  }, [imageBase64, selectedFixtures, fixtureSubOptions]);

  // Get filtered suggestions based on current selections
  const suggestions = analysis 
    ? getFilteredSuggestions(analysis, selectedFixtures, fixtureSubOptions)
    : [];

  return (
    <div className="fixture-placer">
      {/* Analysis Summary */}
      {analysis && (
        <div className="analysis-summary">
          <h3>{analysis.style} Style Home</h3>
          <p>{analysis.lightingApproach.description}</p>
          <div className="recommendations">
            <span>Intensity: {analysis.lightingApproach.intensityRecommendation}%</span>
            <span>Beam: {analysis.lightingApproach.beamAngleRecommendation}°</span>
          </div>
        </div>
      )}

      {/* Suggested Fixtures */}
      {suggestions.map((suggestion) => (
        <div key={\`\${suggestion.fixtureType}-\${suggestion.subOption}\`} className="suggestion-card">
          <h4>{suggestion.fixtureType} - {suggestion.subOption}</h4>
          <p>{suggestion.count} fixtures, {suggestion.spacing}</p>
          
          {/* Show explanation button */}
          <button onClick={() => setActiveExplanation(explainSuggestedFixture(suggestion))}>
            Why this placement?
          </button>

          {/* Position markers on image */}
          {suggestion.positions.map((pos, i) => (
            <div
              key={i}
              className="position-marker"
              style={{
                left: \`\${pos.xPercent}%\`,
                top: \`\${pos.yPercent}%\`
              }}
              title={pos.description}
            />
          ))}
        </div>
      ))}

      {/* Avoid Zones Overlay */}
      {analysis?.avoidZones?.map((zone) => (
        <div
          key={zone.id}
          className={\`avoid-zone \${zone.severity}\`}
          style={{
            left: \`\${zone.xPercent - zone.radiusPercent}%\`,
            top: \`\${zone.yPercent - zone.radiusPercent}%\`,
            width: \`\${zone.radiusPercent * 2}%\`,
            height: \`\${zone.radiusPercent * 2}%\`
          }}
          title={\`Avoid: \${zone.description}\`}
        />
      ))}

      {/* Explanation Modal */}
      {activeExplanation && (
        <div className="explanation-modal">
          <pre>{activeExplanation}</pre>
          <button onClick={() => setActiveExplanation(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
\`\`\`

## Output Structure

### EnhancedHouseAnalysis

\`\`\`typescript
interface EnhancedHouseAnalysis {
  // Style classification
  style: ArchitecturalStyle;
  facadeWidth: FacadeWidth;
  storyCount: 1 | 2 | 3;
  wallHeight: '8-12ft' | '18-25ft' | '25+ft';

  // Detected features
  architecturalFeatures: ArchitecturalFeature[];
  materials: DetectedMaterial[];
  primaryMaterial: FacadeMaterial;

  // Smart suggestions
  suggestedFixtures: SuggestedFixture[];
  avoidZones: AvoidZone[];
  optimalUplightPositions: PlacementZone[];

  // Property details
  landscaping: { trees, plantingBeds };
  hardscape: { driveway, walkway };
  entry: { type, hasOverhang, hasColumns };
  windows: { firstFloorCount, secondFloorCount, pattern };

  // Recommendations
  lightingApproach: {
    style: 'clean-minimal' | 'warm-welcoming' | 'dramatic-shadow' | etc;
    description: string;
    intensityRecommendation: number;
    beamAngleRecommendation: number;
    colorTempRecommendation: '2700K' | '3000K' | '4000K';
    reasoning: string;
  };

  // Summary
  fixtureSummary: {
    totalSuggestedCount: number;
    byType: Record<string, number>;
    estimatedSpacing: string;
    coverageNotes: string;
  };

  confidence: number;
  notes: string[];
}
\`\`\`

### SuggestedFixture

\`\`\`typescript
interface SuggestedFixture {
  fixtureType: string;      // 'up', 'path', 'soffit', etc.
  subOption: string;        // 'siding', 'windows', 'trees', etc.
  count: number;            // How many fixtures
  positions: FixturePosition[];  // Where to place them
  spacing: string;          // e.g., "6-8 feet apart"
  reasoning: string;        // WHY this placement
  priority: number;         // 1 = highest priority
}

interface FixturePosition {
  description: string;      // "Far left corner of facade"
  xPercent: number;         // 0-100 from left edge
  yPercent: number;         // 0-100 from top edge
  target: string;           // "Left corner wall section"
}
\`\`\`

## Constants Reference

The system uses these constants from `constants.ts`:

- **LIGHTING_APPROACH_BY_STYLE**: Style → lighting approach mapping
- **SPACING_BY_FACADE_WIDTH**: Facade width → fixture count/spacing
- **BEAM_ANGLE_BY_MATERIAL**: Material → recommended beam angle
- **INTENSITY_BY_WALL_HEIGHT**: Wall height → intensity range
- **FEATURE_LIGHTING_GUIDELINES**: Feature → how to light it
- **AVOID_ZONE_GUIDANCE**: Zone type → severity and guidance

## Migration Path

To migrate from the old `analyzePropertyArchitecture` to enhanced analysis:

1. Replace `analyzePropertyArchitecture` calls with `enhancedAnalyzeProperty`
2. Use `enhancedToLegacyAnalysis()` for backwards compatibility
3. Gradually update UI to use new `suggestedFixtures` structure
4. Show `reasoning` and `avoidZones` in fixture placer UI

## Files Created/Modified

- **NEW**: `/tmp/omnia/src/types/houseAnalysis.ts` - Type definitions
- **NEW**: `/tmp/omnia/services/enhancedAnalysisService.ts` - Standalone service
- **MODIFIED**: `/tmp/omnia/services/geminiService.ts` - Added enhanced functions
- **MODIFIED**: `/tmp/omnia/constants.ts` - Added analysis constants
