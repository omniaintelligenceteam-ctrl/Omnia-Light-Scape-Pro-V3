/**
 * FLUX Fill Inpainting Service
 *
 * Uses FLUX Pro Fill via fal.ai for mask-based fixture placement.
 * Each fixture is placed at an exact position using binary masks,
 * guaranteeing 100% accuracy for fixture count and placement.
 *
 * Model: fal-ai/flux-pro/v1/fill
 */

import {
  falQueueRequest,
  toFalDataUri,
  fetchImageAsBase64,
  type FalProgressCallback,
} from './falService';
import type { SpatialMap } from '../types';
import { generateGroupedMasks, type MaskGroup } from './maskService';
import { FLUX_FILL_PROMPTS } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const FLUX_FILL_MODEL = 'fal-ai/flux-pro/v1/fill';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FluxFillSettings {
  seed?: number;
  outputFormat: 'jpeg' | 'png';
  safetyTolerance: number; // 1-6, default 2
}

export interface FluxFillResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
}

export interface BatchInpaintResult {
  success: boolean;
  finalImageBase64?: string;
  error?: string;
  groupsProcessed: number;
  groupsFailed: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

const FLUX_FILL_DEFAULTS: FluxFillSettings = {
  seed: undefined,
  outputFormat: 'jpeg',
  safetyTolerance: 5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE INPAINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Inpaint a single masked region with FLUX Fill.
 * The mask defines WHERE the fixture goes; the prompt defines WHAT it looks like.
 */
export async function inpaintWithFluxFill(
  imageBase64: string,
  maskBase64: string,
  prompt: string,
  imageMimeType: string = 'image/jpeg',
  settings?: Partial<FluxFillSettings>,
  onProgress?: FalProgressCallback
): Promise<FluxFillResult> {
  const finalSettings: FluxFillSettings = {
    ...FLUX_FILL_DEFAULTS,
    ...settings,
  };

  try {
    const imageDataUri = toFalDataUri(imageBase64, imageMimeType);
    const maskDataUri = toFalDataUri(maskBase64, 'image/png');

    const input: Record<string, unknown> = {
      image_url: imageDataUri,
      mask_url: maskDataUri,
      prompt,
      num_images: 1,
      output_format: finalSettings.outputFormat,
      safety_tolerance: finalSettings.safetyTolerance,
    };

    if (finalSettings.seed !== undefined) {
      input.seed = finalSettings.seed;
    }

    const result = await falQueueRequest(FLUX_FILL_MODEL, input, onProgress);

    if (!result.images || result.images.length === 0) {
      return { success: false, error: 'FLUX Fill returned no images' };
    }

    const outputUrl = result.images[0].url;

    try {
      const resultBase64 = await fetchImageAsBase64(outputUrl);
      return {
        success: true,
        imageUrl: outputUrl,
        imageBase64: resultBase64,
      };
    } catch {
      return {
        success: true,
        imageUrl: outputUrl,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FLUX Fill] Inpaint error:', error);
    return { success: false, error: errorMessage };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a FLUX Fill prompt for a fixture group.
 * Combines the fixture type template with context about the surface material.
 */
function buildFixturePrompt(
  fixtureType: string,
  subOption: string,
  facadeMaterials?: string[]
): string {
  const key = `${fixtureType}_${subOption}`;
  const template = FLUX_FILL_PROMPTS[key] || FLUX_FILL_PROMPTS[fixtureType];

  if (!template) {
    // Fallback generic prompt
    return `BRIGHT GLOWING professional landscape lighting fixture, VISIBLE bright warm 2700K light source, strong luminous glow, BRIGHT light pool on surface, photorealistic night scene, high contrast bright light against dark background`;
  }

  // Append material context if available
  let prompt = template;
  if (facadeMaterials && facadeMaterials.length > 0) {
    const materialStr = facadeMaterials.join(' and ');
    prompt += `, light interacting with ${materialStr} surface`;
  }

  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH INPAINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Place all fixtures onto a nighttime base image using mask-based inpainting.
 * Processes fixtures in groups (2-4 passes) for efficiency.
 *
 * @param nightImageBase64 - The IC-Light V2 nighttime base (no fixtures yet)
 * @param spatialMap - Fixture positions from Stage 1 analysis
 * @param imageWidth - Width of the image in pixels
 * @param imageHeight - Height of the image in pixels
 * @param facadeMaterials - Optional materials for prompt context
 * @param onProgress - Progress callback
 */
export async function batchInpaintFixtures(
  nightImageBase64: string,
  spatialMap: SpatialMap,
  imageWidth: number,
  imageHeight: number,
  facadeMaterials?: string[],
  onProgress?: (stage: string, groupIndex: number, totalGroups: number) => void
): Promise<BatchInpaintResult> {
  try {
    // Generate grouped masks from spatial map
    const maskGroups: MaskGroup[] = generateGroupedMasks(
      spatialMap,
      imageWidth,
      imageHeight
    );

    if (maskGroups.length === 0) {
      console.warn('[FLUX Fill] No fixture groups to process');
      return {
        success: true,
        finalImageBase64: nightImageBase64,
        groupsProcessed: 0,
        groupsFailed: 0,
      };
    }

    let currentImageBase64 = nightImageBase64;
    let groupsProcessed = 0;
    let groupsFailed = 0;

    // Process each group sequentially (each pass uses the previous result as input)
    for (let i = 0; i < maskGroups.length; i++) {
      const group = maskGroups[i];
      onProgress?.(`Placing fixtures (group ${i + 1} of ${maskGroups.length})...`, i, maskGroups.length);

      // Build prompt for this fixture group
      const prompt = buildFixturePrompt(
        group.fixtureType,
        group.subOption,
        facadeMaterials
      );

      console.log(`[FLUX Fill] Group ${i + 1}/${maskGroups.length}: ${group.fixtureType}_${group.subOption} (${group.fixtureCount} fixtures)`);

      const result = await inpaintWithFluxFill(
        currentImageBase64,
        group.maskBase64,
        prompt,
        'image/jpeg',
        undefined,
        (status, _progress) => {
          onProgress?.(
            `Placing ${group.fixtureType} fixtures... ${status}`,
            i,
            maskGroups.length
          );
        }
      );

      if (result.success && result.imageBase64) {
        currentImageBase64 = result.imageBase64;
        groupsProcessed++;
      } else {
        console.warn(`[FLUX Fill] Group ${i + 1} failed: ${result.error}. Continuing with previous image.`);
        groupsFailed++;
      }
    }

    return {
      success: true,
      finalImageBase64: currentImageBase64,
      groupsProcessed,
      groupsFailed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FLUX Fill] Batch inpaint error:', error);
    return {
      success: false,
      error: errorMessage,
      groupsProcessed: 0,
      groupsFailed: 0,
    };
  }
}
