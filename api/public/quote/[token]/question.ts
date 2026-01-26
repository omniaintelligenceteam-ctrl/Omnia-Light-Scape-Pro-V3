import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabase } from '../../../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

// Generate question notification email HTML
function generateQuestionEmailHtml(data: {
  clientName: string;
  clientEmail: string | null;
  projectName: string;
  question: string;
  projectId: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Question</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #F6B45A 0%, #E09A3A 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">💬</div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Client Question</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${data.clientName} has a question about their quote</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <!-- Project Info -->
      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Project</p>
        <p style="margin: 0; color: #78350f; font-size: 18px; font-weight: 700;">${data.projectName}</p>
      </div>

      <!-- Client Info -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 600;">From:</p>
        <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.clientName}</p>
        ${data.clientEmail ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${data.clientEmail}</p>` : ''}
      </div>

      <!-- Question -->
      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Question</p>
        <p style="margin: 0; color: #111827; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${data.question}</p>
      </div>

      <!-- Reply Instruction -->
      ${data.clientEmail ? `
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          <strong>Reply directly</strong> to this email to respond to ${data.clientName}.
        </p>
      </div>
      ` : `
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          No email on file for this client. Please contact them through other means.
        </p>
      </div>
      `}

      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #F6B45A 0%, #E09A3A 100%); color: black; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
          View Project →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 11px;">
      <p>This question was sent from your quote portal.</p>
      <p>Powered by Omnia LightScape</p>
    </div>

  </div>
</body>
</html>
`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  const { question } = req.body;

  // Validate inputs
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Missing question' });
  }

  if (question.length > 2000) {
    return res.status(400).json({ error: 'Question too long (max 2000 characters)' });
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

    // Check if token has expired
    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This quote link has expired' });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', shareToken.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get client details if available
    let clientName = 'A potential customer';
    let clientEmail: string | null = null;

    if (shareToken.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', shareToken.client_id)
        .single();

      if (clientData) {
        clientName = clientData.name || clientName;
        clientEmail = clientData.email;
      }
    }

    // Get contractor's email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', shareToken.user_id)
      .single();

    if (userError || !userData?.email) {
      return res.status(500).json({ error: 'Could not find contractor email' });
    }

    // Send email to contractor
    const { error: emailError } = await resend.emails.send({
      from: 'Omnia LightScape <noreply@omnialightscapepro.com>',
      to: userData.email,
      replyTo: clientEmail || undefined,
      subject: `Question from ${clientName} about ${project.name}`,
      html: generateQuestionEmailHtml({
        clientName,
        clientEmail,
        projectName: project.name,
        question: question.trim(),
        projectId: project.id
      })
    });

    if (emailError) {
      console.error('Failed to send question email:', emailError);
      return res.status(500).json({ error: 'Failed to send question' });
    }

    return res.status(200).json({
      success: true,
      message: 'Question sent successfully'
    });

  } catch (error: any) {
    console.error('Quote question API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
