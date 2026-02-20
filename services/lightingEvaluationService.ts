import type { SpatialFixturePlacement } from '../types';
import type { GutterLine } from '../types/fixtures';
import {
  evaluateGeneratedLightingOutput,
  type GenerationCandidateEvaluation,
} from './geminiService';

const DEFAULT_MIN_COMPOSITE_SCORE = 85;

export interface LightingEvaluationCase {
  id: string;
  generatedImage: string;
  imageMimeType?: string;
  expectedPlacements?: SpatialFixturePlacement[];
  gutterLines?: GutterLine[];
  requirePlacement?: boolean;
  meta?: Record<string, unknown>;
}

export interface LightingEvaluationCaseResult {
  id: string;
  passed: boolean;
  compositeScore: number;
  placementVerified: boolean;
  artifactPassed: boolean;
  photorealPassed: boolean;
  placementConfidence: number;
  artifactScore: number;
  photorealScore: number;
  heuristicPhotorealScore: number;
  details: string;
  evaluation: GenerationCandidateEvaluation;
  meta?: Record<string, unknown>;
}

export interface LightingEvaluationSummary {
  total: number;
  passed: number;
  passRate: number;
  placementPassRate: number;
  artifactPassRate: number;
  photorealPassRate: number;
  avgCompositeScore: number;
  avgPlacementConfidence: number;
  avgArtifactScore: number;
  avgPhotorealScore: number;
  avgHeuristicPhotorealScore: number;
}

export interface LightingEvaluationBatchResult {
  summary: LightingEvaluationSummary;
  results: LightingEvaluationCaseResult[];
}

function parseMimeTypeFromDataUri(image: string): string | null {
  if (!image.startsWith('data:')) return null;
  const match = image.match(/^data:(.*?);base64,/);
  return match?.[1] || null;
}

function ensureDataUri(image: string, mimeType: string): string {
  return image.startsWith('data:') ? image : `data:${mimeType};base64,${image}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSummary(results: LightingEvaluationCaseResult[]): LightingEvaluationSummary {
  const total = results.length;
  if (total === 0) {
    return {
      total: 0,
      passed: 0,
      passRate: 0,
      placementPassRate: 0,
      artifactPassRate: 0,
      photorealPassRate: 0,
      avgCompositeScore: 0,
      avgPlacementConfidence: 0,
      avgArtifactScore: 0,
      avgPhotorealScore: 0,
      avgHeuristicPhotorealScore: 0,
    };
  }

  const passed = results.filter(r => r.passed).length;
  const placementPassCount = results.filter(r => r.placementVerified).length;
  const artifactPassCount = results.filter(r => r.artifactPassed).length;
  const photorealPassCount = results.filter(r => r.photorealPassed).length;
  const sum = <K extends keyof LightingEvaluationCaseResult>(key: K): number =>
    results.reduce((acc, item) => acc + (item[key] as number), 0);

  return {
    total,
    passed,
    passRate: round((passed / total) * 100),
    placementPassRate: round((placementPassCount / total) * 100),
    artifactPassRate: round((artifactPassCount / total) * 100),
    photorealPassRate: round((photorealPassCount / total) * 100),
    avgCompositeScore: round(sum('compositeScore') / total),
    avgPlacementConfidence: round(sum('placementConfidence') / total),
    avgArtifactScore: round(sum('artifactScore') / total),
    avgPhotorealScore: round(sum('photorealScore') / total),
    avgHeuristicPhotorealScore: round(sum('heuristicPhotorealScore') / total),
  };
}

export async function runLightingEvaluationBatch(
  cases: LightingEvaluationCase[],
  options?: {
    minCompositeScore?: number;
    onProgress?: (progress: { completed: number; total: number; currentCaseId: string }) => void;
  }
): Promise<LightingEvaluationBatchResult> {
  const minCompositeScore = options?.minCompositeScore ?? DEFAULT_MIN_COMPOSITE_SCORE;
  const results: LightingEvaluationCaseResult[] = [];
  const total = cases.length;

  for (let i = 0; i < total; i++) {
    const testCase = cases[i];
    const expectedPlacements = testCase.expectedPlacements ?? [];
    const placementVerificationEnabled =
      typeof testCase.requirePlacement === 'boolean'
        ? testCase.requirePlacement
        : expectedPlacements.length > 0;
    const mimeType = testCase.imageMimeType || parseMimeTypeFromDataUri(testCase.generatedImage) || 'image/jpeg';
    const imageDataUri = ensureDataUri(testCase.generatedImage, mimeType);

    options?.onProgress?.({
      completed: i,
      total,
      currentCaseId: testCase.id,
    });

    const evaluation = await evaluateGeneratedLightingOutput(
      imageDataUri,
      mimeType,
      expectedPlacements,
      {
        placementVerificationEnabled,
        gutterLines: testCase.gutterLines,
        placementSkipDetails: placementVerificationEnabled
          ? 'Placement verification pending.'
          : 'Placement verification skipped for this eval case.',
      }
    );

    const photorealPassed = evaluation.photorealCheck.passed && evaluation.heuristicPhotorealCheck.passed;
    const passed =
      evaluation.compositeScore >= minCompositeScore &&
      photorealPassed &&
      evaluation.artifactCheck.passed &&
      evaluation.placementVerification.verified;

    const details = [
      `Composite ${evaluation.compositeScore.toFixed(1)} (threshold ${minCompositeScore})`,
      `Placement: ${evaluation.placementVerification.verified ? 'pass' : 'fail'} (${evaluation.placementVerification.confidence.toFixed(1)}%)`,
      `Artifacts: ${evaluation.artifactCheck.passed ? 'pass' : 'fail'} (${evaluation.artifactCheck.score.toFixed(1)})`,
      `Photoreal: ${photorealPassed ? 'pass' : 'fail'} (${evaluation.photorealCompositeScore.toFixed(1)})`,
    ].join(' | ');

    results.push({
      id: testCase.id,
      passed,
      compositeScore: round(evaluation.compositeScore),
      placementVerified: evaluation.placementVerification.verified,
      artifactPassed: evaluation.artifactCheck.passed,
      photorealPassed,
      placementConfidence: round(evaluation.placementVerification.confidence),
      artifactScore: round(evaluation.artifactCheck.score),
      photorealScore: round(evaluation.photorealCheck.score),
      heuristicPhotorealScore: round(evaluation.heuristicPhotorealCheck.score),
      details,
      evaluation,
      meta: testCase.meta,
    });

    options?.onProgress?.({
      completed: i + 1,
      total,
      currentCaseId: testCase.id,
    });
  }

  return {
    summary: buildSummary(results),
    results,
  };
}

export function lightingEvaluationResultsToCsv(results: LightingEvaluationCaseResult[]): string {
  const header = [
    'id',
    'passed',
    'compositeScore',
    'placementVerified',
    'placementConfidence',
    'artifactPassed',
    'artifactScore',
    'photorealPassed',
    'photorealScore',
    'heuristicPhotorealScore',
    'details',
  ];
  const rows = results.map(result => [
    result.id,
    result.passed,
    result.compositeScore,
    result.placementVerified,
    result.placementConfidence,
    result.artifactPassed,
    result.artifactScore,
    result.photorealPassed,
    result.photorealScore,
    result.heuristicPhotorealScore,
    `"${result.details.replace(/"/g, '""')}"`,
  ]);
  return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
}
