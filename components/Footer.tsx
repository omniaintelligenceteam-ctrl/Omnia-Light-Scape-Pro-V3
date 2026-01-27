import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Shield, Sparkles, Zap, KeyRound, Headphones, FileText } from 'lucide-react';

interface FooterProps {
  variant?: 'full' | 'minimal';
}

export const Footer: React.FC<FooterProps> = ({ variant = 'full' }) => {
  const currentYear = new Date().getFullYear();

  if (variant === 'minimal') {
    // Hide minimal footer on mobile since bottom nav (Sidebar) takes that space
    return (
      <footer className="hidden md:block relative py-4 px-4 bg-[#050505] border-t border-white/5">
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
          <Sun className="w-3 h-3 text-[#F6B45A]/50" />
          <span className="font-mono tracking-wider">
            OMNIA LIGHT SCAPE PRO
          </span>
          <span className="text-gray-600">|</span>
          <span>{currentYear}</span>
        </div>
      </footer>
    );
  }

  // Hide full footer on mobile since bottom nav (Sidebar) takes that space
  return (
    <footer className="hidden md:block relative bg-gradient-to-b from-[#0a0a0a] to-[#030303] border-t border-white/5 overflow-hidden">
      {/* Ambient top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-12 bg-[#F6B45A]/5 blur-[60px] pointer-events-none"></div>

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/40 to-transparent"></div>

      {/* Secondary shimmer line */}
      <div className="absolute top-[1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      {/* Main Content */}
      <div className="relative px-4 md:px-6 py-4 md:py-5">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          {/* Brand Section */}
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            {/* Logo Mark */}
            <motion.div
              className="relative w-8 h-8 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <motion.div
                className="absolute inset-0 rounded-lg border border-[#F6B45A]/30"
                style={{ rotate: 45 }}
                animate={{ rotate: [45, 405] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0.5 rounded-md bg-gradient-to-br from-[#F6B45A]/20 via-[#F6B45A]/5 to-transparent rotate-45"></div>
              <Sun className="w-3.5 h-3.5 text-[#F6B45A] relative z-10" strokeWidth={2.5} />
              <div className="absolute inset-0 bg-[#F6B45A]/20 blur-lg -z-10 rounded-full"></div>
            </motion.div>

            {/* Brand Text */}
            <div className="flex flex-col">
              <span
                className="text-base font-black tracking-tight"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  background: 'linear-gradient(135deg, #F6B45A 0%, #FFD700 50%, #F6B45A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                OMNIA
              </span>
              <span className="text-[7px] text-gray-500 font-medium tracking-[0.2em] uppercase -mt-0.5">
                Light Scape Pro
              </span>
            </div>
          </div>

          {/* Trust Badges - Glassmorphism Style */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <TrustBadge icon={Shield} label="Secure" />
            <TrustBadge icon={Sparkles} label="AI Powered" />
            <TrustBadge icon={Zap} label="Lightning Fast" />
          </div>

          {/* Premium Links */}
          <div className="flex items-center justify-center md:justify-end gap-1.5">
            <FooterLink href="#" icon={KeyRound}>Privacy</FooterLink>
            <FooterLink href="#" icon={FileText}>Terms</FooterLink>
            <FooterLink href="#" icon={Headphones}>Support</FooterLink>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Copyright */}
          <p className="text-[9px] text-gray-600 font-mono tracking-wider text-center md:text-left">
            &copy; {currentYear} Omnia Intelligence. All rights reserved.
          </p>

          {/* Version Badge - Premium Style */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-gray-600 font-mono">v2.0.0</span>
            <motion.div
              className="relative flex items-center gap-1.5 px-2 py-1 rounded-full overflow-hidden"
              whileHover={{ scale: 1.02 }}
            >
              {/* Glassmorphism background */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 backdrop-blur-sm border border-emerald-500/20 rounded-full"></div>

              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-full opacity-50">
                <div className="absolute inset-[-1px] rounded-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 animate-pulse"></div>
              </div>

              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              </span>
              <span className="relative text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                Online
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Decorative bottom corners */}
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-[#F6B45A]/20 hidden md:block"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-[#F6B45A]/20 hidden md:block"></div>
    </footer>
  );
};

// Premium Trust Badge Component with Pill Shape
const TrustBadge: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
  <motion.div
    className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full overflow-hidden shrink-0 group cursor-default"
    whileHover={{ scale: 1.05, y: -1 }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
  >
    {/* Background with subtle border */}
    <div className="absolute inset-0 bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-[#F6B45A]/40 transition-colors duration-300"></div>

    {/* Inner highlight on hover */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#F6B45A]/0 to-[#F6B45A]/0 group-hover:from-[#F6B45A]/10 group-hover:to-transparent rounded-full transition-all duration-500"></div>

    {/* Icon container - circular */}
    <div className="relative w-4 h-4 rounded-full bg-[#F6B45A]/15 border border-[#F6B45A]/30 flex items-center justify-center group-hover:bg-[#F6B45A]/25 group-hover:scale-110 transition-all duration-300">
      <Icon className="w-2 h-2 text-[#F6B45A]" />
    </div>

    <span className="relative text-[9px] font-medium text-white tracking-wide">
      {label}
    </span>
  </motion.div>
);

// Premium Footer Link with Morphing Border Effect
const FooterLink: React.FC<{ href: string; icon: React.ElementType; children: React.ReactNode }> = ({ href, icon: Icon, children }) => (
  <motion.a
    href={href}
    className="relative group"
    whileHover={{ scale: 1.05, y: -1 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
  >
    {/* Animated border gradient */}
    <motion.div
      className="absolute -inset-[1px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{
        background: 'linear-gradient(90deg, #F6B45A, #FFD700, #F6B45A)',
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['0% 0%', '200% 0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
    />

    {/* Button container - Pill shape */}
    <div className="relative flex items-center gap-1.5 px-3 py-1 rounded-full overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-[#0a0a0a] rounded-full border border-white/5 group-hover:border-transparent transition-all duration-300"></div>

      {/* Inner glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#F6B45A]/0 to-[#F6B45A]/0 group-hover:from-[#F6B45A]/5 group-hover:to-transparent rounded-full transition-all duration-500"></div>

      {/* Content - White font */}
      <Icon className="relative w-3 h-3 text-white/70 group-hover:text-[#F6B45A] transition-colors duration-300" />
      <span className="relative text-[9px] font-medium text-white tracking-wide group-hover:text-white transition-colors duration-300">
        {children}
      </span>
    </div>
  </motion.a>
);

export default Footer;
