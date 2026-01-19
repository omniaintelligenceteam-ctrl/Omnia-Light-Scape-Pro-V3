import React from 'react';
import { Crown, Sparkles, Check } from 'lucide-react';

interface HeaderProps {
    onRequestUpgrade?: () => void;
    subscriptionStatus?: {
      hasActiveSubscription: boolean;
      remainingFreeGenerations: number;
      freeTrialLimit: number;
      isLoading: boolean;
    };
}

export const Header: React.FC<HeaderProps> = ({ onRequestUpgrade, subscriptionStatus }) => {
  const showTrialBadge = subscriptionStatus && !subscriptionStatus.isLoading && !subscriptionStatus.hasActiveSubscription;
  const showProBadge = subscriptionStatus?.hasActiveSubscription;

  return (
    <header className="relative z-50 shrink-0">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/50 to-transparent"></div>

      <div className="px-6 md:px-8 h-20 md:h-24 flex items-center justify-between bg-[#050505] border-b border-white/5 shadow-2xl">
        {/* Logo Section - Matching Reference Image */}
        <div className="flex items-baseline gap-3 select-none">
            <h1 className="text-4xl md:text-5xl font-bold text-[#F6B45A] font-serif tracking-tight">
              Omnia
            </h1>
            <span className="text-white font-serif italic font-extrabold tracking-[0.15em] text-sm md:text-base opacity-90">
              LIGHT SCAPE PRO
            </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-6">
           {/* Trial/Pro Status Badge */}
           {showTrialBadge && (
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
               <Sparkles className="w-3.5 h-3.5 text-[#F6B45A]" />
               <span className="text-[10px] font-medium text-white">
                 {subscriptionStatus.remainingFreeGenerations} / {subscriptionStatus.freeTrialLimit} free
               </span>
             </div>
           )}
           {showProBadge && (
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F6B45A]/10 border border-[#F6B45A]/30">
               <Check className="w-3.5 h-3.5 text-[#F6B45A]" />
               <span className="text-[10px] font-bold text-[#F6B45A] uppercase tracking-wider">Pro</span>
             </div>
           )}

           {/* System Status - Desktop Only */}
           <div className="hidden md:flex flex-col items-end">
              <span className="text-[9px] text-gray-300 uppercase tracking-widest font-bold mb-0.5">System Status</span>
              <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-mono text-white">ONLINE</span>
              </div>
           </div>

           <div className="h-8 w-px bg-white/10 hidden md:block"></div>

           {/* Icon-only Upgrade Button - Hide if Pro */}
           {!showProBadge && (
             <button
              onClick={onRequestUpgrade}
              className="group relative p-3 overflow-hidden rounded-full bg-[#F6B45A] text-[#050505] shadow-[0_0_20px_rgba(246,180,90,0.2)] hover:shadow-[0_0_30px_rgba(246,180,90,0.4)] transition-all duration-300 hover:scale-110"
              title="Upgrade to Pro"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              <div className="relative z-10">
                  <Crown className="w-5 h-5 fill-current" />
              </div>
            </button>
           )}
        </div>
      </div>
    </header>
  );
};