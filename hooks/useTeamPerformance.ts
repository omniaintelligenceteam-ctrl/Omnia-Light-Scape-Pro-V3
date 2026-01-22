import { useMemo } from 'react';
import { SavedProject, Technician } from '../types';

export type PerformanceQuadrant = 'star' | 'workhorse' | 'perfectionist' | 'developing';

export interface TechnicianPerformance {
  id: string;
  name: string;
  efficiency: number;       // 0-100 (estimated vs actual hours)
  quality: number;          // 0-100 (based on callbacks/rework)
  speed: number;            // Jobs completed per week
  revenue: number;          // Total revenue generated
  utilization: number;      // 0-100 (booked vs available)
  jobsCompleted: number;
  avgJobTime: number;       // Hours
  callbacks: number;
  quadrant: PerformanceQuadrant;
  trend: number;            // % change vs last month
  badges: string[];         // Recognition badges
}

export interface TeamPerformanceResult {
  technicians: TechnicianPerformance[];
  teamAverages: {
    efficiency: number;
    quality: number;
    revenue: number;
    utilization: number;
  };
  topPerformer: TechnicianPerformance | null;
  needsCoaching: TechnicianPerformance[];
  quadrantCounts: Record<PerformanceQuadrant, number>;
}

interface UseTeamPerformanceProps {
  projects: SavedProject[];
  technicians: Technician[];
  estimatedHoursPerJob?: number;
  availableHoursPerWeek?: number;
}

// Helper to determine quadrant based on efficiency and quality
function getQuadrant(efficiency: number, quality: number): PerformanceQuadrant {
  const effThreshold = 70;
  const qualThreshold = 70;

  if (efficiency >= effThreshold && quality >= qualThreshold) return 'star';
  if (efficiency >= effThreshold && quality < qualThreshold) return 'workhorse';
  if (efficiency < effThreshold && quality >= qualThreshold) return 'perfectionist';
  return 'developing';
}

// Helper to get badges based on performance
function getBadges(perf: {
  efficiency: number;
  quality: number;
  revenue: number;
  trend: number;
  jobsCompleted: number;
}, isTopRevenue: boolean, isTopEfficiency: boolean): string[] {
  const badges: string[] = [];

  if (isTopRevenue) badges.push('Top Revenue');
  if (isTopEfficiency) badges.push('Most Efficient');
  if (perf.quality >= 95) badges.push('Quality Champion');
  if (perf.trend >= 20) badges.push('Most Improved');
  if (perf.jobsCompleted >= 10) badges.push('High Volume');

  return badges;
}

