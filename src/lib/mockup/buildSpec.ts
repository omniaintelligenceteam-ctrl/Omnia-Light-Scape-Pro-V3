import type { LightFixture } from '../../../types/fixtures';
import type { FixturePricing } from '../../../types';
import {
  type MockupFixturePlacement,
  type MockupFixtureType,
  type MockupRenderSpec,
  buildNormalizedFixturePlacements,
  countFixturesByType,
  validateMockupRenderSpec,
} from './spec';

function buildDefaultMarkerLegend() {
  return {
    uplight: { color: '#00AEEF', shape: 'dot' as const },
    path_light: { color: '#F9D423', shape: 'dot' as const },
    well_light: { color: '#FF4D4D', shape: 'dot' as const },
    flood: { color: '#B388FF', shape: 'dot' as const },
    wall_wash: { color: '#00E676', shape: 'dot' as const },
    downlight: { color: '#FF9800', shape: 'dot' as const },
    spot: { color: '#26C6DA', shape: 'dot' as const },
    bollard: { color: '#C0CA33', shape: 'dot' as const },
    step_light: { color: '#8D6E63', shape: 'dot' as const },
    gutter_uplight: { color: '#FFD54F', shape: 'dot' as const },
    coredrill: { color: '#EC407A', shape: 'dot' as const },
  };
}

export function buildMockupRenderSpecFromManualFixtures(args: {
  fixtures: LightFixture[];
  inputImageBase64: string;
  imageWidth: number;
  imageHeight: number;
  stylePreset?: MockupRenderSpec['stylePreset'];
}): MockupRenderSpec {
  const placements = buildNormalizedFixturePlacements(args.fixtures);
  const selectedFixtureTypes = Array.from(new Set(placements.map((fixture) => fixture.type)));
  const requiredCounts = countFixturesByType(placements);

  const spec: MockupRenderSpec = {
    version: '1.0',
    inputImage: {
      base64: args.inputImageBase64,
      width: args.imageWidth,
      height: args.imageHeight,
    },
    renderMode: 'markers',
    selectedFixtureTypes,
    requiredCounts,
    fixtures: placements,
    stylePreset: args.stylePreset || 'balanced',
    constraints: {
      mustNotAddFixtures: true,
      mustNotRemoveFixtures: true,
      preserveArchitecture: true,
      preserveVegetationShapes: true,
    },
    markerLegend: buildDefaultMarkerLegend(),
  };

  validateMockupRenderSpec(spec);
  return spec;
}

function mapMockupTypeToPricingFixtureType(type: MockupFixtureType): FixturePricing['fixtureType'] | null {
  switch (type) {
    case 'uplight':
    case 'spot':
    case 'flood':
    case 'wall_wash':
      return 'up';
    case 'path_light':
    case 'bollard':
      return 'path';
    case 'well_light':
      return 'well';
    case 'downlight':
      return 'soffit';
    case 'step_light':
      return 'hardscape';
    case 'gutter_uplight':
      return 'gutter';
    case 'coredrill':
      return 'coredrill';
    default:
      return null;
  }
}

export function buildPricingQuantitiesFromMockupFixtures(
  fixtures: MockupFixturePlacement[]
): Partial<Record<FixturePricing['fixtureType'], number>> {
  const byMockupType = countFixturesByType(fixtures);
  const byPricingType: Partial<Record<FixturePricing['fixtureType'], number>> = {};

  for (const [type, count] of Object.entries(byMockupType) as Array<[MockupFixtureType, number]>) {
    const pricingType = mapMockupTypeToPricingFixtureType(type);
    if (!pricingType || !count) continue;
    byPricingType[pricingType] = (byPricingType[pricingType] || 0) + count;
  }

  return byPricingType;
}
