
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, ThinkingLevel } from "@google/genai";
import type { UserPreferences, PropertyAnalysis, SpatialMap, SpatialFixturePlacement } from "../types";
// FixtureType and SystemPromptConfig imports removed (used by deleted Stages 2-4)
import {
  LIGHTING_APPROACH_BY_STYLE,
  SPACING_BY_FACADE_WIDTH,
  BEAM_ANGLE_BY_MATERIAL,
  INTENSITY_BY_WALL_HEIGHT,
  FEATURE_LIGHTING_GUIDELINES,
  ENHANCED_ANALYSIS_SYSTEM_PROMPT,
  FIXTURE_TYPES,
  SYSTEM_PROMPT,
  DEEP_THINK_SYSTEM_PROMPT,
  type ArchitecturalStyleType,
  type FacadeWidthType
} from "../constants";
import type { EnhancedHouseAnalysis, SuggestedFixture } from "../src/types/houseAnalysis";
import {
  drawFixtureMarkers,
  CLEAN_MODEL_MARKER_OPTIONS,
  renderFixtureGlows,
  type GlowRenderOptions
} from "./canvasNightService";
import { buildReferenceParts } from "./referenceLibrary";
import { paintLightGradients, CLEAN_MODEL_GUIDE_OPTIONS } from "./lightGradientPainter";
import type { LightFixture, GutterLine } from "../types/fixtures";
import { rotationToDirectionLabel, hasCustomRotation } from "../utils/fixtureConverter";
import { suggestGutterLines } from "./gutterDetectionService";

// The prompt specifically asks for "Gemini 3 Pro" (Nano Banana Pro 2), which maps to 'gemini-3-pro-image-preview'.
const MODEL_NAME = 'gemini-3-pro-image-preview';

// Timeout for API calls (2 minutes)
const API_TIMEOUT_MS = 120000;
const MAX_PHOTOREAL_RETRY_ATTEMPTS = 2;
const PHOTOREAL_MIN_SCORE = 85;
const MAX_ARTIFACT_RETRY_ATTEMPTS = 1;
const ANNOTATION_ARTIFACT_MAX_SCORE = 8;
const MAX_AUTO_GUTTER_LINES = 3;
const AUTO_PLACEMENT_CONFIDENCE_MIN_SCORE = 85;
const MODEL_GUIDE_DEBUG = String(import.meta.env.VITE_MODEL_GUIDE_DEBUG || '').toLowerCase() === 'true';
const DEFAULT_INITIAL_CANDIDATE_COUNT = 2;
const MAX_INITIAL_CANDIDATE_COUNT = 3;
const DEFAULT_MANUAL_HYBRID_INITIAL_CANDIDATE_COUNT = 1;
const MANUAL_HYBRID_INITIAL_CANDIDATE_COUNT = (() => {
  const raw = Number(import.meta.env.VITE_MANUAL_HYBRID_INITIAL_CANDIDATE_COUNT);
  if (!Number.isFinite(raw)) return DEFAULT_MANUAL_HYBRID_INITIAL_CANDIDATE_COUNT;
  return Math.max(1, Math.min(MAX_INITIAL_CANDIDATE_COUNT, Math.round(raw)));
})();
const MANUAL_HYBRID_SEED_ENABLED = String(import.meta.env.VITE_MANUAL_HYBRID_SEED_ENABLED || 'true').toLowerCase() !== 'false';
const INITIAL_CANDIDATE_COUNT = (() => {
  const raw = Number(import.meta.env.VITE_INITIAL_CANDIDATE_COUNT);
  if (!Number.isFinite(raw)) return DEFAULT_INITIAL_CANDIDATE_COUNT;
  return Math.max(1, Math.min(MAX_INITIAL_CANDIDATE_COUNT, Math.round(raw)));
})();

// Non-selected fixture types, including soffit, are explicitly forbidden in prompt assembly.

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP THINK OUTPUT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

interface DeepThinkOutput {
  prompt: string;
  fixtureCount?: number;
  fixtureBreakdown?: Record<string, number>;
  analysisNotes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE INTENSITY / BEAM ANGLE DESCRIPTIONS (used by Deep Think input)
// ═══════════════════════════════════════════════════════════════════════════════

function getIntensityDescription(val: number): string {
  if (val < 25) return `LIGHTING INTENSITY: SUBTLE (2-3W LED equivalent, 150-300 lumens)
- Faint accent glow, light barely reaches first story roofline (8-10 ft max)
- Soft, gentle pools with gradual falloff, extremely soft beam edges
- Brightness at 2ft: 100%, at 4ft: 25%, at 8ft: 6% (barely visible)
- Best for: Ambient mood, pathway marking, subtle accent`;

  if (val < 50) return `LIGHTING INTENSITY: MODERATE (4-5W LED equivalent, 300-500 lumens)
- Standard 1st story reach (8-12 ft walls), comfortably reaches roofline
- Visible wall grazing that reveals texture WITHOUT hot spots
- Brightness at 2ft: 100%, at 4ft: 25%, at 8ft: 6%, at 12ft: 3% (still visible)
- Sufficient to show brick mortar joints, siding shadow lines
- Best for: Single-story homes, accent features, balanced residential lighting`;

  if (val < 75) return `LIGHTING INTENSITY: BRIGHT (6-8W LED equivalent, 500-800 lumens)
- 2nd story reach (18-25 ft walls), strong wall grazing full wall height
- More pronounced beam visibility, subtle atmospheric effect near fixture
- Brightness at 2ft: 100%, at 6ft: 11%, at 12ft: 3%, at 20ft: 1% (still visible)
- Strong shadows in brick/stone mortar joints, dramatic siding shadow lines
- Best for: Two-story facades, tall trees, dramatic accent lighting`;

  return `LIGHTING INTENSITY: HIGH POWER (10-15W LED equivalent, 800-1500 lumens)
- Full 2-3 story reach (25+ ft walls), intense beams reaching tall walls and gable peaks
- Maximum wall coverage with strong definition, pronounced atmospheric scatter
- Brightness at 2ft: 100%, at 8ft: 6%, at 16ft: 1.5%, at 25ft: 0.6%
- Maximum shadow definition, deep mortar joint shadows, dramatic texture grazing
- Best for: Tall facades, commercial properties, dramatic architectural statements`;
}

function getBeamAngleDescription(angle: number): string {
  if (angle <= 15) return `BEAM ANGLE: 15° (NARROW SPOT) — MAXIMUM DRAMA
- Tight focused beams, spread: ~2.6ft at 10ft, ~5.2ft at 20ft
- Ideal for revealing surface texture, deep mortar joint shadows
- Creates VISIBLE DARK GAPS between fixtures — the professional look
- Best for: Columns, narrow wall sections, focal points`;

  if (angle <= 30) return `BEAM ANGLE: 30° (SPOT) — PROFESSIONAL STANDARD
- Defined beam with moderate spread: ~5.4ft at 10ft, ~10.8ft at 20ft
- Excellent balance of texture revelation and coverage
- Creates visible separation between fixture illumination zones
- Best for: Facade accent lighting, medium trees, general professional use`;

  if (angle >= 60) return `BEAM ANGLE: 60° (WIDE FLOOD) — AREA COVERAGE
- Broad even wash: ~11.5ft at 10ft, ~23ft at 20ft
- Very soft edges, no distinct beam boundary
- WARNING: Reduced texture revelation, can create flat uniform appearance
- Best for: Large blank facades, area lighting where drama is NOT the goal`;

  return `BEAM ANGLE: 45° (FLOOD) — BALANCED COVERAGE
- Standard professional spread: ~8.3ft at 10ft, ~16.6ft at 20ft
- Moderate texture revelation, soft but discernible beam shape
- May require closer spacing to maintain dark gaps
- Best for: General facade lighting, medium wall areas`;
}

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

/**
 * Retry helper with exponential backoff
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param initialDelayMs - Initial delay in ms before first retry (default: 2000)
 * @returns Result of the function if successful
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      const isRetryable = isTimeout || (error instanceof Error && (
        error.message.includes('503') ||
        error.message.includes('429') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('network')
      ));

      if (attempt < maxAttempts && isRetryable) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

interface PhotorealismVerificationResult {
  passed: boolean;
  score: number;
  details: string;
  issues: string[];
}

interface AnnotationArtifactVerificationResult {
  passed: boolean;
  score: number;
  details: string;
  issues: string[];
}

interface HeuristicPhotorealismResult {
  passed: boolean;
  score: number;
  details: string;
  issues: string[];
}

export interface PlacementVerificationResult {
  verified: boolean;
  confidence: number;
  details: string;
  gutterVerified: boolean;
  unexpectedTypes: string[];
}

export interface GenerationCandidateEvaluation {
  result: string;
  placementVerification: PlacementVerificationResult;
  artifactCheck: AnnotationArtifactVerificationResult;
  photorealCheck: PhotorealismVerificationResult;
  heuristicPhotorealCheck: HeuristicPhotorealismResult;
  photorealPassed: boolean;
  photorealCompositeScore: number;
  compositeScore: number;
}

function extractBase64Data(imageOrDataUri: string): string {
  const commaIndex = imageOrDataUri.indexOf(',');
  return commaIndex >= 0 ? imageOrDataUri.slice(commaIndex + 1) : imageOrDataUri;
}

function extractMimeType(imageOrDataUri: string, fallback: string): string {
  if (!imageOrDataUri.startsWith('data:')) return fallback;
  const mimeMatch = imageOrDataUri.match(/^data:(.*?);base64,/);
  return mimeMatch?.[1] || fallback;
}

function buildPhotorealismLockAddendum(): string {
  return `

=== PHOTOREALISM LOCK (NON-NEGOTIABLE) ===
- Sky must be true black (#000000 to #0A0A0A) with ONE realistic full moon.
- Preserve natural inverse-square falloff (brightest mid-wall, not at fixture base).
- Use conical beams with soft feathered edges (no hard geometric light shapes).
- Maintain visible dark gaps between adjacent fixtures (no uniform wall wash).
- Preserve architecture/materials pixel-accurately; no invented structures or fake texture.
- Keep warm amber residential tone (2700K-3000K) unless explicitly overridden by user.
- NEVER render text, numbers, coordinates, labels, crosshairs, arrows, UI badges, or debug overlays.
- Marker/guide annotations from reference images are placement guides only and must be invisible in final output.
- If any requirement conflicts, prioritize photorealism and physical light behavior.
`;
}

function buildPhotorealismCorrectionPrompt(
  basePrompt: string,
  issues: string[]
): string {
  const issueList = issues.length > 0
    ? issues.map((issue, idx) => `${idx + 1}. ${issue}`).join('\n')
    : '1. Output looked synthetic/flat and lacked realistic light behavior.';

  return `${basePrompt}

=== PHOTOREALISM CORRECTION PASS ===
The previous output failed realism checks. Correct ONLY the lighting realism while preserving placement/count.
Address these issues:
${issueList}

MANDATORY FIXES:
- Restore deep black sky with one realistic moon only.
- Reintroduce conical beams, feathered edges, and inverse-square falloff.
- Reinstate dark gaps between fixtures; avoid flat/uniform washes.
- Preserve original architecture and material texture fidelity.
- Keep warm residential amber tone.
- Remove any visible text, numbers, marker glyphs, guide lines, or UI overlays.
`;
}

function buildArtifactCorrectionPrompt(
  basePrompt: string,
  issues: string[]
): string {
  const issueList = issues.length > 0
    ? issues.map((issue, idx) => `${idx + 1}. ${issue}`).join('\n')
    : '1. Visible text/UI annotation artifacts are present in the generated image.';

  return `${basePrompt}

=== ARTIFACT CLEANUP PASS (MANDATORY) ===
The previous output contains annotation artifacts. Remove them completely while preserving fixture placement/count.
Address these issues:
${issueList}

MANDATORY FIXES:
- Remove all visible text, numbers, coordinates, labels, badges, or symbols.
- Remove marker circles, crosshairs, gutter line graphics, and guidance arrows.
- Keep every fixture source at its exact required mount/ground coordinate.
- Preserve architecture, framing, and photorealistic light behavior.
`;
}

async function verifyPhotorealism(
  generatedImageBase64: string,
  imageMimeType: string
): Promise<PhotorealismVerificationResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Evaluate this nighttime architectural lighting image for PHOTOREALISM.

Score realism from 0-100 using this checklist:
1) Sky is pure black (#000000 to #0A0A0A) with one realistic full moon
2) Warm amber residential lighting (2700K-3000K feel)
3) Inverse-square falloff (no base hot-spot dominance, natural attenuation)
4) Distinct dark gaps between fixture pools (not uniform wall wash)
5) Soft feathered beam edges + conical spread (not geometric/hard-edged beams)
6) Original architecture/materials preserved and believable texture revelation

Respond in exact JSON (no markdown):
{"score": <0-100>, "passed": <true|false>, "issues": ["<issue1>", "<issue2>"]}`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: generatedImageBase64, mimeType: imageMimeType } },
          { text: prompt },
        ],
      },
      config: { temperature: 0.1 },
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        passed: false,
        score: 0,
        details: 'Photoreal verification parse failed.',
        issues: ['Unable to parse photorealism analysis response.'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      score?: number;
      passed?: boolean;
      issues?: string[];
    };
    const score = typeof parsed.score === 'number' ? parsed.score : 0;
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const passed = parsed.passed === true || (score >= PHOTOREAL_MIN_SCORE && issues.length === 0);
    const details = `Photoreal score ${score}/100. ${issues.length > 0 ? `Issues: ${issues.join(' | ')}` : 'No major realism issues detected.'}`;
    return { passed, score, details, issues };
  } catch (error) {
    return {
      passed: false,
      score: 0,
      details: `Photoreal verification error: ${error}`,
      issues: ['Verification service error.'],
    };
  }
}

function percentileFromHistogram(hist: Uint32Array, total: number, percentile: number): number {
  if (total <= 0) return 0;
  const target = Math.max(0, Math.min(total - 1, Math.floor(percentile * (total - 1))));
  let running = 0;
  for (let i = 0; i < hist.length; i++) {
    running += hist[i];
    if (running > target) return i;
  }
  return hist.length - 1;
}

async function verifyPhotorealismHeuristic(
  generatedImageBase64: string,
  imageMimeType: string
): Promise<HeuristicPhotorealismResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 640;
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            passed: false,
            score: 0,
            details: 'Heuristic photorealism failed: no canvas context.',
            issues: ['Heuristic photorealism check failed to initialize canvas.'],
          });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const totalPixels = w * h;
        if (totalPixels <= 0) {
          resolve({
            passed: false,
            score: 0,
            details: 'Heuristic photorealism failed: empty image.',
            issues: ['Heuristic photorealism check received empty image data.'],
          });
          return;
        }

        const overallHist = new Uint32Array(256);
        const skyHist = new Uint32Array(256);
        const facadeHist = new Uint32Array(256);
        let skyCount = 0;
        let facadeCount = 0;
        let darkPixels = 0;
        let highlightPixels = 0;
        let clippedPixels = 0;

        const skyMaxY = Math.max(1, Math.floor(h * 0.18));
        const facadeMinY = Math.floor(h * 0.24);
        const facadeMaxY = Math.floor(h * 0.82);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const luminance = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));

            overallHist[luminance]++;
            if (luminance < 40) darkPixels++;
            if (luminance > 220) highlightPixels++;
            if (luminance > 245) clippedPixels++;

            if (y <= skyMaxY) {
              skyHist[luminance]++;
              skyCount++;
            }
            if (y >= facadeMinY && y <= facadeMaxY) {
              facadeHist[luminance]++;
              facadeCount++;
            }
          }
        }

        const p05 = percentileFromHistogram(overallHist, totalPixels, 0.05);
        const p10 = percentileFromHistogram(overallHist, totalPixels, 0.10);
        const p90 = percentileFromHistogram(overallHist, totalPixels, 0.90);
        const p95 = percentileFromHistogram(overallHist, totalPixels, 0.95);
        const dynamicRange = p95 - p10;

        const skyMedian = percentileFromHistogram(skyHist, skyCount, 0.50);
        const skyP90 = percentileFromHistogram(skyHist, skyCount, 0.90);
        const facadeP25 = percentileFromHistogram(facadeHist, facadeCount, 0.25);
        const facadeP75 = percentileFromHistogram(facadeHist, facadeCount, 0.75);
        const facadeSpread = facadeP75 - facadeP25;

        const darkRatio = darkPixels / totalPixels;
        const highlightRatio = highlightPixels / totalPixels;
        const clippedRatio = clippedPixels / totalPixels;

        const issues: string[] = [];
        let score = 100;

        if (skyMedian > 24) {
          const penalty = Math.min(28, (skyMedian - 24) * 1.8);
          score -= penalty;
          issues.push(`Sky luminance too bright (median ${skyMedian}).`);
        }
        if (skyP90 > 70) {
          const penalty = Math.min(16, (skyP90 - 70) * 0.7);
          score -= penalty;
          issues.push(`Sky upper luminance too high (p90 ${skyP90}).`);
        }
        if (darkRatio < 0.38) {
          const penalty = Math.min(18, (0.38 - darkRatio) * 120);
          score -= penalty;
          issues.push(`Insufficient deep-shadow coverage (${(darkRatio * 100).toFixed(1)}%).`);
        }
        if (highlightRatio > 0.12) {
          const penalty = Math.min(16, (highlightRatio - 0.12) * 140);
          score -= penalty;
          issues.push(`Too much bright area (${(highlightRatio * 100).toFixed(1)}%).`);
        }
        if (clippedRatio > 0.015) {
          const penalty = Math.min(12, (clippedRatio - 0.015) * 350);
          score -= penalty;
          issues.push(`Highlight clipping detected (${(clippedRatio * 100).toFixed(2)}%).`);
        }
        if (dynamicRange < 50) {
          const penalty = Math.min(14, (50 - dynamicRange) * 0.5);
          score -= penalty;
          issues.push(`Global contrast too flat (range ${dynamicRange}).`);
        }
        if (facadeSpread < 18 && facadeP75 > 42) {
          const penalty = Math.min(12, (18 - facadeSpread) * 0.6);
          score -= penalty;
          issues.push(`Facade lighting appears too uniform (IQR ${facadeSpread}).`);
        }

        score = Math.max(0, Math.min(100, Math.round(score)));
        const passed = score >= 82;
        const details =
          `Heuristic photoreal score ${score}/100. Luma p05/p90: ${p05}/${p90}. Sky median/p90: ${skyMedian}/${skyP90}. ` +
          `Dark ratio ${(darkRatio * 100).toFixed(1)}%, highlights ${(highlightRatio * 100).toFixed(1)}%, ` +
          `dynamic range ${dynamicRange}.`;

        resolve({ passed, score, details, issues });
      } catch (error) {
        resolve({
          passed: false,
          score: 0,
          details: `Heuristic photorealism error: ${error}`,
          issues: ['Heuristic photorealism check failed unexpectedly.'],
        });
      }
    };

    img.onerror = () => {
      resolve({
        passed: false,
        score: 0,
        details: 'Heuristic photorealism failed to decode image.',
        issues: ['Heuristic photorealism check could not decode generated image.'],
      });
    };

    img.src = `data:${imageMimeType};base64,${generatedImageBase64}`;
  });
}

async function verifyAnnotationArtifacts(
  generatedImageBase64: string,
  imageMimeType: string
): Promise<AnnotationArtifactVerificationResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Check this nighttime architectural lighting image for visible annotation artifacts.

Artifacts to detect:
1) Text/words, numbers, coordinate labels, or marker IDs
2) Crosshairs, circles, arrows, dashed guide lines, UI badges
3) Any overlay graphics that look like design-tool markup/debug output

Return exact JSON (no markdown):
{"artifactScore": <0-100>, "passed": <true|false>, "issues": ["<issue1>", "<issue2>"]}`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: generatedImageBase64, mimeType: imageMimeType } },
          { text: prompt },
        ],
      },
      config: { temperature: 0.1 },
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        passed: false,
        score: 100,
        details: 'Artifact verification parse failed.',
        issues: ['Unable to parse annotation artifact analysis response.'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      artifactScore?: number;
      score?: number;
      passed?: boolean;
      issues?: string[];
    };
    const score = typeof parsed.artifactScore === 'number'
      ? parsed.artifactScore
      : (typeof parsed.score === 'number' ? parsed.score : 100);
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const passedByThreshold = score <= ANNOTATION_ARTIFACT_MAX_SCORE && issues.length === 0;
    const passed = typeof parsed.passed === 'boolean'
      ? (parsed.passed && score <= ANNOTATION_ARTIFACT_MAX_SCORE)
      : passedByThreshold;
    const details = `Annotation artifact score ${score}/100 (lower is better). ${issues.length > 0 ? `Issues: ${issues.join(' | ')}` : 'No visible annotation artifacts detected.'}`;
    return { passed, score, details, issues };
  } catch (error) {
    return {
      passed: false,
      score: 100,
      details: `Artifact verification error: ${error}`,
      issues: ['Verification service error.'],
    };
  }
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function createSkippedPlacementVerification(details: string): PlacementVerificationResult {
  return {
    verified: true,
    confidence: 100,
    details,
    gutterVerified: true,
    unexpectedTypes: [],
  };
}

function hasForbiddenTypeViolations(placementVerification: PlacementVerificationResult): boolean {
  return placementVerification.unexpectedTypes.length > 0;
}

function shouldAcceptPlacementRetryCandidate(
  current: PlacementVerificationResult,
  next: PlacementVerificationResult
): boolean {
  if (current.unexpectedTypes.length === 0 && next.unexpectedTypes.length > 0) {
    return false;
  }

  if (next.verified) return true;
  if (next.unexpectedTypes.length < current.unexpectedTypes.length) return true;
  if (next.unexpectedTypes.length > current.unexpectedTypes.length) return false;
  return next.confidence >= current.confidence;
}

function isPlacementNotWorse(
  current: PlacementVerificationResult,
  next: PlacementVerificationResult,
  placementVerificationEnabled: boolean
): boolean {
  if (!placementVerificationEnabled) return true;
  if (current.unexpectedTypes.length === 0 && next.unexpectedTypes.length > 0) return false;
  return next.verified || next.unexpectedTypes.length <= current.unexpectedTypes.length;
}

function getPlacementQualityScore(
  placementVerification: PlacementVerificationResult,
  placementVerificationEnabled: boolean
): number {
  if (!placementVerificationEnabled) return 100;

  let score = placementVerification.confidence;
  if (placementVerification.verified) {
    score = Math.max(score, 88);
  } else {
    score -= 12;
  }
  if (!placementVerification.gutterVerified) {
    score -= 20;
  }
  score -= placementVerification.unexpectedTypes.length * 10;
  if (hasForbiddenTypeViolations(placementVerification)) {
    score -= 55;
  }
  return clampScore(score);
}

function computeCandidateCompositeScore(
  placementVerification: PlacementVerificationResult,
  placementVerificationEnabled: boolean,
  artifactCheck: AnnotationArtifactVerificationResult,
  photorealCheck: PhotorealismVerificationResult,
  heuristicPhotorealCheck: HeuristicPhotorealismResult
): { compositeScore: number; photorealCompositeScore: number; photorealPassed: boolean } {
  const photorealCompositeScore = photorealCheck.score * 0.7 + heuristicPhotorealCheck.score * 0.3;
  const photorealPassed = photorealCheck.passed && heuristicPhotorealCheck.passed;
  const artifactQualityScore = clampScore(100 - artifactCheck.score);
  const placementQualityScore = getPlacementQualityScore(placementVerification, placementVerificationEnabled);

  const baseScore = placementVerificationEnabled
    ? placementQualityScore * 0.50 + photorealCompositeScore * 0.35 + artifactQualityScore * 0.15
    : photorealCompositeScore * 0.72 + artifactQualityScore * 0.28;

  let adjusted = baseScore;
  if (placementVerificationEnabled && !placementVerification.verified) adjusted -= 10;
  if (placementVerificationEnabled && hasForbiddenTypeViolations(placementVerification)) adjusted -= 35;
  if (!artifactCheck.passed) adjusted -= 8;
  if (!photorealPassed) adjusted -= 10;

  return {
    compositeScore: clampScore(adjusted),
    photorealCompositeScore: clampScore(photorealCompositeScore),
    photorealPassed,
  };
}

function pickBestGenerationCandidate(candidates: GenerationCandidateEvaluation[]): GenerationCandidateEvaluation {
  return candidates.reduce((best, candidate) => {
    const candidateHasForbidden = hasForbiddenTypeViolations(candidate.placementVerification);
    const bestHasForbidden = hasForbiddenTypeViolations(best.placementVerification);
    if (candidateHasForbidden !== bestHasForbidden) {
      return candidateHasForbidden ? best : candidate;
    }

    const epsilon = 0.05;
    if (candidate.compositeScore > best.compositeScore + epsilon) return candidate;
    if (candidate.compositeScore + epsilon < best.compositeScore) return best;

    if (candidate.placementVerification.verified !== best.placementVerification.verified) {
      return candidate.placementVerification.verified ? candidate : best;
    }
    if (candidate.artifactCheck.passed !== best.artifactCheck.passed) {
      return candidate.artifactCheck.passed ? candidate : best;
    }
    if (candidate.artifactCheck.score !== best.artifactCheck.score) {
      return candidate.artifactCheck.score < best.artifactCheck.score ? candidate : best;
    }
    return candidate.photorealCompositeScore >= best.photorealCompositeScore ? candidate : best;
  });
}

async function evaluateGenerationCandidate(
  generatedImageDataUri: string,
  imageMimeType: string,
  expectedPlacements: SpatialFixturePlacement[],
  placementVerificationEnabled: boolean,
  gutterLines?: GutterLine[],
  skippedPlacementDetails?: string
): Promise<GenerationCandidateEvaluation> {
  const generatedBase64 = extractBase64Data(generatedImageDataUri);
  const placementPromise: Promise<PlacementVerificationResult> = placementVerificationEnabled
    ? verifyGeneratedImage(generatedImageDataUri, imageMimeType, expectedPlacements, gutterLines)
    : Promise.resolve(
      createSkippedPlacementVerification(
        skippedPlacementDetails || 'Placement verification skipped (no spatial constraints).'
      )
    );

  const [placementVerification, artifactCheck, photorealCheck, heuristicPhotorealCheck] = await Promise.all([
    placementPromise,
    verifyAnnotationArtifacts(generatedBase64, imageMimeType),
    verifyPhotorealism(generatedBase64, imageMimeType),
    verifyPhotorealismHeuristic(generatedBase64, imageMimeType),
  ]);

  const score = computeCandidateCompositeScore(
    placementVerification,
    placementVerificationEnabled,
    artifactCheck,
    photorealCheck,
    heuristicPhotorealCheck
  );

  return {
    result: generatedImageDataUri,
    placementVerification,
    artifactCheck,
    photorealCheck,
    heuristicPhotorealCheck,
    photorealPassed: score.photorealPassed,
    photorealCompositeScore: score.photorealCompositeScore,
    compositeScore: score.compositeScore,
  };
}

export async function evaluateGeneratedLightingOutput(
  generatedImageDataUri: string,
  imageMimeType: string,
  expectedPlacements: SpatialFixturePlacement[] = [],
  options?: {
    placementVerificationEnabled?: boolean;
    gutterLines?: GutterLine[];
    placementSkipDetails?: string;
  }
): Promise<GenerationCandidateEvaluation> {
  const placementVerificationEnabled =
    typeof options?.placementVerificationEnabled === 'boolean'
      ? options.placementVerificationEnabled
      : expectedPlacements.length > 0;

  return evaluateGenerationCandidate(
    generatedImageDataUri,
    imageMimeType,
    expectedPlacements,
    placementVerificationEnabled,
    options?.gutterLines,
    options?.placementSkipDetails
  );
}

async function generateAndRankInitialCandidates(
  modeLabel: string,
  candidateCount: number,
  generateCandidate: () => Promise<string>,
  evaluateCandidate: (generatedImageDataUri: string, candidateIndex: number) => Promise<GenerationCandidateEvaluation>
): Promise<GenerationCandidateEvaluation> {
  const boundedCount = Math.max(1, Math.min(MAX_INITIAL_CANDIDATE_COUNT, candidateCount));
  const candidates: GenerationCandidateEvaluation[] = [];

  for (let i = 0; i < boundedCount; i++) {
    const index = i + 1;
    console.log(`[${modeLabel}] Generating candidate ${index}/${boundedCount}...`);
    const generatedImageDataUri = await generateCandidate();
    const evaluated = await evaluateCandidate(generatedImageDataUri, index);
    candidates.push(evaluated);
    console.log(
      `[${modeLabel}] Candidate ${index}: composite ${evaluated.compositeScore.toFixed(1)} | placement ${evaluated.placementVerification.confidence.toFixed(1)} | artifacts ${evaluated.artifactCheck.score.toFixed(1)} | photoreal ${evaluated.photorealCompositeScore.toFixed(1)}`
    );
  }

  const best = pickBestGenerationCandidate(candidates);
  if (candidates.length > 1) {
    const selectedIndex = candidates.indexOf(best) + 1;
    console.log(
      `[${modeLabel}] Selected candidate ${selectedIndex}/${candidates.length} (composite ${best.compositeScore.toFixed(1)}).`
    );
  }

  return best;
}

/**
 * Builds a preference context section for the AI prompt
 * This helps the AI maintain consistency with the user's preferred style
 * while still generating unique designs for each property
 */
function buildPreferenceContext(preferences: UserPreferences | null | undefined): string {
  if (!preferences) return '';

  const contextLines: string[] = [];

  // Only include context if user has meaningful feedback history
  const totalFeedback = (preferences.total_liked || 0) + (preferences.total_saved || 0);
  if (totalFeedback < 2) return ''; // Need at least 2 positive signals before applying preferences

  contextLines.push(`
    # USER PREFERENCE CONTEXT
    Apply these learned preferences while keeping each design UNIQUE to this specific property:`);

  // Style preferences from liked/saved designs
  if (preferences.style_keywords && preferences.style_keywords.length > 0) {
    contextLines.push(`    - Design Style: ${preferences.style_keywords.join(', ')}`);
  }

  // Things to avoid from negative feedback
  if (preferences.avoid_keywords && preferences.avoid_keywords.length > 0) {
    contextLines.push(`    - AVOID: ${preferences.avoid_keywords.join(', ')}`);
  }

  // Color temperature preference
  if (preferences.preferred_color_temp) {
    contextLines.push(`    - Color Temperature Preference: ${preferences.preferred_color_temp}`);
  }

  // Intensity preference range
  if (preferences.preferred_intensity_range) {
    const range = preferences.preferred_intensity_range;
    if (range.min !== undefined && range.max !== undefined) {
      contextLines.push(`    - Intensity Preference: ${range.min}% - ${range.max}%`);
    }
  }

  contextLines.push(`
    IMPORTANT: Use these preferences as STYLE GUIDANCE only. Each property is unique -
    the preferences inform your approach and aesthetic, NOT exact fixture placement.
`);

  return contextLines.join('\n');
}

// Analysis model - Gemini 3.1 Pro with Deep Think for property analysis
const ANALYSIS_MODEL_NAME = 'gemini-3.1-pro-preview';
const ANALYSIS_TIMEOUT_MS = 120000; // 120 seconds for Deep Think analysis

/**
 * Stage 1: ANALYZING
 * Analyzes property photo AND user's fixture selections to extract architectural details
 */
export const analyzePropertyArchitecture = async (
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>
): Promise<PropertyAnalysis & { spatialMap?: SpatialMap }> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build user's fixture selection summary (from Fixture Summary box)
  const fixtureSelectionSummary = selectedFixtures.length > 0
    ? selectedFixtures.map(f => {
        const subOpts = fixtureSubOptions[f] || [];
        const subOptStr = subOpts.length > 0 ? ` (${subOpts.join(', ')})` : '';
        return `- ${f}${subOptStr}`;
      }).join('\n')
    : '- No fixtures selected';

