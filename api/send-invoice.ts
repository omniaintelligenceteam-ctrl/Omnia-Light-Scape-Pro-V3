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
  companyLogo?: string;
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
  originalImageUrl?: string;
  customMessage?: string;
  paymentUrl?: string;
}

function generateInvoiceHtml(data: InvoiceEmailRequest): string {
  const fmt = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const rows = data.lineItems.map(item => `<tr><td style="padding:14px;border-bottom:1px solid #eee">${item.description}</td><td style="padding:14px;text-align:center">${item.quantity}</td><td style="padding:14px;text-align:right;color:#666">$${fmt(item.unitPrice)}</td><td style="padding:14px;text-align:right;font-weight:600">$${fmt(item.total)}</td></tr>`).join('');

  // Generate image section - show both before/after if available, otherwise just the design
  let imageSection = '';
  if (data.projectImageUrl && data.originalImageUrl) {
    // Show before/after comparison
    imageSection = `
      <div style="margin-bottom:24px">
        <p style="margin:0 0 12px;color:#3B82F6;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:600">Completed Project</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="width:49%;vertical-align:top;padding-right:4px">
              <div style="position:relative">
                <img src="${data.originalImageUrl}" style="width:100%;border-radius:8px;display:block">
                <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;padding:4px 8px;border-radius:4px;font-weight:600">BEFORE</div>
              </div>
            </td>
            <td style="width:49%;vertical-align:top;padding-left:4px">
              <div style="position:relative">
                <img src="${data.projectImageUrl}" style="width:100%;border-radius:8px;display:block;box-shadow:0 4px 12px rgba(59,130,246,0.3)">
                <div style="position:absolute;bottom:8px;left:8px;background:linear-gradient(135deg,#3B82F6,#1d4ed8);color:#fff;font-size:10px;padding:4px 8px;border-radius:4px;font-weight:600">AFTER</div>
              </div>
            </td>
          </tr>
        </table>
      </div>`;
  } else if (data.projectImageUrl) {
    // Show just the design image prominently
    imageSection = `
      <div style="margin-bottom:24px">
        <p style="margin:0 0 12px;color:#3B82F6;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:600">Completed Project</p>
        <div style="position:relative;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(59,130,246,0.15)">
          <img src="${data.projectImageUrl}" style="width:100%;display:block">
        </div>
      </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5"><div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:#1a1a1a;border-radius:16px 16px 0 0;padding:32px;text-align:center"><div style="width:60px;height:2px;background:#3B82F6;margin:0 auto 16px"></div><h1 style="margin:0;color:#fff;font-size:24px">${data.companyName}</h1><p style="margin:8px 0 0;color:#3B82F6;font-size:11px;letter-spacing:1.5px">INVOICE ${data.invoiceNumber}</p></div><div style="background:#fff;padding:24px;border-radius:0 0 16px 16px"><table style="width:100%;margin-bottom:20px"><tr><td style="vertical-align:top"><p style="margin:0;color:#999;font-size:10px">BILL TO</p><p style="margin:4px 0 0;font-weight:600">${data.clientName}</p></td><td style="text-align:right"><p style="margin:0;color:#666;font-size:12px">Date: <b>${data.invoiceDate}</b></p><p style="margin:4px 0 0;color:#666;font-size:12px">Due: <b style="color:#3B82F6">${data.dueDate}</b></p></td></tr></table><div style="background:#f8f8f8;padding:12px;border-radius:8px;margin-bottom:20px"><p style="margin:0;color:#999;font-size:10px">PROJECT</p><p style="margin:4px 0 0;font-weight:600">${data.projectName}</p></div>${imageSection}<table style="width:100%;border-collapse:collapse;border:1px solid #eee;margin-bottom:20px"><tr style="background:#f8f8f8"><th style="padding:12px;text-align:left;color:#888;font-size:10px">DESCRIPTION</th><th style="padding:12px;text-align:center;color:#888;font-size:10px">QTY</th><th style="padding:12px;text-align:right;color:#888;font-size:10px">PRICE</th><th style="padding:12px;text-align:right;color:#888;font-size:10px">TOTAL</th></tr>${rows}</table><div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:20px"><table style="width:100%"><tr><td style="color:#666;font-size:13px">Subtotal</td><td style="text-align:right">$${fmt(data.subtotal)}</td></tr>${data.discount > 0 ? `<tr><td style="color:#666;font-size:13px">Discount</td><td style="text-align:right;color:#059669">-$${fmt(data.discount)}</td></tr>` : ''}<tr><td style="color:#666;font-size:13px">Tax (${(data.taxRate * 100).toFixed(1)}%)</td><td style="text-align:right">$${fmt(data.taxAmount)}</td></tr><tr><td colspan="2" style="padding:8px 0"><div style="border-top:1px solid #ddd"></div></td></tr><tr><td style="font-weight:700;font-size:16px">Amount Due</td><td style="text-align:right;color:#3B82F6;font-size:22px;font-weight:700">$${fmt(data.total)}</td></tr></table></div>${data.paymentUrl ? `<div style="text-align:center;margin:24px 0"><a href="${data.paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#3B82F6 0%,#1d4ed8 100%);color:#fff;text-decoration:none;padding:16px 48px;border-radius:12px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(59,130,246,0.4)">Pay Now - $${fmt(data.total)}</a><p style="margin:12px 0 0;color:#888;font-size:12px">Secure payment powered by Stripe</p></div>` : ''}<div style="text-align:center;padding:16px 0"><p style="margin:0 0 8px;color:#666;font-size:13px">Payment due by <b style="color:#3B82F6">${data.dueDate}</b></p><p style="margin:0;color:#888;font-size:12px">Questions? <a href="mailto:${data.companyEmail}" style="color:#3B82F6">${data.companyEmail}</a></p></div><div style="border-top:1px solid #eee;padding-top:16px;text-align:center"><p style="margin:0;font-weight:600;font-size:13px">${data.companyName}</p><p style="margin:4px 0 0;color:#888;font-size:12px">${data.companyEmail}${data.companyPhone ? ` · ${data.companyPhone}` : ''}</p></div></div><p style="text-align:center;margin:16px 0 0;color:#999;font-size:10px">Invoice by Omnia LightScape</p></div></body></html>`;
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
