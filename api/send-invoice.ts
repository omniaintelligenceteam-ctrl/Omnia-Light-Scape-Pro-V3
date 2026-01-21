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
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="color: #111827;">${item.description}</div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">$${item.total.toFixed(2)}</td>
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: #fff; font-size: 24px; font-weight: 700;">${data.companyName}</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Invoice ${data.invoiceNumber}</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <!-- Invoice Details -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 20px;">
        <div>
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Bill To</p>
          <p style="margin: 8px 0 0; color: #111827; font-weight: 600;">${data.clientName}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">Invoice Date: <span style="color: #111827;">${data.invoiceDate}</span></p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px;">Due Date: <span style="color: #111827; font-weight: 600;">${data.dueDate}</span></p>
        </div>
      </div>

      <!-- Project Name -->
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">Project</p>
        <p style="margin: 4px 0 0; color: #111827; font-weight: 600;">${data.projectName}</p>
      </div>

      ${data.customMessage ? `
      <div style="background: #dbeafe; border-left: 4px solid #3B82F6; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6; white-space: pre-line;">${data.customMessage}</p>
      </div>
      ` : ''}

      ${data.projectImageUrl ? `
      <!-- Project Image -->
      <div style="margin: 24px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <img src="${data.projectImageUrl}" alt="Project Preview" style="width: 100%; display: block;">
      </div>
      ` : ''}

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Description</th>
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
          <span style="font-weight: 700; color: #111827; font-size: 18px;">Amount Due</span>
          <span style="font-weight: 700; color: #3B82F6; font-size: 18px;">$${data.total.toFixed(2)}</span>
        </div>
      </div>

      ${data.notes ? `
      <!-- Notes -->
      <div style="margin: 24px 0; padding: 16px; background: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>Notes:</strong> ${data.notes}</p>
      </div>
      ` : ''}

      <!-- Payment Info -->
      <div style="text-align: center; margin: 32px 0;">
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
          Please remit payment by <strong style="color: #111827;">${data.dueDate}</strong>
        </p>
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
        <strong>Please do not reply to this email.</strong> To respond, contact ${data.companyName} directly at <a href="mailto:${data.companyEmail}" style="color: #3B82F6;">${data.companyEmail}</a>
      </p>
      <p style="margin: 0;">Invoice generated with Omnia LightScape</p>
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

    // Use verified custom domain
    const fromAddress = 'Omnia LightScape <noreply@omnialightscapepro.com>';

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
