import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia'
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

// Allowed price IDs (all 6 tiers)
const ALLOWED_PRICE_IDS = [
    'price_1SrNHIQ1tit8mwraqKGAf2GL', // STARTER_MONTHLY
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

    try {
        const { userId, priceId } = req.body;

        if (!userId || !priceId) {
            return res.status(400).json({ error: 'Missing required fields: userId and priceId' });
        }

        if (!ALLOWED_PRICE_IDS.includes(priceId)) {
            return res.status(400).json({ error: 'Invalid priceId' });
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

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
}
