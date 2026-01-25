import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Tag, Percent } from 'lucide-react';

interface QuoteTotalsSectionProps {
  subtotal: number;
  discount: number;
  onDiscountChange: (value: number) => void;
  taxRate: number;
  onTaxRateChange: (value: number) => void;
  tax: number;
  total: number;
  projectImage: string | null;
}

export const QuoteTotalsSection: React.FC<QuoteTotalsSectionProps> = ({
  subtotal,
  discount,
  onDiscountChange,
  taxRate,
  onTaxRateChange,
  tax,
  total,
  projectImage
}) => {
  return (
    <motion.div
      className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-3 md:p-8 rounded-xl md:rounded-2xl border border-white/10 mb-4 md:mb-16 overflow-hidden print:bg-transparent print:border-none print:p-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Decorative glow - hidden on mobile */}
      <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-[#F6B45A]/10 rounded-full blur-3xl pointer-events-none print:hidden" />

      <div className="flex flex-col md:flex-row gap-3 md:gap-8 relative z-10">
        {/* Project Image - DESKTOP ONLY (left side) */}
        <div className="hidden md:block md:flex-[1.2]">
          {projectImage ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 print:border-gray-200">
              <img
                src={projectImage}
                alt="Project Design"
                className="w-full h-auto object-cover"
              />
              {/* Tech corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#F6B45A]/50 print:hidden" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#F6B45A]/50 print:hidden" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#F6B45A]/50 print:hidden" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#F6B45A]/50 print:hidden" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full min-h-[280px] rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] flex-col items-center justify-center text-center p-6 print:hidden"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 animate-empty-glow-pulse"
              >
                <Sparkles className="w-6 h-6 text-gray-600" />
              </motion.div>
              <p className="text-sm text-gray-500 font-medium mb-1">No Image Available</p>
              <p className="text-xs text-gray-600">Generate a design in the Editor tab</p>
            </motion.div>
          )}
        </div>

        {/* Totals Column - Compact on mobile */}
        <div className="flex flex-col md:items-end gap-1 md:gap-3 md:flex-1">
          <div className="w-full md:w-72 flex justify-between py-1.5 md:py-3 text-xs md:text-sm text-gray-300 print:text-gray-600">
            <span>Subtotal</span>
            <span className="font-bold text-sm md:text-lg text-white font-mono print:text-black">${subtotal.toFixed(2)}</span>
          </div>

          {/* Discount Row */}
          <div className="w-full md:w-72 flex justify-between items-center py-1.5 md:py-3 text-xs md:text-sm text-gray-300 print:text-gray-600">
            <span className="flex items-center gap-1 md:gap-2 text-white font-medium print:text-black">
              <Tag className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
              Discount
            </span>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs md:text-sm">-$</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                className="w-16 md:w-24 text-right bg-[#0a0a0a] border border-white/10 rounded-lg px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white focus:ring-0 focus:border-[#F6B45A] font-bold placeholder-gray-600 font-mono transition-colors print:bg-transparent print:border-gray-200 print:text-black"
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="w-full md:w-72 flex justify-between items-center py-1.5 md:py-3 text-xs md:text-sm text-gray-300 border-b border-white/10 print:border-gray-200 print:text-gray-600">
            <div className="flex items-center gap-1 md:gap-2">
              <span>Tax Rate</span>
              <div className="flex items-center bg-[#0a0a0a] rounded-lg px-2 py-1 md:px-3 md:py-2 border border-white/10 hover:border-[#F6B45A]/30 transition-colors print:bg-gray-50 print:border-none" title="Enter your state tax rate">
                <input
                  type="number"
                  value={(taxRate * 100).toFixed(1)}
                  onChange={(e) => onTaxRateChange((parseFloat(e.target.value) || 0) / 100)}
                  className="w-10 md:w-14 text-right bg-transparent border-none p-0 text-xs md:text-sm focus:ring-0 font-medium text-white font-mono print:text-black"
                  step="0.1"
                  min="0"
                  max="15"
                  placeholder="7.0"
                />
                <Percent className="w-2.5 h-2.5 md:w-3 md:h-3 ml-0.5 md:ml-1 text-gray-500" />
              </div>
            </div>
            <span className="font-bold text-sm md:text-lg text-white font-mono print:text-black">${tax.toFixed(2)}</span>
          </div>

          {/* Grand Total */}
          <div className="w-full md:w-72 flex justify-between items-center py-2 md:py-4 mt-1 md:mt-2">
            <span className="text-sm md:text-lg font-bold text-white print:text-black">Total</span>
            <div className="relative">
              <span className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F6B45A] to-[#ffd699] font-mono print:text-black">
                ${total.toFixed(2)}
              </span>
              <div className="hidden md:block absolute -inset-2 bg-[#F6B45A]/20 blur-xl -z-10 print:hidden" />
            </div>
          </div>
        </div>

        {/* Project Image - MOBILE ONLY (below totals) */}
        {projectImage && (
          <div className="md:hidden mt-3">
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/30">
              <img
                src={projectImage}
                alt="Project Design"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
