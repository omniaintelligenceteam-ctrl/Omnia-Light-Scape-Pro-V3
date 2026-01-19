import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FREE_TRIAL_LIMIT = 25;

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  generationCount: number;
  freeTrialLimit: number;
  remainingFreeGenerations: number;
  canGenerate: boolean;
  plan: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    generationCount: 0,
    freeTrialLimit: FREE_TRIAL_LIMIT,
    remainingFreeGenerations: FREE_TRIAL_LIMIT,
    canGenerate: true,
    plan: null,
    isLoading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        canGenerate: true, // Allow anonymous users to try
        remainingFreeGenerations: FREE_TRIAL_LIMIT,
      }));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/usage/status?userId=${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data = await response.json();
      setStatus({
        hasActiveSubscription: data.hasActiveSubscription,
        generationCount: data.generationCount,
        freeTrialLimit: data.freeTrialLimit,
        remainingFreeGenerations: data.remainingFreeGenerations,
        canGenerate: data.canGenerate,
        plan: data.plan,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded) {
      fetchStatus();
    }
  }, [isLoaded, fetchStatus]);

  const incrementUsage = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/api/usage/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(prev => ({
          ...prev,
          generationCount: data.generationCount,
          remainingFreeGenerations: data.remainingFreeGenerations,
          canGenerate: data.hasActiveSubscription || data.remainingFreeGenerations > 0,
        }));
      }
    } catch (err) {
      console.error('Failed to increment usage:', err);
    }
  }, [user]);

  const checkCanGenerate = useCallback(async (): Promise<{ canGenerate: boolean; reason?: string }> => {
    if (!user) {
      return { canGenerate: true }; // Allow anonymous to try (will prompt sign-in)
    }

    try {
      const response = await fetch(`${API_URL}/api/usage/can-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          canGenerate: false,
          reason: data.reason || 'UNKNOWN',
        };
      }

      return { canGenerate: true };
    } catch (err) {
      console.error('Failed to check generation status:', err);
      return { canGenerate: true }; // Allow on error, backend will catch
    }
  }, [user]);

  return {
    ...status,
    refresh: fetchStatus,
    incrementUsage,
    checkCanGenerate,
  };
}
