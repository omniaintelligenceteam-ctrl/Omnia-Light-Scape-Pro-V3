import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';

const DEMO_MODE_KEY_PREFIX = 'omnia_demo_mode';

// Total number of demo steps (simplified checklist)
const TOTAL_DEMO_STEPS = 3;

interface DemoModeState {
  isDismissed: boolean;
  dismissedAt: string | null;
  // Welcome modal tracking
  hasSeenWelcome: boolean;
  // Checklist state (unified with DemoGuide)
  demoStep: number;
  demoCompletedSteps: number[];
}

interface UseDemoModeReturn {
  isDemoMode: boolean;
  isDemoDataDismissed: boolean;
  dismissDemoData: () => void;
  restoreDemoData: () => void;
  shouldInjectDemoData: (realDataCount: number) => boolean;
  // Welcome modal
  hasSeenWelcome: boolean;
  markWelcomeSeen: () => void;
  showWelcomeModal: boolean;
  // Checklist (DemoGuide) controls
  isDemoGuideActive: boolean;
  demoStep: number;
  demoCompletedSteps: number[];
  completeDemoStep: (stepId: number) => void;
  isChecklistComplete: boolean;
  finishDemoMode: () => void;
}

const getDefaultState = (): DemoModeState => ({
  isDismissed: false,
  dismissedAt: null,
  hasSeenWelcome: false,
  demoStep: 1,
  demoCompletedSteps: [],
});

const getStoredState = (userId: string | null): DemoModeState => {
  if (!userId) return getDefaultState();

  try {
    const key = `${DEMO_MODE_KEY_PREFIX}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      // Merge with defaults to handle missing fields from older versions
      return { ...getDefaultState(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading demo mode state:', e);
  }
  return getDefaultState();
};

const setStoredState = (userId: string | null, state: DemoModeState): void => {
  if (!userId) return;

  try {
    const key = `${DEMO_MODE_KEY_PREFIX}_${userId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving demo mode state:', e);
  }
};

export function useDemoMode(): UseDemoModeReturn {
  const { user } = useUser();
  const userId = user?.id || null;

  const [state, setState] = useState<DemoModeState>(() => getStoredState(userId));

  // Re-initialize state when user changes
  useEffect(() => {
    setState(getStoredState(userId));
  }, [userId]);

  // Sync state changes to localStorage
  useEffect(() => {
    setStoredState(userId, state);
  }, [userId, state]);

  // Mark welcome modal as seen
  const markWelcomeSeen = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSeenWelcome: true,
    }));
  }, []);

  // Dismiss demo mode completely
  const dismissDemoData = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDismissed: true,
      dismissedAt: new Date().toISOString(),
    }));
  }, []);

  // Restore demo data (for testing or settings)
  const restoreDemoData = useCallback(() => {
    setState(getDefaultState());
  }, []);

  // Determine if we should inject demo data based on real data count
  const shouldInjectDemoData = useCallback((realDataCount: number): boolean => {
    // Don't show demo data if user has dismissed it
    if (state.isDismissed) {
      return false;
    }
    // Don't show demo data if user has real data
    if (realDataCount > 0) {
      return false;
    }
    // Show demo data for new users with no data
    return true;
  }, [state.isDismissed]);

  // Compute overall demo mode status
  const isDemoMode = useMemo(() => {
    return !state.isDismissed;
  }, [state.isDismissed]);

  // Complete a demo checklist step (1, 2, or 3)
  const completeDemoStep = useCallback((stepId: number) => {
    setState(prev => {
      if (prev.demoCompletedSteps.includes(stepId)) return prev;
      const newCompleted = [...prev.demoCompletedSteps, stepId];
      const nextStep = [1, 2, 3].find(s => !newCompleted.includes(s)) || 3;

      return {
        ...prev,
        demoCompletedSteps: newCompleted,
        demoStep: nextStep,
      };
    });
  }, []);

  // Check if all 3 steps are complete
  const isChecklistComplete = useMemo(() => {
    return state.demoCompletedSteps.length >= TOTAL_DEMO_STEPS;
  }, [state.demoCompletedSteps]);

  // Finish demo mode (called when user clicks "Finish Demo Mode" button)
  const finishDemoMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDismissed: true,
      dismissedAt: new Date().toISOString(),
    }));
  }, []);

  // Check if checklist should be visible (seen welcome, not dismissed, and not all steps complete)
  const isDemoGuideActive = useMemo(() => {
    return state.hasSeenWelcome && !state.isDismissed;
  }, [state.hasSeenWelcome, state.isDismissed]);

  // Show welcome modal if demo mode is active and user hasn't seen welcome yet
  const showWelcomeModal = useMemo(() => {
    return !state.isDismissed && !state.hasSeenWelcome;
  }, [state.isDismissed, state.hasSeenWelcome]);

  return {
    isDemoMode,
    isDemoDataDismissed: state.isDismissed,
    dismissDemoData,
    restoreDemoData,
    shouldInjectDemoData,
    // Welcome modal
    hasSeenWelcome: state.hasSeenWelcome,
    markWelcomeSeen,
    showWelcomeModal,
    // Checklist (DemoGuide) controls
    isDemoGuideActive,
    demoStep: state.demoStep,
    demoCompletedSteps: state.demoCompletedSteps,
    completeDemoStep,
    isChecklistComplete,
    finishDemoMode,
  };
}

export default useDemoMode;
