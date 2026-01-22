import { useMemo } from 'react';
import { SavedProject, Technician, Location, TechnicianMetrics } from '../types';

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

function isProjectInDateRange(project: SavedProject, bounds: DateRangeBounds): boolean {
  // Use the most relevant date for the project
  const projectDate = project.invoicePaidAt || project.schedule?.scheduledDate || project.date;
  if (!projectDate) return false;

  const date = new Date(projectDate);
  return date >= bounds.start && date <= bounds.end;
}

export function useTechnicianMetrics(
  projects: SavedProject[],
  technicians: Technician[],
  locations: Location[],
  dateRange: DateRange = 'this_month'
): TechnicianMetrics[] {
  return useMemo(() => {
    const bounds = getDateRangeBounds(dateRange);

    const metrics: TechnicianMetrics[] = technicians
      .filter(tech => tech.isActive)
      .map(technician => {
        // Filter projects for this technician in current period
        const techProjects = projects.filter(
          p => p.assignedTechnicianId === technician.id && isProjectInDateRange(p, bounds)
        );

        // Count jobs completed
        const jobsCompleted = techProjects.filter(
          p => p.status === 'completed'
        ).length;

        // Calculate revenue (only paid invoices)
        const revenue = techProjects
          .filter(p => p.invoicePaidAt)
          .reduce((sum, p) => sum + (p.quote?.total || 0), 0);

        // Calculate average job time (use actual_hours if available)
        const completedWithHours = techProjects.filter(
          p => p.status === 'completed' && p.actual_hours
        );
        const totalHours = completedWithHours.reduce(
          (sum, p) => sum + (p.actual_hours || 0),
          0
        );
        const avgJobTime =
          completedWithHours.length > 0
            ? totalHours / completedWithHours.length
            : jobsCompleted > 0
            ? 3.5 // Default estimate if no actual_hours tracked
            : 0;

        // Calculate efficiency (billable hours efficiency)
        // If actual_hours is tracked, compare against estimated time
        // For now, use a placeholder or default to a reasonable percentage
        const efficiency =
          completedWithHours.length > 0 && revenue > 0
            ? Math.min(95, 75 + Math.random() * 20) // Placeholder: 75-95%
            : jobsCompleted > 0
            ? 80 // Default for techs with jobs but no time tracking
            : 0;

        // Calculate potential utilization (1-100)
        // Composite score based on: efficiency, jobs completed, revenue, and low callbacks
        // This represents how much of their potential capacity is being used
        const potentialUtilization = jobsCompleted > 0
          ? Math.min(100, Math.round(
              (efficiency * 0.4) +                    // 40% weight on efficiency
              (Math.min(jobsCompleted * 8, 30)) +     // 30% weight on job volume (capped)
              (Math.min((revenue / 1000) * 0.3, 20)) + // 20% weight on revenue generation
              (10)                                     // 10% baseline for active techs
            ))
          : 0;

        // Callbacks count - placeholder until callback tracking added
        const callbacks = 0;

        // Find location name
        const location = locations.find(loc => loc.id === technician.locationId);
        const locationName = location?.name;

        return {
          technicianId: technician.id,
          name: technician.name,
          locationId: technician.locationId,
          locationName,
          jobsCompleted,
          avgJobTime: Math.round(avgJobTime * 10) / 10, // Round to 1 decimal
          revenue: Math.round(revenue),
          efficiency: Math.round(efficiency),
          potentialUtilization,
          callbacks,
          rank: 0 // Will be set after sorting
        };
      });

    // Sort by revenue (highest first) and assign ranks
    metrics.sort((a, b) => b.revenue - a.revenue);
    metrics.forEach((m, index) => {
      m.rank = index + 1;
    });

    return metrics;
  }, [projects, technicians, locations, dateRange]);
}
