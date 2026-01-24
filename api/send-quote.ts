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
  // Compact item rows to reduce email size
  const itemRows = data.lineItems.map(item => `
    <tr>
      <td style="padding:20px;border-bottom:1px solid #eee;vertical-align:top">
        <b style="color:#1a1a1a;font-size:15px">${item.name}</b>
        <div style="font-size:12px;color:#888;margin-top:6px;line-height:1.5">${item.description.replace(/\n/g, ' · ')}</div>
      </td>
      <td style="padding:20px 12px;border-bottom:1px solid #eee;text-align:center;vertical-align:middle">
        <span style="background:#f3f4f6;padding:4px 12px;border-radius:12px;font-weight:700;font-size:14px">${item.quantity}</span>
      </td>
      <td style="padding:20px 12px;border-bottom:1px solid #eee;text-align:right;color:#666;font-size:14px;vertical-align:middle">$${item.unitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      <td style="padding:20px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#1a1a1a;font-size:15px;vertical-align:middle">$${(item.quantity * item.unitPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#111">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">

<!-- Header -->
<div style="background:#1a1a1a;border-radius:20px 20px 0 0;padding:40px 32px;text-align:center">
<div style="width:80px;height:3px;background:linear-gradient(90deg,#D4A04A,#F6B45A);margin:0 auto 24px;border-radius:2px"></div>
${data.companyLogo ? `<img src="${data.companyLogo}" alt="${data.companyName}" style="max-height:60px;max-width:180px;margin-bottom:16px">` : ''}
<h1 style="margin:0;color:#fff;font-size:28px;font-weight:700">${data.companyName}</h1>
<p style="margin:12px 0 0;color:#D4A04A;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase">Professional Lighting Quote</p>
</div>

<!-- Content -->
<div style="background:#fff;padding:32px;border-radius:0 0 20px 20px">

<!-- Greeting -->
<p style="margin:0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px">Prepared For</p>
<h2 style="margin:8px 0 20px;color:#1a1a1a;font-size:24px;font-weight:700">${data.clientName}</h2>
<p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.7">Thank you for your interest in our lighting services. Here is your detailed quote for <b>${data.projectName}</b>.</p>

${data.customMessage ? `<div style="background:#FEF9E7;border-left:3px solid #D4A04A;padding:16px 20px;margin:0 0 28px;border-radius:0 8px 8px 0"><p style="margin:0;color:#78350f;font-size:14px;line-height:1.6">${data.customMessage}</p></div>` : ''}

${data.projectImageUrl ? `
<p style="margin:0 0 12px;color:#1a1a1a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">◆ Your Lighting Design</p>
<img src="${data.projectImageUrl}" alt="Design" style="width:100%;border-radius:12px;margin-bottom:28px;border:1px solid #eee">
` : ''}

<!-- Items Table -->
<p style="margin:0 0 16px;color:#1a1a1a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">◆ Quote Details</p>
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
<thead><tr style="background:#1a1a1a">
<th style="padding:14px 20px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Item</th>
<th style="padding:14px 12px;text-align:center;font-size:11px;color:#888;text-transform:uppercase">Qty</th>
<th style="padding:14px 12px;text-align:right;font-size:11px;color:#888;text-transform:uppercase">Price</th>
<th style="padding:14px 20px;text-align:right;font-size:11px;color:#888;text-transform:uppercase">Total</th>
</tr></thead>
<tbody>${itemRows}</tbody>
</table>

<!-- Totals -->
<div style="background:#1a1a1a;border-radius:12px;padding:24px;margin:24px 0">
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:8px 0;color:#888;font-size:14px">Subtotal</td><td style="padding:8px 0;text-align:right;color:#fff;font-size:15px;font-weight:600">$${data.subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
${data.discount > 0 ? `<tr><td style="padding:8px 0;color:#888;font-size:14px">Discount</td><td style="padding:8px 0;text-align:right;color:#10b981;font-size:15px;font-weight:600">-$${data.discount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>` : ''}
<tr><td style="padding:8px 0;color:#888;font-size:14px">Tax (${(data.taxRate * 100).toFixed(1)}%)</td><td style="padding:8px 0;text-align:right;color:#fff;font-size:15px;font-weight:600">$${data.taxAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>
<tr><td colspan="2" style="padding:12px 0 0"><div style="border-top:1px solid #333"></div></td></tr>
<tr><td style="padding:16px 0 0;color:#fff;font-size:16px;font-weight:600">Total</td><td style="padding:16px 0 0;text-align:right"><span style="color:#D4A04A;font-size:32px;font-weight:800">$${data.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></td></tr>
</table>
</div>

<!-- CTA -->
<div style="text-align:center;padding:20px 0">
<p style="margin:0 0 20px;color:#1a1a1a;font-size:18px;font-weight:700">Ready to get started?</p>
<table style="margin:0 auto" cellpadding="0" cellspacing="8"><tr>
${data.approveLink ? `<td><a href="${data.approveLink}" style="display:inline-block;background:#10b981;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:14px">✓ Approve Quote</a></td>` : ''}
<td><a href="mailto:${data.companyEmail}?subject=Re: Quote for ${encodeURIComponent(data.projectName)}" style="display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:14px">Reply</a></td>
</tr></table>
${data.companyPhone ? `<p style="margin:20px 0 0;color:#666;font-size:14px">Or call <a href="tel:${data.companyPhone}" style="color:#D4A04A;text-decoration:none;font-weight:700">${data.companyPhone}</a></p>` : ''}
</div>

<!-- Footer -->
<div style="border-top:1px solid #eee;padding:24px 0 0;margin-top:16px;text-align:center">
<p style="margin:0 0 4px;font-weight:700;color:#1a1a1a;font-size:14px">${data.companyName}</p>
<p style="margin:0;color:#888;font-size:13px">${data.companyEmail}${data.companyPhone ? ` · ${data.companyPhone}` : ''}</p>
<p style="margin:8px 0 0;color:#aaa;font-size:12px">${data.companyAddress.replace(/\n/g, ' · ')}</p>
</div>

</div>

<p style="text-align:center;margin:24px 0 0;color:#666;font-size:11px">Powered by <span style="color:#D4A04A">Omnia LightScape</span></p>
</div>
</body></html>`;
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
      return res.status(500).json({
        error: 'Failed to send email',
        message: emailError.message,
        details: JSON.stringify(emailError)
      });
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