  // Build DYNAMIC fixture_counts schema from ONLY user's selections
  const fixtureCountsSchema: string[] = [];
  const fixturePositionsSchema: string[] = [];

  selectedFixtures.forEach(fixtureId => {
    const subOpts = fixtureSubOptions[fixtureId] || [];
    subOpts.forEach(subOptId => {
      const key = `${fixtureId}_${subOptId}`;
      const userCount = fixtureCounts[subOptId];
      if (userCount !== null && userCount !== undefined) {
        // User specified exact count - AI must use this
        fixtureCountsSchema.push(`"${key}": ${userCount}`);
      } else {
        // Auto mode - AI recommends based on property features
        fixtureCountsSchema.push(`"${key}": <recommend count based on property>`);
      }
      fixturePositionsSchema.push(`"${key}": ["<position 1>", "<position 2>", "..."]`);
    });
  });

  // Build user's quantity summary (only show user-specified counts)
  const quantitySummary = Object.entries(fixtureCounts)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `- ${k}: EXACTLY ${v} fixtures (do not change)`)
    .join('\n') || '- All set to Auto (AI recommends based on property)';

  const analysisPrompt = `Analyze this property photo for landscape lighting design.

=== USER'S FIXTURE SELECTIONS (from Fixture Summary) ===
${fixtureSelectionSummary}

=== USER'S QUANTITY SETTINGS ===
${quantitySummary}

CRITICAL: Only analyze fixtures the user has selected above. Do NOT suggest additional fixtures.

Analyze the photo and return ONLY a valid JSON object (no markdown, no code blocks, no explanation).

Your analysis should:
1. Identify architecture details relevant to the SELECTED fixtures only
2. For user-specified counts, use EXACTLY that number
3. For auto counts, recommend based on property features
4. Provide placement positions for ONLY the selected fixtures

Return this exact structure:

{
  "architecture": {
    "story_count": <1 or 2 or 3>,
    "wall_height_estimate": "<8-12ft or 18-25ft or 25+ft>",
    "facade_materials": ["<brick, siding, stone, stucco, wood, or vinyl>"],
    "windows": {
      "first_floor_count": <number>,
      "second_floor_count": <number>,
      "positions": "<describe window layout>"
    },
    "columns": { "present": <true/false>, "count": <number> },
    "dormers": { "present": <true/false>, "count": <number> },
    "gables": { "present": <true/false>, "count": <number> },
    "entryway": {
      "type": "<single, double, or grand>",
      "has_overhang": <true/false>
    }
  },
  "landscaping": {
    "trees": {
      "count": <number>,
      "sizes": ["<small, medium, or large>"],
      "positions": "<describe tree locations>"
    },
    "planting_beds": {
      "present": <true/false>,
      "locations": ["<front, sides, foundation, etc>"]
    }
  },
  "hardscape": {
    "driveway": {
      "present": <true/false>,
      "width_estimate": "<narrow, standard, or wide>",
      "position": "<left, right, or center>"
    },
    "walkway": {
      "present": <true/false>,
      "length_estimate": "<short, medium, or long>",
      "style": "<straight or curved>",
      "description": "<describe path>"
    },
    "patio": { "present": <true/false> },
    "sidewalk": { "present": <true/false> }
  },
  "recommendations": {
    "optimal_intensity": "<subtle, moderate, bright, or high_power>",
    "optimal_beam_angle": <15, 30, 45, or 60>,
    "fixture_counts": {
      ${fixtureCountsSchema.length > 0 ? fixtureCountsSchema.join(',\n      ') : '"none": 0'}
    },
    "fixture_positions": {
      ${fixturePositionsSchema.length > 0 ? fixturePositionsSchema.join(',\n      ') : '"none": []'}
    },
    "priority_areas": ["<ordered list based on selected fixtures>"],
    "notes": "<2-3 sentences about placement for the selected fixtures>"
  },
  "spatialMap": {
    "features": [
      {
        "id": "corner_left",
        "type": "corner",
        "horizontalPosition": 0,
        "verticalPosition": 50,
        "label": "Far left corner"
      },
      {
        "id": "window_1",
        "type": "window",
        "horizontalPosition": <0-100 percentage from left>,
        "verticalPosition": <0-100 percentage from top>,
        "width": <percentage width of feature>,
        "label": "<descriptive label like 'First window from left'>"
      }
    ],
    "placements": [
      {
        "id": "<unique_id like 'uplight_1'>",
        "fixtureType": "<fixture category id like 'up', 'path', etc>",
        "subOption": "<sub-option id like 'siding', 'windows', etc>",
        "horizontalPosition": <0-100 percentage from left>,
        "verticalPosition": <0-100 percentage from top>,
        "anchor": "<description like 'right_of corner_left' or 'below window_1'>",
        "description": "<human-readable like 'At far LEFT corner, in landscaping bed'>"
      }
    ]
  }
}

SPATIAL MAPPING INSTRUCTIONS:
1. Map all architectural features (windows, doors, columns, corners, dormers, gables, gutters) with BOTH horizontal (0%=left, 100%=right) AND vertical positions (0%=top, 100%=bottom)
2. For each fixture placement, specify EXACT x,y coordinates as percentages
3. Vertical position guideline: ground-level fixtures ~85-95%, window-level ~40-60%, roofline ~10-20%
4. Create narrative descriptions for each fixture placement

Base your analysis on:
- Wall height determines intensity (taller = brighter)
- Brick/stone needs narrow beam (15-30Â°) for texture grazing
- Smooth siding works with wider beams (30-45Â°)
- Walkway spacing: path light every 6-8 feet
- Window up lights: one centered below each first-floor window
- Siding up lights: one in each wall section between windows`;

  // Wrap the API call with retry logic (3 attempts, exponential backoff starting at 2s)
  return withRetry(async () => {
    const analyzePromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: analysisPrompt,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    const response = await withTimeout(
      analyzePromise,
      ANALYSIS_TIMEOUT_MS,
      'Property analysis timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        // Skip thinking parts (thought: true) — grab the final output text
        const textPart = candidate.content.parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).pop();
        if (textPart && textPart.text) {
          // Clean up the response - remove any markdown code blocks if present
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const analysis: PropertyAnalysis = JSON.parse(jsonText);
            return analysis;
          } catch (parseError) {
            console.error('Failed to parse analysis JSON:', parseError);
            console.error('Raw response:', textPart.text);
            throw new Error('Failed to parse property analysis. Please try again.');
          }
        }
      }
    }

    throw new Error('No analysis generated. Please try again.');
  }, 3, 2000); // 3 attempts, starting with 2 second delay
};

/**
 * ZONE DETECTION
 * Analyzes property photo and returns clickable zones for fixture placement
 * Each zone represents a logical area (wall section, window group, tree, pathway, etc.)
 */
export interface LightingZone {
  id: string;
  label: string;
  description: string;
  // Bounding box as percentages (0-100)
  bounds: {
    x: number;      // left edge %
    y: number;      // top edge %
    width: number;  // width %
    height: number; // height %
  };
  // What type of feature this zone represents
  featureType: 'wall' | 'window' | 'door' | 'tree' | 'shrub' | 'pathway' | 'driveway' | 'garage' | 'roof' | 'column' | 'other';
  // Recommended fixture types for this zone
  recommendedFixtures: string[];
  // Lighting technique suggestion
  technique: string;
}

export const detectLightingZones = async (
  imageBase64: string,
  imageMimeType: string = 'image/jpeg'
): Promise<LightingZone[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const zonePrompt = `Analyze this property photo and identify distinct zones for landscape lighting placement.

For each zone, provide:
1. A short label (e.g., "Left Wall Section", "Front Windows", "Oak Tree")
2. A description of what's in that zone
3. Bounding box as percentages (x, y, width, height) where 0,0 is top-left
4. The feature type (wall, window, door, tree, shrub, pathway, driveway, garage, roof, column, other)
5. Recommended fixture types (uplight, downlight, path_light, spot, well_light, wall_wash)
6. Suggested lighting technique

CRITICAL RULES:
- Identify 3-12 zones depending on property complexity
- Zones should not overlap significantly
- Each architectural feature or landscape element gets its own zone
- Include wall sections BETWEEN windows as separate zones
- Group similar adjacent windows together
- Trees and large shrubs each get their own zone
- Pathways and driveways are separate zones

Return JSON array:
[
  {
    "id": "zone_1",
    "label": "Left Wall Section",
    "description": "Stucco wall area to the left of the main windows",
    "bounds": { "x": 0, "y": 20, "width": 25, "height": 60 },
    "featureType": "wall",
    "recommendedFixtures": ["uplight", "wall_wash"],
    "technique": "Wall grazing with warm uplights spaced 4-6ft apart"
  },
  ...
]

Only return the JSON array, no other text.`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: ANALYSIS_MODEL_NAME,
        contents: [{
          role: 'user',
          parts: [
            { text: zonePrompt },
            {
              inlineData: {
                mimeType: imageMimeType,
                data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
              }
            }
          ]
        }]
      }),
      ANALYSIS_TIMEOUT_MS,
      'Zone detection timed out'
    );

    const text = response.text?.trim() || '[]';
    
    // Parse JSON, handling potential markdown code blocks
    let jsonStr = text;
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      jsonStr = match ? match[1].trim() : text;
    }
    
    const zones: LightingZone[] = JSON.parse(jsonStr);
    
    // Validate and clean up zones
    return zones.map((zone, idx) => ({
      id: zone.id || `zone_${idx + 1}`,
      label: zone.label || `Zone ${idx + 1}`,
      description: zone.description || '',
      bounds: {
        x: Math.max(0, Math.min(100, zone.bounds?.x || 0)),
        y: Math.max(0, Math.min(100, zone.bounds?.y || 0)),
        width: Math.max(5, Math.min(100, zone.bounds?.width || 20)),
        height: Math.max(5, Math.min(100, zone.bounds?.height || 20)),
      },
      featureType: zone.featureType || 'other',
      recommendedFixtures: zone.recommendedFixtures || ['uplight'],
      technique: zone.technique || ''
    }));
    
  } catch (error) {
    console.error('Zone detection failed:', error);
    // Return a simple fallback grid if detection fails
    return [
      { id: 'zone_left', label: 'Left Section', description: 'Left third of property', bounds: { x: 0, y: 0, width: 33, height: 100 }, featureType: 'wall', recommendedFixtures: ['uplight'], technique: 'Wall lighting' },
      { id: 'zone_center', label: 'Center Section', description: 'Center of property', bounds: { x: 33, y: 0, width: 34, height: 100 }, featureType: 'wall', recommendedFixtures: ['uplight', 'downlight'], technique: 'Feature lighting' },
      { id: 'zone_right', label: 'Right Section', description: 'Right third of property', bounds: { x: 67, y: 0, width: 33, height: 100 }, featureType: 'wall', recommendedFixtures: ['uplight'], technique: 'Wall lighting' },
    ];
  }
};


/**
 * Resize a base64 image to fit within maxDim on the longest side.
 * Returns the original if already within bounds or on error.
 */
