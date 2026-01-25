import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { FeatureTooltip } from '../hooks/useOnboarding';

interface TooltipGuideProps {
  tooltip: FeatureTooltip | null;
  onDismiss: () => void;
  onSkipAll: () => void;
}

interface Position {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

const TooltipGuide: React.FC<TooltipGuideProps> = ({ tooltip, onDismiss, onSkipAll }) => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate position relative to target element
  const calculatePosition = useCallback(() => {
    if (!tooltip) return null;

    const target = document.querySelector(tooltip.targetSelector);
    if (!target) return null;

    const targetRect = target.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const padding = 12;
    const arrowSize = 8;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = tooltip.position;

    // Calculate based on preferred position, with fallbacks
    switch (tooltip.position) {
      case 'bottom':
        top = targetRect.bottom + padding + arrowSize;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        arrowPosition = 'top';
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - padding - arrowSize;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        arrowPosition = 'bottom';
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.right + padding + arrowSize;
        arrowPosition = 'left';
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.left - tooltipWidth - padding - arrowSize;
        arrowPosition = 'right';
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) left = viewportWidth - tooltipWidth - padding;
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) top = viewportHeight - tooltipHeight - padding;

    return { top, left, arrowPosition };
  }, [tooltip]);

  // Update position when tooltip changes
  useEffect(() => {
    if (tooltip) {
      // Small delay to ensure target element is rendered
      const timer = setTimeout(() => {
        const pos = calculatePosition();
        setPosition(pos);
        if (pos) {
          setIsVisible(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setPosition(null);
    }
  }, [tooltip, calculatePosition]);

  // Handle click outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    // Delay adding listener to prevent immediate dismiss
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isVisible, onDismiss]);

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onDismiss]);

  // Recalculate on resize
  useEffect(() => {
    if (!tooltip) return;

    const handleResize = () => {
      const pos = calculatePosition();
      setPosition(pos);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tooltip, calculatePosition]);

  if (!tooltip || !position) return null;

  const arrowStyles: Record<string, string> = {
    top: 'left-1/2 -translate-x-1/2 -top-2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1a1a1a]',
    bottom: 'left-1/2 -translate-x-1/2 -bottom-2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1a1a1a]',
    left: 'top-1/2 -translate-y-1/2 -left-2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1a1a1a]',
    right: 'top-1/2 -translate-y-1/2 -right-2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1a1a1a]',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed z-[9999] w-[280px]"
          style={{ top: position.top, left: position.left }}
        >
          {/* Tooltip card */}
          <div className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header with close button */}
            <div className="flex items-start justify-between p-4 pb-2">
              <h3 className="text-sm font-semibold text-white pr-2">{tooltip.title}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="text-gray-500 hover:text-white transition-colors p-0.5 -mt-0.5 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="px-4 pb-3 text-xs text-gray-400 leading-relaxed">
              {tooltip.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 pb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkipAll();
                }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Don't show tips
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="px-3 py-1.5 bg-[#F6B45A] text-black text-xs font-medium rounded-lg hover:bg-[#ffc67a] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-8 ${arrowStyles[position.arrowPosition]}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TooltipGuide;
