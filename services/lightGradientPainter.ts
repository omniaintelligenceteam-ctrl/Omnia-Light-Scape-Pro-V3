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
  GutterLine,
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
  gutter:    'GUTTER',
  coredrill: 'COREDRILL',
};

export interface GuideOverlayOptions {
  includeMarkerBodies?: boolean;
  includeMarkerNumbers?: boolean;
  includeMarkerTypeLabels?: boolean;
  includeGutterTextLabels?: boolean;
  includeGutterLineLabels?: boolean;
  includeCrosshairs?: boolean;
  includeDirectionalArrows?: boolean;
  showArrowsForDefaultDirection?: boolean;
  includeDirectionalText?: boolean;
  includeGutterLines?: boolean;
  includeGutterCenterGuide?: boolean;
  darkenAlpha?: number;
  gradientOpacityScale?: number;
}

const DEFAULT_OVERLAY_OPTIONS: Required<GuideOverlayOptions> = {
  includeMarkerBodies: true,
  includeMarkerNumbers: true,
  includeMarkerTypeLabels: true,
  includeGutterTextLabels: true,
  includeGutterLineLabels: true,
  includeCrosshairs: true,
  includeDirectionalArrows: true,
  showArrowsForDefaultDirection: true,
  includeDirectionalText: true,
  includeGutterLines: true,
  includeGutterCenterGuide: true,
  darkenAlpha: 0.4,
  gradientOpacityScale: 1,
};

