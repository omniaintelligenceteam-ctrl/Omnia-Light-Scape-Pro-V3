/**
 * Canvas Night Service
 *
 * 1. Pre-darkens a daytime property photo (preserves 100% composition)
 * 2. Renders warm lighting fixture glows at specified positions
 *
 * No external API calls — runs entirely in the browser via Canvas API.
 */

import type { SpatialMap, SpatialFixturePlacement } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-DARKEN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Darken and blue-shift a daytime image to create a rough nighttime base.
 * Preserves all architectural composition — only modifies color/brightness.
 *
 * @param imageBase64 - Raw base64 string (no data URI prefix)
 * @param mimeType - e.g. 'image/jpeg'
 * @returns base64 string of the darkened image (no data URI prefix)
 */
export async function preDarkenImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('[CanvasNight] Failed to create canvas context'));
          return;
        }

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Get pixel data for per-channel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Apply twilight/dusk color shift:
          // - Darken by ~50-55% while keeping enough detail for FLUX Fill
          // - Blue channel brighter (moonlit ambiance)
          // - Values tuned so FLUX Fill can render visible bright fixtures
          data[i]     = data[i]     * 0.22;  // R — significant reduction
          data[i + 1] = data[i + 1] * 0.25;  // G — significant reduction
          data[i + 2] = data[i + 2] * 0.40;  // B — moderate reduction (blue tint)
          // Alpha unchanged
        }

        ctx.putImageData(imageData, 0, 0);

        // Extract base64 without the data URI prefix
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[CanvasNight] Failed to load image'));
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAW FIXTURE MARKERS (for Gemini visual guidance)
// ═══════════════════════════════════════════════════════════════════════════════

/** Marker color per fixture type so Gemini can distinguish them */
const MARKER_COLORS: Record<string, string> = {
  up:        '#FF0000', // red
  soffit:    '#FF6600', // orange
  path:      '#00FF00', // green
  well:      '#FFFF00', // yellow
  hardscape: '#FF00FF', // magenta
  gutter:    '#00CCFF', // cyan
  coredrill: '#FFA500', // amber-orange
};
const DEFAULT_MARKER_COLOR = '#FF0000';

/** Fixture type → human-readable label for the numbered marker */
const MARKER_LABELS: Record<string, string> = {
  up:        'UP',
  soffit:    'DOWN',
  path:      'PATH',
  well:      'WELL',
  hardscape: 'STEP',
  gutter:    'GUTTER',
  coredrill: 'COREDRILL',
};

export interface MarkerRenderOptions {
  includeMarkerBodies?: boolean;
  includeNumbers?: boolean;
  includeTypeLabels?: boolean;
  includeCrosshairs?: boolean;
  includeGutterTextLabels?: boolean;
}

const DEFAULT_MARKER_RENDER_OPTIONS: Required<MarkerRenderOptions> = {
  includeMarkerBodies: true,
  includeNumbers: true,
  includeTypeLabels: true,
  includeCrosshairs: true,
  includeGutterTextLabels: true,
};

export const CLEAN_MODEL_MARKER_OPTIONS: MarkerRenderOptions = {
  includeMarkerBodies: false,
  includeNumbers: false,
  includeTypeLabels: false,
  includeCrosshairs: false,
  includeGutterTextLabels: false,
};

/**
 * Draw bright numbered markers on the image at each fixture position.
 * Gemini can SEE these markers and knows exactly where to place lights.
 *
 * @param imageBase64 - Original image (raw base64, no prefix)
 * @param spatialMap  - Fixture placements with positions
 * @param mimeType    - Image MIME type
 * @returns base64 of image with markers drawn (no data URI prefix)
 */

function drawGutterIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  markerRadius: number,
  color: string,
  index: number,
  options: Required<MarkerRenderOptions>
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

  // Horizontal bar (the fixture body)
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - barWidth / 2 - 2, cy - barHeight / 2 - 2, barWidth + 4, barHeight + 4);
  ctx.fillStyle = color;
  ctx.fillRect(cx - barWidth / 2, cy - barHeight / 2, barWidth, barHeight);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - barWidth / 2, cy - barHeight / 2, barWidth, barHeight);

  // Vertical stem going UP
  const stemTop = cy - barHeight / 2 - stemHeight;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - barHeight / 2);
  ctx.lineTo(cx, stemTop + arrowSize);
  ctx.stroke();
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

  if (options.includeNumbers) {
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

export async function drawFixtureMarkers(
  imageBase64: string,
  spatialMap: SpatialMap,
  mimeType: string = 'image/jpeg',
  options?: MarkerRenderOptions
): Promise<string> {
  const resolvedOptions: Required<MarkerRenderOptions> = {
    ...DEFAULT_MARKER_RENDER_OPTIONS,
    ...(options || {}),
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('[CanvasNight] Failed to create canvas context for markers'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        const markerRadius = Math.max(Math.round(img.width * 0.025), 16);

        spatialMap.placements.forEach((placement, index) => {
          const cx = (placement.horizontalPosition / 100) * img.width;
          const cy = (placement.verticalPosition / 100) * img.height;
          const color = MARKER_COLORS[placement.fixtureType] || DEFAULT_MARKER_COLOR;
          const label = MARKER_LABELS[placement.fixtureType] || 'LIGHT';
          const crossLen = markerRadius * 2;

          // Gutter fixtures get a custom icon (horizontal bar + upward arrow)
          if (placement.fixtureType === 'gutter') {
            drawGutterIcon(ctx, cx, cy, markerRadius, color, index, resolvedOptions);
            return;
          }

          // Crosshair lines (drawn first, behind the circle)
          if (resolvedOptions.includeCrosshairs) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - crossLen, cy);
            ctx.lineTo(cx + crossLen, cy);
            ctx.moveTo(cx, cy - crossLen);
            ctx.lineTo(cx, cy + crossLen);
            ctx.stroke();
          }

          if (resolvedOptions.includeMarkerBodies) {
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

          if (resolvedOptions.includeNumbers) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(index + 1), cx, cy);
          }

          if (resolvedOptions.includeTypeLabels) {
            const labelY = cy + markerRadius + Math.round(markerRadius * 0.8);
            ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
            ctx.fillStyle = '#000000';
            ctx.fillText(label, cx + 1, labelY + 1);
            ctx.fillText(label, cx - 1, labelY - 1);
            ctx.fillStyle = color;
            ctx.fillText(label, cx, labelY);
          }
        });

        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        resolve(dataUrl.split(',')[1]);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[CanvasNight] Failed to load image for markers'));
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOW CONFIGS PER FIXTURE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

interface GlowConfig {
  /** Color center: [R, G, B] 0-255 */
  color: [number, number, number];
  /** Base radius as fraction of image width */
  radiusX: number;
  /** Vertical radius (for directional glows like uplights) */
  radiusY: number;
  /** Vertical offset: negative = glow shifted up */
  offsetY: number;
  /** Core brightness 0-1 */
  intensity: number;
  /** Extra light pool on the surface below */
  pool: boolean;
  /** Default beam direction in user-space degrees (0=up, 90=right, 180=down). */
  defaultRotation: number;
}

export interface GlowRenderOptions {
  /** Global multiplier for fixture brightness. */
  intensityScale?: number;
  /** User-selected beam angle in degrees (typically 15-60). */
  beamAngleDeg?: number;
  /** Explicit width multiplier override for beam spread. */
  widthScale?: number;
  /** Explicit height multiplier override for beam reach. */
  heightScale?: number;
}

const GLOW_CONFIGS: Record<string, GlowConfig> = {
  up: {
    color: [255, 220, 150],   // warm white
    radiusX: 0.06,
    radiusY: 0.18,            // tall vertical cone
    offsetY: -0.10,           // shifts glow upward
    intensity: 0.85,
    pool: false,
    defaultRotation: 0,
  },
  soffit: {
    color: [255, 225, 170],   // warm downlight
    radiusX: 0.05,
    radiusY: 0.12,
    offsetY: 0.06,            // shifts glow downward
    intensity: 0.75,
    pool: true,
    defaultRotation: 180,
  },
  path: {
    color: [255, 230, 180],   // warm path light
    radiusX: 0.05,
    radiusY: 0.04,
    offsetY: 0,
    intensity: 0.80,
    pool: true,
    defaultRotation: 180,
  },
  well: {
    color: [255, 215, 140],   // warm well
    radiusX: 0.06,
    radiusY: 0.14,
    offsetY: -0.08,
    intensity: 0.80,
    pool: false,
    defaultRotation: 0,
  },
  gutter: {
    color: [255, 220, 150],   // warm white (same as up)
    radiusX: 0.07,
    radiusY: 0.16,            // tall vertical wash
    offsetY: -0.10,           // shifts glow UPWARD (same as up)
    intensity: 0.80,
    pool: false,
    defaultRotation: 0,
  },
  hardscape: {
    color: [255, 225, 165],   // warm step
    radiusX: 0.06,
    radiusY: 0.03,
    offsetY: 0,
    intensity: 0.70,
    pool: true,
    defaultRotation: 180,
  },
};

const DEFAULT_GLOW: GlowConfig = {
  color: [255, 220, 150],
  radiusX: 0.05,
  radiusY: 0.08,
  offsetY: 0,
  intensity: 0.75,
  pool: false,
  defaultRotation: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER FIXTURE GLOWS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render warm lighting glows onto a nighttime base image at the given fixture positions.
 * Uses canvas radial gradients + screen/additive blending for photorealistic effect.
 *
 * @param nightBase64 - The pre-darkened nighttime image (raw base64, no prefix)
 * @param spatialMap - Fixture placements with positions
 * @param mimeType - Image mime type
 * @returns base64 string of the image with glows (no data URI prefix)
 */
export async function renderFixtureGlows(
  nightBase64: string,
  spatialMap: SpatialMap,
  mimeType: string = 'image/jpeg',
  options?: GlowRenderOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('[CanvasNight] Failed to create canvas context'));
          return;
        }

        // Draw the darkened base image
        ctx.drawImage(img, 0, 0);

        // Render each fixture glow
        for (const placement of spatialMap.placements) {
          drawFixtureGlow(ctx, placement, img.width, img.height, options);
        }

        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[CanvasNight] Failed to load image for glow rendering'));
    img.src = `data:${mimeType};base64,${nightBase64}`;
  });
}

