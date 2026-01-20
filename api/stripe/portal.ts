import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia'
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
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

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe portal error:', err);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
}