export const CLEAN_MODEL_GUIDE_OPTIONS: GuideOverlayOptions = {
  includeMarkerBodies: false,
  includeMarkerNumbers: false,
  includeMarkerTypeLabels: false,
  includeGutterTextLabels: false,
  includeGutterLineLabels: false,
  includeCrosshairs: false,
  includeDirectionalArrows: true,
  showArrowsForDefaultDirection: false,
  includeDirectionalText: false,
  includeGutterLines: true,
  includeGutterCenterGuide: false,
  darkenAlpha: 0.25,
  gradientOpacityScale: 0.45,
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
    heightPercent: 45,
    widthPercent: 10,
    originOffsetYPercent: -3,
    opacity: 0.70,
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
  canvasH: number,
  opacityScale: number = 1,
  showCenterGuide: boolean = true
): void {
  const gradH = canvasH * (config.heightPercent / 100);
  const gradW = canvasW * (config.widthPercent / 100);
  const offsetY = canvasH * (config.originOffsetYPercent / 100);
  const maxAlpha = config.opacity * intensity * opacityScale;

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

  // Bright center beam line for gutter uplights (heightPercent >= 40)
  if (showCenterGuide && config.heightPercent >= 40) {
    ctx.beginPath();
    ctx.moveTo(cx, originY);
    ctx.lineTo(cx, topY + gradH * 0.3);
    ctx.strokeStyle = toRgbaString(rgb, maxAlpha * 0.6);
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

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
  canvasH: number,
  opacityScale: number = 1
): void {
  const gradH = canvasH * (config.heightPercent / 100);
  const gradW = canvasW * (config.widthPercent / 100);
  const offsetY = canvasH * (config.originOffsetYPercent / 100);
  const maxAlpha = config.opacity * intensity * opacityScale;

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
  canvasH: number,
  opacityScale: number = 1
): void {
  const poolW = canvasW * (config.widthPercent / 100);
  const poolH = canvasH * (config.heightPercent / 100);
  const maxAlpha = config.opacity * intensity * opacityScale;

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
// GUTTER ICON (horizontal bar + upward arrow)
// ═══════════════════════════════════════════════════════════════════════════════

function drawGutterIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  markerRadius: number,
  color: string,
  index: number,
  options: Required<GuideOverlayOptions>
): void {
  if (!options.includeMarkerBodies) {
    const dotRadius = Math.max(3, Math.round(markerRadius * 0.22));
    ctx.beginPath();
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, dotRadius - 1), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  const barWidth = markerRadius * 2.4;
  const barHeight = markerRadius * 0.6;
  const stemHeight = markerRadius * 2.5;
  const arrowSize = markerRadius * 0.8;

  // Horizontal bar (the fixture body) — centered at (cx, cy)
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - barWidth / 2 - 2, cy - barHeight / 2 - 2, barWidth + 4, barHeight + 4);
  ctx.fillStyle = color;
  ctx.fillRect(cx - barWidth / 2, cy - barHeight / 2, barWidth, barHeight);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - barWidth / 2, cy - barHeight / 2, barWidth, barHeight);

  // Vertical stem going UP from center of bar
  const stemTop = cy - barHeight / 2 - stemHeight;

  // Dark outline for stem (drawn first, behind)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - barHeight / 2);
  ctx.lineTo(cx, stemTop + arrowSize);
  ctx.stroke();
  // White stem on top
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - barHeight / 2);
  ctx.lineTo(cx, stemTop + arrowSize);
  ctx.stroke();

  // Arrowhead at top
  ctx.fillStyle = color;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, stemTop);
  ctx.lineTo(cx - arrowSize, stemTop + arrowSize);
  ctx.lineTo(cx + arrowSize, stemTop + arrowSize);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (options.includeMarkerNumbers) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(barHeight * 1.2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), cx, cy);
  }

  if (options.includeGutterTextLabels) {
    const labelY = cy + barHeight / 2 + Math.round(markerRadius * 0.8);
    ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.fillText('GUTTER', cx + 1, labelY + 1);
    ctx.fillText('GUTTER', cx - 1, labelY - 1);
    ctx.fillStyle = color;
    ctx.fillText('GUTTER', cx, labelY);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUTTER LINE DRAWING (amber dashed lines matching UI overlay)
// ═══════════════════════════════════════════════════════════════════════════════

function drawGutterLines(
  ctx: CanvasRenderingContext2D,
  gutterLines: GutterLine[],
  imgW: number,
  imgH: number,
  options: Required<GuideOverlayOptions>
): void {
  if (!gutterLines || gutterLines.length === 0) return;

  const lineWidth = Math.max(Math.round(imgW * 0.004), 3);
  const fontSize = Math.max(Math.round(imgW * 0.018), 14);
  const dashLen = Math.max(Math.round(imgW * 0.012), 8);
  const gapLen = Math.max(Math.round(imgW * 0.006), 4);
  const endR = Math.max(Math.round(imgW * 0.006), 4);

  ctx.save();

  for (const line of gutterLines) {
    const x1 = (line.startX / 100) * imgW;
    const y1 = (line.startY / 100) * imgH;
    const x2 = (line.endX / 100) * imgW;
    const y2 = (line.endY / 100) * imgH;

    // Dark outline for contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = lineWidth + 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Amber dashed line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([dashLen, gapLen]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Endpoint circles
    for (const [ex, ey] of [[x1, y1], [x2, y2]]) {
      ctx.beginPath();
      ctx.arc(ex, ey, endR, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (options.includeGutterLineLabels) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText('GUTTER LINE', mx + 1, my - fontSize * 0.8 + 1);
      ctx.fillText('GUTTER LINE', mx - 1, my - fontSize * 0.8 - 1);
      ctx.fillStyle = '#F59E0B';
      ctx.fillText('GUTTER LINE', mx, my - fontSize * 0.8);
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKER DRAWING (matches canvasNightService.ts drawFixtureMarkers)
// ═══════════════════════════════════════════════════════════════════════════════

function drawMarkers(
  ctx: CanvasRenderingContext2D,
  fixtures: LightFixture[],
  imgW: number,
  imgH: number,
  options: Required<GuideOverlayOptions>
): void {
  const markerRadius = Math.max(Math.round(imgW * 0.025), 16);

  fixtures.forEach((fixture, index) => {
    const cx = (fixture.x / 100) * imgW;
    const cy = (fixture.y / 100) * imgH;
    const pipelineType = CATEGORY_TO_PIPELINE[fixture.type] || 'up';
    const color = MARKER_COLORS[pipelineType] || DEFAULT_MARKER_COLOR;
    const label = MARKER_LABELS[pipelineType] || 'LIGHT';
    const crossLen = markerRadius * 2;
    const downTypes = new Set(['soffit', 'hardscape']);
    const defaultRot = downTypes.has(pipelineType) ? 180 : 0;
    const resolvedRot = fixture.rotation ?? defaultRot;
    const rotationDelta = Math.abs((((resolvedRot - defaultRot) % 360) + 540) % 360 - 180);
    const hasCustomRotation = rotationDelta > 6;

    // Gutter fixtures get a custom icon (horizontal bar + upward arrow)
    if (pipelineType === 'gutter') {
      drawGutterIcon(ctx, cx, cy, markerRadius, color, index, options);
      return;
    }

    // Crosshair lines
    if (options.includeCrosshairs) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - crossLen, cy);
      ctx.lineTo(cx + crossLen, cy);
      ctx.moveTo(cx, cy - crossLen);
      ctx.lineTo(cx, cy + crossLen);
      ctx.stroke();
    }

    if (options.includeMarkerBodies) {
      ctx.beginPath();
      ctx.arc(cx, cy, markerRadius * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    } else {
      const dotRadius = Math.max(3, Math.round(markerRadius * 0.22));
      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, dotRadius - 1), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (options.includeMarkerNumbers) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), cx, cy);
    }

    if (options.includeMarkerTypeLabels) {
      const labelY = cy + markerRadius + Math.round(markerRadius * 0.8);
      ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.fillText(label, cx + 1, labelY + 1);
      ctx.fillText(label, cx - 1, labelY - 1);
      ctx.fillStyle = color;
      ctx.fillText(label, cx, labelY);
    }

    // Rotation-aware directional arrow from fixture center
    const radialTypes = new Set(['path']);
    const shouldDrawDirectionArrow =
      options.includeDirectionalArrows &&
      !radialTypes.has(pipelineType) &&
      (options.showArrowsForDefaultDirection || hasCustomRotation);
    if (shouldDrawDirectionArrow) {
      const arrowLen = Math.round(markerRadius * 2.0);
      const beamLen = fixture.beamLength ?? 1.0;
      const scaledArrowLen = Math.round(arrowLen * Math.min(beamLen, 2.0));

      // Determine rotation angle (0=up default for most, 180 for down types)
      const rotDeg = resolvedRot;

      // Convert to canvas radians: user 0°=up → canvas -PI/2
      const canvasRad = (rotDeg - 90) * Math.PI / 180;

      const ax = cx + Math.cos(canvasRad) * scaledArrowLen;
      const ay = cy + Math.sin(canvasRad) * scaledArrowLen;

      // Arrow line with black outline for contrast
      ctx.save();
      ctx.lineCap = 'round';

      // Black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(5, Math.round(markerRadius * 0.4));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // White arrow line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(3, Math.round(markerRadius * 0.3));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // Arrowhead at tip
      const headLen = Math.round(markerRadius * 0.6);
      const headAngle = 0.4;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(4, Math.round(markerRadius * 0.35));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(canvasRad - headAngle),
                 ay - headLen * Math.sin(canvasRad - headAngle));
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(canvasRad + headAngle),
                 ay - headLen * Math.sin(canvasRad + headAngle));
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2, Math.round(markerRadius * 0.25));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(canvasRad - headAngle),
                 ay - headLen * Math.sin(canvasRad - headAngle));
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(canvasRad + headAngle),
                 ay - headLen * Math.sin(canvasRad + headAngle));
      ctx.stroke();

      ctx.restore();

      // Keep gutter "↑ UP" label when rotation is near default (0°)
      if (
        options.includeDirectionalText &&
        pipelineType === 'gutter' &&
        (fixture.rotation === undefined || fixture.rotation < 22.5 || fixture.rotation >= 337.5)
      ) {
        const upLabelY = cy - markerRadius - Math.round(markerRadius * 1.4);
        ctx.font = `bold ${Math.round(markerRadius * 1.2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText('\u2191 UP', cx, upLabelY);
        ctx.fillStyle = '#F59E0B';
        ctx.fillText('\u2191 UP', cx, upLabelY);
      }
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
  canvasHeight: number,
  options?: GuideOverlayOptions
): void {
  const resolvedOptions: Required<GuideOverlayOptions> = {
    ...DEFAULT_OVERLAY_OPTIONS,
    ...(options || {}),
  };
  const opacityScale = Math.max(0, resolvedOptions.gradientOpacityScale);
  const includeGutterCenterGuide = resolvedOptions.includeGutterCenterGuide;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const fixture of fixtures) {
    const config = GRADIENT_CONFIGS[fixture.type];
    if (!config) {
      console.warn(`[GradientPainter] Skipping fixture with unknown type: ${fixture.type}`);
      continue;
    }
    // Per-fixture beam length scaling
    const beamLen = fixture.beamLength ?? 1.0;
    const scaledConfig = beamLen !== 1.0
      ? { ...config, heightPercent: config.heightPercent * beamLen }
      : config;

    const rgb = kelvinToRGB(fixture.colorTemp || 3000);
    const intensity = fixture.intensity ?? 0.8;
    const cx = (fixture.x / 100) * canvasWidth;
    const cy = (fixture.y / 100) * canvasHeight;

    // Per-fixture rotation (relative to type's default direction)
    const defaultRot = config.direction === 'down' ? 180 : 0;
    const userRot = fixture.rotation ?? defaultRot;
    const rotDelta = (userRot - defaultRot) * Math.PI / 180;
    const needsRotation = Math.abs(rotDelta) > 0.01;

    if (needsRotation) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotDelta);
      ctx.translate(-cx, -cy);
    }

    switch (scaledConfig.direction) {
      case 'up':
        paintUpwardGradient(
          ctx,
          cx,
          cy,
          scaledConfig,
          rgb,
          intensity,
          canvasWidth,
          canvasHeight,
          opacityScale,
          includeGutterCenterGuide
        );
        break;
      case 'down':
        paintDownwardGradient(
          ctx,
          cx,
          cy,
          scaledConfig,
          rgb,
          intensity,
          canvasWidth,
          canvasHeight,
          opacityScale
        );
        break;
      case 'radial':
        paintRadialGradient(
          ctx,
          cx,
          cy,
          scaledConfig,
          rgb,
          intensity,
          canvasWidth,
          canvasHeight,
          opacityScale
        );
        break;
    }

    if (needsRotation) {
      ctx.restore();
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
  mimeType: string = 'image/jpeg',
  gutterLines?: GutterLine[],
  options?: GuideOverlayOptions
): Promise<string> {
  const resolvedOptions: Required<GuideOverlayOptions> = {
    ...DEFAULT_OVERLAY_OPTIONS,
    ...(options || {}),
  };

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
        const darkenAlpha = Math.max(0, Math.min(0.9, resolvedOptions.darkenAlpha));
        ctx.fillStyle = `rgba(0, 0, 0, ${darkenAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Paint directional gradients with screen blending
        paintGradientsToCanvas(ctx, fixtures, canvas.width, canvas.height, resolvedOptions);

        // 3.5. Draw gutter lines (under markers, over gradients)
        ctx.globalCompositeOperation = 'source-over';
        if (resolvedOptions.includeGutterLines && gutterLines && gutterLines.length > 0) {
          drawGutterLines(ctx, gutterLines, canvas.width, canvas.height, resolvedOptions);
          console.log(`[GradientPainter] Drew ${gutterLines.length} gutter line(s) on annotated image.`);
        }

        // 4. Reset composite and draw numbered markers on top
        ctx.globalCompositeOperation = 'source-over';
        drawMarkers(ctx, fixtures, canvas.width, canvas.height, resolvedOptions);

        // 5. Validation: verify gradient count matches fixture count
        if (fixtures.length > 0) {
          console.log(`[GradientPainter] Painted ${fixtures.length} gradient regions for ${fixtures.length} fixtures. ✓`);
        }

        // 6. Export as base64 without data URI prefix
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        resolve(dataUrl.split(',')[1]);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[GradientPainter] Failed to load image'));
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
}
