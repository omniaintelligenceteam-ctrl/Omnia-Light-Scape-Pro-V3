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

        // Validate priceId against allowed values
        const allowedPriceIds = [
            process.env.STRIPE_PRICE_ID_MONTHLY,
            process.env.STRIPE_PRICE_ID_YEARLY
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

                // Insert into subscriptions table
                const { error: insertError } = await supabase
                    .from('subscriptions')
                    .insert({
                        user_id: userData.id,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        status: 'active',
                        plan_id: priceId
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
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