/**
 * Draw a single fixture glow with warm radial gradient + light source dot.
 */
function drawFixtureGlow(
  ctx: CanvasRenderingContext2D,
  placement: SpatialFixturePlacement,
  imgW: number,
  imgH: number,
  options?: GlowRenderOptions
): void {
  const config = GLOW_CONFIGS[placement.fixtureType] || DEFAULT_GLOW;
  const [r, g, b] = config.color;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const beamAngle = typeof options?.beamAngleDeg === 'number' ? options.beamAngleDeg : undefined;
  const normalizedBeam = beamAngle !== undefined
    ? clamp((beamAngle - 15) / 45, 0, 1)
    : 0.5;
  const beamWidthScaleFromAngle = beamAngle !== undefined
    ? 0.7 + normalizedBeam * 0.95
    : 1;
  const beamHeightScaleFromAngle = beamAngle !== undefined
    ? 1.25 - normalizedBeam * 0.45
    : 1;
  const widthScale = clamp((options?.widthScale ?? 1) * beamWidthScaleFromAngle, 0.4, 2.4);
  const heightScale = clamp((options?.heightScale ?? 1) * beamHeightScaleFromAngle, 0.35, 2.8);
  const beamLengthScale = clamp(placement.beamLength ?? 1, 0.3, 2.5);
  const intensityScale = clamp(options?.intensityScale ?? 1, 0.35, 1.9);
  const resolvedIntensity = clamp(config.intensity * intensityScale, 0.15, 1);

  // Position in pixels
  const cx = (placement.horizontalPosition / 100) * imgW;
  const cy = (placement.verticalPosition / 100) * imgH;
  const defaultRotation = config.defaultRotation;
  const resolvedRotation = typeof placement.rotation === 'number'
    ? ((placement.rotation % 360) + 360) % 360
    : defaultRotation;
  const directionRad = (resolvedRotation - 90) * Math.PI / 180;
  const rotationRad = resolvedRotation * Math.PI / 180;
  const dirX = Math.cos(directionRad);
  const dirY = Math.sin(directionRad);

  const offsetMagnitude = Math.abs(config.offsetY) * imgH;
  const glowCx = cx + dirX * offsetMagnitude;
  const glowCy = cy + dirY * offsetMagnitude;

  // Glow radii in pixels
  const rx = Math.max(2, config.radiusX * imgW * widthScale);
  const ry = Math.max(2, config.radiusY * imgH * beamLengthScale * heightScale);

  ctx.save();

  // === 1. Outer ambient glow (large, soft, subtle) ===
  ctx.globalCompositeOperation = 'screen';
  const outerGrad = ctx.createRadialGradient(
    glowCx, glowCy, 0,
    glowCx, glowCy, Math.max(rx, ry) * 2.5
  );
  outerGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.25})`);
  outerGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.10})`);
  outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, imgW, imgH);

  // === 2. Main directional glow (elliptical) ===
  ctx.globalCompositeOperation = 'screen';
  ctx.save();
  ctx.translate(glowCx, glowCy);
  ctx.rotate(rotationRad);
  ctx.scale(1, ry / rx);

  const forwardBias = rx * 0.28;
  const mainGrad = ctx.createRadialGradient(0, -forwardBias, 0, 0, -forwardBias, rx * 1.6);
  mainGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.75})`);
  mainGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.42})`);
  mainGrad.addColorStop(0.72, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.12})`);
  mainGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // === 3. Bright light source dot (small, intense white core) ===
  ctx.globalCompositeOperation = 'screen';
  const coreSize = Math.max(rx * 0.15, 3.5);
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
  coreGrad.addColorStop(0, `rgba(255, 255, 240, ${resolvedIntensity})`);
  coreGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.6})`);
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // === 4. Light pool on surface below (for path lights, soffits, hardscape) ===
  if (config.pool) {
    const poolDistance = Math.max(ry * 0.55, rx * 0.45);
    const poolX = cx + dirX * poolDistance;
    const poolY = cy + dirY * poolDistance;
    const poolRx = rx * 1.2;
    const poolRy = ry * 0.3;

    ctx.globalCompositeOperation = 'screen';
    ctx.save();
    ctx.translate(poolX, poolY);
    ctx.rotate(rotationRad);
    ctx.scale(1, poolRy / poolRx);

    const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, poolRx);
    poolGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.35})`);
    poolGrad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${resolvedIntensity * 0.10})`);
    poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.arc(0, 0, poolRx, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOFFIT ZONE CROPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the closest Gemini-supported aspect ratio for given dimensions.
 */
export function computeClosestAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (ratio >= 1.5) return '16:9';
  else if (ratio >= 1.15) return '4:3';
  else if (ratio >= 0.85) return '1:1';
  else if (ratio >= 0.65) return '3:4';
  else return '9:16';
}

