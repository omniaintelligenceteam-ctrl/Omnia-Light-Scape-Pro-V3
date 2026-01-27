import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../../../lib/supabase.js';

// Use Connect account key for invoice payments (routes to connected accounts)
const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover'
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up share token
    const { data: shareToken, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', 'invoice')
      .single();

    if (tokenError || !shareToken) {
      return res.status(404).json({ error: 'Invoice not found or link has expired' });
    }

    // Check expiration
    if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invoice link has expired' });
    }

    // Get project details (contains invoice info)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', shareToken.project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if already paid
    if (project.invoice_paid_at) {
      return res.status(400).json({ error: 'This invoice has already been paid' });
    }

    // Get client details if available
    let clientEmail = null;
    let clientName = 'Customer';
    if (shareToken.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', shareToken.client_id)
        .single();
      if (clientData) {
        clientEmail = clientData.email;
        clientName = clientData.name;
      }
    }

    // Get company settings and Stripe connected account
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', shareToken.user_id)
      .single();

    let companyName = 'Lighting Company';
    let stripeAccountId = null;

    if (userData) {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('company_name, stripe_account_id')
        .eq('user_id', userData.id)
        .single();
      if (settingsData?.company_name) {
        companyName = settingsData.company_name;
      }
      if (settingsData?.stripe_account_id) {
        stripeAccountId = settingsData.stripe_account_id;
      }
    }

    // Get invoice data (line items, totals)
    const invoiceData = project.invoice_data;
    let invoiceAmount = 0;
    let invoiceDescription = `Invoice for ${project.name}`;
    let invoiceNumber = '';

    if (invoiceData?.total) {
      invoiceAmount = Math.round(invoiceData.total * 100); // Convert to cents
      invoiceNumber = invoiceData.invoiceNumber || '';
      invoiceDescription = invoiceNumber
        ? `${companyName} - ${invoiceNumber}`
        : `${companyName} - Invoice for ${project.name}`;
    } else {
      // Fallback to quote data only - NEVER accept amount from client
      const quoteData = project.prompt_config?.quote || project.quote_data;
      if (quoteData?.total) {
        invoiceAmount = Math.round(quoteData.total * 100);
        invoiceDescription = `${companyName} - Invoice for ${project.name}`;
      }
      // If no invoice or quote data, invoiceAmount stays 0 and will fail validation below
    }

    if (invoiceAmount <= 0) {
      return res.status(400).json({ error: 'Invoice amount not found or invalid' });
    }

    // Build Stripe checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer_email: clientEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: invoiceDescription,
              description: `Payment for ${project.name}`,
            },
            unit_amount: invoiceAmount,
          },
          quantity: 1,
        }
      ],
      success_url: `${FRONTEND_URL}/p/invoice/${token}?paid=true`,
      cancel_url: `${FRONTEND_URL}/p/invoice/${token}?canceled=true`,
      metadata: {
        project_id: project.id,
        share_token: token,
        client_name: clientName,
        invoice_number: invoiceNumber,
      }
    };

    // If user has a connected Stripe account, route payment to them
    if (stripeAccountId) {
      // Calculate platform fee (e.g., 2.5%)
      const applicationFeeAmount = Math.round(invoiceAmount * 0.025);

      sessionOptions.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
      };
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url
    });

  } catch (error: any) {
    console.error('Invoice payment API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
