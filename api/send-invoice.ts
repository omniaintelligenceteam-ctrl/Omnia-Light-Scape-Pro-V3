import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvoiceEmailRequest {
  clientEmail: string;
  clientName: string;
  projectName: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  notes?: string;
  projectImageUrl?: string;
  customMessage?: string;
}

function generateInvoiceHtml(data: InvoiceEmailRequest): string {
  const itemRows = data.lineItems.map(item => `
    <tr>
      <td style="padding: 18px 24px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #1a1a1a; font-size: 15px; letter-spacing: -0.01em;">${item.description}</div>
      </td>
      <td style="padding: 18px 24px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-weight: 500;">${item.quantity}</td>
      <td style="padding: 18px 24px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-weight: 500;">$${item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td style="padding: 18px 24px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1a1a1a; font-size: 15px;">$${item.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber} from ${data.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <div style="max-width: 680px; margin: 0 auto; padding: 48px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 20px 20px 0 0; padding: 48px 40px; text-align: center; position: relative; overflow: hidden;">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #3B82F6 0%, #2563EB 50%, #3B82F6 100%);"></div>
      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.02em; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${data.companyName}</h1>
      <p style="margin: 12px 0 0; color: rgba(255,255,255,0.8); font-size: 15px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Invoice ${data.invoiceNumber}</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 48px 40px; border-radius: 0 0 20px 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);">

      <!-- Invoice Details -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 24px;">
        <div>
          <p style="margin: 0; color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Bill To</p>
          <p style="margin: 12px 0 0; color: #1a1a1a; font-weight: 600; font-size: 16px;">${data.clientName}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #737373; font-size: 13px; line-height: 1.8;">Invoice Date: <span style="color: #1a1a1a; font-weight: 600;">${data.invoiceDate}</span></p>
          <p style="margin: 8px 0 0; color: #737373; font-size: 13px; line-height: 1.8;">Due Date: <span style="color: #3B82F6; font-weight: 700;">${data.dueDate}</span></p>
        </div>
      </div>

      <!-- Project Name -->
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f2 100%); padding: 20px; border-radius: 12px; margin-bottom: 32px; border: 1px solid #e5e5e5;">
        <p style="margin: 0; color: #737373; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Project</p>
        <p style="margin: 8px 0 0; color: #1a1a1a; font-weight: 700; font-size: 16px; letter-spacing: -0.01em;">${data.projectName}</p>
      </div>

      ${data.customMessage ? `
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); border-left: 4px solid #3B82F6; padding: 24px; margin: 0 0 32px; border-radius: 0 12px 12px 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);">
        <p style="margin: 0; color: #1e3a8a; font-size: 15px; line-height: 1.7; white-space: pre-line;">${data.customMessage}</p>
      </div>
      ` : ''}

      ${data.projectImageUrl ? `
      <!-- Project Image -->
      <div style="margin: 32px 0 40px;">
        <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">Project Completed</p>
        <div style="border-radius: 16px; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);">
          <img src="${data.projectImageUrl}" alt="Project Preview" style="width: 100%; display: block; object-fit: cover;">
        </div>
      </div>
      ` : ''}

      <!-- Line Items Table -->
      <div style="border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; margin: 32px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);">
              <th style="padding: 16px 24px; text-align: left; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #e5e5e5;">Description</th>
              <th style="padding: 16px 24px; text-align: center; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #e5e5e5;">Qty</th>
              <th style="padding: 16px 24px; text-align: right; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #e5e5e5;">Price</th>
              <th style="padding: 16px 24px; text-align: right; font-size: 11px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #e5e5e5;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid #e5e5e5;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 14px; align-items: center;">
          <span style="color: #737373; font-size: 15px; font-weight: 500;">Subtotal</span>
          <span style="color: #1a1a1a; font-size: 16px; font-weight: 600;">$${data.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        ${data.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 14px; align-items: center;">
          <span style="color: #737373; font-size: 15px; font-weight: 500;">Discount</span>
          <span style="color: #059669; font-size: 16px; font-weight: 600;">-$${data.discount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center;">
          <span style="color: #737373; font-size: 15px; font-weight: 500;">Tax (${(data.taxRate * 100).toFixed(1)}%)</span>
          <span style="color: #1a1a1a; font-size: 16px; font-weight: 600;">$${data.taxAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div style="border-top: 2px solid #d4d4d4; margin-top: 20px; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: #1a1a1a; font-size: 20px; letter-spacing: -0.01em;">Amount Due</span>
          <span style="font-weight: 700; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 28px; letter-spacing: -0.02em;">$${data.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
      </div>

      ${data.notes ? `
      <!-- Notes -->
      <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fef3e0 100%); border-radius: 12px; border: 1px solid #f59e0b;">
        <p style="margin: 0; color: #8b5a00; font-size: 15px; line-height: 1.7;"><strong style="color: #78350f;">Notes:</strong> ${data.notes}</p>
      </div>
      ` : ''}

      <!-- Payment Info -->
      <div style="text-align: center; margin: 48px 0 40px;">
        <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Payment is due by <strong style="color: #3B82F6; font-size: 17px;">${data.dueDate}</strong>
        </p>
        <p style="margin: 0; color: #737373; font-size: 14px;">
          Questions? Contact us at <a href="mailto:${data.companyEmail}" style="color: #3B82F6; text-decoration: none; font-weight: 600;">${data.companyEmail}</a>
        </p>
      </div>

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;">

      <!-- Company Contact Info -->
      <div style="text-align: center; color: #737373; font-size: 14px; line-height: 1.8;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #1a1a1a; font-size: 16px; letter-spacing: -0.01em;">${data.companyName}</p>
        <p style="margin: 0 0 4px;"><a href="mailto:${data.companyEmail}" style="color: #737373; text-decoration: none;">${data.companyEmail}</a></p>
        ${data.companyPhone ? `<p style="margin: 0 0 4px;"><a href="tel:${data.companyPhone}" style="color: #737373; text-decoration: none;">${data.companyPhone}</a></p>` : ''}
        <p style="margin: 8px 0 0; white-space: pre-line; color: #8a8a8a;">${data.companyAddress}</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 16px; padding: 20px; background: linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%); border-radius: 12px; color: #737373; line-height: 1.6; border: 1px solid #e5e5e5;">
        <strong style="color: #1a1a1a;">Please do not reply to this email.</strong><br>
        To respond, contact ${data.companyName} directly at <a href="mailto:${data.companyEmail}" style="color: #3B82F6; text-decoration: none; font-weight: 600;">${data.companyEmail}</a>
      </p>
      <p style="margin: 0; color: #a3a3a3; font-size: 11px; letter-spacing: 0.02em;">Invoice generated with Omnia LightScape</p>
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
    const data: InvoiceEmailRequest = req.body;

    // Validate required fields
    if (!data.clientEmail || !data.clientName || !data.companyName || !data.invoiceNumber) {
      return res.status(400).json({ error: 'Missing required fields: clientEmail, clientName, companyName, invoiceNumber' });
    }

    const html = generateInvoiceHtml(data);

    // Use verified custom domain with company name
    const fromAddress = `${data.companyName} <noreply@omnialightscapepro.com>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      replyTo: data.companyEmail,
      subject: `${data.companyName} - Invoice ${data.invoiceNumber} for ${data.projectName}`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return res.status(500).json({ error: 'Failed to send email', details: emailError.message });
    }

    console.log('Invoice email sent successfully:', emailData);
    return res.status(200).json({ success: true, messageId: emailData?.id });

  } catch (error: any) {
    console.error('Send invoice error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
