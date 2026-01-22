import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId } = req.query;
  const authToken = req.query.token as string;

  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Missing clientId' });
  }

  if (!authToken) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Verify the token belongs to this client and is still valid
    const { data: tokenData, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('id, client_id, expires_at')
      .eq('token', authToken)
      .eq('client_id', clientId)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get client's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        generated_image_url,
        original_image_url,
        created_at,
        quote_sent_at,
        quote_approved_at,
        invoice_sent_at,
        invoice_paid_at,
        total_price,
        prompt_config
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Projects fetch error:', projectsError);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    // Get share tokens for quote/invoice links
    const projectIds = projects?.map(p => p.id) || [];
    let shareTokens: any[] = [];

    if (projectIds.length > 0) {
      const { data: tokens } = await supabase
        .from('share_tokens')
        .select('project_id, token, type, expires_at')
        .in('project_id', projectIds)
        .gt('expires_at', new Date().toISOString());

      shareTokens = tokens || [];
    }

    // Build response with projects and their share links
    const projectsWithLinks = (projects || []).map(project => {
      const quoteToken = shareTokens.find(t => t.project_id === project.id && t.type === 'quote');
      const invoiceToken = shareTokens.find(t => t.project_id === project.id && t.type === 'invoice');

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        imageUrl: project.generated_image_url || project.original_image_url,
        createdAt: project.created_at,
        totalPrice: project.total_price,
        quote: {
          sentAt: project.quote_sent_at,
          approvedAt: project.quote_approved_at,
          token: quoteToken?.token || null
        },
        invoice: {
          sentAt: project.invoice_sent_at,
          paidAt: project.invoice_paid_at,
          token: invoiceToken?.token || null
        }
      };
    });

    // Categorize projects
    const pendingQuotes = projectsWithLinks.filter(p => p.quote.sentAt && !p.quote.approvedAt);
    const approvedProjects = projectsWithLinks.filter(p => p.quote.approvedAt);
    const pendingInvoices = projectsWithLinks.filter(p => p.invoice.sentAt && !p.invoice.paidAt);
    const paidInvoices = projectsWithLinks.filter(p => p.invoice.paidAt);

    return res.status(200).json({
      success: true,
      data: {
        projects: projectsWithLinks,
        summary: {
          totalProjects: projectsWithLinks.length,
          pendingQuotes: pendingQuotes.length,
          approvedProjects: approvedProjects.length,
          pendingInvoices: pendingInvoices.length,
          paidInvoices: paidInvoices.length
        }
      }
    });

  } catch (error: any) {
    console.error('Portal data error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
