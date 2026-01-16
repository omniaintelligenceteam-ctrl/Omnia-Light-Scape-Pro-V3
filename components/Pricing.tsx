import React, { useState } from 'react';
import { STRIPE_CONFIG } from '../constants';
import { Check, X, Loader2, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { SubscriptionPlan } from '../types';

interface PricingProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (plan: SubscriptionPlan) => Promise<void>;
}

export const Pricing: React.FC<PricingProps> = ({ isOpen, onClose, onSubscribe }) => {
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    setLoadingPlan(plan);
    // Simulate Stripe Checkout redirect delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    await onSubscribe(plan);
    setLoadingPlan(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 pb-4 text-center">
            <div className="flex justify-end">
                 <button onClick={onClose} className="p-2 -mr-2 -mt-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-[#111]">
                    <X size={20} />
                 </button>
            </div>
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
               <Sparkles size={20} className="text-[#F6B45A]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#111] mb-2">Upgrade to Pro</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
               Unlock unlimited AI generations, 4K exports, and remove watermarks.
            </p>
        </div>

        {/* Options */}
        <div className="p-8 pt-2 space-y-4">
            
            {/* Monthly */}
            <button 
                onClick={() => handleSelectPlan('pro_monthly')}
                disabled={!!loadingPlan}
                className="w-full group bg-white border-2 border-gray-100 rounded-2xl p-5 flex items-center justify-between hover:border-gray-300 transition-all text-left relative overflow-hidden"
            >
                <div>
                    <p className="font-bold text-[#111] text-sm uppercase tracking-wider mb-1">Monthly</p>
                    <p className="text-2xl font-bold text-[#111]">${STRIPE_CONFIG.PLANS.MONTHLY.price}<span className="text-sm font-medium text-gray-400">/mo</span></p>
                </div>
                {loadingPlan === 'pro_monthly' ? (
                   <Loader2 size={24} className="animate-spin text-[#F6B45A]" />
                ) : (
                   <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#111] group-hover:text-white transition-colors">
                      <Zap size={16} />
                   </div>
                )}
            </button>

            {/* Yearly */}
            <button 
                onClick={() => handleSelectPlan('pro_yearly')}
                disabled={!!loadingPlan}
                className="w-full group bg-[#111] border-2 border-[#111] rounded-2xl p-5 flex items-center justify-between hover:bg-black transition-all text-left relative overflow-hidden shadow-xl shadow-black/10"
            >
                <div className="absolute top-0 right-0 bg-[#F6B45A] text-[#111] text-[9px] font-bold px-3 py-1 rounded-bl-xl">
                    SAVE 15%
                </div>

                <div>
                    <p className="font-bold text-white text-sm uppercase tracking-wider mb-1">Yearly</p>
                    <p className="text-2xl font-bold text-white">${STRIPE_CONFIG.PLANS.YEARLY.price}<span className="text-sm font-medium text-gray-500">/yr</span></p>
                </div>
                 {loadingPlan === 'pro_yearly' ? (
                   <Loader2 size={24} className="animate-spin text-white" />
                ) : (
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#111] transition-colors">
                      <Zap size={16} />
                   </div>
                )}
            </button>

            <div className="pt-4 text-center">
                 <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                   <ShieldCheck size={12} /> Secured by Stripe. Cancel anytime.
                 </p>
            </div>
        </div>

      </div>
    </div>
  );
};