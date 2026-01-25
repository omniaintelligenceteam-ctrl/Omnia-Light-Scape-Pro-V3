import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TechnicianInfo {
  name: string;
  email: string;
}

interface TeamAssignmentRequest {
  technicians: TechnicianInfo[];
  projectName: string;
  clientName: string;
  address?: string;
  scheduledDate: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'custom';
  customTime?: string;
  estimatedDuration?: number;
  installationNotes?: string;
  companyName: string;
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

function generateTeamAssignmentHtml(data: TeamAssignmentRequest, technicianName: string): string {
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
  <title>New Job Assignment - ${data.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">🔧</div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">New Job Assignment</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${data.companyName}</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <!-- Greeting -->
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        Hi ${technicianName},
      </p>
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        You've been assigned to a new job. Here are the details:
      </p>

      <!-- Project Info Card -->
      <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Project</p>
          <p style="margin: 0; color: #111827; font-size: 20px; font-weight: 700;">${data.projectName}</p>
        </div>

        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Client</p>
          <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.clientName}</p>
        </div>

        ${data.address ? `
        <div>
          <p style="margin: 0 0 4px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Address</p>
          <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.address}</p>
        </div>
        ` : ''}
      </div>

      <!-- Schedule Details Card -->
      <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px; color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Schedule</p>

        <div style="display: flex; margin-bottom: 16px;">
          <div style="width: 24px; color: #10b981; font-size: 20px;">📆</div>
          <div style="flex: 1; margin-left: 12px;">
            <p style="margin: 0 0 4px; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Date</p>
            <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${scheduledDateFormatted}</p>
          </div>
        </div>

        <div style="display: flex; margin-bottom: ${data.estimatedDuration ? '16px' : '0'};">
          <div style="width: 24px; color: #10b981; font-size: 20px;">⏰</div>
          <div style="flex: 1; margin-left: 12px;">
            <p style="margin: 0 0 4px; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Time Window</p>
            <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${timeSlotText}</p>
          </div>
        </div>

        ${data.estimatedDuration ? `
        <div style="display: flex;">
          <div style="width: 24px; color: #10b981; font-size: 20px;">⏱️</div>
          <div style="flex: 1; margin-left: 12px;">
            <p style="margin: 0 0 4px; color: #065f46; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Duration</p>
            <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${data.estimatedDuration} hour${data.estimatedDuration > 1 ? 's' : ''}</p>
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

  const data: TeamAssignmentRequest = req.body;

  // Validate required fields
  if (!data.technicians || data.technicians.length === 0 || !data.projectName || !data.clientName || !data.scheduledDate || !data.timeSlot || !data.companyName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const results: { email: string; success: boolean; error?: string }[] = [];

  // Send email to each technician
  for (const tech of data.technicians) {
    if (!tech.email) {
      results.push({ email: tech.email, success: false, error: 'No email address' });
      continue;
    }

    try {
      const html = generateTeamAssignmentHtml(data, tech.name);

      await resend.emails.send({
        from: `${data.companyName} <noreply@omnialightscapepro.com>`,
        to: tech.email,
        subject: `🔧 New Job Assignment: ${data.projectName} - ${scheduledDateFormatted}`,
        html
      });

      results.push({ email: tech.email, success: true });
    } catch (error: any) {
      console.error(`Failed to send to ${tech.email}:`, error);
      results.push({ email: tech.email, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return res.status(200).json({
    success: failureCount === 0,
    message: `Sent ${successCount} of ${results.length} emails`,
    results
  });
}
