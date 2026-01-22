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
      .eq('type', 'invoice')
      .single();

    if (tokenError || !shareToken) {
      return res.status(404).json({ error: 'Invoice not found or link has expired' });
    }

    // Check expiration
    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invoice link has expired' });
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
      .select('company_name, company_email, company_phone, company_address, company_logo')
      .eq('user_id', userData.id)
      .single();

    if (settingsData) {
      companySettings = settingsData;
    }

    // Check if invoice was already paid
    const isPaid = !!project.invoice_paid_at;

    // Get invoice data (line items, totals, etc.)
    const invoiceData = project.invoice_data || null;

    // Get user's Stripe connected account ID for receiving payments
    let stripeAccountId = null;
    const { data: stripeSettings } = await supabase
      .from('settings')
      .select('stripe_account_id')
      .eq('user_id', userData.id)
      .single();

    if (stripeSettings?.stripe_account_id) {
      stripeAccountId = stripeSettings.stripe_account_id;
    }

    return res.status(200).json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          generatedImageUrl: project.generated_image_url,
          originalImageUrl: project.original_image_url,
          promptConfig: project.prompt_config,
          invoiceExpiresAt: shareToken.expires_at,
          invoiceSentAt: project.invoice_sent_at,
          invoicePaidAt: project.invoice_paid_at,
          createdAt: project.created_at
        },
        invoiceData: invoiceData ? {
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          lineItems: invoiceData.lineItems || [],
          subtotal: invoiceData.subtotal,
          taxRate: invoiceData.taxRate,
          taxAmount: invoiceData.taxAmount,
          discount: invoiceData.discount,
          total: invoiceData.total,
          notes: invoiceData.notes
        } : null,
        client: client ? {
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address
        } : null,
        company: {
          name: companySettings?.company_name || 'Lighting Company',
          email: companySettings?.company_email || userData.email,
          phone: companySettings?.company_phone || null,
          address: companySettings?.company_address || null,
          logo: companySettings?.company_logo || null
        },
        paid: isPaid,
        canAcceptPayment: !!stripeAccountId
      }
    });

  } catch (error: any) {
    console.error('Public invoice API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
