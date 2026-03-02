import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMockup, type GenerateMockupOptions } from '../src/lib/mockup/generateMockup';
import type { MockupRenderSpec } from '../src/lib/mockup/spec';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const spec = req.body?.spec as MockupRenderSpec | undefined;
    const options = (req.body?.options || {}) as GenerateMockupOptions;
    if (!spec) {
      return res.status(400).json({ error: 'Missing spec in request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const result = await generateMockup(spec, {
      apiKey,
      outputTier: options.outputTier || 'preview',
      aspectRatio: options.aspectRatio,
      imageModel: options.imageModel,
      qaModel: options.qaModel,
      qaRetryLimit: options.qaRetryLimit,
    });

    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}
