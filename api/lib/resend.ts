import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured');
  }

  if (!resendClient) {
    resendClient = new Resend(resendApiKey);
  }

  return resendClient;
}

interface SendInviteEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteLink: string;
  locationName?: string;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Office Manager',
  salesperson: 'Salesperson',
  lead_technician: 'Lead Technician',
  technician: 'Technician'
};

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, inviterName, organizationName, role, inviteLink, locationName } = params;

  const roleDisplayName = ROLE_DISPLAY_NAMES[role] || role;
  const locationText = locationName ? ` at ${locationName}` : '';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #111; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #F6B45A 0%, #e5a24a 100%); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px; color: #000;">&#9889;</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                You're Invited!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; color: #9ca3af; font-size: 16px; line-height: 1.6; text-align: center;">
                <strong style="color: #ffffff;">${inviterName}</strong> has invited you to join
                <strong style="color: #F6B45A;">${organizationName}</strong> as a
                <strong style="color: #ffffff;">${roleDisplayName}</strong>${locationText}.
              </p>

              <!-- Plain text link (copy/paste friendly, bypasses click tracking) -->
              <p style="margin: 0 0 30px; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                Copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); word-break: break-all;">
                <span style="color: #F6B45A; font-size: 12px; font-family: monospace;">${inviteLink}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-align: center;">
                This invite expires in 7 days.
              </p>
              <p style="margin: 0; color: #4b5563; font-size: 11px; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer Logo -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 20px auto 0;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; color: #4b5563; font-size: 12px;">
                Powered by <strong style="color: #F6B45A;">OmniaLightScape</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const resend = getResend();

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'OmniaLightScape <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: `You've been invited to join ${organizationName} on OmniaLightScape`,
      html: emailHtml,
      headers: {
        'X-Entity-Ref-ID': Date.now().toString()
      }
    } as any);

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to send invite email:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}
