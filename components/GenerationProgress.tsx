import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lightbulb, Palette, CheckCircle2, X, Loader2 } from 'lucide-react';

interface GenerationProgressProps {
  isVisible: boolean;
  onCancel?: () => void;
  showCelebration?: boolean;
}

interface Stage {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number; // Expected duration in seconds
}

const STAGES: Stage[] = [
  { id: 'analyzing', label: 'Analyzing your image', icon: Loader2, duration: 3 },
  { id: 'designing', label: 'Designing lighting placement', icon: Lightbulb, duration: 8 },
  { id: 'rendering', label: 'Rendering night scene', icon: Sparkles, duration: 20 },
  { id: 'enhancing', label: 'Enhancing final details', icon: Palette, duration: 5 },
];

const AVERAGE_GENERATION_TIME = 35; // Average time in seconds based on typical generation

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  isVisible,
  onCancel,
  showCelebration = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Reset state when generation starts
  useEffect(() => {
    if (isVisible && !showCelebration) {
      setElapsedTime(0);
      setCurrentStageIndex(0);
    }
  }, [isVisible, showCelebration]);

  // Timer for elapsed time
  useEffect(() => {
    if (!isVisible || showCelebration) return;

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, showCelebration]);

  // Progress through stages based on elapsed time
  useEffect(() => {
    if (!isVisible || showCelebration) return;

    let accumulatedTime = 0;
    for (let i = 0; i < STAGES.length; i++) {
      accumulatedTime += STAGES[i].duration;
      if (elapsedTime < accumulatedTime) {
        setCurrentStageIndex(i);
        return;
      }
    }
    // Stay on last stage if we've exceeded all durations
    setCurrentStageIndex(STAGES.length - 1);
  }, [elapsedTime, isVisible, showCelebration]);

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (showCelebration) return 100;
    // Use a logarithmic curve that slows down as it approaches 95%
    // Never show 100% until celebration
    const rawProgress = Math.min((elapsedTime / AVERAGE_GENERATION_TIME) * 100, 95);
    return Math.round(rawProgress);
  }, [elapsedTime, showCelebration]);

  // Calculate estimated time remaining
  const estimatedRemaining = useMemo(() => {
    const remaining = Math.max(0, AVERAGE_GENERATION_TIME - elapsedTime);
    if (remaining <= 0) return 'Almost done...';
    if (remaining === 1) return '~1 second';
    if (remaining < 60) return `~${remaining} seconds`;
    return `~${Math.ceil(remaining / 60)} min`;
  }, [elapsedTime]);

  // Format elapsed time
  const formattedElapsed = useMemo(() => {
    const mins = Math.floor(elapsedTime / 60);
    const secs = elapsedTime % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  }, [elapsedTime]);

  const currentStage = STAGES[currentStageIndex];
  const StageIcon = currentStage?.icon || Sparkles;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        aria-label="Generating lighting design"
        className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-white p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Celebration State */}
        {showCelebration ? (
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 10 }}
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <motion.p
              className="text-xl font-bold text-white"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Design Complete!
            </motion.p>
            <motion.p
              className="text-sm text-gray-400 mt-2"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Your lighting design is ready
            </motion.p>
          </motion.div>
        ) : (
          <>
            {/* Main Progress Content */}
            <div className="w-full max-w-sm space-y-8">
              {/* Animated Icon */}
              <div className="flex justify-center">
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-20 h-20 rounded-full border-2 border-[#F6B45A]/20 border-t-[#F6B45A] animate-spin" />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  >
                    <StageIcon className="w-8 h-8 text-[#F6B45A]" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Current Stage */}
              <div className="text-center">
                <motion.p
                  key={currentStage.id}
                  className="text-lg font-semibold text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {currentStage.label}
                </motion.p>
                <p className="text-sm text-gray-500 mt-1">
                  {estimatedRemaining}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#F6B45A] to-[#ffc67a] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{formattedElapsed} elapsed</span>
                  <span className="text-[#F6B45A] font-medium">{progressPercent}%</span>
                </div>
              </div>

              {/* Stage Indicators */}
              <div className="flex justify-between items-center px-2">
                {STAGES.map((stage, index) => {
                  const isComplete = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const Icon = stage.icon;

                  return (
                    <div
                      key={stage.id}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isComplete
                            ? 'bg-emerald-500/20'
                            : isCurrent
                            ? 'bg-[#F6B45A]/20'
                            : 'bg-white/5'
                        }`}
                        animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Icon
                            className={`w-4 h-4 ${
                              isCurrent ? 'text-[#F6B45A]' : 'text-gray-600'
                            }`}
                          />
                        )}
                      </motion.div>
                      <span
                        className={`text-[9px] text-center max-w-[60px] ${
                          isComplete
                            ? 'text-emerald-500'
                            : isCurrent
                            ? 'text-[#F6B45A]'
                            : 'text-gray-600'
                        }`}
                      >
                        {stage.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cancel Button */}
            {onCancel && (
              <motion.button
                onClick={onCancel}
                className="mt-8 flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <X className="w-4 h-4" />
                Cancel
              </motion.button>
            )}

            {/* Tips */}
            <motion.p
              className="absolute bottom-8 text-xs text-gray-600 text-center max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              Tip: The more specific your fixture selections, the more accurate your design
            </motion.p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default GenerationProgress;
