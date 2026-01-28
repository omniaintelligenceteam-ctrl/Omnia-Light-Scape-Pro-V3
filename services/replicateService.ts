/**
 * Replicate IC-Light Service
 * 
 * Professional landscape lighting relighting using IC-Light model.
 * Produces dramatically better results than standard image generation.
 * 
 * Model: zsxkib/ic-light (Intrinsic Compositing with Light)
 * This model is specifically designed for realistic relighting of images.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const REPLICATE_MODEL = 'zsxkib/ic-light:d41bcb10d8c159868f4cfbd7c6a2ca01484f7d39e4613419d5952c61562f1ba7';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 150; // Max 5 minutes (150 * 2s = 300s)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ICLightSettings {
  lightSource: 'None' | 'Left Light' | 'Right Light' | 'Top Light' | 'Bottom Light';
  cfg: number;        // 1.0-5.0, default 3.0
  steps: number;      // 10-50, default 30
  highresScale: number; // 1.0-2.0, default 1.5
  seed?: number;
}

export interface ICLightResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  predictionId?: string;
}

export type ICLightProgressCallback = (status: string, progress?: number) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT LIGHTING PROMPTS
// Optimized through extensive testing for landscape uplighting
// ═══════════════════════════════════════════════════════════════════════════════

export const IC_LIGHT_PROMPTS = {
  // Premium nighttime landscape lighting prompt
  landscapeUplighting: `nighttime photograph, professional landscape uplights illuminating walls, warm 2700K amber glow from ground-mounted uplights washing up the stucco and stone facade, architectural lighting design, luxury home at night, photorealistic, dramatic uplighting effect, dark sky with stars, professional night photography, high-end residential exterior`,

  // Negative prompt to prevent unwanted lighting effects
  negativePrompt: `downlights, ceiling lights, daylight, blue light, cool light, interior lights, street lights, car headlights, neon, harsh shadows, overexposed, underexposed, blurry, low quality`,

  // Alternative prompts for different styles
  warmAmbient: `nighttime exterior photograph, warm golden landscape lighting, cozy ambient glow, professional architectural lighting, luxury home at night, photorealistic, high quality`,
  
  dramaticAccent: `dramatic nighttime photograph, high contrast landscape lighting, bold accent lights, architectural drama, luxury estate at night, professional photography, cinematic lighting`,
  
  subtleMoonlight: `subtle nighttime photograph, soft landscape lighting, gentle moonlight effect, elegant architectural lighting, luxury home at night, fine art photography`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// Optimized through testing for best landscape lighting results
// ═══════════════════════════════════════════════════════════════════════════════

export const IC_LIGHT_DEFAULTS: ICLightSettings = {
  lightSource: 'Bottom Light',  // Uplighting effect
  cfg: 3.0,                     // Balanced creativity/consistency
  steps: 30,                    // Good quality without being slow
  highresScale: 1.5,            // Better detail
  seed: undefined,              // Random seed for variety
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the Replicate API token from environment
 */
function getReplicateToken(): string {
  const token = import.meta.env.VITE_REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('VITE_REPLICATE_API_TOKEN is not configured. Please add it to your .env file.');
  }
  return token;
}

/**
 * Convert a base64 image to a data URI
 */
function toDataUri(base64: string, mimeType: string = 'image/jpeg'): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Fetch an image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 from data URL
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start an IC-Light prediction
 */
