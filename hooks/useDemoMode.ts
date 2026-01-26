import { useState, useEffect, useCallback, useMemo } from 'react';

const DEMO_MODE_KEY = 'omnia_demo_mode';

interface DemoModeState {
  isDismissed: boolean;
  dismissedAt: string | null;
}

interface UseDemoModeReturn {
  isDemoMode: boolean;
  isDemoDataDismissed: boolean;
  dismissDemoData: () => void;
  restoreDemoData: () => void;
  shouldInjectDemoData: (realDataCount: number) => boolean;
}

const getStoredState = (): DemoModeState => {
  try {
    const stored = localStorage.getItem(DEMO_MODE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading demo mode state:', e);
  }
  return { isDismissed: false, dismissedAt: null };
};

const setStoredState = (state: DemoModeState): void => {
  try {
    localStorage.setItem(DEMO_MODE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving demo mode state:', e);
  }
};

export function useDemoMode(): UseDemoModeReturn {
  const [state, setState] = useState<DemoModeState>(getStoredState);

  // Sync state changes to localStorage
  useEffect(() => {
    setStoredState(state);
  }, [state]);

  const dismissDemoData = useCallback(() => {
    setState({
      isDismissed: true,
      dismissedAt: new Date().toISOString(),
    });
  }, []);

  const restoreDemoData = useCallback(() => {
    setState({
      isDismissed: false,
      dismissedAt: null,
    });
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

  return {
    isDemoMode,
    isDemoDataDismissed: state.isDismissed,
    dismissDemoData,
    restoreDemoData,
    shouldInjectDemoData,
  };
}

export default useDemoMode;
