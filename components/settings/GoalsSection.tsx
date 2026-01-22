import React, { useState, useEffect, useMemo } from 'react';
import { BusinessGoal, GoalProgress, GoalType, PeriodType } from '../../types';
import { SettingsCard } from './ui/SettingsCard';
import { ChipSelect } from './ui/SegmentedControl';
import { GoalTracker } from '../analytics/GoalTracker';

interface GoalsSectionProps {
  businessGoals: BusinessGoal[];
  onBusinessGoalChange: (goal: Omit<BusinessGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  currentMonth: { revenue: number; projects: number; clients: number };
  currentQuarter: { revenue: number; projects: number; clients: number };
  currentYear: { revenue: number; projects: number; clients: number };
}

type PeriodTabType = 'monthly' | 'quarterly' | 'yearly';

interface GoalCardProps {
  goalType: GoalType;
  label: string;
  targetValue: number;
  onTargetChange: (value: number) => void;
  onSave: () => void;
  goalProgress: GoalProgress | null;
  placeholder: string;
  prefix?: string;
  suffix?: string;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goalType,
  label,
  targetValue,
  onTargetChange,
  onSave,
  goalProgress,
  placeholder,
  prefix,
  suffix
}) => {
  return (
    <SettingsCard className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">{label}</h3>
          <p className="text-xs text-gray-500 mt-1">Set your target to track progress</p>
        </div>
        <button
          onClick={onSave}
          disabled={!targetValue}
          className="px-3 py-1.5 bg-[#F6B45A] hover:bg-[#ffc67a] disabled:bg-gray-700 disabled:text-gray-500 text-black rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {prefix && <span className="text-gray-400">{prefix}</span>}
        <input
          type="number"
          min={0}
          step={goalType === 'revenue' ? 1000 : 1}
          placeholder={placeholder}
          value={targetValue || ''}
          onChange={(e) => onTargetChange(parseInt(e.target.value) || 0)}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#F6B45A]/50 focus:outline-none"
        />
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>

      {goalProgress && (
        <div className="mt-4">
          <GoalTracker goalProgress={goalProgress} compact={true} />
        </div>
      )}

      {!goalProgress && targetValue > 0 && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 text-center">
          <p className="text-xs text-gray-500">Save to start tracking progress</p>
        </div>
      )}
    </SettingsCard>
  );
};

