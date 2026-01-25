import { useState, useEffect, useCallback, useMemo } from 'react';

// Onboarding step definitions
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: 'welcome' | 'setup' | 'pricing' | 'walkthrough' | 'complete';
  isOptional?: boolean;
}

// User's onboarding progress
export interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: string;
  completedAt?: string;
  companySetup: {
    name?: string;
    logo?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  pricingConfigured: boolean;
  firstProjectCreated: boolean;
  tooltipsCompleted: string[];
  hasSeenWelcome: boolean;
}

// Feature tooltip definition
export interface FeatureTooltip {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  order: number;
}

const STORAGE_KEY = 'omnia_onboarding_progress';

// Default onboarding steps
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Omnia Light Scape',
    description: 'Create stunning lighting designs and professional quotes in minutes',
    category: 'welcome',
  },
  {
    id: 'company-setup',
    title: 'Set Up Your Company',
    description: 'Add your company details for professional quotes and invoices',
    category: 'setup',
  },
  {
    id: 'pricing-config',
    title: 'Configure Your Pricing',
    description: 'Set your fixture prices and labor rates',
    category: 'pricing',
    isOptional: true,
  },
  {
    id: 'first-project',
    title: 'Create Your First Project',
    description: 'Upload a photo and generate your first AI lighting design',
    category: 'walkthrough',
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'Start creating beautiful lighting designs for your clients',
    category: 'complete',
  },
];

// Feature tooltips for guided tour
export const FEATURE_TOOLTIPS: FeatureTooltip[] = [
  {
    id: 'upload-photo',
    targetSelector: '[data-tour="upload"]',
    title: 'Upload a Photo',
    description: 'Start by uploading a daytime photo of the property',
    position: 'bottom',
    order: 1,
  },
  {
    id: 'generate-design',
    targetSelector: '[data-tour="generate"]',
    title: 'Generate AI Design',
    description: 'Click to generate a stunning nighttime lighting visualization',
    position: 'left',
    order: 2,
  },
  {
    id: 'create-quote',
    targetSelector: '[data-tour="quote"]',
    title: 'Create Quote',
    description: 'Generate a professional quote with itemized pricing',
    position: 'left',
    order: 3,
  },
  {
    id: 'send-quote',
    targetSelector: '[data-tour="send"]',
    title: 'Send to Client',
    description: 'Email or text the quote directly to your client',
    position: 'bottom',
    order: 4,
  },
];

// Default progress state
const getDefaultProgress = (): OnboardingProgress => ({
  currentStep: 0,
  completedSteps: [],
  skippedSteps: [],
  startedAt: new Date().toISOString(),
  companySetup: {},
  pricingConfigured: false,
  firstProjectCreated: false,
  tooltipsCompleted: [],
  hasSeenWelcome: false,
});

// Load progress from localStorage
const loadProgress = (): OnboardingProgress | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid stored data
  }
  return null;
};

// Save progress to localStorage
const saveProgress = (progress: OnboardingProgress) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage quota exceeded or unavailable
  }
};

export interface UseOnboardingOptions {
  autoStart?: boolean;
}

