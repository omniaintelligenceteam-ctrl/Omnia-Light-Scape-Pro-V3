import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, LogOut, Eye } from 'lucide-react';

interface DemoModeBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onEndDemo?: () => void;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  isVisible,
  onDismiss,
  onEndDemo,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border-b border-amber-500/30 backdrop-blur-sm"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Demo indicator */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </motion.div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Demo Mode
                  </span>
                  <span className="text-xs sm:text-sm text-amber-200/80 hidden sm:inline">
                    You're viewing sample data. Create your first project to get started!
                  </span>
                  <span className="text-xs text-amber-200/80 sm:hidden">
                    Sample data shown
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {onEndDemo && (
                  <motion.button
                    onClick={onEndDemo}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    End Demo
                  </motion.button>
                )}
                <motion.button
                  onClick={onDismiss}
                  className="flex items-center justify-center w-7 h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Dismiss demo banner"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoModeBanner;
