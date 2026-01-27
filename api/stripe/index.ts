import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

// Allowed price IDs (all 6 tiers)
const ALLOWED_PRICE_IDS = [
    'price_1SrNHlQ1tit8mwraqKGAf2GL', // STARTER_MONTHLY
    'price_1SrNJdQ1tit8mwraqbC4ihcM', // STARTER_YEARLY
    'price_1SrNK5Q1tit8mwraTa5UHFWD', // PRO_MONTHLY
    'price_1SrNKfQ1tit8mwrajmlqx1ak', // PRO_YEARLY
    'price_1SrNLUQ1tit8mwraV4J0nB6T', // BUSINESS_MONTHLY
    'price_1SrNM8Q1tit8mwraPzrGelaH', // BUSINESS_YEARLY
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const action = req.query.action as string;

    // Route to appropriate handler based on action
    switch (action) {
        case 'checkout':
            return handleCheckout(req, res);
        case 'portal':
            return handlePortal(req, res);
        default:
            return res.status(400).json({ error: 'Invalid action. Use: checkout or portal' });
    }
}

// POST /api/stripe?action=checkout
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
    try {
        const { userId, priceId } = req.body;

        if (!userId || !priceId) {
            return res.status(400).json({ error: 'Missing required fields: userId and priceId' });
        }

        if (!ALLOWED_PRICE_IDS.includes(priceId)) {
            return res.status(400).json({ error: 'Invalid priceId' });
        }

        let supabase;
        try {
            supabase = getSupabase();
        } catch {
            return res.status(500).json({ error: 'Database not configured' });
        }

        // Look up user email from Supabase by clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            console.error('User lookup failed:', userError);
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
            success_url: `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/billing/canceled`,
            metadata: {
                clerk_user_id: userId,
            }
        });

        return res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
}

// POST /api/stripe?action=portal
async function handlePortal(req: VercelRequest, res: VercelResponse) {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        let supabase;
        try {
            supabase = getSupabase();
        } catch {
            return res.status(500).json({ error: 'Database not configured' });
        }

        // Get user's internal ID from clerk_user_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_user_id', userId)
            .single();

        if (userError || !userData) {
            console.error('User lookup failed:', userError);
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
            console.error('Subscription lookup failed:', subError);
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Create Stripe billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subData.stripe_customer_id,
            return_url: `${FRONTEND_URL}/settings`,
        });

        return res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe portal error:', err);
        return res.status(500).json({ error: 'Failed to create portal session' });
    }
}