async function resizeImageBase64(
  base64: string,
  mimeType: string,
  maxDim: number = 2048
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w <= maxDim && h <= maxDim) { resolve(base64); return; }
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      console.log(`[ImageResize] Resizing from ${img.width}x${img.height} to ${w}x${h}`);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(mimeType, 0.95).split(',')[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

function buildImageConfig(aspectRatio?: string): { imageSize: "2K"; aspectRatio?: string } {
  if (aspectRatio && aspectRatio.trim().length > 0) {
    return { imageSize: "2K", aspectRatio };
  }
  return { imageSize: "2K" };
}

export const generateNightScene = async (
  imageBase64: string,
  userInstructions: string,
  imageMimeType: string = 'image/jpeg',
  aspectRatio?: string,
  lightIntensity: number = 45,
  beamAngle: number = 30,
  colorTemperaturePrompt: string = "Use Soft White (3000K) for all lights.",
  userPreferences?: UserPreferences | null,
  markedImageBase64?: string,
  rawPromptMode?: boolean,
  prefixParts?: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }>,
  gradientImageBase64?: string
): Promise<string> => {

  // Initialization: The API key is obtained from environment variable
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Map sliders (0-100) to descriptive prompt instructions with height-based wattage guidance
  // Map sliders (0-100) to descriptive prompt instructions with realistic lighting physics
  const getIntensityPrompt = (val: number) => {
    if (val < 25) return `LIGHTING INTENSITY: SUBTLE (2-3W LED equivalent, 150-300 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Faint accent glow providing ambient definition
- Light barely reaches first story roofline (8-10 ft max reach)
- Soft, gentle pools of light with gradual falloff
- Beam edges EXTREMELY soft and diffused (12+ inch transition zone)
- Minimal atmospheric scatter visible near fixture

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft from fixture: 100% (reference)
- Brightness at 4ft: 25% (1/4 of reference)
- Brightness at 8ft: 6% (barely visible)
- Natural, rapid falloff creates intimate pools

HOT SPOT AVOIDANCE:
- NO bright spots at fixture base
- Light appears to "float" on surface
- Even distribution within small pool

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Ambient mood, pathway marking, subtle accent, intimate settings`;

    if (val < 50) return `LIGHTING INTENSITY: MODERATE (4-5W LED equivalent, 300-500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Standard 1st story reach (8-12 ft walls)
- Light comfortably reaches the roofline with gentle falloff
- Visible wall grazing that reveals texture WITHOUT hot spots
- Soft beam edges with 6-8 inch feather/transition zone
- Subtle atmospheric glow visible near fixture lens
- Small bloom halo around fixture (1-2 inch radius)

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 4ft: 25%
- Brightness at 8ft: 6%
- Brightness at 12ft (roofline): 3% - still visible

TEXTURE REVELATION:
- Sufficient intensity to show brick mortar joints
- Siding shadow lines visible but not harsh
- Stone texture defined but not over-emphasized

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Single-story homes, accent features, balanced residential lighting`;

    if (val < 75) return `LIGHTING INTENSITY: BRIGHT (6-8W LED equivalent, 500-800 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- 2nd story reach (18-25 ft walls)
- Strong wall grazing reaching full wall height
- More pronounced beam visibility and definition
- Visible light cone in air near fixture (subtle atmospheric effect)
- Noticeable bloom around fixture lens (2-3 inch radius)
- Light beam reaches ground with soft falloff at edges
- Beam feathers over 8-12 inch transition zone

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 6ft: 11%
- Brightness at 12ft: 3%
- Brightness at 20ft: 1% - still visible for tall walls

TEXTURE REVELATION:
- Strong shadows in brick/stone mortar joints
- Dramatic siding shadow lines
- Surface irregularities clearly defined

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Two-story facades, tall trees, dramatic accent lighting`;

    return `LIGHTING INTENSITY: HIGH POWER (10-15W LED equivalent, 800-1500 lumens)

LIGHT OUTPUT CHARACTERISTICS:
- Full 2-3 story reach (25+ ft walls)
- Intense beams reaching tall walls and gable peaks
- Maximum wall coverage with strong definition
- Pronounced atmospheric scatter near fixture (visible light cone)
- Strong lens bloom and halo effect (3-4 inch radius)
- Wide beam coverage with natural falloff at edges
- Beam still feathers at edges (10-15 inch transition zone)

INVERSE SQUARE LAW APPLICATION:
- Brightness at 2ft: 100% (reference)
- Brightness at 8ft: 6%
- Brightness at 16ft: 1.5%
- Brightness at 25ft: 0.6% - still visible for tall facades

TEXTURE REVELATION:
- Maximum shadow definition on textured surfaces
- Deep mortar joint shadows
- Dramatic texture grazing effect

HOT SPOT MANAGEMENT:
- Even with high power, NO harsh bright spots at fixture base
- Fixture angled to start beam 18-24 inches above ground
- Light brightest at mid-wall, not at base

ROOFLINE REACH: Light washes all the way up to where the wall meets the roof. The eave area may receive faint ambient glow from the wall wash â€” this is natural reflection, NOT a separate light source.

BEST FOR: Tall facades, commercial properties, dramatic architectural statements`;
  };

  const getBeamAnglePrompt = (angle: number) => {
    if (angle <= 15) return `BEAM ANGLE: 15 DEGREES (NARROW SPOT) - MAXIMUM DRAMA

BEAM GEOMETRY:
- Tight, focused conical beams (narrow at fixture, widening gradually upward)
- Spread calculation: diameter = distance Ã— 0.26 (tan 15Â°)
- At 10 feet: ~2.6 foot diameter light pool
- At 20 feet: ~5.2 foot diameter light pool

LIGHT DISTRIBUTION:
- HOT CENTER: Brightest point at beam center
- SOFT FALLOFF: Rapid but smooth transition to edges
- Edge transition zone: 3-4 inches (soft gradient, NOT hard cutoff)
- Beam boundary: Feathered, never crisp circles

TEXTURE GRAZING EFFECT:
- Ideal angle for revealing surface texture
- Brick: Deep mortar joint shadows, dramatic grid pattern
- Stone: Maximum texture revelation, rugged appearance
- Siding: Strong horizontal shadow lines

DARK GAP CREATION:
- Narrow beams create VISIBLE DARK GAPS between fixtures
- This is the PROFESSIONAL LOOK - isolated pools with separation
- Adjacent fixtures do NOT blend - each maintains distinct boundary

BEST FOR: Architectural columns, narrow wall sections, focal points, maximum drama`;

    if (angle <= 30) return `BEAM ANGLE: 30 DEGREES (SPOT) - PROFESSIONAL STANDARD

BEAM GEOMETRY:
- Defined beam with moderate spread
- Spread calculation: diameter = distance Ã— 0.54 (tan 30Â°)
- At 10 feet: ~5.4 foot diameter light pool
- At 20 feet: ~10.8 foot diameter light pool

LIGHT DISTRIBUTION:
- DEFINED CENTER: Clear brightness concentration
- GRADUAL FALLOFF: Smooth transition over 6-8 inches
- Visible beam definition with diffused, feathered edges
- NOT crisp boundaries - always soft gradient

TEXTURE GRAZING EFFECT:
- Excellent balance of texture revelation and coverage
- Brick: Visible mortar joint shadows, balanced pattern
- Stone: Good texture definition without harshness
- Siding: Clear horizontal lines, professional appearance

DARK GAP CREATION:
- Creates VISIBLE separation between fixture illumination zones
- Standard spacing allows dark wall sections between beams
- Professional landscape lighting look with intentional dark areas

BEST FOR: Facade accent lighting, medium trees, entry features, general professional use`;

    if (angle >= 60) return `BEAM ANGLE: 60 DEGREES (WIDE FLOOD) - AREA COVERAGE

BEAM GEOMETRY:
- Broad, even wash of light
- Spread calculation: diameter = distance Ã— 1.73 (tan 60Â°)
- At 10 feet: ~11.5 foot diameter light pool
- At 20 feet: ~23 foot diameter light pool

LIGHT DISTRIBUTION:
- EVEN COVERAGE: Minimal hot center effect
- VERY SOFT edges: 12+ inch gradual transition
- No distinct beam boundary - blends smoothly into darkness
- Creates seamless wall wash effect

WARNING - REDUCED DRAMA:
- Wide floods REDUCE texture revelation
- Less shadow definition on brick/stone
- Can create FLAT, UNIFORM appearance
- Dark gaps between fixtures may DISAPPEAR
- Use sparingly - professional lighting rarely uses this wide

BEST FOR: Wall washing (when uniform coverage desired), large blank facades, area lighting where drama is NOT the goal`;

    return `BEAM ANGLE: 45 DEGREES (FLOOD) - BALANCED COVERAGE

BEAM GEOMETRY:
- Standard professional landscape spread
- Spread calculation: diameter = distance Ã— 1.0 (tan 45Â°)
- At 10 feet: ~8.3 foot diameter light pool
- At 20 feet: ~16.6 foot diameter light pool

LIGHT DISTRIBUTION:
- BALANCED CENTER: Moderate brightness concentration
- SOFT EDGES: 8-10 inch feathered transition zone
- Soft but discernible beam shape
- Good coverage with some definition retained

TEXTURE EFFECT:
- Moderate texture revelation
- Brick: Visible but softer mortar shadows
- Stone: Texture present but less dramatic
- Siding: Subtle horizontal shadow lines

DARK GAP CONSIDERATION:
- May require closer fixture spacing to maintain dark gaps
- Watch for beam overlap creating uniform wash
- Consider narrower angle for more dramatic results

BEST FOR: General facade lighting, medium wall areas, balanced coverage needs`;
  };

  // Build user preference context (if available)
  const preferenceContext = buildPreferenceContext(userPreferences);

  // Simplified prompt structure to avoid adversarial trigger patterns while maintaining instruction density.
  const systemPrompt = `
    You are a professional Architectural Lighting Designer and Night Photography Specialist.
    Task: Transform the provided daylight photograph into an ULTRA-REALISTIC 1AM nighttime landscape lighting scene with CINEMATIC QUALITY. The result must look like a professional photograph taken at 1AM with high-end camera equipment (Sony A7R IV or Canon R5 quality).
${preferenceContext}

    # STEP 0: FRAMING & COMPOSITION PRESERVATION (CRITICAL)
    - The output image must have the EXACT SAME framing and composition as the source image
    - Keep the ENTIRE house in frame - do NOT crop, zoom in, or cut off any part of the home
    - Do NOT change the camera angle, perspective, or viewpoint
    - All edges of the property visible in the source must remain visible in the output
    - The aspect ratio and boundaries must match the source image exactly
    - If the source shows the full front facade, the output MUST show the full front facade

    # STEP 1: PRESERVE THE SOURCE IMAGE EXACTLY (MANDATORY)
    - The output MUST be a pixel-perfect copy of the source photo with ONLY light effects added
    - Do NOT add, remove, or modify ANY architectural features, landscaping, or hardscape
    - Do NOT add windows, doors, walkways, driveways, trees, or any object not in the source
    - Every pixel that is NOT directly illuminated by a requested fixture stays UNCHANGED

    # STEP 2: PIXEL-PERFECT PRESERVATION (CRITICAL)
    1. **ABSOLUTE STRUCTURE LOCK**: The generated image must be a 1:1 edit of the source photo.
       - Every building, tree, bush, object MUST appear EXACTLY as shown in source.
       - If source has NO sidewalk, output has NO sidewalk.
       - If source has NO driveway, output has NO driveway.
       - If source has NO front walkway (just grass to door), output has NO front walkway.
       - You are ONLY permitted to: darken the scene to night, add the specific requested light fixtures.

    2. **ABSOLUTE ZERO-ADDITION POLICY**:
       - FORBIDDEN ADDITIONS: New trees, bushes, plants, walkways, driveways, patios, steps, railings, windows, doors, dormers, columns, decorations, paths, pots, furniture.
       - If you are uncertain whether something exists in source, DO NOT ADD IT.
       - Your job is to ADD LIGHT to existing elements, NOT to ADD MATTER.

    3. **HARDSCAPE PRESERVATION**:
       - Many homes do NOT have front walkways, sidewalks, or visible driveways. This is NORMAL.
       - If source photo shows GRASS leading to front door, output MUST show GRASS (no path).
       - Do NOT "complete" or "add" hardscape that seems missing. It is not missing.

    4. **Sky & Darkness Level**: Transform to DEEP 1AM NIGHTTIME - NOT twilight, NOT dusk, but TRUE NIGHT.
       - Sky must be PITCH BLACK with no gradients, no blue tones, no ambient glow
       - This is 1AM darkness - the deepest, darkest part of night
       - Unlit areas should be so dark you can BARELY make out shapes and forms
       - Only the landscape lighting fixtures provide meaningful illumination
       - The darkness should feel authentic, atmospheric, and cinematic
       - Include a realistic full moon that provides EXTREMELY SUBTLE edge lighting only
       - Moon should NOT act as a spotlight - just the faintest silhouette definition on rooflines and trees

    5. **Background**: Trees in background remain as barely-visible dark silhouettes against the black sky. Do not add trees.

    # STEP 3: EXCLUSIVE LIGHTING RULES
    - **PLACEMENT PRIORITY**: The "DESIGN REQUEST" below contains a strict ALLOW-LIST.
    - **Zero Hallucination**: If user selects "Trees" only, House MUST remain DARK. If user selects "Path" only, House and Trees MUST remain DARK.
    - **Eave/Overhang Areas**: Remain DARK â€” no fixtures in eaves unless explicitly requested.
    - **Beam Hygiene**: Light sources must be realistic (cone shape, natural falloff).
    - **Color Temperature (MANDATORY)**: ${colorTemperaturePrompt} This is a HARD RULE - ALL lights MUST use this exact color temperature unless the user explicitly specifies a different temperature in the DESIGN REQUEST notes below.
    - **Intensity**: ${getIntensityPrompt(lightIntensity)}
    - **Beam**: ${getBeamAnglePrompt(beamAngle)}
    - **FIXTURE QUANTITIES (ABSOLUTE - NON-NEGOTIABLE)**: When the DESIGN REQUEST specifies "EXACTLY X fixtures", you MUST place EXACTLY X fixtures. Not X-1, not X+1, EXACTLY X. Count them. Recount them. This is non-negotiable. Never add "extra" fixtures to balance or complete the design.
    - **FULL WALL REACH RULE**: Up lights MUST illuminate the wall ALL THE WAY UP to the roofline:
      * For 1-story sections: beam reaches the eave line (8-12 ft)
      * For 2-story sections: beam MUST reach the top of the 2nd story wall (18-25 ft)
      * NEVER stop the beam at mid-wall - it must travel to the roofline above
      * Start bright at fixture, travel UP the wall surface (wall grazing effect)
      * Fade gradually as it approaches the roofline
      * Taller facades require higher intensity to reach the roofline

    # ABSOLUTE FIXTURE ENFORCEMENT (MOST CRITICAL RULE)

    *** THIS IS THE SINGLE MOST IMPORTANT RULE - VIOLATION IS UNACCEPTABLE ***

    ## STRICT ALLOW-LIST POLICY
    The DESIGN REQUEST below contains an EXPLICIT ALLOW-LIST of fixtures.
    - ONLY fixtures listed in the DESIGN REQUEST may appear in the image
    - If a fixture type is NOT in the DESIGN REQUEST, it MUST NOT EXIST in the output
    - There is NO inference, NO assumption, NO "completing the design"

    ## EXACT QUANTITY ENFORCEMENT
    When the DESIGN REQUEST specifies a quantity (e.g., "EXACTLY 6 up lights on siding"):
    - Count your fixtures BEFORE finalizing the image
    - The count MUST match EXACTLY - not 5, not 7, EXACTLY 6
    - If you cannot place the exact quantity, place FEWER, never MORE

    ## SUB-OPTION ISOLATION (CRITICAL)
    Within each fixture category, sub-options are INDEPENDENT:
    - If "Up Lights" is enabled with ONLY "Trees" selected:
      * Trees = LIT (with specified quantity)
      * Siding = MUST BE COMPLETELY DARK (zero up lights)
      * Windows = MUST BE COMPLETELY DARK (zero up lights)
      * Columns = MUST BE COMPLETELY DARK (zero up lights)
      * Landscaping = MUST BE COMPLETELY DARK (zero up lights)
    - UNSELECTED sub-options receive ZERO LIGHT from fixtures

    ## WHAT "NOT SELECTED" MEANS
    If a fixture or sub-option is NOT in the DESIGN REQUEST:
    - It does NOT exist in the output image
    - The area where it WOULD be placed remains in deep shadow â€” ZERO LIGHT
    - ABSENCE = ABSOLUTE PROHIBITION â€” no exceptions for any reason

    ## SPECIFIC PROHIBITIONS
    - NO recessed overhead lights or downward eave lights unless explicitly in DESIGN REQUEST
    - NO path lights unless "Path Lights" is explicitly in DESIGN REQUEST
    - NO tree up lights unless "Trees" sub-option is explicitly selected
    - NO siding up lights unless "Siding" sub-option is explicitly selected
    - NO window up lights unless "Windows" sub-option is explicitly selected
    - NO string lights, holiday lights, or decorative lights EVER (unless explicitly requested)
    - NO interior window glow (unless explicitly requested)
    - NO security lights, floodlights, or motion lights EVER

    ## VERIFICATION CHECKLIST (DO THIS BEFORE OUTPUT)
    1. List every fixture type in the DESIGN REQUEST
    2. For each fixture type, list every sub-option that is ENABLED
    3. Count the specified quantity for each
    4. Verify your output matches this list EXACTLY
    5. Verify areas NOT in this list are COMPLETELY DARK

    # YOUR ONLY PERMITTED MODIFICATIONS:
    1. Convert to TRUE 1AM DARKNESS - pitch black night, not twilight or dusk
    2. Add ONLY the specific light fixtures listed in DESIGN REQUEST
    3. Add realistic light beams/glow from those fixtures with physically accurate falloff
    4. Add full moon with EXTREMELY SUBTLE edge lighting on rooflines and tree silhouettes only
    EVERYTHING ELSE must remain pixel-for-pixel identical to the source image.

    # PHOTO-REALISM REQUIREMENTS (CRITICAL)
    - The output must look like a REAL PHOTOGRAPH taken at 1AM, NOT a digital rendering or CGI
    - Achieve the look of professional night photography with high-end full-frame camera
    - Light falloff must be physically accurate - inverse square law applies
    - The contrast between lit and unlit must be DRAMATIC - this is what makes night photography stunning
    - Lit areas: warm, inviting glow that looks natural, not artificially bright
    - The interplay of light and deep shadow creates the cinematic atmosphere
    - Overall mood: mysterious, dramatic, professional - like an architectural magazine night shoot

    # ADVANCED LIGHT PHYSICS (CRITICAL FOR REALISM)

    ## BEAM CHARACTERISTICS
    - Every light beam has a HOT CENTER (brightest point) that gradually FEATHERS to soft edges
    - Beam edges should never be sharp/crisp - LED sources create soft, diffused boundaries
    - The transition from lit to unlit should span 6-12 inches, not a hard line
    - Light intensity follows inverse square law: brightness = 1/(distance squared)
    - Light beams are CONICAL (narrow at fixture, organic spread) â€” NOT geometric cylinders with straight edges
    - Beam boundaries interact with surface texture, creating naturally irregular edges

    ## ATMOSPHERIC LIGHT SCATTER
    - Night air has subtle particulates that catch and scatter light
    - Create extremely subtle VISIBLE LIGHT CONES in the air (not fog, just atmosphere)
    - Brightest near fixture, fading to invisible within 2-3 feet
    - This is what gives professional night photography its "magic"

    ## FIXTURE SOURCE POINT
    - Each fixture should have a tiny, bright LENS GLOW at the source point
    - Add subtle BLOOM/HALO effect around bright fixture lenses (1-2 inch radius)
    - The fixture housing may be barely visible as a dark silhouette

    ## SURFACE MATERIAL INTERACTION
    - BRICK/STONE: Light catches texture, creates micro-shadows in mortar joints â€” beam edges follow mortar/texture relief, NOT straight geometric lines
    - VINYL/ALUMINUM SIDING: Slight sheen, horizontal shadow lines from overlap â€” beam interacts with siding texture, NOT uniform geometric wash
    - STUCCO: Diffuse reflection, soft appearance, minimal texture shadows
    - WOOD: Warm absorption, grain may be visible, natural material feel
    - PAINTED SURFACES: Color temperature affects perceived paint color
    - ALL SURFACES: Beam edges appear organic and slightly irregular, never ruler-straight

    ## LIGHT CONTAINMENT
    - Light ONLY appears where fixtures directly illuminate
    - No ambient glow, no fill light, no bounce light beyond the fixture beam
    - Unlit surfaces remain in deep shadow exactly as in the source image

    ## SHADOW QUALITY (LED SOURCES)
    - LED fixtures create SOFT SHADOWS with gradual edges (penumbra)
    - Shadow edges should transition over 2-4 inches, not be razor sharp
    - Multiple fixtures create multiple overlapping, semi-transparent shadows
    - Shadow darkness varies: deepest at center, lighter at edges

    ## GROUND PLANE INTERACTION
    - Light pools on ground from path lights should have soft, feathered edges
    - Hard surfaces (concrete, pavers) reflect slightly more than grass/mulch
    - Create subtle gradation from bright center to dark perimeter

    # SHADOW CONSISTENCY (CRITICAL - NO BRIGHT SPOTS)
    - ALL unlit areas must have UNIFORM DARKNESS throughout the entire image
    - NO bright spots, NO lighter patches, NO inconsistent shadow levels in unlit areas
    - The DARKEST shadow sets the standard - ALL other shadows must match this darkness level
    - Eliminate any areas that appear brighter than others in the shadows
    - Grass, siding, roof, trees - if not lit by a fixture, they should all be the SAME level of dark
    - Think of it like a consistent "black floor" - nothing unlit should be brighter than this floor
    - Even areas that would naturally catch ambient light (like white siding) must be uniformly dark
    - The ONLY variation in brightness should come from the landscape lighting fixtures
    - Shadows do NOT have varying levels of darkness - they are all equally deep and dark

    # DESIGN REQUEST
    Apply the following specific configuration to the scene. These instructions override default placement rules if they conflict:

    ${userInstructions}
  `;

  try {
    // Resize images to max 2048px before sending to Gemini to avoid timeouts
    const resizedImage = await resizeImageBase64(imageBase64, imageMimeType);
    const resizedGradient = gradientImageBase64
      ? await resizeImageBase64(gradientImageBase64, imageMimeType)
      : undefined;
    const resizedMarked = markedImageBase64
      ? await resizeImageBase64(markedImageBase64, imageMimeType)
      : undefined;

    // Build parts array â€” send both clean + marked images for manual placement mode
    const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
    // Inject reference examples (few-shot) before user images if provided
    if (prefixParts && prefixParts.length > 0) {
      imageParts.push(...prefixParts);
    }
    imageParts.push({ inlineData: { data: resizedImage, mimeType: imageMimeType } });
    // Prefer gradient image (includes markers) over markers-only
    if (resizedGradient) {
      imageParts.push({ inlineData: { data: resizedGradient, mimeType: imageMimeType } });
    } else if (resizedMarked) {
      imageParts.push({ inlineData: { data: resizedMarked, mimeType: imageMimeType } });
    }
    // rawPromptMode: send userInstructions directly, skip auto-mode system prompt wrapper.
    // Always append photorealism lock so quality constraints remain explicit.
    const finalPromptText = `${rawPromptMode ? userInstructions : systemPrompt}\n${buildPhotorealismLockAddendum()}`;
    imageParts.push({ text: finalPromptText });

    const generatePromise = ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: imageParts,
      },
      config: {
        temperature: 0.1,
        imageConfig: buildImageConfig(aspectRatio),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    // Wrap with timeout to prevent hanging
    const response = await withTimeout(
      generatePromise,
      API_TIMEOUT_MS,
      'Generation timed out. The server took too long to respond. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      // Check for finishReason to debug safety blocks
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.warn(`Gemini generation stopped with reason: ${candidate.finishReason}`);
          // We don't throw immediately, as there might still be content, but it's a good indicator of issues.
      }

      if (candidate.content && candidate.content.parts) {
          const parts = candidate.content.parts;
          
          // First, try to find the image part
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
          }
          
          // If no image part found, check for text (error description from model)
          const textPart = parts.find(p => p.text);
          if (textPart && textPart.text) {
             throw new Error(`Generation blocked: ${textPart.text}`);
          }
      }
    }

    // Capture safety ratings if available for debugging
    if (response.candidates && response.candidates[0] && response.candidates[0].safetyRatings) {
        console.warn("Safety Ratings:", response.candidates[0].safetyRatings);
    }

    throw new Error("No image generated. The model returned an empty response (Possible Safety Filter Trigger).");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DIRECT GENERATION MODE (FAST - Single API Call)
// Skips analysis/planning/prompting/validation stages for ~60-70% faster generation
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Builds a complete prompt directly from user selections + pre-built templates
 * No AI analysis needed - uses the rich prompt templates from constants.ts
 */
const buildDirectPrompt = (
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number
): string => {
  // Start with master instruction (includes narrative description and constraints)
  let prompt = SYSTEM_PROMPT.masterInstruction + '\n\n';

  // Add intensity and beam angle context
  const intensityDesc = lightIntensity < 25 ? 'SUBTLE' : lightIntensity < 50 ? 'MODERATE' : lightIntensity < 75 ? 'BRIGHT' : 'HIGH POWER';
  const beamDesc = beamAngle < 20 ? 'NARROW SPOT (15-20Â°)' : beamAngle < 40 ? 'MEDIUM FLOOD (25-40Â°)' : 'WIDE FLOOD (45-60Â°)';

  prompt += `=== LIGHTING PARAMETERS ===
- Color Temperature: ${colorTemperaturePrompt}
- Intensity Level: ${intensityDesc} (${lightIntensity}%)
- Beam Angle: ${beamDesc}

`;

  // Add ENABLED fixtures section
  prompt += '=== ENABLED LIGHTING (ALLOWLIST) ===\n\n';

  if (selectedFixtures.length === 0) {
    prompt += 'NO LIGHTING ENABLED. Convert to nighttime scene only. Do NOT add any light fixtures.\n\n';
  } else {
    // Build fixture-specific prompts from FIXTURE_TYPES
    selectedFixtures.forEach(fixtureId => {
      const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
      if (fixtureType) {
        // Get sub-options for this fixture
        const subOpts = fixtureSubOptions[fixtureId] || [];

        // Skip this fixture entirely if it has sub-options but none are selected
        // This prevents soffit (and any fixture with sub-options) from being enabled
        // when no specific sub-option is chosen
        if (fixtureType.subOptions && fixtureType.subOptions.length > 0 && subOpts.length === 0) {
          return; // Skip - don't add positivePrompt
        }

        prompt += `### ${fixtureType.label.toUpperCase()}\n`;
        prompt += fixtureType.positivePrompt + '\n\n';

        // Add sub-option specific prompts
        if (subOpts.length > 0 && fixtureType.subOptions) {
          subOpts.forEach(subOptId => {
            const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
            if (subOpt) {
              const count = fixtureCounts[subOptId];
              const countStr = count !== null && count !== undefined ? `EXACTLY ${count}` : 'AUTO (AI determines optimal count)';
              prompt += `#### ${subOpt.label}\n`;
              prompt += `- Count: ${countStr} fixtures\n`;
              prompt += `- ${subOpt.prompt}\n\n`;
            }
          });

          // Add dark descriptions for NON-selected sub-options within this fixture type
          const nonSelectedSubOpts = fixtureType.subOptions.filter(s => !subOpts.includes(s.id));
          if (nonSelectedSubOpts.length > 0) {
            prompt += `#### PROHIBITED SUB-OPTIONS (within ${fixtureType.label}):\n`;
            nonSelectedSubOpts.forEach(subOpt => {
              prompt += `- ${subOpt.label}: ${subOpt.darkDescription || 'MUST remain completely dark - no fixtures'}\n`;
            });
            prompt += '\n';
          }
        }
      }
    });
  }

  // Add PROHIBITION section for non-selected fixture types
  prompt += '=== PROHIBITED FIXTURES (MUST REMAIN DARK) ===\n\n';
  const nonSelectedFixtures = FIXTURE_TYPES.filter(f =>
    !selectedFixtures.includes(f.id)
  );
  if (nonSelectedFixtures.length > 0) {
    nonSelectedFixtures.forEach(fixture => {
      prompt += `### ${fixture.label.toUpperCase()} - FORBIDDEN\n`;
      prompt += `${fixture.negativePrompt}\n`;
      prompt += `ALL ${fixture.label.toLowerCase()} areas MUST remain PITCH BLACK with zero illumination.\n\n`;
    });
  }

  // Add closing reinforcement
  prompt += SYSTEM_PROMPT.closingReinforcement;

  return prompt;
};

/**
 * DIRECT GENERATION - Single API call, ~20-60 seconds
 * Uses Nano Banana Pro's built-in "thinking" for composition
 * Skips analysis/planning/prompting/validation stages
 */
