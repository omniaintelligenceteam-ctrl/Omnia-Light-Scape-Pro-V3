import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';
import crypto from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(16).toString('hex'); // 32 characters
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: projectId, userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Missing project id' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUserId = userData.id;

    // Verify project belongs to user
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('id', projectId)
      .eq('user_id', supabaseUserId)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // POST: Create new share token
    if (req.method === 'POST') {
      const { type, expiresInDays, invoiceData } = req.body;

      if (!type || !['quote', 'invoice'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be "quote" or "invoice"' });
      }

      // Calculate expiration (default 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 30));

      // If this is an invoice share, save the invoice data to the project
      if (type === 'invoice' && invoiceData) {
        const { error: invoiceError } = await supabase
          .from('projects')
          .update({ invoice_data: invoiceData })
          .eq('id', projectId);

        if (invoiceError) {
          console.error('Failed to save invoice data:', invoiceError);
        }
      }

      // Check for existing active token of this type
      const { data: existingToken } = await supabase
        .from('share_tokens')
        .select('id, token, expires_at')
        .eq('project_id', projectId)
        .eq('type', type)
        .gt('expires_at', new Date().toISOString())
        .single();

      // If active token exists, update invoice data if provided and return the token
      if (existingToken) {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:5173';

        return res.status(200).json({
          success: true,
          data: {
            token: existingToken.token,
            type,
            expiresAt: existingToken.expires_at,
            shareUrl: `${baseUrl}/p/${type}/${existingToken.token}`
          },
          existing: true
        });
      }

      // Create new token
      const token = generateToken();

      const { data, error } = await supabase
        .from('share_tokens')
        .insert({
          user_id: supabaseUserId,
          project_id: projectId,
          client_id: projectData.client_id || null,
          token,
          type,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update project with quote_sent_at or invoice_sent_at
      const updateField = type === 'quote' ? 'quote_sent_at' : 'invoice_sent_at';
      const { error: timestampError } = await supabase
        .from('projects')
        .update({ [updateField]: new Date().toISOString() })
        .eq('id', projectId);

      if (timestampError) {
        console.error('Failed to update share timestamp:', timestampError);
      }

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5173';

      return res.status(201).json({
        success: true,
        data: {
          token: data.token,
          type,
          expiresAt: data.expires_at,
          shareUrl: `${baseUrl}/p/${type}/${data.token}`
        }
      });
    }

    // GET: List share tokens for project
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('share_tokens')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    // DELETE: Revoke a share token
    if (req.method === 'DELETE') {
      const { tokenId } = req.body;

      if (!tokenId) {
        return res.status(400).json({ error: 'Missing tokenId' });
      }

      const { error } = await supabase
        .from('share_tokens')
        .delete()
        .eq('id', tokenId)
        .eq('project_id', projectId);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Share token API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
