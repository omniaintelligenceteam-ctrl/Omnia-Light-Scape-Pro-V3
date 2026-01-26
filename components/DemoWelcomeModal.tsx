import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, FileText, BarChart3, Square, Mail, Rocket } from 'lucide-react';

interface DemoWelcomeModalProps {
  isOpen: boolean;
  onGetStarted: () => void;
}

const SAMPLE_IMAGES = [
  '/samples/house1.jpg.webp',
  '/samples/house2.jpg.webp',
  '/samples/house3.jpg.webp',
];

const DemoWelcomeModal: React.FC<DemoWelcomeModalProps> = ({
  isOpen,
  onGetStarted,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Gradient glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F6B45A]/10 via-transparent to-purple-500/10 pointer-events-none" />

            {/* Content */}
            <div className="relative p-6 sm:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F6B45A]/20 to-amber-500/10 border border-[#F6B45A]/30 mb-4"
                >
                  <Sparkles className="w-8 h-8 text-[#F6B45A]" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to Omnia Light Scape!
                </h2>
                <p className="text-gray-400 text-sm">
                  Demo mode is active! We've preloaded sample data so you can explore the app.
                </p>
              </div>

              {/* What's preloaded */}
              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  What's preloaded
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-300">Sample house photos for AI mockups</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 text-green-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-300">Demo jobs with realistic data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-300">Analytics showing sample activity</span>
                  </div>
                </div>
              </div>

              {/* Sample images preview */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Sample photos ready to use
                </h3>
                <div className="flex gap-2">
                  {SAMPLE_IMAGES.map((src, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex-1 aspect-[4/3] rounded-lg overflow-hidden border border-white/10"
                    >
                      <img
                        src={src}
                        alt={`Sample house ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Checklist preview */}
              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Complete these to finish demo mode
                </h3>
                <div className="space-y-2">
                  {[
                    'Create your first AI mockup',
                    'View a demo project',
                    'Check out Analytics',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Get Started button */}
              <motion.button
                onClick={onGetStarted}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#F6B45A] to-amber-500 text-black font-semibold text-base hover:shadow-lg hover:shadow-amber-500/20 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket className="w-5 h-5" />
                Get Started
              </motion.button>

              {/* Support link */}
              <div className="mt-4 text-center">
                <a
                  href="mailto:omniaintelligenceteam@gmail.com"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  Need help? Email support
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoWelcomeModal;
