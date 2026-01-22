import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase.js';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 characters
}

function generatePortalInviteHtml(data: {
  clientName: string;
  companyName: string;
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #F6B45A 0%, #E09F45 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: 700;">${data.companyName}</h1>
      <p style="margin: 8px 0 0; color: rgba(0,0,0,0.7); font-size: 14px;">Client Portal Access</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        Hi ${data.clientName},
      </p>
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        You've been invited to access your project portal where you can view your projects, quotes, and invoices.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #F6B45A 0%, #E09F45 100%); color: #000; font-weight: 600; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
          Access My Portal
        </a>
      </div>

      <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
        This link expires in 7 days. If you need a new link, please contact ${data.companyName}.
      </p>

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <!-- Footer -->
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        If you didn't request this access, you can safely ignore this email.
      </p>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0;">Powered by Omnia LightScape</p>
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

  const { clientId, userId: clerkUserId } = req.body;

  if (!clientId || !clerkUserId) {
    return res.status(400).json({ error: 'Missing clientId or userId' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
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
      .select('company_name')
      .eq('user_id', userData.id)
      .single();

    const companyName = settings?.company_name || 'Your Lighting Company';

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

    // Update client portal_enabled flag (optional - may not exist yet)
    try {
      await supabase
        .from('clients')
        .update({ portal_enabled: true })
        .eq('id', clientId);
    } catch {
      // Column may not exist yet - that's ok
    }

    // Build portal URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173';
    const portalUrl = `${baseUrl}/portal?token=${token}`;

    // Send email
    const html = generatePortalInviteHtml({
      clientName: client.name,
      companyName,
      portalUrl
    });

    const { error: emailError } = await resend.emails.send({
      from: `${companyName} <noreply@omnialightscapepro.com>`,
      to: client.email,
      subject: `${companyName} - Access Your Project Portal`,
      html
    });

    if (emailError) {
      console.error('Email error:', emailError);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({
      success: true,
      message: `Portal invite sent to ${client.email}`
    });

  } catch (error: any) {
    console.error('Send invite error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
