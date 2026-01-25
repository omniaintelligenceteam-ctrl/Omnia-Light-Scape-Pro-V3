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
  const fmt = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const rows = data.lineItems.map(item => `<tr><td style="padding:14px;border-bottom:1px solid #eee"><b>${item.name}</b><br><span style="color:#888;font-size:12px">${item.description.replace(/\n/g, ' · ')}</span></td><td style="padding:14px;text-align:center">${item.quantity}</td><td style="padding:14px;text-align:right;color:#666">$${fmt(item.unitPrice)}</td><td style="padding:14px;text-align:right;font-weight:700">$${fmt(item.quantity * item.unitPrice)}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#111"><div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:#1a1a1a;border-radius:16px 16px 0 0;padding:32px;text-align:center"><div style="width:60px;height:2px;background:#D4A04A;margin:0 auto 16px"></div><h1 style="margin:0;color:#fff;font-size:24px">${data.companyName}</h1><p style="margin:8px 0 0;color:#D4A04A;font-size:10px;letter-spacing:2px">PROFESSIONAL LIGHTING QUOTE</p></div><div style="background:#fff;padding:24px;border-radius:0 0 16px 16px"><p style="margin:0;color:#999;font-size:11px">PREPARED FOR</p><h2 style="margin:4px 0 16px;color:#1a1a1a;font-size:20px">${data.clientName}</h2><p style="margin:0 0 20px;color:#555;font-size:14px">Thank you for your interest. Here is your quote for <b>${data.projectName}</b>.</p>${data.projectImageUrl ? `<img src="${data.projectImageUrl}" style="width:100%;border-radius:8px;margin-bottom:20px">` : ''}<table style="width:100%;border-collapse:collapse;border:1px solid #eee;margin-bottom:20px"><tr style="background:#1a1a1a"><th style="padding:12px;text-align:left;color:#888;font-size:11px">ITEM</th><th style="padding:12px;text-align:center;color:#888;font-size:11px">QTY</th><th style="padding:12px;text-align:right;color:#888;font-size:11px">PRICE</th><th style="padding:12px;text-align:right;color:#888;font-size:11px">TOTAL</th></tr>${rows}</table><div style="background:#1a1a1a;border-radius:8px;padding:16px;margin-bottom:20px"><table style="width:100%"><tr><td style="color:#888;font-size:13px">Subtotal</td><td style="text-align:right;color:#fff">$${fmt(data.subtotal)}</td></tr>${data.discount > 0 ? `<tr><td style="color:#888;font-size:13px">Discount</td><td style="text-align:right;color:#10b981">-$${fmt(data.discount)}</td></tr>` : ''}<tr><td style="color:#888;font-size:13px">Tax (${(data.taxRate * 100).toFixed(1)}%)</td><td style="text-align:right;color:#fff">$${fmt(data.taxAmount)}</td></tr><tr><td colspan="2" style="padding:8px 0"><div style="border-top:1px solid #333"></div></td></tr><tr><td style="color:#fff;font-size:14px;font-weight:600">Total</td><td style="text-align:right;color:#D4A04A;font-size:24px;font-weight:700">$${fmt(data.total)}</td></tr></table></div><div style="text-align:center"><p style="margin:0 0 16px;font-size:16px;font-weight:600">Ready to get started?</p><a href="mailto:${data.companyEmail}?subject=Re: Quote for ${encodeURIComponent(data.projectName)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Reply to Quote</a>${data.companyPhone ? `<p style="margin:16px 0 0;color:#666;font-size:13px">Or call <a href="tel:${data.companyPhone}" style="color:#D4A04A">${data.companyPhone}</a></p>` : ''}</div><div style="border-top:1px solid #eee;margin-top:20px;padding-top:16px;text-align:center"><p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${data.companyName}</p><p style="margin:4px 0 0;color:#888;font-size:12px">${data.companyEmail}${data.companyPhone ? ` · ${data.companyPhone}` : ''}</p></div></div><p style="text-align:center;margin:16px 0 0;color:#666;font-size:10px">Powered by <span style="color:#D4A04A">Omnia LightScape</span></p></div></body></html>`;
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
