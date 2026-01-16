import { STRIPE_CONFIG } from '../constants';
import { SubscriptionPlan } from '../types';

export const createCheckoutSession = async (userId: string, plan: SubscriptionPlan): Promise<{ sessionId: string, url: string }> => {
  // SIMULATION OF BACKEND LOGIC
  
  const priceId = plan === 'pro_monthly' 
    ? STRIPE_CONFIG.PLANS.MONTHLY.id 
    : STRIPE_CONFIG.PLANS.YEARLY.id;

  console.log(`[Stripe Service] Creating session for user ${userId} with price ${priceId}`);

  /**
   * --- BACKEND IMPLEMENTATION REFERENCE ---
   * 
   * const session = await stripe.checkout.sessions.create({
   *   mode: 'subscription',
   *   customer: stripeCustomerId, // Retrieved from DB based on userId
   *   line_items: [{ price: priceId, quantity: 1 }],
   *   success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
   *   cancel_url: `${APP_URL}/settings`,
   * });
   * 
   * return res.json({ url: session.url, sessionId: session.id });
   */

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Return mock session and URL
  // In production, 'url' would be the hosted Stripe Checkout page
  return {
    sessionId: `cs_test_${Math.random().toString(36).substr(2, 9)}`,
    url: 'https://checkout.stripe.com/mock-session' 
  };
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