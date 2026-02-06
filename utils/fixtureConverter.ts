/**
 * Fixture Converter Utility
 *
 * Converts LightFixture[] (from FixturePlacer click-to-place UI) into
 * SpatialMap format consumed by the multi-model pipeline (FLUX Fill masks).
 *
 * This bridges the manual placement UI with the AI generation pipeline.
 */

import type { LightFixture, FixtureCategory } from '../types/fixtures';
import type { SpatialMap, SpatialFixturePlacement } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps FixturePlacer's FixtureCategory to the pipeline's fixtureType IDs.
 * Pipeline mask shapes (maskService.ts) and prompts (FLUX_FILL_PROMPTS) use these keys.
 */
const CATEGORY_TO_PIPELINE_TYPE: Record<FixtureCategory, string> = {
  uplight:        'up',
  downlight:      'soffit',
  path_light:     'path',
  spot:           'up',
  wall_wash:      'up',
  well_light:     'well',
  bollard:        'path',
  step_light:     'hardscape',
  gutter_uplight: 'gutter',
};

/**
 * Reverse mapping: pipeline fixtureType IDs → FixtureCategory.
 * Used by manual mode to create LightFixture objects from VISIBLE_FIXTURE_TYPES button clicks.
 */
export const PIPELINE_TYPE_TO_CATEGORY: Record<string, FixtureCategory> = {
  'up':        'uplight',
  'path':      'path_light',
  'coredrill': 'well_light',
  'gutter':    'gutter_uplight',
  'hardscape': 'step_light',
  'well':      'well_light',
  'holiday':   'spot',
  'soffit':    'downlight',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer a sub-option from fixture type and position on the image.
 * When users manually place fixtures, they don't select sub-options —
 * we infer the best match based on where they clicked.
 */
function inferSubOption(fixture: LightFixture): string {
  const pipelineType = CATEGORY_TO_PIPELINE_TYPE[fixture.type];

  switch (pipelineType) {
    case 'up':
      if (fixture.y < 50) return 'trees';
      if (fixture.y < 70) return 'windows';
      return 'siding';
    case 'path':
      return 'walkway';
    case 'soffit':
      return 'windows';
    case 'hardscape':
      return 'steps';
    case 'well':
      return 'trees';
    default:
      return 'general';
  }
}

function generateAnchor(fixture: LightFixture): string {
  const h = fixture.x < 33 ? 'left' : fixture.x > 66 ? 'right' : 'center';
  const v = fixture.y < 33 ? 'upper' : fixture.y > 66 ? 'lower' : 'mid';
  return `${v}_${h}`;
}

function generateDescription(fixture: LightFixture): string {
  const h = fixture.x < 33 ? 'left side' : fixture.x > 66 ? 'right side' : 'center';
  const v = fixture.y < 33 ? 'upper area' : fixture.y > 66 ? 'ground level' : 'mid-height';
  return `Manual placement at ${v}, ${h} of facade`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert LightFixture[] (from FixturePlacer) into a SpatialMap
 * that the multi-model pipeline can consume directly.
 * Replaces Stage 1 (analyzePropertyArchitecture) in manual mode.
 */
export function convertFixturesToSpatialMap(
  fixtures: LightFixture[]
): SpatialMap {
  const placements: SpatialFixturePlacement[] = fixtures.map((f, index) => {
    const pipelineType = CATEGORY_TO_PIPELINE_TYPE[f.type];
    const subOption = inferSubOption(f);

    return {
      id: `manual_${pipelineType}_${subOption}_${index + 1}`,
      fixtureType: pipelineType,
      subOption,
      horizontalPosition: f.x,
      verticalPosition: f.y,
      anchor: generateAnchor(f),
      description: generateDescription(f),
    };
  });

  return { features: [], placements };
}

/**
 * Derive selectedFixtures, fixtureSubOptions, and fixtureCounts
 * from manual placements. Needed for prompt construction and UI display.
 */
export function deriveSelections(fixtures: LightFixture[]): {
  selectedFixtures: string[];
  fixtureSubOptions: Record<string, string[]>;
  fixtureCounts: Record<string, number | null>;
} {
  const typeSubMap = new Map<string, Set<string>>();
  const countMap = new Map<string, number>();

  for (const f of fixtures) {
    const pipelineType = CATEGORY_TO_PIPELINE_TYPE[f.type];
    const subOption = inferSubOption(f);

    if (!typeSubMap.has(pipelineType)) {
      typeSubMap.set(pipelineType, new Set());
    }
    typeSubMap.get(pipelineType)!.add(subOption);

    const countKey = subOption;
    countMap.set(countKey, (countMap.get(countKey) || 0) + 1);
  }

  const selectedFixtures = Array.from(typeSubMap.keys());
  const fixtureSubOptions: Record<string, string[]> = {};
  for (const [type, subs] of typeSubMap) {
    fixtureSubOptions[type] = Array.from(subs);
  }

  const fixtureCounts: Record<string, number | null> = {};
  for (const [key, count] of countMap) {
    fixtureCounts[key] = count;
  }

  return { selectedFixtures, fixtureSubOptions, fixtureCounts };
}
