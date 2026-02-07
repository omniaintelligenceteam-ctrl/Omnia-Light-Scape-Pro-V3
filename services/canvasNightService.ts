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
  gutter:    'MOUNTED',
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
  hardscape: {
    color: [255, 225, 165],   // warm step
    radiusX: 0.06,
    radiusY: 0.03,
    offsetY: 0,
    intensity: 0.70,
    pool: true,
  },
  gutter: {
    color: [255, 220, 150],   // warm white (same as uplight)
    radiusX: 0.07,
    radiusY: 0.20,            // tall vertical cone going UPWARD
    offsetY: -0.12,           // strongly shifted UP (above fixture)
    intensity: 0.85,
    pool: false,              // no ground pool — light goes UP
  },
  coredrill: {
    color: [255, 215, 140],   // warm wall-graze
    radiusX: 0.04,
    radiusY: 0.16,            // narrow upward cone
    offsetY: -0.10,
    intensity: 0.80,
    pool: false,
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
// PRE-LIT NIGHTTIME IMAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggressively darken areas of the image that are far from any fixture marker.
 * Special emphasis on the eave/soffit zone (top ~25% of image) when no gutter/soffit
 * fixture is nearby — makes those areas near-black so the AI can't add phantom lights.
 *
 * Uses 8x8 pixel blocks for performance instead of per-pixel processing.
 */
async function aggressivelyDarkenUnlitAreas(
  imageBase64: string,
  spatialMap: SpatialMap,
  mimeType: string
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

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;

        // Pre-compute fixture positions in pixel coordinates
        const fixturePixels = spatialMap.placements.map(p => ({
          x: (p.horizontalPosition / 100) * w,
          y: (p.verticalPosition / 100) * h,
          type: p.fixtureType,
        }));

        // Beam protection radius per fixture type (in pixels, based on image width)
        const beamRadius: Record<string, number> = {
          up: w * 0.08,
          gutter: w * 0.10,
          path: w * 0.07,
          well: w * 0.08,
          hardscape: w * 0.08,
          soffit: w * 0.08,
          coredrill: w * 0.06,
        };
        const defaultRadius = w * 0.08;

        // Soffit zone: top 25% of image
        const soffitZoneY = h * 0.25;

        // Process in 8x8 blocks for performance
        const blockSize = 8;
        for (let by = 0; by < h; by += blockSize) {
          for (let bx = 0; bx < w; bx += blockSize) {
            const blockCenterX = bx + blockSize / 2;
            const blockCenterY = by + blockSize / 2;

            // Find minimum distance to any fixture
            let minDist = Infinity;
            let nearestRadius = defaultRadius;
            for (const fp of fixturePixels) {
              const dx = blockCenterX - fp.x;
              const dy = blockCenterY - fp.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) {
                minDist = dist;
                nearestRadius = beamRadius[fp.type] || defaultRadius;
              }
            }

            // Calculate darkening factor
            let darkenFactor = 1.0; // 1.0 = no change

            if (minDist > nearestRadius * 3) {
              // Very far from any fixture — heavy darkening
              darkenFactor = 0.35;
            } else if (minDist > nearestRadius * 2) {
              // Moderate distance — some darkening
              darkenFactor = 0.55;
            } else if (minDist > nearestRadius) {
              // Transition zone — light darkening with smooth falloff
              const t = (minDist - nearestRadius) / nearestRadius;
              darkenFactor = 1.0 - (t * 0.45);
            }
            // Within beam radius: darkenFactor stays 1.0 (no change)

            // Extra aggressive darkening for soffit zone without nearby gutter/soffit fixtures
            if (blockCenterY < soffitZoneY) {
              const hasNearbySoffitOrGutter = fixturePixels.some(fp => {
                if (fp.type !== 'gutter' && fp.type !== 'soffit') return false;
                const dx = blockCenterX - fp.x;
                const dy = blockCenterY - fp.y;
                return Math.sqrt(dx * dx + dy * dy) < w * 0.12;
              });

              if (!hasNearbySoffitOrGutter) {
                // No gutter/soffit fixture near this soffit area — darken to near-black
                darkenFactor = Math.min(darkenFactor, 0.15);
              }
            }

            // Apply darkening to all pixels in this block
            if (darkenFactor < 1.0) {
              const maxY = Math.min(by + blockSize, h);
              const maxX = Math.min(bx + blockSize, w);
              for (let py = by; py < maxY; py++) {
                for (let px = bx; px < maxX; px++) {
                  const idx = (py * w + px) * 4;
                  data[idx]     = Math.round(data[idx] * darkenFactor);     // R
                  data[idx + 1] = Math.round(data[idx + 1] * darkenFactor); // G
                  data[idx + 2] = Math.round(data[idx + 2] * darkenFactor); // B
                  // Alpha unchanged
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('[CanvasNight] Failed to load image for aggressive darkening'));
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
}

/**
 * Create a pre-lit nighttime image with realistic fixture glows and aggressively
 * darkened unlit areas. This gives the AI a nearly-finished image to refine to
 * photorealism, rather than asking it to create lights from scratch.
 *
 * @param nightBase64 - Pre-darkened nighttime base image (from preDarkenImage)
 * @param spatialMap - Fixture placements with positions and types
 * @param mimeType - Image mime type
 * @returns Pre-lit nighttime image with realistic glows + darkened unlit areas
 */
export async function createPreLitNighttime(
  nightBase64: string,
  spatialMap: SpatialMap,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  // 1. Paint realistic fixture glows on the darkened nighttime base
  const preLitImage = await renderFixtureGlows(nightBase64, spatialMap, mimeType);

  // 2. Aggressively darken areas without fixtures (especially soffits/eaves)
  const finalImage = await aggressivelyDarkenUnlitAreas(preLitImage, spatialMap, mimeType);

  return finalImage;
}
