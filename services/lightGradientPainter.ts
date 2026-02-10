/**
 * Light Gradient Painter
 *
 * Paints directional warm-light gradient cones onto a property image
 * at each fixture position, so Gemini can SEE where each light goes
 * instead of interpreting text descriptions.
 *
 * Also draws numbered colored markers on top (same as canvasNightService)
 * to produce a single combined annotated image for Gemini.
 */

import {
  LightFixture,
  FixtureCategory,
  kelvinToRGB,
} from '../types/fixtures';

// ═══════════════════════════════════════════════════════════════════════════════
// MARKER COLORS & LABELS (must match canvasNightService.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/** Maps FixtureCategory → pipeline fixtureType for marker color lookup */
const CATEGORY_TO_PIPELINE: Record<FixtureCategory, string> = {
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

const MARKER_COLORS: Record<string, string> = {
  up:        '#FF0000',
  soffit:    '#FF6600',
  path:      '#00FF00',
  well:      '#FFFF00',
  hardscape: '#FF00FF',
  gutter:    '#00CCFF',
  coredrill: '#FFA500',
};
const DEFAULT_MARKER_COLOR = '#FF0000';

const MARKER_LABELS: Record<string, string> = {
  up:        'UP',
  soffit:    'DOWN',
  path:      'PATH',
  well:      'WELL',
  hardscape: 'STEP',
  gutter:    'WASH-UP▲',
  coredrill: 'COREDRILL',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRADIENT CONFIGS PER FIXTURE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

interface GradientConfig {
  direction: 'up' | 'down' | 'radial';
  heightPercent: number;
  widthPercent: number;
  originOffsetYPercent: number;
  opacity: number;
}

const GRADIENT_CONFIGS: Record<FixtureCategory, GradientConfig> = {
  uplight: {
    direction: 'up',
    heightPercent: 25,
    widthPercent: 6,
    originOffsetYPercent: -1.5,
    opacity: 0.35,
  },
  gutter_uplight: {
    direction: 'up',
    heightPercent: 35,
    widthPercent: 8,
    originOffsetYPercent: -3,
    opacity: 0.55,
  },
  downlight: {
    direction: 'down',
    heightPercent: 30,
    widthPercent: 10,
    originOffsetYPercent: 1,
    opacity: 0.30,
  },
  path_light: {
    direction: 'radial',
    heightPercent: 5,
    widthPercent: 8,
    originOffsetYPercent: 0,
    opacity: 0.30,
  },
  coredrill: {
    direction: 'up',
    heightPercent: 28,
    widthPercent: 4,
    originOffsetYPercent: -0.5,
    opacity: 0.35,
  },
  spot: {
    direction: 'up',
    heightPercent: 18,
    widthPercent: 3,
    originOffsetYPercent: -1,
    opacity: 0.35,
  },
  wall_wash: {
    direction: 'up',
    heightPercent: 20,
    widthPercent: 14,
    originOffsetYPercent: -1,
    opacity: 0.30,
  },
  well_light: {
    direction: 'up',
    heightPercent: 25,
    widthPercent: 5,
    originOffsetYPercent: -0.5,
    opacity: 0.35,
  },
  bollard: {
    direction: 'radial',
    heightPercent: 5,
    widthPercent: 8,
    originOffsetYPercent: 0,
    opacity: 0.30,
  },
  step_light: {
    direction: 'down',
    heightPercent: 8,
    widthPercent: 10,
    originOffsetYPercent: 1,
    opacity: 0.30,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRADIENT DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function toRgbaString(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * Paint an upward gradient cone (uplights, gutter lights, core drills, spots, wall wash, well lights).
 * Trapezoid shape: narrow at fixture, wider at top of beam.
 */
function paintUpwardGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  config: GradientConfig,
  rgb: [number, number, number],
  intensity: number,
  canvasW: number,
  canvasH: number
): void {
  const gradH = canvasH * (config.heightPercent / 100);
  const gradW = canvasW * (config.widthPercent / 100);
  const offsetY = canvasH * (config.originOffsetYPercent / 100);
  const maxAlpha = config.opacity * intensity;

  const originY = cy + offsetY;
  const topY = originY - gradH;

  const halfWidthBottom = gradW * 0.15;
  const halfWidthTop = gradW * 0.5;

  ctx.save();

  // Linear gradient: transparent at fixture → bright at ~35% → transparent at top
  const gradient = ctx.createLinearGradient(cx, originY, cx, topY);
  gradient.addColorStop(0, toRgbaString(rgb, 0));
  gradient.addColorStop(0.08, toRgbaString(rgb, maxAlpha * 0.6));
  gradient.addColorStop(0.35, toRgbaString(rgb, maxAlpha));
  gradient.addColorStop(0.7, toRgbaString(rgb, maxAlpha * 0.5));
  gradient.addColorStop(1, toRgbaString(rgb, 0));

  // Organic conical clip path (bezier curves instead of straight lines)
  const midY = (originY + topY) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - halfWidthBottom, originY);
  ctx.quadraticCurveTo(cx - halfWidthBottom * 1.3, midY, cx - halfWidthTop, topY);
  ctx.lineTo(cx + halfWidthTop, topY);
  ctx.quadraticCurveTo(cx + halfWidthBottom * 1.3, midY, cx + halfWidthBottom, originY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Glow dot at fixture origin
  const glowR = gradW * 0.3;
  const glow = ctx.createRadialGradient(cx, originY, 0, cx, originY, glowR);
  glow.addColorStop(0, toRgbaString(rgb, maxAlpha * 0.8));
  glow.addColorStop(0.5, toRgbaString(rgb, maxAlpha * 0.3));
  glow.addColorStop(1, toRgbaString(rgb, 0));

  ctx.beginPath();
  ctx.arc(cx, originY, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.restore();
}

/**
 * Paint a downward gradient cone (soffit downlights, step lights).
 * Inverted trapezoid: narrow at fixture, wider at bottom.
 */
function paintDownwardGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  config: GradientConfig,
  rgb: [number, number, number],
  intensity: number,
  canvasW: number,
  canvasH: number
): void {
  const gradH = canvasH * (config.heightPercent / 100);
  const gradW = canvasW * (config.widthPercent / 100);
  const offsetY = canvasH * (config.originOffsetYPercent / 100);
  const maxAlpha = config.opacity * intensity;

  const originY = cy + offsetY;
  const bottomY = originY + gradH;

  const halfWidthTop = gradW * 0.1;
  const halfWidthBottom = gradW * 0.5;

  ctx.save();

  const gradient = ctx.createLinearGradient(cx, originY, cx, bottomY);
  gradient.addColorStop(0, toRgbaString(rgb, maxAlpha));
  gradient.addColorStop(0.3, toRgbaString(rgb, maxAlpha * 0.7));
  gradient.addColorStop(0.7, toRgbaString(rgb, maxAlpha * 0.3));
  gradient.addColorStop(1, toRgbaString(rgb, 0));

  // Organic conical clip path
  const midY = (originY + bottomY) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - halfWidthTop, originY);
  ctx.quadraticCurveTo(cx - halfWidthTop * 1.3, midY, cx - halfWidthBottom, bottomY);
  ctx.lineTo(cx + halfWidthBottom, bottomY);
  ctx.quadraticCurveTo(cx + halfWidthTop * 1.3, midY, cx + halfWidthTop, originY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Glow dot at fixture origin
  const glowR = gradW * 0.2;
  const glow = ctx.createRadialGradient(cx, originY, 0, cx, originY, glowR);
  glow.addColorStop(0, toRgbaString(rgb, maxAlpha * 0.9));
  glow.addColorStop(1, toRgbaString(rgb, 0));

  ctx.beginPath();
  ctx.arc(cx, originY, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.restore();
}

/**
 * Paint a radial ground pool (path lights, bollards).
 * Elliptical gradient with perspective squash.
 */
function paintRadialGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  config: GradientConfig,
  rgb: [number, number, number],
  intensity: number,
  canvasW: number,
  canvasH: number
): void {
  const poolW = canvasW * (config.widthPercent / 100);
  const poolH = canvasH * (config.heightPercent / 100);
  const maxAlpha = config.opacity * intensity;

  const radiusX = poolW / 2;
  const radiusY = poolH / 2;

  ctx.save();

  // Use scale transform for elliptical gradient
  const maxR = Math.max(radiusX, radiusY);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  gradient.addColorStop(0, toRgbaString(rgb, maxAlpha));
  gradient.addColorStop(0.3, toRgbaString(rgb, maxAlpha * 0.7));
  gradient.addColorStop(0.6, toRgbaString(rgb, maxAlpha * 0.3));
  gradient.addColorStop(1, toRgbaString(rgb, 0));

  ctx.beginPath();
  ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Small bright cap glow slightly above center
  const capY = cy - poolH * 0.3;
  const capR = radiusX * 0.15;
  const capGlow = ctx.createRadialGradient(cx, capY, 0, cx, capY, capR);
  capGlow.addColorStop(0, toRgbaString(rgb, maxAlpha * 0.9));
  capGlow.addColorStop(1, toRgbaString(rgb, 0));

  ctx.beginPath();
  ctx.arc(cx, capY, capR, 0, Math.PI * 2);
  ctx.fillStyle = capGlow;
  ctx.fill();

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKER DRAWING (matches canvasNightService.ts drawFixtureMarkers)
// ═══════════════════════════════════════════════════════════════════════════════

function drawMarkers(
  ctx: CanvasRenderingContext2D,
  fixtures: LightFixture[],
  imgW: number,
  imgH: number
): void {
  const markerRadius = Math.max(Math.round(imgW * 0.025), 16);

  fixtures.forEach((fixture, index) => {
    const cx = (fixture.x / 100) * imgW;
    const cy = (fixture.y / 100) * imgH;
    const pipelineType = CATEGORY_TO_PIPELINE[fixture.type] || 'up';
    const color = MARKER_COLORS[pipelineType] || DEFAULT_MARKER_COLOR;
    const label = MARKER_LABELS[pipelineType] || 'LIGHT';
    const crossLen = markerRadius * 2;

    // Crosshair lines
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - crossLen, cy);
    ctx.lineTo(cx + crossLen, cy);
    ctx.moveTo(cx, cy - crossLen);
    ctx.lineTo(cx, cy + crossLen);
    ctx.stroke();

    // Dark backing circle
    ctx.beginPath();
    ctx.arc(cx, cy, markerRadius * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Bright colored circle
    ctx.beginPath();
    ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Number inside
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), cx, cy);

    // Label below with shadow
    const labelY = cy + markerRadius + Math.round(markerRadius * 0.8);
    ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.fillText(label, cx + 1, labelY + 1);
    ctx.fillText(label, cx - 1, labelY - 1);
    ctx.fillStyle = color;
    ctx.fillText(label, cx, labelY);

    // Directional arrow above/below marker to indicate beam direction
    const arrowSize = Math.round(markerRadius * 1.2);
    const upTypes = new Set(['up', 'gutter', 'well', 'coredrill']);
    const downTypes = new Set(['soffit', 'hardscape']);

    if (upTypes.has(pipelineType)) {
      // Draw upward arrow above marker
      const arrowY = cy - markerRadius - Math.round(markerRadius * 0.6);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${arrowSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText('\u25B2', cx, arrowY);
      ctx.fillText('\u25B2', cx, arrowY);
    } else if (downTypes.has(pipelineType)) {
      // Draw downward arrow below label
      const arrowY = labelY + Math.round(markerRadius * 0.8);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${arrowSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText('\u25BC', cx, arrowY);
      ctx.fillText('\u25BC', cx, arrowY);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Paint directional light gradients onto an existing canvas context.
 * Used by the GradientPreview component for live overlay (no image loading).
 */
export function paintGradientsToCanvas(
  ctx: CanvasRenderingContext2D,
  fixtures: LightFixture[],
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const fixture of fixtures) {
    const config = GRADIENT_CONFIGS[fixture.type];
    if (!config) {
      console.warn(`[GradientPainter] Skipping fixture with unknown type: ${fixture.type}`);
      continue;
    }
    const rgb = kelvinToRGB(fixture.colorTemp || 3000);
    const intensity = fixture.intensity ?? 0.8;
    const cx = (fixture.x / 100) * canvasWidth;
    const cy = (fixture.y / 100) * canvasHeight;

    switch (config.direction) {
      case 'up':
        paintUpwardGradient(ctx, cx, cy, config, rgb, intensity, canvasWidth, canvasHeight);
        break;
      case 'down':
        paintDownwardGradient(ctx, cx, cy, config, rgb, intensity, canvasWidth, canvasHeight);
        break;
      case 'radial':
        paintRadialGradient(ctx, cx, cy, config, rgb, intensity, canvasWidth, canvasHeight);
        break;
    }
  }

  ctx.restore();
}

/**
 * Main export: Takes an image + fixture array, produces a combined annotated
 * image with directional gradient cones + numbered markers.
 *
 * @param imageBase64 - Raw base64 (no data URI prefix)
 * @param fixtures    - LightFixture array from the FixturePlacer
 * @param mimeType    - Image MIME type (default 'image/jpeg')
 * @returns Raw base64 (no data URI prefix) of the combined annotated image
 */
export async function paintLightGradients(
  imageBase64: string,
  fixtures: LightFixture[],
  mimeType: string = 'image/jpeg'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 2048;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          const scale = MAX_DIM / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          console.log(`[GradientPainter] Resizing from ${img.width}x${img.height} to ${w}x${h}`);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('[GradientPainter] Failed to create canvas context'));
          return;
        }

        // 1. Draw original image (scaled to fit canvas)
        ctx.drawImage(img, 0, 0, w, h);

        // 2. Darken to ~40% so gradients are subtle hints, not bold shapes
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Paint directional gradients with screen blending
        paintGradientsToCanvas(ctx, fixtures, canvas.width, canvas.height);

        // 4. Reset composite and draw numbered markers on top
        ctx.globalCompositeOperation = 'source-over';
        drawMarkers(ctx, fixtures, canvas.width, canvas.height);

        // 5. Validation: verify gradient count matches fixture count
        if (fixtures.length > 0) {
          console.log(`[GradientPainter] Painted ${fixtures.length} gradient regions for ${fixtures.length} fixtures. ✓`);
        }

        // 6. Export as base64 without data URI prefix
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        resolve(dataUrl.split(',')[1]);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[GradientPainter] Failed to load image'));
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
}
