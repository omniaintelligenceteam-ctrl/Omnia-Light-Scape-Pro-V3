import { useMemo } from 'react';
import { SavedProject, LocationMetrics, TechnicianMetrics, CompanyMetrics } from '../types';

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

function daysBetween(date1: string | undefined, date2: Date): number {
  if (!date1) return 0;
  const d1 = new Date(date1);
  const diff = date2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function useCompanyMetrics(
  locationMetrics: LocationMetrics[],
  technicianMetrics: TechnicianMetrics[],
  projects: SavedProject[],
  dateRange: DateRange = 'this_month'
): CompanyMetrics {
  return useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // 1. Sum all location revenues for current period total
    const totalRevenue = locationMetrics.reduce((sum, loc) => sum + loc.revenue, 0);

    // 2. Calculate total revenue YTD (all projects this year with payment)
    const totalRevenueYTD = projects
      .filter(p => {
        if (!p.invoicePaidAt) return false;
        const paidDate = new Date(p.invoicePaidAt);
        return paidDate >= yearStart && paidDate <= yearEnd;
      })
      .reduce((sum, p) => sum + (p.quote?.total || 0), 0);

    // 3. Calculate YoY growth (compare this year to last year)
    const lastYearRevenue = projects
      .filter(p => {
        if (!p.invoicePaidAt) return false;
        const paidDate = new Date(p.invoicePaidAt);
        return paidDate >= lastYearStart && paidDate <= lastYearEnd;
      })
      .reduce((sum, p) => sum + (p.quote?.total || 0), 0);

    const yoyGrowth =
      lastYearRevenue > 0
        ? ((totalRevenueYTD - lastYearRevenue) / lastYearRevenue) * 100
        : totalRevenueYTD > 0
        ? 100
        : 0;

    // 4. Count all jobs completed across locations
    const totalJobsCompleted = locationMetrics.reduce(
      (sum, loc) => sum + loc.jobsCompleted,
      0
    );

    // 5. Count all active projects
    const totalActiveProjects = locationMetrics.reduce(
      (sum, loc) => sum + loc.activeProjects,
      0
    );

    // 6. Count quotes pending (quoted status, not yet approved)
    const totalQuotesPending = projects.filter(p => p.status === 'quoted').length;

    // 7. Calculate total outstanding AR
    const totalOutstandingAR = locationMetrics.reduce(
      (sum, loc) => sum + loc.outstandingAR,
      0
    );

    // 8. Break down AR into aging buckets
    const outstandingProjects = projects.filter(
      p =>
        ['approved', 'scheduled', 'completed'].includes(p.status) &&
        !p.invoicePaidAt
    );

    const arAgingBuckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90Plus: 0
    };

    for (const project of outstandingProjects) {
      const amount = project.quote?.total || 0;
      const daysSinceInvoiceSent = daysBetween(project.invoice_sent_at, now);

      if (daysSinceInvoiceSent <= 30) {
        arAgingBuckets.current += amount;
      } else if (daysSinceInvoiceSent <= 60) {
        arAgingBuckets.days30 += amount;
      } else if (daysSinceInvoiceSent <= 90) {
        arAgingBuckets.days60 += amount;
      } else {
        arAgingBuckets.days90Plus += amount;
      }
    }

    // Round aging buckets
    arAgingBuckets.current = Math.round(arAgingBuckets.current);
    arAgingBuckets.days30 = Math.round(arAgingBuckets.days30);
    arAgingBuckets.days60 = Math.round(arAgingBuckets.days60);
    arAgingBuckets.days90Plus = Math.round(arAgingBuckets.days90Plus);

    // 9. Calculate company-wide conversion rate (weighted average)
    const totalConversionSum = locationMetrics.reduce(
      (sum, loc) => sum + loc.conversionRate * loc.jobsCompleted,
      0
    );
    const companyConversionRate =
      totalJobsCompleted > 0
        ? totalConversionSum / totalJobsCompleted
        : 0;

    // 10. Calculate average project value
    const avgProjectValue =
      totalJobsCompleted > 0
        ? totalRevenue / totalJobsCompleted
        : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      totalRevenueYTD: Math.round(totalRevenueYTD),
      yoyGrowth: Math.round(yoyGrowth * 10) / 10, // Round to 1 decimal
      totalJobsCompleted,
      totalActiveProjects,
      totalQuotesPending,
      totalOutstandingAR: Math.round(totalOutstandingAR),
      arAgingBuckets,
      companyConversionRate: Math.round(companyConversionRate),
      avgProjectValue: Math.round(avgProjectValue),
      locationCount: locationMetrics.length,
      technicianCount: technicianMetrics.length
    };
  }, [locationMetrics, technicianMetrics, projects, dateRange]);
}
