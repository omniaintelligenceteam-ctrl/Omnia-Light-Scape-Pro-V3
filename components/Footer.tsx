import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Sparkles, ExternalLink } from 'lucide-react';

interface FooterProps {
  variant?: 'full' | 'minimal';
}

export const Footer: React.FC<FooterProps> = ({ variant = 'full' }) => {
  const currentYear = new Date().getFullYear();

  if (variant === 'minimal') {
    return (
      <footer className="relative py-4 px-4 bg-[#050505] border-t border-white/5">
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
          <Zap className="w-3 h-3 text-[#F6B45A]/50" />
          <span className="font-mono tracking-wider">
            OMNIA LIGHT SCAPE PRO
          </span>
          <span className="text-gray-600">|</span>
          <span>{currentYear}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-t border-white/5 overflow-hidden">
      {/* Ambient top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-20 bg-[#F6B45A]/5 blur-[80px] pointer-events-none"></div>

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F6B45A]/30 to-transparent"></div>

      {/* Main Content */}
      <div className="relative px-4 md:px-8 py-6 md:py-8">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          {/* Brand Section */}
          <div className="flex items-center justify-center md:justify-start gap-3">
            {/* Logo Mark */}
            <motion.div
              className="relative w-10 h-10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="absolute inset-0 rounded-lg border border-[#F6B45A]/20 rotate-45"></div>
              <div className="absolute inset-1 rounded bg-gradient-to-br from-[#F6B45A]/10 to-transparent rotate-45"></div>
              <Zap className="w-5 h-5 text-[#F6B45A] relative z-10 fill-[#F6B45A]/20" />
            </motion.div>

            {/* Brand Text */}
            <div className="flex flex-col">
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F6B45A] to-[#ffd699] font-serif tracking-tight">
                Omnia
              </span>
              <span className="text-[8px] text-gray-500 font-mono tracking-[0.2em] uppercase -mt-0.5">
                Light Scape Pro
              </span>
            </div>
          </div>

          {/* Trust Badges - Mobile Horizontal Scroll */}
          <div className="flex items-center justify-center gap-4 md:gap-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <TrustBadge icon={Shield} label="Secure" />
            <TrustBadge icon={Sparkles} label="AI Powered" />
            <TrustBadge icon={Zap} label="Fast" />
          </div>

          {/* Links - Mobile: Center aligned */}
          <div className="flex items-center justify-center md:justify-end gap-4 text-[10px]">
            <FooterLink href="#">Privacy</FooterLink>
            <span className="text-gray-700">|</span>
            <FooterLink href="#">Terms</FooterLink>
            <span className="text-gray-700">|</span>
            <FooterLink href="#">Support</FooterLink>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Copyright */}
          <p className="text-[10px] text-gray-600 font-mono tracking-wider text-center md:text-left">
            &copy; {currentYear} Omnia Intelligence. All rights reserved.
          </p>

          {/* Version Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-600 font-mono">v2.0.0</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Systems Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom corners */}
      <div className="absolute bottom-3 left-3 w-3 h-3 border-l border-b border-[#F6B45A]/20 hidden md:block"></div>
      <div className="absolute bottom-3 right-3 w-3 h-3 border-r border-b border-[#F6B45A]/20 hidden md:block"></div>
    </footer>
  );
};

// Trust Badge Component
const TrustBadge: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 shrink-0">
    <Icon className="w-3 h-3 text-[#F6B45A]/60" />
    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
  </div>
);

// Footer Link Component
const FooterLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    className="text-gray-500 hover:text-[#F6B45A] transition-colors font-medium uppercase tracking-wider flex items-center gap-1 group"
  >
    {children}
    <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
  </a>
);

export default Footer;
