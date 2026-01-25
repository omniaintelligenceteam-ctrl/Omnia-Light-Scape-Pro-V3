import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, Lightbulb, Wrench, Zap, Info } from 'lucide-react';

export interface LineItem {
  id?: string;
  name: string;
  type?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

interface InteractivePricingTableProps {
  lineItems: LineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  showAnimations?: boolean;
}

// Animated number component for counting up
const AnimatedNumber: React.FC<{ value: number; delay?: number }> = ({ value, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 800;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(current);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <span className="text-mono-price">
      {new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(displayValue)}
    </span>
  );
};

// Get icon for item type
const getItemIcon = (name: string, type?: string) => {
  const nameLower = (name || '').toLowerCase();
  const typeLower = (type || '').toLowerCase();

  if (nameLower.includes('install') || typeLower.includes('labor')) {
    return <Wrench className="w-4 h-4" />;
  }
  if (nameLower.includes('light') || typeLower.includes('fixture')) {
    return <Lightbulb className="w-4 h-4" />;
  }
  if (nameLower.includes('wire') || nameLower.includes('transform') || nameLower.includes('electric')) {
    return <Zap className="w-4 h-4" />;
  }
  return <Package className="w-4 h-4" />;
};

export const InteractivePricingTable: React.FC<InteractivePricingTableProps> = ({
  lineItems,
  subtotal,
  taxRate = 0,
  taxAmount = 0,
  discount = 0,
  total,
  showAnimations = true
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isVisible, setIsVisible] = useState(!showAnimations);

  useEffect(() => {
    if (showAnimations) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [showAnimations]);

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
        <div className="col-span-6">Description</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Unit Price</div>
        <div className="col-span-2 text-right">Total</div>
      </div>

      {/* Line Items */}
      <div className="space-y-2">
        {lineItems.map((item, index) => {
          const isExpanded = expandedItems.has(index);
          const hasDescription = item.description && item.description.trim().length > 0;

          return (
            <motion.div
              key={item.id || index}
              initial={showAnimations ? { opacity: 0, y: 20 } : false}
              animate={isVisible ? { opacity: 1, y: 0 } : false}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className="group"
            >
              <div
                className={`relative bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'border-[#F6B45A]/30' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Main Row */}
                <div
                  className={`p-4 ${hasDescription ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDescription && toggleItem(index)}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F6B45A]/10 flex items-center justify-center text-[#F6B45A]">
                          {getItemIcon(item.name, item.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{item.name}</p>
                          <p className="text-gray-500 text-xs">{item.type}</p>
                        </div>
                      </div>
                      {hasDescription && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="text-gray-500"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-gray-300 text-xs font-medium">
                          × {item.quantity}
                        </span>
                        <span className="text-gray-400">{formatCurrency(item.unitPrice)}</span>
                      </div>
                      <span className="text-white font-semibold text-mono-price">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                    <div className="col-span-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F6B45A]/10 flex items-center justify-center text-[#F6B45A] group-hover:bg-[#F6B45A]/20 transition-colors">
                        {getItemIcon(item.name, item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.name}</p>
                        {item.type && (
                          <p className="text-gray-500 text-xs truncate">{item.type}</p>
                        )}
                      </div>
                      {hasDescription && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="text-gray-500 ml-2"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-white/5 rounded-full text-gray-300 text-sm font-medium min-w-[40px]">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="col-span-2 text-right text-gray-400 text-mono-price">
                      {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-white font-semibold text-mono-price">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Description */}
                <AnimatePresence>
                  {isExpanded && hasDescription && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0">
                        <div className="pl-11 md:pl-[52px] border-l-2 border-[#F6B45A]/20 ml-1">
                          <p className="text-gray-400 text-sm leading-relaxed pl-4">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subtle hover glow */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: 'inset 0 0 30px rgba(246, 180, 90, 0.03)' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Totals Section */}
      <motion.div
        initial={showAnimations ? { opacity: 0, y: 20 } : false}
        animate={isVisible ? { opacity: 1, y: 0 } : false}
        transition={{ delay: lineItems.length * 0.08 + 0.2, duration: 0.3 }}
        className="mt-6 pt-6 border-t border-white/10"
      >
        <div className="space-y-3 max-w-xs ml-auto">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-gray-300 text-mono-price">
              {showAnimations ? (
                <AnimatedNumber value={subtotal} delay={lineItems.length * 80 + 300} />
              ) : (
                formatCurrency(subtotal)
              )}
            </span>
          </div>

          {/* Discount */}
          {discount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-400">Discount</span>
              <span className="text-emerald-400 text-mono-price">
                -{formatCurrency(discount)}
              </span>
            </div>
          )}

          {/* Tax */}
          {(taxRate > 0 || taxAmount > 0) && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 flex items-center gap-1.5">
                Tax
                {taxRate > 0 && (
                  <span className="text-xs text-gray-500">({taxRate}%)</span>
                )}
              </span>
              <span className="text-gray-300 text-mono-price">
                {formatCurrency(taxAmount)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="section-divider my-4" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold text-lg">Total</span>
            <motion.span
              className="text-2xl md:text-3xl font-bold text-white text-mono-price"
              initial={showAnimations ? { scale: 0.8, opacity: 0 } : false}
              animate={isVisible ? { scale: 1, opacity: 1 } : false}
              transition={{ delay: lineItems.length * 0.08 + 0.5, duration: 0.3, type: 'spring' }}
            >
              {showAnimations ? (
                <AnimatedNumber value={total} delay={lineItems.length * 80 + 500} />
              ) : (
                formatCurrency(total)
              )}
            </motion.span>
          </div>
        </div>
      </motion.div>

      {/* Info Note */}
      <motion.div
        initial={showAnimations ? { opacity: 0 } : false}
        animate={isVisible ? { opacity: 1 } : false}
        transition={{ delay: lineItems.length * 0.08 + 0.7, duration: 0.3 }}
        className="mt-4 flex items-start gap-2 text-xs text-gray-500"
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Click on any line item with additional details to expand and view more information about the included services or products.
        </p>
      </motion.div>
    </div>
  );
};

export default InteractivePricingTable;
