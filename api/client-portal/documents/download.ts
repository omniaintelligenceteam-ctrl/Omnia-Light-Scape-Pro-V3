import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, documentId } = req.query;

  if (!token || typeof token !== 'string' || !documentId || typeof documentId !== 'string') {
    return res.status(400).json({ error: 'Missing required parameters: token, documentId' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Validate portal token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('client_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const clientId = tokenData.client_id;

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('client_documents')
      .select('*')
      .eq('id', documentId)
      .eq('client_id', clientId)
      .eq('is_visible_to_client', true)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    // Generate signed URL with 1-hour expiry for secure document access
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(document.file_url, 3600); // 1 hour expiry

    if (signedError || !signedUrlData) {
      console.error('Signed URL generation error:', signedError);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: document.id,
        name: document.document_name,
        url: signedUrlData.signedUrl, // Use signed URL instead of direct URL
        type: document.document_type,
        size: document.file_size_bytes,
        mimeType: document.mime_type,
        uploadedAt: document.uploaded_at
      }
    });

  } catch (error: any) {
    console.error('Document download error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
