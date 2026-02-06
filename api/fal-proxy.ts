import type { VercelRequest, VercelResponse } from '@vercel/node';

const FAL_QUEUE_URL = 'https://queue.fal.run';

/**
 * Vercel serverless proxy for fal.ai API calls.
 * Solves CORS: browser → /api/fal-proxy → fal.ai → response
 * API key stays server-side (process.env.FAL_API_KEY).
 *
 * Actions:
 *   submit  - POST to fal.ai queue (send model + input)
 *   status  - GET request status (poll)
 *   result  - GET completed result
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

  const { action, modelId, input, requestId } = req.body;

  if (!action || !modelId) {
    return res.status(400).json({ error: 'Missing action or modelId' });
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

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    console.error('[fal-proxy] Error:', message);
    return res.status(500).json({ error: message });
  }
}