function calculateGoalProgress(
  goal: BusinessGoal | undefined,
  currentValue: number
): GoalProgress | null {
  if (!goal) return null;

  const progress = goal.targetValue > 0
    ? (currentValue / goal.targetValue) * 100
    : 0;

  const now = new Date();
  let endDate: Date;

  if (goal.periodType === 'monthly') {
    endDate = new Date(goal.year, goal.month!, 0); // Last day of month
  } else if (goal.periodType === 'quarterly') {
    const quarterEndMonth = (goal.quarter! * 3);
    endDate = new Date(goal.year, quarterEndMonth, 0);
  } else {
    endDate = new Date(goal.year, 11, 31); // Dec 31
  }

  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // On track calculation: progress should be >= time elapsed %
  const totalDays = goal.periodType === 'monthly' ? 30 : goal.periodType === 'quarterly' ? 90 : 365;
  const daysElapsed = totalDays - daysRemaining;
  const expectedProgress = (daysElapsed / totalDays) * 100;
  const onTrack = progress >= expectedProgress * 0.8; // 80% of expected is "on track"

  return {
    goal,
    currentValue,
    progress: Math.round(progress),
    daysRemaining,
    onTrack
  };
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  businessGoals,
  onBusinessGoalChange,
  currentMonth,
  currentQuarter,
  currentYear
}) => {
  const [periodTab, setPeriodTab] = useState<PeriodTabType>('monthly');
  const [draftGoals, setDraftGoals] = useState({
    monthly: { revenue: 0, projects: 0, clients: 0 },
    quarterly: { revenue: 0, projects: 0, clients: 0 },
    yearly: { revenue: 0, projects: 0, clients: 0 }
  });

  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentQuarterNum = Math.floor((currentDate.getMonth()) / 3) + 1;
  const currentYearNum = currentDate.getFullYear();

  // Load existing goals into draft state
  useEffect(() => {
    const monthlyRevenue = businessGoals.find(
      g => g.goalType === 'revenue' && g.periodType === 'monthly' &&
           g.year === currentYearNum && g.month === currentMonthNum
    );
    const monthlyProjects = businessGoals.find(
      g => g.goalType === 'projects_completed' && g.periodType === 'monthly' &&
           g.year === currentYearNum && g.month === currentMonthNum
    );
    const monthlyClients = businessGoals.find(
      g => g.goalType === 'new_clients' && g.periodType === 'monthly' &&
           g.year === currentYearNum && g.month === currentMonthNum
    );

    const quarterlyRevenue = businessGoals.find(
      g => g.goalType === 'revenue' && g.periodType === 'quarterly' &&
           g.year === currentYearNum && g.quarter === currentQuarterNum
    );
    const quarterlyProjects = businessGoals.find(
      g => g.goalType === 'projects_completed' && g.periodType === 'quarterly' &&
           g.year === currentYearNum && g.quarter === currentQuarterNum
    );
    const quarterlyClients = businessGoals.find(
      g => g.goalType === 'new_clients' && g.periodType === 'quarterly' &&
           g.year === currentYearNum && g.quarter === currentQuarterNum
    );

    const yearlyRevenue = businessGoals.find(
      g => g.goalType === 'revenue' && g.periodType === 'yearly' && g.year === currentYearNum
    );
    const yearlyProjects = businessGoals.find(
      g => g.goalType === 'projects_completed' && g.periodType === 'yearly' && g.year === currentYearNum
    );
    const yearlyClients = businessGoals.find(
      g => g.goalType === 'new_clients' && g.periodType === 'yearly' && g.year === currentYearNum
    );

    setDraftGoals({
      monthly: {
        revenue: monthlyRevenue?.targetValue || 0,
        projects: monthlyProjects?.targetValue || 0,
        clients: monthlyClients?.targetValue || 0
      },
      quarterly: {
        revenue: quarterlyRevenue?.targetValue || 0,
        projects: quarterlyProjects?.targetValue || 0,
        clients: quarterlyClients?.targetValue || 0
      },
      yearly: {
        revenue: yearlyRevenue?.targetValue || 0,
        projects: yearlyProjects?.targetValue || 0,
        clients: yearlyClients?.targetValue || 0
      }
    });
  }, [businessGoals, currentYearNum, currentMonthNum, currentQuarterNum]);

  // Find saved goals
  const savedMonthlyRevenue = businessGoals.find(
    g => g.goalType === 'revenue' && g.periodType === 'monthly' &&
         g.year === currentYearNum && g.month === currentMonthNum
  );
  const savedMonthlyProjects = businessGoals.find(
    g => g.goalType === 'projects_completed' && g.periodType === 'monthly' &&
         g.year === currentYearNum && g.month === currentMonthNum
  );
  const savedMonthlyClients = businessGoals.find(
    g => g.goalType === 'new_clients' && g.periodType === 'monthly' &&
         g.year === currentYearNum && g.month === currentMonthNum
  );

  const savedQuarterlyRevenue = businessGoals.find(
    g => g.goalType === 'revenue' && g.periodType === 'quarterly' &&
         g.year === currentYearNum && g.quarter === currentQuarterNum
  );
  const savedQuarterlyProjects = businessGoals.find(
    g => g.goalType === 'projects_completed' && g.periodType === 'quarterly' &&
         g.year === currentYearNum && g.quarter === currentQuarterNum
  );
  const savedQuarterlyClients = businessGoals.find(
    g => g.goalType === 'new_clients' && g.periodType === 'quarterly' &&
         g.year === currentYearNum && g.quarter === currentQuarterNum
  );

  const savedYearlyRevenue = businessGoals.find(
    g => g.goalType === 'revenue' && g.periodType === 'yearly' && g.year === currentYearNum
  );
  const savedYearlyProjects = businessGoals.find(
    g => g.goalType === 'projects_completed' && g.periodType === 'yearly' && g.year === currentYearNum
  );
  const savedYearlyClients = businessGoals.find(
    g => g.goalType === 'new_clients' && g.periodType === 'yearly' && g.year === currentYearNum
  );

  // Calculate progress for saved goals
  const monthlyRevenueProgress = useMemo(
    () => calculateGoalProgress(savedMonthlyRevenue, currentMonth.revenue),
    [savedMonthlyRevenue, currentMonth.revenue]
  );
  const monthlyProjectsProgress = useMemo(
    () => calculateGoalProgress(savedMonthlyProjects, currentMonth.projects),
    [savedMonthlyProjects, currentMonth.projects]
  );
  const monthlyClientsProgress = useMemo(
    () => calculateGoalProgress(savedMonthlyClients, currentMonth.clients),
    [savedMonthlyClients, currentMonth.clients]
  );

  const quarterlyRevenueProgress = useMemo(
    () => calculateGoalProgress(savedQuarterlyRevenue, currentQuarter.revenue),
    [savedQuarterlyRevenue, currentQuarter.revenue]
  );
  const quarterlyProjectsProgress = useMemo(
    () => calculateGoalProgress(savedQuarterlyProjects, currentQuarter.projects),
    [savedQuarterlyProjects, currentQuarter.projects]
  );
  const quarterlyClientsProgress = useMemo(
    () => calculateGoalProgress(savedQuarterlyClients, currentQuarter.clients),
    [savedQuarterlyClients, currentQuarter.clients]
  );

  const yearlyRevenueProgress = useMemo(
    () => calculateGoalProgress(savedYearlyRevenue, currentYear.revenue),
    [savedYearlyRevenue, currentYear.revenue]
  );
  const yearlyProjectsProgress = useMemo(
    () => calculateGoalProgress(savedYearlyProjects, currentYear.projects),
    [savedYearlyProjects, currentYear.projects]
  );
  const yearlyClientsProgress = useMemo(
    () => calculateGoalProgress(savedYearlyClients, currentYear.clients),
    [savedYearlyClients, currentYear.clients]
  );

  const handleSave = (goalType: GoalType, periodType: PeriodType) => {
    const targetValue = draftGoals[periodType][
      goalType === 'revenue' ? 'revenue' : goalType === 'projects_completed' ? 'projects' : 'clients'
    ];

    if (!targetValue) return;

    const goalData: Omit<BusinessGoal, 'id' | 'createdAt' | 'updatedAt'> = {
      goalType,
      periodType,
      targetValue,
      year: currentYearNum,
      ...(periodType === 'monthly' && { month: currentMonthNum }),
      ...(periodType === 'quarterly' && { quarter: currentQuarterNum })
    };

    onBusinessGoalChange(goalData);
  };

  const periodOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <ChipSelect
        options={periodOptions}
        value={periodTab}
        onChange={(value) => setPeriodTab(value as PeriodTabType)}
      />

      {/* Monthly Goals */}
      {periodTab === 'monthly' && (
        <div className="space-y-4">
          <GoalCard
            goalType="revenue"
            label="Revenue Goal"
            targetValue={draftGoals.monthly.revenue}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              monthly: { ...prev.monthly, revenue: value }
            }))}
            onSave={() => handleSave('revenue', 'monthly')}
            goalProgress={monthlyRevenueProgress}
            placeholder="15000"
            prefix="$"
            suffix="per month"
          />

          <GoalCard
            goalType="projects_completed"
            label="Projects Completed"
            targetValue={draftGoals.monthly.projects}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              monthly: { ...prev.monthly, projects: value }
            }))}
            onSave={() => handleSave('projects_completed', 'monthly')}
            goalProgress={monthlyProjectsProgress}
            placeholder="10"
            suffix="projects per month"
          />

          <GoalCard
            goalType="new_clients"
            label="New Clients"
            targetValue={draftGoals.monthly.clients}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              monthly: { ...prev.monthly, clients: value }
            }))}
            onSave={() => handleSave('new_clients', 'monthly')}
            goalProgress={monthlyClientsProgress}
            placeholder="5"
            suffix="new clients per month"
          />
        </div>
      )}

      {/* Quarterly Goals */}
      {periodTab === 'quarterly' && (
        <div className="space-y-4">
          <GoalCard
            goalType="revenue"
            label="Revenue Goal"
            targetValue={draftGoals.quarterly.revenue}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              quarterly: { ...prev.quarterly, revenue: value }
            }))}
            onSave={() => handleSave('revenue', 'quarterly')}
            goalProgress={quarterlyRevenueProgress}
            placeholder="45000"
            prefix="$"
            suffix={`Q${currentQuarterNum} ${currentYearNum}`}
          />

          <GoalCard
            goalType="projects_completed"
            label="Projects Completed"
            targetValue={draftGoals.quarterly.projects}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              quarterly: { ...prev.quarterly, projects: value }
            }))}
            onSave={() => handleSave('projects_completed', 'quarterly')}
            goalProgress={quarterlyProjectsProgress}
            placeholder="30"
            suffix={`projects Q${currentQuarterNum}`}
          />

          <GoalCard
            goalType="new_clients"
            label="New Clients"
            targetValue={draftGoals.quarterly.clients}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              quarterly: { ...prev.quarterly, clients: value }
            }))}
            onSave={() => handleSave('new_clients', 'quarterly')}
            goalProgress={quarterlyClientsProgress}
            placeholder="15"
            suffix={`clients Q${currentQuarterNum}`}
          />
        </div>
      )}

      {/* Yearly Goals */}
      {periodTab === 'yearly' && (
        <div className="space-y-4">
          <GoalCard
            goalType="revenue"
            label="Revenue Goal"
            targetValue={draftGoals.yearly.revenue}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              yearly: { ...prev.yearly, revenue: value }
            }))}
            onSave={() => handleSave('revenue', 'yearly')}
            goalProgress={yearlyRevenueProgress}
            placeholder="180000"
            prefix="$"
            suffix={`for ${currentYearNum}`}
          />

          <GoalCard
            goalType="projects_completed"
            label="Projects Completed"
            targetValue={draftGoals.yearly.projects}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              yearly: { ...prev.yearly, projects: value }
            }))}
            onSave={() => handleSave('projects_completed', 'yearly')}
            goalProgress={yearlyProjectsProgress}
            placeholder="120"
            suffix={`projects in ${currentYearNum}`}
          />

          <GoalCard
            goalType="new_clients"
            label="New Clients"
            targetValue={draftGoals.yearly.clients}
            onTargetChange={(value) => setDraftGoals(prev => ({
              ...prev,
              yearly: { ...prev.yearly, clients: value }
            }))}
            onSave={() => handleSave('new_clients', 'yearly')}
            goalProgress={yearlyClientsProgress}
            placeholder="60"
            suffix={`clients in ${currentYearNum}`}
          />
        </div>
      )}
    </div>
  );
};
