import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Zap, Sun } from 'lucide-react';

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

      {/* Top Gradient Line - Premium Gold */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F6B45A] to-transparent opacity-80"></div>

      {/* Secondary shimmer line */}
      <div className="absolute top-[2px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

      <div className="relative px-4 md:px-8 h-16 md:h-20 flex items-center justify-between bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-b border-white/5">

        {/* Decorative Corner Elements - Desktop only */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-[#F6B45A]/40 hidden md:block"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-[#F6B45A]/40 hidden md:block"></div>

        {/* Logo Section */}
        <motion.div
          className="flex items-center gap-3 md:gap-4 select-none cursor-pointer"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Logo Mark - Animated Sun/Light Icon */}
          <motion.div
            className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
            animate={{
              boxShadow: [
                '0 0 20px rgba(246,180,90,0.2)',
                '0 0 30px rgba(246,180,90,0.4)',
                '0 0 20px rgba(246,180,90,0.2)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-xl border border-[#F6B45A]/40"
              style={{ rotate: 45 }}
              animate={{ rotate: [45, 405] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner glow background */}
            <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-[#F6B45A]/30 via-[#F6B45A]/10 to-transparent rotate-45"></div>
            {/* Icon */}
            <Sun className="w-5 h-5 md:w-6 md:h-6 text-[#F6B45A] relative z-10" strokeWidth={2.5} />
          </motion.div>

          {/* Text Logo - Premium Typography */}
          <div className="flex flex-col">
            {/* Main Brand Name */}
            <div className="flex items-baseline gap-1.5 md:gap-2">
              <h1
                className="text-2xl md:text-3xl font-black tracking-tight text-[#F6B45A]"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: '0 0 30px rgba(246,180,90,0.5), 0 0 60px rgba(246,180,90,0.3)',
                }}
              >
                OMNIA
              </h1>
              <div className="flex flex-col -space-y-0.5">
                <span
                  className="text-[9px] md:text-[10px] font-medium text-white/90 tracking-[0.25em] uppercase"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  LIGHT
                </span>
                <span
                  className="text-[9px] md:text-[10px] font-medium text-white/60 tracking-[0.25em] uppercase"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  SCAPE
                </span>
              </div>
            </div>
            {/* Tagline */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-[1px] w-6 md:w-10 bg-gradient-to-r from-[#F6B45A] to-transparent"></div>
              <span className="text-[7px] md:text-[8px] text-[#F6B45A]/80 font-semibold tracking-[0.35em] uppercase">
                PRO
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Mobile Trial Counter - Always visible on mobile */}
          {showTrialBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex md:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10"
            >
              <Sparkles className="w-3 h-3 text-[#F6B45A]" />
              <span className="text-xs font-bold text-[#F6B45A] font-mono">
                {subscriptionStatus.remainingFreeGenerations}
              </span>
              <span className="text-[8px] text-gray-500">left</span>
            </motion.div>
          )}

          {/* Desktop Trial Status Badge */}
          {showTrialBadge && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F6B45A]" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Free Trial</span>
              </div>
              <div className="h-4 w-px bg-white/20"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-[#F6B45A] font-mono">
                  {subscriptionStatus.remainingFreeGenerations}
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  / {subscriptionStatus.freeTrialLimit}
                </span>
              </div>
            </motion.div>
          )}

          {/* Mobile Pro Badge */}
          {showProBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex md:hidden items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#F6B45A]/20 border border-[#F6B45A]/40"
            >
              <Crown className="w-3.5 h-3.5 text-[#F6B45A] fill-[#F6B45A]/30" />
              <span className="text-[9px] font-black text-[#F6B45A] uppercase">PRO</span>
            </motion.div>
          )}

          {/* Desktop Pro Status Badge */}
          {showProBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden md:flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F6B45A]/20 to-[#F6B45A]/5 border border-[#F6B45A]/40 shadow-[0_0_25px_rgba(246,180,90,0.2)]"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className="w-4 h-4 text-[#F6B45A] fill-[#F6B45A]/40" />
              </motion.div>
              <span className="text-xs font-black text-[#F6B45A] uppercase tracking-[0.15em]">Pro Member</span>
            </motion.div>
          )}

          {/* System Status - Desktop only */}
          <div className="hidden lg:flex flex-col items-end px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[7px] text-gray-500 uppercase tracking-[0.2em] font-medium mb-0.5">Status</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider">ONLINE</span>
            </div>
          </div>

          {/* Divider - Desktop only */}
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden md:block"></div>

          {/* Upgrade Button - Only show if not Pro */}
          {!showProBadge && (
            <motion.button
              onClick={onRequestUpgrade}
              className="group relative overflow-hidden rounded-xl bg-[#F6B45A] text-[#050505] shadow-[0_0_25px_rgba(246,180,90,0.4)] hover:shadow-[0_0_40px_rgba(246,180,90,0.6)] hover:bg-[#f7bc6a] transition-all duration-300"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Upgrade to Pro"
            >
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />

              {/* Button content */}
              <div className="relative z-10 flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3">
                <Crown className="w-4 h-4 fill-current" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">Upgrade</span>
              </div>

              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/30"></div>
            </motion.button>
          )}
        </div>
      </div>

      {/* Bottom shadow gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-black/40 to-transparent pointer-events-none"></div>
    </header>
  );
};
