import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { generateMarkerOverlay } from './markerOverlay';
import {
  type MockupRenderSpec,
  countFixturesByType,
  validateMockupRenderSpec,
} from './spec';

export interface GenerateMockupOptions {
  apiKey?: string;
  outputTier?: 'preview' | 'final';
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  imageModel?: string;
  qaModel?: string;
  qaRetryLimit?: number;
}

export interface GenerationRunLog {
  specHash: string;
  promptPackVersions: Record<string, string>;
  modelUsed: string;
  qaModelUsed: string;
  latencyMs: number;
}

export interface GenerationQaResult {
  passed: boolean;
  details: string;
  visibleLightCount: number;
  extraGlows: number;
  positionMatchScore: number;
  raw: unknown;
}

export interface GenerateMockupResult {
  imageDataUri: string;
  summaryJson: Record<string, unknown> | null;
  qa: GenerationQaResult;
  attempts: number;
  markerOverlayDataUri?: string;
  log: GenerationRunLog;
}

export interface MockupDryRunResult {
  specHash: string;
  promptPackVersions: Record<string, string>;
  prompt: string;
  selectedCatalogTypes: string[];
  stylePreset: MockupRenderSpec['stylePreset'];
}

const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_QA_MODEL = 'gemini-3.1-pro-preview';
const PROMPT_PACK_DIR = 'src/prompts/mockup';
const SKILLS_DIR = 'src/skills';

function dynamicImport(moduleName: string): Promise<any> {
  return new Function('m', 'return import(m)')(moduleName) as Promise<any>;
}

async function readFileUtf8(filePath: string): Promise<string> {
  const fs = await dynamicImport('node:fs/promises');
  return fs.readFile(filePath, 'utf8') as Promise<string>;
}

async function joinPath(...parts: string[]): Promise<string> {
  const pathMod = await dynamicImport('node:path');
  return pathMod.join(...parts) as string;
}

function stripDataUriPrefix(base64OrDataUri: string): string {
  const comma = base64OrDataUri.indexOf(',');
  return comma >= 0 ? base64OrDataUri.slice(comma + 1) : base64OrDataUri;
}

async function sha256(value: string): Promise<string> {
  const crypto = await dynamicImport('node:crypto');
  return crypto.createHash('sha256').update(value).digest('hex') as string;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const body = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',');
  return `{${body}}`;
}

function resolveApiKey(options?: GenerateMockupOptions): string {
  const key =
    options?.apiKey ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : undefined);

  if (!key) {
    throw new Error('[MockupRenderSpec] Missing API key. Set GEMINI_API_KEY (or pass options.apiKey).');
  }
  return key;
}

