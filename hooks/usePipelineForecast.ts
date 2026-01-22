import { useMemo } from 'react';
import { SavedProject, ProjectStatus } from '../types';

export interface PipelineStage {
  status: ProjectStatus;
  label: string;
  count: number;
  value: number;
  probability: number;
  weightedValue: number;
  color: string;
}

export interface StaleQuote {
  id: string;
  name: string;
  clientName: string;
  value: number;
  daysOld: number;
  status: ProjectStatus;
}

export interface ForecastPeriod {
  label: string;
  projectedRevenue: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PipelineForecastResult {
  stages: PipelineStage[];
  totalPipelineValue: number;
  weightedForecast: number;
  averageDealSize: number;
  averageDaysInPipeline: number;
  staleQuotes: StaleQuote[];
  forecasts: ForecastPeriod[];
  winRateTrend: number; // % change in win rate
  currentWinRate: number;
}

interface UsePipelineForecastProps {
  projects: SavedProject[];
  staleDaysThreshold?: number; // Days before quote is considered stale
}

// Stage probabilities for weighted pipeline
const STAGE_PROBABILITIES: Record<ProjectStatus, number> = {
  draft: 0.10,
  quoted: 0.30,
  approved: 0.80,
  scheduled: 0.95,
  completed: 1.00
};

const STAGE_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  quoted: { label: 'Quoted', color: 'bg-purple-500' },
  approved: { label: 'Approved', color: 'bg-emerald-500' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-[#F6B45A]' }
};

export function usePipelineForecast({
  projects,
  staleDaysThreshold = 14
}: UsePipelineForecastProps): PipelineForecastResult {

  return useMemo(() => {
    const now = new Date();

    // ============================================
    // PIPELINE STAGES
    // ============================================
    const activeStatuses: ProjectStatus[] = ['draft', 'quoted', 'approved', 'scheduled'];

    const stages: PipelineStage[] = activeStatuses.map(status => {
      const stageProjects = projects.filter(p => p.status === status);
      const value = stageProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);
      const probability = STAGE_PROBABILITIES[status];

      return {
        status,
        label: STAGE_CONFIG[status].label,
        count: stageProjects.length,
        value,
        probability,
        weightedValue: value * probability,
        color: STAGE_CONFIG[status].color
      };
    });

    // ============================================
    // PIPELINE METRICS
    // ============================================
    const totalPipelineValue = stages.reduce((sum, s) => sum + s.value, 0);
    const weightedForecast = stages.reduce((sum, s) => sum + s.weightedValue, 0);

    const pipelineProjects = projects.filter(p =>
      activeStatuses.includes(p.status) && p.quote
    );
    const averageDealSize = pipelineProjects.length > 0
      ? totalPipelineValue / pipelineProjects.length
      : 0;

    // Calculate average days in pipeline
    const averageDaysInPipeline = pipelineProjects.length > 0
      ? pipelineProjects.reduce((sum, p) => {
          const projectDate = new Date(p.date);
          const daysOld = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysOld;
        }, 0) / pipelineProjects.length
      : 0;

    // ============================================
    // STALE QUOTES
    // ============================================
    const staleQuotes: StaleQuote[] = projects
      .filter(p => {
        if (!['draft', 'quoted'].includes(p.status)) return false;
        const projectDate = new Date(p.date);
        const daysOld = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOld >= staleDaysThreshold;
      })
      .map(p => {
        const projectDate = new Date(p.date);
        const daysOld = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: p.id,
          name: p.name,
          clientName: p.quote?.clientDetails?.name || p.clientName || 'Unknown',
          value: p.quote?.total || 0,
          daysOld,
          status: p.status
        };
      })
      .sort((a, b) => b.daysOld - a.daysOld)
      .slice(0, 10); // Top 10 oldest

    // ============================================
    // WIN RATE CALCULATIONS
    // ============================================
    const quotedProjects = projects.filter(p => p.status !== 'draft');
    const closedProjects = projects.filter(p =>
      ['approved', 'scheduled', 'completed'].includes(p.status)
    );
    const currentWinRate = quotedProjects.length > 0
      ? Math.round((closedProjects.length / quotedProjects.length) * 100)
      : 0;

    // Calculate win rate for last 30 days vs previous 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentQuoted = projects.filter(p => {
      const d = new Date(p.date);
      return d >= thirtyDaysAgo && p.status !== 'draft';
    });
    const recentClosed = recentQuoted.filter(p =>
      ['approved', 'scheduled', 'completed'].includes(p.status)
    );
    const recentWinRate = recentQuoted.length > 0
      ? (recentClosed.length / recentQuoted.length) * 100
      : 0;

    const prevQuoted = projects.filter(p => {
      const d = new Date(p.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo && p.status !== 'draft';
    });
    const prevClosed = prevQuoted.filter(p =>
      ['approved', 'scheduled', 'completed'].includes(p.status)
    );
    const prevWinRate = prevQuoted.length > 0
      ? (prevClosed.length / prevQuoted.length) * 100
      : 0;

    const winRateTrend = prevWinRate > 0
      ? Math.round(((recentWinRate - prevWinRate) / prevWinRate) * 100)
      : recentWinRate > 0 ? 100 : 0;

    // ============================================
    // 30/60/90 DAY FORECASTS
    // ============================================
    // Simple forecast: weighted pipeline distributed over time
    // Closer stages close sooner
    const forecasts: ForecastPeriod[] = [
      {
        label: '30 Days',
        projectedRevenue: Math.round(
          stages.find(s => s.status === 'scheduled')?.value || 0 +
          (stages.find(s => s.status === 'approved')?.weightedValue || 0) * 0.7
        ),
        confidence: 'high'
      },
      {
        label: '60 Days',
        projectedRevenue: Math.round(
          (stages.find(s => s.status === 'scheduled')?.value || 0) +
          (stages.find(s => s.status === 'approved')?.value || 0) +
          (stages.find(s => s.status === 'quoted')?.weightedValue || 0) * 0.5
        ),
        confidence: 'medium'
      },
      {
        label: '90 Days',
        projectedRevenue: Math.round(weightedForecast),
        confidence: 'low'
      }
    ];

    return {
      stages,
      totalPipelineValue,
      weightedForecast: Math.round(weightedForecast),
      averageDealSize: Math.round(averageDealSize),
      averageDaysInPipeline: Math.round(averageDaysInPipeline),
      staleQuotes,
      forecasts,
      winRateTrend,
      currentWinRate
    };
  }, [projects, staleDaysThreshold]);
}
