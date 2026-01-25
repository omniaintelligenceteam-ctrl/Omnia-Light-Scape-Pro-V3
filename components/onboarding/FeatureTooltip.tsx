import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, SkipForward } from 'lucide-react';
import { FeatureTooltip as TooltipType } from '../../hooks/useOnboarding';

interface FeatureTooltipProps {
  tooltip: TooltipType | null;
  currentIndex: number;
  totalCount: number;
  isVisible: boolean;
  onNext: () => void;
  onSkipAll: () => void;
  onClose: () => void;
}

interface Position {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
  tooltip,
  currentIndex,
  totalCount,
  isVisible,
  onNext,
  onSkipAll,
  onClose,
}) => {
  const [position, setPosition] = useState<Position>({});
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Calculate tooltip position based on target element
  const calculatePosition = useCallback(() => {
    if (!tooltip) return;

    const targetEl = document.querySelector(tooltip.targetSelector);
    if (!targetEl) {
      // Element not found - try again shortly
      setTimeout(calculatePosition, 100);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    setTargetRect(rect);

    const TOOLTIP_WIDTH = 280;
    const TOOLTIP_HEIGHT = 160;
    const OFFSET = 12;
    const PADDING = 16;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPosition: Position = {};
    let newArrowPos: 'top' | 'bottom' | 'left' | 'right' = tooltip.position;

    switch (tooltip.position) {
      case 'bottom':
        newPosition = {
          top: rect.bottom + OFFSET,
          left: Math.max(PADDING, Math.min(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, viewportWidth - TOOLTIP_WIDTH - PADDING)),
        };
        // Check if it goes off bottom
        if (rect.bottom + OFFSET + TOOLTIP_HEIGHT > viewportHeight) {
          newPosition = { bottom: viewportHeight - rect.top + OFFSET, left: newPosition.left };
          newArrowPos = 'bottom';
        } else {
          newArrowPos = 'top';
        }
        break;

      case 'top':
        newPosition = {
          bottom: viewportHeight - rect.top + OFFSET,
          left: Math.max(PADDING, Math.min(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, viewportWidth - TOOLTIP_WIDTH - PADDING)),
        };
        newArrowPos = 'bottom';
        break;

      case 'left':
        newPosition = {
          top: Math.max(PADDING, rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2),
          right: viewportWidth - rect.left + OFFSET,
        };
        newArrowPos = 'right';
        break;

      case 'right':
        newPosition = {
          top: Math.max(PADDING, rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2),
          left: rect.right + OFFSET,
        };
        newArrowPos = 'left';
        break;
    }

    setPosition(newPosition);
    setArrowPosition(newArrowPos);
  }, [tooltip]);

  // Recalculate on tooltip change or window resize
  useEffect(() => {
    if (!isVisible || !tooltip) return;

    calculatePosition();

    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isVisible, tooltip, calculatePosition]);

  // Arrow styles based on position
  const getArrowStyles = () => {
    const base = 'absolute w-0 h-0';
    switch (arrowPosition) {
      case 'top':
        return `${base} -top-2 left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-[#1a1a1a]`;
      case 'bottom':
        return `${base} -bottom-2 left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#1a1a1a]`;
      case 'left':
        return `${base} top-1/2 -translate-y-1/2 -left-2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-[#1a1a1a]`;
      case 'right':
        return `${base} top-1/2 -translate-y-1/2 -right-2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-[#1a1a1a]`;
      default:
        return base;
    }
  };

  if (!tooltip) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Spotlight overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{
              background: targetRect
                ? `radial-gradient(ellipse ${Math.max(targetRect.width + 40, 100)}px ${Math.max(targetRect.height + 40, 60)}px at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 0%, rgba(0,0,0,0.85) 100%)`
                : 'rgba(0,0,0,0.85)',
            }}
          />

          {/* Click blocker with target hole */}
          <div
            className="fixed inset-0 z-[99]"
            onClick={(e) => {
              // Allow clicks on target element
              if (targetRect) {
                const { clientX, clientY } = e;
                if (
                  clientX >= targetRect.left &&
                  clientX <= targetRect.right &&
                  clientY >= targetRect.top &&
                  clientY <= targetRect.bottom
                ) {
                  onNext();
                  return;
                }
              }
              e.stopPropagation();
            }}
          />

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed z-[101] w-72"
            style={position}
          >
            <div className="relative bg-[#1a1a1a] border border-[#F6B45A]/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Arrow */}
              <div className={getArrowStyles()} />

              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#F6B45A]/5 to-transparent pointer-events-none" />

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-bold text-white">{tooltip.title}</h4>
                  <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors shrink-0"
                    aria-label="Close tooltip"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{tooltip.description}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i === currentIndex ? 'bg-[#F6B45A]' : i < currentIndex ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onSkipAll}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-3 h-3" />
                    Skip
                  </button>
                  <button
                    onClick={onNext}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F6B45A] hover:bg-[#ffc67a] text-black text-xs font-medium rounded-lg transition-colors"
                  >
                    {currentIndex < totalCount - 1 ? 'Next' : 'Done'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeatureTooltip;
