import type { VercelRequest, VercelResponse } from '@vercel/node';

const FAL_QUEUE_URL = 'https://queue.fal.run';

/**
 * Vercel serverless proxy for fal.ai API calls.
 * Solves CORS: browser → /api/fal-proxy → fal.ai → response
 * API key stays server-side (process.env.FAL_API_KEY).
 *
 * Actions:
 *   submit    - POST to fal.ai queue (send model + input)
 *   status    - GET request status (poll) — legacy, use fetchUrl instead
 *   result    - GET completed result — legacy, use fetchUrl instead
 *   fetchUrl  - GET any fal.ai URL (for status_url / response_url from submit)
 *   fetchImage - Download image from fal.ai CDN and return as base64
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // base64 images can be large
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FAL_API_KEY not configured on server' });
  }

  const { action, modelId, input, requestId, url } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Missing action' });
  }

  // submit/status/result require modelId; fetchUrl/fetchImage require url
  if (['submit', 'status', 'result'].includes(action) && !modelId) {
    return res.status(400).json({ error: 'Missing modelId' });
  }

  try {
    switch (action) {
      case 'submit': {
        const response = await fetch(`${FAL_QUEUE_URL}/${modelId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({
            error: `fal.ai submit error (${response.status}): ${errorText}`,
          });
        }

        const data = await response.json();
        return res.status(200).json(data);
      }

      case 'status': {
        if (!requestId) {
          return res.status(400).json({ error: 'Missing requestId for status check' });
        }

        const response = await fetch(
          `${FAL_QUEUE_URL}/${modelId}/requests/${requestId}/status`,
          { headers: { 'Authorization': `Key ${apiKey}` } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({
            error: `fal.ai status error: ${errorText}`,
          });
        }

        const data = await response.json();
        return res.status(200).json(data);
      }

      case 'result': {
        if (!requestId) {
          return res.status(400).json({ error: 'Missing requestId for result fetch' });
        }

        const response = await fetch(
          `${FAL_QUEUE_URL}/${modelId}/requests/${requestId}`,
          { headers: { 'Authorization': `Key ${apiKey}` } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({
            error: `fal.ai result error: ${errorText}`,
          });
        }

        const data = await response.json();
        return res.status(200).json(data);
      }

      case 'fetchUrl': {
        // Fetch any fal.ai URL server-side (for status_url / response_url)
        if (!url || typeof url !== 'string' || !url.includes('fal.run')) {
          return res.status(400).json({ error: 'Invalid or missing fal.ai URL' });
        }

        const fetchUrlResponse = await fetch(url, {
          headers: { 'Authorization': `Key ${apiKey}` },
        });

        if (!fetchUrlResponse.ok) {
          const errorText = await fetchUrlResponse.text();
          return res.status(fetchUrlResponse.status).json({
            error: `fal.ai error (${fetchUrlResponse.status}): ${errorText}`,
          });
        }

        const fetchUrlData = await fetchUrlResponse.json();
        return res.status(200).json(fetchUrlData);
      }

      case 'fetchImage': {
        // Download image from fal.ai CDN and return as base64
        if (!url || typeof url !== 'string') {
          return res.status(400).json({ error: 'Missing image URL' });
        }

        // Security: only allow fal.ai domains
        const allowedDomains = ['fal.media', 'fal.ai', 'fal.run', 'v3.fal.media'];
        const urlObj = new URL(url);
        const isAllowed = allowedDomains.some(d => urlObj.hostname.endsWith(d));
        if (!isAllowed) {
          return res.status(400).json({ error: 'URL not on allowed fal.ai domain' });
        }

        const imgResponse = await fetch(url);
        if (!imgResponse.ok) {
          return res.status(imgResponse.status).json({
            error: `Image fetch failed (${imgResponse.status})`,
          });
        }

        const buffer = Buffer.from(await imgResponse.arrayBuffer());
        return res.status(200).json({ base64: buffer.toString('base64') });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    console.error('[fal-proxy] Error:', message);
    return res.status(500).json({ error: message });
  }
}
