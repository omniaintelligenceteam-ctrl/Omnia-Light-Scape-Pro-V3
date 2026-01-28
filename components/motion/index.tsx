import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Animation configuration tokens
export const springConfig = {
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
  bouncy: { type: "spring" as const, stiffness: 500, damping: 25 },
};

export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
};

// Fade In Animation
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = durations.normal,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Slide Up Animation
interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const SlideUp: React.FC<SlideUpProps> = ({
  children,
  delay = 0,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ ...springConfig.snappy, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Scale In Animation (for modals/cards)
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  delay = 0,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ ...springConfig.snappy, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger Container for sequential children animations
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.1,
  className = '',
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
    initial="hidden"
    animate="show"
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <motion.div variants={itemVariants} className={className}>
    {children}
  </motion.div>
);

// Page Transition Wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10 }}
    transition={{ duration: durations.normal }}
    className={className}
  >
    {children}
  </motion.div>
);

// Tab Content Wrapper with AnimatePresence
interface TabContentProps {
  children: React.ReactNode;
  tabKey: string;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  children,
  tabKey,
  className = '',
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: durations.fast }}
      className={className}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

// Hover Card Animation (for interactive cards)
interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const HoverCard: React.FC<HoverCardProps> = ({
  children,
  className = '',
  onClick,
}) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.98 }}
    className={className}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

// Pulse Animation (for attention-grabbing elements)
interface PulseProps {
  children: React.ReactNode;
  className?: string;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  className = '',
}) => (
  <motion.div
    animate={{
      scale: [1, 1.02, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Skeleton Loading Animation
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
}) => (
  <div
    className={`shimmer bg-white/5 rounded ${className}`}
    style={{ width, height }}
  />
);

// Empty State with floating icon animation
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  iconColorClass?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  iconColorClass = 'bg-[#F6B45A]/10',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`flex flex-col items-center justify-center py-16 ${className}`}
  >
    {/* Floating icon with glow */}
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      className={`w-16 h-16 rounded-full ${iconColorClass} flex items-center justify-center mb-4 animate-empty-glow-pulse`}
    >
      {icon}
    </motion.div>

    {/* Title */}
    <motion.h3
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="text-lg font-semibold text-gray-300 mb-2"
    >
      {title}
    </motion.h3>

    {/* Description */}
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-sm text-gray-500 text-center max-w-xs"
    >
      {description}
    </motion.p>

    {/* Optional action button */}
    {action && (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={action.onClick}
        className="mt-4 px-4 py-2 bg-[#F6B45A] text-black font-medium rounded-lg hover:bg-[#ffc67a] transition-colors"
      >
        {action.label}
      </motion.button>
    )}
  </motion.div>
);

// Animated Table Row for staggered table animations
interface AnimatedTableRowProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

export const AnimatedTableRow: React.FC<AnimatedTableRowProps> = ({
  children,
  index,
  className = '',
}) => (
  <motion.tr
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ delay: index * 0.05, ...springConfig.snappy }}
    className={className}
  >
    {children}
  </motion.tr>
);

// Animated List Item for mobile views
interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  index,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ delay: index * 0.05, ...springConfig.snappy }}
    className={className}
  >
    {children}
  </motion.div>
);

// Export AnimatePresence for convenience
export { AnimatePresence } from 'framer-motion';
