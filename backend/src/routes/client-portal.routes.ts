import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 characters
}

function generatePortalInviteHtml(data: {
  clientName: string;
  companyName: string;
  companyLogo?: string | null;
  portalUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Your Project Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Premium Header with Logo -->
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center; position: relative;">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #D4A04A, transparent);"></div>

      ${data.companyLogo ? `
      <img src="${data.companyLogo}" alt="${data.companyName}" style="max-height: 60px; max-width: 180px; margin-bottom: 16px; display: inline-block;" />
      ` : ''}

      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${data.companyName}</h1>
      <p style="margin: 10px 0 0; color: #D4A04A; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Client Portal</p>
    </div>

    <!-- Main Content -->
    <div style="background: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">

      <p style="margin: 0 0 20px; color: #1a1a1a; font-size: 17px; font-weight: 600;">
        Hello ${data.clientName},
      </p>
      <p style="margin: 0 0 28px; color: #555; font-size: 15px; line-height: 1.7;">
        You've been granted exclusive access to your personal project portal. Here you can view your projects, review quotes, and manage invoices.
      </p>

      <!-- Premium CTA Button -->
      <div style="text-align: center; margin: 36px 0;">
        <a href="${data.portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4A04A 0%, #B8903D 100%); color: #ffffff; font-weight: 700; padding: 18px 48px; border-radius: 8px; text-decoration: none; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 14px rgba(212, 160, 74, 0.35);">
          Access Your Portal
        </a>
      </div>

      <p style="margin: 28px 0 0; color: #888; font-size: 13px; text-align: center; line-height: 1.6;">
        This secure link expires in 7 days.<br>
        Need assistance? Contact ${data.companyName} directly.
      </p>

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

      <!-- Footer Note -->
      <p style="margin: 0; color: #aaa; font-size: 12px; text-align: center;">
        If you didn't request this access, you can safely ignore this email.
      </p>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; padding: 0 20px;">
      <p style="margin: 0; color: #bbb; font-size: 10px;">
        Powered by Omnia LightScape
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

// POST /api/client-portal/send-invite
router.post('/send-invite', async (req: Request, res: Response) => {
  const { clientId, userId: clerkUserId } = req.body;

  if (!clientId || !clerkUserId) {
    return res.status(400).json({ error: 'Missing clientId or userId' });
  }

  if (!supabase) {
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

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, user_id')
      .eq('id', clientId)
      .eq('user_id', userData.id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.email) {
      return res.status(400).json({ error: 'Client has no email address' });
    }

    // Get company settings
    const { data: settings } = await supabase
      .from('settings')
      .select('company_name, company_logo')
      .eq('user_id', userData.id)
      .single();

    const companyName = settings?.company_name || 'Your Lighting Company';
    const companyLogo = settings?.company_logo || null;

    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Save token to database
    const { error: tokenError } = await supabase
      .from('client_portal_tokens')
      .insert({
        client_id: clientId,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error('Token insert error:', tokenError);
      return res.status(500).json({ error: 'Failed to create portal token. Make sure you have run the database migration.' });
    }

    // Update client portal_enabled flag (optional)
    try {
      await supabase
        .from('clients')
        .update({ portal_enabled: true })
        .eq('id', clientId);
    } catch {
      // Column may not exist yet
    }

    // Build portal URL - prefer APP_URL for production domain
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const portalUrl = `${baseUrl}/portal?token=${token}`;

    // For local dev, we'll skip email and just return the URL
    // In production, you'd send the email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const html = generatePortalInviteHtml({
          clientName: client.name,
          companyName,
          companyLogo,
          portalUrl
        });

        await resend.emails.send({
          from: `${companyName} <noreply@omnialightscapepro.com>`,
          to: client.email,
          subject: `${companyName} - Access Your Project Portal`,
          html
        });

        return res.status(200).json({
          success: true,
          message: `Portal invite sent to ${client.email}`
        });
      } catch (emailError: any) {
        console.error('Email error:', emailError);
        return res.status(500).json({ error: 'Failed to send email', portalUrl });
      }
    } else {
      // No email configured, return the URL for manual sharing
      return res.status(200).json({
        success: true,
        message: `Portal link created (email not configured)`,
        portalUrl
      });
    }

  } catch (error: any) {
    console.error('Send invite error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// POST /api/client-portal/verify
router.post('/verify', async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up token
    const { data: tokenData, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('id, client_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This link has expired. Please request a new one.' });
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, user_id')
      .eq('id', tokenData.client_id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get company details
    const { data: settings } = await supabase
      .from('settings')
      .select('company_name, company_logo')
      .eq('user_id', client.user_id)
      .single();

    // Mark token as used
    if (!tokenData.used_at) {
      await supabase
        .from('client_portal_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);
    }

    // Update client's last portal access (optional)
    try {
      await supabase
        .from('clients')
        .update({ last_portal_access: new Date().toISOString() })
        .eq('id', client.id);
    } catch {
      // Column may not exist yet
    }

    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 7);

    return res.status(200).json({
      success: true,
      data: {
        sessionToken: token,
        sessionExpires: sessionExpires.toISOString(),
        client: {
          id: client.id,
          name: client.name,
          email: client.email
        },
        company: {
          name: settings?.company_name || 'Your Lighting Company',
          logo: settings?.company_logo || null
        }
      }
    });

  } catch (error: any) {
    console.error('Verify token error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GET /api/client-portal/data
router.get('/data', async (req: Request, res: Response) => {
  const { clientId, token: authToken } = req.query;

  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Missing clientId' });
  }

  if (!authToken) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Verify the token belongs to this client
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

    // Get share tokens for links
    const projectIds = projects?.map((p: any) => p.id) || [];
    let shareTokens: any[] = [];

    if (projectIds.length > 0) {
      const { data: tokens } = await supabase
        .from('share_tokens')
        .select('project_id, token, type, expires_at')
        .in('project_id', projectIds)
        .gt('expires_at', new Date().toISOString());

      shareTokens = tokens || [];
    }

    // Build response
    const projectsWithLinks = (projects || []).map((project: any) => {
      const quoteToken = shareTokens.find((t: any) => t.project_id === project.id && t.type === 'quote');
      const invoiceToken = shareTokens.find((t: any) => t.project_id === project.id && t.type === 'invoice');

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

    const pendingQuotes = projectsWithLinks.filter((p: any) => p.quote.sentAt && !p.quote.approvedAt);
    const approvedProjects = projectsWithLinks.filter((p: any) => p.quote.approvedAt);
    const pendingInvoices = projectsWithLinks.filter((p: any) => p.invoice.sentAt && !p.invoice.paidAt);
    const paidInvoices = projectsWithLinks.filter((p: any) => p.invoice.paidAt);

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
});

export default router;