export const generateNightSceneDirect = async (
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  aspectRatio?: string,
  userPreferences?: UserPreferences | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build prompt directly from templates (no AI analysis needed)
  let prompt = buildDirectPrompt(
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle
  );

  // Add user preference context if available
  const preferenceContext = buildPreferenceContext(userPreferences);
  if (preferenceContext) {
    prompt = preferenceContext + '\n\n' + prompt;
  }
  prompt += `\n${buildPhotorealismLockAddendum()}`;

  console.log('=== DIRECT GENERATION MODE ===');
  console.log('Selected fixtures:', selectedFixtures);
  console.log('Sub-options:', fixtureSubOptions);
  console.log('Counts:', fixtureCounts);
  console.log('Prompt length:', prompt.length, 'characters');

  try {
    const runDirectGeneration = async (promptText: string): Promise<string> => {
      const generatePromise = ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: imageMimeType,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          temperature: 0.1,
          imageConfig: buildImageConfig(aspectRatio),
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        },
      });

      const response = await withTimeout(
        generatePromise,
        API_TIMEOUT_MS,
        'Direct generation timed out. Please try again.'
      );

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];

        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.warn(`Direct generation stopped with reason: ${candidate.finishReason}`);
        }

        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const base64Data = part.inlineData.data;
              const detectedMimeType = part.inlineData.mimeType || 'image/png';
              return `data:${detectedMimeType};base64,${base64Data}`;
            }
          }
        }
      }

      throw new Error("Direct generation returned no image. Try the full pipeline mode.");
    };

    let result = await runDirectGeneration(prompt);
    let photorealCheck = await verifyPhotorealism(
      extractBase64Data(result),
      extractMimeType(result, imageMimeType)
    );
    console.log(`[Direct Mode] Photorealism: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);

    if (!photorealCheck.passed) {
      for (let attempt = 1; attempt <= MAX_PHOTOREAL_RETRY_ATTEMPTS; attempt++) {
        const correctionPrompt = buildPhotorealismCorrectionPrompt(prompt, photorealCheck.issues);
        const retryResult = await runDirectGeneration(correctionPrompt);
        const retryPhotoreal = await verifyPhotorealism(
          extractBase64Data(retryResult),
          extractMimeType(retryResult, imageMimeType)
        );

        if (retryPhotoreal.passed || retryPhotoreal.score >= photorealCheck.score) {
          result = retryResult;
          photorealCheck = retryPhotoreal;
        }

        if (photorealCheck.passed) break;
      }
    }

    console.log('✓ Direct generation successful');
    return result;
  } catch (error) {
    console.error("Direct Generation Error:", error);
    throw error;
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPATIAL MAPPING UTILITIES (Ported from claudeService.ts)
// Used for Enhanced Gemini Pro 3 Mode
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Generates a narrative description of fixture placements for a specific fixture type.
 * Research shows narrative descriptions are more effective than technical specs for AI image generation.
 */
export function generateNarrativePlacement(
  spatialMap: SpatialMap,
  fixtureType: string,
  subOption?: string
): string {
  let placements = spatialMap.placements.filter(p => p.fixtureType === fixtureType);
  if (subOption) {
    placements = placements.filter(p => p.subOption === subOption);
  }

  if (placements.length === 0) return '';

  // Per-fixture "render as" micro-descriptions for type reinforcement
  const renderAsMap: Record<string, string> = {
    up: 'small bronze uplight at wall base, beam UPWARD â€” place at EXACT marked position, shine in EXACT marked direction',
    gutter: 'small line-mounted uplight on the USER-DRAWN RAIL at this EXACT mount position â€” place at EXACT marked position and shine in EXACT marked direction',
    path: 'small bronze fixture in landscaping, 360Â° ground pool â€” place at EXACT marked position',
    well: 'small bronze uplight at ground level, beam UPWARD at tree canopy â€” place at EXACT marked position',
    hardscape: 'small bronze fixture under step tread, beam DOWNWARD onto riser â€” place at EXACT marked position',
    soffit: 'small bronze recessed fixture flush in soffit, beam DOWNWARD â€” place at EXACT marked position',
    coredrill: 'TINY flush bronze disc in concrete (~3” diameter), beam UPWARD â€” place at EXACT marked position, NO visible hardware',
  };

  const typeLabel = fixtureType.toUpperCase();
  const renderAs = renderAsMap[fixtureType] || fixtureType;

  // Sort left to right
  const sorted = [...placements].sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  const label = subOption ? `${fixtureType} (${subOption})` : fixtureType;
  let narrative = `### ${label.toUpperCase()}\n`;
  narrative += `Scanning LEFT to RIGHT, you will see exactly ${sorted.length} fixtures:\n\n`;

  sorted.forEach((p, i) => {
    // Output exact x,y coordinates for precise placement
    const xCoord = p.horizontalPosition.toFixed(1);
    const yCoord = p.verticalPosition !== undefined ? p.verticalPosition.toFixed(1) : '?';
    const gutterSuffix = fixtureType === 'gutter' ? ' EXACTLY on the USER-DRAWN RAIL at this precise mount position â€" DO NOT move or redistribute' : '';
    const coords = `Place at EXACTLY [${xCoord}%, ${yCoord}%]${gutterSuffix}`;
    const gutterLineHint = fixtureType === 'gutter' && typeof p.gutterLineX === 'number' && typeof p.gutterLineY === 'number'
      ? ` (rail anchor [${p.gutterLineX.toFixed(1)}%, ${p.gutterLineY.toFixed(1)}%])`
      : '';
    const gutterDepthHint = fixtureType === 'gutter' && typeof p.gutterMountDepthPercent === 'number'
      ? ` (mount offset ${p.gutterMountDepthPercent.toFixed(1)}% from rail)`
      : '';

    // Per-fixture beam direction override when user has custom rotation
    let fixtureRenderAs = renderAs;
    let directionNote = '';
    if (p.rotation !== undefined && hasCustomRotation(p.rotation, p.fixtureType)) {
      const dirLabel = rotationToDirectionLabel(p.rotation);
      fixtureRenderAs = fixtureRenderAs
        .replace(/beam UPWARD[^,–]*/gi, `beam ${dirLabel}`)
        .replace(/beam DOWNWARD[^,–]*/gi, `beam ${dirLabel}`);
      directionNote = ` â€" BEAM DIRECTION: ${dirLabel} (user-specified, MUST be honored exactly)`;
    }

    // Per-fixture beam length notation
    let beamNote = '';
    if (p.beamLength !== undefined && Math.abs(p.beamLength - 1.0) > 0.05) {
      beamNote = p.beamLength > 1.0
        ? ` â€" EXTENDED beam (${p.beamLength.toFixed(1)}x reach)`
        : ` â€" SHORT beam (${p.beamLength.toFixed(1)}x reach)`;
    }

    narrative += `FIXTURE ${i + 1} (${typeLabel}): ${coords}${gutterLineHint}${gutterDepthHint}`;
    if (p.description) {
      narrative += ` â€" ${p.description}`;
    }
    narrative += ` â€" Render as: ${fixtureRenderAs}${directionNote}${beamNote}\n`;
  });

  // Add inter-fixture spacing when 2+ fixtures
  if (sorted.length >= 2) {
    narrative += `\nSPACING: These ${sorted.length} fixtures are arranged LEFT to RIGHT.\n`;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].horizontalPosition - sorted[i - 1].horizontalPosition;
      narrative += `- Gap between FIXTURE ${i} and FIXTURE ${i + 1}: ${gap.toFixed(1)}% of image width\n`;
    }
  }

  narrative += `\nCOUNT CHECK: There are EXACTLY ${sorted.length} fixtures. No more, no less.\n`;

  // Add position enforcement for line-mounted (gutter type) fixtures
  if (fixtureType === 'gutter') {
    narrative += `\nRAIL POSITION ENFORCEMENT: Every line-mounted light MUST remain at its EXACT marked [X%, Y%] mount position on the USER-DRAWN rail. Do NOT redistribute, rebalance, or evenly space them. The user placed each light at a specific location â€" that location is non-negotiable.\n`;
  }

  // Add direction enforcement for non-gutter fixtures with rotations
  const rotatedFixtures = sorted.filter(p => p.rotation !== undefined && hasCustomRotation(p.rotation, p.fixtureType));
  if (rotatedFixtures.length > 0) {
    narrative += `\nDIRECTION ENFORCEMENT: ${rotatedFixtures.length} fixture(s) above have user-specified beam directions. Each light MUST shine in its marked direction â€" do NOT default to straight up/down.\n`;
  }

  return narrative;
}

/**
 * Formats the full spatial map into a prompt-ready string
 */
export function formatSpatialMapForPrompt(spatialMap: SpatialMap): string {
  if (!spatialMap.features.length && !spatialMap.placements.length) {
    return '';
  }

  let output = `\n## EXACT FIXTURE PLACEMENT MAP\n`;
  output += `Coordinates: x=0% (far left) to x=100% (far right), y=0% (top) to y=100% (bottom).\n\n`;
  output += `### CRITICAL POSITIONING RULES\n`;
  output += `- LINE-MOUNTED UP LIGHTS (fixtureType=gutter): Treat these as USER-DRAWN RAIL fixtures, not literal roof gutters. They may be anywhere in the image. Each one MUST stay at its EXACT [X%, Y%] coordinate and on its user rail anchor if provided.\n`;
  output += `- ALL FIXTURES: Each fixture MUST be rendered at its EXACT [X%, Y%] position AND its light beam MUST shine in the EXACT direction specified by its rotation. If a fixture points UP-RIGHT, the light goes UP-RIGHT. If it points LEFT, the light goes LEFT.\n`;
  output += `- The user is a professional lighting designer. Every position and direction is intentional and non-negotiable.\n\n`;

  // Reference points with x,y coordinates
  if (spatialMap.features.length > 0) {
    output += `### REFERENCE POINTS:\n`;
    const sortedFeatures = [...spatialMap.features].sort((a, b) => a.horizontalPosition - b.horizontalPosition);
    sortedFeatures.forEach(f => {
      const yCoord = f.verticalPosition !== undefined ? f.verticalPosition.toFixed(1) : '?';
      output += `- ${f.label}: [${f.horizontalPosition.toFixed(1)}%, ${yCoord}%]\n`;
    });
    output += '\n';
  }

  // Group placements by fixtureType and subOption.
  // Use a delimiter that won't collide with subOption ids like "garage_sides".
  const groups = new Map<string, SpatialFixturePlacement[]>();
  spatialMap.placements.forEach(p => {
    const key = `${p.fixtureType}::${p.subOption || ''}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  });

  // Generate narrative for each group
  groups.forEach((placements, key) => {
    const [fixtureType, subOption] = key.split('::');
    output += generateNarrativePlacement({ ...spatialMap, placements }, fixtureType, subOption);
    output += '\n';
  });

  return output;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function sanitizeFixtureType(type: string): string | null {
  const normalized = (type || '').toLowerCase().trim();
  if (VALID_FIXTURE_TYPES.has(normalized)) return normalized;
  if (normalized === 'uplight') return 'up';
  if (normalized === 'downlight') return 'soffit';
  if (normalized === 'steplight') return 'hardscape';
  return null;
}

function mapPipelineTypeToCategory(fixtureType: string): LightFixture['type'] | null {
  switch (fixtureType) {
    case 'up':
      return 'uplight';
    case 'gutter':
      return 'gutter_uplight';
    case 'path':
      return 'path_light';
    case 'well':
      return 'well_light';
    case 'hardscape':
      return 'step_light';
    case 'soffit':
      return 'downlight';
    case 'coredrill':
      return 'coredrill';
    default:
      return null;
  }
}

interface AutoPlacementSeedPoint {
  x: number;
  y: number;
  description: string;
  target: string;
}

interface ExplicitAutoCountTarget {
  fixtureType: string;
  subOption: string;
  desiredCount: number;
}

function normalizeAutoSubOption(fixtureType: string, subOption?: string): string {
  if (fixtureType === 'gutter') return 'gutterUpLights';
  const normalized = (subOption || '').trim();
  return normalized || 'general';
}

function getAutoPlacementGroupKey(fixtureType: string, subOption: string): string {
  return `${fixtureType}::${subOption}`;
}

function getDefaultAutoYForFixture(fixtureType: string): number {
  switch (fixtureType) {
    case 'gutter':
      return 42;
    case 'soffit':
      return 32;
    case 'up':
      return 72;
    case 'path':
      return 84;
    case 'well':
      return 82;
    case 'hardscape':
      return 76;
    case 'coredrill':
      return 85;
    default:
      return 70;
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildEvenlySpacedAutoSeedPoints(
  count: number,
  fixtureType: string,
  minX: number = 10,
  maxX: number = 90,
  fallbackY?: number
): AutoPlacementSeedPoint[] {
  if (count <= 0) return [];
  const y = clampPercent(typeof fallbackY === 'number' ? fallbackY : getDefaultAutoYForFixture(fixtureType));
  const safeMinX = clampPercent(Math.min(minX, maxX));
  const safeMaxX = clampPercent(Math.max(minX, maxX));
  const span = Math.max(1, safeMaxX - safeMinX);

  return Array.from({ length: count }, (_, idx) => {
    const t = (idx + 1) / (count + 1);
    const x = clampPercent(safeMinX + span * t);
    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      description: `${fixtureType} auto placement`,
      target: `${fixtureType} target`,
    };
  });
}

function buildAutoSeedPointsForCount(
  rawPoints: AutoPlacementSeedPoint[],
  desiredCount: number,
  fixtureType: string
): AutoPlacementSeedPoint[] {
  if (desiredCount <= 0) return [];

  const points = rawPoints
    .map(point => ({
      x: Number(clampPercent(point.x).toFixed(3)),
      y: Number(clampPercent(point.y).toFixed(3)),
      description: point.description || `${fixtureType} auto placement`,
      target: point.target || `${fixtureType} target`,
    }))
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);

  if (points.length === 0) {
    return buildEvenlySpacedAutoSeedPoints(desiredCount, fixtureType);
  }
  if (points.length >= desiredCount) {
    return points.slice(0, desiredCount);
  }

  const defaultY = average(points.map(point => point.y)) || getDefaultAutoYForFixture(fixtureType);
  let minX = points[0].x;
  let maxX = points[points.length - 1].x;
  if (maxX - minX < 8) {
    minX = clampPercent(minX - 15);
    maxX = clampPercent(maxX + 15);
  }
  if (maxX - minX < 6) {
    minX = 10;
    maxX = 90;
  }

  const existing = points.slice();
  const additionsNeeded = desiredCount - existing.length;
  const supplemental = buildEvenlySpacedAutoSeedPoints(
    additionsNeeded,
    fixtureType,
    minX,
    maxX,
    defaultY
  );

  const merged = [...existing];
  for (const candidate of supplemental) {
    const tooClose = merged.some(
      point => Math.abs(point.x - candidate.x) < 1.2 && Math.abs(point.y - candidate.y) < 1.2
    );
    if (!tooClose) {
      merged.push(candidate);
      continue;
    }

    const nudged = {
      ...candidate,
      x: Number(clampPercent(candidate.x + 1.6).toFixed(3)),
    };
    merged.push(nudged);
  }

  if (merged.length < desiredCount) {
    const fallback = buildEvenlySpacedAutoSeedPoints(
      desiredCount - merged.length,
      fixtureType,
      12,
      88,
      defaultY
    );
    merged.push(...fallback);
  }

  return merged
    .sort((a, b) => a.x - b.x)
    .slice(0, desiredCount);
}

function buildExplicitAutoCountTargets(
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>
): ExplicitAutoCountTarget[] {
  const targets: ExplicitAutoCountTarget[] = [];
  const seen = new Set<string>();

  selectedFixtures.forEach(fixtureType => {
    const configuredSubOptions = fixtureSubOptions[fixtureType] || [];
    const subOptions = configuredSubOptions.length > 0
      ? configuredSubOptions
      : (fixtureType === 'gutter' ? ['gutterUpLights'] : []);

    subOptions.forEach(rawSubOption => {
      const normalizedSubOption = normalizeAutoSubOption(fixtureType, rawSubOption);
      const countValue = fixtureCounts[rawSubOption] ?? fixtureCounts[normalizedSubOption];
      if (typeof countValue !== 'number' || !Number.isFinite(countValue)) return;

      const desiredCount = Math.max(0, Math.round(countValue));
      const key = getAutoPlacementGroupKey(fixtureType, normalizedSubOption);
      if (seen.has(key)) return;
      seen.add(key);
      targets.push({ fixtureType, subOption: normalizedSubOption, desiredCount });
    });
  });

  return targets;
}

function reconcileAutoPlacementsToExplicitCounts(
  spatialMap: SpatialMap,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  skipFixtureTypes: Set<string> = new Set()
): { spatialMap: SpatialMap; adjustments: string[] } {
  const targets = buildExplicitAutoCountTargets(selectedFixtures, fixtureSubOptions, fixtureCounts)
    .filter(target => !skipFixtureTypes.has(target.fixtureType));
  if (targets.length === 0) {
    return { spatialMap, adjustments: [] };
  }

  let placements = [...spatialMap.placements];
  const adjustments: string[] = [];

  targets.forEach(target => {
    const matches = placements.filter(
      placement => placement.fixtureType === target.fixtureType && placement.subOption === target.subOption
    );

    if (matches.length === target.desiredCount) return;

    if (matches.length > target.desiredCount) {
      let kept = 0;
      placements = placements.filter(placement => {
        if (placement.fixtureType !== target.fixtureType || placement.subOption !== target.subOption) {
          return true;
        }
        kept += 1;
        return kept <= target.desiredCount;
      });
      adjustments.push(
        `${target.fixtureType}/${target.subOption}: trimmed ${matches.length} -> ${target.desiredCount}`
      );
      return;
    }

    const missing = target.desiredCount - matches.length;
    const seedPointsFromMatches: AutoPlacementSeedPoint[] = matches.map(match => ({
      x: match.horizontalPosition,
      y: match.verticalPosition,
      description: match.description,
      target: match.anchor,
    }));
    const seedPointsFromType: AutoPlacementSeedPoint[] = placements
      .filter(placement => placement.fixtureType === target.fixtureType)
      .map(placement => ({
        x: placement.horizontalPosition,
        y: placement.verticalPosition,
        description: placement.description,
        target: placement.anchor,
      }));
    const seedPoints = seedPointsFromMatches.length > 0 ? seedPointsFromMatches : seedPointsFromType;
    const candidatePoints = buildAutoSeedPointsForCount(
      seedPoints,
      target.desiredCount,
      target.fixtureType
    );

    const occupied = matches.map(match => ({
      x: match.horizontalPosition,
      y: match.verticalPosition,
    }));
    const additions: SpatialFixturePlacement[] = [];

    for (const candidate of candidatePoints) {
      if (additions.length >= missing) break;
      const tooCloseToOccupied = [...occupied, ...additions.map(add => ({
        x: add.horizontalPosition,
        y: add.verticalPosition,
      }))].some(
        point => Math.abs(point.x - candidate.x) < 1.1 && Math.abs(point.y - candidate.y) < 1.1
      );
      if (tooCloseToOccupied) continue;

      additions.push({
        id: `auto_reconcile_${target.fixtureType}_${target.subOption}_${matches.length + additions.length + 1}`,
        fixtureType: target.fixtureType,
        subOption: target.subOption,
        horizontalPosition: candidate.x,
        verticalPosition: candidate.y,
        anchor: `auto_reconcile_${target.fixtureType}_${target.subOption}`,
        description: candidate.description || `${target.fixtureType} auto reconciliation`,
      });
    }

    while (additions.length < missing) {
      const idx = matches.length + additions.length + 1;
      const fallbackPoint = buildEvenlySpacedAutoSeedPoints(
        1,
        target.fixtureType,
        10 + (idx % 5),
        90 - (idx % 5),
        seedPoints.length > 0 ? average(seedPoints.map(point => point.y)) : undefined
      )[0];
      additions.push({
        id: `auto_reconcile_${target.fixtureType}_${target.subOption}_${idx}`,
        fixtureType: target.fixtureType,
        subOption: target.subOption,
        horizontalPosition: fallbackPoint.x,
        verticalPosition: fallbackPoint.y,
        anchor: `auto_reconcile_${target.fixtureType}_${target.subOption}`,
        description: `${target.fixtureType} auto reconciliation`,
      });
    }

    placements = [...placements, ...additions];
    adjustments.push(
      `${target.fixtureType}/${target.subOption}: filled ${matches.length} -> ${target.desiredCount}`
    );
  });

  return {
    spatialMap: { ...spatialMap, placements },
    adjustments,
  };
}

function deriveFallbackAutoGutterLines(
  spatialMap: SpatialMap,
  maxLines: number
): GutterLine[] {
  const boundedMaxLines = Math.max(1, Math.min(10, maxLines));
  const gutterPlacements = spatialMap.placements.filter(placement => placement.fixtureType === 'gutter');
  const candidatePoints = gutterPlacements.length > 0
    ? gutterPlacements.map(placement => ({
        x: placement.gutterLineX ?? placement.horizontalPosition,
        y: placement.gutterLineY ?? placement.verticalPosition,
      }))
    : spatialMap.placements
        .filter(placement => placement.fixtureType === 'soffit' || placement.verticalPosition <= 55)
        .map(placement => ({
          x: placement.horizontalPosition,
          y: placement.verticalPosition,
        }));

  if (candidatePoints.length === 0) {
    return [{
      id: 'auto_gutter_fallback_1',
      startX: 12,
      startY: 42,
      endX: 88,
      endY: 42,
      mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
    }];
  }

  const sortedByY = candidatePoints
    .map(point => ({ x: clampPercent(point.x), y: clampPercent(point.y) }))
    .sort((a, b) => a.y - b.y);

  const clusters: Array<{ points: Array<{ x: number; y: number }>; avgY: number }> = [];
  const clusterTolerance = 4.5;
  for (const point of sortedByY) {
    const cluster = clusters.find(item => Math.abs(item.avgY - point.y) <= clusterTolerance);
    if (cluster) {
      cluster.points.push(point);
      cluster.avgY = average(cluster.points.map(p => p.y));
    } else {
      clusters.push({ points: [point], avgY: point.y });
    }
  }

  return clusters
    .sort((a, b) => b.points.length - a.points.length || a.avgY - b.avgY)
    .slice(0, boundedMaxLines)
    .map((cluster, index) => {
      const xs = cluster.points.map(point => point.x).sort((a, b) => a - b);
      const rawMinX = xs[0];
      const rawMaxX = xs[xs.length - 1];
      let minX = rawMinX;
      let maxX = rawMaxX;

      if (maxX - minX < 25) {
        minX = clampPercent(minX - 15);
        maxX = clampPercent(maxX + 15);
      }
      if (maxX - minX < 12) {
        minX = 12;
        maxX = 88;
      }

      const avgY = clampPercent(cluster.avgY);
      return {
        id: `auto_gutter_fallback_${index + 1}`,
        startX: Number(minX.toFixed(3)),
        startY: Number(avgY.toFixed(3)),
        endX: Number(maxX.toFixed(3)),
        endY: Number(avgY.toFixed(3)),
        mountDepthPercent: DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT,
      };
    });
}

interface AutoPlacementConfidenceGateResult {
  passed: boolean;
  score: number;
  reasons: string[];
  hardFails: string[];
}

function getAutoPlausibleYBand(fixtureType: string): { min: number; max: number } | null {
  switch (fixtureType) {
    case 'up':
      return { min: 50, max: 99 };
    case 'well':
      return { min: 55, max: 99 };
    case 'path':
      return { min: 60, max: 99 };
    case 'hardscape':
      return { min: 55, max: 99 };
    case 'coredrill':
      return { min: 60, max: 99 };
    case 'gutter':
      return { min: 18, max: 62 };
    case 'soffit':
      return { min: 8, max: 58 };
    default:
      return null;
  }
}

function evaluateAutoPlacementConfidence(
  spatialMap: SpatialMap,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  gutterLines?: GutterLine[]
): AutoPlacementConfidenceGateResult {
  let score = 100;
  const reasons: string[] = [];
  const hardFails: string[] = [];
  const placements = spatialMap.placements || [];

  if (selectedFixtures.length > 0 && placements.length === 0) {
    hardFails.push('No auto placements were generated.');
    score -= 100;
  }

  const allowedTypes = new Set(
    selectedFixtures
      .map(type => sanitizeFixtureType(type))
      .filter((type): type is string => !!type)
  );
  const presentTypes = new Set(placements.map(placement => placement.fixtureType));
  const forbiddenTypes = [...presentTypes].filter(type => !allowedTypes.has(type));
  if (forbiddenTypes.length > 0) {
    hardFails.push(`Forbidden fixture types in auto constraints: ${forbiddenTypes.join(', ')}`);
    score -= 45 + Math.max(0, forbiddenTypes.length - 1) * 10;
  }

  const explicitTargets = buildExplicitAutoCountTargets(selectedFixtures, fixtureSubOptions, fixtureCounts);
  explicitTargets.forEach(target => {
    const actualCount = placements.filter(
      placement => placement.fixtureType === target.fixtureType && placement.subOption === target.subOption
    ).length;
    if (actualCount !== target.desiredCount) {
      hardFails.push(
        `Count mismatch ${target.fixtureType}/${target.subOption}: expected ${target.desiredCount}, got ${actualCount}`
      );
      score -= 30;
    }
  });

  let collisionCount = 0;
  const byGroup = new Map<string, SpatialFixturePlacement[]>();
  placements.forEach(placement => {
    const key = getAutoPlacementGroupKey(placement.fixtureType, placement.subOption || 'general');
    const existing = byGroup.get(key) || [];
    existing.push(placement);
    byGroup.set(key, existing);
  });
  byGroup.forEach(groupPlacements => {
    for (let i = 0; i < groupPlacements.length; i++) {
      for (let j = i + 1; j < groupPlacements.length; j++) {
        const a = groupPlacements[i];
        const b = groupPlacements[j];
        const dist = Math.sqrt(
          (a.horizontalPosition - b.horizontalPosition) ** 2 +
          (a.verticalPosition - b.verticalPosition) ** 2
        );
        if (dist < 0.9) collisionCount++;
      }
    }
  });
  if (collisionCount > 0) {
    reasons.push(`Detected ${collisionCount} overlapping/duplicate fixture positions.`);
    score -= Math.min(25, collisionCount * 6);
  }

  let yBandViolations = 0;
  placements.forEach(placement => {
    const band = getAutoPlausibleYBand(placement.fixtureType);
    if (!band) return;
    if (placement.verticalPosition < band.min || placement.verticalPosition > band.max) {
      yBandViolations++;
    }
  });
  if (yBandViolations > 0) {
    reasons.push(`Detected ${yBandViolations} fixture(s) outside plausible Y-bands for their types.`);
    score -= Math.min(20, yBandViolations * 3);
  }

  const gutterPlacements = placements.filter(placement => placement.fixtureType === 'gutter');
  if (gutterPlacements.length > 0) {
    if (!gutterLines || gutterLines.length === 0) {
      hardFails.push('Gutter fixtures exist but no gutter rails were available.');
      score -= 35;
    } else {
      let offRailCount = 0;
      let aboveLineCount = 0;
      let depthOutOfBandCount = 0;

      gutterPlacements.forEach(placement => {
        const nearest = resolveGutterLine(placement, gutterLines);
        if (!nearest) {
          offRailCount++;
          return;
        }

        if (nearest.distance > GUTTER_LINE_TOLERANCE_PERCENT + 0.5) {
          offRailCount++;
        }

        const signedDepth = getSignedDepthFromLine(
          placement.horizontalPosition,
          placement.verticalPosition,
          { x: nearest.x, y: nearest.y, line: nearest.line }
        );

        if (signedDepth < -GUTTER_ABOVE_LINE_TOLERANCE_PERCENT) {
          aboveLineCount++;
        }

        if (
          signedDepth < MIN_GUTTER_MOUNT_DEPTH_PERCENT - 0.2 ||
          signedDepth > MAX_GUTTER_MOUNT_DEPTH_PERCENT + GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT
        ) {
          depthOutOfBandCount++;
        }
      });

      if (offRailCount > 0) {
        hardFails.push(`Detected ${offRailCount} gutter fixture(s) off gutter rails.`);
        score -= 30;
      }
      if (aboveLineCount > 0) {
        hardFails.push(`Detected ${aboveLineCount} gutter fixture(s) mounted above gutter trough.`);
        score -= 30;
      }
      if (depthOutOfBandCount > 0) {
        reasons.push(`Detected ${depthOutOfBandCount} gutter fixture(s) with out-of-band mount depth.`);
        score -= Math.min(15, depthOutOfBandCount * 4);
      }
    }
  }

  const clampedScore = clampScore(score);
  const passed = hardFails.length === 0 && clampedScore >= AUTO_PLACEMENT_CONFIDENCE_MIN_SCORE;

  return {
    passed,
    score: clampedScore,
    reasons: [...hardFails, ...reasons],
    hardFails,
  };
}

function buildAutoSpatialMapFromSuggestions(
  suggestions: SuggestedFixture[],
  selectedFixtures: string[],
  fixtureCounts: Record<string, number | null>
): SpatialMap {
  const grouped = new Map<string, {
    fixtureType: string;
    subOption: string;
    priority: number;
    points: AutoPlacementSeedPoint[];
    suggestedCount: number;
  }>();

  suggestions
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .forEach(suggestion => {
      const fixtureType = sanitizeFixtureType(suggestion.fixtureType);
      if (!fixtureType || !selectedFixtures.includes(fixtureType)) return;

      const normalizedSubOption = normalizeAutoSubOption(fixtureType, suggestion.subOption);
      const key = getAutoPlacementGroupKey(fixtureType, normalizedSubOption);
      const existing = grouped.get(key);
      const group = existing || {
        fixtureType,
        subOption: normalizedSubOption,
        priority: suggestion.priority,
        points: [] as AutoPlacementSeedPoint[],
        suggestedCount: 0,
      };

      group.priority = Math.min(group.priority, suggestion.priority);
      const positions = Array.isArray(suggestion.positions) ? suggestion.positions : [];
      if (positions.length > 0) {
        positions.forEach(position => {
          group.points.push({
            x: position.xPercent,
            y: position.yPercent,
            description: position.description || `${fixtureType} auto placement`,
            target: position.target || `${fixtureType} target`,
          });
        });
      }
      if (Number.isFinite(suggestion.count)) {
        group.suggestedCount += Math.max(0, Math.round(suggestion.count));
      }

      grouped.set(key, group);
    });

  const placements: SpatialFixturePlacement[] = [];
  [...grouped.values()]
    .sort((a, b) => a.priority - b.priority || a.fixtureType.localeCompare(b.fixtureType))
    .forEach((group, groupIdx) => {
      const explicitCount = fixtureCounts[group.subOption];
      if (
        typeof explicitCount !== 'number' &&
        group.points.length === 0 &&
        group.suggestedCount <= 0
      ) {
        return;
      }
      const desiredCount = typeof explicitCount === 'number'
        ? Math.max(0, Math.round(explicitCount))
        : Math.max(1, Math.round(group.suggestedCount || group.points.length || 1));

      const points = buildAutoSeedPointsForCount(group.points, desiredCount, group.fixtureType);
      points.forEach((point, idx) => {
        placements.push({
          id: `auto_${group.fixtureType}_${group.subOption}_${groupIdx + 1}_${idx + 1}`,
          fixtureType: group.fixtureType,
          subOption: group.subOption,
          horizontalPosition: point.x,
          verticalPosition: point.y,
          anchor: `auto_${group.fixtureType}_${idx + 1}`,
          description: point.description || point.target || `${group.fixtureType} auto placement`,
        });
      });
    });

  return { features: [], placements };
}

function buildGuideFixturesFromSpatialMap(spatialMap: SpatialMap): LightFixture[] {
  return spatialMap.placements
    .map((placement, index) => {
      const category = mapPipelineTypeToCategory(placement.fixtureType);
      if (!category) return null;

      const fixture: LightFixture = {
        id: `auto_guide_${placement.id || index}`,
        type: category,
        x: placement.horizontalPosition,
        y: placement.verticalPosition,
        intensity: 0.8,
        colorTemp: 3000,
        beamAngle: placement.fixtureType === 'path' ? 120 : 35,
        rotation: placement.rotation,
        beamLength: placement.beamLength,
      };

      if (placement.fixtureType === 'gutter') {
        fixture.gutterLineId = placement.gutterLineId;
        fixture.gutterLineX = placement.gutterLineX;
        fixture.gutterLineY = placement.gutterLineY;
        fixture.gutterMountDepthPercent = placement.gutterMountDepthPercent;
      }

      return fixture;
    })
    .filter((fixture): fixture is LightFixture => !!fixture);
}

function ensureAutoGutterRailPlacements(
  spatialMap: SpatialMap,
  gutterLines: GutterLine[] | undefined,
  fixtureCounts: Record<string, number | null>
): SpatialMap {
  if (!gutterLines || gutterLines.length === 0) return spatialMap;

  const otherPlacements = spatialMap.placements.filter(placement => placement.fixtureType !== 'gutter');
  const existingGutters = spatialMap.placements
    .filter(placement => placement.fixtureType === 'gutter')
    .sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  const requestedCount = fixtureCounts['gutterUpLights'];
  const desiredCount = typeof requestedCount === 'number'
    ? Math.max(0, Math.round(requestedCount))
    : Math.max(existingGutters.length, Math.max(2, Math.min(6, gutterLines.length * 2)));
  const retainedGutters = existingGutters.slice(0, desiredCount);
  const missingCount = Math.max(0, desiredCount - retainedGutters.length);
  if (missingCount === 0) {
    return {
      ...spatialMap,
      placements: [...otherPlacements, ...retainedGutters],
    };
  }

  const lineCount = gutterLines.length;
  const basePerLine = Math.floor(missingCount / lineCount);
  let remainder = missingCount % lineCount;
  const generated: SpatialFixturePlacement[] = [];

  gutterLines.forEach((line, lineIndex) => {
    const placementsForLine = basePerLine + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    if (placementsForLine <= 0) return;

    const depth = resolveRequestedGutterDepth(undefined, line);
    for (let i = 0; i < placementsForLine; i++) {
      const t = (i + 1) / (placementsForLine + 1);
      const lineX = line.startX + (line.endX - line.startX) * t;
      const lineY = line.startY + (line.endY - line.startY) * t;
      const mounted = applyGutterMountDepth(lineX, lineY, line, depth);

      generated.push({
        id: `auto_gutter_rail_${lineIndex + 1}_${retainedGutters.length + generated.length + 1}`,
        fixtureType: 'gutter',
        subOption: 'gutterUpLights',
        horizontalPosition: Number(mounted.mountX.toFixed(3)),
        verticalPosition: Number(mounted.mountY.toFixed(3)),
        anchor: `gutter_line_${lineIndex + 1}`,
        description: 'Auto rail placement from detected gutter line',
        gutterLineId: line.id,
        gutterLineX: Number(lineX.toFixed(3)),
        gutterLineY: Number(lineY.toFixed(3)),
        gutterMountDepthPercent: Number(mounted.appliedDepth.toFixed(3)),
      });
    }
  });

  if (generated.length === 0) return spatialMap;
  return {
    ...spatialMap,
    placements: [...otherPlacements, ...retainedGutters, ...generated],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2-STAGE PIPELINE: Deep Think → Nano Banana Pro
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assembles all reference data for Deep Think to generate its prompt.
 * This replaces the role of buildEnhancedPrompt/buildManualPrompt by providing
 * raw materials to Deep Think rather than assembling the prompt directly.
 */
function buildDeepThinkInput(
  mode: 'auto' | 'manual',
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null,
  spatialMap?: SpatialMap
): { systemPrompt: string; fixtureReference: string; userSelections: string; lightingParams: string; preferenceContext: string; spatialMapContext?: string } {

  // 1. Build fixture reference data (selected + prohibited)
  let fixtureReference = '';

  // Selected fixtures with full definitions
  fixtureReference += '### SELECTED FIXTURES (USER WANTS THESE)\n\n';
  selectedFixtures.forEach(fixtureId => {
    const fixtureType = FIXTURE_TYPES.find(f => f.id === fixtureId);
    if (!fixtureType) return;

    const subOpts = fixtureSubOptions[fixtureId] || [];

    fixtureReference += `#### ${fixtureType.label.toUpperCase()} (id: ${fixtureType.id})\n`;
    fixtureReference += `Description: ${fixtureType.description}\n`;
    fixtureReference += `Prompt guidance: ${fixtureType.positivePrompt}\n\n`;

    // Selected sub-options with counts
    subOpts.forEach(subOptId => {
      const subOpt = fixtureType.subOptions?.find(s => s.id === subOptId);
      if (!subOpt) return;
      const count = fixtureCounts[subOptId];
      const countStr = count !== null && count !== undefined
        ? `EXACTLY ${count} (user-specified, non-negotiable)`
        : 'AUTO (you determine optimal count based on property)';
      fixtureReference += `  Sub-option: ${subOpt.label} (id: ${subOpt.id})\n`;
      fixtureReference += `  Count: ${countStr}\n`;
      fixtureReference += `  Placement rules: ${subOpt.prompt}\n\n`;
    });

    // Non-selected sub-options (prohibited within this fixture type)
    const nonSelected = fixtureType.subOptions?.filter(s => !subOpts.includes(s.id)) || [];
    if (nonSelected.length > 0) {
      fixtureReference += `  PROHIBITED sub-options within ${fixtureType.label}:\n`;
      nonSelected.forEach(subOpt => {
        fixtureReference += `  - ${subOpt.label}: FORBIDDEN. ${subOpt.darkDescription || subOpt.negativePrompt}\n`;
      });
      fixtureReference += '\n';
    }
  });

  // Non-selected fixture types (complete prohibition)
  fixtureReference += '### PROHIBITED FIXTURES (MUST NOT APPEAR)\n\n';
  FIXTURE_TYPES.forEach(ft => {
    if (!selectedFixtures.includes(ft.id)) {
      fixtureReference += `- ${ft.label}: FORBIDDEN. ${ft.negativePrompt}\n`;
    }
  });

  // 2. Build user selections summary
  let userSelections = '### USER FIXTURE SELECTIONS\n';
  selectedFixtures.forEach(fId => {
    const ft = FIXTURE_TYPES.find(f => f.id === fId);
    if (!ft) return;
    const subs = fixtureSubOptions[fId] || [];
    userSelections += `- ${ft.label}: ${subs.map(s => {
      const count = fixtureCounts[s];
      return `${s}${count !== null && count !== undefined ? ` (EXACTLY ${count})` : ' (Auto)'}`;
    }).join(', ')}\n`;
  });

  // 3. Build lighting parameter descriptions
  let lightingParams = '### LIGHTING PARAMETERS\n';
  lightingParams += `Color Temperature: ${colorTemperaturePrompt}\n`;
  lightingParams += `Intensity: ${lightIntensity}%\n`;
  lightingParams += getIntensityDescription(lightIntensity) + '\n\n';
  lightingParams += `Beam Angle: ${beamAngle}°\n`;
  lightingParams += getBeamAngleDescription(beamAngle) + '\n';

  // 4. Preference context
  const preferenceContext = buildPreferenceContext(userPreferences);

  // 5. Spatial map context (manual mode)
  let spatialMapContext: string | undefined;
  if (spatialMap && spatialMap.placements.length > 0) {
    spatialMapContext = formatSpatialMapForPrompt(spatialMap);
  }

  // 6. Select system prompt based on mode
  const systemPrompt = mode === 'auto'
    ? DEEP_THINK_SYSTEM_PROMPT.autoMode
    : DEEP_THINK_SYSTEM_PROMPT.manualMode;

  return {
    systemPrompt,
    fixtureReference,
    userSelections,
    lightingParams,
    preferenceContext,
    spatialMapContext,
  };
}

