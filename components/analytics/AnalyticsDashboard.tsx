import React, { useState } from 'react';
import {
  DollarSign,
  FolderCheck,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { KPICard, KPICardGrid } from './KPICard';
import { GoalTrackerGrid } from './GoalTracker';
import { DateRangeSelector } from './DateRangeSelector';
import {
  DailyMetrics,
  WeeklyMetrics,
  MonthlyMetrics,
  YearlyMetrics,
  GoalProgress
} from '../../types';

type DateRange = 'today' | 'this_week' | 'this_month' | 'this_year';

interface AnalyticsDashboardProps {
  todayMetrics: DailyMetrics;
  thisWeekMetrics: WeeklyMetrics;
  thisMonthMetrics: MonthlyMetrics;
  thisYearMetrics: YearlyMetrics;
  currentGoalsProgress: GoalProgress[];
  pendingRevenue: number;
  overdueCount: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  todayMetrics,
  thisWeekMetrics,
  thisMonthMetrics,
  thisYearMetrics,
  currentGoalsProgress,
  pendingRevenue,
  overdueCount
}) => {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');

  // Get metrics based on selected range
  const getMetricsForRange = () => {
    switch (dateRange) {
      case 'today':
        return {
          revenue: todayMetrics.revenueCollected,
          jobs: todayMetrics.completedJobs,
          activeProjects: todayMetrics.activeProjects,
          scheduled: todayMetrics.scheduledJobs,
          label: 'Today'
        };
      case 'this_week':
        return {
          revenue: thisWeekMetrics.revenueCollected,
          jobs: thisWeekMetrics.jobsCompleted,
          newClients: thisWeekMetrics.newClients,
          quotesSent: thisWeekMetrics.quotesSent,
          quotesApproved: thisWeekMetrics.quotesApproved,
          revenueTrend: thisWeekMetrics.comparisonToLastWeek.revenue,
          jobsTrend: thisWeekMetrics.comparisonToLastWeek.jobs,
          label: 'This Week'
        };
      case 'this_month':
        return {
          revenue: thisMonthMetrics.revenueActual,
          revenueTarget: thisMonthMetrics.revenueTarget,
          revenueProgress: thisMonthMetrics.revenueProgress,
          jobs: thisMonthMetrics.projectsCompleted,
          jobsTarget: thisMonthMetrics.projectsTarget,
          newClients: thisMonthMetrics.newClients,
          newClientsTarget: thisMonthMetrics.newClientsTarget,
          avgValue: thisMonthMetrics.avgProjectValue,
          conversionRate: thisMonthMetrics.conversionRate,
          outstanding: thisMonthMetrics.outstandingReceivables,
          label: 'This Month'
        };
      case 'this_year':
        return {
          revenue: thisYearMetrics.yearToDateRevenue,
          revenueTarget: thisYearMetrics.yearToDateTarget,
          jobs: thisYearMetrics.totalProjects,
          clients: thisYearMetrics.totalClients,
          avgMonthly: thisYearMetrics.avgMonthlyRevenue,
          bestMonth: thisYearMetrics.bestMonth,
          label: 'This Year'
        };
      default:
        return { revenue: 0, jobs: 0, label: '' };
    }
  };

  const metrics = getMetricsForRange();

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#F6B45A]/10 border border-[#F6B45A]/30">
            <BarChart3 className="w-5 h-5 text-[#F6B45A]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Business Analytics</h2>
            <p className="text-xs text-gray-500">Track your performance and goals</p>
          </div>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Goal Progress Section */}
      {currentGoalsProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">
            Goal Progress
          </h3>
          <GoalTrackerGrid goals={currentGoalsProgress} compact={false} />
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">
          {metrics.label} Overview
        </h3>
        <KPICardGrid columns={4}>
          <KPICard
            title="Revenue"
            value={metrics.revenue || 0}
            prefix="$"
            icon={DollarSign}
            iconColor="text-emerald-400"
            trend={dateRange === 'this_week' ? (metrics as any).revenueTrend : undefined}
            variant={
              dateRange === 'this_month' && (metrics as any).revenueTarget
                ? (metrics as any).revenueProgress >= 80 ? 'success' : (metrics as any).revenueProgress >= 50 ? 'warning' : 'danger'
                : 'default'
            }
          />
          <KPICard
            title={dateRange === 'today' ? 'Completed' : 'Jobs Done'}
            value={metrics.jobs || 0}
            icon={FolderCheck}
            iconColor="text-blue-400"
            trend={dateRange === 'this_week' ? (metrics as any).jobsTrend : undefined}
          />
          {(dateRange === 'this_week' || dateRange === 'this_month' || dateRange === 'this_year') && (
            <KPICard
              title="New Clients"
              value={(metrics as any).newClients || (metrics as any).clients || 0}
              icon={Users}
              iconColor="text-purple-400"
            />
          )}
          {dateRange === 'today' && (
            <KPICard
              title="Scheduled"
              value={todayMetrics.scheduledJobs}
              icon={Calendar}
              iconColor="text-amber-400"
            />
          )}
          {dateRange === 'this_month' && (
            <KPICard
              title="Outstanding"
              value={(metrics as any).outstanding || 0}
              prefix="$"
              icon={Clock}
              iconColor="text-amber-400"
              variant={(metrics as any).outstanding > 0 ? 'warning' : 'default'}
            />
          )}
          {dateRange === 'this_year' && (
            <KPICard
              title="Avg Monthly"
              value={(metrics as any).avgMonthly || 0}
              prefix="$"
              icon={TrendingUp}
              iconColor="text-[#F6B45A]"
            />
          )}
        </KPICardGrid>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Pending Revenue</span>
          </div>
          <p className="text-xl font-bold text-blue-400">${pendingRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">Approved but unpaid</p>
        </div>

        <div className={`p-4 rounded-xl border ${overdueCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={`w-4 h-4 ${overdueCount > 0 ? 'text-red-400' : 'text-gray-500'}`} />
            <span className={`text-xs uppercase tracking-wider ${overdueCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>Overdue</span>
          </div>
          <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>{overdueCount}</p>
          <p className="text-xs text-gray-600 mt-1">Need attention</p>
        </div>

        {dateRange === 'this_month' && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Conversion</span>
            </div>
            <p className="text-xl font-bold text-purple-400">{thisMonthMetrics.conversionRate}%</p>
            <p className="text-xs text-gray-600 mt-1">Quote to approval</p>
          </div>
        )}

        {dateRange === 'this_year' && thisYearMetrics.bestMonth.revenue > 0 && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-500 uppercase tracking-wider">Best Month</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">${thisYearMetrics.bestMonth.revenue.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">{thisYearMetrics.bestMonth.month}</p>
          </div>
        )}
      </div>

      {/* Year Chart Placeholder */}
      {dateRange === 'this_year' && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
            Revenue by Month
          </h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {thisYearMetrics.revenueByMonth.map((m, idx) => {
              const maxRevenue = Math.max(...thisYearMetrics.revenueByMonth.map(x => x.revenue));
              const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              const isCurrentMonth = idx === new Date().getMonth();

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-36">
                    {m.revenue > 0 && (
                      <span className="text-[10px] text-gray-500 mb-1">
                        ${Math.round(m.revenue / 1000)}k
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${
                        isCurrentMonth
                          ? 'bg-[#F6B45A]'
                          : m.revenue > 0
                            ? 'bg-blue-500'
                            : 'bg-white/10'
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isCurrentMonth ? 'text-[#F6B45A] font-bold' : 'text-gray-600'}`}>
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
