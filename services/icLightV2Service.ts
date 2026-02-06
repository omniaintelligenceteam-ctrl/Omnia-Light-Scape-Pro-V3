/**
 * IC-Light V2 Day-to-Night Service
 *
 * Uses IC-Light V2 via fal.ai for physics-based relighting.
 * Converts daytime property photos to realistic nighttime scenes
 * while preserving all architecture, landscaping, and hardscape.
 *
 * Model: fal-ai/iclight-v2
 */

import {
  falQueueRequest,
  toFalDataUri,
  fetchImageAsBase64,
  type FalProgressCallback,
} from './falService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ICLightV2Settings {
  initialLatent: 'None' | 'Left' | 'Right' | 'Top' | 'Bottom';
  guidanceScale: number;     // 0-20, default 5
  numInferenceSteps: number; // 1-50, default 28
  cfg: number;               // 0.01-5, default 1
  enableHrFix: boolean;      // High-res enhancement
  lowresDenoise: number;     // 0.01-1, default 0.98
  highresDenoise: number;    // 0.01-1, default 0.95
  seed?: number;
}

export interface ICLightV2Result {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  seed?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// Optimized for landscape lighting day-to-night conversion
// ═══════════════════════════════════════════════════════════════════════════════

const IC_LIGHT_V2_MODEL = 'fal-ai/iclight-v2';

export const IC_LIGHT_V2_DEFAULTS: ICLightV2Settings = {
  initialLatent: 'Bottom',  // Uplighting from ground level
  guidanceScale: 5,
  numInferenceSteps: 28,
  cfg: 1.5,
  enableHrFix: true,        // Better detail for architectural features
  lowresDenoise: 0.98,
  highresDenoise: 0.95,
  seed: undefined,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

export const IC_LIGHT_V2_PROMPTS = {
  /** Base day-to-night conversion — creates dark nighttime scene without fixtures */
  dayToNight: `nighttime photograph of residential home exterior, dark night sky, no artificial lighting, no landscape lights, dark ambient conditions, moonlit atmosphere, photorealistic, high quality night photography, preserving all architectural details exactly`,

  /** Negative prompt to prevent unwanted additions */
  negative: `daylight, sunshine, blue sky, clouds, artificial lights, landscape lights, uplights, path lights, bright windows, neon, harsh lighting, overexposed, blurry, low quality, deformed architecture`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a daytime property photo to a nighttime scene using IC-Light V2.
 * This produces a dark nighttime base WITHOUT any lighting fixtures.
 * Fixtures are added in a separate step by FLUX Fill.
 */
export async function generateDayToNight(
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  prompt?: string,
  negativePrompt?: string,
  settings?: Partial<ICLightV2Settings>,
  onProgress?: FalProgressCallback
): Promise<ICLightV2Result> {
  const finalSettings: ICLightV2Settings = {
    ...IC_LIGHT_V2_DEFAULTS,
    ...settings,
  };

  const finalPrompt = prompt || IC_LIGHT_V2_PROMPTS.dayToNight;
  const finalNegativePrompt = negativePrompt || IC_LIGHT_V2_PROMPTS.negative;

  try {
    onProgress?.('Starting day-to-night conversion...', 0);

    const imageDataUri = toFalDataUri(imageBase64, imageMimeType);

    const input: Record<string, unknown> = {
      image_url: imageDataUri,
      prompt: finalPrompt,
      negative_prompt: finalNegativePrompt,
      initial_latent: finalSettings.initialLatent,
      guidance_scale: finalSettings.guidanceScale,
      num_inference_steps: finalSettings.numInferenceSteps,
      cfg: finalSettings.cfg,
      enable_hr_fix: finalSettings.enableHrFix,
      lowres_denoise: finalSettings.lowresDenoise,
      highres_denoise: finalSettings.highresDenoise,
      num_images: 1,
      output_format: 'jpeg',
    };

    if (finalSettings.seed !== undefined) {
      input.seed = finalSettings.seed;
    }

    onProgress?.('Uploading to IC-Light V2...', 10);

    const result = await falQueueRequest(
      IC_LIGHT_V2_MODEL,
      input,
      (status, progress) => {
        onProgress?.(
          status === 'Waiting in queue...'
            ? 'IC-Light V2 starting up...'
            : status === 'Generating...'
            ? 'Converting to nighttime...'
            : status,
          progress
        );
      }
    );

    if (!result.images || result.images.length === 0) {
      return { success: false, error: 'IC-Light V2 returned no images' };
    }

    const outputUrl = result.images[0].url;
    onProgress?.('Downloading result...', 95);

    try {
      const imageBase64Result = await fetchImageAsBase64(outputUrl);
      return {
        success: true,
        imageUrl: outputUrl,
        imageBase64: imageBase64Result,
        seed: result.seed,
      };
    } catch {
      // If download fails, return URL only
      return {
        success: true,
        imageUrl: outputUrl,
        seed: result.seed,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[IC-Light V2] Day-to-night error:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Drop-in compatible wrapper matching the signature pattern used in the pipeline.
 * Returns base64 data URI string.
 */
export async function generateDayToNightBase64(
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  onProgress?: FalProgressCallback
): Promise<string> {
  const result = await generateDayToNight(
    imageBase64,
    imageMimeType,
    undefined,
    undefined,
    undefined,
    onProgress
  );

  if (!result.success) {
    throw new Error(result.error || 'IC-Light V2 day-to-night conversion failed');
  }

  if (!result.imageBase64) {
    throw new Error('IC-Light V2 did not return image data');
  }

  return `data:${imageMimeType};base64,${result.imageBase64}`;
}