async function resolveInputImageBase64(spec: MockupRenderSpec): Promise<string> {
  if (spec.inputImage.base64) return stripDataUriPrefix(spec.inputImage.base64);
  if (!spec.inputImage.url) {
    throw new Error('[MockupRenderSpec] inputImage requires base64 or url.');
  }

  const response = await fetch(spec.inputImage.url);
  if (!response.ok) {
    throw new Error(`[MockupRenderSpec] Failed to fetch input image: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

function selectGeneratedImagePart(
  parts: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }>,
  sourceCandidates: string[]
): { data: string; mimeType: string } | null {
  const candidates = parts
    .filter((part) => typeof part.inlineData?.data === 'string' && part.inlineData.data.length > 0)
    .map((part) => ({
      data: part.inlineData!.data!,
      mimeType: part.inlineData!.mimeType || 'image/png',
    }));
  if (candidates.length === 0) return null;

  const sourceSet = new Set(sourceCandidates.filter(Boolean));
  const nonSource = candidates.filter((item) => !sourceSet.has(item.data));
  const pool = nonSource.length > 0 ? nonSource : candidates;
  return pool[pool.length - 1];
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const noFence = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed;
  const match = noFence.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function loadPromptPacksAndHashes(spec: MockupRenderSpec): Promise<{
  textBlocks: Record<string, string>;
  hashes: Record<string, string>;
}> {
  const cwd = typeof process !== 'undefined' ? process.cwd() : '.';
  const promptFiles = [
    'GENERATION_RULES.md',
    'STYLE_PHOTOREAL.md',
    'NEGATIVE.md',
    spec.renderMode === 'markers' ? 'RENDER_FROM_MARKERS.md' : 'RENDER_FROM_COORDS.md',
    'OUTPUT_CONTRACT.md',
  ];

  const textBlocks: Record<string, string> = {};
  const hashes: Record<string, string> = {};

  for (const file of promptFiles) {
    const fullPath = await joinPath(cwd, PROMPT_PACK_DIR, file);
    const content = await readFileUtf8(fullPath);
    textBlocks[file] = content;
    hashes[file] = await sha256(content);
  }

  return { textBlocks, hashes };
}

async function loadSkillsData(selectedTypes: string[], stylePreset: MockupRenderSpec['stylePreset']): Promise<{
  catalogSnippet: string;
  presetSnippet: string;
}> {
  const cwd = typeof process !== 'undefined' ? process.cwd() : '.';
  const catalogPath = await joinPath(cwd, SKILLS_DIR, 'fixture_catalog.json');
  const presetPath = await joinPath(cwd, SKILLS_DIR, 'render_presets.json');

  const catalogRaw = await readFileUtf8(catalogPath);
  const presetRaw = await readFileUtf8(presetPath);
  const catalogJson = JSON.parse(catalogRaw) as { fixtures?: Record<string, unknown> };
  const presetJson = JSON.parse(presetRaw) as { presets?: Record<string, unknown> };

  const selectedCatalog = selectedTypes.reduce<Record<string, unknown>>((acc, type) => {
    const entry = catalogJson.fixtures?.[type];
    if (entry) acc[type] = entry;
    return acc;
  }, {});

  const selectedPreset = presetJson.presets?.[stylePreset] || null;
  return {
    catalogSnippet: JSON.stringify(selectedCatalog, null, 2),
    presetSnippet: JSON.stringify(selectedPreset, null, 2),
  };
}

function buildFinalPrompt(
  spec: MockupRenderSpec,
  promptPacks: Record<string, string>,
  catalogSnippet: string,
  presetSnippet: string
): string {
  const requiredTotal = Object.values(spec.requiredCounts).reduce((sum, value) => sum + (value || 0), 0);
  const actualCounts = countFixturesByType(spec.fixtures);
  return [
    '# OMNIA MOCKUP ORCHESTRATOR PROMPT',
    '',
    '## RULES',
    promptPacks['GENERATION_RULES.md'],
    '',
    '## STYLE',
    promptPacks['STYLE_PHOTOREAL.md'],
    '',
    '## NEGATIVE',
    promptPacks['NEGATIVE.md'],
    '',
    '## RENDER MODE INSTRUCTIONS',
    promptPacks[spec.renderMode === 'markers' ? 'RENDER_FROM_MARKERS.md' : 'RENDER_FROM_COORDS.md'],
    '',
    '## FIXTURE CATALOG (SELECTED TYPES ONLY)',
    '```json',
    catalogSnippet,
    '```',
    '',
    `## RENDER PRESET: ${spec.stylePreset.toUpperCase()}`,
    '```json',
    presetSnippet,
    '```',
    '',
    '## OUTPUT CONTRACT',
    promptPacks['OUTPUT_CONTRACT.md'],
    '',
    `Constraint summary: required fixture total=${requiredTotal}, actual fixture total=${spec.fixtures.length}.`,
    `Actual fixture counts by type: ${JSON.stringify(actualCounts)}.`,
    '',
    '## FULL JSON SPEC (AUTHORITATIVE)',
    '```json',
    JSON.stringify(spec, null, 2),
    '```',
  ].join('\n');
}

export async function buildMockupPromptDryRun(spec: MockupRenderSpec): Promise<MockupDryRunResult> {
  validateMockupRenderSpec(spec);
  const [{ textBlocks: promptPacks, hashes: promptPackVersions }, { catalogSnippet, presetSnippet }] =
    await Promise.all([
      loadPromptPacksAndHashes(spec),
      loadSkillsData(spec.selectedFixtureTypes, spec.stylePreset),
    ]);

  const prompt = buildFinalPrompt(spec, promptPacks, catalogSnippet, presetSnippet);
  return {
    specHash: await sha256(stableStringify(spec)),
    promptPackVersions,
    prompt,
    selectedCatalogTypes: [...spec.selectedFixtureTypes],
    stylePreset: spec.stylePreset,
  };
}

async function generateImageFromPrompt(args: {
  ai: GoogleGenAI;
  model: string;
  inputImageBase64: string;
  markerOverlayBase64?: string;
  promptText: string;
  outputTier: 'preview' | 'final';
  aspectRatio?: GenerateMockupOptions['aspectRatio'];
}): Promise<{ imageDataUri: string; summaryJson: Record<string, unknown> | null }> {
  const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [
    { inlineData: { data: args.inputImageBase64, mimeType: 'image/png' } },
  ];
  if (args.markerOverlayBase64) {
    parts.push({ inlineData: { data: args.markerOverlayBase64, mimeType: 'image/png' } });
  }
  parts.push({ text: args.promptText });

  const imageConfig: Record<string, unknown> = {
    imageSize: args.outputTier === 'final' ? '4K' : '1K',
  };
  if (args.aspectRatio) imageConfig.aspectRatio = args.aspectRatio;

  const response = await args.ai.models.generateContent({
    model: args.model,
    contents: { parts },
    config: {
      temperature: 0.1,
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: imageConfig as any,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });

  const candidate = response.candidates?.[0];
  const partsOut = candidate?.content?.parts || [];
  const imagePart = selectGeneratedImagePart(partsOut, [args.inputImageBase64, args.markerOverlayBase64 || '']);
  if (!imagePart) {
    const textPart = partsOut.find((part) => typeof part.text === 'string' && part.text.length > 0);
    throw new Error(`[MockupRenderSpec] Image generation returned no image. ${textPart?.text || ''}`.trim());
  }

  const summaryText = partsOut
    .filter((part) => typeof part.text === 'string' && part.text.length > 0)
    .map((part) => part.text as string)
    .join('\n');
  const summaryJson = summaryText ? tryParseJsonObject(summaryText) : null;

  return {
    imageDataUri: `data:${imagePart.mimeType};base64,${imagePart.data}`,
    summaryJson,
  };
}

async function runVisionQa(args: {
  ai: GoogleGenAI;
  qaModel: string;
  generatedImageDataUri: string;
  spec: MockupRenderSpec;
  markerOverlayBase64?: string;
}): Promise<GenerationQaResult> {
  const generatedBase64 = stripDataUriPrefix(args.generatedImageDataUri);
  const requiredTotal = Object.values(args.spec.requiredCounts).reduce((sum, value) => sum + (value || 0), 0);

  const qaPrompt = [
    'You are a strict lighting QA auditor for landscape mockup validation.',
    'Check whether generated lights match the authoritative fixture spec exactly.',
    '',
    `Required visible light count: ${requiredTotal}`,
    `Render mode: ${args.spec.renderMode}`,
    '',
    'Return strict JSON only:',
    '{"passed": <boolean>, "visibleLightCount": <number>, "extraGlows": <number>, "positionMatchScore": <0-100>, "details": "<brief summary>"}',
    '',
    'Fail if any of the following are true:',
    '- Count does not match exactly.',
    '- Extra glows exist without corresponding fixture positions.',
    '- Position drift is visually significant.',
    '',
    'Authoritative spec:',
    '```json',
    JSON.stringify(args.spec, null, 2),
    '```',
  ].join('\n');

  const qaParts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [
    { inlineData: { data: generatedBase64, mimeType: 'image/png' } },
  ];
  if (args.markerOverlayBase64) {
    qaParts.push({ inlineData: { data: args.markerOverlayBase64, mimeType: 'image/png' } });
  }
  qaParts.push({ text: qaPrompt });

  const response = await args.ai.models.generateContent({
    model: args.qaModel,
    contents: { parts: qaParts },
    config: { temperature: 0.1 },
  });

  const text = response.text?.trim() || '';
  const parsed = tryParseJsonObject(text) || {};
  const visibleLightCount = Number(parsed.visibleLightCount ?? -1);
  const extraGlows = Number(parsed.extraGlows ?? 0);
  const positionMatchScore = Number(parsed.positionMatchScore ?? 0);
  const passed = parsed.passed === true;
  const details = typeof parsed.details === 'string'
    ? parsed.details
    : (passed ? 'QA passed.' : 'QA failed.');

  return {
    passed,
    details,
    visibleLightCount,
    extraGlows,
    positionMatchScore,
    raw: parsed,
  };
}

/**
 * Generation orchestrator for strict fixture-controlled mockup rendering.
 */
export async function generateMockup(
  spec: MockupRenderSpec,
  options: GenerateMockupOptions = {}
): Promise<GenerateMockupResult> {
  const startMs = Date.now();
  validateMockupRenderSpec(spec);

  const apiKey = resolveApiKey(options);
  const imageModel = options.imageModel || DEFAULT_IMAGE_MODEL;
  const qaModel = options.qaModel || DEFAULT_QA_MODEL;
  const outputTier = options.outputTier || 'preview';
  const qaRetryLimit = typeof options.qaRetryLimit === 'number' ? options.qaRetryLimit : 1;

  const ai = new GoogleGenAI({ apiKey });
  const specHash = await sha256(stableStringify(spec));

  const [{ textBlocks: promptPacks, hashes: promptPackVersions }, { catalogSnippet, presetSnippet }] =
    await Promise.all([
      loadPromptPacksAndHashes(spec),
      loadSkillsData(spec.selectedFixtureTypes, spec.stylePreset),
    ]);

  const inputImageBase64 = await resolveInputImageBase64(spec);
  let markerOverlayBase64: string | undefined;
  let markerOverlayDataUri: string | undefined;

  if (spec.renderMode === 'markers') {
    const overlay = await generateMarkerOverlay({
      sourceImageBase64: inputImageBase64,
      fixtures: spec.fixtures,
      markerLegend: spec.markerLegend,
      dotRadiusPx: 8,
      outputDataUri: true,
    });
    markerOverlayBase64 = overlay.base64;
    markerOverlayDataUri = overlay.dataUri;
  }

  let finalPrompt = buildFinalPrompt(spec, promptPacks, catalogSnippet, presetSnippet);
  let lastGeneration: { imageDataUri: string; summaryJson: Record<string, unknown> | null } | null = null;
  let lastQa: GenerationQaResult | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= qaRetryLimit; attempt++) {
    attempts = attempt + 1;

    lastGeneration = await generateImageFromPrompt({
      ai,
      model: imageModel,
      inputImageBase64,
      markerOverlayBase64,
      promptText: finalPrompt,
      outputTier,
      aspectRatio: options.aspectRatio,
    });

    lastQa = await runVisionQa({
      ai,
      qaModel,
      generatedImageDataUri: lastGeneration.imageDataUri,
      spec,
      markerOverlayBase64,
    });

    if (lastQa.passed) break;
    if (attempt >= qaRetryLimit) break;

    finalPrompt += [
      '',
      '## STRICT QA RETRY ADDENDUM',
      'You added extra fixtures. Remove everything except marker-based lights.',
      'Do not add any fixtures not explicitly listed in the JSON spec.',
      'Do not duplicate glows.',
      'Maintain exact positions and exact counts.',
    ].join('\n');
  }

  if (!lastGeneration || !lastQa) {
    throw new Error('[MockupRenderSpec] Generation failed before producing output.');
  }

  const latencyMs = Date.now() - startMs;
  return {
    imageDataUri: lastGeneration.imageDataUri,
    summaryJson: lastGeneration.summaryJson,
    qa: lastQa,
    attempts,
    markerOverlayDataUri,
    log: {
      specHash,
      promptPackVersions,
      modelUsed: imageModel,
      qaModelUsed: qaModel,
      latencyMs,
    },
  };
}
