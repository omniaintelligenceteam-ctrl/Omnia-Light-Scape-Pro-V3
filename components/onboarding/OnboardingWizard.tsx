import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Building2,
  DollarSign,
  Camera,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  SkipForward,
} from 'lucide-react';
import { OnboardingStep, OnboardingProgress, ONBOARDING_STEPS } from '../../hooks/useOnboarding';
import { Button } from '../Button';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  progress: OnboardingProgress;
  currentStep: OnboardingStep;
  onCompleteStep: (stepId: string) => void;
  onSkipStep: (stepId: string) => void;
  onGoToStep: (index: number) => void;
  onComplete: () => void;
  onSkipAll: () => void;
  onUpdateCompany: (data: Partial<OnboardingProgress['companySetup']>) => void;
  onStartFirstProject?: () => void;
}

// Welcome Step Content
const WelcomeStep: React.FC<{ onContinue: () => void }> = ({ onContinue }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="text-center space-y-6"
  >
    <motion.div
      className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#F6B45A] to-[#d4902a] flex items-center justify-center shadow-xl shadow-[#F6B45A]/20"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Lightbulb className="w-12 h-12 text-black" />
    </motion.div>

    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to Omnia Light Scape</h2>
      <p className="text-gray-400 max-w-md mx-auto">
        The AI-powered platform that helps landscape lighting professionals create stunning designs and close more deals.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
      {[
        { icon: Camera, label: 'Upload Photo', desc: 'Any daytime image' },
        { icon: Sparkles, label: 'AI Generation', desc: 'Instant night render' },
        { icon: DollarSign, label: 'Send Quote', desc: 'Professional pricing' },
      ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <item.icon className="w-6 h-6 text-[#F6B45A] mx-auto mb-2" />
          <p className="text-sm font-medium text-white">{item.label}</p>
          <p className="text-xs text-gray-500">{item.desc}</p>
        </motion.div>
      ))}
    </div>

    <Button onClick={onContinue} size="lg" className="mt-6">
      Get Started
      <ArrowRight className="w-5 h-5" />
    </Button>
  </motion.div>
);

