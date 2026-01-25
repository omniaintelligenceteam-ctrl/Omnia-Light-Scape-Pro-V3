import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { SubscriptionInfo } from '../types';

interface SubscriptionSectionProps {
  subscription: SubscriptionInfo;
  onRequestUpgrade?: () => void;
  onManageSubscription?: () => void;
  isLoadingPortal?: boolean;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const getPlanDisplayName = (planId: string | null): string => {
  if (!planId) return 'Free';
  if (planId.toLowerCase().includes('starter')) return 'Starter';
  if (planId.toLowerCase().includes('pro')) return 'Pro';
  if (planId.toLowerCase().includes('business')) return 'Business';
  return 'Pro';
};

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  subscription,
  onRequestUpgrade,
  onManageSubscription,
  isLoadingPortal = false
}) => {
  return (
    <motion.div
      key="subscription"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Manage your subscription and view usage.
      </p>

      <SettingsCard className="p-6">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            {/* Plan Badge */}
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                subscription.hasActiveSubscription
                  ? 'bg-[#F6B45A]/20 text-[#F6B45A] border border-[#F6B45A]/30'
                  : 'bg-white/10 text-gray-400 border border-white/10'
              }`}>
                {subscription.hasActiveSubscription ? getPlanDisplayName(subscription.plan) : 'Free Trial'}
              </span>
              {subscription.hasActiveSubscription && (
                <span className="text-sm text-green-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Active
                </span>
              )}
            </div>

            {/* Usage */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  <span className="text-white font-semibold text-lg">
                    {subscription.hasActiveSubscription
                      ? subscription.generationCount
                      : subscription.freeTrialLimit - subscription.remainingFreeGenerations}
                  </span>
                  {' / '}
                  {subscription.hasActiveSubscription
                    ? subscription.monthlyLimit === -1 ? '∞' : subscription.monthlyLimit
                    : subscription.freeTrialLimit}
                  {' generations used'}
                </span>
                {subscription.monthlyLimit === -1 && subscription.hasActiveSubscription && (
                  <span className="text-[#F6B45A] font-bold text-sm">UNLIMITED</span>
                )}
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    subscription.monthlyLimit === -1
                      ? 'bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] animate-pulse'
                      : 'bg-[#F6B45A]'
                  }`}
                  style={{
                    width: subscription.monthlyLimit === -1
                      ? '100%'
                      : `${Math.min(100, (subscription.generationCount / (subscription.monthlyLimit || subscription.freeTrialLimit)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="shrink-0">
            {subscription.hasActiveSubscription ? (
              <button
                onClick={onManageSubscription}
                disabled={isLoadingPortal}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              >
                {isLoadingPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Manage Subscription
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onRequestUpgrade}
                className="flex items-center gap-2 px-6 py-3 bg-[#F6B45A] text-black rounded-xl text-sm font-bold shadow-[0_0_25px_rgba(246,180,90,0.3)] hover:shadow-[0_0_35px_rgba(246,180,90,0.4)] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade Now
              </button>
            )}
          </div>
        </div>
      </SettingsCard>
    </motion.div>
  );
};
