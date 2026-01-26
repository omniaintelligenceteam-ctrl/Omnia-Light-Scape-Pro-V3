import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

// Use separate Connect account key (for users to receive payments)
const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId: clerkUserId } = req.query;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get Stripe account ID
    const { data: settings } = await supabase
      .from('settings')
      .select('stripe_account_id')
      .eq('user_id', userData.id)
      .single();

    if (!settings?.stripe_account_id) {
      return res.status(400).json({ error: 'No Stripe account connected' });
    }

    // Create login link to Stripe Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(settings.stripe_account_id);

    return res.status(200).json({
      success: true,
      dashboardUrl: loginLink.url
    });

  } catch (error: any) {
    console.error('Stripe dashboard API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
