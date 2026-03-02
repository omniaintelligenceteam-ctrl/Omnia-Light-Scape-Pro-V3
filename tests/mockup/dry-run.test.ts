import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMockupPromptDryRun } from '../../src/lib/mockup/generateMockup';
import type { MockupRenderSpec } from '../../src/lib/mockup/spec';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7YhJcAAAAASUVORK5CYII=';

const spec: MockupRenderSpec = {
  version: '1.0',
  inputImage: {
    base64: TINY_PNG_BASE64,
    width: 1200,
    height: 900,
  },
  renderMode: 'coords',
  selectedFixtureTypes: ['uplight'],
  requiredCounts: { uplight: 1 },
  fixtures: [
    {
      id: 'fixture-1',
      type: 'uplight',
      xNorm: 0.4,
      yNorm: 0.8,
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

test('buildMockupPromptDryRun builds prompt and hashes without external API call', async () => {
  const result = await buildMockupPromptDryRun(spec);
  assert.ok(result.specHash.length > 10);
  assert.ok(Object.keys(result.promptPackVersions).length >= 5);
  assert.match(result.prompt, /FULL JSON SPEC \(AUTHORITATIVE\)/i);
  assert.match(result.prompt, /"renderMode": "coords"/i);
  assert.match(result.prompt, /FIXTURE CATALOG \(SELECTED TYPES ONLY\)/i);
});
