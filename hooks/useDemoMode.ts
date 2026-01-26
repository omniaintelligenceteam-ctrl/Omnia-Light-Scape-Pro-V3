import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';

const DEMO_MODE_KEY_PREFIX = 'omnia_demo_mode';

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

const getStoredState = (userId: string | null): DemoModeState => {
  if (!userId) return { isDismissed: false, dismissedAt: null };

  try {
    const key = `${DEMO_MODE_KEY_PREFIX}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading demo mode state:', e);
  }
  return { isDismissed: false, dismissedAt: null };
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