export const useOnboarding = (options: UseOnboardingOptions = {}) => {
  const { autoStart = true } = options;

  const [progress, setProgress] = useState<OnboardingProgress>(() => {
    const loaded = loadProgress();
    return loaded || getDefaultProgress();
  });

  const [showWizard, setShowWizard] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const [currentTooltipIndex, setCurrentTooltipIndex] = useState(0);

  // Check if onboarding is complete
  const isOnboardingComplete = useMemo(() => {
    return progress.completedAt !== undefined;
  }, [progress.completedAt]);

  // Check if this is a new user
  const isNewUser = useMemo(() => {
    return !progress.hasSeenWelcome && !isOnboardingComplete;
  }, [progress.hasSeenWelcome, isOnboardingComplete]);

  // Current step data
  const currentStep = useMemo(() => {
    return ONBOARDING_STEPS[progress.currentStep] || ONBOARDING_STEPS[0];
  }, [progress.currentStep]);

  // Progress percentage
  const progressPercent = useMemo(() => {
    const total = ONBOARDING_STEPS.length;
    const completed = progress.completedSteps.length + progress.skippedSteps.length;
    return Math.round((completed / total) * 100);
  }, [progress.completedSteps, progress.skippedSteps]);

  // Active tooltips (not yet completed)
  const activeTooltips = useMemo(() => {
    return FEATURE_TOOLTIPS.filter(t => !progress.tooltipsCompleted.includes(t.id))
      .sort((a, b) => a.order - b.order);
  }, [progress.tooltipsCompleted]);

  // Current tooltip
  const currentTooltip = useMemo(() => {
    return activeTooltips[currentTooltipIndex] || null;
  }, [activeTooltips, currentTooltipIndex]);

  // Save progress whenever it changes
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Auto-start wizard for new users
  useEffect(() => {
    if (autoStart && isNewUser) {
      setShowWizard(true);
    }
  }, [autoStart, isNewUser]);

  // Mark step as completed
  const completeStep = useCallback((stepId: string) => {
    setProgress(prev => {
      if (prev.completedSteps.includes(stepId)) return prev;

      const newCompleted = [...prev.completedSteps, stepId];
      const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
      const nextStep = Math.min(currentIndex + 1, ONBOARDING_STEPS.length - 1);

      return {
        ...prev,
        completedSteps: newCompleted,
        currentStep: nextStep,
      };
    });
  }, []);

  // Skip step
  const skipStep = useCallback((stepId: string) => {
    setProgress(prev => {
      if (prev.skippedSteps.includes(stepId)) return prev;

      const newSkipped = [...prev.skippedSteps, stepId];
      const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
      const nextStep = Math.min(currentIndex + 1, ONBOARDING_STEPS.length - 1);

      return {
        ...prev,
        skippedSteps: newSkipped,
        currentStep: nextStep,
      };
    });
  }, []);

  // Go to specific step
  const goToStep = useCallback((stepIndex: number) => {
    setProgress(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(stepIndex, ONBOARDING_STEPS.length - 1)),
    }));
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      completedAt: new Date().toISOString(),
    }));
    setShowWizard(false);
  }, []);

  // Skip entire onboarding
  const skipOnboarding = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      hasSeenWelcome: true,
      skippedSteps: ONBOARDING_STEPS.map(s => s.id),
      completedAt: new Date().toISOString(),
    }));
    setShowWizard(false);
  }, []);

  // Mark welcome as seen
  const markWelcomeSeen = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      hasSeenWelcome: true,
    }));
  }, []);

  // Update company setup
  const updateCompanySetup = useCallback((data: Partial<OnboardingProgress['companySetup']>) => {
    setProgress(prev => ({
      ...prev,
      companySetup: { ...prev.companySetup, ...data },
    }));
  }, []);

  // Mark pricing as configured
  const markPricingConfigured = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      pricingConfigured: true,
    }));
  }, []);

  // Mark first project as created
  const markFirstProjectCreated = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      firstProjectCreated: true,
    }));
  }, []);

  // Complete tooltip
  const completeTooltip = useCallback((tooltipId: string) => {
    setProgress(prev => {
      if (prev.tooltipsCompleted.includes(tooltipId)) return prev;
      return {
        ...prev,
        tooltipsCompleted: [...prev.tooltipsCompleted, tooltipId],
      };
    });
  }, []);

  // Skip all tooltips
  const skipAllTooltips = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      tooltipsCompleted: FEATURE_TOOLTIPS.map(t => t.id),
    }));
    setShowTooltips(false);
  }, []);

  // Next tooltip
  const nextTooltip = useCallback(() => {
    if (currentTooltip) {
      completeTooltip(currentTooltip.id);
    }
    if (currentTooltipIndex < activeTooltips.length - 1) {
      setCurrentTooltipIndex(prev => prev + 1);
    } else {
      setShowTooltips(false);
    }
  }, [currentTooltip, currentTooltipIndex, activeTooltips.length, completeTooltip]);

  // Start tooltips tour
  const startTooltipsTour = useCallback(() => {
    setCurrentTooltipIndex(0);
    setShowTooltips(true);
  }, []);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(() => {
    const fresh = getDefaultProgress();
    setProgress(fresh);
    saveProgress(fresh);
    setShowWizard(true);
    setCurrentTooltipIndex(0);
  }, []);

  return {
    // State
    progress,
    showWizard,
    showTooltips,
    isOnboardingComplete,
    isNewUser,
    currentStep,
    progressPercent,
    currentTooltip,
    activeTooltips,

    // Wizard controls
    setShowWizard,
    completeStep,
    skipStep,
    goToStep,
    completeOnboarding,
    skipOnboarding,
    markWelcomeSeen,

    // Data updates
    updateCompanySetup,
    markPricingConfigured,
    markFirstProjectCreated,

    // Tooltip controls
    setShowTooltips,
    completeTooltip,
    skipAllTooltips,
    nextTooltip,
    startTooltipsTour,

    // Utility
    resetOnboarding,
    steps: ONBOARDING_STEPS,
    tooltips: FEATURE_TOOLTIPS,
  };
};

export default useOnboarding;
