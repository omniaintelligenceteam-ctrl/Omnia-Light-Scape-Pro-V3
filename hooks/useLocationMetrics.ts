import { useMemo } from 'react';
import { SavedProject, Location, LocationMetrics } from '../types';

type DateRange = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year';

interface DateRangeBounds {
  start: Date;
  end: Date;
}

function getDateRangeBounds(range: DateRange): DateRangeBounds {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_week':
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start.setMonth(currentQuarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth((currentQuarter + 1) * 3, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

function getPreviousPeriodBounds(_range: DateRange, current: DateRangeBounds): DateRangeBounds {
  const diff = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - diff),
    end: new Date(current.end.getTime() - diff)
  };
}

function isProjectInDateRange(project: SavedProject, bounds: DateRangeBounds): boolean {
  // Use the most relevant date for the project
  const projectDate = project.invoicePaidAt || project.schedule?.scheduledDate || project.date;
  if (!projectDate) return false;

  const date = new Date(projectDate);
  return date >= bounds.start && date <= bounds.end;
}

export function useLocationMetrics(
  projects: SavedProject[],
  locations: Location[],
  dateRange: DateRange = 'this_month'
): LocationMetrics[] {
  return useMemo(() => {
    const bounds = getDateRangeBounds(dateRange);
    const previousBounds = getPreviousPeriodBounds(dateRange, bounds);

    const metrics: LocationMetrics[] = locations
      .filter(loc => loc.isActive)
      .map(location => {
        // Filter projects for this location in current period
        const locationProjects = projects.filter(
          p => p.location_id === location.id && isProjectInDateRange(p, bounds)
        );

        // Filter projects for previous period (for trend calculation)
        const previousProjects = projects.filter(
          p => p.location_id === location.id && isProjectInDateRange(p, previousBounds)
        );

        // Calculate revenue (only paid invoices)
        const revenue = locationProjects
          .filter(p => p.invoicePaidAt)
          .reduce((sum, p) => sum + (p.quote?.total || 0), 0);

        const previousRevenue = previousProjects
          .filter(p => p.invoicePaidAt)
          .reduce((sum, p) => sum + (p.quote?.total || 0), 0);

        // Count jobs completed
        const jobsCompleted = locationProjects.filter(
          p => p.status === 'completed'
        ).length;

        // Count active projects
        const activeProjects = locationProjects.filter(p =>
          ['approved', 'scheduled'].includes(p.status)
        ).length;

        // Calculate average ticket
        const avgTicket = jobsCompleted > 0 ? revenue / jobsCompleted : 0;

        // Calculate conversion rate
        const quoted = locationProjects.filter(p => p.status === 'quoted').length;
        const approved = locationProjects.filter(p => p.status === 'approved').length;
        const scheduled = locationProjects.filter(p => p.status === 'scheduled').length;
        const completed = locationProjects.filter(p => p.status === 'completed').length;

        const totalConverted = approved + scheduled + completed;
        const totalQuoted = quoted + totalConverted;
        const conversionRate = totalQuoted > 0 ? (totalConverted / totalQuoted) * 100 : 0;

        // Calculate outstanding AR
        const outstandingAR = locationProjects
          .filter(
            p =>
              ['approved', 'scheduled', 'completed'].includes(p.status) &&
              !p.invoicePaidAt
          )
          .reduce((sum, p) => sum + (p.quote?.total || 0), 0);

        // Calculate trend (percentage change from previous period)
        const trend =
          previousRevenue > 0
            ? ((revenue - previousRevenue) / previousRevenue) * 100
            : revenue > 0
            ? 100
            : 0;

        return {
          locationId: location.id,
          locationName: location.name,
          revenue: Math.round(revenue),
          revenueTarget: undefined, // Can be added later if location-specific goals exist
          revenueProgress: 0, // Calculated when target exists
          jobsCompleted,
          activeProjects,
          avgTicket: Math.round(avgTicket),
          conversionRate: Math.round(conversionRate),
          outstandingAR: Math.round(outstandingAR),
          trend: Math.round(trend * 10) / 10, // Round to 1 decimal
          rank: 0 // Will be set after sorting
        };
      });

    // Sort by revenue (highest first) and assign ranks
    metrics.sort((a, b) => b.revenue - a.revenue);
    metrics.forEach((m, index) => {
      m.rank = index + 1;
    });

    return metrics;
  }, [projects, locations, dateRange]);
}