/**
 * Stage 1 (New Pipeline): Deep Think analyzes the property photo and writes
 * the complete generation prompt for Nano Banana Pro.
 * Replaces: analyzePropertyArchitecture() + buildEnhancedPrompt() / buildManualPrompt()
 */
export async function deepThinkGeneratePrompt(
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  userPreferences?: UserPreferences | null,
  spatialMap?: SpatialMap,
  gradientImageBase64?: string,
  markedImageBase64?: string,
  isManualMode?: boolean
): Promise<DeepThinkOutput> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const mode = isManualMode ? 'manual' : 'auto';
  const input = buildDeepThinkInput(
    mode,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    spatialMap
  );

  // Assemble the full prompt for Deep Think
  let deepThinkPrompt = input.systemPrompt;
  deepThinkPrompt += '\n\n## FIXTURE REFERENCE DATA\n' + input.fixtureReference;
  deepThinkPrompt += '\n\n' + input.userSelections;
  deepThinkPrompt += '\n\n' + input.lightingParams;
  if (input.preferenceContext) {
    deepThinkPrompt += '\n\n' + input.preferenceContext;
  }
  if (input.spatialMapContext) {
    deepThinkPrompt += '\n\n## SPATIAL MAP DATA (exact coordinates for each fixture)\n' + input.spatialMapContext;
  }
  if (isManualMode && spatialMap?.placements.some(p => p.fixtureType === 'gutter')) {
    deepThinkPrompt += `\n\n## MANUAL RAIL OVERRIDE (HIGHEST PRIORITY)\n`;
    deepThinkPrompt += `- For this request, fixtureType="gutter" means USER-DEFINED LINE-MOUNTED UPLIGHT.\n`;
    deepThinkPrompt += `- These lights are NOT restricted to roof gutters and may be anywhere in the image.\n`;
    deepThinkPrompt += `- Keep every line-mounted light at its EXACT [X%, Y%] coordinate.\n`;
    deepThinkPrompt += `- Beam direction MUST follow each fixture's exact rotation value.\n`;
    deepThinkPrompt += `- Do not reinterpret, relocate, rebalance, or "improve" any line-mounted placement.\n`;
  }

  // Build image parts
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
  imageParts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });

  // For manual mode: include gradient/marker image so Deep Think can see positions
  if (gradientImageBase64) {
    imageParts.push({ inlineData: { data: gradientImageBase64, mimeType: imageMimeType } });
  } else if (markedImageBase64) {
    imageParts.push({ inlineData: { data: markedImageBase64, mimeType: imageMimeType } });
  }

  imageParts.push({ text: deepThinkPrompt });

  console.log(`[DeepThink] Sending to Deep Think (${mode} mode). Input prompt: ${deepThinkPrompt.length} chars`);

  return withRetry(async () => {
    const response = await withTimeout(
      ai.models.generateContent({
        model: ANALYSIS_MODEL_NAME, // gemini-3.1-pro-preview
        contents: { parts: imageParts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      }),
      ANALYSIS_TIMEOUT_MS,
      'Deep Think prompt generation timed out. Please try again.'
    );

    if (response.candidates?.[0]?.content?.parts) {
      // Skip thinking parts (thought: true) — grab the final output text
      const textPart = response.candidates[0].content.parts
        .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
        .pop();

      if (textPart?.text) {
        let jsonText = textPart.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          const output: DeepThinkOutput = JSON.parse(jsonText);
          console.log(`[DeepThink] Prompt generated. Length: ${output.prompt.length} chars, Fixtures: ${output.fixtureCount}`);
          if (output.analysisNotes) console.log(`[DeepThink] Notes: ${output.analysisNotes}`);
          return output;
        } catch (parseError) {
          console.warn('[DeepThink] JSON parse failed, using raw text as prompt:', parseError);
          // Fallback: treat entire text as the prompt
          return { prompt: textPart.text, analysisNotes: 'JSON parse failed, using raw text' };
        }
      }
    }
    throw new Error('Deep Think returned no output. Please try again.');
  }, 3, 2000);
}

/**
 * Stage 2 (New Pipeline): Thin wrapper around Nano Banana Pro API.
 * Takes the prompt from Deep Think + images and generates the night scene.
 */
