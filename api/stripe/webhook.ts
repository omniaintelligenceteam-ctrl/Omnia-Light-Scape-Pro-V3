import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover'
});

// Price ID to monthly limit mapping
const PRICE_TO_LIMIT_MAP: Record<string, number> = {
    'price_1SrNHIQ1tit8mwraqKGAf2GL': 10,    // STARTER_MONTHLY
    'price_1SrNJdQ1tit8mwraqbC4ihcM': 10,    // STARTER_YEARLY (10/month)
    'price_1SrNK5Q1tit8mwraTa5UHFWD': 125,   // PRO_MONTHLY
    'price_1SrNKfQ1tit8mwrajmlqx1ak': 125,   // PRO_YEARLY (125/month)
    'price_1SrNLUQ1tit8mwraV4J0nB6T': -1,    // BUSINESS_MONTHLY (unlimited)
    'price_1SrNM8Q1tit8mwraPzrGelaH': -1,    // BUSINESS_YEARLY (unlimited)
};

// Disable body parsing - we need the raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to get raw body
async function getRawBody(req: VercelRequest): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;

    try {
        const rawBody = await getRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
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
                const clerkUserId = session.metadata?.clerk_user_id;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (!clerkUserId) {
                    console.error('No clerk_user_id in session metadata');
                    break;
                }

                // Get user_id from users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('clerk_user_id', clerkUserId)
                    .single();

                if (userError || !userData) {
                    console.error('User not found for clerk_user_id:', clerkUserId);
                    break;
                }

                // Get subscription details to determine plan_id
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = subscription.items.data[0]?.price.id;
                const monthlyLimit = PRICE_TO_LIMIT_MAP[priceId] || 0;

                // Insert into subscriptions table
                const { error: insertError } = await supabase
                    .from('subscriptions')
                    .insert({
                        user_id: userData.id,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        status: 'active',
                        plan_id: priceId,
                        monthly_limit: monthlyLimit
                    });

                if (insertError) {
                    console.error('Failed to insert subscription:', insertError);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const subscriptionId = subscription.id;
                const status = subscription.status;

                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({ status })
                    .eq('stripe_subscription_id', subscriptionId);

                if (updateError) {
                    console.error('Failed to update subscription status:', updateError);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const subscriptionId = subscription.id;

                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({ status: 'canceled' })
                    .eq('stripe_subscription_id', subscriptionId);

                if (updateError) {
                    console.error('Failed to cancel subscription:', updateError);
                }
                break;
            }

            case 'invoice.paid': {
                // Reset monthly generation count when subscription renews
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = (invoice as { subscription?: string | null }).subscription as string;

                // Only reset for subscription invoices (not first payment)
                if (invoice.billing_reason === 'subscription_cycle') {
                    // Get subscription to find user
                    const { data: subData, error: subError } = await supabase
                        .from('subscriptions')
                        .select('user_id')
                        .eq('stripe_subscription_id', subscriptionId)
                        .single();

                    if (subError || !subData) {
                        console.error('Subscription not found for invoice:', subscriptionId);
                        break;
                    }

                    // Reset generation count for this user
                    const { error: resetError } = await supabase
                        .from('users')
                        .update({ generation_count: 0 })
                        .eq('id', subData.user_id);

                    if (resetError) {
                        console.error('Failed to reset generation count:', resetError);
                    } else {
                        console.log('Reset generation count for user:', subData.user_id);
                    }
                }
                break;
            }
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}
