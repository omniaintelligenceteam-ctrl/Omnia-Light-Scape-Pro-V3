import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getSupabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion
});

const resend = new Resend(process.env.RESEND_API_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

// Generate contractor payment notification email HTML
function generatePaymentNotificationHtml(data: {
  clientName: string;
  projectName: string;
  amount: number;
  paidAt: string;
}): string {
  const formattedDate = new Date(data.paidAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">💰</div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Payment Received!</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Great news - your invoice has been paid</p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <div style="background: #f5f3ff; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; color: #5b21b6; font-size: 14px; font-weight: 600;">Project</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700;">${data.projectName}</p>

        <p style="margin: 0 0 8px; color: #5b21b6; font-size: 14px; font-weight: 600;">Client</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">${data.clientName}</p>

        <p style="margin: 0 0 8px; color: #5b21b6; font-size: 14px; font-weight: 600;">Amount Paid</p>
        <p style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700;">$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6; text-align: center;">
        <strong>${data.clientName}</strong> completed payment on<br>
        <span style="color: #6b7280;">${formattedDate}</span>
      </p>

      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">Payment Complete</p>
        <p style="margin: 8px 0 0; color: #065f46; font-size: 14px; line-height: 1.6;">
          This project is now fully paid. The funds will be transferred to your connected Stripe account.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
          View Project →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0;">Notification from Omnia LightScape</p>
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
        const paidAt = new Date().toISOString();

        if (projectId) {
          // Mark invoice as paid
          await supabase
            .from('projects')
            .update({
              invoice_paid_at: paidAt,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_payment_status: 'paid'
            })
            .eq('id', projectId);

          console.log(`Invoice paid for project ${projectId}`);

          // Send payment notification to contractor
          const { data: project } = await supabase
            .from('projects')
            .select('name, prompt_config, user_id')
            .eq('id', projectId)
            .single();

          if (project?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', project.user_id)
              .single();

            if (userData?.email && process.env.RESEND_API_KEY) {
              const clientName = project.prompt_config?.quote?.clientDetails?.name || 'Client';
              const amount = session.amount_total ? session.amount_total / 100 : 0;

              const html = generatePaymentNotificationHtml({
                clientName,
                projectName: project.name,
                amount,
                paidAt
              });

              try {
                await resend.emails.send({
                  from: 'Omnia LightScape <noreply@omnialightscapepro.com>',
                  to: userData.email,
                  subject: `💰 Payment Received! ${clientName} paid for "${project.name}"`,
                  html
                });
                console.log(`Payment notification sent to ${userData.email}`);
              } catch (emailError) {
                // Don't fail the webhook if email fails
                console.error('Failed to send payment notification:', emailError);
              }
            }
          }
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