export async function executeGeneration(
  imageBase64: string,
  imageMimeType: string,
  generationPrompt: string,
  aspectRatio?: string,
  prefixParts?: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }>,
  gradientImageBase64?: string,
  markedImageBase64?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Resize images to prevent timeouts
  const resizedImage = await resizeImageBase64(imageBase64, imageMimeType);
  const resizedGradient = gradientImageBase64
    ? await resizeImageBase64(gradientImageBase64, imageMimeType)
    : undefined;
  const resizedMarked = markedImageBase64
    ? await resizeImageBase64(markedImageBase64, imageMimeType)
    : undefined;

  // Build parts array
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];

  // Few-shot references first
  if (prefixParts && prefixParts.length > 0) {
    imageParts.push(...prefixParts);
  }

  // Base image
  imageParts.push({ inlineData: { data: resizedImage, mimeType: imageMimeType } });

  // Gradient or marker image
  if (resizedGradient) {
    imageParts.push({ inlineData: { data: resizedGradient, mimeType: imageMimeType } });
  } else if (resizedMarked) {
    imageParts.push({ inlineData: { data: resizedMarked, mimeType: imageMimeType } });
  }

  // The prompt from Deep Think
  imageParts.push({ text: generationPrompt });

  console.log(`[executeGeneration] Sending to Nano Banana Pro. Prompt: ${generationPrompt.length} chars, Images: ${imageParts.filter(p => 'inlineData' in p).length}`);

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME, // gemini-3-pro-image-preview
      contents: { parts: imageParts },
      config: {
        temperature: 0.1,
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: buildImageConfig(aspectRatio),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    }),
    API_TIMEOUT_MS,
    'Image generation timed out. Please try again.'
  );

  // Extract image from response
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    // Check for text-only response (blocked or error)
    const textPart = response.candidates[0].content.parts.find((p: { text?: string }) => p.text);
    if (textPart && 'text' in textPart && textPart.text) {
      throw new Error(`Generation blocked: ${textPart.text}`);
    }
  }

  // Check finish reason
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Generation ended with reason: ${finishReason}`);
  }

  throw new Error('No image generated. The model returned an empty response.');
}

/**
 * Validates manual placements before generation.
 * Checks fixture types, coordinate ranges, and counts.
 */
const GUTTER_LINE_TOLERANCE_PERCENT = 2.5;
const GUTTER_VERIFICATION_TOLERANCE_PERCENT = 4.0;
const DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT = 0.6;
const MIN_GUTTER_MOUNT_DEPTH_PERCENT = 0.2;
const MAX_GUTTER_MOUNT_DEPTH_PERCENT = 2.0;
const GUTTER_MOUNT_DEPTH_TOLERANCE_PERCENT = 0.9;
const GUTTER_ABOVE_LINE_TOLERANCE_PERCENT = 0.2;
const MAX_GUTTER_RETRY_ATTEMPTS = 1;

function projectPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; distance: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return {
      x: x1,
      y: y1,
      distance: Math.sqrt((px - x1) ** 2 + (py - y1) ** 2),
    };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return { x, y, distance: Math.sqrt((px - x) ** 2 + (py - y) ** 2) };
}

function getDownwardNormalForLine(line: GutterLine): { nx: number; ny: number } | null {
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  const n1 = { nx: -dy / len, ny: dx / len };
  const n2 = { nx: dy / len, ny: -dx / len };
  return n1.ny >= n2.ny ? n1 : n2;
}

function applyGutterMountDepth(
  lineX: number,
  lineY: number,
  line: GutterLine,
  depthPercent: number
): { mountX: number; mountY: number; appliedDepth: number } {
  const normal = getDownwardNormalForLine(line);
  if (!normal) {
    return { mountX: lineX, mountY: lineY, appliedDepth: 0 };
  }

  const clampedDepth = Math.max(MIN_GUTTER_MOUNT_DEPTH_PERCENT, Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, depthPercent));
  const mountX = Math.max(0, Math.min(100, lineX + normal.nx * clampedDepth));
  const mountY = Math.max(0, Math.min(100, lineY + normal.ny * clampedDepth));
  return { mountX, mountY, appliedDepth: clampedDepth };
}

function resolveRequestedGutterDepth(
  explicitDepth: number | undefined,
  line?: GutterLine
): number {
  const rawDepth = typeof explicitDepth === 'number'
    ? explicitDepth
    : (typeof line?.mountDepthPercent === 'number' ? line.mountDepthPercent : DEFAULT_GUTTER_MOUNT_DEPTH_PERCENT);
  return Math.max(MIN_GUTTER_MOUNT_DEPTH_PERCENT, Math.min(MAX_GUTTER_MOUNT_DEPTH_PERCENT, rawDepth));
}

function resolveGutterLine(
  placement: SpatialFixturePlacement,
  gutterLines?: GutterLine[]
): { x: number; y: number; distance: number; line: GutterLine } | null {
  if (!gutterLines || gutterLines.length === 0) return null;

  if (placement.gutterLineId) {
    const explicitLine = gutterLines.find(line => line.id === placement.gutterLineId);
    if (explicitLine) {
      const projected = projectPointToSegment(
        placement.horizontalPosition,
        placement.verticalPosition,
        explicitLine.startX,
        explicitLine.startY,
        explicitLine.endX,
        explicitLine.endY
      );
      return { ...projected, line: explicitLine };
    }
  }

  return findNearestGutterProjection(placement.horizontalPosition, placement.verticalPosition, gutterLines);
}

function getSignedDepthFromLine(
  x: number,
  y: number,
  lineProjection: { x: number; y: number; line: GutterLine }
): number {
  const normal = getDownwardNormalForLine(lineProjection.line);
  if (!normal) return 0;
  const vx = x - lineProjection.x;
  const vy = y - lineProjection.y;
  return vx * normal.nx + vy * normal.ny;
}

function findNearestGutterProjection(
  x: number,
  y: number,
  gutterLines?: GutterLine[]
): { x: number; y: number; distance: number; line: GutterLine } | null {
  if (!gutterLines || gutterLines.length === 0) return null;
  let best: { x: number; y: number; distance: number; line: GutterLine } | null = null;
  for (const line of gutterLines) {
    const projected = projectPointToSegment(
      x,
      y,
      line.startX,
      line.startY,
      line.endX,
      line.endY
    );
    if (!best || projected.distance < best.distance) {
      best = { ...projected, line };
    }
  }
  return best;
}

function normalizeGutterPlacements(
  spatialMap: SpatialMap,
  gutterLines?: GutterLine[]
): { spatialMap: SpatialMap; snappedCount: number } {
  if (!gutterLines || gutterLines.length === 0) {
    return { spatialMap, snappedCount: 0 };
  }

  let snappedCount = 0;
  const placements = spatialMap.placements.map(p => {
    if (p.fixtureType !== 'gutter') return p;
    const nearest = resolveGutterLine(p, gutterLines);
    if (!nearest) return p;

    const preferredLineX = typeof p.gutterLineX === 'number' ? p.gutterLineX : nearest.x;
    const preferredLineY = typeof p.gutterLineY === 'number' ? p.gutterLineY : nearest.y;
    const lineProjection = projectPointToSegment(
      preferredLineX,
      preferredLineY,
      nearest.line.startX,
      nearest.line.startY,
      nearest.line.endX,
      nearest.line.endY
    );
    const requestedDepth = resolveRequestedGutterDepth(p.gutterMountDepthPercent, nearest.line);
    const mounted = applyGutterMountDepth(lineProjection.x, lineProjection.y, nearest.line, requestedDepth);

    const nextX = Number(mounted.mountX.toFixed(3));
    const nextY = Number(mounted.mountY.toFixed(3));
    if (
      Math.abs(nextX - p.horizontalPosition) > 0.01 ||
      Math.abs(nextY - p.verticalPosition) > 0.01
    ) {
      snappedCount++;
    }

    return {
      ...p,
      horizontalPosition: nextX,
      verticalPosition: nextY,
      gutterLineId: nearest.line.id,
      gutterLineX: Number(lineProjection.x.toFixed(3)),
      gutterLineY: Number(lineProjection.y.toFixed(3)),
      gutterMountDepthPercent: Number(mounted.appliedDepth.toFixed(3)),
      distanceToGutter: Number(nearest.distance.toFixed(3)),
    };
  });

  return {
    spatialMap: {
      ...spatialMap,
      placements,
    },
    snappedCount,
  };
}

function normalizeGutterGuideFixtures(
  fixtures: LightFixture[] | undefined,
  gutterLines?: GutterLine[]
): { fixtures: LightFixture[] | undefined; snappedCount: number } {
  if (!fixtures || fixtures.length === 0 || !gutterLines || gutterLines.length === 0) {
    return { fixtures, snappedCount: 0 };
  }

  let snappedCount = 0;
  const normalizedFixtures = fixtures.map(fixture => {
    if (fixture.type !== 'gutter_uplight') return fixture;

    const nearest = fixture.gutterLineId
      ? (() => {
          const explicitLine = gutterLines.find(line => line.id === fixture.gutterLineId);
          if (!explicitLine) return null;
          const projected = projectPointToSegment(
            fixture.x,
            fixture.y,
            explicitLine.startX,
            explicitLine.startY,
            explicitLine.endX,
            explicitLine.endY
          );
          return { ...projected, line: explicitLine };
        })()
      : findNearestGutterProjection(fixture.x, fixture.y, gutterLines);
    if (!nearest) return fixture;

    const preferredLineX = typeof fixture.gutterLineX === 'number' ? fixture.gutterLineX : nearest.x;
    const preferredLineY = typeof fixture.gutterLineY === 'number' ? fixture.gutterLineY : nearest.y;
    const lineProjection = projectPointToSegment(
      preferredLineX,
      preferredLineY,
      nearest.line.startX,
      nearest.line.startY,
      nearest.line.endX,
      nearest.line.endY
    );
    const requestedDepth = resolveRequestedGutterDepth(fixture.gutterMountDepthPercent, nearest.line);
    const mounted = applyGutterMountDepth(lineProjection.x, lineProjection.y, nearest.line, requestedDepth);
    const nextX = Number(mounted.mountX.toFixed(3));
    const nextY = Number(mounted.mountY.toFixed(3));
    if (Math.abs(nextX - fixture.x) > 0.01 || Math.abs(nextY - fixture.y) > 0.01) {
      snappedCount++;
    }

    return {
      ...fixture,
      x: nextX,
      y: nextY,
      gutterLineId: nearest.line.id,
      gutterLineX: Number(lineProjection.x.toFixed(3)),
      gutterLineY: Number(lineProjection.y.toFixed(3)),
      gutterMountDepthPercent: Number(mounted.appliedDepth.toFixed(3)),
    };
  });

  return { fixtures: normalizedFixtures, snappedCount };
}

const VALID_FIXTURE_TYPES = new Set(['up', 'gutter', 'path', 'well', 'hardscape', 'soffit', 'coredrill']);

function validateManualPlacements(
  spatialMap: SpatialMap,
  gutterLines?: GutterLine[]
): {
  valid: boolean;
  errors: string[];
  summary: { type: string; count: number; positions: string[] }[];
} {
  const errors: string[] = [];
  const countByType = new Map<string, { count: number; positions: string[] }>();

  // Check: must have at least one placement
  if (!spatialMap.placements || spatialMap.placements.length === 0) {
    errors.push('No fixture placements found â€” nothing to generate');
    return { valid: false, errors, summary: [] };
  }

  spatialMap.placements.forEach((p, i) => {
    const idx = i + 1;

    // A. Validate fixture type
    if (!p.fixtureType || !VALID_FIXTURE_TYPES.has(p.fixtureType)) {
      errors.push(`Fixture #${idx}: unknown type "${p.fixtureType}" (valid: ${[...VALID_FIXTURE_TYPES].join(', ')})`);
    }

    // B. Validate coordinates exist and are numbers
    if (typeof p.horizontalPosition !== 'number' || isNaN(p.horizontalPosition)) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): invalid X coordinate (${p.horizontalPosition})`);
    } else if (p.horizontalPosition < 0 || p.horizontalPosition > 100) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): X coordinate out of range: ${p.horizontalPosition.toFixed(1)}% (must be 0-100)`);
    }

    if (typeof p.verticalPosition !== 'number' || isNaN(p.verticalPosition)) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): invalid Y coordinate (${p.verticalPosition})`);
    } else if (p.verticalPosition < 0 || p.verticalPosition > 100) {
      errors.push(`Fixture #${idx} (${p.fixtureType}): Y coordinate out of range: ${p.verticalPosition.toFixed(1)}% (must be 0-100)`);
    }

    // C. Gutter-specific validation
    if (p.fixtureType === 'gutter') {
      if (p.subOption && p.subOption !== 'gutterUpLights') {
        errors.push(`Fixture #${idx} (gutter): invalid sub-option "${p.subOption}" (expected gutterUpLights)`);
      }

      const nearest = findNearestGutterProjection(p.horizontalPosition, p.verticalPosition, gutterLines);
      if (gutterLines && gutterLines.length > 0 && (!nearest || nearest.distance > GUTTER_LINE_TOLERANCE_PERCENT)) {
        const dist = nearest ? nearest.distance.toFixed(2) : 'n/a';
        errors.push(`Fixture #${idx} (gutter): not on a user-defined rail (distance ${dist}%, tolerance ${GUTTER_LINE_TOLERANCE_PERCENT}%)`);
      }
    }

    // D. Accumulate counts by type
    if (p.fixtureType) {
      const entry = countByType.get(p.fixtureType) || { count: 0, positions: [] };
      entry.count++;
      if (typeof p.horizontalPosition === 'number' && typeof p.verticalPosition === 'number') {
        entry.positions.push(`[${p.horizontalPosition.toFixed(1)}%, ${p.verticalPosition.toFixed(1)}%]`);
      }
      countByType.set(p.fixtureType, entry);
    }
  });

  // Build summary
  const summary = [...countByType.entries()].map(([type, data]) => ({
    type,
    count: data.count,
    positions: data.positions,
  }));

  const totalCount = spatialMap.placements.length;
  const summaryStr = summary.map(s => `${s.count}x ${s.type.toUpperCase()}`).join(', ');
  console.log(`[Manual Mode] Validation: ${summaryStr} = ${totalCount} total`);
  summary.forEach(s => {
    console.log(`  ${s.type.toUpperCase()}: ${s.count} fixtures at ${s.positions.join(', ')}`);
  });

  return { valid: errors.length === 0, errors, summary };
}

/**
 * Post-generation verification: sends the generated image back to Gemini
 * for text-only analysis to count fixtures and compare against expected.
 * Returns a verification result (does NOT retry â€” just informs).
 */
interface DetectedFixture {
  type: string;
  x: number;
  y: number;
  direction?: string;
}

function isGutterLikeType(type: string): boolean {
  const normalized = (type || '').toLowerCase();
  return normalized.includes('gutter') || (normalized.includes('roof') && normalized.includes('up'));
}

function normalizeDetectedFixtureType(type: string): string | null {
  const normalized = (type || '').toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes('soffit') ||
    normalized.includes('eave') ||
    normalized.includes('downlight')
  ) return 'soffit';
  if (
    normalized.includes('gutter') ||
    (normalized.includes('roof') && normalized.includes('up'))
  ) return 'gutter';
  if (normalized.includes('path') || normalized.includes('walk')) return 'path';
  if (normalized.includes('well')) return 'well';
  if (normalized.includes('hardscape') || normalized.includes('step')) return 'hardscape';
  if (normalized.includes('core') || normalized.includes('drill')) return 'coredrill';
  if (normalized.includes('holiday') || normalized.includes('string')) return 'holiday';
  if (normalized.includes('up')) return 'up';

  return null;
}

function evaluateUnexpectedFixtureTypes(
  expectedPlacements: SpatialFixturePlacement[],
  detectedFixtures: DetectedFixture[]
): { verified: boolean; details: string; unexpectedTypes: string[] } {
  const expectedTypes = new Set(expectedPlacements.map(p => p.fixtureType));
  const unexpected = new Set<string>();

  for (const fixture of detectedFixtures) {
    const canonical = normalizeDetectedFixtureType(fixture.type);
    if (!canonical) continue;
    if (!expectedTypes.has(canonical)) {
      unexpected.add(canonical);
    }
  }

  const unexpectedTypes = [...unexpected];
  if (unexpectedTypes.length > 0) {
    return {
      verified: false,
      details: `Unexpected fixture types detected: ${unexpectedTypes.join(', ')}.`,
      unexpectedTypes,
    };
  }

  return {
    verified: true,
    details: 'No unexpected fixture types detected.',
    unexpectedTypes: [],
  };
}

function evaluateFixtureTypeCountVerification(
  expectedPlacements: SpatialFixturePlacement[],
  detectedFixtures: DetectedFixture[]
): { verified: boolean; details: string; mismatches: string[] } {
  const expectedCounts = new Map<string, number>();
  expectedPlacements.forEach(placement => {
    expectedCounts.set(placement.fixtureType, (expectedCounts.get(placement.fixtureType) || 0) + 1);
  });

  const detectedCounts = new Map<string, number>();
  detectedFixtures.forEach(fixture => {
    const canonical = normalizeDetectedFixtureType(fixture.type);
    if (!canonical || !expectedCounts.has(canonical)) return;
    detectedCounts.set(canonical, (detectedCounts.get(canonical) || 0) + 1);
  });

  const mismatches: string[] = [];
  expectedCounts.forEach((expectedCount, type) => {
    const detectedCount = detectedCounts.get(type) || 0;
    if (detectedCount !== expectedCount) {
      mismatches.push(`${type}: expected ${expectedCount}, detected ${detectedCount}`);
    }
  });

  if (mismatches.length > 0) {
    return {
      verified: false,
      details: `Type count mismatches: ${mismatches.join(' | ')}`,
      mismatches,
    };
  }

  return {
    verified: true,
    details: 'Per-type fixture counts matched expected values.',
    mismatches: [],
  };
}

function evaluateGutterVerification(
  expectedPlacements: SpatialFixturePlacement[],
  detectedFixtures: DetectedFixture[],
  gutterLines?: GutterLine[]
): { verified: boolean; details: string } {
  const expectedGutters = expectedPlacements.filter(p => p.fixtureType === 'gutter');
  if (expectedGutters.length === 0) {
    return { verified: true, details: 'No gutter fixtures expected.' };
  }

  const detectedGutters = detectedFixtures.filter(f => isGutterLikeType(f.type));
  if (detectedGutters.length < expectedGutters.length) {
    return {
      verified: false,
      details: `Line-mounted fixture mismatch: expected ${expectedGutters.length}, detected ${detectedGutters.length}.`,
    };
  }

  const usedDetected = new Set<number>();
  const matched: Array<{ expected: SpatialFixturePlacement; actual: DetectedFixture; distance: number }> = [];

  for (const expected of expectedGutters) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < detectedGutters.length; i++) {
      if (usedDetected.has(i)) continue;
      const actual = detectedGutters[i];
      const dist = Math.sqrt(
        (expected.horizontalPosition - actual.x) ** 2 +
        (expected.verticalPosition - actual.y) ** 2
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      return { verified: false, details: 'Unable to match all expected gutter fixtures.' };
    }
    usedDetected.add(bestIdx);
    matched.push({ expected, actual: detectedGutters[bestIdx], distance: bestDist });
  }

  const maxPosDrift = Math.max(...matched.map(m => m.distance));
  const avgPosDrift = matched.reduce((sum, m) => sum + m.distance, 0) / matched.length;
  if (maxPosDrift > GUTTER_VERIFICATION_TOLERANCE_PERCENT) {
    return {
      verified: false,
      details: `Line-mounted fixture position drift too high (max ${maxPosDrift.toFixed(2)}%, avg ${avgPosDrift.toFixed(2)}%).`,
    };
  }

  if (gutterLines && gutterLines.length > 0) {
    const maxLineDrift = Math.max(
      ...matched.map(m => {
        const nearest = findNearestGutterProjection(m.actual.x, m.actual.y, gutterLines);
        return nearest ? nearest.distance : 100;
      })
    );
    if (maxLineDrift > GUTTER_VERIFICATION_TOLERANCE_PERCENT) {
      return {
        verified: false,
        details: `Detected line-mounted fixtures are off the user-defined rail (max ${maxLineDrift.toFixed(2)}%).`,
      };
    }
  }

  return {
    verified: true,
    details: `Line-mounted fixtures verified (max drift ${maxPosDrift.toFixed(2)}%, avg drift ${avgPosDrift.toFixed(2)}%).`,
  };
}

async function verifyGeneratedImage(
  generatedImageBase64: string,
  imageMimeType: string,
  expectedPlacements: SpatialFixturePlacement[],
  gutterLines?: GutterLine[]
): Promise<{ verified: boolean; confidence: number; details: string; gutterVerified: boolean; unexpectedTypes: string[] }> {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const expectedCount = expectedPlacements.length;
    const expectedTypes = [...new Set(expectedPlacements.map(p => p.fixtureType))];

    const verificationPrompt = `You are analyzing a nighttime landscape lighting photograph.
Count EVERY visible light source or illuminated fixture in this image.

For each light source found, report:
- Type (uplight, gutter light, path light, well light, hardscape/step light, soffit downlight, core-drill light)
- Approximate position as [X%, Y%] where 0%,0% is top-left
- Beam direction (up, down, left, right, up-right, up-left, down-right, down-left, or unknown)
- For gutter classification: label as "gutter light" for user-defined line-mounted uplights (they are not restricted to roof edges and may appear anywhere in the image).

EXPECTED: ${expectedCount} fixtures of types: ${expectedTypes.join(', ')}

Respond in this EXACT JSON format (no markdown, no code blocks):
{"count": <number>, "fixtures": [{"type": "<type>", "x": <number>, "y": <number>, "direction": "<direction|unknown>"}], "confidence": <0-100>}`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: generatedImageBase64, mimeType: imageMimeType } },
          { text: verificationPrompt }
        ],
      },
      config: {
        temperature: 0.1,
      },
    });

    const text = response.text?.trim() || '';
    console.log('[Manual Mode] Verification raw response:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Manual Mode] Verification: Could not parse response as JSON');
      return {
        verified: false,
        confidence: 0,
        details: 'Could not parse verification response',
        gutterVerified: false,
        unexpectedTypes: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { count?: number; fixtures?: DetectedFixture[]; confidence?: number };
    const fixtures = Array.isArray(parsed.fixtures) ? parsed.fixtures : [];
    const actualCount = typeof parsed.count === 'number' ? parsed.count : fixtures.length;
    const confidence = parsed.confidence || 0;
    const countMatch = actualCount === expectedCount;
    const gutterVerification = evaluateGutterVerification(expectedPlacements, fixtures, gutterLines);
    const typeVerification = evaluateUnexpectedFixtureTypes(expectedPlacements, fixtures);
    const typeCountVerification = evaluateFixtureTypeCountVerification(expectedPlacements, fixtures);
    const verified = countMatch && gutterVerification.verified && typeVerification.verified && typeCountVerification.verified;

    const details = `Expected ${expectedCount} fixtures, found ${actualCount}. Confidence: ${confidence}%. Types expected: [${expectedTypes.join(', ')}]. ${typeCountVerification.details} ${gutterVerification.details} ${typeVerification.details}`;

    if (verified) {
      console.log(`[Manual Mode] Verification PASSED: ${actualCount}/${expectedCount} fixtures confirmed (${confidence}% confidence). ${typeCountVerification.details} ${gutterVerification.details} ${typeVerification.details}`);
    } else {
      console.warn(`[Manual Mode] Verification WARNING: Expected ${expectedCount} fixtures but found ${actualCount} (${confidence}% confidence). ${typeCountVerification.details} ${gutterVerification.details} ${typeVerification.details}`);
      if (fixtures) {
        fixtures.forEach((f, i) => {
          console.warn(`  Found fixture ${i + 1}: ${f.type} at [${f.x}%, ${f.y}%]`);
        });
      }
    }

    return {
      verified,
      confidence,
      details,
      gutterVerified: gutterVerification.verified,
      unexpectedTypes: typeVerification.unexpectedTypes,
    };
  } catch (error) {
    console.warn('[Manual Mode] Verification failed (non-blocking):', error);
    return {
      verified: false,
      confidence: 0,
      details: `Verification error: ${error}`,
      gutterVerified: false,
      unexpectedTypes: [],
    };
  }
}

/**
 * PASS 1: Convert daytime photo to clean nighttime base with NO lights.
 * Result is cached by the caller so subsequent generations skip this step.
 */
export async function generateNightBase(
  imageBase64: string,
  imageMimeType: string,
  aspectRatio?: string
): Promise<string> {
  console.log('[Pass 1] Generating nighttime base (no lights)...');

  const prompt = `Convert this daytime photograph into a photorealistic nighttime scene.

REQUIREMENTS:
- Deep 1AM darkness with true black sky (#000000 to #0A0A0A) and ONE realistic full moon
- No stylized stars, fantasy sky effects, or dramatic cloud glows
- The house and landscaping should be barely visible in deep shadow
- Do NOT add ANY lighting fixtures, landscape lights, porch lights, sconces, or any artificial light sources
- Every window MUST be completely dark with no interior glow
- Preserve the EXACT framing, composition, architecture, and all objects pixel-perfect
- Do NOT add, remove, or modify architectural elements, trees, bushes, or hardscape
- The ONLY change is time-of-day conversion: daytime to deep nighttime`;

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const resized = await resizeImageBase64(imageBase64, imageMimeType);

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [
        { inlineData: { data: resized, mimeType: imageMimeType } },
        { text: prompt }
      ]},
      config: {
        temperature: 0.1,
        imageConfig: buildImageConfig(aspectRatio),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    }),
    API_TIMEOUT_MS,
    'Night base generation timed out.'
  );

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        console.log('[Pass 1] Nighttime base generated successfully.');
        return part.inlineData.data;
      }
    }
  }
  throw new Error('Night base generation returned no image.');
}

function buildManualHybridGlowOptions(
  lightIntensity: number,
  beamAngle: number
): GlowRenderOptions {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const normalizedIntensity = clamp(lightIntensity / 100, 0, 1);
  const intensityScale = 0.65 + normalizedIntensity * 0.75;

  return {
    intensityScale,
    beamAngleDeg: clamp(beamAngle, 10, 120),
  };
}

function buildManualHybridRefinementPrompt(basePrompt: string): string {
  return `${basePrompt}

=== HYBRID PIPELINE LOCK (HIGHEST PRIORITY) ===
You are refining a deterministic fixture pre-composite:
- The first image already contains the exact fixture anchor points and beam directions.
- DO NOT move fixtures, DO NOT remove fixtures, DO NOT add extra fixtures, DO NOT shift beam headings.
- Keep every fixture coordinate and rotation exactly as-is.
- Improve only photoreal blending: material interaction, falloff softness, hotspot shaping, subtle bounce.
- Preserve architecture and composition pixel-for-pixel.
- Remove all guide artifacts, labels, and UI traces.
`;
}

function buildGutterCorrectionPrompt(
  basePrompt: string,
  placements: SpatialFixturePlacement[],
  gutterLines?: GutterLine[],
  unexpectedTypes: string[] = []
): string {
  const gutterPlacements = placements
    .filter(p => p.fixtureType === 'gutter')
    .sort((a, b) => a.horizontalPosition - b.horizontalPosition);

  if (gutterPlacements.length === 0 && unexpectedTypes.length === 0) return basePrompt;

  let correction = '\n\n=== CORRECTION PASS: LINE-MOUNTED PLACEMENT LOCK ===\n';
  correction += 'The previous output failed verification. Fix fixture compliance exactly without changing architecture.\n';
  correction += 'MANDATORY RULES:\n';
  correction += '- Keep exact fixture count and preserve all non-light pixels.\n';
  correction += '- Do not add or remove any fixture type.\n';
  correction += '- Final image must contain zero visible guide annotations, labels, coordinates, or UI overlays.\n';
  if (unexpectedTypes.length > 0) {
    correction += 'REMOVE UNEXPECTED FIXTURE TYPES:\n';
    unexpectedTypes.forEach(type => {
      correction += `- Remove ALL ${type.toUpperCase()} fixtures and light effects.\n`;
    });
    if (unexpectedTypes.includes('soffit')) {
      correction += '- Soffits/eaves must be pitch black with zero downlighting.\n';
    }
  }
  if (gutterPlacements.length > 0) {
    correction += '- Treat fixtureType=gutter as USER-DEFINED LINE-MOUNTED uplights (not literal roof gutters).\n';
    correction += '- They may appear anywhere in the image where the user drew rails.\n';
    correction += '- Keep EACH fixture at its exact coordinate and honor its exact beam direction (rotation).\n';
    correction += 'EXPECTED LINE-MOUNTED FIXTURES (exact coordinates):\n';
    gutterPlacements.forEach((p, i) => {
      const lineInfo =
        typeof p.gutterLineX === 'number' && typeof p.gutterLineY === 'number'
          ? `, rail=[${p.gutterLineX.toFixed(2)}%, ${p.gutterLineY.toFixed(2)}%]`
          : '';
      const depthInfo =
        typeof p.gutterMountDepthPercent === 'number'
          ? `, offset=${p.gutterMountDepthPercent.toFixed(2)}%`
          : '';
      const rotationInfo = typeof p.rotation === 'number'
        ? `, rotation=${(((p.rotation % 360) + 360) % 360).toFixed(1)}°`
        : '';
      correction += `- RAIL LIGHT ${i + 1}: mount=[${p.horizontalPosition.toFixed(2)}%, ${p.verticalPosition.toFixed(2)}%]${lineInfo}${depthInfo}${rotationInfo}\n`;
    });

    if (gutterLines && gutterLines.length > 0) {
      correction += 'REFERENCE USER-DRAWN RAILS:\n';
      gutterLines.forEach((line, i) => {
        correction += `- RAIL ${i + 1}: [${line.startX.toFixed(2)}%, ${line.startY.toFixed(2)}%] -> [${line.endX.toFixed(2)}%, ${line.endY.toFixed(2)}%]\n`;
      });
    }
    correction += 'FINAL CHECK: All line-mounted fixtures must remain within 4% of expected mount coordinates.\n';
  }
  correction += 'FINAL CHECK: Output must match selected fixture types only and contain zero unselected fixture types.\n';
  return basePrompt + correction;
}

/**
 * Manual-mode generation (TWO-PASS + Deep Think).
 * Pass 1: Convert daytime to nighttime (cached via nightBaseBase64 param).
 * Deep Think: Analyze gradient/marker image + spatial map, write complete prompt.
 * Pass 2: Nano Banana Pro generates lit scene using Deep Think's prompt.
 */
