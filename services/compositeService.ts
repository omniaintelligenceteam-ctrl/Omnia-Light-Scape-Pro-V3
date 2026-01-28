/**
 * Composite Lighting Service for Omnia
 * 
 * This service handles compositing realistic light fixture effects onto images.
 * It takes IC-Light output (or any base image) and overlays precise fixture
 * glow effects at user-specified positions.
 * 
 * Based on: /home/node/clawd/projects/lighting-gen/composite_lights.py
 */

import {
  LightFixture,
  FixtureCategory,
  GlowConfiguration,
  getFixturePreset,
  kelvinToRGB,
  FixtureLayout
} from '../types/fixtures';

/**
 * Configuration for the compositing process
 */
export interface CompositeConfig {
  // Quality settings
  outputQuality: number;        // 0-1, JPEG quality
  maxOutputWidth: number;       // Max output width in pixels
  
  // Effect settings
  globalIntensityMultiplier: number;  // Scale all fixture intensities
  ambientBlend: number;               // How much ambient affects fixtures (0-1)
  
  // Processing
  useWebGL: boolean;            // Use WebGL for better performance
  antialiasing: boolean;        // Enable antialiasing
}

const DEFAULT_CONFIG: CompositeConfig = {
  outputQuality: 0.95,
  maxOutputWidth: 1920,
  globalIntensityMultiplier: 1.0,
  ambientBlend: 0.2,
  useWebGL: false,
  antialiasing: true
};

/**
 * Result from composite operation
 */
export interface CompositeResult {
  dataUrl: string;         // Base64 data URL of composited image
  blob: Blob;              // Blob for upload/download
  width: number;
  height: number;
  fixtureCount: number;
  processingTimeMs: number;
}

/**
 * Load an image from URL or data URL
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Screen blend mode: 1 - (1-a)(1-b)
 * Used for realistic light additive effects
 */
function screenBlend(
  baseData: ImageData,
  overlayData: ImageData
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(baseData.data),
    baseData.width,
    baseData.height
  );

  for (let i = 0; i < result.data.length; i += 4) {
    const baseR = baseData.data[i] / 255;
    const baseG = baseData.data[i + 1] / 255;
    const baseB = baseData.data[i + 2] / 255;

    const overlayR = overlayData.data[i] / 255;
    const overlayG = overlayData.data[i + 1] / 255;
    const overlayB = overlayData.data[i + 2] / 255;
    const overlayA = overlayData.data[i + 3] / 255;

    // Screen blend with alpha
    result.data[i] = Math.round((1 - (1 - baseR) * (1 - overlayR * overlayA)) * 255);
    result.data[i + 1] = Math.round((1 - (1 - baseG) * (1 - overlayG * overlayA)) * 255);
    result.data[i + 2] = Math.round((1 - (1 - baseB) * (1 - overlayB * overlayA)) * 255);
    result.data[i + 3] = 255;
  }

  return result;
}

/**
 * Apply Gaussian-like blur to ImageData
 * Simplified box blur for performance
 */
function applyBlur(
  ctx: CanvasRenderingContext2D,
  radius: number
): void {
  if (radius <= 0) return;
  
  // Use canvas filter if available (much faster)
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
}

/**
 * Draw a single uplight glow effect
 */
function drawUplightGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  glow: GlowConfiguration,
  intensity: number,
  color: [number, number, number],
  imgWidth: number,
  imgHeight: number
): void {
  const glowHeight = glow.baseHeight * imgHeight * intensity;
  const glowWidth = glow.baseWidth * imgWidth * intensity;

  // Draw multiple gradient layers for realistic falloff
  for (let layer = 0; layer < glow.layers; layer++) {
    const layerScale = 1 - (layer * 0.15);
    const h = glowHeight * layerScale;
    const w = glowWidth * layerScale;
    const alpha = 0.4 * intensity * layerScale * (1 - layer * 0.15);

    // Create ellipse gradient extending upward from fixture point
    const gradient = ctx.createRadialGradient(
      x, y - h / 2,
      0,
      x, y - h / 2,
      Math.max(w, h)
    );

    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
    gradient.addColorStop(0.3, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.6})`);
    gradient.addColorStop(0.6, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.2})`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y - h / 3, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add bright core near fixture
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
  coreGradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${glow.coreIntensity * intensity})`);
  coreGradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${glow.coreIntensity * intensity * 0.3})`);
  coreGradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a single downlight glow effect
 */
function drawDownlightGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  glow: GlowConfiguration,
  intensity: number,
  color: [number, number, number],
  imgWidth: number,
  imgHeight: number
): void {
  const glowHeight = glow.baseHeight * imgHeight * intensity;
  const glowWidth = glow.baseWidth * imgWidth * intensity;

  for (let layer = 0; layer < glow.layers; layer++) {
    const layerScale = 1 - (layer * 0.15);
    const h = glowHeight * layerScale;
    const w = glowWidth * layerScale;
    const alpha = 0.35 * intensity * layerScale;

    const gradient = ctx.createRadialGradient(
      x, y + h / 3,
      0,
      x, y + h / 3,
      Math.max(w, h)
    );

    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y + h / 4, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
  coreGradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${glow.coreIntensity * intensity})`);
  coreGradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw an omnidirectional glow (path lights, bollards)
 */
function drawOmniGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  glow: GlowConfiguration,
  intensity: number,
  color: [number, number, number],
  imgWidth: number,
  imgHeight: number
): void {
  const radius = Math.max(glow.baseHeight, glow.baseWidth) * Math.min(imgWidth, imgHeight) * intensity;

  for (let layer = 0; layer < glow.layers; layer++) {
    const layerScale = 1 - (layer * 0.2);
    const r = radius * layerScale;
    const alpha = 0.3 * intensity * layerScale;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright core
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
  coreGradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${glow.coreIntensity * intensity})`);
  coreGradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a wall wash effect (wide spread)
 */
function drawWallWashGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  glow: GlowConfiguration,
  intensity: number,
  color: [number, number, number],
  imgWidth: number,
  imgHeight: number
): void {
  const glowHeight = glow.baseHeight * imgHeight * intensity;
  const glowWidth = glow.baseWidth * imgWidth * intensity;

  for (let layer = 0; layer < glow.layers; layer++) {
    const layerScale = 1 - (layer * 0.12);
    const h = glowHeight * layerScale;
    const w = glowWidth * layerScale;
    const alpha = 0.25 * intensity * layerScale;

    // Wide ellipse for wall wash effect
    const gradient = ctx.createRadialGradient(
      x, y - h / 4,
      0,
      x, y - h / 4,
      Math.max(w, h) * 1.5
    );

    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
    gradient.addColorStop(0.3, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.7})`);
    gradient.addColorStop(0.6, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y - h / 4, w * 1.5, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle core
  const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
  coreGradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${glow.coreIntensity * intensity * 0.7})`);
  coreGradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a fixture's complete glow effect based on its type
 */
function drawFixtureGlow(
  ctx: CanvasRenderingContext2D,
  fixture: LightFixture,
  imgWidth: number,
  imgHeight: number,
  config: CompositeConfig
): void {
  const preset = getFixturePreset(fixture.type);
  const glow = preset.glowConfig;
  const intensity = fixture.intensity * config.globalIntensityMultiplier;
  const color = kelvinToRGB(fixture.colorTemp);

  // Convert percentage position to pixels
  const x = (fixture.x / 100) * imgWidth;
  const y = (fixture.y / 100) * imgHeight;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  switch (glow.direction) {
    case 'up':
      drawUplightGlow(ctx, x, y, imgWidth, imgHeight, glow, intensity, color, imgWidth, imgHeight);
      break;
    case 'down':
      drawDownlightGlow(ctx, x, y, glow, intensity, color, imgWidth, imgHeight);
      break;
    case 'spread':
      drawWallWashGlow(ctx, x, y, glow, intensity, color, imgWidth, imgHeight);
      break;
    case 'omni':
    default:
      drawOmniGlow(ctx, x, y, glow, intensity, color, imgWidth, imgHeight);
  }

  ctx.restore();
}

/**
 * Main compositing function
 * Takes a base image and overlays fixture glow effects
 */
export async function compositeFixtures(
  baseImageUrl: string,
  fixtures: LightFixture[],
  config: Partial<CompositeConfig> = {}
): Promise<CompositeResult> {
  const startTime = performance.now();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Load base image
  const img = await loadImage(baseImageUrl);

  // Calculate output dimensions
  let width = img.width;
  let height = img.height;
  
  if (width > mergedConfig.maxOutputWidth) {
    const scale = mergedConfig.maxOutputWidth / width;
    width = mergedConfig.maxOutputWidth;
    height = Math.round(height * scale);
  }

  // Create output canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable antialiasing
  if (mergedConfig.antialiasing) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  // Draw base image
  ctx.drawImage(img, 0, 0, width, height);

  // Create glow layer
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = width;
  glowCanvas.height = height;
  const glowCtx = glowCanvas.getContext('2d');

  if (!glowCtx) {
    throw new Error('Failed to get glow canvas context');
  }

  // Clear with transparent black
  glowCtx.clearRect(0, 0, width, height);

  // Draw each fixture's glow
  for (const fixture of fixtures) {
    drawFixtureGlow(glowCtx, fixture, width, height, mergedConfig);
  }

  // Apply slight blur to glow layer for smoother falloff
  glowCtx.filter = 'blur(2px)';
  glowCtx.drawImage(glowCanvas, 0, 0);
  glowCtx.filter = 'none';

  // Composite glow onto base using screen blend
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(glowCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
      'image/jpeg',
      mergedConfig.outputQuality
    );
  });

  const dataUrl = canvas.toDataURL('image/jpeg', mergedConfig.outputQuality);

  return {
    dataUrl,
    blob,
    width,
    height,
    fixtureCount: fixtures.length,
    processingTimeMs: performance.now() - startTime
  };
}

/**
 * Composite with IC-Light output
 * This is the main integration point with the IC-Light pipeline
 */
export async function compositeWithICLight(
  icLightOutputUrl: string,
  fixtureLayout: FixtureLayout,
  config: Partial<CompositeConfig> = {}
): Promise<CompositeResult> {
  return compositeFixtures(icLightOutputUrl, fixtureLayout.fixtures, config);
}

/**
 * Generate a preview of fixture placements on original image
 * Faster/lower quality for real-time preview
 */
export async function generateFixturePreview(
  imageUrl: string,
  fixtures: LightFixture[]
): Promise<string> {
  const result = await compositeFixtures(imageUrl, fixtures, {
    outputQuality: 0.7,
    maxOutputWidth: 800,
    antialiasing: false
  });
  return result.dataUrl;
}

/**
 * Draw fixture position markers (for debugging/visualization)
 */
export async function drawFixtureMarkers(
  imageUrl: string,
  fixtures: LightFixture[]
): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0);

  // Draw markers at each fixture position
  for (const fixture of fixtures) {
    const x = (fixture.x / 100) * img.width;
    const y = (fixture.y / 100) * img.height;
    const color = kelvinToRGB(fixture.colorTemp);
    const preset = getFixturePreset(fixture.type);

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(preset.icon, x, y);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Export service functions
 */
export const CompositeService = {
  compositeFixtures,
  compositeWithICLight,
  generateFixturePreview,
  drawFixtureMarkers,
  loadImage
};

export default CompositeService;
