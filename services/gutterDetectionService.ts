import type { GutterLine } from '../types/fixtures';

const DEFAULT_MAX_LINES = 3;
const SAM_DETECTOR_URL = import.meta.env.VITE_GUTTER_SAM_URL as string | undefined;
const REMOTE_DETECTOR_URL = import.meta.env.VITE_GUTTER_DETECTOR_URL as string | undefined;
const DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT = 0.6;

export interface GutterDetectionResult {
  lines: GutterLine[];
  source: 'sam' | 'remote' | 'heuristic';
}

interface RawGutterLine {
  id?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function makeLineId(prefix: string, index: number): string {
  return `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toPercent(value: number): number {
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function parsePoint(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== 'object') return null;
  const point = value as Record<string, unknown>;
  const x = parseFiniteNumber(point.x);
  const y = parseFiniteNumber(point.y);
  if (x === null || y === null) return null;
  return { x, y };
}

function parseRawLine(value: unknown): RawGutterLine | null {
  if (!value || typeof value !== 'object') return null;
  const line = value as Record<string, unknown>;

  const startX = parseFiniteNumber(line.startX);
  const startY = parseFiniteNumber(line.startY);
  const endX = parseFiniteNumber(line.endX);
  const endY = parseFiniteNumber(line.endY);
  if (startX !== null && startY !== null && endX !== null && endY !== null) {
    return {
      id: typeof line.id === 'string' ? line.id : undefined,
      startX,
      startY,
      endX,
      endY,
    };
  }

  const x1 = parseFiniteNumber(line.x1);
  const y1 = parseFiniteNumber(line.y1);
  const x2 = parseFiniteNumber(line.x2);
  const y2 = parseFiniteNumber(line.y2);
  if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
    return {
      id: typeof line.id === 'string' ? line.id : undefined,
      startX: x1,
      startY: y1,
      endX: x2,
      endY: y2,
    };
  }

  const startPoint = parsePoint(line.start);
  const endPoint = parsePoint(line.end);
  if (startPoint && endPoint) {
    return {
      id: typeof line.id === 'string' ? line.id : undefined,
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
    };
  }

  if (Array.isArray(line.points) && line.points.length >= 2) {
    const first = parsePoint(line.points[0]);
    const last = parsePoint(line.points[line.points.length - 1]);
    if (first && last) {
      return {
        id: typeof line.id === 'string' ? line.id : undefined,
        startX: first.x,
        startY: first.y,
        endX: last.x,
        endY: last.y,
      };
    }
  }

  return null;
}

function extractRawLines(payload: unknown): RawGutterLine[] {
  if (!payload) return [];

  const candidates: unknown[] = [];
  if (Array.isArray(payload)) {
    candidates.push(...payload);
  } else if (typeof payload === 'object') {
    const typed = payload as Record<string, unknown>;
    if (Array.isArray(typed.lines)) candidates.push(...typed.lines);
    if (Array.isArray(typed.gutterLines)) candidates.push(...typed.gutterLines);
    if (Array.isArray(typed.segments)) candidates.push(...typed.segments);
    if (Array.isArray(typed.results)) candidates.push(...typed.results);
  }

  return candidates
    .map(parseRawLine)
    .filter((line): line is RawGutterLine => !!line);
}

function normalizeLines(lines: RawGutterLine[], prefix: string, maxLines: number): GutterLine[] {
  return lines
    .slice(0, maxLines)
    .map((line, index) => ({
      id: line.id || makeLineId(prefix, index),
      startX: clampPercent(toPercent(line.startX)),
      startY: clampPercent(toPercent(line.startY)),
      endX: clampPercent(toPercent(line.endX)),
      endY: clampPercent(toPercent(line.endY)),
      mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
    }))
    .filter(line => {
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      return Math.sqrt(dx * dx + dy * dy) >= 5;
    });
}

async function dataUrlFromImageSrc(imageSrc: string): Promise<{ base64: string; mimeType: string }> {
  if (imageSrc.startsWith('data:')) {
    const match = imageSrc.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid data URL for image source');
    }
    return { mimeType: match[1], base64: match[2] };
  }

  const response = await fetch(imageSrc);
  if (!response.ok) {
    throw new Error(`Failed to load image source (${response.status})`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Failed converting image to base64'));
    reader.readAsDataURL(blob);
  });

  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error('Converted data URL is invalid');
  }

  return { mimeType: match[1], base64: match[2] };
}

async function detectWithRemoteModel(
  imageBase64: string,
  mimeType: string,
  maxLines: number
): Promise<GutterLine[]> {
  if (!REMOTE_DETECTOR_URL) return [];

  const response = await fetch(REMOTE_DETECTOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      maxLines,
      feature: 'gutter_lines',
    }),
  });

  if (!response.ok) {
    throw new Error(`Remote gutter detector failed (${response.status})`);
  }

  const payload = await response.json();
  const rawLines = extractRawLines(payload);
  if (rawLines.length === 0) {
    return [];
  }

  return normalizeLines(rawLines, 'gutter_remote', maxLines);
}

async function detectWithSamModel(
  imageBase64: string,
  mimeType: string,
  maxLines: number
): Promise<GutterLine[]> {
  if (!SAM_DETECTOR_URL) return [];

  const response = await fetch(SAM_DETECTOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      maxLines,
      feature: 'gutter_lines',
      detector: 'sam',
    }),
  });

  if (!response.ok) {
    throw new Error(`SAM gutter detector failed (${response.status})`);
  }

  const payload = await response.json();
  const rawLines = extractRawLines(payload);
  if (rawLines.length === 0) return [];

  return normalizeLines(rawLines, 'gutter_sam', maxLines);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image for heuristic gutter detection'));
    img.src = src;
  });
}

function detectWithHeuristic(
  imageData: ImageData,
  maxLines: number
): GutterLine[] {
  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const gray = new Float32Array(pixelCount);

  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    gray[i] = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
  }

  const rowScores = new Float32Array(height);
  for (let y = 1; y < height; y++) {
    let rowSum = 0;
    const rowOffset = y * width;
    const prevOffset = (y - 1) * width;
    for (let x = 0; x < width; x++) {
      rowSum += Math.abs(gray[rowOffset + x] - gray[prevOffset + x]);
    }
    rowScores[y] = rowSum / width;
  }

  const smoothed = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let count = 0;
    for (let dy = -3; dy <= 3; dy++) {
      const yy = y + dy;
      if (yy >= 0 && yy < height) {
        sum += rowScores[yy];
        count++;
      }
    }
    smoothed[y] = count > 0 ? sum / count : rowScores[y];
  }

  const minY = Math.floor(height * 0.08);
  const maxY = Math.floor(height * 0.55);
  const candidates: Array<{ y: number; score: number }> = [];
  for (let y = minY + 1; y < maxY - 1; y++) {
    if (smoothed[y] >= smoothed[y - 1] && smoothed[y] >= smoothed[y + 1]) {
      candidates.push({ y, score: smoothed[y] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const selectedRows: number[] = [];
  const minRowSpacing = Math.max(12, Math.floor(height * 0.06));
  for (const c of candidates) {
    if (selectedRows.length >= maxLines) break;
    if (selectedRows.every(y => Math.abs(y - c.y) >= minRowSpacing)) {
      selectedRows.push(c.y);
    }
  }

  if (selectedRows.length === 0) {
    selectedRows.push(Math.floor(height * 0.35));
  }

  const lines: GutterLine[] = [];
  selectedRows.forEach((y, index) => {
    let mean = 0;
    for (let x = 0; x < width; x++) {
      const a = gray[y * width + x];
      const b = gray[Math.max(0, y - 1) * width + x];
      mean += Math.abs(a - b);
    }
    mean /= width;

    let variance = 0;
    for (let x = 0; x < width; x++) {
      const a = gray[y * width + x];
      const b = gray[Math.max(0, y - 1) * width + x];
      const d = Math.abs(a - b) - mean;
      variance += d * d;
    }
    const stdDev = Math.sqrt(variance / Math.max(1, width - 1));
    const threshold = mean + stdDev * 0.5;

    let firstX = -1;
    let lastX = -1;
    for (let x = 0; x < width; x++) {
      const a = gray[y * width + x];
      const b = gray[Math.max(0, y - 1) * width + x];
      if (Math.abs(a - b) >= threshold) {
        if (firstX === -1) firstX = x;
        lastX = x;
      }
    }

    if (firstX === -1 || lastX === -1 || (lastX - firstX) < width * 0.25) {
      firstX = Math.floor(width * 0.1);
      lastX = Math.floor(width * 0.9);
    } else {
      firstX = Math.max(0, firstX - Math.floor(width * 0.03));
      lastX = Math.min(width - 1, lastX + Math.floor(width * 0.03));
    }

    lines.push({
      id: makeLineId('gutter_heuristic', index),
      startX: clampPercent((firstX / width) * 100),
      startY: clampPercent((y / height) * 100),
      endX: clampPercent((lastX / width) * 100),
      endY: clampPercent((y / height) * 100),
      mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
    });
  });

  return lines.slice(0, maxLines);
}

async function detectWithHeuristicFromImage(imageSrc: string, maxLines: number): Promise<GutterLine[]> {
  const img = await loadImage(imageSrc);
  const maxDim = 1024;
  let width = img.width;
  let height = img.height;
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas for gutter detection');
  }
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  return detectWithHeuristic(imageData, maxLines);
}

export async function suggestGutterLines(
  imageSrc: string,
  maxLines: number = DEFAULT_MAX_LINES
): Promise<GutterDetectionResult> {
  const boundedMaxLines = Math.max(1, Math.min(10, maxLines));

  if (SAM_DETECTOR_URL) {
    try {
      const { base64, mimeType } = await dataUrlFromImageSrc(imageSrc);
      const samLines = await detectWithSamModel(base64, mimeType, boundedMaxLines);
      if (samLines.length > 0) {
        return { lines: samLines, source: 'sam' };
      }
    } catch (error) {
      console.warn('[GutterDetection] SAM detector failed, falling back to remote/heuristic detection:', error);
    }
  }

  if (REMOTE_DETECTOR_URL) {
    try {
      const { base64, mimeType } = await dataUrlFromImageSrc(imageSrc);
      const remoteLines = await detectWithRemoteModel(base64, mimeType, boundedMaxLines);
      if (remoteLines.length > 0) {
        return { lines: remoteLines, source: 'remote' };
      }
    } catch (error) {
      console.warn('[GutterDetection] Remote detector failed, falling back to heuristic detection:', error);
    }
  }

  const heuristicLines = await detectWithHeuristicFromImage(imageSrc, boundedMaxLines);
  return { lines: heuristicLines, source: 'heuristic' };
}
