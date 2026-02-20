import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Download, Upload, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import {
  runLightingEvaluationBatch,
  lightingEvaluationResultsToCsv,
  type LightingEvaluationBatchResult,
  type LightingEvaluationCase,
} from '../../../services/lightingEvaluationService';

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const DEFAULT_TEMPLATE: LightingEvaluationCase[] = [
  {
    id: 'example-case-1',
    generatedImage: 'data:image/jpeg;base64,PASTE_GENERATED_IMAGE_BASE64_HERE',
    imageMimeType: 'image/jpeg',
    requirePlacement: false,
    expectedPlacements: [],
    gutterLines: []
  }
];

function parseCasesJson(raw: string): LightingEvaluationCase[] {
  const parsed = JSON.parse(raw) as unknown;
  const cases = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { cases?: unknown[] }).cases)
      ? (parsed as { cases: unknown[] }).cases
      : null);

  if (!cases || cases.length === 0) {
    throw new Error('No evaluation cases found. Provide an array or { "cases": [...] }.');
  }

  return cases.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Case #${index + 1} is not a valid object.`);
    }
    const typed = item as Record<string, unknown>;
    if (typeof typed.id !== 'string' || !typed.id.trim()) {
      throw new Error(`Case #${index + 1} is missing a valid "id".`);
    }
    if (typeof typed.generatedImage !== 'string' || !typed.generatedImage.trim()) {
      throw new Error(`Case "${typed.id}" is missing "generatedImage".`);
    }

    return {
      id: typed.id,
      generatedImage: typed.generatedImage,
      imageMimeType: typeof typed.imageMimeType === 'string' ? typed.imageMimeType : undefined,
      expectedPlacements: Array.isArray(typed.expectedPlacements)
        ? (typed.expectedPlacements as LightingEvaluationCase['expectedPlacements'])
        : undefined,
      gutterLines: Array.isArray(typed.gutterLines)
        ? (typed.gutterLines as LightingEvaluationCase['gutterLines'])
        : undefined,
      requirePlacement: typeof typed.requirePlacement === 'boolean' ? typed.requirePlacement : undefined,
      meta: (typed.meta && typeof typed.meta === 'object') ? (typed.meta as Record<string, unknown>) : undefined,
    } satisfies LightingEvaluationCase;
  });
}

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const LightingQaSection: React.FC = () => {
  const [casesJson, setCasesJson] = useState<string>(() => JSON.stringify(DEFAULT_TEMPLATE, null, 2));
  const [minCompositeScore, setMinCompositeScore] = useState<number>(85);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number; currentCaseId: string } | null>(null);
  const [result, setResult] = useState<LightingEvaluationBatchResult | null>(null);

  const templateJson = useMemo(() => JSON.stringify(DEFAULT_TEMPLATE, null, 2), []);

  const handleRun = async () => {
    setError(null);
    setResult(null);
    setProgress(null);

    let cases: LightingEvaluationCase[];
    try {
      cases = parseCasesJson(casesJson);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Invalid JSON input.');
      return;
    }

    setIsRunning(true);
    try {
      const batch = await runLightingEvaluationBatch(cases, {
        minCompositeScore,
        onProgress: (nextProgress) => setProgress(nextProgress),
      });
      setResult(batch);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to run evaluation batch.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleLoadTemplate = () => {
    setCasesJson(templateJson);
    setError(null);
  };

  const handleUploadJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCasesJson(text);
      setError(null);
    };
    reader.onerror = () => {
      setError('Unable to read uploaded JSON file.');
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportCsv = () => {
    if (!result) return;
    const csv = lightingEvaluationResultsToCsv(result.results);
    const fileName = `lighting-eval-results-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(fileName, csv, 'text/csv;charset=utf-8');
  };

  const handleExportSummaryJson = () => {
    if (!result) return;
    const payload = JSON.stringify(result, null, 2);
    const fileName = `lighting-eval-summary-${new Date().toISOString().slice(0, 10)}.json`;
    downloadTextFile(fileName, payload, 'application/json;charset=utf-8');
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(templateJson);
    } catch {
      setError('Clipboard copy failed. Your browser may block clipboard access.');
    }
  };

  const summary = result?.summary;

  return (
    <motion.div
      key="lighting-qa"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400">
        Batch-evaluate generated lighting renders for placement fidelity, artifact leakage, and photoreal quality.
        Target pass rate: 85%+ before production rollout.
      </p>

      <SettingsCard className="p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Evaluation Cases</h3>
            <p className="text-xs text-gray-500 mt-1">
              Paste JSON array or object with <code className="text-gray-300">cases</code>. Use data URI image strings for best results.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadTemplate}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
              Load Template
            </button>
            <button
              onClick={handleCopyTemplate}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 inline mr-1.5" />
              Copy Template
            </button>
            <label className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 inline mr-1.5" />
              Upload JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleUploadJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <textarea
          value={casesJson}
          onChange={(event) => setCasesJson(event.target.value)}
          spellCheck={false}
          className="w-full h-72 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/40"
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <label htmlFor="minCompositeScore" className="text-xs text-gray-400">
              Min Composite Score
            </label>
            <input
              id="minCompositeScore"
              type="number"
              min={0}
              max={100}
              value={minCompositeScore}
              onChange={(event) => setMinCompositeScore(Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
              className="w-20 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#F6B45A]/50"
            />
          </div>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F6B45A] text-black text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running Eval...' : 'Run Evaluation'}
          </button>
        </div>

        {progress && isRunning && (
          <div className="text-xs text-gray-400">
            Running {progress.completed}/{progress.total} case(s) - current: <span className="text-gray-200">{progress.currentCaseId}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </SettingsCard>

      {summary && (
        <SettingsCard className="p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-base font-semibold text-white">Batch Summary</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5 inline mr-1.5" />
                Export CSV
              </button>
              <button
                onClick={handleExportSummaryJson}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5 inline mr-1.5" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/80">Pass Rate</p>
              <p className="text-xl font-bold text-emerald-300 mt-1">{summary.passRate}%</p>
              <p className="text-[11px] text-emerald-400/70 mt-1">{summary.passed}/{summary.total} passed</p>
            </div>
            <div className="rounded-xl border border-[#F6B45A]/25 bg-[#F6B45A]/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#F6B45A]/80">Avg Composite</p>
              <p className="text-xl font-bold text-[#F6B45A] mt-1">{summary.avgCompositeScore}</p>
              <p className="text-[11px] text-[#F6B45A]/70 mt-1">Threshold: {minCompositeScore}</p>
            </div>
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-blue-300/80">Placement Pass</p>
              <p className="text-xl font-bold text-blue-200 mt-1">{summary.placementPassRate}%</p>
              <p className="text-[11px] text-blue-300/70 mt-1">Avg conf: {summary.avgPlacementConfidence}%</p>
            </div>
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-purple-300/80">Photoreal Pass</p>
              <p className="text-xl font-bold text-purple-200 mt-1">{summary.photorealPassRate}%</p>
              <p className="text-[11px] text-purple-300/70 mt-1">Artifact pass: {summary.artifactPassRate}%</p>
            </div>
          </div>
        </SettingsCard>
      )}

      {result && (
        <SettingsCard className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Case Results</h3>
            <span className="text-xs text-gray-500">{result.results.length} case(s)</span>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] sticky top-0 z-10">
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Case</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Composite</th>
                  <th className="text-left px-4 py-3">Placement</th>
                  <th className="text-left px-4 py-3">Artifacts</th>
                  <th className="text-left px-4 py-3">Photoreal</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-200 font-mono text-xs">{row.id}</td>
                    <td className="px-4 py-3">
                      {row.passed ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-300 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">{row.compositeScore}</td>
                    <td className="px-4 py-3 text-gray-300">{row.placementVerified ? 'Pass' : 'Fail'} ({row.placementConfidence}%)</td>
                    <td className="px-4 py-3 text-gray-300">{row.artifactPassed ? 'Pass' : 'Fail'} ({row.artifactScore})</td>
                    <td className="px-4 py-3 text-gray-300">
                      {row.photorealPassed ? 'Pass' : 'Fail'} ({row.photorealScore}/{row.heuristicPhotorealScore})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsCard>
      )}
    </motion.div>
  );
};

