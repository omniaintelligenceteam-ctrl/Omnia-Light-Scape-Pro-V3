import type { BusinessGoal, GoalType, PeriodType } from '../../types';
import { formatISODateTime, getCurrentYear, getCurrentMonth, getCurrentQuarter } from './utils';

// Pre-defined business goals
interface DemoGoalData {
  goalType: GoalType;
  periodType: PeriodType;
  targetValue: number;
  year: number;
  month?: number;
  quarter?: number;
}

const currentYear = getCurrentYear();
const currentMonth = getCurrentMonth();
const currentQuarter = getCurrentQuarter();

const DEMO_GOALS_DATA: DemoGoalData[] = [
  // Monthly goals (current month)
  {
    goalType: 'revenue',
    periodType: 'monthly',
    targetValue: 45000,
    year: currentYear,
    month: currentMonth,
  },
  {
    goalType: 'projects_completed',
    periodType: 'monthly',
    targetValue: 8,
    year: currentYear,
    month: currentMonth,
  },
  {
    goalType: 'new_clients',
    periodType: 'monthly',
    targetValue: 6,
    year: currentYear,
    month: currentMonth,
  },

  // Quarterly goals (current quarter)
  {
    goalType: 'revenue',
    periodType: 'quarterly',
    targetValue: 125000,
    year: currentYear,
    quarter: currentQuarter,
  },
  {
    goalType: 'projects_completed',
    periodType: 'quarterly',
    targetValue: 22,
    year: currentYear,
    quarter: currentQuarter,
  },
  {
    goalType: 'new_clients',
    periodType: 'quarterly',
    targetValue: 15,
    year: currentYear,
    quarter: currentQuarter,
  },

  // Yearly goals
  {
    goalType: 'revenue',
    periodType: 'yearly',
    targetValue: 500000,
    year: currentYear,
  },
  {
    goalType: 'projects_completed',
    periodType: 'yearly',
    targetValue: 85,
    year: currentYear,
  },
  {
    goalType: 'new_clients',
    periodType: 'yearly',
    targetValue: 60,
    year: currentYear,
  },
];

export function generateDemoGoals(): BusinessGoal[] {
  const createdAt = formatISODateTime(new Date(currentYear, 0, 1)); // Start of year

  return DEMO_GOALS_DATA.map((goalData, index) => ({
    id: `demo_goal_${index + 1}`,
    goalType: goalData.goalType,
    periodType: goalData.periodType,
    targetValue: goalData.targetValue,
    year: goalData.year,
    month: goalData.month,
    quarter: goalData.quarter,
    createdAt,
    updatedAt: createdAt,
  }));
}

// Export goal IDs for reference
export const DEMO_GOAL_IDS = DEMO_GOALS_DATA.map((_, index) => `demo_goal_${index + 1}`);

export default generateDemoGoals;
