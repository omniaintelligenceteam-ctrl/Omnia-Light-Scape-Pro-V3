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
  coredrill:      'coredrill',
};

/**
 * Reverse mapping: pipeline fixtureType IDs → FixtureCategory.
 * Used by manual mode to create LightFixture objects from VISIBLE_FIXTURE_TYPES button clicks.
 */
export const PIPELINE_TYPE_TO_CATEGORY: Record<string, FixtureCategory> = {
  'up':        'uplight',
  'path':      'path_light',
  'coredrill': 'coredrill',
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
    case 'gutter':
      return 'gutterUpLights';
    case 'path':
      return 'walkway';
    case 'soffit':
      return 'windows';
    case 'hardscape':
      return 'steps';
    case 'well':
      return 'trees';
    case 'coredrill':
      return 'garage_sides';
    default:
      return 'general';
  }
}

function generateAnchor(fixture: LightFixture): string {
  let h: string;
  if (fixture.x < 15) h = 'far_left';
  else if (fixture.x < 30) h = 'left';
  else if (fixture.x < 45) h = 'left_center';
  else if (fixture.x < 55) h = 'center';
  else if (fixture.x < 70) h = 'right_center';
  else if (fixture.x < 85) h = 'right';
  else h = 'far_right';

  let v: string;
  if (fixture.y < 15) v = 'roofline';
  else if (fixture.y < 30) v = 'upper';
  else if (fixture.y < 45) v = 'mid_upper';
  else if (fixture.y < 55) v = 'mid';
  else if (fixture.y < 70) v = 'lower';
  else if (fixture.y < 85) v = 'near_ground';
  else v = 'ground';

  return `${v}_${h}`;
}

function generateDescription(fixture: LightFixture): string {
  let h: string;
  if (fixture.x < 15) h = 'far left edge';
  else if (fixture.x < 30) h = 'left third';
  else if (fixture.x < 45) h = 'left of center';
  else if (fixture.x < 55) h = 'center';
  else if (fixture.x < 70) h = 'right of center';
  else if (fixture.x < 85) h = 'right third';
  else h = 'far right edge';

  let v: string;
  if (fixture.y < 15) v = 'roofline/top';
  else if (fixture.y < 30) v = 'upper wall';
  else if (fixture.y < 45) v = 'mid-upper wall';
  else if (fixture.y < 55) v = 'mid-height';
  else if (fixture.y < 70) v = 'lower wall';
  else if (fixture.y < 85) v = 'near ground level';
  else v = 'ground level at foundation';

  return `${v}, ${h} of facade`;
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
    const gutterMeta = pipelineType === 'gutter'
      ? {
          gutterLineId: f.gutterLineId,
          gutterLineX: f.gutterLineX,
          gutterLineY: f.gutterLineY,
          gutterMountDepthPercent: f.gutterMountDepthPercent,
        }
      : {};

    return {
      id: `manual_${pipelineType}_${subOption}_${index + 1}`,
      fixtureType: pipelineType,
      subOption,
      horizontalPosition: f.x,
      verticalPosition: f.y,
      anchor: generateAnchor(f),
      description: generateDescription(f),
      rotation: f.rotation,
      beamLength: f.beamLength,
      ...gutterMeta,
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

/**
 * Convert a numeric rotation (0-360, 0=up) to a human-readable direction label
 * for use in Gemini prompt text.
 */
export function rotationToDirectionLabel(rotation: number): string {
  const norm = ((rotation % 360) + 360) % 360;
  if (norm < 22.5 || norm >= 337.5) return 'STRAIGHT UP';
  if (norm < 67.5)   return 'UP-RIGHT (angled ~45° from vertical)';
  if (norm < 112.5)  return 'RIGHT (horizontal)';
  if (norm < 157.5)  return 'DOWN-RIGHT (angled ~135° from vertical)';
  if (norm < 202.5)  return 'STRAIGHT DOWN';
  if (norm < 247.5)  return 'DOWN-LEFT (angled ~225° from vertical)';
  if (norm < 292.5)  return 'LEFT (horizontal)';
  return 'UP-LEFT (angled ~315° from vertical)';
}

/**
 * Returns true if the fixture has a non-default rotation.
 * Default for up-direction types is 0°, for down-direction types is 180°.
 */
export function hasCustomRotation(rotation: number | undefined, fixtureType: string): boolean {
  if (rotation === undefined) return false;
  const downTypes = new Set(['soffit', 'hardscape']);
  const defaultRot = downTypes.has(fixtureType) ? 180 : 0;
  return Math.abs(((rotation - defaultRot + 180) % 360) - 180) > 5;
}
