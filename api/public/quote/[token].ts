import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
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

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', shareToken.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get client details if available
    let client = null;
    if (shareToken.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, email, phone, address')
        .eq('id', shareToken.client_id)
        .single();
      client = clientData;
    }

    // Get user (company) details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', shareToken.user_id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get company settings if available
    let companySettings = null;
    const { data: settingsData } = await supabase
      .from('settings')
      .select('company_name, company_email, company_phone, company_address')
      .eq('user_id', userData.id)
      .single();

    if (settingsData) {
      companySettings = settingsData;
    }

    // Check if quote was already approved
    const { data: approval } = await supabase
      .from('quote_approvals')
      .select('approved_at')
      .eq('project_id', project.id)
      .single();

    return res.status(200).json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          generatedImageUrl: project.generated_image_url,
          originalImageUrl: project.original_image_url,
          promptConfig: project.prompt_config,
          quoteExpiresAt: shareToken.expires_at,
          createdAt: project.created_at
        },
        client: client ? {
          name: client.name,
          email: client.email
        } : null,
        company: {
          name: companySettings?.company_name || 'Lighting Company',
          email: companySettings?.company_email || userData.email,
          phone: companySettings?.company_phone || null,
          address: companySettings?.company_address || null
        },
        approved: approval ? {
          approvedAt: approval.approved_at
        } : null
      }
    });

  } catch (error: any) {
    console.error('Public quote API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
