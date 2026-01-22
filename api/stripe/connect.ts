import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      .select('id, email')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUserId = userData.id;

    // Get existing settings
    const { data: settings } = await supabase
      .from('settings')
      .select('stripe_account_id, stripe_account_status')
      .eq('user_id', supabaseUserId)
      .single();

    // POST: Create or get Stripe Connect account and generate onboarding link
    if (req.method === 'POST') {
      let stripeAccountId = settings?.stripe_account_id;

      // Create new Connect account if none exists
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: userData.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            supabase_user_id: supabaseUserId,
            clerk_user_id: clerkUserId
          }
        });

        stripeAccountId = account.id;

        // Save to settings
        await supabase
          .from('settings')
          .upsert({
            user_id: supabaseUserId,
            stripe_account_id: stripeAccountId,
            stripe_account_status: 'pending'
          }, {
            onConflict: 'user_id'
          });
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${FRONTEND_URL}/settings?stripe=refresh`,
        return_url: `${FRONTEND_URL}/settings?stripe=success`,
        type: 'account_onboarding',
      });

      return res.status(200).json({
        success: true,
        onboardingUrl: accountLink.url,
        accountId: stripeAccountId
      });
    }

    // GET: Check Stripe account status
    if (req.method === 'GET') {
      if (!settings?.stripe_account_id) {
        return res.status(200).json({
          success: true,
          connected: false,
          status: null
        });
      }

      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(settings.stripe_account_id);

      const isActive = account.charges_enabled && account.payouts_enabled;
      const status = isActive ? 'active' :
        account.requirements?.disabled_reason ? 'restricted' : 'pending';

      // Update status in database if changed
      if (status !== settings.stripe_account_status) {
        await supabase
          .from('settings')
          .update({ stripe_account_status: status })
          .eq('user_id', supabaseUserId);
      }

      return res.status(200).json({
        success: true,
        connected: true,
        status,
        accountId: settings.stripe_account_id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements?.currently_due || []
      });
    }

    // DELETE: Disconnect Stripe account
    if (req.method === 'DELETE') {
      if (settings?.stripe_account_id) {
        // Remove from database (we don't delete the Stripe account)
        await supabase
          .from('settings')
          .update({
            stripe_account_id: null,
            stripe_account_status: null
          })
          .eq('user_id', supabaseUserId);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Stripe Connect API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
