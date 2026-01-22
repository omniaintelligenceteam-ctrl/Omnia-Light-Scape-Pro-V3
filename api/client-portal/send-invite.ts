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

    // Get company settings including logo
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

    // Send email with premium template
    const html = generatePortalInviteHtml({
      clientName: client.name,
      companyName,
      companyLogo,
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
