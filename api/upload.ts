import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, userId } = req.body;

    if (!image || !userId) {
      return res.status(400).json({ error: 'Missing image or userId' });
    }

    // Extract base64 data and mime type
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `${userId}/${Date.now()}.${extension}`;

    let supabase;
    try {
      supabase = getSupabase();
    } catch {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('project-images')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(filename);

    return res.status(200).json({ 
      success: true, 
      url: urlData.publicUrl 
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return res.status(500).json({ error: 'Upload failed', message: error.message });
  }
}
