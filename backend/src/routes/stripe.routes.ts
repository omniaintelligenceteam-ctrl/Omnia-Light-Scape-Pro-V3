import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia'
});

interface CheckoutRequest {
    userId: string;
    priceId: string;
}

// POST /api/stripe/checkout
router.post('/checkout', async (req: Request<{}, {}, CheckoutRequest>, res: Response) => {
    try {
        const { userId, priceId } = req.body;

        if (!userId || !priceId) {
            return res.status(400).json({ error: 'Missing required fields: userId and priceId' });
        }

        // Validate priceId against allowed values (all 6 tiers)
        const allowedPriceIds = [
            'price_1SrNHIQ1tit8mwraqKGAf2GL', // STARTER_MONTHLY
            'price_1SrNJdQ1tit8mwraqbC4ihcM', // STARTER_YEARLY
            'price_1SrNK5Q1tit8mwraTa5UHFWD', // PRO_MONTHLY
            'price_1SrNKfQ1tit8mwrajmlqx1ak', // PRO_YEARLY
            'price_1SrNLUQ1tit8mwraV4J0nB6T', // BUSINESS_MONTHLY
            'price_1SrNM8Q1tit8mwraPzrGelaH', // BUSINESS_YEARLY
        ];

        if (!allowedPriceIds.includes(priceId)) {
            return res.status(400).json({ error: 'Invalid priceId' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Database not configured' });
        }

        // Look up user email from Supabase by clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: userData.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                }
            ],
            success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/billing/canceled`,
            metadata: {
                clerk_user_id: userId,
            }
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// POST /api/stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    if (!supabase) {
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

                // Map price ID to monthly limit
                const priceToLimitMap: Record<string, number> = {
                    'price_1SrNHIQ1tit8mwraqKGAf2GL': 10,    // STARTER_MONTHLY
                    'price_1SrNJdQ1tit8mwraqbC4ihcM': 10,    // STARTER_YEARLY (10/month)
                    'price_1SrNK5Q1tit8mwraTa5UHFWD': 125,   // PRO_MONTHLY
                    'price_1SrNKfQ1tit8mwrajmlqx1ak': 125,   // PRO_YEARLY (125/month)
                    'price_1SrNLUQ1tit8mwraV4J0nB6T': -1,    // BUSINESS_MONTHLY (unlimited)
                    'price_1SrNM8Q1tit8mwraPzrGelaH': -1,    // BUSINESS_YEARLY (unlimited)
                };

                const monthlyLimit = priceToLimitMap[priceId] || 0;

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
                const subscriptionId = invoice.subscription as string;

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
});

// POST /api/stripe/portal - Create customer portal session
router.post('/portal', async (req: Request<{}, {}, { userId: string }>, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Database not configured' });
        }

        // Get user's internal ID from clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get stripe_customer_id from subscriptions table
        const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userData.id)
            .eq('status', 'active')
            .single();

        if (subError || !subData?.stripe_customer_id) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Create Stripe billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subData.stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/settings`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe portal error:', err);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

export default router;
