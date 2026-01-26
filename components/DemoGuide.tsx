import React from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Check, X, GripVertical } from 'lucide-react';

export interface DemoStep {
  id: number;
  title: string;
  note?: string;
}

export const DEMO_STEPS: DemoStep[] = [
  { id: 1, title: 'Upload a Daytime Photo' },
  { id: 2, title: 'Select Fixtures and Quantities' },
  { id: 3, title: 'Generate Design' },
  { id: 4, title: 'Save & Generate Quote' },
  { id: 5, title: 'Email Quote for Approval', note: 'Demo to your email' },
  { id: 6, title: 'Approve Quote' },
  { id: 7, title: 'Schedule Quote' },
  { id: 8, title: 'Invoice Job' },
  { id: 9, title: 'Explore and Set Up Settings' },
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
  const dragControls = useDragControls();
  const allCompleted = completedSteps.length >= DEMO_STEPS.length;
  const progress = (completedSteps.length / DEMO_STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && !allCompleted && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          initial={{ opacity: 0, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed left-4 top-24 z-[100] w-72 select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Glassmorphism container */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
            {/* Gradient glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F6B45A]/5 via-transparent to-purple-500/5 pointer-events-none" />

            {/* Header with drag handle */}
            <motion.div
              onPointerDown={(e) => dragControls.start(e)}
              className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-white">Getting Started</span>
              </div>
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-white transition-colors p-1 -mr-1 rounded-lg hover:bg-white/10"
                title="Skip tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Progress bar */}
            <div className="px-4 py-2 border-b border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Progress</span>
                <span className="text-xs text-gray-400">{completedSteps.length}/{DEMO_STEPS.length}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="h-full bg-gradient-to-r from-[#F6B45A] to-amber-400 rounded-full"
                />
              </div>
            </div>

            {/* Steps list */}
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {DEMO_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep && !isCompleted;
                const isPending = !isCompleted && !isCurrent;

                return (
                  <motion.div
                    key={step.id}
                    initial={false}
                    animate={{
                      backgroundColor: isCurrent ? 'rgba(246, 180, 90, 0.1)' : 'transparent',
                    }}
                    className={`relative flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all ${
                      isCurrent ? 'ring-1 ring-[#F6B45A]/30' : ''
                    }`}
                  >
                    {/* Step number/check indicator */}
                    <div
                      className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                          : isCurrent
                          ? 'bg-gradient-to-br from-[#F6B45A] to-amber-500 text-black shadow-lg shadow-amber-500/20'
                          : 'bg-white/5 text-gray-600 ring-1 ring-white/10'
                      }`}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </motion.div>
                      ) : (
                        step.id
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p
                        className={`text-sm leading-tight transition-colors ${
                          isCompleted
                            ? 'text-gray-500 line-through decoration-gray-600'
                            : isCurrent
                            ? 'text-white font-medium'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.note && (
                        <p className={`text-[10px] mt-0.5 ${isCurrent ? 'text-amber-400/70' : 'text-gray-600'}`}>
                          {step.note}
                        </p>
                      )}
                    </div>

                    {/* Connecting line to next step */}
                    {index < DEMO_STEPS.length - 1 && (
                      <div
                        className={`absolute left-[22px] top-8 w-0.5 h-4 rounded-full transition-colors ${
                          isCompleted ? 'bg-green-500/30' : 'bg-white/5'
                        }`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5">
              <button
                onClick={onSkip}
                className="w-full text-xs text-gray-500 hover:text-white transition-colors py-1.5 rounded-lg hover:bg-white/5"
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
