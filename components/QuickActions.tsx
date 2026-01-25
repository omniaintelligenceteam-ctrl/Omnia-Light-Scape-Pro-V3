import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Calendar,
  Camera,
  Send,
  Users,
  Zap,
} from 'lucide-react';

export type QuickActionType =
  | 'new-project'
  | 'quick-quote'
  | 'schedule-today'
  | 'upload-photo'
  | 'send-quote'
  | 'add-client';

export interface QuickAction {
  id: QuickActionType;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface QuickActionsProps {
  currentView: string;
  onAction: (actionId: QuickActionType) => void;
  disabled?: boolean;
}

// All available actions
const ALL_ACTIONS: QuickAction[] = [
  {
    id: 'new-project',
    label: 'New Project',
    icon: Plus,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  {
    id: 'quick-quote',
    label: 'Quick Quote',
    icon: Zap,
    color: 'text-[#F6B45A]',
    bgColor: 'bg-[#F6B45A]/20',
  },
  {
    id: 'schedule-today',
    label: 'Schedule Today',
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    id: 'upload-photo',
    label: 'Upload Photo',
    icon: Camera,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    id: 'send-quote',
    label: 'Send Quote',
    icon: Send,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  {
    id: 'add-client',
    label: 'Add Client',
    icon: Users,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
];

// Context-aware actions based on current view
const getContextActions = (view: string): QuickActionType[] => {
  switch (view) {
    case 'dashboard':
    case 'home':
      return ['new-project', 'quick-quote', 'schedule-today'];
    case 'projects':
    case 'pipeline':
      return ['new-project', 'upload-photo', 'quick-quote'];
    case 'schedule':
    case 'calendar':
      return ['schedule-today', 'new-project', 'add-client'];
    case 'clients':
      return ['add-client', 'new-project', 'send-quote'];
    case 'quotes':
      return ['quick-quote', 'send-quote', 'new-project'];
    case 'editor':
    case 'design':
      return ['upload-photo', 'quick-quote', 'send-quote'];
    default:
      return ['new-project', 'quick-quote', 'schedule-today'];
  }
};

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[] = 10) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const QuickActions: React.FC<QuickActionsProps> = ({
  currentView,
  onAction,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get context-aware actions
  const contextActionIds = getContextActions(currentView);
  const contextActions = contextActionIds
    .map(id => ALL_ACTIONS.find(a => a.id === id))
    .filter((a): a is QuickAction => a !== undefined);

  // Toggle menu
  const toggleMenu = useCallback(() => {
    triggerHaptic(isOpen ? 5 : 15);
    setIsOpen(prev => !prev);
  }, [isOpen]);

  // Handle action click
  const handleAction = useCallback((actionId: QuickActionType) => {
    triggerHaptic([10, 50, 10]);
    setIsOpen(false);
    onAction(actionId);
  }, [onAction]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close when clicking outside
  const handleBackdropClick = useCallback(() => {
    triggerHaptic(5);
    setIsOpen(false);
  }, []);

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action buttons */}
        <AnimatePresence>
          {isOpen && contextActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: {
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }
                }}
                exit={{
                  opacity: 0,
                  scale: 0.3,
                  y: 20,
                  transition: { delay: (contextActions.length - index - 1) * 0.03 }
                }}
                className="flex items-center gap-3"
              >
                {/* Label */}
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 + 0.1 } }}
                  className="px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm font-medium text-white shadow-lg whitespace-nowrap"
                >
                  {action.label}
                </motion.span>

                {/* Action button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleAction(action.id)}
                  className={`w-12 h-12 rounded-full ${action.bgColor} border border-white/10 shadow-lg flex items-center justify-center transition-colors hover:border-white/20`}
                  aria-label={action.label}
                >
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={toggleMenu}
          disabled={disabled}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors ${
            isOpen
              ? 'bg-white/10 border border-white/20'
              : 'bg-[#F6B45A] hover:bg-[#ffc67a]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-black" />
          )}
        </motion.button>
      </div>

      {/* Keyboard shortcut hint (desktop only, shown briefly) */}
      {!isMobile && (
        <div className="fixed bottom-4 right-4 z-30 px-3 py-1.5 bg-black/80 rounded-lg text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">+</kbd> for quick actions
        </div>
      )}
    </>
  );
};

// Mini FAB variant for inline use
export const QuickActionsMini: React.FC<{
  actions: QuickActionType[];
  onAction: (actionId: QuickActionType) => void;
  size?: 'sm' | 'md';
}> = ({ actions, onAction, size = 'md' }) => {
  const filteredActions = actions
    .map(id => ALL_ACTIONS.find(a => a.id === id))
    .filter((a): a is QuickAction => a !== undefined);

  return (
    <div className="flex items-center gap-2">
      {filteredActions.map((action) => {
        const Icon = action.icon;
        const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
        const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

        return (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              triggerHaptic(10);
              onAction(action.id);
            }}
            className={`${sizeClasses} rounded-full ${action.bgColor} border border-white/10 flex items-center justify-center transition-colors hover:border-white/20`}
            title={action.label}
            aria-label={action.label}
          >
            <Icon className={`${iconSize} ${action.color}`} />
          </motion.button>
        );
      })}
    </div>
  );
};

export default QuickActions;
