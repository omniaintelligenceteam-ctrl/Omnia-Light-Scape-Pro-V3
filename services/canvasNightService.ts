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

/**
 * Draw bright numbered markers on the image at each fixture position.
 * Gemini can SEE these markers and knows exactly where to place lights.
 *
 * @param imageBase64 - Original image (raw base64, no prefix)
 * @param spatialMap  - Fixture placements with positions
 * @param mimeType    - Image MIME type
 * @returns base64 of image with markers drawn (no data URI prefix)
 */
export async function drawFixtureMarkers(
  imageBase64: string,
  spatialMap: SpatialMap,
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

          // Crosshair lines (drawn first, behind the circle)
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - crossLen, cy);
          ctx.lineTo(cx + crossLen, cy);
          ctx.moveTo(cx, cy - crossLen);
          ctx.lineTo(cx, cy + crossLen);
          ctx.stroke();

          // Dark backing circle for contrast on any background
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

          // Number inside the circle
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(index + 1), cx, cy);

          // Label below the circle with dark shadow for readability
          const labelY = cy + markerRadius + Math.round(markerRadius * 0.8);
          ctx.font = `bold ${Math.round(markerRadius * 1.0)}px Arial`;
          // Shadow
          ctx.fillStyle = '#000000';
          ctx.fillText(label, cx + 1, labelY + 1);
          ctx.fillText(label, cx - 1, labelY - 1);
          // Colored label on top
          ctx.fillStyle = color;
          ctx.fillText(label, cx, labelY);
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
}

const GLOW_CONFIGS: Record<string, GlowConfig> = {
  up: {
    color: [255, 220, 150],   // warm white
    radiusX: 0.06,
    radiusY: 0.18,            // tall vertical cone
    offsetY: -0.10,           // shifts glow upward
    intensity: 0.85,
    pool: false,
  },
  soffit: {
    color: [255, 225, 170],   // warm downlight
    radiusX: 0.05,
    radiusY: 0.12,
    offsetY: 0.06,            // shifts glow downward
    intensity: 0.75,
    pool: true,
  },
  path: {
    color: [255, 230, 180],   // warm path light
    radiusX: 0.05,
    radiusY: 0.04,
    offsetY: 0,
    intensity: 0.80,
    pool: true,
  },
  well: {
    color: [255, 215, 140],   // warm well
    radiusX: 0.06,
    radiusY: 0.14,
    offsetY: -0.08,
    intensity: 0.80,
    pool: false,
  },
  gutter: {
    color: [255, 220, 150],   // warm white (same as up)
    radiusX: 0.07,
    radiusY: 0.16,            // tall vertical wash
    offsetY: -0.10,           // shifts glow UPWARD (same as up)
    intensity: 0.80,
    pool: false,
  },
  hardscape: {
    color: [255, 225, 165],   // warm step
    radiusX: 0.06,
    radiusY: 0.03,
    offsetY: 0,
    intensity: 0.70,
    pool: true,
  },
};

const DEFAULT_GLOW: GlowConfig = {
  color: [255, 220, 150],
  radiusX: 0.05,
  radiusY: 0.08,
  offsetY: 0,
  intensity: 0.75,
  pool: false,
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

        // Draw the darkened base image
        ctx.drawImage(img, 0, 0);

        // Render each fixture glow
        for (const placement of spatialMap.placements) {
          drawFixtureGlow(ctx, placement, img.width, img.height);
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
  imgH: number
): void {
  const config = GLOW_CONFIGS[placement.fixtureType] || DEFAULT_GLOW;
  const [r, g, b] = config.color;

  // Position in pixels
  const cx = (placement.horizontalPosition / 100) * imgW;
  const cy = (placement.verticalPosition / 100) * imgH;
  const offsetPx = config.offsetY * imgH;

  // Glow radii in pixels
  const rx = config.radiusX * imgW;
  const ry = config.radiusY * imgH;

  ctx.save();

  // === 1. Outer ambient glow (large, soft, subtle) ===
  ctx.globalCompositeOperation = 'screen';
  const outerGrad = ctx.createRadialGradient(
    cx, cy + offsetPx, 0,
    cx, cy + offsetPx, Math.max(rx, ry) * 2.5
  );
  outerGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.25})`);
  outerGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.10})`);
  outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, imgW, imgH);

  // === 2. Main directional glow (elliptical) ===
  ctx.globalCompositeOperation = 'screen';
  ctx.save();
  ctx.translate(cx, cy + offsetPx);
  ctx.scale(1, ry / rx); // stretch vertically for uplights/downlights

  const mainGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.5);
  mainGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.7})`);
  mainGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.4})`);
  mainGrad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.1})`);
  mainGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = mainGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // === 3. Bright light source dot (small, intense white core) ===
  ctx.globalCompositeOperation = 'screen';
  const coreSize = Math.max(rx * 0.15, 4);
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
  coreGrad.addColorStop(0, `rgba(255, 255, 240, ${config.intensity})`);
  coreGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.6})`);
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // === 4. Light pool on surface below (for path lights, soffits, hardscape) ===
  if (config.pool) {
    const poolY = cy + Math.abs(offsetPx) + ry * 0.5;
    const poolRx = rx * 1.2;
    const poolRy = ry * 0.3;

    ctx.globalCompositeOperation = 'screen';
    ctx.save();
    ctx.translate(cx, poolY);
    ctx.scale(1, poolRy / poolRx);

    const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, poolRx);
    poolGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.35})`);
    poolGrad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${config.intensity * 0.10})`);
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

