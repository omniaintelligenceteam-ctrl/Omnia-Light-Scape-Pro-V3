import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

// Use separate Connect account key (for users to receive payments)
// Falls back to main key if not set
const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnialightscape.vercel.app';

// Parse address string into Stripe-compatible components
function parseAddress(address?: string): { line1: string; city: string; state: string; postal_code: string } | null {
  if (!address) return null;

  // Try to parse "123 Main St, City, ST 12345" format
  const match = address.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i);
  if (match) {
    return {
      line1: match[1].trim(),
      city: match[2].trim(),
      state: match[3].toUpperCase(),
      postal_code: match[4],
    };
  }

  // Fallback: use full address as line1
  return { line1: address, city: '', state: '', postal_code: '' };
}

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

    // Get existing settings including company profile for pre-fill
    const { data: settings } = await supabase
      .from('settings')
      .select('stripe_account_id, stripe_account_status, company_name, company_email, company_phone, company_address')
      .eq('user_id', supabaseUserId)
      .single();

    // POST: Create or get Stripe Connect account and generate onboarding link
    if (req.method === 'POST') {
      let stripeAccountId = settings?.stripe_account_id;

      // Create new Connect account if none exists
      if (!stripeAccountId) {
        // Parse address for pre-fill
        const addressParts = parseAddress(settings?.company_address);

        // Build account create params with pre-filled profile data
        const accountParams: Stripe.AccountCreateParams = {
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
        };

        // Pre-fill business profile if company name exists
        if (settings?.company_name) {
          accountParams.business_profile = {
            name: settings.company_name,
          };
        }

        // Pre-fill individual details from company profile
        if (settings?.company_email || settings?.company_phone || addressParts) {
          accountParams.individual = {};

          if (settings?.company_email) {
            accountParams.individual.email = settings.company_email;
          }
          if (settings?.company_phone) {
            // Strip non-numeric characters for Stripe
            accountParams.individual.phone = settings.company_phone.replace(/\D/g, '');
          }
          if (addressParts && addressParts.line1) {
            accountParams.individual.address = {
              line1: addressParts.line1,
              city: addressParts.city || undefined,
              state: addressParts.state || undefined,
              postal_code: addressParts.postal_code || undefined,
              country: 'US',
            };
          }
        }

        const account = await stripe.accounts.create(accountParams);

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