/**
 * Crop the top N% of an image. Used to remove the 2nd-story soffit zone
 * so the AI can't hallucinate soffit downlights in areas without markers.
 */
export async function cropTopPercent(
  base64: string,
  mimeType: string,
  cropPercent: number
): Promise<{ croppedBase64: string; fullWidth: number; fullHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const srcY = Math.round(img.height * cropPercent / 100);
        const srcHeight = img.height - srcY;

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = srcHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('[CanvasNight] Failed to create canvas context for crop'));
          return;
        }

        // Draw only the bottom portion (skip top cropPercent%)
        ctx.drawImage(img, 0, srcY, img.width, srcHeight, 0, 0, img.width, srcHeight);

        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const croppedBase64 = dataUrl.split(',')[1];
        resolve({ croppedBase64, fullWidth: img.width, fullHeight: img.height });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('[CanvasNight] Failed to load image for crop'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Composite a cropped AI result back onto the full-sized nighttime base.
 * The top portion retains the dark nightBase (no lights), and the cropped
 * result is pasted below it — producing a seamless full-sized image.
 */
export async function compositeOntoFullImage(
  fullBase64: string,
  croppedResultDataUri: string,
  mimeType: string,
  cropPercent: number
): Promise<string> {
  // Load both images in parallel
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('[CanvasNight] Failed to load image for composite'));
      img.src = src;
    });

  const fullSrc = `data:${mimeType};base64,${fullBase64}`;
  // croppedResultDataUri may already have data: prefix
  const croppedSrc = croppedResultDataUri.startsWith('data:')
    ? croppedResultDataUri
    : `data:${mimeType};base64,${croppedResultDataUri}`;

  const [fullImg, croppedImg] = await Promise.all([
    loadImage(fullSrc),
    loadImage(croppedSrc),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = fullImg.width;
  canvas.height = fullImg.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('[CanvasNight] Failed to create canvas context for composite');

  // Draw full nightBase first (dark top stays intact)
  ctx.drawImage(fullImg, 0, 0);

  // Paste cropped result at the correct Y offset
  const yOffset = Math.round(fullImg.height * cropPercent / 100);
  ctx.drawImage(croppedImg, 0, yOffset);

  const dataUrl = canvas.toDataURL(mimeType, 0.92);
  return dataUrl;
}

