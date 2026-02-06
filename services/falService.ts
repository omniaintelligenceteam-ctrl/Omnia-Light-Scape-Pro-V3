/**
 * fal.ai API Service
 *
 * Shared client for IC-Light V2 and FLUX Fill API calls.
 * Routes through /api/fal-proxy (Vercel serverless) to avoid CORS.
 * API key stays server-side — never exposed to browser.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const FAL_PROXY_URL = '/api/fal-proxy';
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

/**
 * Call the fal-proxy serverless function
 */
async function proxyFetch(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(FAL_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Proxy error (${response.status})`);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Submit a request to fal.ai queue (via proxy) and poll for results
 */
export async function falQueueRequest(
  modelId: string,
  input: Record<string, unknown>,
  onProgress?: FalProgressCallback
): Promise<FalResult> {
  // Submit to queue via proxy
  onProgress?.('Submitting request...', 5);
  const queueData = await proxyFetch({
    action: 'submit',
    modelId,
    input,
  }) as FalQueueResponse;

  const requestId = queueData.request_id;
  if (!requestId) {
    throw new Error('No request_id returned from fal.ai queue');
  }

  // Poll for result via proxy
  onProgress?.('Processing...', 15);
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusData = await proxyFetch({
      action: 'status',
      modelId,
      requestId,
    }) as FalStatusResponse;

    const progress = Math.min(90, 15 + (attempt / MAX_POLL_ATTEMPTS) * 75);

    switch (statusData.status) {
      case 'COMPLETED': {
        onProgress?.('Complete!', 100);
        const result = await proxyFetch({
          action: 'result',
          modelId,
          requestId,
        });
        return result as unknown as FalResult;
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
 * Make a synchronous request to fal.ai (via proxy)
 */
export async function falSyncRequest(
  modelId: string,
  input: Record<string, unknown>
): Promise<FalResult> {
  const result = await proxyFetch({
    action: 'submit',
    modelId,
    input,
  });
  return result as unknown as FalResult;
}

/**
 * Check if fal.ai API is configured (proxy handles the key)
 */
export async function checkFalStatus(): Promise<{ available: boolean; error?: string }> {
  try {
    // Quick check — proxy will return error if FAL_API_KEY is missing
    await proxyFetch({ action: 'status', modelId: 'test', requestId: 'test' });
    return { available: true };
  } catch (error) {
    // A 400/404 from fal.ai actually means the proxy works (key is configured)
    // Only a 500 with "FAL_API_KEY not configured" means it's broken
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('FAL_API_KEY not configured')) {
      return { available: false, error: msg };
    }
    // Any other error means the proxy is reachable and key is set
    return { available: true };
  }
}
