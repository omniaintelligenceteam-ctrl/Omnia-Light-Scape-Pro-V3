import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface QuoteEmailRequest {
  clientEmail: string;
  clientName: string;
  projectName: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyAddress: string;
  lineItems: Array<{
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  projectImageUrl?: string;
  customMessage?: string;
}

function generateQuoteHtml(data: QuoteEmailRequest): string {
  const itemRows = data.lineItems.map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #111827;">${item.name}</div>
        <div style="font-size: 13px; color: #6b7280;">${item.description}</div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote from ${data.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #F6B45A 0%, #E09F45 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: 700;">${data.companyName}</h1>
      <p style="margin: 8px 0 0; color: rgba(0,0,0,0.7); font-size: 14px;">Landscape Lighting Quote</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <!-- Greeting -->
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        Hi ${data.clientName},
      </p>
      <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
        Thank you for your interest in our landscape lighting services. Please find your quote for <strong>${data.projectName}</strong> below.
      </p>

      ${data.customMessage ? `
      <div style="background: #fef3c7; border-left: 4px solid #F6B45A; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; white-space: pre-line;">${data.customMessage}</p>
      </div>
      ` : ''}

      ${data.projectImageUrl ? `
      <!-- Project Image - Clickable to expand -->
      <div style="margin: 24px 0;">
        <p style="margin: 0 0 12px; color: #374151; font-size: 14px; font-weight: 600;">Your Lighting Design Preview:</p>
        <a href="${data.projectImageUrl}" target="_blank" rel="noopener noreferrer" style="display: block; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: transform 0.2s;">
          <img src="${data.projectImageUrl}" alt="Lighting Design Preview" style="width: 100%; display: block;">
        </a>
        <p style="margin: 8px 0 0; text-align: center;">
          <a href="${data.projectImageUrl}" target="_blank" rel="noopener noreferrer" style="color: #F6B45A; font-size: 13px; text-decoration: none; font-weight: 500;">
            🔍 Click image or here to view full size
          </a>
        </p>
      </div>
      ` : ''}

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Item</th>
            <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
            <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Price</th>
            <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Subtotal</span>
          <span style="color: #374151;">$${data.subtotal.toFixed(2)}</span>
        </div>
        ${data.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Discount</span>
          <span style="color: #059669;">-$${data.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280;">Tax (${(data.taxRate * 100).toFixed(1)}%)</span>
          <span style="color: #374151;">$${data.taxAmount.toFixed(2)}</span>
        </div>
        <div style="border-top: 2px solid #e5e7eb; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between;">
          <span style="font-weight: 700; color: #111827; font-size: 18px;">Total</span>
          <span style="font-weight: 700; color: #F6B45A; font-size: 18px;">$${data.total.toFixed(2)}</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">
          Ready to move forward? Contact us to schedule your installation:
        </p>
        <a href="mailto:${data.companyEmail}" style="display: inline-block; background: linear-gradient(135deg, #F6B45A 0%, #E09F45 100%); color: #000; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
          Email ${data.companyName}
        </a>
        ${data.companyPhone ? `<p style="margin: 16px 0 0; color: #6b7280; font-size: 14px;">Or call: <a href="tel:${data.companyPhone}" style="color: #F6B45A; text-decoration: none;">${data.companyPhone}</a></p>` : ''}
      </div>

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <!-- Company Contact Info -->
      <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0 0 4px; font-weight: 600; color: #374151;">${data.companyName}</p>
        <p style="margin: 0 0 4px;">${data.companyEmail}</p>
        ${data.companyPhone ? `<p style="margin: 0 0 4px;">${data.companyPhone}</p>` : ''}
        <p style="margin: 0; white-space: pre-line;">${data.companyAddress}</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0 0 8px; padding: 12px; background: #f3f4f6; border-radius: 8px; color: #6b7280;">
        <strong>Please do not reply to this email.</strong> To respond, contact ${data.companyName} directly at <a href="mailto:${data.companyEmail}" style="color: #F6B45A;">${data.companyEmail}</a>
      </p>
      <p style="margin: 0;">Quote generated with Omnia LightScape</p>
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
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const data: QuoteEmailRequest = req.body;

    // Validate required fields
    if (!data.clientEmail || !data.clientName || !data.companyName) {
      return res.status(400).json({ error: 'Missing required fields: clientEmail, clientName, companyName' });
    }

    const html = generateQuoteHtml(data);

    // Use verified custom domain
    const fromAddress = 'Omnia LightScape <noreply@omnialightscapepro.com>';

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      replyTo: data.companyEmail,
      subject: `${data.companyName} - Quote for ${data.projectName}`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return res.status(500).json({ error: 'Failed to send email', details: emailError.message });
    }

    console.log('Email sent successfully:', emailData);
    return res.status(200).json({ success: true, messageId: emailData?.id });

  } catch (error: any) {
    console.error('Send quote error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
