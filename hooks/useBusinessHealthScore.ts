import { useMemo } from 'react';
import { SavedProject, BusinessGoal } from '../types';

export interface HealthScoreBreakdown {
  revenueScore: number;      // 0-100
  cashFlowScore: number;     // 0-100
  pipelineScore: number;     // 0-100
  utilizationScore: number;  // 0-100
  conversionScore: number;   // 0-100
}

export interface FocusArea {
  name: string;
  score: number;
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BusinessHealthResult {
  overallScore: number;           // 0-100 composite score
  breakdown: HealthScoreBreakdown;
  trend: number;                  // % change vs last week
  focusAreas: FocusArea[];        // Top 3 areas to improve
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

interface UseBusinessHealthScoreProps {
  projects: SavedProject[];
  goals: BusinessGoal[];
  monthlyTarget?: number;
}

// Helper to get revenue from paid invoices
function getProjectRevenue(project: SavedProject): number {
  if (!project.invoicePaidAt) return 0;
  return project.quote?.total || 0;
}

// Helper to check if date is in current month
function isInCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// Helper to check if date is in last 7 days
function isInLastWeek(date: Date): boolean {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo && date <= now;
}

// Helper to check if date is 7-14 days ago
function isInPreviousWeek(date: Date): boolean {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return date >= twoWeeksAgo && date < weekAgo;
}

export function useBusinessHealthScore({
  projects,
  goals,
  monthlyTarget = 50000
}: UseBusinessHealthScoreProps): BusinessHealthResult {

  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Find monthly revenue goal if exists
    const revenueGoal = goals.find(g =>
      g.goalType === 'revenue' &&
      g.periodType === 'monthly' &&
      g.month === currentMonth + 1 &&
      g.year === currentYear
    );
    const target = revenueGoal?.targetValue || monthlyTarget;

    // ============================================
    // 1. REVENUE SCORE (25% weight)
    // Current month revenue vs target
    // ============================================
    const revenueThisMonth = projects
      .filter(p => {
        if (!p.invoicePaidAt) return false;
        const paidDate = new Date(p.invoicePaidAt);
        return isInCurrentMonth(paidDate);
      })
      .reduce((sum, p) => sum + getProjectRevenue(p), 0);

    // Calculate expected progress based on day of month
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const expectedProgress = dayOfMonth / daysInMonth;
    const expectedRevenue = target * expectedProgress;

    const revenueScore = Math.min(100, Math.round((revenueThisMonth / expectedRevenue) * 100)) || 0;

    // ============================================
    // 2. CASH FLOW SCORE (25% weight)
    // Based on DSO (Days Sales Outstanding)
    // ============================================
    const unpaidProjects = projects.filter(p =>
      ['approved', 'scheduled', 'completed'].includes(p.status) &&
      !p.invoicePaidAt &&
      p.quote
    );

    const totalOutstanding = unpaidProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
    const avgDaysOutstanding = unpaidProjects.length > 0
      ? unpaidProjects.reduce((sum, p) => {
          const projectDate = new Date(p.date);
          const daysOld = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysOld;
        }, 0) / unpaidProjects.length
      : 0;

    // DSO score: < 30 days = 100, 30-45 = 75, 45-60 = 50, 60-90 = 25, > 90 = 0
    let cashFlowScore = 100;
    if (avgDaysOutstanding > 90) cashFlowScore = 0;
    else if (avgDaysOutstanding > 60) cashFlowScore = 25;
    else if (avgDaysOutstanding > 45) cashFlowScore = 50;
    else if (avgDaysOutstanding > 30) cashFlowScore = 75;

    // Adjust for amount outstanding relative to revenue
    if (totalOutstanding > revenueThisMonth * 2) {
      cashFlowScore = Math.max(0, cashFlowScore - 25);
    }

    // ============================================
    // 3. PIPELINE SCORE (20% weight)
    // Weighted value of pipeline
    // ============================================
    const stageProbabilities: Record<string, number> = {
      draft: 0.10,
      quoted: 0.30,
      approved: 0.80,
      scheduled: 0.95,
      completed: 0
    };

    const weightedPipeline = projects
      .filter(p => p.status !== 'completed' && p.quote)
      .reduce((sum, p) => {
        const probability = stageProbabilities[p.status] || 0;
        return sum + (p.quote?.total || 0) * probability;
      }, 0);

    const pipelineScore = Math.min(100, Math.round((weightedPipeline / target) * 100)) || 0;

    // ============================================
    // 4. UTILIZATION SCORE (15% weight)
    // Jobs scheduled vs capacity
    // ============================================
    const scheduledJobs = projects.filter(p => p.status === 'scheduled').length;
    const completedThisMonth = projects.filter(p => {
      if (p.status !== 'completed' || !p.schedule?.scheduledDate) return false;
      const completedDate = new Date(p.schedule.scheduledDate);
      return isInCurrentMonth(completedDate);
    }).length;

    // Assume capacity of ~20 jobs per month (adjustable)
    const monthlyCapacity = 20;
    const utilizationRatio = (scheduledJobs + completedThisMonth) / monthlyCapacity;
    const utilizationScore = Math.min(100, Math.round(utilizationRatio * 100));

    // ============================================
    // 5. CONVERSION SCORE (15% weight)
    // Quote to close rate
    // ============================================
    const quotedProjects = projects.filter(p => p.status !== 'draft').length;
    const closedProjects = projects.filter(p =>
      ['approved', 'scheduled', 'completed'].includes(p.status)
    ).length;

    const conversionRate = quotedProjects > 0
      ? (closedProjects / quotedProjects) * 100
      : 0;

    // Industry benchmark: 35-45% is good
    const conversionScore = Math.min(100, Math.round((conversionRate / 45) * 100));

    // ============================================
    // CALCULATE OVERALL SCORE
    // ============================================
    const overallScore = Math.round(
      revenueScore * 0.25 +
      cashFlowScore * 0.25 +
      pipelineScore * 0.20 +
      utilizationScore * 0.15 +
      conversionScore * 0.15
    );

    // ============================================
    // CALCULATE TREND (vs last week)
    // ============================================
    const lastWeekRevenue = projects
      .filter(p => {
        if (!p.invoicePaidAt) return false;
        const paidDate = new Date(p.invoicePaidAt);
        return isInLastWeek(paidDate);
      })
      .reduce((sum, p) => sum + getProjectRevenue(p), 0);

    const prevWeekRevenue = projects
      .filter(p => {
        if (!p.invoicePaidAt) return false;
        const paidDate = new Date(p.invoicePaidAt);
        return isInPreviousWeek(paidDate);
      })
      .reduce((sum, p) => sum + getProjectRevenue(p), 0);

    const trend = prevWeekRevenue > 0
      ? Math.round(((lastWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
      : lastWeekRevenue > 0 ? 100 : 0;

    // ============================================
    // DETERMINE FOCUS AREAS
    // ============================================
    const allScores = [
      { name: 'Revenue', score: revenueScore, key: 'revenue' },
      { name: 'Cash Flow', score: cashFlowScore, key: 'cashFlow' },
      { name: 'Pipeline', score: pipelineScore, key: 'pipeline' },
      { name: 'Utilization', score: utilizationScore, key: 'utilization' },
      { name: 'Conversion', score: conversionScore, key: 'conversion' }
    ].sort((a, b) => a.score - b.score);

    const tips: Record<string, string> = {
      revenue: 'Focus on closing pending quotes and follow up on overdue invoices',
      cashFlow: 'Send payment reminders and consider offering early payment discounts',
      pipeline: 'Increase lead generation or follow up on stale quotes',
      utilization: 'Schedule more jobs or optimize technician routes',
      conversion: 'Review quote pricing and improve follow-up process'
    };

    const focusAreas: FocusArea[] = allScores.slice(0, 3).map((s, idx) => ({
      name: s.name,
      score: s.score,
      tip: tips[s.key],
      priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'
    }));

    // ============================================
    // DETERMINE STATUS
    // ============================================
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= 80) status = 'excellent';
    else if (overallScore >= 60) status = 'good';
    else if (overallScore >= 40) status = 'fair';
    else status = 'poor';

    return {
      overallScore,
      breakdown: {
        revenueScore,
        cashFlowScore,
        pipelineScore,
        utilizationScore,
        conversionScore
      },
      trend,
      focusAreas,
      status
    };
  }, [projects, goals, monthlyTarget]);
}
