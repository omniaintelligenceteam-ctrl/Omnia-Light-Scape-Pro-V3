import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get project_id from metadata
        const projectId = session.metadata?.project_id;

        if (projectId) {
          // Mark invoice as paid
          await supabase
            .from('projects')
            .update({
              invoice_paid_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_payment_status: 'paid'
            })
            .eq('id', projectId);

          console.log(`Invoice paid for project ${projectId}`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const projectId = session.metadata?.project_id;

        if (projectId) {
          // Update payment status
          await supabase
            .from('projects')
            .update({
              stripe_payment_status: 'expired'
            })
            .eq('id', projectId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const projectId = paymentIntent.metadata?.project_id;

        if (projectId) {
          await supabase
            .from('projects')
            .update({
              stripe_payment_status: 'failed'
            })
            .eq('id', projectId);
        }
        break;
      }

      // Handle Connect account updates
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        // Update the user's Stripe account status
        if (account.charges_enabled && account.payouts_enabled) {
          await supabase
            .from('settings')
            .update({
              stripe_account_status: 'active'
            })
            .eq('stripe_account_id', account.id);
        } else if (account.requirements?.disabled_reason) {
          await supabase
            .from('settings')
            .update({
              stripe_account_status: 'restricted'
            })
            .eq('stripe_account_id', account.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Helper to get raw body for signature verification
async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}
