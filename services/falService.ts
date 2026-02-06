/**
 * fal.ai API Service
 *
 * Shared client for IC-Light V2 and FLUX Fill API calls.
 * Uses direct REST calls (no SDK dependency).
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const FAL_QUEUE_URL = 'https://queue.fal.run';
const FAL_RUN_URL = 'https://fal.run';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // 5 minutes max

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FalImage {
  url: string;
  width: number;
  height: number;
  content_type: string;
}

export interface FalResult {
  images: FalImage[];
  seed: number;
  prompt: string;
  timings?: Record<string, number>;
  has_nsfw_concepts?: boolean[];
}

export interface FalQueueResponse {
  request_id: string;
  status: string;
  response_url?: string;
}

export interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  response_url?: string;
  logs?: Array<{ message: string; timestamp: string }>;
}

export type FalProgressCallback = (status: string, progress?: number) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function getFalApiKey(): string {
  const key = (import.meta.env as Record<string, string>).VITE_FAL_API_KEY;
  if (!key) {
    throw new Error('VITE_FAL_API_KEY is not configured. Please add it to your .env file.');
  }
  return key;
}

/**
 * Convert base64 image to a data URI for fal.ai
 */
export function toFalDataUri(base64: string, mimeType: string = 'image/jpeg'): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Fetch an image from URL and return as base64
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Submit a request to fal.ai queue and poll for results
 */
export async function falQueueRequest(
  modelId: string,
  input: Record<string, unknown>,
  onProgress?: FalProgressCallback
): Promise<FalResult> {
  const apiKey = getFalApiKey();

  // Submit to queue
  onProgress?.('Submitting request...', 5);
  const submitResponse = await fetch(`${FAL_QUEUE_URL}/${modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`fal.ai submit error (${submitResponse.status}): ${errorText}`);
  }

  const queueData: FalQueueResponse = await submitResponse.json();
  const requestId = queueData.request_id;

  if (!requestId) {
    throw new Error('No request_id returned from fal.ai queue');
  }

  // Poll for result
  onProgress?.('Processing...', 15);
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusResponse = await fetch(
      `${FAL_QUEUE_URL}/${modelId}/requests/${requestId}/status`,
      {
        headers: { 'Authorization': `Key ${apiKey}` },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`fal.ai status check failed: ${statusResponse.statusText}`);
    }

    const statusData: FalStatusResponse = await statusResponse.json();
    const progress = Math.min(90, 15 + (attempt / MAX_POLL_ATTEMPTS) * 75);

    switch (statusData.status) {
      case 'COMPLETED': {
        onProgress?.('Complete!', 100);
        // Fetch the result
        const resultResponse = await fetch(
          `${FAL_QUEUE_URL}/${modelId}/requests/${requestId}`,
          {
            headers: { 'Authorization': `Key ${apiKey}` },
          }
        );
        if (!resultResponse.ok) {
          throw new Error(`Failed to fetch result: ${resultResponse.statusText}`);
        }
        return await resultResponse.json();
      }
      case 'IN_QUEUE':
        onProgress?.('Waiting in queue...', progress);
        break;
      case 'IN_PROGRESS':
        onProgress?.('Generating...', progress);
        break;
      default:
        onProgress?.(`Status: ${statusData.status}`, progress);
    }
  }

  throw new Error('fal.ai request timed out after 5 minutes');
}

/**
 * Make a synchronous request to fal.ai (for fast operations)
 */
export async function falSyncRequest(
  modelId: string,
  input: Record<string, unknown>
): Promise<FalResult> {
  const apiKey = getFalApiKey();

  const response = await fetch(`${FAL_RUN_URL}/${modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai sync error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Check if fal.ai API is configured and accessible
 */
export async function checkFalStatus(): Promise<{ available: boolean; error?: string }> {
  try {
    getFalApiKey();
    return { available: true };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'fal.ai API key not configured',
    };
  }
}
