import { SubscriptionPlan } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const createCheckoutSession = async (userId: string, plan: SubscriptionPlan): Promise<{ url: string }> => {
  const priceId = plan === 'pro_monthly'
    ? import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY
    : import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY;

  const response = await fetch(`${API_URL}/api/stripe/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      priceId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return response.json();
};

export const createPortalSession = async (userId: string): Promise<{ url: string }> => {
  console.log(`[Stripe Service] Creating portal session for user ${userId}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    url: 'https://billing.stripe.com/p/session/mock_portal'
  };
};

/**
 * ============================================================================
 *  BACKEND WEBHOOK HANDLER REFERENCE (Node.js / Express)
 * ============================================================================
 * 
 * Endpoint: POST /api/billing/webhook
 * 
 * Logic:
 * 1. Validate signature using `stripe.webhooks.constructEvent`
 * 2. Switch on event.type:
 * 
 *    CASE 'customer.subscription.created':
 *    CASE 'customer.subscription.updated':
 *      const subscription = event.data.object;
 *      const stripeCustomerId = subscription.customer;
 *      
 *      // Lookup User
 *      const user = await db.users.find({ where: { stripe_customer_id: stripeCustomerId } });
 *      
 *      // Upsert Subscription Record
 *      await db.subscriptions.upsert({
 *        where: { user_id: user.id },
 *        update: {
 *          stripe_subscription_id: subscription.id,
 *          status: subscription.status, // 'active', 'past_due', etc.
 *          plan: mapPriceIdToPlanName(subscription.items.data[0].price.id), // 'pro_monthly' | 'pro_yearly'
 *          current_period_end: subscription.current_period_end, // Timestamp from Stripe
 *        }
 *      });
 *      break;
 * 
 *    CASE 'customer.subscription.deleted':
 *      const subscription = event.data.object;
 *      // Update status to canceled
 *      await db.subscriptions.update({
 *        where: { stripe_subscription_id: subscription.id },
 *        data: { status: 'canceled' }
 *      });
 *      break;
 * 
 * 3. Return 200 OK
 */