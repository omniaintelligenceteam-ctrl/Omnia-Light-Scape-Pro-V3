import {
  type MockupFixturePlacement,
  type MarkerLegend,
  validateNormalizedFixturePlacements,
} from './spec';

export interface MarkerOverlayRequest {
  sourceImageBase64: string;
  fixtures: MockupFixturePlacement[];
  markerLegend?: MarkerLegend;
  dotRadiusPx?: number;
  outputDataUri?: boolean;
}

export interface MarkerOverlayResult {
  width: number;
  height: number;
  mimeType: 'image/png';
  base64: string;
  dataUri: string;
}

export interface MarkerPixelPosition {
  id: string;
  type: string;
  xPx: number;
  yPx: number;
}

const DEFAULT_MARKER_LEGEND: MarkerLegend = {
  uplight: { color: '#00AEEF', shape: 'dot' },
  path_light: { color: '#F9D423', shape: 'dot' },
  well_light: { color: '#FF4D4D', shape: 'dot' },
  flood: { color: '#B388FF', shape: 'dot' },
  wall_wash: { color: '#00E676', shape: 'dot' },
  downlight: { color: '#FF9800', shape: 'dot' },
  spot: { color: '#26C6DA', shape: 'dot' },
  bollard: { color: '#C0CA33', shape: 'dot' },
  step_light: { color: '#8D6E63', shape: 'dot' },
  gutter_uplight: { color: '#FFD54F', shape: 'dot' },
  coredrill: { color: '#EC407A', shape: 'dot' },
};

function importAtRuntime(moduleName: string): Promise<any> {
  // Avoid static bundler resolution so this file can live in shared src but run server-side only.
  return new Function('m', 'return import(m)')(moduleName) as Promise<any>;
}

function toImageBuffer(input: string): Buffer {
  const commaIndex = input.indexOf(',');
  const raw = commaIndex >= 0 ? input.slice(commaIndex + 1) : input;
  return Buffer.from(raw, 'base64');
}

function clampDotRadius(value?: number): number {
  const radius = typeof value === 'number' && Number.isFinite(value) ? value : 8;
  return Math.min(10, Math.max(6, Math.round(radius)));
}

export function computeMarkerPixelPositions(
  fixtures: MockupFixturePlacement[],
  width: number,
  height: number
): MarkerPixelPosition[] {
  validateNormalizedFixturePlacements(
    fixtures.map((fixture) => ({ id: fixture.id, xNorm: fixture.xNorm, yNorm: fixture.yNorm }))
  );
  return fixtures.map((fixture) => ({
    id: fixture.id,
    type: fixture.type,
    xPx: fixture.xNorm * width,
    yPx: fixture.yNorm * height,
  }));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildOverlaySvg(
  width: number,
  height: number,
  fixtures: MockupFixturePlacement[],
  markerLegend: MarkerLegend,
  radiusPx: number
): string {
  const circles = fixtures.map((fixture) => {
    const mapped = computeMarkerPixelPositions([fixture], width, height)[0];
    const cx = Number(mapped.xPx.toFixed(3));
    const cy = Number(mapped.yPx.toFixed(3));
    const color = markerLegend[fixture.type]?.color || '#FFFFFF';
    return `<circle cx="${cx}" cy="${cy}" r="${radiusPx}" fill="${escapeXml(color)}" stroke="#000000" stroke-width="1" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${circles}</svg>`;
}

async function renderWithSharp(
  sourceBuffer: Buffer,
  fixtures: MockupFixturePlacement[],
  markerLegend: MarkerLegend,
  radiusPx: number
): Promise<{ width: number; height: number; outputBuffer: Buffer }> {
  const sharpModule = await importAtRuntime('sharp');
  const sharp = sharpModule.default || sharpModule;
  const pipeline = sharp(sourceBuffer);
  const metadata = await pipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('[MockupRenderSpec] Unable to read image dimensions for marker overlay.');
  }

  const overlaySvg = buildOverlaySvg(metadata.width, metadata.height, fixtures, markerLegend, radiusPx);
  const outputBuffer = await pipeline
    .composite([{ input: Buffer.from(overlaySvg) }])
    .png()
    .toBuffer();

  return { width: metadata.width, height: metadata.height, outputBuffer };
}

async function renderWithCanvas(
  sourceBuffer: Buffer,
  fixtures: MockupFixturePlacement[],
  markerLegend: MarkerLegend,
  radiusPx: number
): Promise<{ width: number; height: number; outputBuffer: Buffer }> {
  const canvasModule = await importAtRuntime('canvas');
  const createCanvas = canvasModule.createCanvas as (w: number, h: number) => any;
  const loadImage = canvasModule.loadImage as (src: Buffer) => Promise<any>;

  const image = await loadImage(sourceBuffer);
  const width = image.width as number;
  const height = image.height as number;
  if (!width || !height) {
    throw new Error('[MockupRenderSpec] Unable to read image dimensions for marker overlay.');
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);

  for (const fixture of fixtures) {
    const mapped = computeMarkerPixelPositions([fixture], width, height)[0];
    const x = mapped.xPx;
    const y = mapped.yPx;
    const color = markerLegend[fixture.type]?.color || '#FFFFFF';

    ctx.beginPath();
    ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  }

  const outputBuffer = canvas.toBuffer('image/png');
  return { width, height, outputBuffer };
}

/**
 * Server-side marker overlay generation.
 * Draws fixture dots onto the original image and returns PNG base64.
 */
export async function generateMarkerOverlay(request: MarkerOverlayRequest): Promise<MarkerOverlayResult> {
  if (typeof window !== 'undefined') {
    throw new Error('[MockupRenderSpec] markerOverlay.ts is server-only and cannot run in the browser.');
  }

  validateNormalizedFixturePlacements(
    request.fixtures.map((fixture) => ({
      id: fixture.id,
      xNorm: fixture.xNorm,
      yNorm: fixture.yNorm,
    }))
  );

  const radiusPx = clampDotRadius(request.dotRadiusPx);
  const legend: MarkerLegend = { ...DEFAULT_MARKER_LEGEND, ...(request.markerLegend || {}) };
  const sourceBuffer = toImageBuffer(request.sourceImageBase64);

  let rendered: { width: number; height: number; outputBuffer: Buffer } | null = null;
  let sharpError: unknown;

  try {
    rendered = await renderWithSharp(sourceBuffer, request.fixtures, legend, radiusPx);
  } catch (error) {
    sharpError = error;
  }

  if (!rendered) {
    try {
      rendered = await renderWithCanvas(sourceBuffer, request.fixtures, legend, radiusPx);
    } catch (canvasError) {
      throw new Error(
        `[MockupRenderSpec] Marker overlay generation failed. Install either "sharp" or "canvas". ` +
        `Sharp error: ${String(sharpError)} | Canvas error: ${String(canvasError)}`
      );
    }
  }

  const base64 = rendered.outputBuffer.toString('base64');
  return {
    width: rendered.width,
    height: rendered.height,
    mimeType: 'image/png',
    base64,
    dataUri: `data:image/png;base64,${base64}`,
  };
}
