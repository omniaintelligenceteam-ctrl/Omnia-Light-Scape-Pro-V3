import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';

export interface DemoStep {
  id: number;
  title: string;
  description: string;
}

export const DEMO_STEPS: DemoStep[] = [
  { id: 1, title: 'Upload a Photo', description: 'Drop a property image' },
  { id: 2, title: 'Select Fixtures', description: 'Choose lighting types' },
  { id: 3, title: 'Generate Design', description: 'Create AI preview' },
  { id: 4, title: 'View Projects', description: 'See your pipeline' },
  { id: 5, title: 'Check Schedule', description: 'Manage appointments' },
  { id: 6, title: 'Explore Settings', description: 'Configure your account' },
];

interface DemoGuideProps {
  currentStep: number;
  completedSteps: number[];
  onSkip: () => void;
  isVisible: boolean;
}

const DemoGuide: React.FC<DemoGuideProps> = ({
  currentStep,
  completedSteps,
  onSkip,
  isVisible,
}) => {
  const allCompleted = completedSteps.length >= DEMO_STEPS.length;

  return (
    <AnimatePresence>
      {isVisible && !allCompleted && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-[100] w-56"
        >
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F6B45A]" />
                <span className="text-sm font-semibold text-white">Getting Started</span>
              </div>
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-white transition-colors p-1 -mr-1"
                title="Skip tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="p-3 space-y-1">
              {DEMO_STEPS.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep && !isCompleted;

                return (
                  <motion.div
                    key={step.id}
                    initial={false}
                    animate={{
                      backgroundColor: isCurrent ? 'rgba(246, 180, 90, 0.1)' : 'transparent',
                    }}
                    className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isCurrent ? 'ring-1 ring-[#F6B45A]/30' : ''
                    }`}
                  >
                    {/* Step indicator */}
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-400'
                          : isCurrent
                          ? 'bg-[#F6B45A] text-black'
                          : 'bg-white/10 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        step.id
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium transition-colors ${
                          isCompleted
                            ? 'text-gray-500 line-through'
                            : isCurrent
                            ? 'text-white'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </p>
                      {isCurrent && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-gray-500 mt-0.5"
                        >
                          {step.description}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={onSkip}
                className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
              >
                Skip Tutorial
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoGuide;
