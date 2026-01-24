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
  companyLogo?: string;
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
  approveLink?: string;
}

function generateQuoteHtml(data: QuoteEmailRequest): string {
  const itemRows = data.lineItems.map(item => `
    <tr>
      <td style="padding: 20px 24px; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
        <div style="font-weight: 600; color: #1a1a1a; font-size: 15px; margin-bottom: 6px;">${item.name}</div>
        <div style="font-size: 12px; color: #888; line-height: 1.5;">${item.description}</div>
      </td>
      <td style="padding: 20px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #1a1a1a; font-weight: 600; font-size: 15px; vertical-align: top;">${item.quantity}</td>
      <td style="padding: 20px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; color: #666; font-size: 14px; vertical-align: top;">$${item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td style="padding: 20px 24px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 700; color: #1a1a1a; font-size: 15px; vertical-align: top;">$${(item.quantity * item.unitPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header Card -->
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center; position: relative;">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #D4A04A, transparent);"></div>

      ${data.companyLogo ? `
      <img src="${data.companyLogo}" alt="${data.companyName}" style="max-height: 60px; max-width: 180px; margin-bottom: 16px; display: inline-block;" />
      ` : ''}

      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${data.companyName}</h1>
      <p style="margin: 10px 0 0; color: #D4A04A; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Professional Lighting Quote</p>
    </div>

    <!-- Main Content Card -->
    <div style="background: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">

      <!-- Greeting -->
      <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 17px; font-weight: 600;">
        Hi ${data.clientName},
      </p>
      <p style="margin: 0 0 28px; color: #555; font-size: 15px; line-height: 1.7;">
        Thank you for considering us for your lighting project. Below is your detailed quote for <strong style="color: #1a1a1a;">${data.projectName}</strong>.
      </p>

      ${data.customMessage ? `
      <div style="background: #FFF9E6; border-left: 3px solid #F6B45A; padding: 20px; margin: 0 0 28px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #8B6914; font-size: 14px; line-height: 1.6; white-space: pre-line;">${data.customMessage}</p>
      </div>
      ` : ''}

      ${data.projectImageUrl ? `
      <!-- Project Image -->
      <div style="margin: 0 0 32px;">
        <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Lighting Design</p>
        <a href="${data.projectImageUrl}" target="_blank" rel="noopener noreferrer" style="display: block; border-radius: 12px; overflow: hidden; border: 1px solid #e8e8e8;">
          <img src="${data.projectImageUrl}" alt="Lighting Design Preview" style="width: 100%; display: block;">
        </a>
      </div>
      ` : ''}

      <!-- Line Items -->
      <div style="margin: 0 0 24px;">
        <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Quote Details</p>
        <div style="border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #fafafa;">
                <th style="padding: 14px 24px; text-align: left; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e8e8e8;">Item</th>
                <th style="padding: 14px 16px; text-align: center; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e8e8e8;">Qty</th>
                <th style="padding: 14px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e8e8e8;">Price</th>
                <th style="padding: 14px 24px; text-align: right; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e8e8e8;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Totals Card -->
      <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border-radius: 12px; padding: 24px; margin: 0 0 32px; border: 1px solid #e8e8e8;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Subtotal</td>
            <td style="padding: 8px 0; text-align: right; color: #1a1a1a; font-size: 15px; font-weight: 600;">$${data.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          ${data.discount > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Discount</td>
            <td style="padding: 8px 0; text-align: right; color: #059669; font-size: 15px; font-weight: 600;">-$${data.discount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Tax (${(data.taxRate * 100).toFixed(1)}%)</td>
            <td style="padding: 8px 0; text-align: right; color: #1a1a1a; font-size: 15px; font-weight: 600;">$${data.taxAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 16px 0 0;"><div style="border-top: 2px solid #e0e0e0;"></div></td>
          </tr>
          <tr>
            <td style="padding: 16px 0 0; color: #1a1a1a; font-size: 18px; font-weight: 700;">Total</td>
            <td style="padding: 16px 0 0; text-align: right; color: #1a1a1a; font-size: 26px; font-weight: 700;">$${data.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <p style="margin: 0 0 20px; color: #555; font-size: 15px;">
          Ready to move forward with your project?
        </p>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          ${data.approveLink ? `
          <a href="${data.approveLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 600; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            ✓ Approve Quote
          </a>
          ` : ''}
          <a href="mailto:${data.companyEmail}?subject=Re: Quote for ${encodeURIComponent(data.projectName)}" style="display: inline-block; background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: #ffffff; font-weight: 600; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Reply to This Quote
          </a>
        </div>
        ${data.companyPhone ? `<p style="margin: 16px 0 0; color: #888; font-size: 14px;">Or call us at <a href="tel:${data.companyPhone}" style="color: #1a1a1a; text-decoration: none; font-weight: 600;">${data.companyPhone}</a></p>` : ''}
      </div>

      <!-- Divider -->
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

      <!-- Company Info -->
      <div style="text-align: center;">
        <p style="margin: 0 0 4px; font-weight: 600; color: #1a1a1a; font-size: 14px;">${data.companyName}</p>
        <p style="margin: 0; color: #888; font-size: 13px; line-height: 1.6;">
          <a href="mailto:${data.companyEmail}" style="color: #888; text-decoration: none;">${data.companyEmail}</a>
          ${data.companyPhone ? ` · <a href="tel:${data.companyPhone}" style="color: #888; text-decoration: none;">${data.companyPhone}</a>` : ''}
        </p>
        <p style="margin: 8px 0 0; color: #aaa; font-size: 12px; white-space: pre-line;">${data.companyAddress}</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; padding: 0 20px;">
      <p style="margin: 0; color: #999; font-size: 11px; line-height: 1.6;">
        This quote was sent by ${data.companyName}. Please contact them directly with any questions.
      </p>
      <p style="margin: 8px 0 0; color: #bbb; font-size: 10px;">
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

    // Validate and sanitize line items to prevent toLocaleString errors
    if (data.lineItems && Array.isArray(data.lineItems)) {
      data.lineItems = data.lineItems.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        name: item.name || 'Item',
        description: item.description || ''
      }));
    }

    // Sanitize numeric fields
    data.subtotal = typeof data.subtotal === 'number' ? data.subtotal : 0;
    data.taxRate = typeof data.taxRate === 'number' ? data.taxRate : 0;
    data.taxAmount = typeof data.taxAmount === 'number' ? data.taxAmount : 0;
    data.discount = typeof data.discount === 'number' ? data.discount : 0;
    data.total = typeof data.total === 'number' ? data.total : 0;

    const html = generateQuoteHtml(data);

    // Use verified custom domain with company name
    const fromAddress = `${data.companyName} <noreply@omnialightscapepro.com>`;

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
    console.error('Error stack:', error.stack);

    // Return more specific error for debugging
    const errorMessage = error.message || 'Unknown error';
    const errorName = error.name || 'Error';

    return res.status(500).json({
      error: 'Failed to send quote',
      message: errorMessage,
      type: errorName
    });
  }
}
