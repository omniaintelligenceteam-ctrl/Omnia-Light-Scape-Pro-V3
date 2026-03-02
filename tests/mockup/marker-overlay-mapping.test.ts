import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMarkerPixelPositions } from '../../src/lib/mockup/markerOverlay';
import type { MockupFixturePlacement } from '../../src/lib/mockup/spec';

test('computeMarkerPixelPositions maps normalized coords to expected pixels', () => {
  const fixtures: MockupFixturePlacement[] = [
    {
      id: 'a',
      type: 'uplight',
      xNorm: 0.25,
      yNorm: 0.7,
      intensity01: 1,
      colorTempK: 2700,
    },
    {
      id: 'b',
      type: 'path_light',
      xNorm: 0.5,
      yNorm: 0.1,
      intensity01: 1,
      colorTempK: 2700,
    },
  ];

  const mapped = computeMarkerPixelPositions(fixtures, 400, 200);
  assert.equal(mapped[0].xPx, 100);
  assert.equal(mapped[0].yPx, 140);
  assert.equal(mapped[1].xPx, 200);
  assert.equal(mapped[1].yPx, 20);
});
