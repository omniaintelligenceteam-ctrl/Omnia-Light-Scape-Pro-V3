import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Check, Zap } from 'lucide-react';

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
      {/* Ambient Glow Effect */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-[#F6B45A]/10 blur-[100px] pointer-events-none"></div>

      {/* Top Gradient Line - More Prominent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F6B45A] to-transparent opacity-60"></div>

      {/* Secondary subtle line */}
      <div className="absolute top-[2px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div className="relative px-6 md:px-8 h-20 md:h-24 flex items-center justify-between bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-b border-white/5">

        {/* Decorative Corner Elements */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-[#F6B45A]/30 hidden md:block"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-[#F6B45A]/30 hidden md:block"></div>

        {/* Logo Section */}
        <div className="flex items-center gap-4 select-none">
          {/* Logo Mark */}
          <motion.div
            className="relative w-12 h-12 md:w-14 md:h-14 hidden sm:flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-xl border border-[#F6B45A]/30 rotate-45"></div>
            {/* Inner glow */}
            <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-[#F6B45A]/20 to-transparent rotate-45"></div>
            {/* Icon */}
            <Zap className="w-6 h-6 md:w-7 md:h-7 text-[#F6B45A] relative z-10 fill-[#F6B45A]/20" />
          </motion.div>

          {/* Text Logo */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F6B45A] via-[#ffd699] to-[#F6B45A] font-serif tracking-tight">
                Omnia
              </h1>
              <span className="text-white/80 font-serif italic font-semibold tracking-[0.2em] text-[10px] md:text-xs uppercase">
                Light Scape
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-[1px] w-8 bg-gradient-to-r from-[#F6B45A]/50 to-transparent"></div>
              <span className="text-[8px] md:text-[9px] text-[#F6B45A]/70 font-mono tracking-[0.3em] uppercase">
                Professional
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 md:gap-6">

          {/* Trial Status Badge */}
          {showTrialBadge && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F6B45A]" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Trial</span>
              </div>
              <div className="h-3 w-px bg-white/20"></div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#F6B45A] font-mono">
                  {subscriptionStatus.remainingFreeGenerations}
                </span>
                <span className="text-[9px] text-gray-400">
                  / {subscriptionStatus.freeTrialLimit}
                </span>
              </div>
            </motion.div>
          )}

          {/* Pro Status Badge */}
          {showProBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#F6B45A]/20 to-[#F6B45A]/5 border border-[#F6B45A]/40 shadow-[0_0_20px_rgba(246,180,90,0.15)]"
            >
              <div className="relative">
                <Crown className="w-4 h-4 text-[#F6B45A] fill-[#F6B45A]/30" />
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Crown className="w-4 h-4 text-[#F6B45A]" />
                </motion.div>
              </div>
              <span className="text-[10px] font-black text-[#F6B45A] uppercase tracking-[0.2em]">Pro</span>
            </motion.div>
          )}

          {/* System Status */}
          <div className="hidden lg:flex flex-col items-end px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-medium mb-1">System</span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">ONLINE</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden md:block"></div>

          {/* Upgrade Button - Only show if not Pro */}
          {!showProBadge && (
            <motion.button
              onClick={onRequestUpgrade}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#F6B45A] to-[#d4964a] text-[#050505] shadow-[0_0_30px_rgba(246,180,90,0.3)] hover:shadow-[0_0_50px_rgba(246,180,90,0.5)] transition-all duration-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Upgrade to Pro"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>

              {/* Button content */}
              <div className="relative z-10 flex items-center gap-2 px-5 py-3">
                <Crown className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Upgrade</span>
              </div>

              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/30"></div>
            </motion.button>
          )}
        </div>
      </div>

      {/* Bottom subtle shadow line */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>
    </header>
  );
};
