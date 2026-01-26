import React from 'react';
import { motion } from 'framer-motion';
import { Eye, PenTool, CreditCard, Check } from 'lucide-react';

type StepStatus = 'complete' | 'current' | 'upcoming';

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
  status: StepStatus;
}

interface QuoteProgressStepperProps {
  hasSignature: boolean;
  termsAccepted: boolean;
  isApproved: boolean;
}

export const QuoteProgressStepper: React.FC<QuoteProgressStepperProps> = ({
  hasSignature,
  termsAccepted,
  isApproved
}) => {
  // Determine step statuses based on current progress
  const getSteps = (): Step[] => {
    if (isApproved) {
      return [
        { id: 1, label: 'Review', icon: Eye, status: 'complete' },
        { id: 2, label: 'Sign', icon: PenTool, status: 'complete' },
        { id: 3, label: 'Approved', icon: Check, status: 'complete' },
      ];
    }

    const reviewComplete = true; // Always complete since they're viewing
    const signComplete = hasSignature && termsAccepted;

    return [
      { id: 1, label: 'Review', icon: Eye, status: reviewComplete ? 'complete' : 'current' },
      { id: 2, label: 'Sign', icon: PenTool, status: signComplete ? 'complete' : (reviewComplete ? 'current' : 'upcoming') },
      { id: 3, label: 'Approve', icon: CreditCard, status: signComplete ? 'current' : 'upcoming' },
    ];
  };

  const steps = getSteps();

  const getStepStyles = (status: StepStatus) => {
    switch (status) {
      case 'complete':
        return {
          circle: 'bg-[#F6B45A] border-[#F6B45A]',
          icon: 'text-black',
          label: 'text-[#F6B45A]',
          line: 'bg-[#F6B45A]'
        };
      case 'current':
        return {
          circle: 'bg-[#F6B45A]/20 border-[#F6B45A]',
          icon: 'text-[#F6B45A]',
          label: 'text-white',
          line: 'bg-white/10'
        };
      case 'upcoming':
        return {
          circle: 'bg-white/5 border-white/20',
          icon: 'text-gray-500',
          label: 'text-gray-500',
          line: 'bg-white/10'
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center justify-center gap-0 md:gap-2 mb-8"
    >
      {steps.map((step, index) => {
        const styles = getStepStyles(step.status);
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + index * 0.1, type: 'spring', stiffness: 200 }}
                className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all ${styles.circle}`}
              >
                {step.status === 'complete' ? (
                  <Check className={`w-4 h-4 md:w-5 md:h-5 ${styles.icon}`} />
                ) : (
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${styles.icon}`} />
                )}

                {/* Pulse animation for current step */}
                {step.status === 'current' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-[#F6B45A]"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </motion.div>

              {/* Step Label */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className={`mt-2 text-xs md:text-sm font-medium ${styles.label}`}
              >
                {step.label}
              </motion.span>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className="flex-1 h-0.5 mx-2 md:mx-4 mt-[-20px] md:mt-[-24px] max-w-[60px] md:max-w-[80px]">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2 + index * 0.15, duration: 0.3 }}
                  className={`h-full origin-left ${
                    step.status === 'complete' ? 'bg-[#F6B45A]' : 'bg-white/10'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </motion.div>
  );
};

export default QuoteProgressStepper;
