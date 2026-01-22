import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ScheduleEmailRequest {
  clientEmail: string;
  clientName: string;
  projectName: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  scheduledDate: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'custom';
  customTime?: string;
  installationNotes?: string;
  address?: string;
}

function getTimeSlotText(timeSlot: string, customTime?: string): string {
  const slots: Record<string, string> = {
    morning: '8:00 AM - 12:00 PM',
    afternoon: '12:00 PM - 5:00 PM',
    evening: '5:00 PM - 8:00 PM',
    custom: customTime || 'To be confirmed'
  };
  return slots[timeSlot] || 'To be confirmed';
}

function generateScheduleConfirmationHtml(data: ScheduleEmailRequest): string {
  const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const timeSlotText = getTimeSlotText(data.timeSlot, data.customTime);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Installation Scheduled - ${data.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">📅</div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Installation Scheduled!</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${data.companyName}</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <!-- Greeting -->
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        Hi ${data.clientName},
      </p>
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        Great news! Your landscape lighting installation for <strong>${data.projectName}</strong> has been scheduled. Here are the details:
      </p>

      <!-- Schedule Details Card -->
      <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; margin-bottom: 16px;">
          <div style="width: 24px; color: #10b981; font-size: 20px;">📆</div>
          <div style="flex: 1; margin-left: 12px;">
            <p style="margin: 0 0 4px; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Date</p>
            <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${scheduledDateFormatted}</p>
          </div>
        </div>

        <div style="display: flex; margin-bottom: 16px;">
          <div style="width: 24px; color: #10b981; font-size: 20px;">⏰</div>
          <div style="flex: 1; margin-left: 12px;">
            <p style="margin: 0 0 4px; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Time Window</p>
            <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${timeSlotText}</p>
          </div>
        </div>

        ${data.address ? `
        <div style="display: flex;">
          <div style="width: 24px; color: #10b981; font-size: 20px;">📍</div>
          <div style="flex: 1; margin-left: 12px;">
            <p style="margin: 0 0 4px; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Location</p>
            <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.address}</p>
          </div>
        </div>
        ` : ''}
      </div>

      ${data.installationNotes ? `
      <!-- Installation Notes -->
      <div style="background: #fef3c7; border-left: 4px solid #F6B45A; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Installation Notes:</p>
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; white-space: pre-line;">${data.installationNotes}</p>
      </div>
      ` : ''}

      <!-- What to Expect -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">What to Expect:</p>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
          <li>Our team will arrive during the scheduled time window</li>
          <li>Installation typically takes 2-4 hours depending on the scope</li>
          <li>We'll test all lights and walk you through the system</li>
          <li>Please ensure clear access to the installation areas</li>
        </ul>
      </div>

      <!-- Contact Info -->
      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; color: #111827; font-size: 14px; font-weight: 600;">Need to reschedule or have questions?</p>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
          Contact us at <a href="mailto:${data.companyEmail}" style="color: #10b981; text-decoration: none; font-weight: 500;">${data.companyEmail}</a>
          ${data.companyPhone ? `<br>or call <a href="tel:${data.companyPhone}" style="color: #10b981; text-decoration: none; font-weight: 500;">${data.companyPhone}</a>` : ''}
        </p>
      </div>

      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
        We're excited to bring your lighting vision to life!
      </p>

      <p style="margin: 24px 0 0; color: #374151; font-size: 14px;">
        Best regards,<br>
        <strong>${data.companyName}</strong>
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

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const data: ScheduleEmailRequest = req.body;

  // Validate required fields
  if (!data.clientEmail || !data.clientName || !data.projectName || !data.companyName || !data.companyEmail || !data.scheduledDate || !data.timeSlot) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const html = generateScheduleConfirmationHtml(data);

    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    await resend.emails.send({
      from: `${data.companyName} <noreply@omnialightscapepro.com>`,
      to: data.clientEmail,
      subject: `📅 Installation Scheduled for ${scheduledDateFormatted} - ${data.projectName}`,
      html
    });

    return res.status(200).json({ success: true, message: 'Schedule confirmation sent' });
  } catch (error: any) {
    console.error('Failed to send schedule confirmation:', error);
    return res.status(500).json({ error: 'Failed to send email', message: error.message });
  }
}
