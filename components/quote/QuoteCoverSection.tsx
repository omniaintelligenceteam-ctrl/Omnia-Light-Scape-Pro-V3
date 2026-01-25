import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Sparkles } from 'lucide-react';

interface QuoteCoverSectionProps {
  companyName: string;
  companyLogo?: string | null;
  clientName?: string;
  projectName: string;
  quoteDate: string;
  quoteNumber?: string;
  projectImage?: string | null;
  expiresAt?: string | null;
}

export const QuoteCoverSection: React.FC<QuoteCoverSectionProps> = ({
  companyName,
  companyLogo,
  clientName,
  projectName,
  quoteDate,
  quoteNumber,
  projectImage,
  expiresAt
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate quote number from date if not provided
  const displayQuoteNumber = quoteNumber || `Q-${new Date(quoteDate).getTime().toString(36).toUpperCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl md:rounded-3xl overflow-hidden"
    >
      {/* Background Image with Ken Burns Effect */}
      {projectImage ? (
        <div className="absolute inset-0">
          <motion.img
            src={projectImage}
            alt={projectName}
            className="w-full h-full object-cover ken-burns"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: 'easeOut' }}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0a0a0a]">
          {/* Decorative pattern when no image */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, #F6B45A 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>
      )}

      {/* Premium Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none" />

      {/* Corner Bracket Decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 md:w-12 md:h-12">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F6B45A] to-transparent" />
        <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-[#F6B45A] to-transparent" />
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 md:w-12 md:h-12">
        <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#F6B45A] to-transparent" />
        <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-[#F6B45A] to-transparent" />
      </div>
      <div className="absolute bottom-4 left-4 w-8 h-8 md:w-12 md:h-12">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F6B45A] to-transparent" />
        <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-[#F6B45A] to-transparent" />
      </div>
      <div className="absolute bottom-4 right-4 w-8 h-8 md:w-12 md:h-12">
        <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#F6B45A] to-transparent" />
        <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-[#F6B45A] to-transparent" />
      </div>

      {/* Quote Number Badge - Top Right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-6 right-6 md:top-8 md:right-8"
      >
        <div className="glass-card rounded-xl px-4 py-2 md:px-5 md:py-3 border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <FileText className="w-3 h-3" />
            <span className="uppercase tracking-wider">Quote</span>
          </div>
          <p className="text-white font-mono text-sm md:text-base font-semibold tracking-wide">
            {displayQuoteNumber}
          </p>
        </div>
      </motion.div>

      {/* Main Content - Bottom Left */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <div className="max-w-2xl">
          {/* Company Branding */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-4"
          >
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-10 md:h-14 max-w-[120px] md:max-w-[160px] object-contain"
              />
            ) : (
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#F6B45A] to-[#E09A3A] flex items-center justify-center shadow-lg shadow-[#F6B45A]/20">
                <span className="text-lg md:text-2xl font-bold text-black font-serif">
                  {companyName?.charAt(0) || 'C'}
                </span>
              </div>
            )}
            <div className="h-8 w-px bg-white/20 hidden md:block" />
            <div className="hidden md:block">
              <p className="text-white font-serif font-bold text-lg">{companyName}</p>
              <p className="text-[#F6B45A]/80 text-xs tracking-widest uppercase">Landscape Lighting</p>
            </div>
          </motion.div>

          {/* "Prepared for" Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-5 md:p-6 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 text-[#F6B45A] text-xs font-medium tracking-widest uppercase mb-2">
              <Sparkles className="w-3 h-3" />
              Prepared Exclusively For
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif mb-3">
              {clientName || 'Valued Customer'}
            </h1>
            <p className="text-gray-300 text-sm md:text-base mb-4">
              {projectName}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(quoteDate)}
              </div>
              {expiresAt && (
                <>
                  <div className="w-1 h-1 rounded-full bg-gray-600" />
                  <span>Valid until {formatDate(expiresAt)}</span>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Ambient Glow Effect */}
      <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-[#F6B45A]/10 rounded-full blur-[100px] pointer-events-none" />
    </motion.div>
  );
};

export default QuoteCoverSection;
