import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './lib/supabase.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, userId } = req.body;

    if (!prompt || !userId) {
      return res.status(400).json({ error: 'Missing prompt or userId' });
    }

    // Check if user has active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return res.status(403).json({
        error: 'Active subscription required',
        message: 'Please subscribe to generate images ($250/month or $2000/year)'
      });
    }

    // Rate limiting: Check last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('render_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', tenMinutesAgo);

    if (countError) {
      console.error('Rate limit check error:', countError);
    } else if (count && count >= 10) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can generate up to 10 renders every 10 minutes. Please try again later.',
        retryAfter: 600
      });
    }

    // Generate image with Gemini
    const startTime = Date.now();

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const generationTime = Date.now() - startTime;
    const response = result.text;

    // Log the render
    await supabase.from('render_logs').insert({
      user_id: userId,
      prompt_length: prompt.length,
      generation_time_ms: generationTime,
      success: true,
      created_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      data: response,
      generationTime
    });

  } catch (error: any) {
    console.error('Generation error:', error);

    // Log failed render
    if (req.body?.userId) {
      await supabase.from('render_logs').insert({
        user_id: req.body.userId,
        success: false,
        error_message: error.message,
        created_at: new Date().toISOString()
      });
    }

    return res.status(500).json({
      error: 'Generation failed',
      message: error.message
    });
  }
}
