import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up share token
    const { data: shareToken, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', 'quote')
      .single();

    if (tokenError || !shareToken) {
      return res.status(404).json({ error: 'Quote not found or link has expired' });
    }

    // Check expiration
    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This quote link has expired' });
    }

    // Check if already approved
    const { data: existingApproval } = await supabase
      .from('quote_approvals')
      .select('id, approved_at')
      .eq('project_id', shareToken.project_id)
      .single();

    if (existingApproval) {
      return res.status(200).json({
        success: true,
        message: 'Quote was already approved',
        data: {
          approvedAt: existingApproval.approved_at
        },
        alreadyApproved: true
      });
    }

    // Get client IP for audit trail
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                     req.headers['x-real-ip'] as string ||
                     'unknown';

    // Get optional signature from body
    const { signature } = req.body || {};

    // Create approval record
    const { data: approval, error: approvalError } = await supabase
      .from('quote_approvals')
      .insert({
        project_id: shareToken.project_id,
        client_id: shareToken.client_id || null,
        share_token_id: shareToken.id,
        client_ip: clientIp,
        client_signature: signature || null
      })
      .select()
      .single();

    if (approvalError) throw approvalError;

    // Update project with approval timestamp
    await supabase
      .from('projects')
      .update({ quote_approved_at: new Date().toISOString() })
      .eq('id', shareToken.project_id);

    return res.status(200).json({
      success: true,
      message: 'Quote approved successfully',
      data: {
        approvedAt: approval.approved_at
      }
    });

  } catch (error: any) {
    console.error('Quote approval API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
