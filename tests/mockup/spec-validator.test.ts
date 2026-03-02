import test from 'node:test';
import assert from 'node:assert/strict';
import { type MockupRenderSpec, validateMockupRenderSpec } from '../../src/lib/mockup/spec';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7YhJcAAAAASUVORK5CYII=';

function buildValidSpec(): MockupRenderSpec {
  return {
    version: '1.0',
    inputImage: {
      base64: TINY_PNG_BASE64,
      width: 1000,
      height: 800,
    },
    renderMode: 'coords',
    selectedFixtureTypes: ['uplight'],
    requiredCounts: { uplight: 1 },
    fixtures: [
      {
        id: 'fx-1',
        type: 'uplight',
        xNorm: 0.25,
        yNorm: 0.7,
        intensity01: 1,
        colorTempK: 2700,
      },
    ],
    stylePreset: 'balanced',
    constraints: {
      mustNotAddFixtures: true,
      mustNotRemoveFixtures: true,
      preserveArchitecture: true,
      preserveVegetationShapes: true,
    },
  };
}

test('validateMockupRenderSpec passes valid input', () => {
  const spec = buildValidSpec();
  assert.doesNotThrow(() => validateMockupRenderSpec(spec));
});

test('validateMockupRenderSpec throws when xNorm/yNorm is outside 0..1', () => {
  const spec = buildValidSpec();
  spec.fixtures[0].xNorm = 1.2;
  assert.throws(() => validateMockupRenderSpec(spec), /xNorm must be within 0\.\.1/i);
});