async function startPrediction(
  imageDataUri: string,
  prompt: string,
  negativePrompt: string,
  settings: ICLightSettings
): Promise<string> {
  const token = getReplicateToken();

  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait', // Try to get result immediately if fast
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL.split(':')[1],
      input: {
        subject_image: imageDataUri,
        prompt: prompt,
        negative_prompt: negativePrompt,
        light_source: settings.lightSource,
        cfg: settings.cfg,
        steps: settings.steps,
        highres_scale: settings.highresScale,
        seed: settings.seed,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Replicate API error: ${response.status} - ${errorData.detail || response.statusText}`);
  }

  const data = await response.json();
  
  // If the prediction is already complete (fast), return result
  if (data.status === 'succeeded' && data.output) {
    return data.id; // Still return ID, we'll check status in poll
  }

  return data.id;
}

/**
 * Poll for prediction result
 */
async function pollPrediction(
  predictionId: string,
  onProgress?: ICLightProgressCallback
): Promise<ICLightResult> {
  const token = getReplicateToken();
  const url = `${REPLICATE_API_URL}/${predictionId}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.statusText}`);
    }

    const data = await response.json();

    // Report progress
    if (onProgress) {
      const progress = Math.min(95, Math.round((attempt / MAX_POLL_ATTEMPTS) * 100));
      onProgress(data.status, progress);
    }

    switch (data.status) {
      case 'succeeded':
        // Get the output image URL
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        if (!outputUrl) {
          return { success: false, error: 'No output image in result', predictionId };
        }
        
        // Fetch and convert to base64 for consistency with existing flow
        try {
          const imageBase64 = await fetchImageAsBase64(outputUrl);
          return {
            success: true,
            imageUrl: outputUrl,
            imageBase64,
            predictionId,
          };
        } catch (fetchError) {
          // If we can't fetch, at least return the URL
          return {
            success: true,
            imageUrl: outputUrl,
            predictionId,
          };
        }

      case 'failed':
        return {
          success: false,
          error: data.error || 'Prediction failed',
          predictionId,
        };

      case 'canceled':
        return {
          success: false,
          error: 'Prediction was canceled',
          predictionId,
        };

      case 'starting':
      case 'processing':
        // Continue polling
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        break;

      default:
        // Unknown status, continue polling
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  return {
    success: false,
    error: 'Prediction timed out',
    predictionId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a nighttime lighting mockup using IC-Light
 * 
 * @param imageBase64 - Base64 encoded input image (daytime photo)
 * @param imageMimeType - MIME type of the image (default: 'image/jpeg')
 * @param prompt - Optional custom prompt (uses default landscape lighting prompt if not provided)
 * @param negativePrompt - Optional custom negative prompt
 * @param settings - Optional IC-Light settings (uses optimized defaults if not provided)
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with the generated image
 */
export async function generateWithICLight(
  imageBase64: string,
  imageMimeType: string = 'image/jpeg',
  prompt?: string,
  negativePrompt?: string,
  settings?: Partial<ICLightSettings>,
  onProgress?: ICLightProgressCallback
): Promise<ICLightResult> {
  // Use defaults merged with any custom settings
  const finalSettings: ICLightSettings = {
    ...IC_LIGHT_DEFAULTS,
    ...settings,
  };

  const finalPrompt = prompt || IC_LIGHT_PROMPTS.landscapeUplighting;
  const finalNegativePrompt = negativePrompt || IC_LIGHT_PROMPTS.negativePrompt;

  try {
    // Report starting
    onProgress?.('Starting IC-Light generation...', 0);

    // Convert image to data URI
    const imageDataUri = toDataUri(imageBase64, imageMimeType);

    // Start the prediction
    onProgress?.('Uploading image to IC-Light...', 10);
    const predictionId = await startPrediction(
      imageDataUri,
      finalPrompt,
      finalNegativePrompt,
      finalSettings
    );

    // Poll for result
    onProgress?.('Processing with IC-Light...', 20);
    const result = await pollPrediction(predictionId, (status, progress) => {
      const statusMessage = status === 'starting' 
        ? 'IC-Light model starting...' 
        : status === 'processing'
        ? 'Generating nighttime lighting...'
        : `Status: ${status}`;
      onProgress?.(statusMessage, 20 + (progress || 0) * 0.75);
    });

    if (result.success) {
      onProgress?.('IC-Light generation complete!', 100);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('IC-Light generation error:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate nighttime scene with IC-Light using the same signature as geminiService.generateNightScene
 * This is a drop-in replacement for easy integration.
 * 
 * @returns Base64 encoded image string (compatible with existing flow)
 */
export async function generateNightSceneWithICLight(
  imageBase64: string,
  _userInstructions: string, // Ignored - IC-Light uses its own optimized prompt
  imageMimeType: string = 'image/jpeg',
  _aspectRatio: string = '1:1', // Ignored - IC-Light preserves original aspect ratio
  _lightIntensity: number = 45, // Could be used to adjust settings in future
  _beamAngle: number = 30, // Could be used to adjust settings in future
  _colorTemperaturePrompt: string = "Use Soft White (3000K) for all lights.",
  onProgress?: ICLightProgressCallback
): Promise<string> {
  const result = await generateWithICLight(
    imageBase64,
    imageMimeType,
    undefined, // Use default prompt
    undefined, // Use default negative prompt
    undefined, // Use default settings
    onProgress
  );

  if (!result.success) {
    throw new Error(result.error || 'IC-Light generation failed');
  }

  if (!result.imageBase64) {
    throw new Error('IC-Light did not return an image');
  }

  // Return base64 with data URI prefix for consistency with Gemini service
  return `data:${imageMimeType};base64,${result.imageBase64}`;
}

/**
 * Check if Replicate API is configured and accessible
 */
export async function checkReplicateStatus(): Promise<{ available: boolean; error?: string }> {
  try {
    const token = getReplicateToken();
    
    // Try to get the model info
    const response = await fetch('https://api.replicate.com/v1/models/zsxkib/ic-light', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return { available: true };
    } else if (response.status === 401) {
      return { available: false, error: 'Invalid Replicate API token' };
    } else {
      return { available: false, error: `API error: ${response.status}` };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('VITE_REPLICATE_API_TOKEN')) {
      return { available: false, error: 'Replicate API token not configured' };
    }
    return { available: false, error: 'Failed to connect to Replicate API' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM PROMPT BUILDER
// For advanced users who want to customize the lighting effect
// ═══════════════════════════════════════════════════════════════════════════════

export interface LightingPromptOptions {
  style?: 'warm' | 'dramatic' | 'subtle' | 'professional';
  colorTemperature?: '2700K' | '3000K' | '4000K' | '5000K';
  lightingType?: 'uplighting' | 'downlighting' | 'accent' | 'ambient';
  mood?: 'cozy' | 'elegant' | 'dramatic' | 'inviting';
  includeStars?: boolean;
  includeMoon?: boolean;
}

/**
 * Build a custom prompt for IC-Light based on options
 */
export function buildLightingPrompt(options: LightingPromptOptions = {}): string {
  const {
    style = 'professional',
    colorTemperature = '2700K',
    lightingType = 'uplighting',
    mood = 'elegant',
    includeStars = true,
    includeMoon = false,
  } = options;

  const styleTerms: Record<string, string> = {
    warm: 'warm golden tones, cozy atmosphere',
    dramatic: 'high contrast, bold shadows, cinematic',
    subtle: 'soft gentle lighting, understated elegance',
    professional: 'professional architectural lighting, magazine quality',
  };

  const colorTerms: Record<string, string> = {
    '2700K': 'warm amber 2700K color temperature',
    '3000K': 'soft white 3000K warm glow',
    '4000K': 'neutral white 4000K balanced light',
    '5000K': 'cool daylight 5000K white light',
  };

  const lightingTerms: Record<string, string> = {
    uplighting: 'ground-mounted uplights washing up walls and facades',
    downlighting: 'overhead downlights creating pools of light',
    accent: 'accent lights highlighting architectural features',
    ambient: 'ambient lighting creating overall glow',
  };

  const moodTerms: Record<string, string> = {
    cozy: 'cozy inviting warmth',
    elegant: 'elegant sophisticated atmosphere',
    dramatic: 'dramatic powerful presence',
    inviting: 'welcoming friendly appearance',
  };

  let prompt = `nighttime photograph, ${styleTerms[style]}, ${colorTerms[colorTemperature]}, ${lightingTerms[lightingType]}, ${moodTerms[mood]}, luxury home exterior at night, photorealistic, high quality photography`;

  if (includeStars) {
    prompt += ', dark sky with visible stars';
  }

  if (includeMoon) {
    prompt += ', subtle moonlight';
  }

  return prompt;
}

/**
 * Get the light source setting that matches the lighting type
 */
export function getLightSourceForType(lightingType: 'uplighting' | 'downlighting' | 'left' | 'right'): ICLightSettings['lightSource'] {
  switch (lightingType) {
    case 'uplighting':
      return 'Bottom Light';
    case 'downlighting':
      return 'Top Light';
    case 'left':
      return 'Left Light';
    case 'right':
      return 'Right Light';
    default:
      return 'Bottom Light';
  }
}