// Company Setup Step
const CompanySetupStep: React.FC<{
  companySetup: OnboardingProgress['companySetup'];
  onUpdate: (data: Partial<OnboardingProgress['companySetup']>) => void;
  onContinue: () => void;
  onSkip: () => void;
}> = ({ companySetup, onUpdate, onContinue, onSkip }) => {
  const [localData, setLocalData] = useState(companySetup);

  const handleChange = (field: keyof typeof companySetup, value: string) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    onUpdate({ [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Set Up Your Company</h2>
        <p className="text-sm text-gray-400">This info will appear on your quotes and invoices</p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name</label>
          <input
            type="text"
            value={localData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Your Lighting Company"
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={localData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input
            type="email"
            value={localData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contact@yourcompany.com"
            className="w-full px-4 py-3 bg-[#0f0f0f] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Skip for now
        </button>
        <Button onClick={onContinue}>
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Pricing Config Step (simplified)
const PricingConfigStep: React.FC<{
  onContinue: () => void;
  onSkip: () => void;
}> = ({ onContinue, onSkip }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6 text-center"
  >
    <div>
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
        <DollarSign className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Configure Pricing</h2>
      <p className="text-sm text-gray-400">Set up your default fixture prices and labor rates</p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-md mx-auto">
      <p className="text-sm text-gray-400 mb-4">
        You can configure detailed pricing in Settings. For now, we'll use industry-standard defaults.
      </p>
      <div className="space-y-2 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Path Lights</span>
          <span className="text-white font-medium">$85 - $150</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Uplights</span>
          <span className="text-white font-medium">$95 - $175</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Installation Labor</span>
          <span className="text-white font-medium">$75 - $125/hr</span>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={onSkip}
        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Use defaults
      </button>
      <Button onClick={onContinue}>
        Configure in Settings
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  </motion.div>
);

// First Project Step
const FirstProjectStep: React.FC<{
  onStartProject: () => void;
  onSkip: () => void;
}> = ({ onStartProject, onSkip }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6 text-center"
  >
    <div>
      <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
        <Camera className="w-8 h-8 text-purple-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Create Your First Project</h2>
      <p className="text-sm text-gray-400">Experience the magic of AI-powered lighting design</p>
    </div>

    <div className="bg-gradient-to-br from-[#F6B45A]/10 to-purple-500/10 border border-[#F6B45A]/20 rounded-xl p-6 max-w-md mx-auto">
      <div className="space-y-4">
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-[#F6B45A]/20 flex items-center justify-center shrink-0">
            <span className="text-[#F6B45A] font-bold text-sm">1</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Upload any daytime photo</p>
            <p className="text-xs text-gray-500">Front of home, backyard, garden area</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-[#F6B45A]/20 flex items-center justify-center shrink-0">
            <span className="text-[#F6B45A] font-bold text-sm">2</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Select lighting fixtures</p>
            <p className="text-xs text-gray-500">Choose from our extensive library</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-[#F6B45A]/20 flex items-center justify-center shrink-0">
            <span className="text-[#F6B45A] font-bold text-sm">3</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Generate & share</p>
            <p className="text-xs text-gray-500">AI creates a stunning night render + quote</p>
          </div>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={onSkip}
        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Explore first
      </button>
      <Button onClick={onStartProject}>
        <Camera className="w-4 h-4" />
        Create First Project
      </Button>
    </div>
  </motion.div>
);

// Complete Step
const CompleteStep: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="text-center space-y-6"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 15, delay: 0.1 }}
      className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center"
    >
      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
    </motion.div>

    <div>
      <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
      <p className="text-gray-400 max-w-md mx-auto">
        Start creating stunning lighting designs and impress your clients with professional quotes.
      </p>
    </div>

    <div className="pt-4">
      <Button onClick={onFinish} size="lg">
        Start Designing
        <Sparkles className="w-5 h-5" />
      </Button>
    </div>

    <p className="text-xs text-gray-600">
      Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400">?</kbd> anytime to see keyboard shortcuts
    </p>
  </motion.div>
);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  progress,
  currentStep,
  onCompleteStep,
  onSkipStep,
  onGoToStep,
  onComplete,
  onSkipAll,
  onUpdateCompany,
  onStartFirstProject,
}) => {
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStep.id);

  const handleContinue = useCallback(() => {
    onCompleteStep(currentStep.id);
  }, [currentStep.id, onCompleteStep]);

  const handleSkip = useCallback(() => {
    onSkipStep(currentStep.id);
  }, [currentStep.id, onSkipStep]);

  const handleStartProject = useCallback(() => {
    onCompleteStep(currentStep.id);
    onComplete();
    onStartFirstProject?.();
  }, [currentStep.id, onCompleteStep, onComplete, onStartFirstProject]);

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep onContinue={handleContinue} />;
      case 'company-setup':
        return (
          <CompanySetupStep
            companySetup={progress.companySetup}
            onUpdate={onUpdateCompany}
            onContinue={handleContinue}
            onSkip={handleSkip}
          />
        );
      case 'pricing-config':
        return <PricingConfigStep onContinue={handleContinue} onSkip={handleSkip} />;
      case 'first-project':
        return <FirstProjectStep onStartProject={handleStartProject} onSkip={handleContinue} />;
      case 'complete':
        return <CompleteStep onFinish={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-xl overflow-hidden"
          >
            <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl h-full sm:h-auto max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                {/* Progress dots */}
                <div className="flex items-center gap-2">
                  {ONBOARDING_STEPS.map((step, i) => (
                    <button
                      key={step.id}
                      onClick={() => onGoToStep(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentIndex
                          ? 'w-6 bg-[#F6B45A]'
                          : i < currentIndex || progress.completedSteps.includes(step.id)
                          ? 'bg-emerald-500'
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                      aria-label={`Go to step ${i + 1}: ${step.title}`}
                    />
                  ))}
                </div>

                {/* Skip/Close */}
                <div className="flex items-center gap-2">
                  {currentStep.id !== 'complete' && (
                    <button
                      onClick={onSkipAll}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      <SkipForward className="w-3 h-3" />
                      Skip all
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  <div key={currentStep.id}>
                    {renderStepContent()}
                  </div>
                </AnimatePresence>
              </div>

              {/* Footer with navigation (except welcome/complete) */}
              {currentStep.id !== 'welcome' && currentStep.id !== 'complete' && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                  <button
                    onClick={() => onGoToStep(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <span className="text-xs text-gray-600">
                    Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OnboardingWizard;
