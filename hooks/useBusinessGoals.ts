import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { BusinessGoal, GoalType, PeriodType } from '../types';
import { useDemoMode } from './useDemoMode';
import { generateDemoGoals } from './useDemoData';

export function useBusinessGoals() {
  const { user } = useUser();
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { shouldInjectDemoData, dismissDemoData } = useDemoMode();

  // Load goals from API
  useEffect(() => {
    async function loadGoals() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/goals?userId=${user.id}`);

        if (!response.ok) {
          throw new Error('Failed to load goals');
        }

        const data = await response.json();

        if (data.success && data.data) {
          const loadedGoals: BusinessGoal[] = data.data.map((g: any) => ({
            id: g.id,
            goalType: g.goal_type as GoalType,
            periodType: g.period_type as PeriodType,
            targetValue: Number(g.target_value),
            year: g.year,
            month: g.month || undefined,
            quarter: g.quarter || undefined,
            createdAt: g.created_at,
            updatedAt: g.updated_at
          }));
          setGoals(loadedGoals);
        }
      } catch (err: any) {
        console.error('Error loading goals:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadGoals();
  }, [user]);

  // Create a new goal
  const createGoal = useCallback(async (
    goalData: Omit<BusinessGoal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BusinessGoal | null> => {
    if (!user) {
      setError('User not logged in');
      return null;
    }

    try {
      const response = await fetch(`/api/goals?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_type: goalData.goalType,
          period_type: goalData.periodType,
          target_value: goalData.targetValue,
          year: goalData.year,
          month: goalData.month,
          quarter: goalData.quarter
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create goal');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const newGoal: BusinessGoal = {
          id: data.data.id,
          goalType: data.data.goal_type as GoalType,
          periodType: data.data.period_type as PeriodType,
          targetValue: Number(data.data.target_value),
          year: data.data.year,
          month: data.data.month || undefined,
          quarter: data.data.quarter || undefined,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        setGoals(prev => [...prev, newGoal]);
        return newGoal;
      }

      return null;
    } catch (err: any) {
      console.error('Error creating goal:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Update an existing goal
  const updateGoal = useCallback(async (
    goalId: string,
    updates: Partial<Omit<BusinessGoal, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const response = await fetch(`/api/goals/${goalId}?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_type: updates.goalType,
          period_type: updates.periodType,
          target_value: updates.targetValue,
          year: updates.year,
          month: updates.month,
          quarter: updates.quarter
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      ));

      return true;
    } catch (err: any) {
      console.error('Error updating goal:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Delete a goal
  const deleteGoal = useCallback(async (goalId: string): Promise<boolean> => {
    if (!user) {
      setError('User not logged in');
      return false;
    }

    try {
      const response = await fetch(`/api/goals/${goalId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      setGoals(prev => prev.filter(g => g.id !== goalId));
      return true;
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      setError(err.message);
      return false;
    }
  }, [user]);

  // Determine if we should show demo data
  const isDemo = useMemo(() => {
    return !isLoading && shouldInjectDemoData(goals.length);
  }, [isLoading, goals.length, shouldInjectDemoData]);

  // Get effective goals (real or demo)
  const effectiveGoals = useMemo(() => {
    if (isDemo) {
      return generateDemoGoals();
    }
    return goals;
  }, [isDemo, goals]);

  // Get goal for a specific period
  const getGoalForPeriod = useCallback((
    goalType: GoalType,
    periodType: PeriodType,
    year: number,
    month?: number,
    quarter?: number
  ): BusinessGoal | undefined => {
    return effectiveGoals.find(g =>
      g.goalType === goalType &&
      g.periodType === periodType &&
      g.year === year &&
      (periodType !== 'monthly' || g.month === month) &&
      (periodType !== 'quarterly' || g.quarter === quarter)
    );
  }, [effectiveGoals]);

  // Get current month's goal
  const getCurrentMonthGoal = useCallback((goalType: GoalType): BusinessGoal | undefined => {
    const now = new Date();
    return getGoalForPeriod(goalType, 'monthly', now.getFullYear(), now.getMonth() + 1);
  }, [getGoalForPeriod]);

  // Get current year's goal
  const getCurrentYearGoal = useCallback((goalType: GoalType): BusinessGoal | undefined => {
    const now = new Date();
    return getGoalForPeriod(goalType, 'yearly', now.getFullYear());
  }, [getGoalForPeriod]);

  // Wrapped create that dismisses demo mode
  const createGoalWithDemoCheck = useCallback(async (
    goalData: Omit<BusinessGoal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BusinessGoal | null> => {
    if (isDemo) {
      dismissDemoData();
    }
    return createGoal(goalData);
  }, [createGoal, isDemo, dismissDemoData]);

  return {
    goals: effectiveGoals,
    isLoading,
    error,
    isDemo,
    createGoal: createGoalWithDemoCheck,
    updateGoal,
    deleteGoal,
    getGoalForPeriod,
    getCurrentMonthGoal,
    getCurrentYearGoal,
    setGoals
  };
}
