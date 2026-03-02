import type { LightFixture, FixtureCategory } from '../../../types/fixtures';

export type MockupFixtureType =
  | 'uplight'
  | 'downlight'
  | 'path_light'
  | 'spot'
  | 'wall_wash'
  | 'well_light'
  | 'bollard'
  | 'step_light'
  | 'gutter_uplight'
  | 'coredrill'
  | 'flood';

export interface MockupFixturePlacement {
  id: string;
  type: MockupFixtureType;
  xNorm: number;
  yNorm: number;
  rotationDeg?: number;
  intensity01: number;
  colorTempK: number;
  beamDeg?: number;
}

export interface MarkerLegendEntry {
  color: string;
  shape: 'dot';
}

export type MarkerLegend = Partial<Record<MockupFixtureType, MarkerLegendEntry>>;

export interface MockupRenderSpec {
  version: '1.0';
  inputImage: {
    url?: string;
    base64?: string;
    width: number;
    height: number;
  };
  renderMode: 'markers' | 'coords';
  selectedFixtureTypes: MockupFixtureType[];
  requiredCounts: Partial<Record<MockupFixtureType, number>>;
  fixtures: MockupFixturePlacement[];
  stylePreset: 'subtle' | 'balanced' | 'dramatic';
  constraints: {
    mustNotAddFixtures: true;
    mustNotRemoveFixtures: true;
    preserveArchitecture: true;
    preserveVegetationShapes: true;
  };
  markerLegend?: MarkerLegend;
}

const CATEGORY_TO_MOCKUP_TYPE: Record<FixtureCategory, MockupFixtureType> = {
  uplight: 'uplight',
  downlight: 'downlight',
  path_light: 'path_light',
  spot: 'spot',
  wall_wash: 'wall_wash',
  well_light: 'well_light',
  bollard: 'bollard',
  step_light: 'step_light',
  gutter_uplight: 'gutter_uplight',
  coredrill: 'coredrill',
};

export function buildNormalizedFixturePlacements(fixtures: LightFixture[]): MockupFixturePlacement[] {
  return fixtures.map((fixture) => ({
    id: fixture.id,
    type: CATEGORY_TO_MOCKUP_TYPE[fixture.type],
    xNorm: fixture.x / 100,
    yNorm: fixture.y / 100,
    rotationDeg: fixture.rotation,
    intensity01: fixture.intensity,
    colorTempK: fixture.colorTemp,
    beamDeg: fixture.beamAngle,
  }));
}

export function validateNormalizedFixturePlacements(
  placements: Array<Pick<MockupFixturePlacement, 'id' | 'xNorm' | 'yNorm'>>
): void {
  for (const placement of placements) {
    if (!Number.isFinite(placement.xNorm) || placement.xNorm < 0 || placement.xNorm > 1) {
      throw new Error(
        `[MockupRenderSpec] Fixture "${placement.id}" has invalid xNorm=${placement.xNorm}. xNorm must be within 0..1.`
      );
    }
    if (!Number.isFinite(placement.yNorm) || placement.yNorm < 0 || placement.yNorm > 1) {
      throw new Error(
        `[MockupRenderSpec] Fixture "${placement.id}" has invalid yNorm=${placement.yNorm}. yNorm must be within 0..1.`
      );
    }
  }
}

export function countFixturesByType(
  fixtures: MockupFixturePlacement[]
): Partial<Record<MockupFixtureType, number>> {
  const counts: Partial<Record<MockupFixtureType, number>> = {};
  for (const fixture of fixtures) {
    counts[fixture.type] = (counts[fixture.type] || 0) + 1;
  }
  return counts;
}

export function validateMockupRenderSpec(spec: MockupRenderSpec): void {
  if (spec.version !== '1.0') {
    throw new Error(`[MockupRenderSpec] Unsupported version "${spec.version}". Expected "1.0".`);
  }

  if (!spec.inputImage.base64 && !spec.inputImage.url) {
    throw new Error('[MockupRenderSpec] inputImage must include either base64 or url.');
  }

  if (!Number.isFinite(spec.inputImage.width) || spec.inputImage.width <= 0) {
    throw new Error('[MockupRenderSpec] inputImage.width must be a positive number.');
  }
  if (!Number.isFinite(spec.inputImage.height) || spec.inputImage.height <= 0) {
    throw new Error('[MockupRenderSpec] inputImage.height must be a positive number.');
  }

  if (!Array.isArray(spec.selectedFixtureTypes) || spec.selectedFixtureTypes.length === 0) {
    throw new Error('[MockupRenderSpec] selectedFixtureTypes must contain at least one fixture type.');
  }

  validateNormalizedFixturePlacements(spec.fixtures);

  const selectedTypeSet = new Set(spec.selectedFixtureTypes);
  for (const fixture of spec.fixtures) {
    if (!selectedTypeSet.has(fixture.type)) {
      throw new Error(
        `[MockupRenderSpec] Fixture "${fixture.id}" has type "${fixture.type}" not present in selectedFixtureTypes.`
      );
    }
  }

  const requiredTotal = Object.values(spec.requiredCounts).reduce((sum, value) => {
    if (value === undefined) return sum;
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`[MockupRenderSpec] requiredCounts contains invalid count: ${value}`);
    }
    return sum + value;
  }, 0);

  if (spec.fixtures.length !== requiredTotal) {
    throw new Error(
      `[MockupRenderSpec] fixtures.length (${spec.fixtures.length}) does not match required total (${requiredTotal}).`
    );
  }

  const actualCounts = countFixturesByType(spec.fixtures);
  for (const type of spec.selectedFixtureTypes) {
    const required = spec.requiredCounts[type] || 0;
    const actual = actualCounts[type] || 0;
    if (required !== actual) {
      throw new Error(
        `[MockupRenderSpec] Count mismatch for "${type}": required=${required}, actual=${actual}.`
      );
    }
  }
}
