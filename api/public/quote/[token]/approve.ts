import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabase } from '../../../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

// Generate contractor notification email HTML
function generateApprovalNotificationHtml(data: {
  clientName: string;
  projectName: string;
  total: number;
  approvedAt: string;
}): string {
  const formattedDate = new Date(data.approvedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Approved!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Quote Approved!</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Great news - your client is ready to move forward</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">Project</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700;">${data.projectName}</p>

        <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">Client</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">${data.clientName}</p>

        <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">Quote Total</p>
        <p style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">$${data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6; text-align: center;">
        <strong>${data.clientName}</strong> approved this quote on<br>
        <span style="color: #6b7280;">${formattedDate}</span>
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #F6B45A; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Next Steps:</p>
        <ul style="margin: 8px 0 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.6;">
          <li>Contact ${data.clientName} to schedule the installation</li>
          <li>Confirm materials and equipment availability</li>
          <li>Send invoice when ready for payment</li>
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
          View Project →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0;">Notification from Omnia LightScape</p>
    </div>

  </div>
</body>
</html>
  `;
}

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
    const approvedAt = new Date().toISOString();
    const { data: approval, error: approvalError } = await supabase
      .from('quote_approvals')
      .insert({
        project_id: shareToken.project_id,
        client_id: shareToken.client_id || null,
        share_token_id: shareToken.id,
        client_ip: clientIp,
        client_signature: signature || null,
        approved_at: approvedAt
      })
      .select()
      .single();

    if (approvalError) throw approvalError;

    // Update project with approval timestamp and status
    await supabase
      .from('projects')
      .update({
        quote_approved_at: approvedAt,
        status: 'approved'
      })
      .eq('id', shareToken.project_id);

    // Fetch project details for notification email
    const { data: project } = await supabase
      .from('projects')
      .select('name, prompt_config, user_id')
      .eq('id', shareToken.project_id)
      .single();

    // Fetch contractor (user) email and settings
    if (project?.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', project.user_id)
        .single();

      // Send notification email to contractor
      if (userData?.email && process.env.RESEND_API_KEY) {
        const clientName = project.prompt_config?.quote?.clientDetails?.name || 'Client';
        const quoteTotal = project.prompt_config?.quote?.total || 0;

        const html = generateApprovalNotificationHtml({
          clientName,
          projectName: project.name,
          total: quoteTotal,
          approvedAt
        });

        try {
          await resend.emails.send({
            from: 'Omnia LightScape <noreply@omnialightscapepro.com>',
            to: userData.email,
            subject: `🎉 Quote Approved! ${clientName} approved "${project.name}"`,
            html
          });
          console.log(`Approval notification sent to ${userData.email}`);
        } catch (emailError) {
          // Don't fail the approval if email fails
          console.error('Failed to send approval notification:', emailError);
        }
      }
    }

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
