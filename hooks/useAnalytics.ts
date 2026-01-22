import { useMemo } from 'react';
import {
  SavedProject,
  Client,
  BusinessGoal,
  DailyMetrics,
  WeeklyMetrics,
  MonthlyMetrics,
  YearlyMetrics,
  GoalProgress
} from '../types';

// Helper functions
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.toDateString() === d2.toDateString();
}

function isInWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = getEndOfWeek(weekStart);
  return date >= weekStart && date <= weekEnd;
}

function isInMonth(date: Date, month: number, year: number): boolean {
  return date.getMonth() === month && date.getFullYear() === year;
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getDaysRemaining(month: number, year: number): number {
  const today = new Date();
  if (today.getMonth() === month && today.getFullYear() === year) {
    return getDaysInMonth(month, year) - today.getDate();
  }
  // If we're past this month, 0 days remaining
  if (today.getFullYear() > year || (today.getFullYear() === year && today.getMonth() > month)) {
    return 0;
  }
  // If we haven't reached this month yet, return full month
  return getDaysInMonth(month, year);
}

function getDaysRemainingInYear(year: number): number {
  const today = new Date();
  if (today.getFullYear() === year) {
    const endOfYear = new Date(year, 11, 31);
    return Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (today.getFullYear() > year) return 0;
  return 365;
}

// Get revenue from a project (paid invoices only)
function getProjectRevenue(project: SavedProject): number {
  if (!project.invoicePaidAt) return 0;
  return project.quote?.total || 0;
}

// Get quote value from a project (regardless of payment)
function getQuoteValue(project: SavedProject): number {
  return project.quote?.total || 0;
}

interface UseAnalyticsProps {
  projects: SavedProject[];
  clients: Client[];
  goals: BusinessGoal[];
}

interface AnalyticsResult {
  // Daily metrics
  getDailyMetrics: (date: Date) => DailyMetrics;
  todayMetrics: DailyMetrics;

  // Weekly metrics
  getWeeklyMetrics: (weekStart: Date) => WeeklyMetrics;
  thisWeekMetrics: WeeklyMetrics;

  // Monthly metrics
  getMonthlyMetrics: (month: number, year: number) => MonthlyMetrics;
  thisMonthMetrics: MonthlyMetrics;

  // Yearly metrics
  getYearlyMetrics: (year: number) => YearlyMetrics;
  thisYearMetrics: YearlyMetrics;

  // Goal progress
  getGoalProgress: (goal: BusinessGoal) => GoalProgress;
  currentGoalsProgress: GoalProgress[];

  // Quick stats
  revenueThisMonth: number;
  revenueThisYear: number;
  pendingRevenue: number;
  overdueCount: number;
  conversionRate: number;
  avgProjectValue: number;
}

export function useAnalytics({ projects, clients, goals }: UseAnalyticsProps): AnalyticsResult {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Daily metrics calculator
  const getDailyMetrics = useMemo(() => {
    return (date: Date): DailyMetrics => {
      const dateStr = date.toISOString().split('T')[0];

      // Scheduled jobs for this day
      const scheduledJobs = projects.filter(p =>
        p.schedule?.scheduledDate === dateStr &&
        p.status === 'scheduled'
      ).length;

      // Completed jobs for this day
      const completedJobs = projects.filter(p =>
        p.status === 'completed' &&
        p.schedule?.scheduledDate === dateStr
      ).length;

      // Revenue collected today (paid on this date)
      const revenueCollected = projects
        .filter(p => p.invoicePaidAt && isSameDay(new Date(p.invoicePaidAt), date))
        .reduce((sum, p) => sum + getProjectRevenue(p), 0);

      // Active projects (approved or scheduled)
      const activeProjects = projects.filter(p =>
        p.status === 'approved' || p.status === 'scheduled'
      ).length;

      // Follow-ups due (placeholder - would need follow-up log data)
      const followUpsDue = 0;

      return {
        date: dateStr,
        scheduledJobs,
        completedJobs,
        revenueCollected,
        followUpsDue,
        activeProjects
      };
    };
  }, [projects]);

  // Weekly metrics calculator
  const getWeeklyMetrics = useMemo(() => {
    return (weekStart: Date): WeeklyMetrics => {
      const weekEnd = getEndOfWeek(weekStart);
      const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Jobs completed this week
      const jobsCompleted = projects.filter(p => {
        if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
        const completedDate = new Date(p.schedule.scheduledDate);
        return isInWeek(completedDate, weekStart);
      }).length;

      // Revenue collected this week
      const revenueCollected = projects
        .filter(p => {
          if (!p.invoicePaidAt) return false;
          const paidDate = new Date(p.invoicePaidAt);
          return isInWeek(paidDate, weekStart);
        })
        .reduce((sum, p) => sum + getProjectRevenue(p), 0);

      // Previous week revenue for comparison
      const prevWeekRevenue = projects
        .filter(p => {
          if (!p.invoicePaidAt) return false;
          const paidDate = new Date(p.invoicePaidAt);
          return isInWeek(paidDate, prevWeekStart);
        })
        .reduce((sum, p) => sum + getProjectRevenue(p), 0);

      // Previous week jobs for comparison
      const prevWeekJobs = projects.filter(p => {
        if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
        const completedDate = new Date(p.schedule.scheduledDate);
        return isInWeek(completedDate, prevWeekStart);
      }).length;

      // Quotes sent this week (projects that became 'quoted' this week)
      const quotesSent = projects.filter(p => {
        if (p.status === 'draft') return false;
        const projectDate = new Date(p.date);
        return isInWeek(projectDate, weekStart);
      }).length;

      // Quotes approved this week
      const quotesApproved = projects.filter(p => {
        if (!['approved', 'scheduled', 'completed'].includes(p.status)) return false;
        const projectDate = new Date(p.date);
        return isInWeek(projectDate, weekStart);
      }).length;

      // New clients this week
      const newClients = clients.filter(c => {
        const createdDate = new Date(c.createdAt);
        return isInWeek(createdDate, weekStart);
      }).length;

      return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        jobsCompleted,
        revenueCollected,
        quotesSent,
        quotesApproved,
        newClients,
        comparisonToLastWeek: {
          revenue: prevWeekRevenue > 0
            ? Math.round(((revenueCollected - prevWeekRevenue) / prevWeekRevenue) * 100)
            : revenueCollected > 0 ? 100 : 0,
          jobs: prevWeekJobs > 0
            ? Math.round(((jobsCompleted - prevWeekJobs) / prevWeekJobs) * 100)
            : jobsCompleted > 0 ? 100 : 0
        }
      };
    };
  }, [projects, clients]);

  // Monthly metrics calculator
  const getMonthlyMetrics = useMemo(() => {
    return (month: number, year: number): MonthlyMetrics => {
      // Find goals for this month
      const revenueGoal = goals.find(g =>
        g.goalType === 'revenue' &&
        g.periodType === 'monthly' &&
        g.month === month + 1 &&
        g.year === year
      );
      const projectsGoal = goals.find(g =>
        g.goalType === 'projects_completed' &&
        g.periodType === 'monthly' &&
        g.month === month + 1 &&
        g.year === year
      );
      const clientsGoal = goals.find(g =>
        g.goalType === 'new_clients' &&
        g.periodType === 'monthly' &&
        g.month === month + 1 &&
        g.year === year
      );

      // Revenue collected this month (paid invoices)
      const revenueActual = projects
        .filter(p => {
          if (!p.invoicePaidAt) return false;
          const paidDate = new Date(p.invoicePaidAt);
          return isInMonth(paidDate, month, year);
        })
        .reduce((sum, p) => sum + getProjectRevenue(p), 0);

      const revenueTarget = revenueGoal?.targetValue || 0;

      // Projects completed this month
      const completedProjects = projects.filter(p => {
        if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
        const completedDate = new Date(p.schedule.scheduledDate);
        return isInMonth(completedDate, month, year);
      });
      const projectsCompleted = completedProjects.length;
      const projectsTarget = projectsGoal?.targetValue || 0;

      // Average project value
      const avgProjectValue = projectsCompleted > 0
        ? completedProjects.reduce((sum, p) => sum + getQuoteValue(p), 0) / projectsCompleted
        : 0;

      // New clients this month
      const newClients = clients.filter(c => {
        const createdDate = new Date(c.createdAt);
        return isInMonth(createdDate, month, year);
      }).length;
      const newClientsTarget = clientsGoal?.targetValue || 0;

      // Conversion rate (quoted -> approved)
      const quotedProjects = projects.filter(p => p.status !== 'draft');
      const approvedProjects = projects.filter(p =>
        ['approved', 'scheduled', 'completed'].includes(p.status)
      );
      const conversionRate = quotedProjects.length > 0
        ? Math.round((approvedProjects.length / quotedProjects.length) * 100)
        : 0;

      // Outstanding receivables (approved/scheduled/completed but not paid)
      const outstandingReceivables = projects
        .filter(p =>
          ['approved', 'scheduled', 'completed'].includes(p.status) &&
          !p.invoicePaidAt
        )
        .reduce((sum, p) => sum + getQuoteValue(p), 0);

      return {
        month,
        year,
        revenueActual,
        revenueTarget,
        revenueProgress: revenueTarget > 0
          ? Math.min(100, Math.round((revenueActual / revenueTarget) * 100))
          : 0,
        projectsCompleted,
        projectsTarget,
        avgProjectValue: Math.round(avgProjectValue),
        newClients,
        newClientsTarget,
        conversionRate,
        outstandingReceivables
      };
    };
  }, [projects, clients, goals]);

  // Yearly metrics calculator
  const getYearlyMetrics = useMemo(() => {
    return (year: number): YearlyMetrics => {
      // Find yearly revenue goal
      const yearlyRevenueGoal = goals.find(g =>
        g.goalType === 'revenue' &&
        g.periodType === 'yearly' &&
        g.year === year
      );

      // Revenue by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueByMonth = monthNames.map((month, idx) => {
        const monthlyGoal = goals.find(g =>
          g.goalType === 'revenue' &&
          g.periodType === 'monthly' &&
          g.month === idx + 1 &&
          g.year === year
        );

        const revenue = projects
          .filter(p => {
            if (!p.invoicePaidAt) return false;
            const paidDate = new Date(p.invoicePaidAt);
            return isInMonth(paidDate, idx, year);
          })
          .reduce((sum, p) => sum + getProjectRevenue(p), 0);

        return {
          month,
          revenue,
          target: monthlyGoal?.targetValue
        };
      });

      // Year to date revenue
      const yearToDateRevenue = revenueByMonth.reduce((sum, m) => sum + m.revenue, 0);
      const yearToDateTarget = yearlyRevenueGoal?.targetValue || 0;

      // Total projects completed this year
      const totalProjects = projects.filter(p => {
        if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
        const completedDate = new Date(p.schedule.scheduledDate);
        return completedDate.getFullYear() === year;
      }).length;

      // Total new clients this year
      const totalClients = clients.filter(c => {
        const createdDate = new Date(c.createdAt);
        return createdDate.getFullYear() === year;
      }).length;

      // Average monthly revenue
      const monthsWithData = revenueByMonth.filter(m => m.revenue > 0).length;
      const avgMonthlyRevenue = monthsWithData > 0
        ? Math.round(yearToDateRevenue / monthsWithData)
        : 0;

      // Best and worst months
      const monthsWithRevenue = revenueByMonth.filter(m => m.revenue > 0);
      const bestMonth = monthsWithRevenue.length > 0
        ? monthsWithRevenue.reduce((best, m) => m.revenue > best.revenue ? m : best)
        : { month: '-', revenue: 0 };
      const worstMonth = monthsWithRevenue.length > 0
        ? monthsWithRevenue.reduce((worst, m) => m.revenue < worst.revenue ? m : worst)
        : { month: '-', revenue: 0 };

      return {
        year,
        revenueByMonth,
        yearToDateRevenue,
        yearToDateTarget,
        totalProjects,
        totalClients,
        avgMonthlyRevenue,
        bestMonth,
        worstMonth
      };
    };
  }, [projects, clients, goals]);

  // Goal progress calculator
  const getGoalProgress = useMemo(() => {
    return (goal: BusinessGoal): GoalProgress => {
      let currentValue = 0;
      let daysRemaining = 0;

      if (goal.periodType === 'monthly' && goal.month) {
        const monthIdx = goal.month - 1; // Convert 1-12 to 0-11
        daysRemaining = getDaysRemaining(monthIdx, goal.year);

        if (goal.goalType === 'revenue') {
          currentValue = projects
            .filter(p => {
              if (!p.invoicePaidAt) return false;
              const paidDate = new Date(p.invoicePaidAt);
              return isInMonth(paidDate, monthIdx, goal.year);
            })
            .reduce((sum, p) => sum + getProjectRevenue(p), 0);
        } else if (goal.goalType === 'projects_completed') {
          currentValue = projects.filter(p => {
            if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
            const completedDate = new Date(p.schedule.scheduledDate);
            return isInMonth(completedDate, monthIdx, goal.year);
          }).length;
        } else if (goal.goalType === 'new_clients') {
          currentValue = clients.filter(c => {
            const createdDate = new Date(c.createdAt);
            return isInMonth(createdDate, monthIdx, goal.year);
          }).length;
        }
      } else if (goal.periodType === 'yearly') {
        daysRemaining = getDaysRemainingInYear(goal.year);

        if (goal.goalType === 'revenue') {
          currentValue = projects
            .filter(p => {
              if (!p.invoicePaidAt) return false;
              const paidDate = new Date(p.invoicePaidAt);
              return paidDate.getFullYear() === goal.year;
            })
            .reduce((sum, p) => sum + getProjectRevenue(p), 0);
        } else if (goal.goalType === 'projects_completed') {
          currentValue = projects.filter(p => {
            if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
            const completedDate = new Date(p.schedule.scheduledDate);
            return completedDate.getFullYear() === goal.year;
          }).length;
        } else if (goal.goalType === 'new_clients') {
          currentValue = clients.filter(c => {
            const createdDate = new Date(c.createdAt);
            return createdDate.getFullYear() === goal.year;
          }).length;
        }
      }

      const progress = goal.targetValue > 0
        ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
        : 0;

      // Determine if on track based on time elapsed
      const totalDays = goal.periodType === 'monthly'
        ? getDaysInMonth((goal.month || 1) - 1, goal.year)
        : 365;
      const daysElapsed = totalDays - daysRemaining;
      const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
      const onTrack = progress >= expectedProgress * 0.8; // Within 80% of expected

      return {
        goal,
        currentValue,
        progress,
        daysRemaining,
        onTrack
      };
    };
  }, [projects, clients]);

  // Compute current values
  const todayMetrics = useMemo(() => getDailyMetrics(today), [getDailyMetrics, today]);
  const thisWeekMetrics = useMemo(() => getWeeklyMetrics(getStartOfWeek(today)), [getWeeklyMetrics, today]);
  const thisMonthMetrics = useMemo(() => getMonthlyMetrics(currentMonth, currentYear), [getMonthlyMetrics, currentMonth, currentYear]);
  const thisYearMetrics = useMemo(() => getYearlyMetrics(currentYear), [getYearlyMetrics, currentYear]);

  // Current goals progress
  const currentGoalsProgress = useMemo(() => {
    // Get goals for current month and year
    const currentGoals = goals.filter(g => {
      if (g.periodType === 'yearly' && g.year === currentYear) return true;
      if (g.periodType === 'monthly' && g.month === currentMonth + 1 && g.year === currentYear) return true;
      return false;
    });
    return currentGoals.map(g => getGoalProgress(g));
  }, [goals, getGoalProgress, currentMonth, currentYear]);

  // Quick stats
  const revenueThisMonth = thisMonthMetrics.revenueActual;
  const revenueThisYear = thisYearMetrics.yearToDateRevenue;

  const pendingRevenue = useMemo(() =>
    projects
      .filter(p => ['approved', 'scheduled'].includes(p.status) && !p.invoicePaidAt)
      .reduce((sum, p) => sum + getQuoteValue(p), 0),
    [projects]
  );

  const overdueCount = useMemo(() =>
    projects.filter(p =>
      ['approved', 'scheduled', 'completed'].includes(p.status) &&
      !p.invoicePaidAt &&
      p.quote // Has a quote but hasn't paid
    ).length,
    [projects]
  );

  const conversionRate = thisMonthMetrics.conversionRate;
  const avgProjectValue = thisMonthMetrics.avgProjectValue;

  return {
    getDailyMetrics,
    todayMetrics,
    getWeeklyMetrics,
    thisWeekMetrics,
    getMonthlyMetrics,
    thisMonthMetrics,
    getYearlyMetrics,
    thisYearMetrics,
    getGoalProgress,
    currentGoalsProgress,
    revenueThisMonth,
    revenueThisYear,
    pendingRevenue,
    overdueCount,
    conversionRate,
    avgProjectValue
  };
}