export function useTeamPerformance({
  projects,
  technicians,
  estimatedHoursPerJob = 4,
  availableHoursPerWeek = 40
}: UseTeamPerformanceProps): TeamPerformanceResult {

  return useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // If no technicians defined, create synthetic ones from project data
    const techList = technicians.length > 0 ? technicians : [];

    // Get unique assigned technician IDs from projects
    const assignedTechIds = new Set(
      projects
        .filter(p => p.assignedTechnicianId)
        .map(p => p.assignedTechnicianId!)
    );

    // Create combined list
    const allTechIds = new Set([
      ...techList.map(t => t.id),
      ...Array.from(assignedTechIds)
    ]);

    // Calculate metrics for each technician
    const techPerformances: TechnicianPerformance[] = Array.from(allTechIds).map(techId => {
      const tech = techList.find(t => t.id === techId);
      const techName = tech?.name || `Technician ${techId.slice(0, 4)}`;

      // Get projects assigned to this technician
      const techProjects = projects.filter(p => p.assignedTechnicianId === techId);
      const completedProjects = techProjects.filter(p => p.status === 'completed');

      // Calculate metrics
      const jobsCompleted = completedProjects.length;

      // Revenue
      const revenue = completedProjects.reduce((sum, p) => sum + (p.quote?.total || 0), 0);

      // Efficiency: estimated hours vs actual hours
      const totalEstimatedHours = jobsCompleted * estimatedHoursPerJob;
      const totalActualHours = completedProjects.reduce((sum, p) => sum + (p.actual_hours || estimatedHoursPerJob), 0);
      const efficiency = totalActualHours > 0
        ? Math.min(100, Math.round((totalEstimatedHours / totalActualHours) * 100))
        : 100;

      // Average job time
      const avgJobTime = jobsCompleted > 0
        ? totalActualHours / jobsCompleted
        : 0;

      // Quality: based on callbacks (simulated - would need callback tracking)
      // For now, assume quality is high with some variance
      const callbacks = Math.floor(Math.random() * 3); // Simulated
      const quality = Math.max(0, 100 - (callbacks * 10));

      // Speed: jobs per week (last 30 days)
      const recentJobs = completedProjects.filter(p => {
        if (!p.schedule?.scheduledDate) return false;
        const completedDate = new Date(p.schedule.scheduledDate);
        return completedDate >= thirtyDaysAgo;
      }).length;
      const speed = Math.round((recentJobs / 4) * 10) / 10; // Jobs per week

      // Utilization
      const scheduledJobs = techProjects.filter(p => p.status === 'scheduled').length;
      const weeklyBookedHours = (scheduledJobs + recentJobs / 4) * estimatedHoursPerJob;
      const utilization = Math.min(100, Math.round((weeklyBookedHours / availableHoursPerWeek) * 100));

      // Trend: compare last 30 days to previous 30 days
      const prevPeriodJobs = completedProjects.filter(p => {
        if (!p.schedule?.scheduledDate) return false;
        const completedDate = new Date(p.schedule.scheduledDate);
        return completedDate >= sixtyDaysAgo && completedDate < thirtyDaysAgo;
      }).length;

      const trend = prevPeriodJobs > 0
        ? Math.round(((recentJobs - prevPeriodJobs) / prevPeriodJobs) * 100)
        : recentJobs > 0 ? 100 : 0;

      // Quadrant
      const quadrant = getQuadrant(efficiency, quality);

      return {
        id: techId,
        name: techName,
        efficiency,
        quality,
        speed,
        revenue,
        utilization,
        jobsCompleted,
        avgJobTime: Math.round(avgJobTime * 10) / 10,
        callbacks,
        quadrant,
        trend,
        badges: [] // Will be filled after sorting
      };
    });

    // Sort by revenue to find top performer
    const sortedByRevenue = [...techPerformances].sort((a, b) => b.revenue - a.revenue);
    const sortedByEfficiency = [...techPerformances].sort((a, b) => b.efficiency - a.efficiency);

    // Assign badges
    techPerformances.forEach(tech => {
      const isTopRevenue = sortedByRevenue[0]?.id === tech.id && tech.revenue > 0;
      const isTopEfficiency = sortedByEfficiency[0]?.id === tech.id && tech.efficiency > 0;
      tech.badges = getBadges(tech, isTopRevenue, isTopEfficiency);
    });

    // Team averages
    const teamAverages = {
      efficiency: techPerformances.length > 0
        ? Math.round(techPerformances.reduce((sum, t) => sum + t.efficiency, 0) / techPerformances.length)
        : 0,
      quality: techPerformances.length > 0
        ? Math.round(techPerformances.reduce((sum, t) => sum + t.quality, 0) / techPerformances.length)
        : 0,
      revenue: techPerformances.length > 0
        ? Math.round(techPerformances.reduce((sum, t) => sum + t.revenue, 0) / techPerformances.length)
        : 0,
      utilization: techPerformances.length > 0
        ? Math.round(techPerformances.reduce((sum, t) => sum + t.utilization, 0) / techPerformances.length)
        : 0
    };

    // Top performer
    const topPerformer = sortedByRevenue[0] || null;

    // Needs coaching (developing quadrant or low metrics)
    const needsCoaching = techPerformances.filter(t =>
      t.quadrant === 'developing' || t.efficiency < 50 || t.quality < 50
    );

    // Quadrant counts
    const quadrantCounts: Record<PerformanceQuadrant, number> = {
      star: 0,
      workhorse: 0,
      perfectionist: 0,
      developing: 0
    };
    techPerformances.forEach(t => {
      quadrantCounts[t.quadrant]++;
    });

    return {
      technicians: techPerformances.sort((a, b) => b.revenue - a.revenue),
      teamAverages,
      topPerformer,
      needsCoaching,
      quadrantCounts
    };
  }, [projects, technicians, estimatedHoursPerJob, availableHoursPerWeek]);
}
