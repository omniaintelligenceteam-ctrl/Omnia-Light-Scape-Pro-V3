import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';

// Animated Penrose Triangle (Impossible Triangle) Logo
const PenroseTriangle: React.FC<{ className?: string }> = ({ className = "w-6 h-6 md:w-10 md:h-10" }) => (
  <motion.svg
    viewBox="0 0 48 48"
    className={className}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  >
    <defs>
      {/* Golden gradient */}
      <linearGradient id="penroseGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F6B45A" />
        <stop offset="100%" stopColor="#FFD700" />
      </linearGradient>
      <linearGradient id="penroseGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#D4973D" />
        <stop offset="100%" stopColor="#F6B45A" />
      </linearGradient>
      <linearGradient id="penroseGradient3" x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#FFF0C4" />
      </linearGradient>
      {/* Glow filter */}
      <filter id="penroseGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Impossible Triangle - Three interlocking bars */}
    {/* Left bar */}
    <motion.path
      d="M24 6 L10 30 L14 30 L24 12 L34 30 L24 30 L24 34 L38 34 L24 6"
      fill="url(#penroseGradient1)"
      filter="url(#penroseGlow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
    />
    {/* Right bar */}
    <motion.path
      d="M38 34 L24 34 L24 30 L34 30 L28 20 L32 20 L42 38 L38 38 L38 34"
      fill="url(#penroseGradient2)"
      filter="url(#penroseGlow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
    />
    {/* Bottom bar */}
    <motion.path
      d="M6 38 L10 30 L14 30 L10 38 L38 38 L42 38 L6 38"
      fill="url(#penroseGradient3)"
      filter="url(#penroseGlow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
    />

    {/* Glowing vertices */}
    <motion.circle
      cx="24" cy="6" r="2"
      fill="#FFD700"
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
    />
    <motion.circle
      cx="6" cy="38" r="2"
      fill="#F6B45A"
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1.3 }}
    />
    <motion.circle
      cx="42" cy="38" r="2"
      fill="#FFD700"
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1.6 }}
    />
  </motion.svg>
);

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
    <header className="relative z-50 shrink-0 sticky top-0 pt-[env(safe-area-inset-top)]">
      {/* Ambient Glow Effect - hidden on mobile */}
      <div className="hidden md:block absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-[#F6B45A]/10 blur-[100px] pointer-events-none"></div>

      {/* Top Gradient Line - Premium Gold */}
      <div className="absolute top-0 left-0 right-0 h-[1px] md:h-[2px] bg-gradient-to-r from-transparent via-[#F6B45A] to-transparent opacity-80"></div>

      {/* Secondary shimmer line - hidden on mobile */}
      <div className="hidden md:block absolute top-[2px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

      <div className="relative px-3 md:px-8 h-12 md:h-20 flex items-center justify-between bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-b border-white/5">

        {/* Decorative Corner Elements - Desktop only */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-[#F6B45A]/40 hidden md:block"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-[#F6B45A]/40 hidden md:block"></div>

        {/* Logo Section */}
        <motion.div
          className="flex items-center gap-2 md:gap-4 select-none cursor-pointer"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Logo Mark - Golden Ratio Spiral */}
          <motion.div
            className="relative w-8 h-8 md:w-12 md:h-12 flex items-center justify-center"
            animate={{
              filter: [
                'drop-shadow(0 0 8px rgba(246,180,90,0.3))',
                'drop-shadow(0 0 12px rgba(246,180,90,0.5))',
                'drop-shadow(0 0 8px rgba(246,180,90,0.3))'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <PenroseTriangle className="w-6 h-6 md:w-10 md:h-10" />
            <div className="absolute inset-0 bg-[#F6B45A]/20 blur-xl rounded-full -z-10"></div>
          </motion.div>

          {/* Text Logo - Premium Typography */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Main Brand Name - OMNIA */}
            <h1
              className="text-2xl md:text-5xl font-black tracking-tight text-[#F6B45A] leading-none"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                textShadow: '0 0 30px rgba(246,180,90,0.5), 0 0 60px rgba(246,180,90,0.3)',
              }}
            >
              OMNIA
            </h1>
            {/* LIGHT SCAPE stacked to the right */}
            <div className="flex flex-col justify-center gap-0">
              <span
                className="text-[10px] md:text-[16px] font-medium text-white/80 tracking-[0.15em] md:tracking-[0.2em] uppercase leading-none"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                LIGHT
              </span>
              <span
                className="text-[10px] md:text-[16px] font-medium text-white/80 tracking-[0.15em] md:tracking-[0.2em] uppercase leading-none"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                SCAPE
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
              <div className="relative z-10 flex items-center gap-1 md:gap-2 px-2.5 md:px-5 py-2 md:py-3">
                <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider">Upgrade</span>
              </div>

              {/* Bottom highlight */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/30"></div>
            </motion.button>
          )}
        </div>
      </div>

          </header>
  );
};
