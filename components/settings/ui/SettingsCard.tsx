import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 ${className}`}>
    {children}
  </div>
);

interface ExpandableCardProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  icon: Icon,
  title,
  description,
  isOpen,
  onToggle,
  children
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/10"
  >
    {/* Header - Tap target */}
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 text-left active:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-[#F6B45A] text-black shadow-[0_0_20px_rgba(246,180,90,0.3)]'
            : 'bg-white/5 text-gray-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`text-base font-semibold transition-colors ${isOpen ? 'text-white' : 'text-gray-200'}`}>
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className={`transition-colors ${isOpen ? 'text-[#F6B45A]' : 'text-gray-500'}`}
      >
        <ChevronDown className="w-5 h-5" />
      </motion.div>
    </button>

    {/* Content */}
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 pt-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
