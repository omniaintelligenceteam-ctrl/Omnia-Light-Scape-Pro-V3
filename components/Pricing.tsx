import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STRIPE_CONFIG } from '../constants';
import { X, Loader2, Sparkles, ShieldCheck, Zap, Check, Crown, Building2, Plus } from 'lucide-react';
import { createCheckoutSession } from '../services/stripeservice';

interface PricingProps {
  isOpen: boolean;
  onClose: () => void;
}

type BillingCycle = 'monthly' | 'yearly';
type PlanTier = 'starter' | 'pro' | 'business';

export const Pricing: React.FC<PricingProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSelectPlan = async (tier: PlanTier) => {
    if (!user) {
      setError('Please sign in to subscribe');
      return;
    }

    setLoadingPlan(tier);
    setError(null);

    try {
      // Map tier + billing cycle to price ID
      const priceIdMap: Record<string, string> = {
        'starter-monthly': STRIPE_CONFIG.PLANS.STARTER_MONTHLY.id,
        'starter-yearly': STRIPE_CONFIG.PLANS.STARTER_YEARLY.id,
        'pro-monthly': STRIPE_CONFIG.PLANS.PRO_MONTHLY.id,
        'pro-yearly': STRIPE_CONFIG.PLANS.PRO_YEARLY.id,
        'business-monthly': STRIPE_CONFIG.PLANS.BUSINESS_MONTHLY.id,
        'business-yearly': STRIPE_CONFIG.PLANS.BUSINESS_YEARLY.id,
      };

      const priceId = priceIdMap[`${tier}-${billingCycle}`];
      const { url } = await createCheckoutSession(user.id, priceId);

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'starter' as PlanTier,
      name: 'Starter',
      icon: Sparkles,
      monthlyPrice: STRIPE_CONFIG.PLANS.STARTER_MONTHLY.price,
      yearlyPrice: STRIPE_CONFIG.PLANS.STARTER_YEARLY.price,
      generations: STRIPE_CONFIG.PLANS.STARTER_MONTHLY.generations,
      features: [
        '10 generations per month',
        '4K exports',
        'Basic support',
        'No watermark'
      ],
      highlighted: false
    },
    {
      id: 'pro' as PlanTier,
      name: 'Pro',
      icon: Zap,
      monthlyPrice: STRIPE_CONFIG.PLANS.PRO_MONTHLY.price,
      yearlyPrice: STRIPE_CONFIG.PLANS.PRO_YEARLY.price,
      generations: STRIPE_CONFIG.PLANS.PRO_MONTHLY.generations,
      features: [
        '125 generations per month',
        '4K exports',
        'Priority support',
        'No watermark',
        'Advanced lighting controls'
      ],
      highlighted: true
    },
    {
      id: 'business' as PlanTier,
      name: 'Business',
      icon: Building2,
      monthlyPrice: STRIPE_CONFIG.PLANS.BUSINESS_MONTHLY.price,
      yearlyPrice: STRIPE_CONFIG.PLANS.BUSINESS_YEARLY.price,
      generations: -1,
      features: [
        'Unlimited generations',
        '4K exports',
        'Dedicated support',
        'No watermark',
        'Advanced lighting controls',
        'Custom branding',
        'API access'
      ],
      highlighted: false
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative bg-[#111] border border-white/10 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-8 pb-4 text-center border-b border-white/10">
              <div className="flex justify-end mb-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 -mr-2 -mt-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </motion.button>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
                className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#F6B45A]/20 border border-[#F6B45A]/20"
              >
                <Crown size={24} className="text-[#F6B45A]" />
              </motion.div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Choose Your Plan</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Unlock the full power of AI-generated lighting designs
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-2 p-1 bg-white/5 rounded-full border border-white/10">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    billingCycle === 'monthly'
                      ? 'bg-[#F6B45A] text-black shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all active:scale-95 flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-[#F6B45A] text-black shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    Save 15%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, index) => {
                const Icon = plan.icon;
                const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                const isLoading = loadingPlan === plan.id;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`relative rounded-2xl p-6 border-2 transition-all ${
                      plan.highlighted
                        ? 'border-[#F6B45A] bg-gradient-to-b from-[#F6B45A]/10 to-transparent shadow-[0_0_30px_rgba(246,180,90,0.15)]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-[#F6B45A] text-black text-xs font-bold px-4 py-1 rounded-full">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col h-full">
                      {/* Icon & Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.highlighted ? 'bg-[#F6B45A]' : 'bg-white/5'
                        }`}>
                          <Icon size={20} className={plan.highlighted ? 'text-black' : 'text-gray-400'} />
                        </div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-white">${price}</span>
                          <span className="text-gray-500 text-sm">
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {plan.generations === -1
                            ? 'Unlimited generations'
                            : `${plan.generations} generation${plan.generations > 1 ? 's' : ''} per ${billingCycle === 'monthly' ? 'month' : 'year'}`}
                        </p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-6 flex-grow">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check size={16} className="text-[#F6B45A] shrink-0 mt-0.5" />
                            <span className="text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={!!loadingPlan}
                        className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          plan.highlighted
                            ? 'bg-[#F6B45A] text-black hover:bg-[#ffc67a] shadow-lg shadow-[#F6B45A]/20'
                            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                        } disabled:opacity-50`}
                      >
                        {isLoading ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>Get {plan.name}</>
                        )}
                      </motion.button>

                      {/* Create Item Button - Only for Business plan */}
                      {plan.id === 'business' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => window.open('https://buy.stripe.com/test_create_item', '_blank')}
                          className="w-full mt-3 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-white/5 text-white hover:bg-white/10 border border-white/10 text-sm"
                        >
                          <Plus size={16} />
                          Create Item
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 pb-4"
              >
                <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">{error}</p>
              </motion.div>
            )}

            {/* Footer */}
            <div className="px-8 pb-8 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <ShieldCheck size={12} /> Secured by Stripe. Cancel anytime. All plans include 25 free trial generations.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