export const generateManualScene = async (
  imageBase64: string,
  imageMimeType: string,
  spatialMap: SpatialMap,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  _targetRatio: string,
  userPreferences?: UserPreferences | null,
  onStageUpdate?: (stage: string) => void,
  fixtures?: LightFixture[],
  nightBaseBase64?: string,
  gutterLines?: GutterLine[],
  modificationRequest?: string
): Promise<{ result: string; nightBase: string }> => {
  console.log('[Manual Mode] Starting Deep Think manual generation...');
  console.log(`[Manual Mode] ${spatialMap.placements.length} fixtures to render`);
  console.log(`[Manual Mode] Night base cached: ${!!nightBaseBase64}`);

  const normalized = normalizeGutterPlacements(spatialMap, gutterLines);
  const normalizedSpatialMap = normalized.spatialMap;
  if (normalized.snappedCount > 0) {
    console.log(`[Manual Mode] Normalized ${normalized.snappedCount} gutter fixture(s) onto gutter lines before generation.`);
  }
  const normalizedGuideFixtures = normalizeGutterGuideFixtures(fixtures, gutterLines);
  if (normalizedGuideFixtures.snappedCount > 0) {
    console.log(`[Manual Mode] Normalized ${normalizedGuideFixtures.snappedCount} gutter guide fixture(s) for gradient hints.`);
  }

  // Validate placements before spending an API call
  const validation = validateManualPlacements(normalizedSpatialMap, gutterLines);
  if (!validation.valid) {
    console.error('[Manual Mode] Validation FAILED:', validation.errors);
    throw new Error(`Manual placement validation failed:\n${validation.errors.join('\n')}`);
  }

  // Pass 1: Nighttime conversion (cached)
  // Manual mode must preserve the source composition used for placement coordinates.
  // Forcing a preset aspect ratio (e.g. 4:3 or 16:9) can crop/reframe and shift fixtures.
  const manualAspectRatio: string | undefined = undefined;
  let nightBase: string;
  if (nightBaseBase64) {
    console.log('[Pass 1] Using cached nighttime base.');
    nightBase = nightBaseBase64;
  } else {
    onStageUpdate?.('converting');
    nightBase = await generateNightBase(imageBase64, imageMimeType, manualAspectRatio);
  }

  // Generate gradient/marker overlays using the same composition that pass-2 will edit.
  // This avoids coordinate drift between guide image and base image.
  onStageUpdate?.('generating');

  const hasGradients = !!(normalizedGuideFixtures.fixtures && normalizedGuideFixtures.fixtures.length > 0);
  let gradientImage: string | undefined;
  let markedImage: string | undefined;
  const guideSourceImage = nightBase;
  const guideSourceMimeType = imageMimeType;

  if (hasGradients) {
    console.log(`[Manual Mode] Painting directional light gradients for ${normalizedGuideFixtures.fixtures!.length} fixtures...`);
    const guideOptions = MODEL_GUIDE_DEBUG ? undefined : CLEAN_MODEL_GUIDE_OPTIONS;
    gradientImage = await paintLightGradients(
      guideSourceImage,
      normalizedGuideFixtures.fixtures!,
      guideSourceMimeType,
      gutterLines,
      guideOptions
    );
    console.log(`[Manual Mode] ${MODEL_GUIDE_DEBUG ? 'Debug' : 'Clean'} gradient guide map painted.`);
  } else {
    console.log('[Manual Mode] Drawing fixture markers...');
    const markerOptions = MODEL_GUIDE_DEBUG ? undefined : CLEAN_MODEL_MARKER_OPTIONS;
    markedImage = await drawFixtureMarkers(
      guideSourceImage,
      normalizedSpatialMap,
      guideSourceMimeType,
      markerOptions
    );
    console.log(`[Manual Mode] ${MODEL_GUIDE_DEBUG ? 'Debug' : 'Clean'} marker guide map drawn.`);
  }

  // Load few-shot reference examples for the selected fixture types
  const fixtureTypes = [...new Set(normalizedSpatialMap.placements.map(p => p.fixtureType))];
  let referenceParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];
  try {
    referenceParts = await buildReferenceParts(fixtureTypes);
    if (referenceParts.length > 0) {
      console.log(`[Manual Mode] Injecting ${referenceParts.length} reference parts for types: ${fixtureTypes.join(', ')}`);
    }
  } catch (err) {
    console.warn('[Manual Mode] Reference loading failed (non-blocking):', err);
  }

  // Deep Think: Analyze gradient/marker image + spatial map, write the complete prompt
  onStageUpdate?.('analyzing');
  console.log('[Manual Mode] Deep Think analyzing placements + writing prompt...');
  const deepThinkResult = await deepThinkGeneratePrompt(
    nightBase,
    imageMimeType,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    normalizedSpatialMap,
    gradientImage,
    markedImage,
    true
  );
  console.log(`[Manual Mode] Deep Think complete. Prompt length: ${deepThinkResult.prompt.length} chars`);
  const modificationSection = modificationRequest?.trim()
    ? `\n\nCRITICAL MODIFICATION REQUEST: ${modificationRequest.trim()}\nKeep all fixture coordinates and beam directions exactly as specified above while applying this change.\n`
    : '';
  const lockedPrompt = `${deepThinkResult.prompt}${modificationSection}\n${buildPhotorealismLockAddendum()}`;
  let generationBaseImage = nightBase;
  let generationBasePrompt = lockedPrompt;
  let hybridSeedApplied = false;

  if (MANUAL_HYBRID_SEED_ENABLED && normalizedSpatialMap.placements.length > 0) {
    try {
      const hybridGlowOptions = buildManualHybridGlowOptions(lightIntensity, beamAngle);
      generationBaseImage = await renderFixtureGlows(
        nightBase,
        normalizedSpatialMap,
        imageMimeType,
        hybridGlowOptions
      );
      generationBasePrompt = buildManualHybridRefinementPrompt(lockedPrompt);
      hybridSeedApplied = true;
      console.log('[Manual Mode] Hybrid deterministic seed generated (exact placement lock + realism refinement).');
    } catch (seedError) {
      generationBaseImage = nightBase;
      generationBasePrompt = lockedPrompt;
      hybridSeedApplied = false;
      console.warn('[Manual Mode] Hybrid deterministic seed failed, falling back to night base prompt-only pass:', seedError);
    }
  }

  // Pass 2: Nano Banana Pro generates the lit scene
  onStageUpdate?.('placing');
  console.log('[Pass 2] Generating lit scene with Nano Banana Pro...');
  const manualPlacementVerificationEnabled = normalizedSpatialMap.placements.length > 0;
  const manualPlacementSkipDetails = 'Placement verification skipped (no manual spatial constraints).';
  const initialCandidateCount = hybridSeedApplied
    ? MANUAL_HYBRID_INITIAL_CANDIDATE_COUNT
    : INITIAL_CANDIDATE_COUNT;
  const bestInitialCandidate = await generateAndRankInitialCandidates(
    'Manual Mode',
    initialCandidateCount,
    () => executeGeneration(
      generationBaseImage,
      imageMimeType,
      generationBasePrompt,
      manualAspectRatio,
      referenceParts.length > 0 ? referenceParts : undefined,
      gradientImage,
      markedImage
    ),
    (candidateResult) => evaluateGenerationCandidate(
      candidateResult,
      imageMimeType,
      normalizedSpatialMap.placements,
      manualPlacementVerificationEnabled,
      gutterLines,
      manualPlacementSkipDetails
    )
  );

  let result = bestInitialCandidate.result;
  let verification = bestInitialCandidate.placementVerification;
  let artifactCheck = bestInitialCandidate.artifactCheck;
  let photorealCheck = bestInitialCandidate.photorealCheck;
  let heuristicPhotorealCheck = bestInitialCandidate.heuristicPhotorealCheck;
  let photorealPassed = bestInitialCandidate.photorealPassed;
  let artifactCheckStale = false;
  let photorealCheckStale = false;

  console.log('[Pass 2] Lighting generation complete!');
  console.log(`[Manual Mode] Verification: ${verification.verified ? 'PASSED' : 'WARNING'} - ${verification.details}`);

  const hasGutterFixtures = normalizedSpatialMap.placements.some(p => p.fixtureType === 'gutter');
  const shouldRetryVerificationFailure = manualPlacementVerificationEnabled &&
    !verification.verified &&
    (hasGutterFixtures || verification.unexpectedTypes.length > 0);

  if (shouldRetryVerificationFailure) {
    for (let attempt = 1; attempt <= MAX_GUTTER_RETRY_ATTEMPTS; attempt++) {
      console.warn(
        `[Manual Mode] Verification failed (unexpected: ${verification.unexpectedTypes.join(', ') || 'none'}), running correction retry ${attempt}/${MAX_GUTTER_RETRY_ATTEMPTS}...`
      );
      onStageUpdate?.('placing');
      const correctionPrompt = buildGutterCorrectionPrompt(
        generationBasePrompt,
        normalizedSpatialMap.placements,
        gutterLines,
        verification.unexpectedTypes
      );
      const retryResult = await executeGeneration(
        generationBaseImage,
        imageMimeType,
        correctionPrompt,
        manualAspectRatio,
        referenceParts.length > 0 ? referenceParts : undefined,
        gradientImage,
        markedImage
      );

      onStageUpdate?.('verifying');
      const retryVerification = await verifyGeneratedImage(
        retryResult,
        imageMimeType,
        normalizedSpatialMap.placements,
        gutterLines
      );

      if (shouldAcceptPlacementRetryCandidate(verification, retryVerification)) {
        result = retryResult;
        verification = retryVerification;
        artifactCheckStale = true;
        photorealCheckStale = true;
      }

      if (verification.verified) break;
    }
    console.log(`[Manual Mode] Post-retry verification: ${verification.verified ? 'PASSED' : 'WARNING'} - ${verification.details}`);
  }

  onStageUpdate?.('verifying');
  if (artifactCheckStale) {
    artifactCheck = await verifyAnnotationArtifacts(extractBase64Data(result), imageMimeType);
    artifactCheckStale = false;
  }
  console.log(`[Manual Mode] Annotation artifacts: ${artifactCheck.passed ? 'PASSED' : 'WARNING'} - ${artifactCheck.details}`);

  if (!artifactCheck.passed) {
    for (let attempt = 1; attempt <= MAX_ARTIFACT_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Manual Mode] Annotation artifacts detected, running cleanup retry ${attempt}/${MAX_ARTIFACT_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('placing');
      const baseCorrectionPrompt = buildGutterCorrectionPrompt(
        generationBasePrompt,
        normalizedSpatialMap.placements,
        gutterLines,
        verification.unexpectedTypes
      );
      const correctionPrompt = buildArtifactCorrectionPrompt(baseCorrectionPrompt, artifactCheck.issues);
      const retryResult = await executeGeneration(
        generationBaseImage,
        imageMimeType,
        correctionPrompt,
        manualAspectRatio,
        referenceParts.length > 0 ? referenceParts : undefined,
        gradientImage,
        markedImage
      );

      onStageUpdate?.('verifying');
      const retryVerification = await verifyGeneratedImage(
        retryResult,
        imageMimeType,
        normalizedSpatialMap.placements,
        gutterLines
      );
      const retryArtifactCheck = await verifyAnnotationArtifacts(extractBase64Data(retryResult), imageMimeType);

      const placementNotWorse = isPlacementNotWorse(verification, retryVerification, true);
      if (
        (retryArtifactCheck.passed && placementNotWorse) ||
        retryArtifactCheck.score < artifactCheck.score
      ) {
        result = retryResult;
        verification = retryVerification;
        artifactCheck = retryArtifactCheck;
        photorealCheckStale = true;
      }

      if (artifactCheck.passed) break;
    }
    console.log(`[Manual Mode] Post-artifact retry: ${artifactCheck.passed ? 'PASSED' : 'WARNING'} - ${artifactCheck.details}`);
  }

  onStageUpdate?.('verifying');
  if (photorealCheckStale) {
    photorealCheck = await verifyPhotorealism(extractBase64Data(result), imageMimeType);
    heuristicPhotorealCheck = await verifyPhotorealismHeuristic(extractBase64Data(result), imageMimeType);
    photorealCheckStale = false;
  }
  photorealPassed = photorealCheck.passed && heuristicPhotorealCheck.passed;
  console.log(`[Manual Mode] Photorealism: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);
  console.log(
    `[Manual Mode] Photorealism heuristic: ${heuristicPhotorealCheck.passed ? 'PASSED' : 'WARNING'} - ${heuristicPhotorealCheck.details}`
  );

  if (!photorealPassed) {
    for (let attempt = 1; attempt <= MAX_PHOTOREAL_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Manual Mode] Photorealism failed, running correction retry ${attempt}/${MAX_PHOTOREAL_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('placing');
      const baseCorrectionPrompt = buildGutterCorrectionPrompt(
        generationBasePrompt,
        normalizedSpatialMap.placements,
        gutterLines,
        verification.unexpectedTypes
      );
      const combinedIssues = [...new Set([...photorealCheck.issues, ...heuristicPhotorealCheck.issues])];
      const correctionPrompt = buildPhotorealismCorrectionPrompt(baseCorrectionPrompt, combinedIssues);
      const retryResult = await executeGeneration(
        generationBaseImage,
        imageMimeType,
        correctionPrompt,
        manualAspectRatio,
        referenceParts.length > 0 ? referenceParts : undefined,
        gradientImage,
        markedImage
      );

      onStageUpdate?.('verifying');
      const retryVerification = await verifyGeneratedImage(
        retryResult,
        imageMimeType,
        normalizedSpatialMap.placements,
        gutterLines
      );
      const retryPhotorealCheck = await verifyPhotorealism(extractBase64Data(retryResult), imageMimeType);
      const retryHeuristicPhotorealCheck = await verifyPhotorealismHeuristic(
        extractBase64Data(retryResult),
        imageMimeType
      );
      const retryArtifactCheck = await verifyAnnotationArtifacts(extractBase64Data(retryResult), imageMimeType);

      const placementNotWorse = isPlacementNotWorse(verification, retryVerification, true);
      const artifactNotWorse =
        retryArtifactCheck.passed ||
        retryArtifactCheck.score <= artifactCheck.score;
      const retryPhotorealPassed = retryPhotorealCheck.passed && retryHeuristicPhotorealCheck.passed;
      const currentCompositePhotorealScore =
        photorealCheck.score * 0.7 + heuristicPhotorealCheck.score * 0.3;
      const retryCompositePhotorealScore =
        retryPhotorealCheck.score * 0.7 + retryHeuristicPhotorealCheck.score * 0.3;
      if (
        ((retryPhotorealPassed && placementNotWorse && artifactNotWorse)) ||
        (retryCompositePhotorealScore > currentCompositePhotorealScore && placementNotWorse && artifactNotWorse)
      ) {
        result = retryResult;
        verification = retryVerification;
        photorealCheck = retryPhotorealCheck;
        heuristicPhotorealCheck = retryHeuristicPhotorealCheck;
        artifactCheck = retryArtifactCheck;
      }

      photorealPassed = photorealCheck.passed && heuristicPhotorealCheck.passed;
      if (photorealPassed) break;
    }
    console.log(
      `[Manual Mode] Post-photoreal retry: ${photorealPassed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details} | ${heuristicPhotorealCheck.details}`
    );
  }

  return { result, nightBase };
};

/**
 * Enhanced Night Scene Generation using Gemini Pro 3 Only
 * This replaces the Claude + Gemini hybrid mode with a Gemini-only pipeline
 * 2-Stage Pipeline: Deep Think (analysis + prompt) → Nano Banana Pro (image generation)
 */
export const generateNightSceneEnhanced = async (
  imageBase64: string,
  imageMimeType: string,
  selectedFixtures: string[],
  fixtureSubOptions: Record<string, string[]>,
  fixtureCounts: Record<string, number | null>,
  colorTemperaturePrompt: string,
  lightIntensity: number,
  beamAngle: number,
  targetRatio: string,
  userPreferences?: UserPreferences | null,
  onStageUpdate?: (stage: string) => void,
  onAutoConstraintsResolved?: (constraints: {
    expectedPlacements: SpatialFixturePlacement[];
    gutterLines?: GutterLine[];
  }) => void
): Promise<string> => {
  console.log('[Enhanced Mode] Starting 2-stage Deep Think pipeline...');

  // Stage 0: Build auto spatial constraints (same canonical model as manual mode)
  onStageUpdate?.('analyzing');
  let autoSpatialMap: SpatialMap | undefined;
  let autoGutterLines: GutterLine[] | undefined;
  let autoGuideImage: string | undefined;

  try {
    if (selectedFixtures.length > 0) {
      console.log('[Enhanced Mode] Building auto spatial map from enhanced analysis...');
      const enhanced = await enhancedAnalyzeProperty(
        imageBase64,
        imageMimeType,
        selectedFixtures,
        fixtureSubOptions
      );
      const filteredSuggestions = getFilteredSuggestions(
        enhanced,
        selectedFixtures,
        fixtureSubOptions
      );
      autoSpatialMap = buildAutoSpatialMapFromSuggestions(
        filteredSuggestions,
        selectedFixtures,
        fixtureCounts
      );
      console.log(`[Enhanced Mode] Auto spatial map contains ${autoSpatialMap.placements.length} placement(s).`);

      if (selectedFixtures.includes('gutter')) {
        const imageDataUri = `data:${imageMimeType};base64,${imageBase64}`;
        try {
          const gutterDetection = await suggestGutterLines(imageDataUri, MAX_AUTO_GUTTER_LINES);
          if (gutterDetection.lines.length > 0) {
            autoGutterLines = gutterDetection.lines;
            console.log(
              `[Enhanced Mode] Detected ${autoGutterLines.length} gutter rail(s) for auto mode (${gutterDetection.source}).`
            );
          } else {
            console.warn('[Enhanced Mode] No gutter rails detected for auto mode.');
          }
        } catch (gutterError) {
          console.warn('[Enhanced Mode] Gutter rail detection failed for auto mode (continuing without rails):', gutterError);
        }
      }

      if (selectedFixtures.includes('gutter') && autoSpatialMap) {
        if (!autoGutterLines || autoGutterLines.length === 0) {
          autoGutterLines = deriveFallbackAutoGutterLines(autoSpatialMap, MAX_AUTO_GUTTER_LINES);
          if (autoGutterLines.length > 0) {
            console.warn(
              `[Enhanced Mode] Using ${autoGutterLines.length} fallback gutter rail(s) derived from auto placements.`
            );
          }
        }

        if (autoGutterLines && autoGutterLines.length > 0) {
          const gutterCountBefore = autoSpatialMap.placements.filter(p => p.fixtureType === 'gutter').length;
          autoSpatialMap = ensureAutoGutterRailPlacements(autoSpatialMap, autoGutterLines, fixtureCounts);
          const gutterCountAfter = autoSpatialMap.placements.filter(p => p.fixtureType === 'gutter').length;
          if (gutterCountAfter !== gutterCountBefore) {
            console.log(
              `[Enhanced Mode] Reconciled auto gutter placements to ${gutterCountAfter} fixture(s) on gutter rails.`
            );
          }

          if (autoSpatialMap.placements.length > 0) {
            const normalized = normalizeGutterPlacements(autoSpatialMap, autoGutterLines);
            autoSpatialMap = normalized.spatialMap;
            if (normalized.snappedCount > 0) {
              console.log(`[Enhanced Mode] Snapped ${normalized.snappedCount} auto gutter fixture(s) onto detected gutter rails.`);
            }
          }
        }
      }

      if (autoSpatialMap) {
        const skipFixtureTypes = selectedFixtures.includes('gutter')
          ? new Set<string>(['gutter'])
          : new Set<string>();
        const reconciled = reconcileAutoPlacementsToExplicitCounts(
          autoSpatialMap,
          selectedFixtures,
          fixtureSubOptions,
          fixtureCounts,
          skipFixtureTypes
        );
        autoSpatialMap = reconciled.spatialMap;
        if (reconciled.adjustments.length > 0) {
          console.log('[Enhanced Mode] Auto count reconciliation:', reconciled.adjustments.join(' | '));
        }
      }

      if (autoSpatialMap && autoSpatialMap.placements.length > 0) {
        const gate = evaluateAutoPlacementConfidence(
          autoSpatialMap,
          selectedFixtures,
          fixtureSubOptions,
          fixtureCounts,
          autoGutterLines
        );
        console.log(
          `[Enhanced Mode] Auto placement confidence gate: ${gate.passed ? 'PASS' : 'FAIL'} (${gate.score.toFixed(1)}).`
        );
        if (!gate.passed) {
          const reasonSummary = gate.reasons.length > 0
            ? gate.reasons.join(' | ')
            : 'Auto placement confidence below threshold.';
          throw new Error(
            `AUTO_PLACEMENT_UNCERTAIN: score ${gate.score.toFixed(1)} below ${AUTO_PLACEMENT_CONFIDENCE_MIN_SCORE}. ${reasonSummary}`
          );
        }
      }

      if (autoSpatialMap.placements.length > 0) {
        const guideFixtures = buildGuideFixturesFromSpatialMap(autoSpatialMap);
        if (guideFixtures.length > 0) {
          const guideOptions = MODEL_GUIDE_DEBUG ? undefined : CLEAN_MODEL_GUIDE_OPTIONS;
          autoGuideImage = await paintLightGradients(
            imageBase64,
            guideFixtures,
            imageMimeType,
            autoGutterLines,
            guideOptions
          );
          console.log(
            `[Enhanced Mode] ${MODEL_GUIDE_DEBUG ? 'Debug' : 'Clean'} auto guide map generated (${guideFixtures.length} fixtures).`
          );
        }
      }

      onAutoConstraintsResolved?.({
        expectedPlacements: autoSpatialMap?.placements ?? [],
        gutterLines: autoGutterLines,
      });
    }
  } catch (autoConstraintError) {
    const autoConstraintMessage = autoConstraintError instanceof Error
      ? autoConstraintError.message
      : String(autoConstraintError);
    if (autoConstraintMessage.startsWith('AUTO_PLACEMENT_UNCERTAIN:')) {
      throw (autoConstraintError instanceof Error ? autoConstraintError : new Error(autoConstraintMessage));
    }

    console.warn('[Enhanced Mode] Auto spatial constraint build failed (falling back to prompt-only auto):', autoConstraintError);
    autoSpatialMap = undefined;
    autoGutterLines = undefined;
    autoGuideImage = undefined;
    onAutoConstraintsResolved?.({ expectedPlacements: [], gutterLines: undefined });
  }

  // Stage 1: Deep Think analyzes property and writes the complete generation prompt
  onStageUpdate?.('converting');
  let baseNightImage = imageBase64;
  try {
    console.log('[Enhanced Mode] Generating nighttime base for auto mode...');
    baseNightImage = await generateNightBase(imageBase64, imageMimeType, targetRatio);
  } catch (nightBaseError) {
    console.warn('[Enhanced Mode] Night base generation failed, falling back to source image:', nightBaseError);
    baseNightImage = imageBase64;
  }

  onStageUpdate?.('analyzing');
  console.log('[Enhanced Mode] Stage 1: Deep Think analyzing property + generating prompt...');
  const deepThinkResult = await deepThinkGeneratePrompt(
    baseNightImage,
    imageMimeType,
    selectedFixtures,
    fixtureSubOptions,
    fixtureCounts,
    colorTemperaturePrompt,
    lightIntensity,
    beamAngle,
    userPreferences,
    autoSpatialMap,
    autoGuideImage,
    undefined,
    false
  );
  console.log(`[Enhanced Mode] Deep Think complete. Prompt length: ${deepThinkResult.prompt.length} chars`);
  if (deepThinkResult.fixtureBreakdown) {
    console.log('[Enhanced Mode] Fixture breakdown:', deepThinkResult.fixtureBreakdown);
  }
  const lockedPrompt = `${deepThinkResult.prompt}\n${buildPhotorealismLockAddendum()}`;

  const expectedPlacements = autoSpatialMap?.placements ?? [];
  const constrainedSelectedTypes = selectedFixtures.filter(type => VALID_FIXTURE_TYPES.has(type));
  const constrainedPlacementTypes = new Set(expectedPlacements.map(p => p.fixtureType));
  const hasCoverageForConstrainedTypes = constrainedSelectedTypes.every(type => constrainedPlacementTypes.has(type));
  const placementVerificationEnabled = expectedPlacements.length > 0 && hasCoverageForConstrainedTypes;
  const placementSkipDetails = placementVerificationEnabled
    ? 'Placement verification pending.'
    : 'Placement verification skipped (no spatial constraints).';

  // Stage 2: Nano Banana Pro generates the image using Deep Think's prompt
  onStageUpdate?.('generating');
  console.log('[Enhanced Mode] Stage 2: Generating image with Nano Banana Pro...');
  const bestInitialCandidate = await generateAndRankInitialCandidates(
    'Enhanced Mode',
    INITIAL_CANDIDATE_COUNT,
    () => executeGeneration(
      baseNightImage,
      imageMimeType,
      lockedPrompt,
      targetRatio,
      undefined,
      autoGuideImage,
      undefined
    ),
    (candidateResult) => evaluateGenerationCandidate(
      candidateResult,
      imageMimeType,
      expectedPlacements,
      placementVerificationEnabled,
      autoGutterLines,
      placementSkipDetails
    )
  );

  let result = bestInitialCandidate.result;
  let verification = bestInitialCandidate.placementVerification;
  let artifactCheck = bestInitialCandidate.artifactCheck;
  let photorealCheck = bestInitialCandidate.photorealCheck;
  let heuristicPhotorealCheck = bestInitialCandidate.heuristicPhotorealCheck;
  let photorealPassed = bestInitialCandidate.photorealPassed;
  let artifactCheckStale = false;
  let photorealCheckStale = false;

  if (!placementVerificationEnabled) {
    console.warn(
      '[Enhanced Mode] Placement verification skipped: auto constraints are incomplete for selected fixture types.'
    );
  }
  console.log(`[Enhanced Mode] Placement verification: ${verification.verified ? 'PASSED' : 'WARNING'} - ${verification.details}`);

  if (placementVerificationEnabled && !verification.verified) {
    for (let attempt = 1; attempt <= MAX_GUTTER_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Enhanced Mode] Placement verification failed, running correction retry ${attempt}/${MAX_GUTTER_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('generating');
      const correctionPrompt = buildGutterCorrectionPrompt(
        lockedPrompt,
        expectedPlacements,
        autoGutterLines,
        verification.unexpectedTypes
      );
      const retryResult = await executeGeneration(
        baseNightImage,
        imageMimeType,
        correctionPrompt,
        targetRatio,
        undefined,
        autoGuideImage,
        undefined
      );

      onStageUpdate?.('validating');
      const retryVerification = await verifyGeneratedImage(
        retryResult,
        imageMimeType,
        expectedPlacements,
        autoGutterLines
      );

      if (shouldAcceptPlacementRetryCandidate(verification, retryVerification)) {
        result = retryResult;
        verification = retryVerification;
        artifactCheckStale = true;
        photorealCheckStale = true;
      }

      if (verification.verified) break;
    }
    console.log(`[Enhanced Mode] Post-placement retry: ${verification.verified ? 'PASSED' : 'WARNING'} - ${verification.details}`);
  }

  onStageUpdate?.('validating');
  if (artifactCheckStale) {
    artifactCheck = await verifyAnnotationArtifacts(extractBase64Data(result), imageMimeType);
    artifactCheckStale = false;
  }
  console.log(`[Enhanced Mode] Annotation artifacts: ${artifactCheck.passed ? 'PASSED' : 'WARNING'} - ${artifactCheck.details}`);

  if (!artifactCheck.passed) {
    for (let attempt = 1; attempt <= MAX_ARTIFACT_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Enhanced Mode] Annotation artifacts detected, running cleanup retry ${attempt}/${MAX_ARTIFACT_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('generating');
      const baseCorrectionPrompt = buildGutterCorrectionPrompt(
        lockedPrompt,
        expectedPlacements,
        autoGutterLines,
        verification.unexpectedTypes
      );
      const correctionPrompt = buildArtifactCorrectionPrompt(baseCorrectionPrompt, artifactCheck.issues);
      const retryResult = await executeGeneration(
        baseNightImage,
        imageMimeType,
        correctionPrompt,
        targetRatio,
        undefined,
        autoGuideImage,
        undefined
      );

      onStageUpdate?.('validating');
      const retryVerification = placementVerificationEnabled
        ? await verifyGeneratedImage(retryResult, imageMimeType, expectedPlacements, autoGutterLines)
        : verification;
      const retryArtifactCheck = await verifyAnnotationArtifacts(extractBase64Data(retryResult), imageMimeType);

      const placementNotWorse = isPlacementNotWorse(
        verification,
        retryVerification,
        placementVerificationEnabled
      );
      if (
        (retryArtifactCheck.passed && placementNotWorse) ||
        retryArtifactCheck.score < artifactCheck.score
      ) {
        result = retryResult;
        verification = retryVerification;
        artifactCheck = retryArtifactCheck;
        photorealCheckStale = true;
      }

      if (artifactCheck.passed) break;
    }
    console.log(`[Enhanced Mode] Post-artifact retry: ${artifactCheck.passed ? 'PASSED' : 'WARNING'} - ${artifactCheck.details}`);
  }

  onStageUpdate?.('validating');
  if (photorealCheckStale) {
    photorealCheck = await verifyPhotorealism(extractBase64Data(result), imageMimeType);
    heuristicPhotorealCheck = await verifyPhotorealismHeuristic(extractBase64Data(result), imageMimeType);
    photorealCheckStale = false;
  }
  photorealPassed = photorealCheck.passed && heuristicPhotorealCheck.passed;
  console.log(`[Enhanced Mode] Photorealism: ${photorealCheck.passed ? 'PASSED' : 'WARNING'} - ${photorealCheck.details}`);
  console.log(
    `[Enhanced Mode] Photorealism heuristic: ${heuristicPhotorealCheck.passed ? 'PASSED' : 'WARNING'} - ${heuristicPhotorealCheck.details}`
  );

  if (!photorealPassed) {
    for (let attempt = 1; attempt <= MAX_PHOTOREAL_RETRY_ATTEMPTS; attempt++) {
      console.warn(`[Enhanced Mode] Photorealism failed, running correction retry ${attempt}/${MAX_PHOTOREAL_RETRY_ATTEMPTS}...`);
      onStageUpdate?.('generating');
      const combinedIssues = [...new Set([...photorealCheck.issues, ...heuristicPhotorealCheck.issues])];
      const correctionPrompt = buildPhotorealismCorrectionPrompt(lockedPrompt, combinedIssues);
      const retryResult = await executeGeneration(
        baseNightImage,
        imageMimeType,
        correctionPrompt,
        targetRatio,
        undefined,
        autoGuideImage,
        undefined
      );

      onStageUpdate?.('validating');
      const retryVerification = placementVerificationEnabled
        ? await verifyGeneratedImage(retryResult, imageMimeType, expectedPlacements, autoGutterLines)
        : verification;
      const retryPhotorealCheck = await verifyPhotorealism(extractBase64Data(retryResult), imageMimeType);
      const retryHeuristicPhotorealCheck = await verifyPhotorealismHeuristic(
        extractBase64Data(retryResult),
        imageMimeType
      );
      const retryArtifactCheck = await verifyAnnotationArtifacts(extractBase64Data(retryResult), imageMimeType);
      const placementNotWorse = isPlacementNotWorse(
        verification,
        retryVerification,
        placementVerificationEnabled
      );
      const artifactNotWorse =
        retryArtifactCheck.passed ||
        retryArtifactCheck.score <= artifactCheck.score;
      const retryPhotorealPassed = retryPhotorealCheck.passed && retryHeuristicPhotorealCheck.passed;
      const currentCompositePhotorealScore =
        photorealCheck.score * 0.7 + heuristicPhotorealCheck.score * 0.3;
      const retryCompositePhotorealScore =
        retryPhotorealCheck.score * 0.7 + retryHeuristicPhotorealCheck.score * 0.3;
      if (
        ((retryPhotorealPassed && placementNotWorse && artifactNotWorse)) ||
        (retryCompositePhotorealScore >= currentCompositePhotorealScore && placementNotWorse && artifactNotWorse)
      ) {
        result = retryResult;
        verification = retryVerification;
        artifactCheck = retryArtifactCheck;
        photorealCheck = retryPhotorealCheck;
        heuristicPhotorealCheck = retryHeuristicPhotorealCheck;
      }
      photorealPassed = photorealCheck.passed && heuristicPhotorealCheck.passed;
      if (photorealPassed) break;
    }
  }

  if (placementVerificationEnabled && !verification.verified) {
    throw new Error(`AUTO_PLACEMENT_UNCERTAIN: Final placement verification failed. ${verification.details}`);
  }

  console.log('[Enhanced Mode] Generation complete!');
  return result;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENHANCED ANALYSIS INTEGRATION
// Uses the new smart analysis system for better fixture suggestions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const ENHANCED_ANALYSIS_TIMEOUT_MS = 120000; // 120 seconds for Deep Think analysis

/**
 * Enhanced property analysis that provides smarter fixture suggestions
 * This is the improved version of analyzePropertyArchitecture
 */
export const enhancedAnalyzeProperty = async (
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  selectedFixtures?: string[],
  fixtureSubOptions?: Record<string, string[]>
): Promise<EnhancedHouseAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Build context about user's current selections
  let selectionContext = '';
  if (selectedFixtures && selectedFixtures.length > 0) {
    selectionContext = `
## USER'S CURRENT FIXTURE SELECTIONS
Focus your suggestions on these selected types:
${selectedFixtures.map(f => `- ${f}: ${(fixtureSubOptions?.[f] || []).join(', ') || 'all sub-options'}`).join('\n')}
`;
  }

  const analysisPrompt = `${ENHANCED_ANALYSIS_SYSTEM_PROMPT}

${selectionContext}

Analyze this property photo and return a comprehensive JSON analysis with:

1. **style**: Architectural style (modern, traditional, craftsman, mediterranean, colonial, spanish, tudor, farmhouse, ranch, cape-cod, victorian, mid-century, transitional, contemporary, unknown)

2. **facadeWidth**: Facade width classification
   - "narrow" (<30 feet, 2-4 fixtures typical)
   - "medium" (30-50 feet, 4-8 fixtures typical)
   - "wide" (50-80 feet, 6-12 fixtures typical)
   - "extra-wide" (>80 feet, 10-20 fixtures typical)

3. **storyCount**: 1, 2, or 3

4. **wallHeight**: "8-12ft", "18-25ft", or "25+ft"

5. **architecturalFeatures**: Array of detected features
   [{
     "type": "gable|dormer|column|pilaster|archway|portico|bay-window|balcony|turret|chimney|shutters|corbels|dentil-molding",
     "count": <number>,
     "positions": ["<description>"],
     "lightingOpportunity": "high|medium|low",
     "suggestedApproach": "<how to light>"
   }]

6. **materials**: Array of detected materials
   [{
     "material": "brick|stone|stucco|siding-lap|siding-board-and-batten|vinyl|wood|concrete|glass|metal|mixed",
     "location": "<where on facade>",
     "percentage": <0-100>,
     "textureLevel": "smooth|light|moderate|heavy",
     "recommendedBeamAngle": <15|20|25|30|45>
   }]

7. **primaryMaterial**: Main facade material

8. **suggestedFixtures**: Array of smart fixture suggestions
   [{
     "fixtureType": "up|path|soffit|gutter|hardscape|coredrill",
     "subOption": "siding|windows|trees|columns|entryway|walkway|driveway|dormers|peaks",
     "count": <number>,
     "positions": [{
       "description": "<specific location>",
       "xPercent": <0-100 from left>,
       "yPercent": <0-100 from top>,
       "target": "<what this illuminates>"
     }],
     "spacing": "<spacing description>",
     "reasoning": "<why this placement>",
     "priority": <1-10, 1=highest>
   }]

9. **avoidZones**: Array of zones to avoid
   [{
     "id": "<unique-id>",
     "reason": "window-glare|door-obstruction|utility-equipment|hardscape-surface|hvac-unit|meter-box|spigot-hose",
     "description": "<what to avoid>",
     "xPercent": <0-100>,
     "yPercent": <0-100>,
     "radiusPercent": <0-20>,
     "severity": "critical|important|suggested"
   }]

10. **optimalUplightPositions**: Best uplight positions
    [{
      "id": "<unique-id>",
      "type": "optimal|acceptable",
      "description": "<position>",
      "xPercent": <0-100>,
      "yPercent": <0-100>,
      "suggestedFixture": "up",
      "reasoning": "<why good>"
    }]

11. **landscaping**: {
      "trees": { "count": <n>, "positions": ["<loc>"], "sizes": ["small|medium|large"], "uplightCandidates": <n> },
      "plantingBeds": { "present": <bool>, "locations": ["<loc>"], "fixtureAccessible": <bool> }
    }

12. **hardscape**: {
      "driveway": { "present": <bool>, "width": "narrow|standard|wide", "position": "left|right|center", "suggestedPathLightCount": <n> },
      "walkway": { "present": <bool>, "length": "short|medium|long", "style": "straight|curved", "suggestedPathLightCount": <n> }
    }

13. **entry**: {
      "type": "single|double|grand",
      "hasOverhang": <bool>,
      "hasColumns": <bool>,
      "hasSidelights": <bool>,
      "suggestedFixtureApproach": "<how to light>"
    }

14. **windows**: {
      "firstFloorCount": <n>,
      "secondFloorCount": <n>,
      "pattern": "symmetrical|asymmetrical|irregular",
      "positions": "<description>"
    }

15. **lightingApproach**: {
      "style": "clean-minimal|warm-welcoming|dramatic-shadow|balanced-traditional|statement-architectural",
      "description": "<1-2 sentences>",
      "intensityRecommendation": <0-100>,
      "beamAngleRecommendation": <15|20|25|30|45>,
      "colorTempRecommendation": "2700K|3000K|4000K",
      "reasoning": "<why this approach>"
    }

16. **fixtureSummary**: {
      "totalSuggestedCount": <n>,
      "byType": { "up": <n>, "path": <n>, ... },
      "estimatedSpacing": "<spacing>",
      "coverageNotes": "<notes>"
    }

17. **confidence**: <0-100>

18. **notes**: ["<special notes>"]

Return ONLY valid JSON. No markdown code blocks.`;

  try {
    const analyzePromise = ai.models.generateContent({
      model: ANALYSIS_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: analysisPrompt,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    const response = await withTimeout(
      analyzePromise,
      ENHANCED_ANALYSIS_TIMEOUT_MS,
      'Enhanced property analysis timed out. Please try again.'
    );

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        // Skip thinking parts (thought: true) — grab the final output text
        const textPart = candidate.content.parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).pop();
        if (textPart && textPart.text) {
          let jsonText = textPart.text.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          try {
            const analysis: EnhancedHouseAnalysis = JSON.parse(jsonText);
            
            // Enrich with calculated recommendations from constants
            return enrichAnalysisWithRecommendations(analysis);
          } catch (parseError) {
            console.error('Failed to parse enhanced analysis JSON:', parseError);
            console.error('Raw response:', textPart.text);
            throw new Error('Failed to parse property analysis. Please try again.');
          }
        }
      }
    }

    throw new Error('No analysis generated. Please try again.');
  } catch (error) {
    console.error('Enhanced Property Analysis Error:', error);
    throw error;
  }
};

/**
 * Enriches the AI analysis with recommendations from our constants
 */
function enrichAnalysisWithRecommendations(analysis: EnhancedHouseAnalysis): EnhancedHouseAnalysis {
  const enriched = { ...analysis };
  
  // Get style-based recommendations
  const styleKey = (analysis.style || 'unknown') as ArchitecturalStyleType;
  const styleConfig = LIGHTING_APPROACH_BY_STYLE[styleKey] || LIGHTING_APPROACH_BY_STYLE['unknown'];
  
  // Get spacing recommendations based on facade width
  const widthKey = (analysis.facadeWidth || 'medium') as FacadeWidthType;
  const spacingConfig = SPACING_BY_FACADE_WIDTH[widthKey] || SPACING_BY_FACADE_WIDTH['medium'];
  
  // Get intensity recommendations based on wall height
  const heightKey = analysis.wallHeight || '8-12ft';
  const intensityConfig = INTENSITY_BY_WALL_HEIGHT[heightKey] || INTENSITY_BY_WALL_HEIGHT['8-12ft'];
  
  // Get beam angle based on primary material
  const materialKey = analysis.primaryMaterial || 'mixed';
  const beamConfig = BEAM_ANGLE_BY_MATERIAL[materialKey] || BEAM_ANGLE_BY_MATERIAL['mixed'];
  
  // Ensure lighting approach uses our constants if AI didn't provide good values
  if (!enriched.lightingApproach) {
    enriched.lightingApproach = {
      style: styleConfig.style,
      description: styleConfig.description,
      intensityRecommendation: Math.round((styleConfig.intensityRange[0] + styleConfig.intensityRange[1]) / 2),
      beamAngleRecommendation: beamConfig.angle,
      colorTempRecommendation: styleConfig.colorTemp,
      reasoning: `${styleConfig.description} Beam angle: ${beamConfig.reason}`
    };
  } else {
    // Validate/enhance AI's recommendations
    if (!enriched.lightingApproach.intensityRecommendation || 
        enriched.lightingApproach.intensityRecommendation < intensityConfig.min ||
        enriched.lightingApproach.intensityRecommendation > intensityConfig.max) {
      enriched.lightingApproach.intensityRecommendation = 
        Math.round((intensityConfig.min + intensityConfig.max) / 2);
    }
  }
  
  // Add feature-specific lighting guidelines to notes
  const featureNotes: string[] = [];
  for (const feature of enriched.architecturalFeatures || []) {
    const guideline = FEATURE_LIGHTING_GUIDELINES[feature.type];
    if (guideline && !feature.suggestedApproach) {
      feature.suggestedApproach = guideline;
      featureNotes.push(`${feature.type}: ${guideline}`);
    }
  }
  
  // Update fixture summary with spacing config
  if (!enriched.fixtureSummary) {
    enriched.fixtureSummary = {
      totalSuggestedCount: enriched.suggestedFixtures?.reduce((sum, f) => sum + f.count, 0) || 0,
      byType: {},
      estimatedSpacing: spacingConfig.idealSpacing,
      coverageNotes: spacingConfig.description
    };
  } else {
    enriched.fixtureSummary.estimatedSpacing = spacingConfig.idealSpacing;
  }
  
  // Calculate byType if not provided
  if (enriched.suggestedFixtures && enriched.suggestedFixtures.length > 0) {
    const byType: Record<string, number> = {};
    for (const fixture of enriched.suggestedFixtures) {
      byType[fixture.fixtureType] = (byType[fixture.fixtureType] || 0) + fixture.count;
    }
    enriched.fixtureSummary.byType = byType;
    enriched.fixtureSummary.totalSuggestedCount = 
      Object.values(byType).reduce((sum, n) => sum + n, 0);
  }
  
  // Add spacing guidance to notes
  enriched.notes = enriched.notes || [];
  enriched.notes.push(`Recommended spacing for ${widthKey} facade: ${spacingConfig.idealSpacing}`);
  enriched.notes.push(`Fixture range: ${spacingConfig.minFixtures}-${spacingConfig.maxFixtures} fixtures typical`);
  
  // Ensure confidence is set
  if (!enriched.confidence) {
    enriched.confidence = 75;
  }
  
  return enriched;
}

/**
 * Converts enhanced analysis to the legacy PropertyAnalysis format
 * for backwards compatibility with existing code
 */
export function enhancedToLegacyAnalysis(enhanced: EnhancedHouseAnalysis): PropertyAnalysis {
  return {
    architecture: {
      story_count: enhanced.storyCount,
      wall_height_estimate: enhanced.wallHeight,
      facade_materials: enhanced.materials.map(m => m.material as any) || [enhanced.primaryMaterial as any],
      windows: {
        first_floor_count: enhanced.windows?.firstFloorCount || 0,
        second_floor_count: enhanced.windows?.secondFloorCount || 0,
        positions: enhanced.windows?.positions || ''
      },
      columns: {
        present: enhanced.architecturalFeatures?.some(f => f.type === 'column') || false,
        count: enhanced.architecturalFeatures?.find(f => f.type === 'column')?.count || 0
      },
      dormers: {
        present: enhanced.architecturalFeatures?.some(f => f.type === 'dormer') || false,
        count: enhanced.architecturalFeatures?.find(f => f.type === 'dormer')?.count || 0
      },
      gables: {
        present: enhanced.architecturalFeatures?.some(f => f.type === 'gable') || false,
        count: enhanced.architecturalFeatures?.find(f => f.type === 'gable')?.count || 0
      },
      entryway: {
        type: enhanced.entry?.type || 'single',
        has_overhang: enhanced.entry?.hasOverhang || false
      }
    },
    landscaping: {
      trees: {
        count: enhanced.landscaping?.trees?.count || 0,
        sizes: enhanced.landscaping?.trees?.sizes || [],
        positions: enhanced.landscaping?.trees?.positions?.join(', ')
      },
      planting_beds: {
        present: enhanced.landscaping?.plantingBeds?.present || false,
        locations: enhanced.landscaping?.plantingBeds?.locations || []
      }
    },
    hardscape: {
      driveway: {
        present: enhanced.hardscape?.driveway?.present || false,
        width_estimate: enhanced.hardscape?.driveway?.width || 'standard',
        position: enhanced.hardscape?.driveway?.position
      },
      walkway: {
        present: enhanced.hardscape?.walkway?.present || false,
        length_estimate: enhanced.hardscape?.walkway?.length || 'medium',
        style: enhanced.hardscape?.walkway?.style || 'straight',
        description: ''
      },
      patio: { present: false },
      sidewalk: { present: false }
    },
    recommendations: {
      optimal_intensity: enhanced.lightingApproach?.intensityRecommendation 
        ? (enhanced.lightingApproach.intensityRecommendation < 45 ? 'subtle' 
           : enhanced.lightingApproach.intensityRecommendation < 60 ? 'moderate'
           : enhanced.lightingApproach.intensityRecommendation < 75 ? 'bright' : 'high_power')
        : 'moderate',
      optimal_beam_angle: (enhanced.lightingApproach?.beamAngleRecommendation || 30) as 15 | 30 | 45 | 60,
      fixture_counts: enhanced.fixtureSummary?.byType || {},
      fixture_positions: Object.fromEntries(
        (enhanced.suggestedFixtures || []).map(sf => [
          `${sf.fixtureType}_${sf.subOption}`,
          sf.positions.map(p => p.description)
        ])
      ),
      priority_areas: enhanced.suggestedFixtures
        ?.sort((a, b) => a.priority - b.priority)
        .map(sf => `${sf.fixtureType} - ${sf.subOption}`) || [],
      notes: enhanced.notes?.join(' ') || enhanced.lightingApproach?.description || ''
    }
  };
}

/**
 * Helper to generate explanation for why a fixture was suggested
 */
export function explainSuggestedFixture(suggestion: SuggestedFixture): string {
  const lines: string[] = [];
  
  lines.push(`## ${suggestion.fixtureType.toUpperCase()} - ${suggestion.subOption}`);
  lines.push(`**Count:** ${suggestion.count} fixtures`);
  lines.push(`**Spacing:** ${suggestion.spacing}`);
  lines.push(`**Priority:** ${suggestion.priority}/10`);
  lines.push('');
  lines.push(`### Why This Placement`);
  lines.push(suggestion.reasoning);
  lines.push('');
  lines.push('### Positions');
  
  suggestion.positions.forEach((pos, i) => {
    lines.push(`${i + 1}. **${pos.description}**`);
    lines.push(`   - Illuminates: ${pos.target}`);
    lines.push(`   - Location: ${pos.xPercent}% from left, ${pos.yPercent}% from top`);
  });
  
  return lines.join('\n');
}

/**
 * Get fixture suggestions filtered by user's selections
 */
export function getFilteredSuggestions(
  analysis: EnhancedHouseAnalysis,
  selectedFixtures: string[],
  selectedSubOptions: Record<string, string[]>
): SuggestedFixture[] {
  if (!analysis.suggestedFixtures) return [];
  
  return analysis.suggestedFixtures.filter(suggestion => {
    if (!selectedFixtures.includes(suggestion.fixtureType)) return false;
    
    const subs = selectedSubOptions[suggestion.fixtureType];
    if (subs && subs.length > 0 && !subs.includes(suggestion.subOption)) return false;
    
    return true;
  }).sort((a, b) => a.priority - b.priority);
}
